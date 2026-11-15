import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildCoverageReport, loadScenarioEngine, renderMarkdown } from '../scripts/work-scenario-coverage.mjs';

const engine = loadScenarioEngine();
const row = (n, id, c = 'Technology', src = 'esco') => ({ n, id, c, src });
const fixture = {
    version: 'fixture',
    index: [
        row('GIS', 'gis'),
        row('  geographic   information systems ', 'geo'),
        row('Welding Engineering', 'welding', 'Trades'),
        row('Mechanical Engineering', 'mechanical', 'Trades'),
        row('Finance', 'finance', 'Business'),
        row('GIScience', 'giscience'),
        row('Unfamiliar craft', 'unknown', 'Trades')
    ]
};
const plain = value => JSON.parse(JSON.stringify(value));

test('separates exact specialists from broad wording and Low confidence fallbacks by ontology category', () => {
    const report = buildCoverageReport(fixture, engine);
    assert.deepEqual(report.summary, {
        total: 7, exact_specialist: 3, broad_domain: 2, low_confidence_fallback: 2
    });
    assert.deepEqual(report.categories, [
        { category: 'Business', total: 1, exact_specialist: 0, broad_domain: 1, low_confidence_fallback: 0 },
        { category: 'Technology', total: 3, exact_specialist: 2, broad_domain: 0, low_confidence_fallback: 1 },
        { category: 'Trades', total: 3, exact_specialist: 1, broad_domain: 1, low_confidence_fallback: 1 }
    ]);
    for (const skill of report.skills) {
        assert.equal(skill.confidence, skill.kind === 'low_confidence_fallback' ? 'Low' : 'Moderate');
        assert.equal(skill.profileId, engine.describe(skill.label).match.profileId);
    }
    assert.equal(report.skills.find(s => s.id === 'mechanical').kind, 'broad_domain');
});

test('JSON and Markdown are identical across repeated runs and shuffled ontology input', () => {
    const first = buildCoverageReport(fixture, engine);
    const shuffled = buildCoverageReport({ ...fixture, index: fixture.index.toReversed() }, engine);
    assert.equal(JSON.stringify(first), JSON.stringify(shuffled));
    assert.equal(renderMarkdown(first), renderMarkdown(shuffled));
    assert.match(renderMarkdown(first), /not proven renames/);
    assert.match(renderMarkdown(first), /low_confidence_fallback: 1; samples: GIScience/);
});

test('baseline proves label drift and removals, but absent aliases alone do not prove drift', () => {
    const before = buildCoverageReport({ index: [row('GIS', '1'), row('HPLC', '2')] }, engine);
    const after = buildCoverageReport({ index: [row('GIS data preparation', '1')] }, engine, before);
    const gis = after.controlledAliases.find(a => a.alias === 'GIS');
    assert.deepEqual(plain(gis.orphanedFrom), [{
        source: 'esco', id: '1', label: 'GIS', reason: 'label_changed', currentLabel: 'GIS data preparation'
    }]);
    assert.equal(after.controlledAliases.find(a => a.alias === 'HPLC').orphanedFrom[0].reason, 'skill_removed');
    assert.equal(after.controlledAliases.find(a => a.alias === 'WCAG').orphanedFrom.length, 0);
    assert.equal(after.skills[0].kind, 'low_confidence_fallback');
    assert.match(renderMarkdown(after), /label_changed/);
});

test('an alias is not orphaned while another source still carries its exact label', () => {
    const before = buildCoverageReport({ index: [row('GIS', '1'), row('GIS', '1', 'Technology', 'lightcast')] }, engine);
    const after = buildCoverageReport({ index: [row('new label', '1'), row('gis', '1', 'Technology', 'lightcast')] }, engine, before);
    const gis = after.controlledAliases.find(a => a.alias === 'GIS');
    assert.equal(gis.matches.length, 1);
    assert.equal(gis.orphanedFrom.length, 0);
});

test('Lightcast ids track renames; idless sources explicitly cannot prove identity', () => {
    const before = buildCoverageReport({ index: [
        { n: 'GIS', lcId: 'lc-1', src: 'lightcast', c: 'Technology' },
        { n: 'HPLC', src: 'trades', c: 'Trades' }
    ] }, engine);
    const after = buildCoverageReport({ index: [
        { n: 'GIS records', lcId: 'lc-1', src: 'lightcast', c: 'Technology' }
    ] }, engine, before);
    assert.equal(before.skillsWithoutStableId, 1);
    assert.equal(after.controlledAliases.find(a => a.alias === 'GIS').orphanedFrom[0].reason, 'label_changed');
    assert.equal(after.controlledAliases.find(a => a.alias === 'HPLC').orphanedFrom[0].reason, 'identity_unavailable');
});

test('does not mutate inputs, template metadata or runtime scenario content', () => {
    const inputBefore = JSON.stringify(fixture);
    const metadataBefore = JSON.stringify(engine.controlledAliases());
    const describeBefore = JSON.stringify(engine.describe('GIS'));
    const metadata = engine.controlledAliases();
    metadata[0].aliases.push('Unfamiliar craft');
    buildCoverageReport(fixture, engine);
    assert.equal(JSON.stringify(fixture), inputBefore);
    assert.equal(JSON.stringify(engine.controlledAliases()), metadataBefore);
    assert.equal(JSON.stringify(engine.describe('GIS')), describeBefore);
    assert.equal(engine.describe('Unfamiliar craft').match.confidence, 'Low');
});

test('fails explicitly for malformed data and duplicate source identities', () => {
    assert.throws(() => buildCoverageReport({}, engine), /index array/);
    assert.throws(() => buildCoverageReport({ index: [row('', '1')] }, engine), /valid name/);
    assert.throws(() => buildCoverageReport({ index: [row('GIS', '1'), row('HPLC', '1')] }, engine), /Duplicate/);
    assert.throws(() => buildCoverageReport(fixture, engine, {}), /baseline/);
});

test('real ontology counts every row and matches runtime decisions without invented coverage', () => {
    const ontology = JSON.parse(fs.readFileSync('public/skills/index-v4.json', 'utf8'));
    const report = buildCoverageReport(ontology, engine);
    assert.equal(report.summary.total, ontology.index.length);
    assert.equal(report.summary.total, report.summary.exact_specialist + report.summary.broad_domain + report.summary.low_confidence_fallback);
    assert.equal(report.categories.reduce((sum, category) => sum + category.total, 0), ontology.index.length);
    for (const skill of report.skills) {
        const actual = engine.describe(skill.label).match;
        assert.equal(skill.kind, actual.kind);
        assert.equal(skill.confidence, actual.confidence);
    }
    assert.ok(report.summary.exact_specialist > 0);
    assert.ok(report.summary.broad_domain > report.summary.exact_specialist);
    assert.ok(report.summary.low_confidence_fallback > 0);
});

test('CLI writes reproducible files, compares baselines and rejects unsafe outputs or bad arguments', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-coverage-'));
    const cli = path.resolve('scripts/work-scenario-coverage.mjs');
    const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: dir });
    try {
        const ontology = path.join(dir, 'ontology.json');
        const baseline = path.join(dir, 'before.json');
        const output = path.join(dir, 'after.json');
        fs.writeFileSync(ontology, JSON.stringify(fixture));
        assert.equal(run(['--ontology', ontology, '--format', 'json', '--output', baseline]).status, 0);
        assert.equal(run(['--ontology', ontology, '--baseline', baseline, '--format', 'json', '--output', output]).status, 0);
        assert.equal(JSON.parse(fs.readFileSync(output)).baselineCompared, true);
        assert.equal(run(['--ontology', ontology, '--output', ontology]).status, 1);
        assert.equal(run(['--ontology', ontology, '--output', path.resolve('public/coverage.json')]).status, 1);
        assert.equal(run(['--format', 'csv']).status, 1);
        assert.equal(run(['--unknown', 'value']).status, 1);
        assert.equal(run(['--output']).status, 1);
        assert.equal(run(['--ontology', 'missing.json']).status, 1);
        fs.writeFileSync(ontology, '{');
        assert.equal(run(['--ontology', ontology]).status, 1);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
