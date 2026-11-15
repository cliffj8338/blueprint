import { createHash, randomUUID } from 'node:crypto';

export const COOLDOWN_MS = 5 * 60 * 1000;
export const DAILY_LIMIT = 3;
const ADMIN_HOURLY_LIMIT = 30;
const hash = value => createHash('sha256').update(value).digest('hex');
const normalizedEmail = value => String(value || '').trim().toLowerCase();
const validEmail = value => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validId = value => typeof value === 'string' && value.length > 0
    && Buffer.byteLength(value) <= 1500 && !value.includes('/') && !['.', '..'].includes(value);

export class InviteError extends Error {
    constructor(status, message, retryAt) {
        super(message);
        this.status = status;
        this.retryAt = retryAt;
    }
}

function publicAttempt(data, now) {
    if (!data) return { outcome: 'none' };
    let outcome = data.outcome;
    if (outcome === 'processing' && now - data.requestedAt > 60_000) outcome = 'unknown';
    return {
        outcome, requestedAt: data.requestedAt, completedAt: data.completedAt || null,
        providerId: data.providerId || null, retryAt: data.retryAt,
        // Provider error bodies may contain addresses or other private details.
        providerStatus: data.providerStatus || null
    };
}

// All dependencies are injected so automated checks cannot accidentally send mail.
export function createInvitationResendService({ db, sendEmail, now = Date.now, uuid = randomUUID }) {
    async function requireEntry(tx, uid, entryId, expectedEmail) {
        const role = await tx.get(db.collection('users').doc(uid));
        if (!role.exists || role.data().role !== 'admin') throw new InviteError(403, 'Administrator access is required.');
        const entry = await tx.get(db.collection('waitlist').doc(entryId));
        if (!entry.exists) throw new InviteError(404, 'This waitlist entry no longer exists.');
        const data = entry.data();
        if (data.status !== 'invited') throw new InviteError(409, 'Only existing invited entries can be resent.');
        const email = normalizedEmail(data.email);
        if (!validEmail(email)) throw new InviteError(409, 'This entry does not have a valid email address.');
        if (expectedEmail !== undefined && email !== normalizedEmail(expectedEmail)) {
            throw new InviteError(409, 'The recipient changed. Refresh the waitlist before resending.');
        }
        return { ...data, email };
    }

    async function status(uid, entryId) {
        if (!validId(entryId)) throw new InviteError(400, 'A valid waitlist entry is required.');
        return db.runTransaction(async tx => {
            const entry = await requireEntry(tx, uid, entryId);
            const limit = await tx.get(db.collection('invitation_resend_limits').doc(hash(entry.email)));
            if (!limit.exists) return { outcome: 'none' };
            const attempt = await tx.get(db.collection('invitation_resend_attempts').doc(limit.data().latestAttemptId));
            return publicAttempt(attempt.exists ? attempt.data() : null, now());
        });
    }

    async function resend(uid, input) {
        if (!input || input.confirmed !== true || !validId(input.entryId)
            || typeof input.email !== 'string'
            || typeof input.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId)) {
            throw new InviteError(400, 'Confirm a specific recipient before resending.');
        }
        const requestedAt = now();
        const day = Math.floor(requestedAt / 86_400_000);
        const hour = Math.floor(requestedAt / 3_600_000);
        // Bound the client key to the admin identity. Never accept an arbitrary
        // provider idempotency key or destination from a browser.
        const attemptId = hash(uid + ':' + input.requestId);
        const attemptRef = db.collection('invitation_resend_attempts').doc(attemptId);
        const reservation = await db.runTransaction(async tx => {
            const entry = await requireEntry(tx, uid, input.entryId, input.email);
            const attempt = await tx.get(attemptRef);
            if (attempt.exists) {
                if (attempt.data().entryId !== input.entryId) throw new InviteError(409, 'This request was used for a different entry.');
                return { previous: publicAttempt(attempt.data(), requestedAt) };
            }
            const limitRef = db.collection('invitation_resend_limits').doc(hash(entry.email));
            const adminRef = db.collection('invitation_resend_admin_limits').doc(hash(uid));
            const [limitSnap, adminSnap] = await Promise.all([tx.get(limitRef), tx.get(adminRef)]);
            const limit = limitSnap.exists ? limitSnap.data() : {};
            const admin = adminSnap.exists ? adminSnap.data() : {};
            // Include the original trigger's acceptance timestamp in the cooldown.
            const initialSent = Date.parse(entry.inviteEmailSentAt || '') || 0;
            const retryAt = Math.max(limit.nextAllowedAt || 0, initialSent ? initialSent + COOLDOWN_MS : 0);
            if (requestedAt < retryAt) throw new InviteError(429, 'Wait five minutes between invitation emails to this recipient.', retryAt);
            const count = limit.day === day ? limit.count : 0;
            if (count >= DAILY_LIMIT) throw new InviteError(429, 'This recipient has reached the limit of three resend attempts per UTC day.', (day + 1) * 86_400_000);
            const adminCount = admin.hour === hour ? admin.count : 0;
            if (adminCount >= ADMIN_HOURLY_LIMIT) throw new InviteError(429, 'This administrator has reached the hourly resend limit.', (hour + 1) * 3_600_000);
            const record = {
                entryId: input.entryId, adminUid: uid, requestedAt,
                retryAt: Math.max(requestedAt + COOLDOWN_MS,
                    count + 1 >= DAILY_LIMIT ? (day + 1) * 86_400_000 : 0,
                    adminCount + 1 >= ADMIN_HOURLY_LIMIT ? (hour + 1) * 3_600_000 : 0),
                outcome: 'processing',
                // Generated only on reservation, retained for the provider audit.
                correlationId: uuid()
            };
            tx.set(attemptRef, record);
            tx.set(limitRef, { day, count: count + 1, nextAllowedAt: requestedAt + COOLDOWN_MS, latestAttemptId: attemptId });
            tx.set(adminRef, { hour, count: adminCount + 1 });
            return { entry, record };
        });
        if (reservation.previous) return reservation.previous;

        let result;
        try {
            result = await sendEmail(reservation.entry, input.entryId, 'blueprint-invite-' + attemptId);
            if (!result || !['accepted', 'rejected', 'unknown'].includes(result.outcome)
                || result.outcome === 'accepted' && !result.providerId) {
                result = { outcome: 'unknown' };
            }
        } catch (_) {
            // A timeout might happen after acceptance; never call that "failed"
            // or automatically send a second message.
            result = { outcome: 'unknown' };
        }
        const completed = { ...reservation.record, ...result, completedAt: now() };
        try {
            await attemptRef.set(completed);
        } catch (_) {
            // Quotas were already committed; do not release them or retry mail.
            return { ...publicAttempt(completed, now()), auditSaved: false };
        }
        return { ...publicAttempt(completed, now()), auditSaved: true };
    }
    return { resend, status };
}

// Kept separate from the externally deployed first-invite trigger. This endpoint
// NEVER changes a waitlist document or cycles waiting/invited status.
export function invitationMessage(entry, entryId) {
    const firstName = String(entry.name || '').trim().split(/\s+/)[0] || 'there';
    const url = 'https://www.myblueprint.work?invite=' + encodeURIComponent(entryId);
    return {
        from: 'Blueprint <invite@myblueprint.work>',
        to: [entry.email],
        subject: "You're in — your Blueprint is ready to build",
        text: `Hey ${firstName}, you're in.\n\nYour spot on Blueprint is ready. No more waiting.\n\nSign in with this email address to build your Blueprint and access skill mapping, job matching, market valuation, and your scouting report.\n\nBuild My Blueprint: ${url}\n\nBlueprint Career Intelligence\nThis invitation was resent by a Blueprint administrator.`
    };
}

export function createResendProvider({ getApiKey, fetchImpl = fetch }) {
    return async (entry, entryId, idempotencyKey) => {
        // Secret lookup happens BEFORE the request, so configuration errors are
        // distinguishable from an ambiguous network outcome.
        let apiKey;
        try { apiKey = await getApiKey(); } catch (_) {
            return { outcome: 'rejected', providerStatus: 'configuration_unavailable' };
        }
        if (!apiKey) return { outcome: 'rejected', providerStatus: 'configuration_unavailable' };
        try {
            const response = await fetchImpl('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
                body: JSON.stringify(invitationMessage(entry, entryId)),
                signal: AbortSignal.timeout(15_000)
            });
            const data = await response.json();
            if (response.ok && typeof data.id === 'string' && data.id.length <= 200) {
                return { outcome: 'accepted', providerId: data.id, providerStatus: response.status };
            }
            // A 5xx could occur after submission. 4xx is a definite rejection.
            return { outcome: response.status >= 400 && response.status < 500 ? 'rejected' : 'unknown', providerStatus: response.status };
        } catch (_) { return { outcome: 'unknown' }; }
    };
}
