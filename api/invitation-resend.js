import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createInvitationResendService, createResendProvider, InviteError } from './lib/invitation-resend.js';

let runtime;
function getRuntime() {
    if (runtime) return runtime;
    const credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}'));
    const app = getApps().find(app => app.name === 'invitation-resend')
        || initializeApp({ credential, projectId: 'work-blueprint' }, 'invitation-resend');
    const getApiKey = async () => {
        // Reuse the existing secret, not a new or browser-accessible credential.
        const { access_token } = await credential.getAccessToken();
        const response = await fetch('https://secretmanager.googleapis.com/v1/projects/work-blueprint/secrets/RESEND_API_KEY/versions/latest:access', {
            headers: { Authorization: 'Bearer ' + access_token },
            signal: AbortSignal.timeout(8_000)
        });
        if (!response.ok) throw new Error('Email configuration unavailable');
        const data = await response.json();
        return Buffer.from(data.payload.data, 'base64').toString('utf8').trim();
    };
    runtime = {
        verifyToken: token => getAuth(app).verifyIdToken(token, true),
        service: createInvitationResendService({ db: getFirestore(app), sendEmail: createResendProvider({ getApiKey }) })
    };
    return runtime;
}

export function createHandler(getDependencies = getRuntime) {
    return async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        if (!['POST', 'GET'].includes(req.method)) {
            res.setHeader('Allow', 'GET, POST');
            return res.status(405).json({ error: 'Method not allowed.' });
        }
        const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
        if (!token) return res.status(401).json({ error: 'Sign in as an administrator.' });
        try {
            const { verifyToken, service } = getDependencies();
            let identity;
            try { identity = await verifyToken(token[1]); } catch (_) {
                return res.status(401).json({ error: 'Your session expired. Sign in again.' });
            }
            let result;
            if (req.method === 'GET') {
                result = await service.status(identity.uid, req.query?.entryId);
            } else {
                if (!req.headers['content-type']?.startsWith('application/json')) {
                    throw new InviteError(415, 'Send a JSON request.');
                }
                let body = req.body;
                if (typeof body === 'string') {
                    if (Buffer.byteLength(body) > 4096) throw new InviteError(413, 'Request too large.');
                    try { body = JSON.parse(body); } catch (_) { throw new InviteError(400, 'Invalid JSON.'); }
                }
                if (body?.showcase === true) throw new InviteError(403, 'Resending is disabled in showcase mode.');
                result = await service.resend(identity.uid, body);
            }
            return res.status(200).json(result);
        } catch (error) {
            if (error instanceof InviteError) {
                if (error.retryAt) res.setHeader('Retry-After', String(Math.max(1, Math.ceil((error.retryAt - Date.now()) / 1000))));
                return res.status(error.status).json({ error: error.message, retryAt: error.retryAt || null });
            }
            // Never expose Firebase/provider errors, credentials, or signup data.
            return res.status(503).json({ error: 'Invitation service unavailable. Check the last resend outcome before trying again.' });
        }
    };
}

export default createHandler();
