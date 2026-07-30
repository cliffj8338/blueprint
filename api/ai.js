// Blueprint™ AI Proxy — Vercel Serverless Function
// Validates Firebase ID token, forwards to Anthropic API with server-side key.
// Deploy: place in /api/ai.js, set ANTHROPIC_API_KEY in Vercel Environment Variables.

import crypto from 'crypto';
import { fsSet, fsGet, fsUpdate } from './lib/firestore-rest.js';

// Firebase project config
const FIREBASE_PROJECT_ID = 'work-blueprint';

// ===== AI MODEL IDS =====
// Keep in sync with BP_AI_MODEL / BP_AI_MODEL_FAST in src/core/constants.js
const BP_AI_MODEL      = 'claude-sonnet-4-6';            // default (Sonnet)
const BP_AI_MODEL_FAST = 'claude-haiku-4-5-20251001';    // fast/cheap (Haiku)
const ALLOWED_MODELS   = [BP_AI_MODEL, BP_AI_MODEL_FAST];

// Cache Google's public keys (they rotate, so cache with TTL)
let cachedCerts = null;
let certsExpiry = 0;

async function getGoogleCerts() {
    if (cachedCerts && Date.now() < certsExpiry) return cachedCerts;
    
    const res = await fetch(
        'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    
    if (!res.ok) throw new Error('Failed to fetch Google certificates');
    
    cachedCerts = await res.json();
    
    // Parse cache-control max-age for TTL
    const cc = res.headers.get('cache-control') || '';
    const match = cc.match(/max-age=(\d+)/);
    certsExpiry = Date.now() + (match ? parseInt(match[1]) * 1000 : 3600000);
    
    return cachedCerts;
}

function decodeBase64Url(str) {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded, 'base64');
}

function decodeJwtPart(part) {
    return JSON.parse(decodeBase64Url(part).toString('utf8'));
}

async function verifyFirebaseToken(idToken) {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    
    const header = decodeJwtPart(parts[0]);
    const payload = decodeJwtPart(parts[1]);
    
    // Check claims
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp <= now) throw new Error('Token expired');
    if (payload.iat > now + 300) throw new Error('Token issued in the future');
    if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error('Invalid audience');
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) throw new Error('Invalid issuer');
    if (!payload.sub || typeof payload.sub !== 'string') throw new Error('Invalid subject');
    
    // Verify signature
    const certs = await getGoogleCerts();
    const cert = certs[header.kid];
    if (!cert) throw new Error('Unknown key ID');
    
    const signatureInput = parts[0] + '.' + parts[1];
    const signature = decodeBase64Url(parts[2]);
    
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signatureInput);
    
    if (!verifier.verify(cert, signature)) {
        throw new Error('Invalid signature');
    }
    
    return payload; // { sub: uid, email: ..., ... }
}

// Persist a model-retirement incident to the admin-visible `system_incidents`
// Firestore collection, so the admin health panel surfaces the warning even
// when a regular user's session triggered the fallback. Best-effort: never
// blocks or fails the AI response. No secrets/PII — only severity, feature
// tag, message, model name, and timestamp.
// Dedupe: one document per model (deterministic doc id), so a prolonged
// retirement updates a single incident instead of appending one doc per
// failing AI call. An in-memory throttle also skips repeat writes from the
// same warm instance for a few minutes to avoid hammering Firestore.
const incidentWriteTimes = new Map(); // model -> last write ms (per warm instance)
const INCIDENT_WRITE_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

function incidentDocId(model) {
    // Firestore doc ids must not contain '/'; keep it short and predictable.
    return 'mr-' + String(model).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

async function persistModelIncident(model, message) {
    try {
        const now = Date.now();
        const lastWrite = incidentWriteTimes.get(model) || 0;
        if (now - lastWrite < INCIDENT_WRITE_THROTTLE_MS) return;
        incidentWriteTimes.set(model, now);

        const docId = incidentDocId(model);
        const existing = await fsGet('system_incidents', docId);
        if (existing && existing.resolved === false) {
            // Unresolved incident already on record for this model — just bump
            // the last-seen timestamp and occurrence count.
            await fsUpdate('system_incidents', docId, {
                lastSeen: new Date().toISOString(),
                occurrences: (typeof existing.occurrences === 'number' ? existing.occurrences : 1) + 1
            });
            return;
        }
        // No incident yet, or the previous one was resolved (re-raise it —
        // if the model is still failing after an admin marked it resolved,
        // that resolution was premature).
        await fsSet('system_incidents', docId, {
            severity: 'critical',
            feature: 'anthropic-model-retired',
            message: String(message).slice(0, 1000),
            model: String(model).slice(0, 100),
            timestamp: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            occurrences: 1,
            resolved: false
        });
    } catch (err) {
        console.error('Failed to persist model-retirement incident:', err.message);
    }
}

// Simple rate limiting (resets on cold start, ~5 min window on Vercel)
const rateLimits = new Map();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(uid) {
    const now = Date.now();
    const entry = rateLimits.get(uid);
    
    if (!entry || now - entry.start > RATE_WINDOW) {
        rateLimits.set(uid, { start: now, count: 1 });
        return true;
    }
    
    entry.count++;
    return entry.count <= RATE_LIMIT;
}

export default async function handler(req, res) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', 'https://myblueprint.work');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(204).end();
    }
    
    // Only POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Check for API key in environment
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
        console.error('ANTHROPIC_API_KEY not configured');
        return res.status(500).json({ error: 'AI service not configured' });
    }
    
    // Extract and verify Firebase token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    let user;
    try {
        user = await verifyFirebaseToken(token);
    } catch (err) {
        console.error('Token verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    // Rate limit by user ID
    if (!checkRateLimit(user.sub)) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.' });
    }
    
    // Forward to Anthropic
    try {
        const body = req.body;
        
        // Enforce model and limits (prevent abuse)
        if (!ALLOWED_MODELS.includes(body.model)) {
            body.model = BP_AI_MODEL;
        }
        if (!body.max_tokens) {
            body.max_tokens = 4096;
        } else if (body.max_tokens > 12000) {
            body.max_tokens = 12000;
        }
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 58000);
        
        try {
            const callAnthropic = (payload) => fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            let anthropicRes = await callAnthropic(body);
            let data = await anthropicRes.json();
            
            // Detect retired/unknown model: Anthropic returns 404 with type 'not_found_error'
            // mentioning the model. Retry once with the current default allowlisted model so a
            // model retirement doesn't silently break every AI feature.
            const isModelNotFound =
                anthropicRes.status === 404 &&
                data && data.error && data.error.type === 'not_found_error' &&
                /model/i.test(data.error.message || '');
            
            if (isModelNotFound && body.model !== BP_AI_MODEL) {
                console.error(
                    `MODEL RETIRED: Anthropic rejected model "${body.model}" (not_found_error). ` +
                    `Retrying once with default model "${BP_AI_MODEL}". ` +
                    `Update the allowlist in api/ai.js to remove the retired model.`
                );
                const retryBody = { ...body, model: BP_AI_MODEL };
                anthropicRes = await callAnthropic(retryBody);
                data = await anthropicRes.json();
                if (anthropicRes.ok) {
                    console.warn(`Model fallback succeeded: "${body.model}" -> "${BP_AI_MODEL}"`);
                    res.setHeader('X-BP-Model-Fallback', '1');
                    res.setHeader('Access-Control-Expose-Headers', 'X-BP-Model-Fallback');
                    await persistModelIncident(body.model,
                        `Requested AI model "${body.model}" was rejected by Anthropic (likely retired); ` +
                        `server fell back to the default model "${BP_AI_MODEL}". Update the model allowlist in api/ai.js.`);
                } else {
                    console.error(`Model fallback to "${BP_AI_MODEL}" also failed with status ${anthropicRes.status}`);
                    await persistModelIncident(body.model,
                        `Requested AI model "${body.model}" was rejected by Anthropic (likely retired) and the ` +
                        `fallback to "${BP_AI_MODEL}" also failed (status ${anthropicRes.status}). Update api/ai.js.`);
                }
            } else if (isModelNotFound) {
                // The default model itself was rejected — no fallback possible.
                await persistModelIncident(body.model,
                    `Anthropic rejected the default AI model "${body.model}" (not_found_error) — likely retired, ` +
                    `no fallback available. All AI features are broken until api/ai.js is updated.`);
            }
            
            res.setHeader('Access-Control-Allow-Origin', 'https://myblueprint.work');
            
            return res.status(anthropicRes.status).json(data);
        } finally {
            clearTimeout(timeout);
        }
        
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('Anthropic API timed out after 58s');
            return res.status(504).json({ error: 'AI request timed out after 58s. Try pasting resume text instead of uploading a PDF.' });
        }
        console.error('Anthropic API error:', err.message);
        return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }
};
