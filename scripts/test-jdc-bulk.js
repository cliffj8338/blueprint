import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Exercise the shipped legacy functions without booting Firebase or the whole SPA.
const source = readFileSync('public/app-core.js', 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const jd = i => `Senior Engineer ${i}\nDesign reliable systems and collaborate with teams to deliver customer outcomes.`;

function harness() {
    const elements = {
        jdcBulkInput: { value: '' },
        jdcBulkLocalOnly: { checked: false },
        jdcBulkProgress: { innerHTML: '' },
        adminTabContent: { innerHTML: '' }
    };
    const events = [];
    const context = vm.createContext({
        console: { log() {}, warn() {}, error() {} }, setTimeout, AbortController, AbortSignal, Blob,
        window: {}, document: { getElementById: id => elements[id], querySelectorAll: () => [] },
        escapeHtml: text => String(text).replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
        showToast: (...args) => events.push(args), logAnalyticsEvent: (...args) => events.push(args),
        renderAdminJDConverter: () => { context.renders++; context._jdcUpdateBulkProgress(); },
        renders: 0, _jdcBulkJob: null, _jdcBulkResults: [], _jdcResult: null,
        _jdcBulkViewIdx: -1, _jdcCompMode: 'without', _jdcEditMode: false, _jdcFromRepo: false,
        firebase: { auth: () => ({ currentUser: {} }) },
        convertJDToBlueprint: text => ({
            title: text.split('\n')[0], skills: [], seniority: 'Senior', _rawJD: text,
            responsibilities: ['Design reliable systems'], workTasks: [{ task: 'Design', humanShare: 100 }],
            workAllocationSource: 'local'
        }),
        _wbSkillQualityFilter: skills => skills, WB_SKILL_CAP: 50,
        _jdcInferProficiency: () => 'Proficient', _jdcGenerateOutcome: () => 'Deliver',
        parseJobWithAPI: async text => ({
            title: text.split('\n')[0], skills: [{ name: 'Systems Design', proficiency: 'Advanced', tier: 'required' }],
            workTasks: [{ task: 'Design systems', outcome: 'Reliable services', allocation: 'shared',
                humanContribution: 'Decide architecture', agentContribution: 'Draft alternatives' }]
        })
    });
    vm.runInContext(section('        // ===== ASYNC JDC WRAPPER', '        async function runJDConverter()'), context);
    vm.runInContext(section('        function _jdcUpdateBulkProgress()', '        function convertJDToBlueprint(jdText)'), context);
    return { context, elements, events };
}

test('bulk paste requests AI work allocation sequentially, preserves order, and selects the first result', async () => {
    const { context: c, elements } = harness();
    let active = 0, maxActive = 0;
    const parser = c.parseJobWithAPI;
    c.parseJobWithAPI = async (...args) => {
        assert.equal(args[2].includeWorkAllocation, true);
        assert.ok(args[2].signal);
        maxActive = Math.max(maxActive, ++active);
        await new Promise(resolve => setTimeout(resolve, 2));
        active--;
        return parser(...args);
    };
    elements.jdcBulkInput.value = [jd(1), jd(2), jd(3)].join('\n---\n');
    await c.runJDConverterBulk();
    assert.equal(maxActive, 1);
    assert.deepEqual(Array.from(c._jdcBulkResults, bp => bp.title), [1, 2, 3].map(i => `Senior Engineer ${i}`));
    assert.ok(c._jdcBulkResults.every(bp => bp.workAllocationSource === 'ai-suggested'));
    assert.equal(c._jdcResult, c._jdcBulkResults[0]);
    assert.equal(c._jdcBulkViewIdx, 0);
    assert.equal(c._jdcCompMode, 'without');
    assert.equal(c._jdcFromRepo, false);
    assert.equal(c._jdcEditMode, false);
    assert.match(elements.jdcBulkProgress.innerHTML, /3 of 3 processed/);
});

test('AI errors and missing allocation are reported per item without stopping later items', async () => {
    const { context: c, elements } = harness();
    const parser = c.parseJobWithAPI;
    c.parseJobWithAPI = async (text, ...rest) => {
        if (text === jd(2)) throw new Error('Rate limit exceeded');
        const result = await parser(text, ...rest);
        if (text === jd(3)) delete result.workTasks;
        return result;
    };
    await c._jdcRunBulk([jd(1), jd(2), jd(3)], 'bulk_paste');
    assert.equal(c._jdcBulkResults.length, 3);
    assert.equal(c._jdcBulkResults[1]._extractionMethod, 'local');
    assert.match(elements.jdcBulkProgress.innerHTML, /Rate limit exceeded/);
    assert.match(elements.jdcBulkProgress.innerHTML, /AI returned no work split/);
});

test('local-only and signed-out conversion make no AI calls and explain human-led defaults', async () => {
    for (const signedOut of [false, true]) {
        const { context: c, elements } = harness();
        c.parseJobWithAPI = () => { throw new Error('AI must not be called'); };
        if (signedOut) c.firebase = undefined;
        else elements.jdcBulkLocalOnly.checked = true;
        await c._jdcRunBulk([jd(1)], 'bulk_paste');
        assert.equal(c._jdcBulkResults[0]._extractionMethod, 'local');
        assert.match(c._jdcBulkResults[0]._extractionWarning, signedOut ? /Sign-in required/ : /Local parser selected/);
    }
});

test('hard parser failure is visible and later successes retain input order', async () => {
    const { context: c } = harness();
    const local = c.convertJDToBlueprint;
    c.convertJDToBlueprint = text => {
        if (text === jd(2)) throw new Error('Bad description <script>');
        return local(text);
    };
    await c._jdcRunBulk([jd(1), jd(2), jd(3)], 'bulk_paste');
    assert.equal(c._jdcBulkJob.items[1].status, 'Failed');
    assert.deepEqual(Array.from(c._jdcBulkResults, bp => bp.title), ['Senior Engineer 1', 'Senior Engineer 3']);
    assert.equal(c._jdcBulkJob.running, false);
});

test('cancellation aborts the active request, keeps completed results, and prevents subsequent calls', async () => {
    const { context: c, elements } = harness();
    let calls = 0;
    const parser = c.parseJobWithAPI;
    let entered;
    const waiting = new Promise(resolve => { entered = resolve; });
    c.parseJobWithAPI = async (text, key, options) => {
        if (++calls === 1) return parser(text, key, options);
        entered();
        return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason)));
    };
    const run = c._jdcRunBulk([jd(1), jd(2), jd(3)], 'bulk_paste');
    await waiting;
    c.cancelJDCBulk();
    await run;
    assert.equal(calls, 2);
    assert.equal(c._jdcBulkResults.length, 1);
    assert.equal(c._jdcResult, c._jdcBulkResults[0]);
    assert.equal(c._jdcBulkJob.running, false);
    assert.match(elements.jdcBulkProgress.innerHTML, /Cancelled: 1 of 3 processed/);
    assert.equal(c._jdcBulkJob.items[2].status, 'Not processed (cancelled)');
    // Starting again after cancellation is supported.
    c.parseJobWithAPI = parser;
    await c._jdcRunBulk([jd(4)], 'bulk_paste');
    assert.equal(c._jdcBulkResults[0].title, 'Senior Engineer 4');
});

test('only first 100 inputs are attempted, including failures', async () => {
    const { context: c } = harness();
    let calls = 0;
    c.convertJDToBlueprint = () => { calls++; throw new Error('Failed'); };
    await c._jdcRunBulk(Array.from({ length: 103 }, (_, i) => jd(i)), 'bulk_paste');
    assert.equal(calls, 100);
    assert.equal(c._jdcBulkJob.items.length, 100);
    assert.match(c._jdcBulkJob.limitNote, /first 100 of 103/);
    assert.equal(c._jdcResult, null);
    assert.equal(c._jdcBulkViewIdx, -1);
});

test('TXT, JSON strings/objects, and CSV uploads share the AI queue and preserve order', async () => {
    for (const [name, content] of [
        ['jobs.txt', [jd(1), jd(2)].join('\n---\n')],
        ['jobs.JSON', JSON.stringify([jd(1), { description: jd(2) }, { description: 123 }])],
        ['jobs.csv', 'title,description\nfirst,' + jd(1).replaceAll('\n', ' ') + '\nsecond,' + jd(2).replaceAll('\n', ' ')]
    ]) {
        const { context: c } = harness();
        const input = { files: [{ name, text: async () => content }], value: name };
        await c.handleJDCFileUpload(input);
        assert.equal(c._jdcBulkResults.length, 2, name);
        assert.ok(c._jdcBulkResults.every(bp => bp._extractionMethod === 'api'), name);
        assert.equal(c._jdcBulkJob.running, false);
        assert.equal(input.value, '');
    }
});

test('invalid/empty/unreadable files unlock the controls with an explicit error', async () => {
    for (const file of [
        { name: 'bad.json', text: async () => '{' },
        { name: 'empty.txt', text: async () => '' },
        { name: 'unreadable.txt', text: async () => { throw new Error('Read failed'); } }
    ]) {
        const { context: c, elements } = harness();
        await c.handleJDCFileUpload({ files: [file], value: file.name });
        assert.equal(c._jdcBulkJob.running, false);
        assert.ok(c._jdcBulkJob.error);
        assert.equal(elements.jdcBulkInput.disabled, false);
    }
});

test('file read reservation prevents overlapping paste/upload runs and respects cancellation', async () => {
    const { context: c, elements } = harness();
    let release;
    const file = { name: 'slow.txt', text: () => new Promise(resolve => { release = resolve; }) };
    const run = c.handleJDCFileUpload({ files: [file] });
    elements.jdcBulkInput.value = jd(2);
    await c.runJDConverterBulk();
    await c.handleJDCFileUpload({ files: [{ name: 'other.txt', text: () => { throw new Error('Must not read'); } }] });
    c.cancelJDCBulk();
    release(jd(1));
    await run;
    assert.equal(c._jdcBulkResults.length, 0);
    assert.equal(c._jdcBulkJob.cancelled, true);
});

test('bulk JSON export retains workTasks and source JD without mutating saved result data', async () => {
    const { context: c } = harness();
    await c._jdcRunBulk([jd(1)], 'bulk_paste');
    let exported;
    c.URL = { createObjectURL: blob => { exported = blob; return 'blob:test'; }, revokeObjectURL() {} };
    c.document.createElement = () => ({ click() {} });
    c.exportAllBulkBlueprints();
    const result = JSON.parse(await exported.text());
    assert.equal(result.count, 1);
    assert.deepEqual(result.blueprints[0].workTasks, JSON.parse(JSON.stringify(c._jdcBulkResults[0].workTasks)));
    assert.equal(result.blueprints[0].sourceJD, jd(1));
    assert.equal(c._jdcBulkResults[0]._rawJD, jd(1));
});

test('bulk renderer exposes local-only/progress controls, locks modes, and escapes per-item errors', () => {
    const { context: c, elements } = harness();
    Object.assign(c, { _jdcInputMode: 'bulk', bpIcon: () => '', adminSubTab: 'jdconverter' });
    elements.jdcBulkInput.value = jd(1);
    c._jdcBulkJob = c._jdcCreateBulkJob();
    c._jdcBulkJob.items = [{ label: 'JD <one>', status: 'Failed', message: 'Error <script>' }];
    vm.runInContext(section('        function renderAdminJDConverter(el)', '        // ===== ASYNC JDC WRAPPER'), c);
    c.renderAdminJDConverter(elements.adminTabContent);
    assert.match(elements.adminTabContent.innerHTML, /id="jdcBulkLocalOnly"/);
    assert.match(elements.adminTabContent.innerHTML, /id="jdcBulkProgress" role="status" aria-live="polite"/);
    assert.match(elements.adminTabContent.innerHTML, /<button disabled onclick="_jdcInputMode=/);
    assert.match(elements.jdcBulkProgress.innerHTML, /Cancel conversion/);
    assert.match(elements.jdcBulkProgress.innerHTML, /Error &lt;script&gt;/);
    assert.equal(elements.jdcBulkInput.disabled, true);
    c._jdcBulkJob.running = false;
    c._jdcUpdateBulkProgress();
    assert.equal(elements.jdcBulkInput.disabled, false);
});

test('parseJobWithAPI passes cancellation and allocation options to the AI transport', async () => {
    const { context: c } = harness();
    c.skillsData = { skills: [] }; c.SKILL_SYNONYMS = {}; c.BP_AI_MODEL = 'test-model';
    c.safeParse = JSON.parse;
    let options, body;
    c.callAnthropicAPI = async (request, key, tag, opts) => {
        options = opts; body = request;
        return { content: [{ text: '{"skills":[],"workTasks":[]}' }] };
    };
    vm.runInContext(section('        async function parseJobWithAPI(', '        // ===== LOCAL FALLBACK PARSING'), c);
    const signal = new AbortController().signal;
    await c.parseJobWithAPI(jd(1), null, { includeWorkAllocation: true, signal });
    assert.equal(options.signal, signal);
    assert.equal(body.max_tokens, 10000);
    assert.match(body.messages[0].content, /workTasks/);
});

test('transport abort reaches fetch without retries or service-health errors', async () => {
    const { context: c } = harness();
    Object.assign(c, {
        _aiCacheableFeatures: {}, _aiDailyCount: () => 0, BP_AI_DAILY_LIMIT: 1000,
        AI_PROXY_AVAILABLE: true, AI_PROXY_URL: '/api/ai', _aiProxyCooldownUntil: 0,
        firebase: { auth: () => ({ currentUser: { getIdToken: async () => 'test-token' } }) },
        recordApiHealth: () => { throw new Error('Cancellation must not mark service unhealthy'); }
    });
    let entered;
    const waiting = new Promise(resolve => { entered = resolve; });
    let calls = 0;
    c.fetch = (url, options) => {
        calls++;
        entered();
        return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason)));
    };
    vm.runInContext(section('        async function callAnthropicAPI(', '        // Safe localStorage wrapper'), c);
    const controller = new AbortController();
    const request = c.callAnthropicAPI({ model: 'test' }, null, 'jd-analysis', { signal: controller.signal });
    await waiting;
    controller.abort();
    await assert.rejects(request, { name: 'AbortError' });
    assert.equal(calls, 1);
});
