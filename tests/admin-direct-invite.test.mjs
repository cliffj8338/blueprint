import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const source = fs.readFileSync('public/admin-direct-invite.js', 'utf8');
function harness(entry, options = {}) {
    const writes = [];
    let stored = entry;
    const ref = { update: async value => {
        if (options.failUpdate) throw new Error('permission denied');
        writes.push(['update', value]);
        stored = { ...stored, ...value };
    }};
    const scope = {
        window: {}, fbIsAdmin: true, showcaseMode: false, fbUser: { uid: 'test-admin' },
        firebase: { firestore: { FieldValue: { serverTimestamp: () => 'SERVER_TIME' } } },
        fbDb: {
            collection: name => { assert.equal(name, 'waitlist'); return { doc: id => {
                assert.equal(id, 'person_example_test'); return ref;
            }}; },
            runTransaction: async fn => fn({
                get: async () => ({ exists: !!stored, data: () => stored }),
                set: (_, value) => { writes.push(['create', value]); stored = value; }
            })
        }
    };
    vm.runInNewContext(source, scope);
    return { scope, writes, send: scope.window.BPDirectInvite.send, stored: () => stored };
}
test('creates a direct entry then transitions status for the existing mailer', async () => {
    const h = harness();
    assert.equal((await h.send(' Person@Example.Test ', ' Person ')).alreadyInvited, false);
    assert.equal(h.writes.length, 2);
    assert.equal(h.writes[0][1].status, 'waiting');
    assert.equal(h.writes[0][1].source, 'admin-direct');
    assert.equal(h.stored().email, 'person@example.test');
    assert.equal(h.stored().name, 'Person');
    assert.equal(h.stored().status, 'invited');
});
test('invites an existing waiting entry without overwriting signup data', async () => {
    const h = harness({ email: 'person@example.test', status: 'waiting', name: 'Original', position: 12 });
    await h.send('person@example.test', 'Replacement');
    assert.equal(h.writes.length, 1);
    assert.equal(h.stored().name, 'Original');
    assert.equal(h.stored().position, 12);
});
test('does not resend an existing invitation', async () => {
    const h = harness({ email: 'person@example.test', status: 'invited' });
    assert.equal((await h.send('person@example.test')).alreadyInvited, true);
    assert.equal(h.writes.length, 0);
});
test('rejects legacy identifier collisions without changing a record', async () => {
    const h = harness({ email: 'person+example@test', status: 'waiting' });
    await assert.rejects(h.send('person@example.test'), /conflicts/);
    assert.equal(h.writes.length, 0);
});
test('rejects non-admin, showcase and signed-out submissions', async () => {
    for (const patch of [{ fbIsAdmin: false }, { showcaseMode: true }, { fbUser: null }]) {
        const h = harness(); Object.assign(h.scope, patch);
        await assert.rejects(h.send('person@example.test'), /administrator/);
        assert.equal(h.writes.length, 0);
    }
});
test('validates email and name without writes', async () => {
    for (const [email, name] of [['invalid', ''], ['a b@example.test', ''], ['person@example.test', 'x'.repeat(201)]]) {
        const h = harness();
        await assert.rejects(h.send(email, name), /valid email|200/);
        assert.equal(h.writes.length, 0);
    }
});
test('failed invitation leaves a retryable entry and never claims success', async () => {
    const h = harness(undefined, { failUpdate: true });
    await assert.rejects(h.send('person@example.test'), /could not be queued/);
    assert.equal(h.stored().status, 'waiting');
    await assert.rejects(h.send('person@example.test'), /could not be queued/);
    assert.equal(h.writes.length, 1);
});
