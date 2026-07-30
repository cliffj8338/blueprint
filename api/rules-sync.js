// Blueprint™ Firestore Rules Sync Cron — /api/rules-sync
// Runs on a Vercel cron schedule. Compares the committed firestore.rules file
// (bundled with this function via vercel.json includeFiles) against the ruleset
// that is actually live on Firebase. If they diverge, it redeploys the committed
// rules automatically (same pattern as the task-#14 deploy script:
// service-account JWT → Rules API create-ruleset → PATCH release) and records a
// system_incidents alert so the admin health panel surfaces what happened.
//
// Why: a silent rules/repo mismatch once meant every system_incidents write
// would have been permission-denied with no one noticing. This closes that gap.
//
// Requires env vars: FIREBASE_SERVICE_ACCOUNT (JSON), CRON_SECRET.
// Manual trigger: GET /api/rules-sync?secret=CRON_SECRET
//   Optional ?dryRun=1 → report drift only, do not deploy.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const PROJECT_ID = 'work-blueprint';
const RULES_API = 'https://firebaserules.googleapis.com/v1';
const RELEASE_NAME = `projects/${PROJECT_ID}/releases/cloud.firestore`;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── Service-account OAuth (JWT bearer grant) ────────────────────────────────
async function getAccessToken() {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (!sa.client_email || !sa.private_key) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT env var missing or invalid');
    }
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
        iss: sa.client_email,
        // firebase scope → Rules API; datastore scope → admin Firestore writes
        scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    };
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsigned = `${b64(header)}.${b64(claims)}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsigned);
    const signature = signer.sign(sa.private_key).toString('base64url');
    const jwt = `${unsigned}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });
    if (!res.ok) throw new Error(`OAuth token exchange failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.access_token;
}

// ── Rules API helpers ────────────────────────────────────────────────────────
async function rulesApi(token, method, urlPath, body) {
    const res = await fetch(`${RULES_API}/${urlPath}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Rules API ${method} ${urlPath} failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function getLiveRulesContent(token) {
    const release = await rulesApi(token, 'GET', RELEASE_NAME);
    const rulesetName = release.rulesetName; // projects/x/rulesets/id
    const ruleset = await rulesApi(token, 'GET', rulesetName);
    const files = (ruleset.source && ruleset.source.files) || [];
    return { rulesetName, content: files.map((f) => f.content).join('\n') };
}

async function deployRules(token, content) {
    const ruleset = await rulesApi(token, 'POST', `projects/${PROJECT_ID}/rulesets`, {
        source: { files: [{ name: 'firestore.rules', content }] },
    });
    await rulesApi(token, 'PATCH', `${RELEASE_NAME}?updateMask=release.ruleset_name`, {
        release: { name: RELEASE_NAME, rulesetName: ruleset.name },
    });
    return ruleset.name;
}

// ── Incident logging (admin-auth Firestore REST — works even if rules broken) ─
async function logIncident(token, severity, message) {
    try {
        const docId = 'rs-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
        const res = await fetch(`${FIRESTORE_BASE}/system_incidents/${docId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fields: {
                    severity: { stringValue: severity },
                    feature: { stringValue: 'firestore-rules-drift' },
                    message: { stringValue: String(message).slice(0, 1000) },
                    model: { stringValue: 'n/a' },
                    timestamp: { stringValue: new Date().toISOString() },
                    resolved: { booleanValue: false },
                },
            }),
        });
        if (!res.ok) console.error('Incident write failed:', res.status, await res.text());
    } catch (err) {
        console.error('Incident write failed:', err.message);
    }
}

// ── Heartbeat (task #18): record that the sync check itself ran ──────────────
// Written via admin-auth Firestore REST (bypasses rules; `meta` is client
// read-only). The admin health panel reads meta/rules_sync and flags the
// safety net as stale when lastRunAt is older than ~13h (2 missed 6h runs).
async function writeHeartbeat(token, result) {
    try {
        const res = await fetch(`${FIRESTORE_BASE}/meta/rules_sync`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fields: {
                    lastRunAt: { stringValue: new Date().toISOString() },
                    lastResult: { stringValue: String(result).slice(0, 200) },
                },
            }),
        });
        if (!res.ok) console.error('rules-sync heartbeat write failed:', res.status, await res.text());
    } catch (err) {
        console.error('rules-sync heartbeat write failed:', err.message);
    }
}

// ── Normalize for comparison (ignore trailing-whitespace/EOL differences) ────
function normalize(src) {
    return String(src || '')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((l) => l.replace(/\s+$/, ''))
        .join('\n')
        .trim();
}

function readCommittedRules() {
    // Bundled alongside the function via vercel.json → functions.includeFiles
    const candidates = [
        path.join(process.cwd(), 'firestore.rules'),
        path.join(process.cwd(), '..', 'firestore.rules'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    }
    throw new Error('Committed firestore.rules not found in function bundle');
}

export default async function handler(req, res) {
    // Auth: Vercel cron sends Authorization: Bearer CRON_SECRET; manual via ?secret=
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.authorization || '';
        if (auth !== `Bearer ${secret}` && req.query.secret !== secret) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    const dryRun = req.query.dryRun === '1';

    try {
        const committed = readCommittedRules();
        const token = await getAccessToken();
        const live = await getLiveRulesContent(token);

        const inSync = normalize(committed) === normalize(live.content);
        if (inSync) {
            console.log('rules-sync: live ruleset matches committed firestore.rules');
            await writeHeartbeat(token, 'in-sync');
            return res.status(200).json({ ok: true, drift: false, liveRuleset: live.rulesetName });
        }

        console.warn('rules-sync: DRIFT DETECTED between committed firestore.rules and live ruleset', live.rulesetName);

        if (dryRun) {
            await logIncident(token, 'warning',
                'Firestore rules drift detected (dry run): the live ruleset does not match the committed ' +
                'firestore.rules file. No automatic deploy was performed (dryRun=1).');
            await writeHeartbeat(token, 'drift-detected (dry run)');
            return res.status(200).json({ ok: true, drift: true, deployed: false, dryRun: true });
        }

        try {
            const newRuleset = await deployRules(token, committed);
            console.log('rules-sync: redeployed committed rules as', newRuleset);
            await logIncident(token, 'warning',
                'Firestore rules drift detected: the live ruleset did not match the committed firestore.rules. ' +
                `The committed rules were automatically redeployed (new ruleset: ${newRuleset}). ` +
                'If the live rules were changed intentionally, commit that change to the repo.');
            await writeHeartbeat(token, 'drift-detected, redeployed');
            return res.status(200).json({ ok: true, drift: true, deployed: true, newRuleset });
        } catch (deployErr) {
            console.error('rules-sync: drift detected but redeploy FAILED:', deployErr.message);
            await logIncident(token, 'critical',
                'Firestore rules drift detected AND automatic redeploy failed: ' +
                String(deployErr.message).slice(0, 500) +
                ' — live rules may be rejecting writes (e.g. system_incidents). Deploy firestore.rules manually.');
            return res.status(500).json({ ok: false, drift: true, deployed: false, error: deployErr.message });
        }
    } catch (err) {
        console.error('rules-sync failed:', err.message);
        return res.status(500).json({ ok: false, error: err.message });
    }
}
