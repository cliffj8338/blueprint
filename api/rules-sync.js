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

// ── Jobs-sync heartbeat watchdog (task #20) ─────────────────────────────────
// Reciprocal of checkRulesSyncHeartbeat in api/jobs-sync.js: that cron watches
// this one, and this one watches that one, so neither can die unnoticed.
// meta/jobsSync.lastSync is a Firestore server timestamp written at the end of
// every successful jobs-sync run (every 6h). Older than ~13h (two missed runs)
// → one critical system_incidents entry per stale episode.
//
// Spam control: meta/jobsSync.staleAlertedFor records which lastSync value
// ('never' if missing) has already been alerted on. Recovery resets it
// automatically — jobs-sync overwrites meta/jobsSync with a plain set() on
// every successful run, wiping the marker, so a future outage alerts again.
const JOBS_SYNC_STALE_MS = 13 * 60 * 60 * 1000;

// Auto-clear (task #22): once jobs-sync's heartbeat is fresh again, mark any
// unresolved 'jobs-sync-heartbeat' incidents resolved so the admin panel
// doesn't show stale criticals. Uses Firestore REST runQuery + field-masked
// PATCH (admin token — bypasses rules). Mirrors the reciprocal auto-clear in
// api/jobs-sync.js checkRulesSyncHeartbeat.
async function resolveOpenJobsSyncIncidents(token) {
    let resolvedCount = 0;
    try {
        const queryRes = await fetch(`${FIRESTORE_BASE}:runQuery`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: 'system_incidents' }],
                    where: {
                        compositeFilter: {
                            op: 'AND',
                            filters: [
                                { fieldFilter: { field: { fieldPath: 'feature' }, op: 'EQUAL', value: { stringValue: 'jobs-sync-heartbeat' } } },
                                { fieldFilter: { field: { fieldPath: 'resolved' }, op: 'EQUAL', value: { booleanValue: false } } },
                            ],
                        },
                    },
                },
            }),
        });
        if (!queryRes.ok) throw new Error(`incident query failed: ${queryRes.status} ${await queryRes.text()}`);
        const rows = await queryRes.json();
        const docNames = rows.map((r) => r.document?.name).filter(Boolean);
        if (docNames.length === 0) return 0;

        const resolvedAt = new Date().toISOString();
        for (const name of docNames) {
            // name is the full resource path: projects/.../documents/system_incidents/<id>
            const docPath = name.split('/documents/')[1];
            const patchRes = await fetch(
                `${FIRESTORE_BASE}/${docPath}?updateMask.fieldPaths=resolved&updateMask.fieldPaths=resolvedAt`,
                {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fields: {
                            resolved: { booleanValue: true },
                            resolvedAt: { stringValue: resolvedAt },
                        },
                    }),
                }
            );
            if (patchRes.ok) resolvedCount++;
            else console.error('jobs-sync incident resolve failed:', patchRes.status, await patchRes.text());
        }
        if (resolvedCount > 0) {
            console.log('rules-sync: jobs-sync heartbeat recovered — auto-resolved ' + resolvedCount + ' open incident(s)');
        }
    } catch (err) {
        console.error('rules-sync: failed to auto-resolve jobs-sync-heartbeat incidents:', err.message);
    }
    return resolvedCount;
}

async function checkJobsSyncHeartbeat(token) {
    try {
        const docRes = await fetch(`${FIRESTORE_BASE}/meta/jobsSync`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        let fields = {};
        if (docRes.ok) {
            fields = (await docRes.json()).fields || {};
        } else if (docRes.status !== 404) {
            throw new Error(`meta/jobsSync read failed: ${docRes.status} ${await docRes.text()}`);
        }

        const lastSync = fields.lastSync?.timestampValue || null;
        const ageMs = lastSync ? Date.now() - new Date(lastSync).getTime() : Infinity;
        if (ageMs <= JOBS_SYNC_STALE_MS) {
            // Fresh again — auto-resolve any open heartbeat incidents so the
            // admin panel reflects reality (mirrors checkRulesSyncHeartbeat in
            // api/jobs-sync.js). Resolved incidents are purged by the 30-day
            // cleanup naturally.
            const resolvedCount = await resolveOpenJobsSyncIncidents(token);
            return { stale: false, lastSync, resolvedCount };
        }

        // Stale. Dedupe: one alert per stale episode (keyed by heartbeat value).
        const episodeKey = lastSync || 'never';
        const alreadyAlerted = fields.staleAlertedFor?.stringValue === episodeKey;
        if (alreadyAlerted) return { stale: true, lastSync, alerted: false };

        const ageHours = lastSync ? Math.round(ageMs / 3600000) : null;
        const message = lastSync
            ? 'Jobs-sync cron appears DEAD: its heartbeat (meta/jobsSync.lastSync) is ' +
              ageHours + 'h old (last sync ' + lastSync + '; expected every 6h). ' +
              'The job feed is going stale AND the rules-sync watchdog inside jobs-sync is not running. ' +
              'Check the /api/jobs-sync Vercel cron and its logs.'
            : 'Jobs-sync cron has NEVER recorded a sync (meta/jobsSync missing or has no lastSync). ' +
              'The /api/jobs-sync cron may have never run successfully. Job feed is not updating.';

        const docId = 'jshb-' + Date.now().toString(36) + '-' + crypto.randomBytes(3).toString('hex');
        const incRes = await fetch(`${FIRESTORE_BASE}/system_incidents/${docId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    severity: { stringValue: 'critical' },
                    feature: { stringValue: 'jobs-sync-heartbeat' },
                    message: { stringValue: message.slice(0, 1000) },
                    model: { stringValue: 'n/a' },
                    timestamp: { stringValue: new Date().toISOString() },
                    resolved: { booleanValue: false },
                },
            }),
        });
        if (!incRes.ok) throw new Error(`incident write failed: ${incRes.status} ${await incRes.text()}`);

        // Record the dedupe marker without clobbering the rest of meta/jobsSync.
        const markRes = await fetch(
            `${FIRESTORE_BASE}/meta/jobsSync?updateMask.fieldPaths=staleAlertedFor`,
            {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: { staleAlertedFor: { stringValue: episodeKey } } }),
            }
        );
        if (!markRes.ok) console.error('jobs-sync stale marker write failed:', markRes.status, await markRes.text());

        console.warn('rules-sync: jobs-sync heartbeat STALE — critical incident raised:', message);
        return { stale: true, lastSync, alerted: true };
    } catch (err) {
        console.error('rules-sync: jobs-sync heartbeat check failed:', err.message);
        return { stale: null, error: err.message };
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

        // Reciprocal watchdog (task #20): jobs-sync watches this cron's
        // heartbeat; this cron watches jobs-sync's. Runs before drift handling
        // so a rules problem can't mask a dead jobs-sync.
        const jobsSyncWatch = await checkJobsSyncHeartbeat(token);

        const live = await getLiveRulesContent(token);

        const inSync = normalize(committed) === normalize(live.content);
        if (inSync) {
            console.log('rules-sync: live ruleset matches committed firestore.rules');
            await writeHeartbeat(token, 'in-sync');
            return res.status(200).json({ ok: true, drift: false, liveRuleset: live.rulesetName, jobsSyncHeartbeat: jobsSyncWatch });
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
