(function (window, document) {
    'use strict';

    var root = null;
    var active = false;
    var returnFocus = null;
    var backgroundState = [];
    var previousOverflow = '';
    var delegated = false;
    var ids = 0;

    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
        });
    }

    function textList(items) {
        if (!Array.isArray(items) || !items.length) return '<p class="bp-scenario-empty">None specified.</p>';
        return '<ul>' + items.map(function (item) {
            return '<li>' + escapeHTML(item) + '</li>';
        }).join('') + '</ul>';
    }

    function detail(label, value) {
        return '<div class="bp-scenario-detail"><h4>' + escapeHTML(label) + '</h4><p>' +
            (value == null || value === '' ? 'Not specified.' : escapeHTML(value)) + '</p></div>';
    }

    function getService() {
        if (!window.BPWorkScenarios || typeof window.BPWorkScenarios.describe !== 'function') {
            throw new Error('Work scenario service is not available.');
        }
        return window.BPWorkScenarios;
    }

    function scenarioHTML(scenario, index) {
        var id = String(scenario && scenario.id || '');
        var tone = id === 'human' ? 'human' : id === 'augmented' ? 'augmented' : 'performed';
        var title = scenario && scenario.title || 'Task scenario';
        return '<article class="bp-scenario-card bp-scenario-card--' + tone + '">' +
            '<div class="bp-scenario-card-top"><span class="bp-scenario-index">0' + (index + 1) + '</span>' +
            '<span class="bp-scenario-kind">' + escapeHTML(title) + '</span></div>' +
            '<h3>' + escapeHTML(scenario && scenario.task || 'Task not specified') + '</h3>' +
            detail('Outcome', scenario && scenario.outcome) +
            '<div class="bp-scenario-contributions">' +
            detail('Human contribution', scenario && scenario.humanContribution) +
            detail('Agent contribution', scenario && scenario.agentContribution) + '</div>' +
            '<div class="bp-scenario-list-grid">' +
            '<div class="bp-scenario-list"><h4>Relevant capabilities</h4>' + textList(scenario && scenario.capabilities) + '</div>' +
            '<div class="bp-scenario-list"><h4>Conditions</h4>' + textList(scenario && scenario.conditions) + '</div>' +
            '</div>' +
            '<div class="bp-scenario-list bp-scenario-limits"><h4>Limits</h4>' + textList(scenario && scenario.limits) + '</div>' +
            '<div class="bp-scenario-reason"><div><span>Estimate confidence</span><strong>' + escapeHTML(scenario && scenario.confidence != null ? scenario.confidence : 'Not specified') + '</strong></div>' +
            '<p>' + escapeHTML(scenario && scenario.reason || 'No rationale supplied.') + '</p></div>' +
            '</article>';
    }

    function render(data, name) {
        ids += 1;
        var titleId = 'bp-scenario-title-' + ids;
        var match = data.match || {};
        var scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
        var proficiency = data.proficiency == null || data.proficiency === '' ? 'Not specified' : data.proficiency;
        return '<div class="bp-scenario-layer" data-bp-scenario-layer>' +
            '<button class="bp-scenario-backdrop" type="button" tabindex="-1" data-bp-scenario-action="close" aria-label="Close task scenarios"></button>' +
            '<section class="bp-scenario-dialog" role="dialog" aria-modal="true" aria-labelledby="' + titleId + '" tabindex="-1">' +
            '<header class="bp-scenario-header"><div class="bp-scenario-heading">' +
            '<p class="bp-scenario-eyebrow">Blueprint <span> / </span> Work scenarios</p>' +
            '<h2 id="' + titleId + '">' + escapeHTML(name) + '</h2>' +
            '<p class="bp-scenario-subtitle">How agent support could change selected tasks in this skill.</p>' +
            '</div><button class="bp-scenario-close" type="button" data-bp-scenario-action="close" aria-label="Close work scenarios"><span aria-hidden="true">×</span></button></header>' +
            '<div class="bp-scenario-scroll">' +
            '<section class="bp-scenario-context" aria-label="Skill context"><div class="bp-scenario-proficiency"><span>Your human proficiency</span><strong>' + escapeHTML(proficiency) + '</strong></div>' +
            '<div class="bp-scenario-match"><span>Scenario match</span><strong>' + escapeHTML(match.label || 'Not specified') + '</strong><p>' + escapeHTML(match.basis || 'Basis not specified.') + '</p><small>Match confidence: ' + escapeHTML(match.confidence == null ? 'Not specified' : match.confidence) + '</small></div></section>' +
            '<div class="bp-scenario-disclosure" role="note"><span class="bp-scenario-disclosure-mark" aria-hidden="true">i</span><p><strong>Estimates, not verification.</strong> These are informed, bounded task scenarios—not observed outcomes, proven capabilities, or a prediction that a whole skill disappears. Human proficiency and salary are unchanged.</p></div>' +
            '<section class="bp-scenario-scenarios" aria-label="Three possible work scenarios">' +
            (scenarios.length ? scenarios.map(scenarioHTML).join('') : '<div class="bp-scenario-error" role="status">No task scenarios were supplied for this skill.</div>') +
            '</section>' +
            '<section class="bp-scenario-assumptions"><h3>Assumptions behind these estimates</h3>' + textList(data.assumptions) + '</section>' +
            '<p class="bp-scenario-footer-note">Agent-performed refers only to bounded, routine execution under stated conditions. It does not imply autonomous authority for regulated decisions, physical work, or consequential judgment.</p>' +
            '</div></section></div>';
    }

    function setBackgroundInert() {
        backgroundState = [];
        Array.prototype.forEach.call(document.body.children, function (child) {
            if (child === root) return;
            backgroundState.push({
                element: child,
                inert: child.inert,
                hadInert: child.hasAttribute('inert'),
                ariaHidden: child.getAttribute('aria-hidden'),
                hadAriaHidden: child.hasAttribute('aria-hidden')
            });
            child.inert = true;
            child.setAttribute('aria-hidden', 'true');
        });
    }

    function restoreBackground() {
        backgroundState.forEach(function (state) {
            if (!state.element || !state.element.isConnected) return;
            state.element.inert = state.inert;
            if (state.hadInert) state.element.setAttribute('inert', '');
            else state.element.removeAttribute('inert');
            if (state.hadAriaHidden) state.element.setAttribute('aria-hidden', state.ariaHidden);
            else state.element.removeAttribute('aria-hidden');
        });
        backgroundState = [];
    }

    function close() {
        if (!active) return;
        active = false;
        if (root && root.parentNode) root.parentNode.removeChild(root);
        root = null;
        restoreBackground();
        document.body.style.overflow = previousOverflow;
        var target = returnFocus;
        returnFocus = null;
        if (target && typeof target.focus === 'function' && target.isConnected) target.focus();
    }

    function open(name, options) {
        close();
        var skillName = String(name == null ? '' : name).trim();
        if (!skillName) return;
        options = Object.assign({}, options || {});
        var profileSkills = typeof skillsData !== 'undefined' && skillsData ? skillsData.skills || [] : [];
        var profileSkill = profileSkills.find(function (skill) {
            return String(skill.name || '').normalize('NFKC').trim().toLowerCase() === skillName.normalize('NFKC').toLowerCase();
        });
        if (profileSkill && options.level == null) options.level = profileSkill.level;
        returnFocus = (options && options.returnFocus && typeof options.returnFocus.focus === 'function') ?
            options.returnFocus : document.activeElement;
        try {
            var result = getService().describe(skillName, options || {});
            if (!result || typeof result !== 'object') throw new Error('Scenario estimates could not be loaded.');
            root = document.createElement('div');
            root.innerHTML = render(result, skillName);
            document.body.appendChild(root.firstElementChild);
            root = document.body.lastElementChild;
            active = true;
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            setBackgroundInert();
            var dialog = root.querySelector('[role="dialog"]');
            if (dialog) dialog.focus();
        } catch (error) {
            root = document.createElement('div');
            root.className = 'bp-scenario-layer';
            root.innerHTML = '<div class="bp-scenario-error-panel" role="alert"><p class="bp-scenario-eyebrow">Blueprint / Work scenarios</p><h2>Scenarios unavailable</h2><p>' +
                escapeHTML(error && error.message || 'Please try again later.') +
                '</p><button class="bp-scenario-close" type="button" data-bp-scenario-action="close">Close</button></div>';
            document.body.appendChild(root);
            active = true;
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            setBackgroundInert();
            root.querySelector('button').focus();
        }
    }

    function decodeName(value) {
        try { return decodeURIComponent(value || ''); }
        catch (error) { return value || ''; }
    }

    function ensureDelegation() {
        if (delegated) return;
        delegated = true;
        document.addEventListener('click', function (event) {
            var trigger = event.target.closest && event.target.closest('[data-bp-scenario-open]');
            if (trigger) {
                event.preventDefault();
                event.stopPropagation();
                var name = decodeName(trigger.getAttribute('data-bp-scenario-open'));
                if (name) open(name, { returnFocus: trigger });
                return;
            }
            var closeButton = event.target.closest && event.target.closest('[data-bp-scenario-action="close"]');
            if (closeButton && root && root.contains(closeButton)) {
                event.preventDefault();
                event.stopPropagation();
                close();
            }
        }, true);
        document.addEventListener('keydown', function (event) {
            var trigger = event.target.closest && event.target.closest('[data-bp-scenario-open]');
            if (trigger && (event.key === 'Enter' || event.key === ' ')) event.stopPropagation();
            if (!active || !root) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close();
                return;
            }
            if (event.key !== 'Tab') return;
            var focusable = Array.prototype.slice.call(root.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter(function (element) { return !element.hasAttribute('hidden'); });
            if (!focusable.length) {
                event.preventDefault();
                root.querySelector('[role="dialog"]').focus();
                return;
            }
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            var onControl = focusable.indexOf(document.activeElement) >= 0;
            if (event.shiftKey && (document.activeElement === first || !onControl)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !onControl)) {
                event.preventDefault();
                first.focus();
            }
        }, true);
    }

    function badgeHTML(name) {
        ensureDelegation();
        var encoded = encodeURIComponent(String(name == null ? '' : name));
        return '<button type="button" class="bp-scenario-badge" data-bp-scenario-open="' + escapeHTML(encoded) + '" aria-label="Explore work scenarios for ' +
            escapeHTML(name) + '"><span class="bp-scenario-badge-mark" aria-hidden="true">↗</span><span>Work scenarios</span></button>';
    }

    function summaryHTML(skills) {
        ensureDelegation();
        var names = Array.isArray(skills) ? skills.map(function (skill) {
            return typeof skill === 'string' ? skill : (skill && (skill.name || skill.skill || skill.label)) || '';
        }).filter(function (name) { return String(name).trim(); }) : [];
        if (!names.length) {
            return '<section class="bp-scenario-summary" aria-label="Explore work scenarios"><div><p class="bp-scenario-eyebrow">Work scenarios</p><h2>Explore work across your skills</h2><p>Explore how agents could change tasks across your skills.</p></div><p class="bp-scenario-summary-empty">Add skills to your Blueprint to explore task scenarios.</p></section>';
        }
        return '<section class="bp-scenario-summary" aria-label="Explore work scenarios"><div class="bp-scenario-summary-intro"><p class="bp-scenario-eyebrow">Blueprint / Work scenarios</p><h2>Explore task-level change</h2><p>Explore how agents could change tasks across your skills.</p><div class="bp-scenario-labels" aria-label="Scenario types"><span>Human-led</span><span>Agent-augmented</span><span>Agent-performed</span></div></div><div class="bp-scenario-summary-skills">' +
            names.slice(0, 6).map(function (name) {
                var encoded = encodeURIComponent(String(name));
                return '<button type="button" class="bp-scenario-summary-skill" data-bp-scenario-open="' + escapeHTML(encoded) + '"><span>' + escapeHTML(name) + '</span><span aria-hidden="true">Explore <b>↗</b></span></button>';
            }).join('') +
            '</div><p class="bp-scenario-summary-note">Examples above; use Work scenarios on any skill below to explore the rest. Each view presents three informed task scenarios—not a readiness score or count. No agent history required.</p></section>';
    }

    ensureDelegation();
    window.BPWorkScenariosUI = {
        open: open,
        close: close,
        badgeHTML: badgeHTML,
        summaryHTML: summaryHTML
    };
}(window, document));
