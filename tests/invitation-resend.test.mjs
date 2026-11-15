import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvitationResendService, createResendProvider, COOLDOWN_MS, DAILY_LIMIT, invitationMessage } from '../api/lib/invitation-resend.js';
import { createHandler } from '../api/invitation-resend.js';

// This fake database serializes transactions, enforces reads-before-writes, and
// has NO connection to Firebase. All provider responses are injected.
function database() {
    const docs = new Map();
    const writes = [];
    let queue = Promise.resolve();
    const db = {
        docs, writes, failFinalize: false,
        collection: collection => ({ doc: id => {
            assert.equal(typeof id, 'string');
            const path = collection + '/' + id;
            return { path, set: async value => {
                if (db.failFinalize) throw new Error('database unavailable');
                docs.set(path, structuredClone(value)); writes.push(path);
            } };
        } }),
        runTransaction: fn => {
            const run = queue.then(async () => {
                const staged = [];
                const result = await fn({
                    get: async ref => {
                        assert.equal(staged.length, 0, 'transaction reads precede all writes');
                        return { exists: docs.has(ref.path), data: () => structuredClone(docs.get(ref.path)) };
                    },
                    set: (ref, value) => staged.push([ref.path, structuredClone(value)])
                });
                for (const [path, value] of staged) { docs.set(path, value); writes.push(path); }
                return result;
            });
            queue = run.catch(() => {});
            return run;
        }
    };
    return db;
}

function harness(options = {}) {
    const db = database();
    db.docs.set('users/admin', { role: 'admin' });
    db.docs.set('users/admin2', { role: 'admin' });
    db.docs.set('users/person', { role: 'user' });
    const entry = { email: 'person@example.test', name: 'Original Signup', status: 'invited', position: 12, referral: 'friend', createdAt: 'original-time' };
    db.docs.set('waitlist/entry', entry);
    let time = Date.parse('2026-11-11T12:00:00Z');
    const sends = [];
    const sendEmail = async (...args) => {
        sends.push(args);
        if (options.failSend) throw new Error('timed out');
        return options.result || { outcome: 'accepted', providerId: 'provider-message-1', providerStatus: 200 };
    };
    const service = createInvitationResendService({ db, sendEmail, now: () => time, uuid: () => 'test-correlation' });
    let index = 0;
    const input = patch => ({ entryId: 'entry', email: entry.email, confirmed: true, requestId: 'request-number-' + (++index).toString().padStart(5, '0'), ...patch });
    return { db, service, sends, input, entry, advance: ms => { time += ms; } };
}

test('resends through the provider without writing signup records or cycling status', async () => {
    const h = harness();
    const result = await h.service.resend('admin', h.input());
    assert.equal(result.outcome, 'accepted');
    assert.equal(result.providerId, 'provider-message-1');
    assert.equal(h.sends.length, 1);
    assert.equal(h.sends[0][0].email, 'person@example.test');
    assert.deepEqual(h.db.docs.get('waitlist/entry'), h.entry);
    assert.ok(h.db.writes.every(path => path.startsWith('invitation_resend_')));
    assert.equal((await h.service.status('admin', 'entry')).outcome, 'accepted');
});

test('requires a real admin role and explicit confirmation without writes or mail', async () => {
    const h = harness();
    for (const uid of ['person', 'unknown']) {
        await assert.rejects(h.service.resend(uid, h.input()), error => error.status === 403);
        await assert.rejects(h.service.status(uid, 'entry'), error => error.status === 403);
    }
    for (const patch of [{ confirmed: false }, { confirmed: 'true' }, { entryId: '../bad' }, { requestId: 'bad' }, { email: null }]) {
        await assert.rejects(h.service.resend('admin', h.input(patch)), error => error.status === 400);
    }
    assert.equal(h.db.writes.length, 0);
    assert.equal(h.sends.length, 0);
});

test('refuses missing, waiting and changed recipients; browser cannot choose another address', async () => {
    const h = harness();
    await assert.rejects(h.service.resend('admin', h.input({ entryId: 'missing' })), error => error.status === 404);
    await assert.rejects(h.service.resend('admin', h.input({ email: 'different@example.test' })), error => error.status === 409);
    h.db.docs.get('waitlist/entry').status = 'waiting';
    await assert.rejects(h.service.resend('admin', h.input()), error => error.status === 409);
    assert.equal(h.sends.length, 0);
    assert.equal(h.db.writes.length, 0);
});

test('cooldown persists across service instances and competing administrators', async () => {
    const h = harness();
    const other = createInvitationResendService({ db: h.db, sendEmail: async () => { throw new Error('must not send'); }, now: () => Date.parse('2026-11-11T12:00:00Z') });
    const results = await Promise.allSettled([h.service.resend('admin', h.input()), other.resend('admin2', h.input())]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.find(r => r.status === 'rejected').reason.status, 429);
    assert.equal(h.sends.length, 1);
});

test('different waitlist IDs for the same address share a cooldown', async () => {
    const h = harness();
    h.db.docs.set('waitlist/duplicate', { ...h.entry, email: ' Person@Example.Test ' });
    await h.service.resend('admin', h.input());
    await assert.rejects(h.service.resend('admin2', h.input({ entryId: 'duplicate' })), error => error.status === 429);
});

test('original email acceptance timestamp also blocks an immediate resend', async () => {
    const h = harness();
    h.db.docs.get('waitlist/entry').inviteEmailSentAt = '2026-11-11T11:59:00Z';
    await assert.rejects(h.service.resend('admin', h.input()), error => error.status === 429);
    assert.equal(h.sends.length, 0);
});

test('daily limit counts failed and unknown attempts and resets next UTC day', async () => {
    const h = harness({ failSend: true });
    for (let i = 0; i < DAILY_LIMIT; i++) {
        assert.equal((await h.service.resend('admin', h.input())).outcome, 'unknown');
        h.advance(COOLDOWN_MS);
    }
    await assert.rejects(h.service.resend('admin', h.input()), error => error.status === 429 && /three/.test(error.message));
    h.advance(86_400_000);
    assert.equal((await h.service.resend('admin', h.input())).outcome, 'unknown');
    assert.equal(h.sends.length, 4);
});

test('per-administrator hourly limit applies across recipients', async () => {
    const h = harness();
    for (let i = 0; i < 30; i++) {
        h.db.docs.set('waitlist/user-' + i, { ...h.entry, email: 'person' + i + '@example.test' });
        await h.service.resend('admin', h.input({ entryId: 'user-' + i, email: 'person' + i + '@example.test' }));
    }
    await assert.rejects(h.service.resend('admin', h.input()), error => error.status === 429 && /hourly/.test(error.message));
    assert.equal(h.sends.length, 30);
});

test('replaying a confirmed request never sends twice, even after cooldown', async () => {
    const h = harness();
    const input = h.input();
    const original = await h.service.resend('admin', input);
    h.advance(COOLDOWN_MS * 2);
    assert.equal((await h.service.resend('admin', input)).providerId, original.providerId);
    assert.equal(h.sends.length, 1);
    assert.match(h.sends[0][2], /^blueprint-invite-[a-f0-9]{64}$/);
});

test('write failure after provider acceptance is explicit and does not release quota', async () => {
    const h = harness();
    h.db.failFinalize = true;
    const result = await h.service.resend('admin', h.input());
    assert.equal(result.outcome, 'accepted');
    assert.equal(result.auditSaved, false);
    await assert.rejects(h.service.resend('admin', h.input()), error => error.status === 429);
    assert.equal((await h.service.status('admin', 'entry')).outcome, 'processing');
    h.advance(61_000);
    assert.equal((await h.service.status('admin', 'entry')).outcome, 'unknown');
    assert.equal(h.sends.length, 1);
});

test('provider adapter reports acceptance, explicit rejection and ambiguity accurately', async () => {
    const entry = { email: 'person@example.test', name: '<untrusted>' };
    for (const [status, data, expected] of [[200, { id: 'message-id' }, 'accepted'], [422, { message: 'bad request' }, 'rejected'], [429, {}, 'rejected'], [503, {}, 'unknown'], [200, {}, 'unknown']]) {
        const provider = createResendProvider({
            getApiKey: async () => 'fake-key',
            fetchImpl: async (url, options) => {
                assert.equal(url, 'https://api.resend.com/emails');
                assert.equal(options.headers['Idempotency-Key'], 'stable-key');
                assert.equal(JSON.parse(options.body).to[0], entry.email);
                return { ok: status === 200, status, json: async () => data };
            }
        });
        assert.equal((await provider(entry, 'entry', 'stable-key')).outcome, expected);
    }
    const timeout = createResendProvider({ getApiKey: async () => 'fake', fetchImpl: async () => { throw new Error('timeout'); } });
    assert.equal((await timeout(entry, 'entry', 'key')).outcome, 'unknown');
    const noConfig = createResendProvider({ getApiKey: async () => { throw new Error('permission denied'); }, fetchImpl: () => assert.fail('must not send') });
    assert.equal((await noConfig(entry, 'entry', 'key')).providerStatus, 'configuration_unavailable');
    assert.match(invitationMessage(entry, 'a+b?').text, /invite=a%2Bb%3F/);
    assert.equal(invitationMessage(entry, 'entry').html, undefined);
});

function response() {
    return { headers: {}, status(code) { this.statusCode = code; return this; }, setHeader(key, value) { this.headers[key] = value; }, json(data) { this.body = data; return this; } };
}
test('HTTP handler rejects unauthenticated, expired, malformed and showcase requests', async () => {
    const h = harness();
    const handler = createHandler(() => ({ service: h.service, verifyToken: async token => {
        if (token === 'expired') throw new Error('expired');
        return { uid: token };
    } }));
    for (const [patch, expected] of [
        [{ method: 'DELETE' }, 405], [{ headers: {} }, 401],
        [{ headers: { authorization: 'Bearer expired' } }, 401],
        [{ headers: { authorization: 'Bearer admin', 'content-type': 'text/plain' } }, 415],
        [{ body: '{bad json' }, 400], [{ body: { showcase: true } }, 403]
    ]) {
        const res = response();
        await handler({ method: 'POST', headers: { authorization: 'Bearer admin', 'content-type': 'application/json' }, body: h.input(), ...patch }, res);
        assert.equal(res.statusCode, expected);
        assert.equal(res.headers['Cache-Control'], 'no-store');
    }
    assert.equal(h.sends.length, 0);
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer admin', 'content-type': 'application/json' }, body: h.input() }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.outcome, 'accepted');
    const limited = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer admin', 'content-type': 'application/json' }, body: h.input() }, limited);
    assert.equal(limited.statusCode, 429);
    assert.ok(limited.headers['Retry-After']);
    const read = response();
    await handler({ method: 'GET', headers: { authorization: 'Bearer admin' }, query: { entryId: 'entry' } }, read);
    assert.equal(read.body.providerId, 'provider-message-1');
});
