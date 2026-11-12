import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function dataHarness(storage = new Map()) {
    const calls = [];
    const renders = [];
    let clears = 0;
    const window = {
        localStorage: {
            getItem(key) { return storage.get(key) ?? null; },
            setItem(key, value) { storage.set(key, value); }
        },
        fbUser: { uid: 'person-a' },
        fbDb: { collection(name) {
            assert.equal(name, 'users');
            return { doc(uid) {
                return { collection(child) {
                    assert.equal(child, 'work_blueprints');
                    return { get() {
                        return new Promise((resolve, reject) => calls.push({ uid, resolve, reject }));
                    } };
                } };
            } };
        } },
        appContext: { mode: 'live' },
        bpAgentSupportMap: {
            render(options) { renders.push(options); },
            clear() { clears++; }
        }
    };
    vm.runInNewContext(fs.readFileSync('public/agent-support-data.js', 'utf8'), {
        window, console: { warn() {} }
    });
    return {
        window, calls, renders, storage,
        controller: window.bpAgentSupportData,
        get clears() { return clears; },
        last() { return renders.at(-1); },
        resolve(index, docs) {
            calls[index].resolve({ forEach(fn) {
                docs.forEach(doc => fn({ id: doc.id, data: () => doc }));
            } });
        }
    };
}

test('map data is lazy, request-deduplicated and reused on rerender', async () => {
    const h = dataHarness();
    const graph = { node: {}, link: {}, svg: {} };
    h.controller.mount(graph);
    assert.equal(h.last().status, 'idle');
    assert.equal(h.calls.length, 0, 'mount must not fetch anything');
    const request = h.last().onLoad();
    h.last().onLoad();
    assert.equal(h.calls.length, 1);
    assert.equal(h.last().status, 'loading');
    const saved = { id: 'wb-1', title: 'Role', workTasks: [{ task: 'Analyze' }] };
    h.resolve(0, [saved]);
    await request;
    assert.equal(h.last().status, 'ready');
    assert.equal(h.last().blueprints[0].workTasks[0].task, 'Analyze');
    assert.notEqual(h.last().blueprints[0], saved);
    h.controller.clear();
    h.controller.mount(graph);
    assert.equal(h.last().status, 'ready');
    assert.equal(h.calls.length, 1);
});

test('load errors are explicit and retry can recover; refresh removes deleted tasks', async () => {
    const h = dataHarness();
    h.controller.mount({});
    const first = h.last().onLoad();
    h.calls[0].reject(new Error('offline'));
    await first;
    assert.equal(h.last().status, 'error');
    assert.equal(h.last().blueprints.length, 0);
    const retry = h.last().onLoad();
    h.resolve(1, [{ id: 'wb', workTasks: [{ task: 'Old' }] }]);
    await retry;
    assert.equal(h.last().blueprints.length, 1);
    const refresh = h.last().onRefresh();
    h.resolve(2, []);
    await refresh;
    assert.equal(h.last().status, 'ready');
    assert.equal(h.last().blueprints.length, 0);
});

test('account switches and signout discard in-flight private data', async () => {
    const h = dataHarness();
    h.controller.mount({});
    const old = h.last().onLoad();
    h.window.fbUser = { uid: 'person-b' };
    h.controller.reset();
    h.controller.mount({});
    h.resolve(0, [{ id: 'private-a' }]);
    await old;
    assert.equal(h.last().status, 'idle');
    assert.equal(h.last().blueprints.length, 0);
    const next = h.last().onLoad();
    assert.equal(h.calls[1].uid, 'person-b');
    h.window.fbUser = null;
    h.controller.reset();
    const renderCount = h.renders.length;
    h.resolve(1, [{ id: 'private-b' }]);
    await next;
    assert.equal(h.renders.length, renderCount);
});

test('samples, showcase, readonly and signed-out contexts never fetch or decorate', () => {
    for (const setup of [
        w => { w.fbUser = null; },
        w => { w.appContext.mode = 'demo'; },
        w => { w.showcaseMode = true; },
        w => { w.isReadOnlyProfile = true; },
        w => { w.fbDb = null; }
    ]) {
        const h = dataHarness();
        setup(h.window);
        h.controller.mount({});
        assert.equal(h.calls.length, 0);
        assert.equal(h.renders.length, 0);
        assert.ok(h.clears > 0);
    }
});

test('leaving the personal graph while loading never decorates another view', async () => {
    const h = dataHarness();
    h.controller.mount({});
    const pending = h.last().onLoad();
    h.controller.clear();
    const count = h.renders.length;
    h.resolve(0, [{ id: 'wb' }]);
    await pending;
    assert.equal(h.renders.length, count);
    h.controller.mount({});
    assert.equal(h.last().status, 'ready');
});

test('a stale request cannot overwrite a new request after reset', async () => {
    const h = dataHarness();
    h.controller.mount({});
    const first = h.last().onLoad();
    h.controller.reset();
    h.controller.mount({});
    const second = h.last().onLoad();
    h.resolve(1, [{ id: 'new' }]);
    await second;
    h.resolve(0, [{ id: 'old' }]);
    await first;
    assert.equal(h.last().blueprints[0].id, 'new');
});

test('capabilities map only to explicit existing human skills without mutation', () => {
    const window = {};
    vm.runInNewContext(fs.readFileSync('public/agent-support-map.js', 'utf8'), { window });
    const skills = [
        { name: 'Data Analysis', level: 'Novice' },
        { name: 'Writing', level: 'Expert' }
    ];
    const blueprints = [{
        id: 'one', title: 'Analyst',
        workTasks: [{
            task: 'Report', owner: 'shared',
            agentCapabilities: [
                { name: 'Summarize', proficiency: 'Mastery', relatedHumanSkill: ' data   analysis ' },
                { name: 'Draft', relatedHumanSkill: 'Writing' },
                { name: 'Invented', relatedHumanSkill: 'No such skill' },
                { name: 'Writing', relatedHumanSkill: '' },
                null
            ]
        }]
    }];
    const before = JSON.stringify({ skills, blueprints });
    const index = window.bpAgentSupportMap.indexSupport(blueprints, skills);
    assert.equal(index.size, 2);
    assert.equal(index.get('data analysis')[0].capability.proficiency, 'Mastery');
    assert.equal(index.get('writing')[0].task.owner, 'shared');
    assert.equal(JSON.stringify({ skills, blueprints }), before);
    assert.equal(skills[0].level, 'Novice');
});

test('legacy and malformed work data produces no false support', () => {
    const window = {};
    vm.runInNewContext(fs.readFileSync('public/agent-support-map.js', 'utf8'), { window });
    const indexSupport = window.bpAgentSupportMap.indexSupport;
    for (const blueprints of [null, [], [null, {}, { workTasks: 'bad' }]]) {
        assert.equal(indexSupport(blueprints, [{ name: 'Writing' }]).size, 0);
    }
});

test('production and module personal renderers mount support and clear it in other modes', () => {
    for (const file of ['public/app-core.js', 'app-core.js', 'src/views/network.js']) {
        const source = fs.readFileSync(file, 'utf8');
        assert.match(source, /bpAgentSupportData\.mount\(\{ svg, node, link \}\)/);
        for (const renderer of ['initJobNetwork', 'initMatchNetwork', 'initValuesNetwork', 'initCardView']) {
            const fn = source.slice(source.indexOf(`function ${renderer}(`));
            assert.match(fn.slice(0, 180), /bpAgentSupportData\.clear\(\)/);
        }
    }
});

test('selection starts empty, is account scoped and persists without fetching on remount', async () => {
    const h = dataHarness();
    h.controller.mount({});
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), []);
    const load = h.last().onLoad();
    h.resolve(0, [{ id: 'one' }, { id: 'two' }]);
    await load;
    h.last().onSelectionChange(['one', 'one', 'unknown']);
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), ['one']);
    assert.equal(h.calls.length, 1);
    h.controller.clear();
    h.controller.mount({});
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), ['one']);
    const staleChange = h.last().onSelectionChange;
    const staleLoad = h.last().onLoad;
    h.window.fbUser = { uid: 'person-b' };
    h.controller.mount({});
    staleChange(['two']);
    staleLoad();
    assert.equal(h.calls.length, 1, 'old controls cannot load another account');
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), []);
    h.window.fbUser = { uid: 'person-a' };
    h.controller.mount({});
    assert.equal(h.last().status, 'idle', 'remembered selection does not bypass opt-in loading');
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), ['one']);
    const reopened = dataHarness(h.storage);
    reopened.controller.mount({});
    assert.deepEqual(Array.from(reopened.last().selectedBlueprintIds), ['one']);
    assert.equal(reopened.calls.length, 0);
});

test('refresh prunes deleted selections and leaves new Blueprints unselected', async () => {
    const h = dataHarness();
    h.controller.mount({});
    let pending = h.last().onLoad();
    h.resolve(0, [{ id: 'one' }, { id: 'two' }]);
    await pending;
    h.last().onSelectionChange(['one', 'two']);
    pending = h.last().onRefresh();
    h.resolve(1, [{ id: 'two' }, { id: 'new' }]);
    await pending;
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), ['two']);
    pending = h.last().onRefresh();
    h.resolve(2, []);
    await pending;
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), []);
    assert.equal(h.storage.get('bp-agent-support-selection:person-a'), '[]');
});

test('failed refresh retains choices for retry but removes stale requirements', async () => {
    const h = dataHarness();
    h.controller.mount({});
    let pending = h.last().onLoad();
    h.resolve(0, [{ id: 'one' }]);
    await pending;
    h.last().onSelectionChange(['one']);
    pending = h.last().onRefresh();
    h.calls[1].reject(new Error('offline'));
    await pending;
    assert.equal(h.last().status, 'error');
    assert.equal(h.last().blueprints.length, 0);
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), ['one']);
    pending = h.last().onLoad();
    h.resolve(2, [{ id: 'one' }]);
    await pending;
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), ['one']);
});

test('unreadable or blocked storage gives an explicit warning without breaking selection', async () => {
    const h = dataHarness(new Map([['bp-agent-support-selection:person-a', '{"bad":true}']]));
    h.controller.mount({});
    assert.match(h.last().selectionWarning, /could not be read/);
    const pending = h.last().onLoad();
    h.resolve(0, [{ id: 'one' }]);
    await pending;
    h.window.localStorage.setItem = () => { throw new Error('blocked'); };
    h.last().onSelectionChange(['one']);
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), ['one']);
    assert.match(h.last().selectionWarning, /could not be saved/);
});

test('old view and restricted-context selection callbacks cannot change preferences', async () => {
    const h = dataHarness();
    h.controller.mount({});
    const pending = h.last().onLoad();
    h.resolve(0, [{ id: 'one' }]);
    await pending;
    const oldChange = h.last().onSelectionChange;
    h.controller.clear();
    h.controller.mount({});
    oldChange(['one']);
    assert.deepEqual(Array.from(h.last().selectedBlueprintIds), []);
    const restrictedChange = h.last().onSelectionChange;
    h.window.isReadOnlyProfile = true;
    restrictedChange(['one']);
    assert.equal(h.storage.size, 0);
});
