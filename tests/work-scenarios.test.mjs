import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = {};
vm.runInNewContext(fs.readFileSync('public/work-scenarios.js', 'utf8'), { window: root });
const api = root.BPWorkScenarios;
test('each skill gets three alternative scenarios without an agent history', () => {
    for (const name of ['Financial Modeling', 'Charismatic Leadership', 'Applied AI', 'Salesforce', 'Storytelling', 'Piloting', 'Multimedia', 'Market Research', 'Unfamiliar Specialty']) {
        const value = api.describe(name, { level: 'Mastery' });
        assert.equal(value.proficiency, 'Mastery');
        assert.deepEqual(Array.from(value.scenarios, s => s.id), ['human', 'augmented', 'performed']);
        for (const s of value.scenarios) {
            for (const key of ['task', 'outcome', 'humanContribution', 'agentContribution', 'reason', 'confidence']) assert.ok(s[key]);
            assert.ok(s.conditions.length);
            assert.ok(s.limits.length);
        }
        assert.equal('stage' in value, false);
        assert.equal('salary' in value, false);
    }
});
test('finance scenarios show calculations versus human assumptions and approval', () => {
    const value = api.describe('Financial Modeling');
    assert.match(value.match.label, /Financial/);
    assert.match(value.scenarios[1].agentContribution, /formulas/);
    assert.match(value.scenarios[1].humanContribution, /assumptions/);
    assert.match(value.scenarios[2].humanContribution, /approve/);
    assert.match(value.scenarios[2].task, /recurring/);
});
test('physical and regulated tasks override broad management wording', () => {
    for (const name of ['Mental Health Management', 'Piloting', 'Clinical Nursing', 'Aviation Management']) {
        const value = api.describe(name);
        assert.match(value.match.label, /Physical/);
        assert.match(value.scenarios[2].task, /administrative/);
        assert.ok(value.scenarios[2].limits.some(x => /physical capabilities/.test(x)));
    }
});
test('unmatched skills explicitly show low-confidence supporting-task illustrations', () => {
    const value = api.describe('Unfamiliar Specialty');
    assert.equal(value.match.confidence, 'Low');
    assert.match(value.match.basis, /No specific match/);
    assert.equal(value.scenarios[2].confidence, 'Low');
});
test('specific capability wording takes priority over broad strategy and management', () => {
    assert.match(api.describe('Strategic storytelling').match.label, /Writing/);
    assert.match(api.describe('AI Agents Management').match.label, /Software/);
    assert.match(api.describe('Salesforce Administration').match.label, /CRM/);
});
test('returned scenarios are independent and cannot mutate library assumptions', () => {
    const value = api.describe('Finance');
    value.scenarios[1].capabilities.push('invented');
    value.scenarios[1].limits[0] = 'changed';
    assert.ok(!api.describe('Finance').scenarios[1].capabilities.includes('invented'));
    assert.notEqual(api.describe('Finance').scenarios[1].limits[0], 'changed');
});
test('empty and unbounded names fail explicitly', () => {
    for (const name of ['', ' ', 'x'.repeat(201)]) assert.throws(() => api.describe(name), /skill name/);
});
test('profile and role entry points use scenarios without changing saved allocations', () => {
    const core = fs.readFileSync('public/app-core.js', 'utf8');
    assert.ok(core.includes('BPWorkScenariosUI.summaryHTML(skills)'));
    assert.ok(core.includes('BPWorkScenariosUI.badgeHTML(s.name)'));
    assert.ok(core.includes('BPWorkScenariosUI.badgeHTML(skillName)'));
    assert.ok(core.includes('BPWorkScenariosUI.badgeHTML(skill.name)'));
    assert.ok(!core.includes('BPAgentReadinessUI.summaryHTML'));
    assert.ok(core.includes('agentReadiness: _ud.agentReadiness || {}'));
    assert.match(core, /Human-led is a default, not a finding/);
});
