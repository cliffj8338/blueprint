/* Skill-level agent partnership requirements and self-reported readiness.
   Deliberately independent from proficiency, rarity and salary calculations. */
(function (root) {
    'use strict';
    var adapter = null;
    var sources = [];
    var sourceOwner = null;
    var sourcePromise = null;
    var sourcesLoadedAt = 0;
    var stages = [
        { value: 'unassessed', label: 'Not assessed', color: '#737b88' },
        { value: 'opportunity', label: 'Opportunity identified', color: '#986321' },
        { value: 'designed', label: 'Workflow designed', color: '#7957b2' },
        { value: 'active', label: 'Agent in use', color: '#0078a3' },
        { value: 'evidenced', label: 'Outcome documented', color: '#258349' }
    ];
    var fields = ['task', 'humanContribution', 'agentTask', 'inputs', 'tools',
        'instructions', 'review', 'criteria', 'agentName', 'result', 'evidenceUrl'];
    function key(name) {
        return 'skill:' + String(name || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
    }
    function config() {
        if (!adapter) throw new Error('Agent readiness is not available yet.');
        return adapter;
    }
    function owner() { return config().owner(); }
    function profileSkills() { return config().skills() || []; }
    function findSkill(name) {
        return profileSkills().find(function (s) { return key(s.name) === key(name); });
    }
    function records() { return config().records() || {}; }
    function ownRecord(name) {
        var all = records();
        return Object.prototype.hasOwnProperty.call(all, key(name)) ? all[key(name)] : null;
    }
    function get(name) {
        var record = ownRecord(name);
        return record && typeof record === 'object' && !record.deleted ? Object.assign({}, record) : null;
    }
    function stageInfo(value) {
        return stages.find(function (s) { return s.value === value; }) || stages[0];
    }
    function status(name) {
        var entry = get(name);
        var stage = stageInfo(entry && entry.stage);
        return { stage: stage.value, label: stage.label, color: stage.color };
    }
    function match(name, other) {
        // Conservative explicit names only: no fuzzy matches or invented links.
        return !!String(name || '').trim() && key(name) === key(other);
    }
    function sourceTasks(name) {
        if (sourceOwner !== owner()) return [];
        var result = [];
        sources.forEach(function (blueprint) {
            (Array.isArray(blueprint.workTasks) ? blueprint.workTasks : []).forEach(function (task) {
                if (!task || typeof task !== 'object') return;
                var human = Array.isArray(task.humanSkills) ? task.humanSkills.filter(Boolean) : [];
                var capabilities = Array.isArray(task.agentCapabilities) ? task.agentCapabilities.filter(Boolean) : [];
                var related = capabilities.filter(function (c) { return match(name, c.relatedHumanSkill); });
                if (!related.length && !human.some(function (s) { return match(name, s.name); })) return;
                if (!capabilities.length || (task.owner !== 'agent' && task.owner !== 'shared')) return;
                result.push({
                    blueprintTitle: String(blueprint.title || blueprint.jobTitle || 'Saved Work Blueprint'),
                    task: String(task.task || ''),
                    humanContribution: human.map(function (s) { return String(s.name || ''); }).filter(Boolean).join(', '),
                    agentTask: (related.length ? related : capabilities).map(function (c) { return String(c.name || ''); }).filter(Boolean).join('; '),
                    review: String(task.humanReview || ''),
                    criteria: String(task.outcome || ''),
                    outcome: String(task.outcome || ''),
                    capabilities: capabilities.map(function (c) { return String(c.name || ''); }).filter(Boolean)
                });
            });
        });
        return result.slice(0, 30);
    }
    function guidance(name) {
        return {
            humanContribution: 'For ' + name + ', define the goal, apply domain judgment, check the result and retain accountability. Specify any decisions that must stay human.',
            agentTask: 'Choose one bounded, permitted digital task that supports ' + name + '. Do not delegate physical work, sensitive decisions or regulated actions without an appropriate approved workflow.',
            inputs: 'List approved sources and examples. Remove unnecessary personal or confidential information; define what the agent may access.',
            instructions: 'State the task, context, allowed tools, output format and constraints. Require source references where relevant, uncertainty reporting, and escalation rather than guessing.',
            review: 'Inspect a sample against trusted inputs. Require human approval before external communication, consequential decisions or changes to systems.',
            criteria: 'Define accuracy, completeness and time targets. Compare an agent-assisted result with your existing workflow; record errors and review effort.'
        };
    }
    function context(name) {
        var skill = findSkill(name);
        if (!skill) throw new Error('This skill is not in the current profile.');
        return {
            skill: { name: skill.name, level: skill.level || 'Not specified' },
            record: get(skill.name),
            readOnly: !config().canEdit(),
            owner: owner(),
            stages: stages.map(function (s) { return Object.assign({}, s); }),
            sources: sourceTasks(skill.name),
            guidance: guidance(skill.name),
            status: status(skill.name)
        };
    }
    async function loadSources() {
        var requestedOwner = owner();
        if (!requestedOwner) return [];
        if (sourceOwner === requestedOwner && sourcePromise && Date.now() - sourcesLoadedAt < 60000) return sourcePromise;
        sourceOwner = requestedOwner;
        sourcesLoadedAt = Date.now();
        sources = [];
        var pending = Promise.resolve().then(function () { return config().loadBlueprints(); }).then(function (items) {
            if (owner() !== requestedOwner || sourceOwner !== requestedOwner) return [];
            sources = Array.isArray(items) ? items.filter(Boolean).slice(0, 100) : [];
            return sources;
        }).catch(function (err) {
            if (sourceOwner === requestedOwner) sourcePromise = null;
            throw err;
        });
        sourcePromise = pending;
        return pending;
    }
    function normalize(draft) {
        draft = draft || {};
        var stage = stageInfo(draft.stage);
        if (stage.value !== draft.stage) throw new Error('Choose a valid readiness stage.');
        var record = { stage: stage.value, deleted: false };
        fields.forEach(function (field) {
            var text = String(draft[field] || '').trim();
            var limit = field === 'instructions' ? 2000 : field === 'evidenceUrl' ? 1000 : 1200;
            if (text.length > limit) throw new Error('The ' + field + ' field is too long (maximum ' + limit + ' characters).');
            record[field] = text;
        });
        if (record.evidenceUrl) {
            var parsed;
            try { parsed = new URL(record.evidenceUrl); } catch (_) { throw new Error('Evidence link must be a complete http or https URL.'); }
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Evidence link must use http or https.');
            if (parsed.username || parsed.password) throw new Error('Do not put credentials in an evidence link.');
        }
        var index = stages.indexOf(stage);
        if (index >= 1 && (!record.task || !record.agentTask)) throw new Error('Describe the task and the agent contribution before identifying an opportunity.');
        if (index >= 2 && (!record.humanContribution || !record.inputs || !record.instructions || !record.review || !record.criteria)) {
            throw new Error('A designed workflow needs a human contribution, inputs, instructions, human review and success criteria.');
        }
        if (index >= 3 && (!record.agentName || !record.tools)) throw new Error('For an agent in use, name the actual agent/tool and its approved access.');
        if (index >= 4 && !record.result) throw new Error('Document an actual result before choosing Outcome documented. This remains self-reported, not verified.');
        record.assessmentType = 'self-reported';
        record.updatedAt = new Date().toISOString();
        return record;
    }
    function nextRecords(name, record) {
        var next = Object.assign(Object.create(null), records());
        if (record) next[key(name)] = record;
        else {
            // The existing profile pipeline uses Firestore merge writes. Explicitly
            // blank every field so a deleted map entry cannot reappear after reload.
            var tombstone = { stage: 'unassessed', deleted: true, updatedAt: new Date().toISOString(), skillName: '', assessmentType: 'self-reported' };
            fields.forEach(function (field) { tombstone[field] = ''; });
            next[key(name)] = tombstone;
        }
        if (Object.keys(next).length > 100 || new TextEncoder().encode(JSON.stringify(next)).length > 180000) {
            throw new Error('Agent playbooks exceed the profile storage allowance. Shorten or remove an older playbook.');
        }
        return next;
    }
    async function save(name, draft, expectedOwner) {
        if (!config().canEdit()) throw new Error('Sign in to your own profile to save an agent playbook.');
        if (arguments.length > 2 && expectedOwner !== owner()) throw new Error('The active profile changed. Reopen the skill before saving.');
        var skill = findSkill(name);
        if (!skill) throw new Error('This skill is not in the current profile.');
        var identity = owner();
        var next = nextRecords(name, Object.assign(normalize(draft), { skillName: skill.name }));
        var synced = await config().persist(next);
        if (owner() !== identity) throw new Error('The active profile changed. Reopen this skill in the intended profile.');
        if (config().onChange) config().onChange();
        return { synced: synced === true };
    }
    async function remove(name, expectedOwner) {
        if (!config().canEdit()) throw new Error('This profile is read-only.');
        if (arguments.length > 1 && expectedOwner !== owner()) throw new Error('The active profile changed. Reopen the skill before removing its playbook.');
        var identity = owner();
        var synced = await config().persist(nextRecords(name, null));
        if (owner() !== identity) throw new Error('The active profile changed. Reopen the intended profile.');
        if (config().onChange) config().onChange();
        return { synced: synced === true };
    }
    function summary(skills) {
        var counts = { unassessed: 0, opportunity: 0, designed: 0, active: 0, evidenced: 0 };
        (skills || []).forEach(function (s) { counts[status(s.name).stage]++; });
        return counts;
    }
    root.BPAgentReadiness = {
        configure: function (value) { adapter = value; sourcePromise = null; sourceOwner = null; sources = []; },
        key: key, get: get, status: status, context: context, summary: summary,
        loadSources: loadSources, save: save, remove: remove
    };
})(window);
