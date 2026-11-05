(function (window, document) {
    'use strict';

    var STAGES = ['unassessed', 'opportunity', 'designed', 'active', 'evidenced'];
    var LABELS = {
        unassessed: 'Not assessed',
        opportunity: 'Opportunity identified',
        designed: 'Workflow designed',
        active: 'Agent in use',
        evidenced: 'Outcome documented'
    };
    var FIELDS = [
        { key: 'task', label: 'Work task', section: 'playbook', wide: true, multiline: true },
        { key: 'humanContribution', label: 'Human contribution', section: 'playbook', wide: true, multiline: true },
        { key: 'agentTask', label: 'Agent task', section: 'playbook', wide: true, multiline: true },
        { key: 'inputs', label: 'Inputs and context', section: 'playbook', multiline: true },
        { key: 'tools', label: 'Tools', section: 'playbook' },
        { key: 'instructions', label: 'Instructions', section: 'playbook', wide: true, multiline: true },
        { key: 'review', label: 'Human review', section: 'safety', wide: true, multiline: true },
        { key: 'criteria', label: 'Success criteria', section: 'safety', wide: true, multiline: true },
        { key: 'agentName', label: 'Agent or system name', section: 'safety' },
        { key: 'result', label: 'Outcome (self-reported)', section: 'evidence', wide: true, multiline: true },
        { key: 'evidenceUrl', label: 'Evidence link (optional)', section: 'evidence', wide: true, url: true }
    ];
    var root = null;
    var active = null;
    var originalFocus = null;
    var session = 0;
    var delegated = false;
    var inertBackground = [];
    var previousOverflow = '';

    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
        });
    }
    function safeURL(value) {
        if (!value || !/^https?:\/\//i.test(String(value).trim())) return '';
        try {
            var parsed = new URL(String(value), window.location.href);
            return (parsed.protocol === 'https:' || parsed.protocol === 'http:') ? parsed.href : '';
        } catch (error) { return ''; }
    }
    function getService() {
        if (!window.BPAgentReadiness) throw new Error('Agent readiness service is not available.');
        return window.BPAgentReadiness;
    }
    function contextFor(name) {
        return getService().context(name);
    }
    function statusFor(name) {
        try { return getService().status(name) || {}; } catch (error) { return {}; }
    }
    function getLabel(stage) {
        return LABELS[stage] || LABELS.unassessed;
    }
    function nextStep(stage) {
        return ({
            unassessed: 'Your proficiency does not yet show how you partner with an agent. Choose one real task and identify what you retain and what an agent could support.',
            opportunity: 'Support has been identified, not demonstrated. Define approved inputs, instructions, review and success criteria before piloting a workflow.',
            designed: 'A design is not an operating agent. Configure an approved tool, try representative tasks and record the human review effort.',
            active: 'Using an agent is not proof of better outcomes. Compare quality, errors and total time including review against your existing workflow.',
            evidenced: 'Your result is documented but self-reported. Strengthen it with repeatable examples, a baseline comparison and independent review where possible.'
        })[stage] || '';
    }
    function stageColor(stage, provided) {
        if (provided && /^(#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\)|hsla?\([0-9.,%\s]+\)|[a-z]+)$/i.test(provided)) return provided;
        return ({
            unassessed: 'var(--text-muted, #777)',
            opportunity: 'var(--warning, #a65d00)',
            designed: '#7957b2',
            active: '#0078a3',
            evidenced: 'var(--success, #25804c)'
        })[stage] || 'var(--accent, #0071e3)';
    }
    function ensureDelegation() {
        if (delegated) return;
        delegated = true;
        document.addEventListener('click', function (event) {
            var button = event.target.closest && event.target.closest('[data-bp-readiness-open]');
            if (!button) return;
            event.preventDefault();
            event.stopPropagation();
            var name;
            try { name = decodeURIComponent(button.getAttribute('data-bp-readiness-open') || ''); }
            catch (error) { name = button.getAttribute('data-bp-readiness-open') || ''; }
            if (name) api.open(name, button);
        }, true);
        document.addEventListener('keydown', function (event) {
            if ((event.key === 'Enter' || event.key === ' ') && event.target.closest &&
                event.target.closest('[data-bp-readiness-open]')) event.stopPropagation();
        }, true);
    }
    function badgeHTML(skillName) {
        var name = String(skillName == null ? '' : skillName);
        var status = statusFor(name);
        var stage = STAGES.indexOf(status.stage) >= 0 ? status.stage : 'unassessed';
        return '<button type="button" class="bp-readiness-badge" data-bp-readiness-open="' +
            escapeHTML(encodeURIComponent(name)) + '" aria-label="Agent readiness for ' + escapeHTML(name) +
            ': ' + escapeHTML(status.label || getLabel(stage)) + '">' +
            '<span class="bp-readiness-badge-dot" style="--bp-badge-color:' +
            escapeHTML(stageColor(stage, status.color)) + '" aria-hidden="true"></span>' +
            '<span>Agent: ' + escapeHTML(status.label || getLabel(stage)) + '</span></button>';
    }
    function summaryHTML(skills) {
        var counts = {};
        try { counts = getService().summary(Array.isArray(skills) ? skills : []) || {}; } catch (error) {}
        var order = ['unassessed', 'opportunity', 'designed', 'active', 'evidenced'];
        var content = order.map(function (stage) {
            return '<li><strong>' + escapeHTML(Number(counts[stage]) || 0) + '</strong> ' + escapeHTML(getLabel(stage)) + '</li>';
        }).join('');
        return '<section class="bp-readiness-summary" data-bp-readiness-summary aria-label="Agent readiness summary">' +
            '<h3 class="bp-readiness-summary-title">Agent readiness <span class="sr-only">is separate from skill mastery</span></h3>' +
            '<ul class="bp-readiness-summary-counts">' + content + '</ul>' +
            '<p class="bp-readiness-summary-note">Keep human judgment and accountability distinct from agent execution. Rarity labels are existing impact ratings, not proof of agent readiness. Outcomes here are self-reported, not verified; salary estimates are unchanged.</p></section>';
    }
    function normalizeDraft(context) {
        var record = context.record || {};
        var draft = {};
        FIELDS.forEach(function (field) {
            draft[field.key] = record[field.key] == null ? '' : String(record[field.key]);
        });
        draft.stage = STAGES.indexOf(record.stage) >= 0 ? record.stage : 'unassessed';
        return draft;
    }
    function formDraft() {
        var draft = { stage: active.stage.value };
        FIELDS.forEach(function (field) {
            var input = active.form.elements.namedItem(field.key);
            draft[field.key] = input ? input.value : '';
        });
        return draft;
    }
    function changed() {
        return !!active && JSON.stringify(formDraft()) !== JSON.stringify(active.initial);
    }
    function fieldHTML(field, draft, disabled) {
        var id = 'bp-readiness-' + field.key;
        var value = escapeHTML(draft[field.key]);
        var limit = field.key === 'instructions' ? 2000 : field.key === 'evidenceUrl' ? 1000 : 1200;
        var common = ' id="' + id + '" name="' + field.key + '" maxlength="' + limit + '"' + (disabled ? ' disabled' : '');
        var control = field.multiline
            ? '<textarea' + common + '>' + value + '</textarea>'
            : '<input' + common + (field.url ? ' type="url" inputmode="url" autocomplete="url"' : ' type="text"') +
                (field.url ? ' placeholder="https://…"' : '') + ' value="' + value + '">';
        return '<div class="bp-readiness-field' + (field.wide ? ' bp-readiness-field--wide' : '') + '">' +
            '<label for="' + id + '">' + escapeHTML(field.label) + '</label>' + control +
            (field.key === 'result' ? '<p class="bp-readiness-note">Documented outcome is self-reported; it is not independently verified.</p>' : '') +
            '</div>';
    }
    function stageSelectHTML(context, draft, disabled) {
        var stages = Array.isArray(context.stages) && context.stages.length ? context.stages : STAGES.map(function (value) {
            return { value: value, label: getLabel(value) };
        });
        var options = stages.map(function (stage) {
            var value = STAGES.indexOf(stage.value) >= 0 ? stage.value : 'unassessed';
            return '<option value="' + escapeHTML(value) + '"' + (draft.stage === value ? ' selected' : '') + '>' +
                escapeHTML(stage.label || getLabel(value)) + '</option>';
        }).join('');
        return '<div class="bp-readiness-field"><label for="bp-readiness-stage">Readiness stage</label>' +
            '<select id="bp-readiness-stage" name="stage"' + (disabled ? ' disabled' : '') + '>' + options + '</select>' +
            '<p class="bp-readiness-note">Choose a stage deliberately; a template never advances it for you.</p></div>';
    }
    function createMarkup(context, name) {
        var draft = normalizeDraft(context);
        var readOnly = !!context.readOnly;
        var currentStatus = context.status || statusFor(name) || {};
        var stageLabel = currentStatus.label || getLabel(draft.stage);
        var color = stageColor(draft.stage, currentStatus.color);
        var grouped = { playbook: [], safety: [], evidence: [] };
        FIELDS.forEach(function (field) { grouped[field.section].push(fieldHTML(field, draft, readOnly)); });
        var template = context.guidance || {};
        var hasTemplate = Object.keys(template).some(function (key) { return template[key] != null && String(template[key]).trim(); });
        var sourceOptions = '<option value="">Choose a saved Work Blueprint…</option>';
        return '<div class="bp-readiness-layer" data-bp-readiness-layer>' +
            '<div class="bp-readiness-backdrop" data-action="backdrop"></div>' +
            '<section class="bp-readiness-dialog" role="dialog" aria-modal="true" aria-labelledby="bp-readiness-title" aria-describedby="bp-readiness-description" tabindex="-1">' +
            '<header class="bp-readiness-header"><div><p class="bp-readiness-eyebrow">Blueprint · Agent readiness</p>' +
            '<h2 class="bp-readiness-title" id="bp-readiness-title">' + escapeHTML(name) + '</h2>' +
            '<p class="bp-readiness-subtitle" id="bp-readiness-description">Your human proficiency: ' + escapeHTML(context.skill && context.skill.level || 'Not specified') + '. Design, operate and document your agent partnership separately.</p></div>' +
            '<button class="bp-readiness-close" type="button" data-action="close" aria-label="Close readiness playbook">×</button></header>' +
            '<div class="bp-readiness-scroll"><div class="bp-readiness-state" style="--bp-r-stage:' + escapeHTML(color) + '">' +
            'Current readiness: <strong>' + escapeHTML(stageLabel) + '</strong>. Readiness describes agent collaboration, not skill mastery.</div>' +
            '<p class="bp-readiness-note" data-next-step>' + escapeHTML(nextStep(draft.stage)) + '</p>' +
            '<p class="bp-readiness-note">Readiness applies to this one workflow, not every task using this skill. This playbook does not launch an agent. Use approved tools; never paste passwords, API keys, or confidential source material here.</p>' +
            (readOnly ? '<p class="bp-readiness-note">This profile is read-only. Personal agent playbooks are private and are not shown on sample profiles.</p>' : '') +
            '<p class="bp-readiness-feedback" data-feedback role="status" aria-live="polite"></p>' +
            '<form class="bp-readiness-form" novalidate>' +
            '<fieldset class="bp-readiness-section"' + (readOnly ? ' disabled' : '') + '><legend class="bp-readiness-section-title">Readiness stage</legend>' +
            stageSelectHTML(context, draft, readOnly) + '</fieldset>' +
            '<section class="bp-readiness-section" aria-labelledby="bp-readiness-source-heading"><h3 class="bp-readiness-section-title" id="bp-readiness-source-heading">Start from a saved Blueprint</h3>' +
            '<div class="bp-readiness-source-box"><label for="bp-readiness-source">Saved Work Blueprints' +
            '<select id="bp-readiness-source" data-source-select' + (readOnly ? ' disabled' : '') + '>' + sourceOptions + '</select></label>' +
            '<button class="bp-readiness-button" type="button" data-action="apply-source"' + (readOnly ? ' disabled' : '') + '>Apply to draft</button>' +
            '<p class="bp-readiness-note" data-source-status role="status" aria-live="polite">Loading saved Blueprints…</p></div></section>' +
            (hasTemplate ? '<section class="bp-readiness-section"><h3 class="bp-readiness-section-title">Planning template</h3>' +
                '<div class="bp-readiness-templates"><p>Use Blueprint guidance as a starting point. This is a planning template, not an agent that has been built or evaluated.</p>' +
                '<button class="bp-readiness-button" type="button" data-action="apply-template"' + (readOnly ? ' disabled' : '') + '>Use planning template</button></div></section>' : '') +
            '<fieldset class="bp-readiness-section"' + (readOnly ? ' disabled' : '') + '><legend class="bp-readiness-section-title">Work playbook</legend><div class="bp-readiness-grid">' + grouped.playbook.join('') + '</div></fieldset>' +
            '<fieldset class="bp-readiness-section"' + (readOnly ? ' disabled' : '') + '><legend class="bp-readiness-section-title">Review and accountability</legend><div class="bp-readiness-grid">' + grouped.safety.join('') + '</div></fieldset>' +
            '<fieldset class="bp-readiness-section"' + (readOnly ? ' disabled' : '') + '><legend class="bp-readiness-section-title">Outcome and evidence</legend><div class="bp-readiness-grid">' + grouped.evidence.join('') + '</div>' +
            (context.record && context.record.updatedAt ? '<p class="bp-readiness-note">Last updated: ' + escapeHTML(context.record.updatedAt) + '</p>' : '') +
            (context.record && safeURL(context.record.evidenceUrl) ? '<p class="bp-readiness-note">Evidence link: <a class="bp-readiness-evidence-link" href="' + escapeHTML(safeURL(context.record.evidenceUrl)) + '" target="_blank" rel="noopener noreferrer">Open evidence in a new tab</a></p>' : '') +
            '</fieldset><div class="bp-readiness-actions bp-readiness-actions--footer">' +
            (context.record && !readOnly ? '<button class="bp-readiness-button bp-readiness-button--danger" type="button" data-action="remove">Remove playbook</button>' : '<span></span>') +
            '<div class="bp-readiness-actions-group">' +
            '<button class="bp-readiness-button" type="button" data-action="copy-brief">Copy partner brief</button>' +
            '<button class="bp-readiness-button" type="button" data-action="close">Close</button>' +
            '<button class="bp-readiness-button bp-readiness-button--primary" type="submit" data-action="save"' + (readOnly ? ' disabled title="This profile is read-only"' : '') + '>' + (readOnly ? 'Read-only' : 'Save playbook') + '</button>' +
            '</div></div><textarea data-brief hidden readonly aria-label="Agent partner brief for manual copying"></textarea></form></div></section></div>';
    }
    function setFeedback(message, kind) {
        var feedback = root && root.querySelector('[data-feedback]');
        if (!feedback) return;
        feedback.textContent = message || '';
        feedback.setAttribute('data-kind', kind || '');
    }
    function updateStatus() {
        if (!active || !root) return;
        var status = statusFor(active.name);
        var state = root.querySelector('.bp-readiness-state');
        if (state) {
            state.style.setProperty('--bp-r-stage', stageColor(status.stage, status.color));
            state.innerHTML = 'Current readiness: <strong>' + escapeHTML(status.label || getLabel(status.stage)) + '</strong>. Readiness describes agent collaboration, not skill mastery.';
        }
        var next = root.querySelector('[data-next-step]');
        if (next) next.textContent = nextStep(status.stage);
    }
    function populateSources(sources) {
        if (!active || !root) return;
        active.sources = Array.isArray(sources) ? sources : [];
        var select = root.querySelector('[data-source-select]');
        var status = root.querySelector('[data-source-status]');
        if (!select || !status) return;
        var existing = select.value;
        select.innerHTML = '<option value="">Choose a saved Work Blueprint…</option>' +
            active.sources.map(function (source, index) {
                var label = (source.blueprintTitle || 'Work Blueprint') + ' — ' + (source.task || ('Task ' + (index + 1)));
                return '<option value="' + index + '">' + escapeHTML(label) + '</option>';
            }).join('');
        if (existing && Number(existing) < active.sources.length) select.value = existing;
        status.textContent = active.sources.length
            ? active.sources.length + ' matching task' + (active.sources.length === 1 ? '' : 's') + ' available from up to 100 recent saved Blueprints. Applying one fills the draft only, not evidence or readiness.'
            : 'No matching agent-supported tasks found in your saved Work Blueprints. You can still write this playbook manually.';
    }
    function updateChangedUI() {
        if (!active || active.readOnly) return;
        var save = root.querySelector('[data-action="save"]');
        if (save) {
            save.disabled = active.pending;
            if (!active.pending) save.textContent = 'Save playbook';
        }
    }
    function applyValues(values) {
        if (!active || active.readOnly) return;
        var replacing = FIELDS.some(function (field) {
            var input = active.form.elements.namedItem(field.key);
            return values[field.key] != null && input && input.value.trim() && input.value !== String(values[field.key]);
        });
        if (replacing && !window.confirm('Replace matching draft fields with this planning guidance? Review existing outcomes separately; suggestions are not evidence.')) return;
        FIELDS.forEach(function (field) {
            var value = values[field.key];
            var input = active.form.elements.namedItem(field.key);
            if (input && value != null) input.value = String(value);
        });
        setFeedback('Draft filled. Review it and choose a readiness stage yourself; no stage was changed.', 'success');
    }
    function applyTemplate() {
        var guidance = active.context.guidance || {};
        var values = {};
        FIELDS.forEach(function (field) {
            if (guidance[field.key] != null) values[field.key] = guidance[field.key];
        });
        applyValues(values);
    }
    function applySource() {
        var select = root.querySelector('[data-source-select]');
        if (!select || select.value === '') {
            setFeedback('Choose a saved Work Blueprint task first.', 'error');
            return;
        }
        var source = select && active.sources[Number(select.value)];
        if (!source) {
            setFeedback('Choose a saved Work Blueprint first.', 'error');
            return;
        }
        if (STAGES.indexOf(active.stage.value) >= 3 &&
            source.task !== active.form.elements.namedItem('task').value) {
            setFeedback('This is a different task. Clear the previous outcome and lower readiness before applying a new proposed workflow; old results do not demonstrate a different task.', 'error');
            return;
        }
        applyValues(source);
    }
    function copyBrief() {
        if (!active || active.pending) return;
        var draft = formDraft();
        var text = 'AGENT PARTNER BRIEF — ' + active.name + '\nPlanning specification only; this does not deploy an agent.\n\n' +
            FIELDS.filter(function (f) { return f.section !== 'evidence'; }).map(function (field) {
                return field.label + ':\n' + (draft[field.key].trim() || '[Define before use]');
            }).join('\n\n') +
            '\n\nUse only approved tools and data. Report uncertainty and request human approval at the review checkpoints. Do not assume permissions from this brief.';
        var fallback = function () {
            if (!active || !root) return;
            var box = root.querySelector('[data-brief]');
            box.hidden = false;
            box.value = text;
            box.focus();
            box.select();
            setFeedback('Automatic copying is unavailable. Copy the selected partner brief below.', '');
        };
        if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
            window.navigator.clipboard.writeText(text).then(function () {
                if (active) setFeedback('Partner brief copied. Review it in your approved agent tool; no agent has been deployed.', 'success');
            }).catch(fallback);
        } else fallback();
    }
    function focusables() {
        if (!root) return [];
        return Array.prototype.slice.call(root.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
        )).filter(function (element) { return element.offsetParent !== null; });
    }
    function onKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            api.close();
            return;
        }
        if (event.key !== 'Tab') return;
        var items = focusables();
        if (!items.length) { event.preventDefault(); return; }
        var first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
            event.preventDefault(); first.focus();
        }
    }
    function handleClick(event) {
        var action = event.target.closest && event.target.closest('[data-action]');
        if (!action) return;
        var type = action.getAttribute('data-action');
        if (type === 'backdrop') { api.close(); return; }
        if (type === 'close') { api.close(); return; }
        if (type === 'apply-template') { applyTemplate(); return; }
        if (type === 'apply-source') { applySource(); return; }
        if (type === 'copy-brief') { copyBrief(); return; }
        if (type === 'remove') { removeRecord(); }
    }
    function teardown(restore) {
        if (!root) return;
        var target = originalFocus;
        root.removeEventListener('click', handleClick);
        root.removeEventListener('keydown', onKeydown);
        root.remove();
        inertBackground.forEach(function (element) { element.removeAttribute('inert'); });
        inertBackground = [];
        document.body.style.overflow = previousOverflow;
        root = null;
        active = null;
        originalFocus = null;
        if (restore && target && document.contains(target) && typeof target.focus === 'function') target.focus();
    }
    function removeRecord() {
        if (!active || active.readOnly || active.pending || !active.context.record) return;
        var warning = 'Remove the saved agent-readiness playbook for this skill? This deletes its planning and self-reported outcome record. It does not remove the skill or change mastery, and removal may sync to your profile.';
        if (changed()) warning += ' Your unsaved edits will also be discarded.';
        if (!window.confirm(warning)) return;
        active.pending = true;
        setFeedback('Removing playbook…', '');
        getService().remove(active.name, active.context.owner).then(function (result) {
            if (!active) return;
            active.pending = false;
            if (result && result.synced) active.context.record = null;
            var blank = normalizeDraft({});
            active.stage.value = blank.stage;
            FIELDS.forEach(function (field) { active.form.elements.namedItem(field.key).value = ''; });
            active.initial = formDraft();
            var removeButton = root.querySelector('[data-action="remove"]');
            if (removeButton && result && result.synced) removeButton.remove();
            updateStatus();
            setFeedback(result && result.synced ? 'Playbook removed and synced.' : 'Removal is not yet confirmed in the cloud. Keep this window open and check the profile save indicator.', result && result.synced ? 'success' : 'error');
        }).catch(function (error) {
            if (!active) return;
            active.pending = false;
            setFeedback(error && error.message ? error.message : 'Could not remove this playbook. Please try again.', 'error');
        });
    }
    function submit(event) {
        event.preventDefault();
        if (!active || active.readOnly || active.pending) return;
        var draft = formDraft();
        if (!draft.task.trim()) {
            setFeedback('Add a work task before saving this playbook.', 'error');
            var taskInput = active.form.elements.namedItem('task');
            if (taskInput) taskInput.focus();
            return;
        }
        if (draft.evidenceUrl && !safeURL(draft.evidenceUrl)) {
            setFeedback('Evidence link must use HTTP or HTTPS.', 'error');
            active.form.elements.namedItem('evidenceUrl').focus();
            return;
        }
        active.pending = true;
        var saveButton = root.querySelector('[data-action="save"]');
        if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Saving…'; }
        setFeedback('Saving playbook…', '');
        getService().save(active.name, draft, active.context.owner).then(function (result) {
            if (!active) return;
            active.pending = false;
            active.initial = JSON.parse(JSON.stringify(draft));
            active.context.record = Object.assign({}, active.context.record || {}, draft);
            active.context.status = { stage: draft.stage, label: getLabel(draft.stage) };
            if (!root.querySelector('[data-action="remove"]')) {
                var placeholder = root.querySelector('.bp-readiness-actions--footer > span');
                if (placeholder) {
                    var remove = document.createElement('button');
                    remove.type = 'button';
                    remove.className = 'bp-readiness-button bp-readiness-button--danger';
                    remove.setAttribute('data-action', 'remove');
                    remove.textContent = 'Remove playbook';
                    placeholder.replaceWith(remove);
                }
            }
            updateStatus();
            setFeedback(result && result.synced
                ? 'Playbook saved and synced.'
                : 'Cloud save is not confirmed. Your changes remain in this session; check the profile save indicator before leaving.', result && result.synced ? 'success' : 'error');
            var next = root.querySelector('[data-next-step]');
            if (next) next.textContent = nextStep(draft.stage);
            if (saveButton) { saveButton.disabled = false; saveButton.textContent = result && result.synced ? 'Saved' : 'Retry save'; }
        }).catch(function (error) {
            if (!active) return;
            active.pending = false;
            setFeedback(error && error.message ? error.message : 'Could not save this playbook. Your draft is still here.', 'error');
            if (saveButton) { saveButton.disabled = false; saveButton.textContent = 'Save playbook'; }
        });
    }
    var api = {
        open: function (skillName, trigger) {
            var name = String(skillName == null ? '' : skillName).trim();
            if (!name) return false;
            if (active && !api.close()) return false;
            ensureDelegation();
            var context;
            try { context = contextFor(name); }
            catch (error) {
                if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
                else window.alert(error.message);
                return false;
            }
            originalFocus = trigger || document.activeElement;
            session += 1;
            root = document.createElement('div');
            root.innerHTML = createMarkup(context || {}, name);
            root = root.firstElementChild;
            active = {
                name: name,
                context: context || {},
                readOnly: !!(context && context.readOnly),
                form: root.querySelector('form'),
                stage: root.querySelector('[name="stage"]'),
                initial: null,
                sources: [],
                pending: false,
                session: session
            };
            active.initial = formDraft();
            document.body.appendChild(root);
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            inertBackground = Array.prototype.filter.call(document.body.children, function (element) {
                return element !== root && !element.hasAttribute('inert') && !/^(SCRIPT|STYLE|LINK)$/.test(element.tagName);
            });
            inertBackground.forEach(function (element) { element.setAttribute('inert', ''); });
            root.addEventListener('click', handleClick);
            root.addEventListener('keydown', onKeydown);
            active.form.addEventListener('input', updateChangedUI);
            active.form.addEventListener('change', updateChangedUI);
            active.form.addEventListener('submit', submit);
            var closeButton = root.querySelector('[data-action="close"]');
            if (closeButton) closeButton.focus();
            var thisSession = session;
            try {
                Promise.resolve(getService().loadSources()).then(function () {
                    if (active && active.session === thisSession) populateSources(contextFor(active.name).sources);
                }).catch(function (error) {
                    if (!active || active.session !== thisSession) return;
                    var status = root.querySelector('[data-source-status]');
                    if (status) status.textContent = 'Could not load saved Blueprints: ' + (error && error.message ? error.message : 'please try again later.') + ' Manual editing is still available.';
                });
            } catch (error) {
                var sourceStatus = root.querySelector('[data-source-status]');
                if (sourceStatus) sourceStatus.textContent = 'Saved Blueprints could not be loaded. Manual editing is still available.';
            }
            return true;
        },
        close: function () {
            if (!root) return true;
            if (active && active.pending) {
                setFeedback('Please wait for the current save or removal to finish.', '');
                return false;
            }
            if (active && changed() && !window.confirm('Discard your unsaved changes to this readiness playbook?')) return false;
            teardown(true);
            return true;
        },
        badgeHTML: badgeHTML,
        summaryHTML: summaryHTML,
        refresh: function () {
            if (!active) return;
            var latest;
            try { latest = contextFor(active.name); } catch (error) { return; }
            var dirty = changed();
            active.context = latest || {};
            active.readOnly = !!(latest && latest.readOnly);
            if (!dirty) {
                var values = normalizeDraft(latest || {});
                active.stage.value = values.stage;
                FIELDS.forEach(function (field) {
                    var input = active.form.elements.namedItem(field.key);
                    if (input) input.value = values[field.key];
                });
                active.initial = formDraft();
            }
            var state = root.querySelector('.bp-readiness-state');
            if (state) {
                var status = latest.status || statusFor(active.name);
                var stage = STAGES.indexOf(status.stage) >= 0 ? status.stage : 'unassessed';
                state.style.setProperty('--bp-r-stage', stageColor(stage, status.color));
                state.innerHTML = 'Current readiness: <strong>' + escapeHTML(status.label || getLabel(stage)) + '</strong>. Readiness describes agent collaboration, not skill mastery.';
            }
        }
    };
    window.BPAgentReadinessUI = api;
    ensureDelegation();
})(window, document);
