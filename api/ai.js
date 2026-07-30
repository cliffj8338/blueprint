// Blueprint™ AI Proxy — Vercel Serverless Function
// Validates Firebase ID token, forwards to Anthropic API with server-side key.
// Deploy: place in /api/ai.js, set ANTHROPIC_API_KEY in Vercel Environment Variables.

import crypto from 'crypto';

// Firebase project config
const FIREBASE_PROJECT_ID = 'work-blueprint';

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
        const allowedModels = ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
        if (!allowedModels.includes(body.model)) {
            body.model = 'claude-sonnet-4-6';
        }
        if (!body.max_tokens) {
            body.max_tokens = 4096;
        } else if (body.max_tokens > 12000) {
            body.max_tokens = 12000;
        }
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 58000);
        
        try {
            const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            
            const data = await anthropicRes.json();
            
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
