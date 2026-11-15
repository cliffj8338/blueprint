import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.style = {}; }
    appendChild(el) { this.children.push(el); return el; }
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key]; }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    querySelector(selector) { return this.children.find(c => '.' + c.className === selector) || this.children.flatMap(c => c.children).find(c => '.' + c.className === selector); }
}
function harness(options = {}) {
    const row = new Element('div');
    row.setAttribute('data-bp-invited-id', 'entry');
    row.firstElementChild = row.appendChild(new Element('div'));
    const container = { querySelectorAll: () => [row] };
    const calls = [];
    let confirms = 0;
    const root = {
        fbIsAdmin: true, showcaseMode: false,
        fbUser: { uid: 'admin', getIdToken: async () => 'test-token' },
        crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789012' },
        confirm: () => { confirms++; return options.confirm !== false; },
        fetch: async (url, init) => {
            calls.push({ url, init });
            if (options.fail) throw new Error('timeout');
            return { ok: options.ok !== false, json: async () => options.result || { outcome: 'accepted', providerId: 'fake-message' } };
        }
    };
    vm.runInNewContext(fs.readFileSync('public/admin-invite-resend.js', 'utf8'), {
        window: root, document: { createElement: tag => new Element(tag) }, AbortSignal, Set, Map, Date
    });
    const mount = () => root.BPInviteResend.mount(container, [{ _id: 'entry', email: 'person@example.test' }]);
    mount();
    const panel = row.firstElementChild.children[0];
    return { root, row, panel, calls, mount, confirms: () => confirms };
}
test('confirmed resend submits a specific authenticated request and displays provider acceptance, not delivery', async () => {
    const h = harness();
    await h.panel.children[0].listeners.click();
    assert.equal(h.confirms(), 1);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].init.headers.Authorization, 'Bearer test-token');
    assert.equal(JSON.parse(h.calls[0].init.body).confirmed, true);
    assert.equal(JSON.parse(h.calls[0].init.body).email, 'person@example.test');
    assert.match(h.panel.children[2].textContent, /Accepted by Resend.*fake-message.*delivery is not confirmed/);
    assert.equal(h.panel.children[0].disabled, false);
    h.mount();
    assert.equal(h.row.firstElementChild.children.length, 1);
});
test('cancellation, showcase, signed-out and non-admin states never submit', async () => {
    const h = harness({ confirm: false });
    await h.panel.children[0].listeners.click();
    assert.equal(h.calls.length, 0);
    for (const patch of [{ fbIsAdmin: false }, { fbUser: null }, { showcaseMode: true }]) {
        const other = harness(); Object.assign(other.root, patch);
        await other.panel.children[0].listeners.click();
        assert.equal(other.calls.length, 0);
    }
});
test('duplicate clicks while token retrieval is pending only submit once', async () => {
    const h = harness();
    let finish;
    h.root.fbUser.getIdToken = () => new Promise(resolve => { finish = resolve; });
    const first = h.panel.children[0].listeners.click();
    await h.panel.children[0].listeners.click();
    assert.equal(h.panel.children[0].disabled, true);
    finish('test-token');
    await first;
    assert.equal(h.calls.length, 1);
});
test('administrator changing during token retrieval aborts before submission', async () => {
    const h = harness();
    h.root.fbUser.getIdToken = async () => { h.root.fbUser = { uid: 'other' }; return 'token'; };
    await h.panel.children[0].listeners.click();
    assert.equal(h.calls.length, 0);
    assert.match(h.panel.children[2].textContent, /administrator changed/);
});
test('timeout and rejected outcomes never claim success, check action retrieves persisted status', async () => {
    const h = harness({ fail: true });
    await h.panel.children[0].listeners.click();
    assert.match(h.panel.children[2].textContent, /may have been accepted/);
    const rejected = harness({ result: { outcome: 'rejected', providerStatus: 422 } });
    await rejected.panel.children[0].listeners.click();
    assert.match(rejected.panel.children[2].textContent, /Rejected by Resend/);
    const read = harness();
    await read.panel.children[1].listeners.click();
    assert.equal(read.calls[0].init.method, 'GET');
    assert.match(read.calls[0].url, /entryId=entry/);
    assert.equal(read.confirms(), 0);
});
test('both waitlist renderers mount the resend component only beside invited rows', () => {
    const core = fs.readFileSync('public/app-core.js', 'utf8');
    assert.equal((core.match(/data-bp-invited-id=/g) || []).length, 2);
    assert.match(core, /BPInviteResend\.mount\(el, invited\)/);
    assert.match(core, /BPInviteResend\.mount\(container, invited\)/);
    assert.equal(core, fs.readFileSync('app-core.js', 'utf8'));
});
