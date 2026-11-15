import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = {};
vm.runInNewContext(fs.readFileSync('public/work-scenarios.js', 'utf8'), { window: root });
const api = root.BPWorkScenarios;
// Canonical examples come from the shipped ontology, not invented domain tags.
const specialtyCases = [
    { skill: 'geographic information systems', aliases: ['use geographic information systems', 'GIS'], label: /Geographic/, task: /GIS layer/, contribution: /geometry/ },
    { skill: 'high-performance liquid chromatography', aliases: ['high performance liquid chromatography', 'HPLC'], label: /chromatography/, task: /HPLC run records/, contribution: /calibration/ },
    { skill: 'Welding Engineering', aliases: ['welding', 'TIG welding', 'MIG welding', 'perform tungsten inert gas welding', 'welding procedure specification'], label: /Welding/, task: /weld documentation/, contribution: /procedure revisions/ },
    { skill: 'carpentry', aliases: ['cabinet making', 'cabinetmaking', 'finish carpentry'], label: /Carpentry/, task: /cut list/, contribution: /quantities and units/ },
    { skill: 'Food Safety Management Systems', aliases: ['HACCP', 'Food Safety & HACCP', 'perform food safety checks'], label: /HACCP/, task: /HACCP monitoring logs/, contribution: /timestamps/ },
    { skill: 'use translation memory software', aliases: ['translation', 'machine translation', 'review translation works'], label: /Translation/, task: /bilingual text/, contribution: /glossary/ },
    { skill: 'Web Accessibility Testing', aliases: ['WCAG', 'web content accessibility guidelines', 'ICT accessibility standards'], label: /accessibility/, task: /accessibility scan/, contribution: /tool versions/ },
    { skill: 'perform procurement processes', aliases: ['procurement', 'e-procurement', 'assess procurement needs'], label: /Procurement/, task: /bid packages/, contribution: /checklist/ },
    { skill: 'Archival Management', aliases: ['manage digital archives', 'archival preservation', 'store archival documents'], label: /Archival/, task: /archive manifest/, contribution: /checksums/ },
    { skill: 'horticulture principles', aliases: ['horticulture', 'sustainable horticulture', 'landscaping / horticulture'], label: /Horticulture/, task: /plant-care log/, contribution: /schedule/ }
];
const ontologyNames = new Set(JSON.parse(fs.readFileSync('public/skills/index-v4.json', 'utf8')).index.map(s => s.n.toLowerCase()));
for (const example of specialtyCases) {
    test(`${example.skill} has task-specific scenarios and controlled aliases`, () => {
        assert.ok(ontologyNames.has(example.skill.toLowerCase()), 'representative skill must exist in the ontology');
        const value = api.describe(example.skill);
        assert.match(value.match.label, example.label);
        assert.match(value.match.basis, /exact skill label or controlled alias/);
        assert.match(value.match.basis, /Not a tested capability benchmark or a personal assessment/);
        assert.equal(value.match.confidence, 'Moderate');
        assert.match(value.scenarios[2].task, example.task);
        assert.match(value.scenarios[2].agentContribution, example.contribution);
        for (const alias of example.aliases) {
            const alternate = api.describe(alias);
            assert.equal(alternate.match.label, value.match.label);
            assert.deepEqual(alternate.scenarios, value.scenarios);
        }
    });
}
test('specialty aliases normalize case and whitespace, not substrings or fuzzy spellings', () => {
    assert.match(api.describe('  HIGH-PERFORMANCE   LIQUID CHROMATOGRAPHY  ').match.label, /chromatography/);
    assert.match(api.describe('wcag').match.label, /accessibility/);
    for (const name of ['GIScience', 'HPLCish', 'WCAGish', 'Not GIS', 'Horticultrue', 'unfamiliar GIS specialty', 'Apache Archiva']) {
        const value = api.describe(name);
        assert.equal(value.match.confidence, 'Low', name);
        assert.match(value.match.basis, /No specific match/);
    }
});
const languageCases = [
    { skill: 'write Hungarian', label: 'Writing in Hungarian', task: /Hungarian acknowledgement template/, contribution: /without sending/ },
    { skill: 'understand written Korean', label: 'Reading comprehension in Korean', task: /Korean notices/, contribution: /source quotations/ },
    { skill: 'understand spoken Luxembourgish', label: 'Listening comprehension in Luxembourgish', task: /Luxembourgish recording/, contribution: /timestamps/ },
    { skill: 'interact verbally in Bosnian', label: 'Spoken interaction in Bosnian', task: /Bosnian conversation rehearsal/, contribution: /do not contact real participants/ }
];
for (const example of languageCases) {
    test(`${example.skill} has a distinct language task, not inferred translation competence`, () => {
        assert.ok(ontologyNames.has(example.skill.toLowerCase()));
        const options = { level: 'Expert', salary: 123456, agentReadiness: { stage: 'verified' } };
        const before = JSON.stringify(options);
        const value = api.describe(example.skill, options);
        assert.equal(value.match.label, example.label);
        assert.equal(value.match.confidence, 'Moderate');
        assert.match(value.match.basis, /exact skill label or controlled alias/);
        assert.match(value.match.basis, /Not a tested capability benchmark or a personal assessment/);
        assert.match(value.scenarios[2].task, example.task);
        assert.match(value.scenarios[2].agentContribution, example.contribution);
        assert.deepEqual(value.scenarios, api.describe(`  ${example.skill.toUpperCase().replaceAll(' ', '   ')}  `).scenarios);
        assert.equal(JSON.stringify(options), before);
        assert.equal(value.proficiency, 'Expert');
        assert.deepEqual(Array.from(value.scenarios, s => s.id), ['human', 'augmented', 'performed']);
        assert.equal(value.scenarios[0].capabilities.length, 0);
        assert.equal(value.scenarios[2].confidence, 'Conditional');
        for (const key of ['salary', 'stage', 'agentReadiness', 'readiness']) assert.equal(key in value, false);
        assert.match(value.assumptions.join(' '), /not sequential readiness stages/);
        for (const scenario of value.scenarios) {
            for (const key of ['task', 'outcome', 'humanContribution', 'agentContribution', 'reason', 'confidence']) assert.ok(scenario[key]);
            assert.doesNotMatch(JSON.stringify(scenario), /\{language\}|undefined/);
            assert.match(scenario.conditions.join(' '), /specific tool.*dialect, script, register and domain/);
            assert.match(scenario.limits.join(' '), /none proves competence in another/);
        }
        value.scenarios[1].capabilities.push('invented');
        value.scenarios[1].limits[0] = 'changed';
        value.scenarios[1].conditions[0] = 'changed';
        const fresh = api.describe(example.skill);
        assert.ok(!fresh.scenarios[1].capabilities.includes('invented'));
        assert.notEqual(fresh.scenarios[1].limits[0], 'changed');
        assert.notEqual(fresh.scenarios[1].conditions[0], 'changed');
    });
}
test('controlled language grammar matches exactly the shipped ontology, including historical-language exclusions', () => {
    const prefixes = [
        ['write ', 'Writing in ', 73],
        ['understand written ', 'Reading comprehension in ', 73],
        ['understand spoken ', 'Listening comprehension in ', 70],
        ['interact verbally in ', 'Spoken interaction in ', 70]
    ];
    const languages = [...ontologyNames].filter(n => n.startsWith('understand written ')).map(n => n.slice(19));
    assert.equal(languages.length, 73);
    for (const [prefix, label, count] of prefixes) {
        const expected = languages.map(l => prefix + l).filter(n => ontologyNames.has(n));
        assert.equal(expected.length, count);
        for (const language of languages) {
            const name = prefix + language;
            const value = api.describe(name);
            if (ontologyNames.has(name)) {
                assert.ok(value.match.label.toLowerCase().startsWith(label.toLowerCase()), name);
                assert.ok(value.match.label.toLowerCase().endsWith(language), name);
            } else {
                assert.equal(value.match.confidence, 'Low', name);
                assert.match(value.match.basis, /No specific match/);
            }
        }
    }
});
const interpretingLabels = [
    'interpret spoken language between two parties', 'translate spoken language',
    'translate spoken language simultaneously', 'interpret languages in conferences',
    'interpret languages in live broadcasting shows', 'perform bilateral interpretation',
    'voice interpreting', 'chuchotage interpreting', 'court interpreting', 'perform sworn interpretations'
];
test('live interpreting uses qualified human execution and bounded agent preparation or records only', () => {
    for (const name of interpretingLabels) {
        assert.ok(ontologyNames.has(name), name);
        const value = api.describe(name);
        assert.equal(value.match.label, 'Live interpreting preparation and records');
        assert.match(value.scenarios[0].outcome, /qualified interpreter/);
        assert.match(value.scenarios[1].task, /before a live session/);
        assert.match(value.scenarios[2].task, /session records/);
        assert.match(value.scenarios[2].agentContribution, /without listening to or interpreting a live session/);
        assert.ok(value.scenarios.every(s => /latency, overlapping speakers/.test(s.limits.join(' '))));
        assert.ok(value.scenarios.every(s => /No autonomous live interpreting/.test(s.limits.join(' '))));
        assert.doesNotMatch(JSON.stringify(value), /\{language\}|undefined/);
    }
});
test('written translation aliases require a validated language pair without becoming live interpreting', () => {
    for (const name of ['translate texts', 'translate different types of texts', 'language translation', 'perform sworn translations']) {
        assert.ok(ontologyNames.has(name));
        const value = api.describe(name);
        assert.equal(value.match.label, api.describe('translation').match.label);
        assert.match(value.scenarios[2].task, /bilingual text/);
        assert.ok(value.scenarios.every(s => /source and target languages/.test(s.conditions.join(' '))));
        assert.ok(value.scenarios.every(s => /no certification or live interpreting authority/.test(s.limits.join(' '))));
    }
});
test('language scenarios disclose dialect and quality uncertainty and retain clinical, sworn and safety boundaries', () => {
    for (const name of [...languageCases.map(c => c.skill), ...interpretingLabels, 'perform sworn translations']) {
        const value = api.describe(name);
        for (const scenario of value.scenarios) {
            const limits = scenario.limits.join(' ');
            assert.match(limits, /dialect/);
            assert.match(limits, /[Qq]uality/);
            assert.match(limits, /[Ss]worn/);
            assert.match(limits, /[Cc]linical/);
            assert.match(limits, /safety-critical/);
            assert.match(limits, /qualified/);
        }
    }
});
test('language collisions and unsupported variants never inherit a curated language task', () => {
    for (const name of [
        'Hungarian', 'write Hungarianish', 'understand written Klingon', 'write Korean translation',
        'write Hungarian reports', 'do not write Hungarian', 'understand written Korean and Japanese',
        'understand written Korean (clinical)', 'interact verbally in British Sign Language',
        'write TypeScript', 'Network Address Translation', 'translate formulae into processes',
        'Cumulative Translation Adjustment (CTA)', 'Nick Translation'
    ]) {
        const value = api.describe(name);
        assert.doesNotMatch(value.match.basis, /exact skill label or controlled alias/, name);
        assert.doesNotMatch(value.match.label, /^(Reading comprehension in|Writing in|Listening comprehension in|Spoken interaction in|Live interpreting preparation)/, name);
    }
    for (const name of ['write Hungarianish', 'understand written Klingon', 'Hungarian']) {
        const value = api.describe(name);
        assert.equal(value.match.confidence, 'Low', name);
        assert.equal(value.scenarios[2].confidence, 'Low', name);
        assert.match(value.match.basis, /No specific match/);
    }
    for (const name of ['Clinical Translation', 'Medical Translation', 'clinical understand written Korean', 'write Hungarian safety-critical instructions', 'Sworn Translation Management', 'Legal Translation Management', 'Court Interpreting Management']) {
        const value = api.describe(name);
        assert.match(value.match.label, /Physical/, name);
        assert.match(value.scenarios[2].task, /administrative/, name);
    }
});
const signingCases = [
    { skill: 'American Sign Language (ASL)', aliases: ['American Sign Language', 'ASL'], id: 'sign-language-asl' },
    { skill: 'British Sign Language', aliases: ['British Sign Language (BSL)', 'BSL'], id: 'sign-language-bsl' },
    { skill: 'Hong Kong Sign Language', aliases: [], id: 'sign-language-hksl' },
    { skill: 'sign language', aliases: ['Sign Languages'], id: 'sign-language' },
    { skill: 'Sign Language Interpretation', aliases: [], id: 'sign-language-interpreting' }
];
for (const { skill, aliases, id } of signingCases) {
    test(`${skill} has visual human work and bounded agent preparation`, () => {
        assert.ok(ontologyNames.has(skill.toLowerCase()));
        const options = { level: 'Expert', salary: 123456, agentReadiness: { stage: 'verified' } };
        const before = JSON.stringify(options);
        const value = api.describe(skill, options);
        assert.equal(value.match.kind, 'exact_specialist');
        assert.equal(value.match.profileId, id);
        assert.equal(value.match.confidence, 'Moderate');
        assert.match(value.match.basis, /Not a tested capability benchmark or a personal assessment/);
        assert.equal(value.proficiency, 'Expert');
        assert.equal(JSON.stringify(options), before);
        for (const key of ['salary', 'stage', 'agentReadiness', 'readiness']) assert.equal(key in value, false);
        assert.deepEqual(Array.from(value.scenarios, s => s.id), ['human', 'augmented', 'performed']);
        assert.equal(value.scenarios[0].capabilities.length, 0);
        assert.equal(value.scenarios[2].confidence, 'Conditional');
        assert.match(value.scenarios[0].outcome, /visually|visual signing/);
        assert.match(value.scenarios[0].humanContribution, /non-manual/);
        assert.match(value.scenarios[1].outcome, /reviews|checks/);
        assert.match(value.scenarios[2].task, /records/);
        assert.match(value.scenarios[2].agentContribution, /completeness rules/);
        assert.match(value.scenarios[2].agentContribution, /without.*camera/);
        assert.match(value.scenarios[2].humanContribution, /approve consequential downstream actions/);
        assert.doesNotMatch(value.scenarios[1].capabilities.join(' '), /speech recognition|translation|sign recognition|video/i);
        for (const scenario of value.scenarios) {
            const conditions = scenario.conditions.join(' ');
            const limits = scenario.limits.join(' ');
            assert.match(conditions, /ASL, BSL.*distinct, not universal/);
            assert.match(conditions, /explicit participant consent before camera access, recording, upload or reuse/);
            assert.match(conditions, /purpose, access and retention/);
            assert.match(conditions, /require no camera or recording/);
            assert.match(conditions, /Evaluate the specific tool.*competent signer or qualified sign-language interpreter/);
            assert.match(limits, /Visual recognition quality is uncertain/);
            assert.match(limits, /handshape.*spatial grammar.*facial expression.*non-manual/);
            assert.match(limits, /occlusion.*lighting.*camera framing/);
            assert.match(limits, /No autonomous live sign-language interpreting/);
            assert.match(limits, /signing avatar substitution or certified interpretation/);
            assert.match(limits, /Sworn, legal, clinical and safety-critical.*qualified people/);
            assert.match(limits, /informed consent and emergency instructions remain human/);
        }
        for (const alias of [skill.toUpperCase().replaceAll(' ', '   '), ...aliases]) {
            assert.deepEqual(api.describe(` ${alias} `).scenarios, value.scenarios);
        }
        value.scenarios[1].limits[0] = 'changed';
        value.scenarios[1].conditions[0] = 'changed';
        value.scenarios[1].capabilities.push('invented');
        const fresh = api.describe(skill);
        assert.notEqual(fresh.scenarios[1].limits[0], 'changed');
        assert.notEqual(fresh.scenarios[1].conditions[0], 'changed');
        assert.ok(!fresh.scenarios[1].capabilities.includes('invented'));
    });
}
test('sign-language interpreting retains language-pair, visual access and professional authority boundaries', () => {
    const value = api.describe('Sign Language Interpretation');
    assert.match(value.scenarios[0].outcome, /qualified sign-language interpreter/);
    assert.match(value.scenarios[1].task, /before.*session/);
    assert.match(value.scenarios[2].agentContribution, /without.*live interpreting or certifying interpreter qualifications/);
    for (const scenario of value.scenarios) {
        assert.match(scenario.conditions.join(' '), /both languages and interpreting direction/);
        assert.match(scenario.conditions.join(' '), /visual access, sightlines, turn-taking and confidentiality/);
        assert.match(scenario.limits.join(' '), /Latency, overlapping signing, obstructed sightlines/);
    }
    assert.notEqual(value.match.profileId, api.describe('ASL').match.profileId);
    assert.notEqual(api.describe('ASL').match.profileId, api.describe('BSL').match.profileId);
});
test('sign-language collisions and unsupported modalities do not inherit signing templates', () => {
    for (const name of [
        'ASLish', 'BSLish', 'Not ASL', 'ASL Software', 'British Sign Language Management',
        'American Sign Language (ASL) and English', 'Sign Language Interpretation Software',
        'write ASL', 'understand spoken British Sign Language', 'interact verbally in British Sign Language',
        'translate Sign Language Interpretation', 'teach sign language', 'Baby Sign Languages',
        'Program Design Languages', 'Architecture Analysis And Design Language (AADL)',
        'Semantic Application Design Languages', 'Sign Language Interpreting'
    ]) {
        const value = api.describe(name);
        assert.notEqual(value.match.kind, 'exact_specialist', name);
        assert.doesNotMatch(value.match.profileId, /^sign-language|^language-/, name);
    }
    for (const name of ['Clinical ASL', 'Medical Sign Language Interpretation', 'Sworn British Sign Language', 'Legal Translation ASL', 'Sign Language Interpretation safety-critical']) {
        const value = api.describe(name);
        assert.equal(value.match.profileId, 'physical', name);
        assert.match(value.scenarios[2].task, /administrative/);
    }
});
test('reviewed physical specialties restrict agents to records, not embodied or regulated execution', () => {
    const boundaries = [
        ['HPLC', /physical instrument operation/, /regulated batch release/],
        ['Welding Engineering', /cannot weld/, /certify an inspection/],
        ['Carpentry', /autonomous cutting/, /structural sign-off/],
        ['HACCP', /autonomous food handling/, /product release/],
        ['Horticulture', /pesticide application/, /qualified authority/]
    ];
    for (const [name, physical, regulated] of boundaries) {
        const value = api.describe(name);
        for (const scenario of value.scenarios) {
            assert.match(scenario.limits.join(' '), physical, name);
            assert.match(scenario.limits.join(' '), regulated, name);
        }
        assert.match(value.scenarios[2].humanContribution, /approve consequential downstream actions/);
        assert.equal(value.scenarios[2].confidence, 'Conditional');
    }
});
test('specialty labels cannot bypass safety-first handling of broader compound skills', () => {
    for (const name of ['Clinical Nursing HPLC', 'Aviation Management GIS', 'Medical Translation', 'Electrical Procurement', 'Construction Web Accessibility', 'Welding Engineering Management', 'Horticulture Management', 'Food Safety Analysis', 'HPLC Software', 'Carpentry Design', 'Paper Chromatography']) {
        const value = api.describe(name);
        assert.match(value.match.label, /Physical/, name);
        assert.match(value.scenarios[2].task, /administrative/, name);
    }
    // Ambiguous related labels must not inherit a curated specialty by substring.
    for (const name of ['Horticultural Therapy', 'coordinate the procurement of organs for transplantation', 'develop translation memory software']) {
        assert.doesNotMatch(api.describe(name).match.basis, /exact skill label or controlled alias/, name);
    }
});
test('nonphysical specialties preserve domain-specific authority and uncertainty limits', () => {
    for (const [name, boundary] of [
        ['GIS', /cadastral certification/],
        ['translation', /Sworn, legal, medical/],
        ['WCAG', /passing scan replaces manual/],
        ['procurement', /contract signature/],
        ['Archival Management', /deaccessioning/]
    ]) {
        assert.ok(api.describe(name).scenarios.every(s => boundary.test(s.limits.join(' '))), name);
    }
});
test('all specialty scenarios preserve proficiency, disclosures and input data without readiness or salary fields', () => {
    for (const { skill } of specialtyCases) {
        const options = { level: 'Expert', salary: 123456, agentReadiness: { stage: 'verified' } };
        const before = JSON.stringify(options);
        const value = api.describe(skill, options);
        assert.equal(JSON.stringify(options), before);
        assert.equal(value.proficiency, 'Expert');
        assert.deepEqual(Array.from(value.scenarios, s => s.title), ['Human-led', 'Agent-augmented', 'Agent-performed']);
        assert.match(value.assumptions.join(' '), /not sequential readiness stages/);
        assert.match(value.assumptions.join(' '), /tool must be evaluated/);
        for (const key of ['salary', 'stage', 'agentReadiness', 'readiness']) assert.equal(key in value, false);
        for (const s of value.scenarios) {
            for (const key of ['task', 'outcome', 'humanContribution', 'agentContribution', 'reason', 'confidence']) assert.ok(s[key], `${skill}: ${key}`);
            assert.ok(s.conditions.length);
            assert.ok(s.limits.length);
        }
        assert.equal(value.scenarios[0].capabilities.length, 0);
        assert.equal(value.scenarios[2].confidence, 'Conditional');
        value.scenarios[1].capabilities.push('invented');
        value.scenarios[1].limits[0] = 'changed';
        value.assumptions[0] = 'changed';
        const fresh = api.describe(skill);
        assert.ok(!fresh.scenarios[1].capabilities.includes('invented'));
        assert.notEqual(fresh.scenarios[1].limits[0], 'changed');
        assert.notEqual(fresh.assumptions[0], 'changed');
    }
});
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
