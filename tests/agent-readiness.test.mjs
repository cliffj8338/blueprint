import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import test from 'node:test';

const script = readFileSync('public/agent-readiness.js', 'utf8');
function harness(overrides = {}) {
    const root = {};
    const scope = vm.createContext({ window: root, URL, TextEncoder, Date });
    vm.runInContext(script, scope);
    const api = root.BPAgentReadiness;
    let records = {};
    let uid = 'synthetic-user-a';
    let editable = true;
    let loads = 0;
    const adapter = {
        owner: () => uid,
        canEdit: () => editable,
        skills: () => [{ name: 'Market Research', level: 'Mastery' }, { name: '__proto__', level: 'Novice' }],
        records: () => records,
        persist: async next => { records = next; return true; },
        loadBlueprints: async () => { loads++; return []; },
        ...overrides
    };
    api.configure(adapter);
    return { api, adapter, records: () => records, uid: value => { uid = value; }, editable: value => { editable = value; }, loads: () => loads };
}
const opportunity = { stage: 'opportunity', task: 'Compare approved competitor sources', agentTask: 'Extract source-linked facts' };
const designed = {
    ...opportunity, stage: 'designed', humanContribution: 'Judge credibility and decide implications',
    inputs: 'Approved public URLs', instructions: 'Cite every fact; report uncertainty',
    review: 'Human checks sources before sharing', criteria: 'No unsupported claims'
};
const active = { ...designed, stage: 'active', agentName: 'Approved research assistant', tools: 'Read-only public web access' };

test('starts unassessed without modifying human proficiency', () => {
    const h = harness();
    assert.equal(h.api.status('market research').stage, 'unassessed');
    assert.equal(h.api.context('Market Research').skill.level, 'Mastery');
    assert.equal(h.api.summary([{ name: 'Market Research' }]).unassessed, 1);
    assert.equal(h.api.context('Market Research').record, null);
});
test('normalizes skill keys and persists stages as explicitly self-reported', async () => {
    const h = harness();
    assert.equal((await h.api.save(' MARKET   RESEARCH ', opportunity)).synced, true);
    assert.equal(h.api.status('Market Research').stage, 'opportunity');
    assert.equal(h.api.get('Market Research').assessmentType, 'self-reported');
    assert.equal(h.api.context('Market Research').skill.level, 'Mastery');
});
test('validates each progressively stronger readiness claim', async () => {
    const h = harness();
    await assert.rejects(h.api.save('Market Research', { stage: 'opportunity' }), /task/);
    await assert.rejects(h.api.save('Market Research', opportunity && { ...opportunity, stage: 'designed' }), /designed workflow/);
    await assert.rejects(h.api.save('Market Research', { ...designed, stage: 'active' }), /actual agent/);
    await assert.rejects(h.api.save('Market Research', { ...active, stage: 'evidenced' }), /actual result/);
    await h.api.save('Market Research', { ...active, stage: 'evidenced', result: 'Recorded source checks, errors and review time versus baseline' });
    assert.equal(h.api.status('Market Research').label, 'Outcome documented');
});
test('rejects unknown stages, oversized fields, unsafe URLs and credentials', async () => {
    const h = harness();
    for (const stage of ['verified', 'toString', '__proto__']) {
        await assert.rejects(h.api.save('Market Research', { ...opportunity, stage }), /valid readiness/);
    }
    await assert.rejects(h.api.save('Market Research', { ...opportunity, instructions: 'x'.repeat(2001) }), /too long/);
    for (const evidenceUrl of ['javascript:alert(1)', 'file:///etc/passwd', 'https://user:password@example.test/proof']) {
        await assert.rejects(h.api.save('Market Research', { ...opportunity, evidenceUrl }), /http|credentials/);
    }
    await h.api.save('Market Research', { ...opportunity, evidenceUrl: 'https://example.test/proof' });
});
test('blocks read-only, foreign skills and account-switch writes', async () => {
    const h = harness();
    h.editable(false);
    await assert.rejects(h.api.save('Market Research', opportunity), /Sign in/);
    await assert.rejects(h.api.remove('Market Research'), /read-only/);
    h.editable(true);
    await assert.rejects(h.api.save('Unknown skill', opportunity), /not in/);
    const original = h.api.context('Market Research').owner;
    h.uid('synthetic-user-b');
    await assert.rejects(h.api.save('Market Research', opportunity, original), /profile changed/);
    await assert.rejects(h.api.remove('Market Research', original), /profile changed/);
});
test('safe map keys do not mutate object prototypes', async () => {
    const h = harness();
    await h.api.save('__proto__', opportunity);
    assert.equal(h.api.get('__proto__').stage, 'opportunity');
    assert.equal(Object.getPrototypeOf(h.records()), null);
    assert.equal({}.task, undefined);
});
test('removal blanks persisted fields under Firestore nested merge semantics', async () => {
    const h = harness();
    await h.api.save('Market Research', { ...active, result: 'old private outcome', evidenceUrl: 'https://example.test/old' });
    const prior = h.api.get('Market Research');
    await h.api.remove('Market Research');
    const merged = { ...prior, ...h.records()[h.api.key('Market Research')] };
    assert.equal(merged.deleted, true);
    assert.equal(merged.result, '');
    assert.equal(merged.evidenceUrl, '');
    assert.equal(merged.instructions, '');
    assert.equal(h.api.get('Market Research'), null);
    assert.equal(h.api.status('Market Research').stage, 'unassessed');
    await h.api.save('Market Research', opportunity);
    assert.equal(h.api.get('Market Research').deleted, false);
});
test('links saved tasks conservatively and never treats expected outcomes as evidence', async () => {
    const blueprint = {
        title: 'Synthetic researcher role',
        workTasks: [null,
            { task: 'Compare sources', owner: 'shared', outcome: 'Accurate comparison', humanSkills: [{ name: 'Market Research' }], agentCapabilities: [{ name: 'Extract facts', relatedHumanSkill: 'Market Research' }] },
            { task: 'Only fuzzy match', owner: 'agent', humanSkills: [{ name: 'Research' }], agentCapabilities: [{ name: 'Summarize' }] },
            { task: 'Human only', owner: 'human', humanSkills: [{ name: 'Market Research' }], agentCapabilities: [] }
        ]
    };
    const h = harness({ loadBlueprints: async () => [blueprint] });
    assert.equal(h.api.context('Market Research').sources.length, 0);
    await Promise.all([h.api.loadSources(), h.api.loadSources()]);
    const matches = h.api.context('Market Research').sources;
    assert.equal(matches.length, 1);
    assert.equal(matches[0].criteria, 'Accurate comparison');
    assert.equal(matches[0].result, undefined);
    assert.equal(h.api.status('Market Research').stage, 'unassessed');
});
test('source requests are single-flight, retry on failure and isolate users', async () => {
    let fail = true;
    let calls = 0;
    const h = harness({ loadBlueprints: async () => { calls++; if (fail) throw new Error('Offline'); return []; } });
    await assert.rejects(h.api.loadSources(), /Offline/);
    fail = false;
    await Promise.all([h.api.loadSources(), h.api.loadSources()]);
    assert.equal(calls, 2);
    h.uid('synthetic-user-b');
    assert.equal(h.api.context('Market Research').sources.length, 0);
    await h.api.loadSources();
    assert.equal(calls, 3);
});
test('reports unconfirmed cloud writes and errors rather than successful sync', async () => {
    const h = harness({ persist: async () => false });
    assert.equal((await h.api.save('Market Research', opportunity)).synced, false);
    h.adapter.persist = async () => { throw new Error('Write denied'); };
    await assert.rejects(h.api.save('Market Research', opportunity), /Write denied/);
});
test('salary calculation and valuation implementation remain unchanged', () => {
    const current = readFileSync('public/app-core.js', 'utf8');
    const original = execFileSync('git', ['show', 'HEAD:public/app-core.js'], { maxBuffer: 8 * 1024 * 1024 }).toString();
    const block = text => text.slice(text.indexOf('function calculateTotalMarketValue('), text.indexOf('function setValuationMode('));
    assert.equal(block(current), block(original));
    assert.match(current, /agentReadiness: _ud\.agentReadiness \|\| \{\}/);
    assert.match(current, /userData\.agentReadiness = data\.agentReadiness \|\| \{\}/);
    assert.match(current, /userData\.agentReadiness = d\.agentReadiness \|\| \{\}/);
});
