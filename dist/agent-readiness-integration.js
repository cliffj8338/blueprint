/* Adapter into the existing profile save pipeline; no new auth or taxonomy. */
(function (root) {
    'use strict';
    var service = root.BPAgentReadiness;
    if (!service) return;
    function data() { return root._userData || userData; }
    function readOnly() {
        return typeof isReadOnlyProfile !== 'undefined' && isReadOnlyProfile
            || typeof appContext !== 'undefined' && appContext.mode === 'demo'
            || typeof showcaseMode !== 'undefined' && showcaseMode;
    }
    function editable() {
        return !!(typeof fbUser !== 'undefined' && fbUser && !readOnly()
            && typeof userData !== 'undefined' && userData.initialized && !root._partialRestoreActive);
    }
    function owner() { return editable() ? fbUser.uid : null; }
    function skills() { return typeof skillsData !== 'undefined' && skillsData ? skillsData.skills || [] : []; }
    function refreshMap() {
        var svg = document.getElementById('networkView');
        if (!svg) return;
        svg.querySelectorAll('g.node.skill').forEach(function (node) {
            var d = node.__data__;
            var old = node.querySelector('.bp-readiness-marker');
            if (old) old.remove();
            if (!d || !d.name) return;
            var state = service.status(d.name);
            if (state.stage === 'unassessed') return;
            var circle = node.querySelector('circle');
            var radius = circle ? Number(circle.getAttribute('r')) : 7;
            var marker = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            marker.setAttribute('class', 'bp-readiness-marker');
            marker.setAttribute('d', 'M0,-4 L4,0 L0,4 L-4,0 Z');
            marker.setAttribute('transform', 'translate(' + (radius + 3) + ',' + (radius + 3) + ')');
            marker.setAttribute('fill', state.color);
            marker.setAttribute('stroke', 'var(--c-surface-1, white)');
            marker.setAttribute('stroke-width', '1');
            marker.setAttribute('pointer-events', 'none');
            var title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = 'Agent readiness: ' + state.label + ' (self-reported). Human proficiency unchanged.';
            marker.appendChild(title);
            node.appendChild(marker);
        });
        var parent = svg.parentElement;
        var legend = parent.querySelector('#bpAgentReadinessLegend');
        if (!legend) {
            legend = document.createElement('div');
            legend.id = 'bpAgentReadinessLegend';
            legend.style.cssText = 'padding:8px 14px;font-size:12px;color:var(--c-muted);background:var(--c-surface-1);line-height:1.5';
            parent.insertBefore(legend, svg);
        }
        legend.textContent = 'Agent readiness diamonds: amber = opportunity; purple = designed; blue = in use; green = outcome documented; no diamond = not assessed. Self-reported, not verification. Node colors still show human proficiency. Open a skill to assess readiness.';
    }
    function refresh() {
        document.querySelectorAll('[data-bp-readiness-open]').forEach(function (button) {
            var name;
            try { name = decodeURIComponent(button.getAttribute('data-bp-readiness-open')); }
            catch (_) { return; }
            var state = service.status(name);
            var label = button.querySelector('span:last-child');
            var dot = button.querySelector('.bp-readiness-badge-dot');
            if (label) label.textContent = 'Agent: ' + state.label;
            if (dot) dot.style.setProperty('--bp-badge-color', state.color);
            button.setAttribute('aria-label', 'Agent readiness for ' + name + ': ' + state.label);
        });
        document.querySelectorAll('[data-bp-readiness-summary]').forEach(function (el) {
            if (root.BPAgentReadinessUI) el.outerHTML = root.BPAgentReadinessUI.summaryHTML(skills());
        });
        refreshMap();
    }
    service.configure({
        owner: owner,
        canEdit: editable,
        skills: skills,
        records: function () {
            // Never leak personal readiness into read-only sample/showcase profiles.
            return readOnly() ? {} : data().agentReadiness || {};
        },
        loadBlueprints: async function () {
            if (!editable() || typeof fbDb === 'undefined' || !fbDb) return [];
            var uid = fbUser.uid;
            var snapshot = await fbDb.collection('users').doc(uid).collection('work_blueprints')
                .orderBy('savedAt', 'desc').limit(100).get();
            if (owner() !== uid) return [];
            return snapshot.docs.map(function (doc) { return doc.data(); });
        },
        persist: async function (records) {
            if (!editable()) throw new Error('Sign in to your own profile before saving.');
            if (root._partialRestoreActive) throw new Error('The full cloud profile must load before agent playbooks can be saved. Refresh when connected.');
            data().agentReadiness = records;
            userData.agentReadiness = records;
            root._dataDirty = true;
            // Existing routine keeps a local backup and queues single-flight cloud saves.
            // False means pending/local only, not a successful cloud confirmation.
            return await saveToFirestore({ force: true });
        },
        onChange: refresh
    });
    root.BPAgentReadinessIntegration = { refresh: refresh, refreshMap: refreshMap };
    refresh();
})(window);
