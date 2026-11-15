import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const KINDS = ['exact_specialist', 'broad_domain', 'low_confidence_fallback'];
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const normalize = label => label.toLowerCase().replace(/\s+/g, ' ').trim();
const identity = row => JSON.stringify(row.id
    ? [row.source, row.id]
    : [row.source, null, row.category, row.label]);
const sortRows = rows => rows.sort((a, b) =>
    compare(a.category, b.category) || compare(a.label, b.label) ||
    compare(a.source, b.source) || compare(a.id, b.id));
const counts = () => Object.fromEntries(['total', ...KINDS].map(key => [key, 0]));

export function loadScenarioEngine(filename = path.join(ROOT, 'public/work-scenarios.js')) {
    const window = {};
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { window }, { timeout: 1000, filename });
    return window.BPWorkScenarios;
}

export function buildCoverageReport(ontology, engine, baseline) {
    if (!Array.isArray(ontology.index)) throw new Error('Ontology must contain an index array.');
    if (baseline && (baseline.schemaVersion !== 1 || !Array.isArray(baseline.skills) ||
        !Array.isArray(baseline.controlledAliases))) throw new Error('Unsupported coverage baseline.');
    const seen = new Set();
    const skills = sortRows(ontology.index.map(skill => {
        if (typeof skill.n !== 'string' || !skill.n.trim() || skill.n.trim().length > 200 ||
            typeof skill.c !== 'string' || !skill.c.trim() ||
            typeof skill.src !== 'string' || !skill.src) {
            throw new Error('Every ontology row needs a valid name, category and source.');
        }
        const id = skill.id ?? skill.lcId ?? null;
        if (id !== null && (typeof id !== 'string' || !id)) throw new Error('Invalid stable id.');
        const row = { id, source: skill.src, label: skill.n, category: skill.c };
        const key = identity(row);
        if (seen.has(key)) throw new Error(`Duplicate ontology identity: ${key}`);
        seen.add(key);
        const match = engine.describe(skill.n).match;
        if (!KINDS.includes(match.kind)) throw new Error(`Unknown scenario match kind: ${match.kind}`);
        return { ...row, kind: match.kind, profileId: match.profileId, confidence: match.confidence };
    }));
    const summary = counts();
    const categoryCounts = new Map();
    const byLabel = new Map();
    for (const skill of skills) {
        summary.total++;
        summary[skill.kind]++;
        if (!categoryCounts.has(skill.category)) categoryCounts.set(skill.category, counts());
        const category = categoryCounts.get(skill.category);
        category.total++;
        category[skill.kind]++;
        const label = normalize(skill.label);
        if (!byLabel.has(label)) byLabel.set(label, []);
        byLabel.get(label).push(skill);
    }
    const currentById = new Map(skills.map(row => [identity(row), row]));
    const previousAliases = new Map((baseline?.controlledAliases || []).map(alias =>
        [JSON.stringify([alias.profileId, normalize(alias.alias)]), alias]));
    const controlledAliases = engine.controlledAliases().flatMap(profile =>
        profile.aliases.map(alias => {
            const matches = (byLabel.get(normalize(alias)) || []).map(({ source, id, label }) =>
                ({ source, id, label }));
            const previous = previousAliases.get(JSON.stringify([profile.profileId, normalize(alias)]));
            const orphanedFrom = matches.length ? [] : (previous?.matches || []).map(old => {
                const current = currentById.get(identity(old));
                return {
                    ...old,
                    reason: !old.id ? 'identity_unavailable' : current ? 'label_changed' : 'skill_removed',
                    currentLabel: current?.label ?? null
                };
            });
            return { profileId: profile.profileId, alias, matches, orphanedFrom };
        })).sort((a, b) => compare(a.profileId, b.profileId) || compare(a.alias, b.alias));
    return {
        schemaVersion: 1,
        ontologyVersion: ontology.version ?? null,
        baselineCompared: Boolean(baseline),
        skillsWithoutStableId: skills.filter(row => !row.id).length,
        summary,
        categories: [...categoryCounts].sort(([a], [b]) => compare(a, b))
            .map(([category, values]) => ({ category, ...values })),
        controlledAliases,
        skills
    };
}

const escapeCell = value => String(value).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
export function renderMarkdown(report) {
    const lines = [
        '# Work scenario coverage',
        '',
        'Offline review only. Exact specialist matches are reviewed labels/aliases, not verified agent capabilities.',
        'Broad domain matches still need specialist review; low-confidence fallbacks are supporting illustrations only.',
        'Nothing in this report expands aliases, raises confidence, or changes runtime routing.',
        '',
        `Ontology version: ${report.ontologyVersion ?? 'unspecified'}`,
        `Skills: ${report.summary.total}`,
        `Skills without stable source ids: ${report.skillsWithoutStableId} (renames cannot be distinguished from removals)`,
        '',
        '| Ontology category | Total | Exact specialist | Broad domain | Low-confidence fallback |',
        '| --- | ---: | ---: | ---: | ---: |',
        ...[{ category: 'ALL', ...report.summary }, ...report.categories].map(row =>
            `| ${escapeCell(row.category)} | ${row.total} | ${row.exact_specialist} | ${row.broad_domain} | ${row.low_confidence_fallback} |`),
        '',
        '## Controlled aliases without current ontology labels',
        '',
        report.baselineCompared
            ? 'A lost alias is marked orphaned only if the baseline had matching labels. Stable source/id identifies renames versus removals.'
            : 'No baseline supplied: absent aliases are unrepresented, not proven renames. Save JSON and compare after the next ontology update.',
        '',
        '| Profile | Alias | Evidence |',
        '| --- | --- | --- |'
    ];
    for (const alias of report.controlledAliases.filter(row => !row.matches.length)) {
        const evidence = alias.orphanedFrom.length
            ? alias.orphanedFrom.map(old => `${old.source}:${old.id}: ${old.label} → ${old.currentLabel ?? '(removed)'} (${old.reason})`).join('; ')
            : 'No current exact label; no prior matching label in baseline';
        lines.push(`| ${escapeCell(alias.profileId)} | ${escapeCell(alias.alias)} | ${escapeCell(evidence)} |`);
    }
    lines.push('', '## Review queue by category', '',
        'Fallbacks first, then broad domain matches. Samples are alphabetical, not a risk or demand ranking.',
        'Use JSON for every skill, its stable identity, match kind, profile and unchanged confidence.', '');
    for (const category of report.categories) {
        lines.push(`### ${escapeCell(category.category)}`, '');
        for (const kind of ['low_confidence_fallback', 'broad_domain']) {
            const rows = report.skills.filter(row => row.category === category.category && row.kind === kind);
            lines.push(`- ${kind}: ${rows.length}; samples: ${rows.slice(0, 5).map(row => escapeCell(row.label)).join('; ') || '(none)'}`);
        }
        lines.push('');
    }
    return lines.join('\n') + '\n';
}

export function main(args = process.argv.slice(2)) {
    const options = { ontology: path.join(ROOT, 'public/skills/index-v4.json'), format: 'markdown' };
    const allowed = new Set(['ontology', 'baseline', 'format', 'output']);
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '');
        if (!args[i].startsWith('--') || !allowed.has(key) || !args[i + 1] || args[i + 1].startsWith('--')) {
            throw new Error('Usage: node scripts/work-scenario-coverage.mjs [--format markdown|json] [--output FILE] [--baseline REPORT.json] [--ontology FILE]');
        }
        options[key] = args[i + 1];
    }
    if (!['markdown', 'json'].includes(options.format)) throw new Error('Format must be markdown or json.');
    const ontology = JSON.parse(fs.readFileSync(options.ontology, 'utf8'));
    const baseline = options.baseline ? JSON.parse(fs.readFileSync(options.baseline, 'utf8')) : undefined;
    const report = buildCoverageReport(ontology, loadScenarioEngine(), baseline);
    const output = options.format === 'json' ? JSON.stringify(report, null, 2) + '\n' : renderMarkdown(report);
    if (options.output) {
        const destination = path.resolve(options.output);
        // Never overwrite input evidence or put generated reports into served/startup assets.
        if (destination === path.resolve(options.ontology) ||
            (options.baseline && destination === path.resolve(options.baseline)) ||
            ['public', 'src', 'dist'].some(dir => {
                const relative = path.relative(path.join(ROOT, dir), destination);
                return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
            })) throw new Error('Output must not overwrite inputs or live application assets.');
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, output);
    } else {
        process.stdout.write(output);
    }
    return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { main(); } catch (error) {
        console.error(`Coverage report failed: ${error.message}`);
        process.exitCode = 1;
    }
}
