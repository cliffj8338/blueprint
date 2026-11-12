// On-demand, account-scoped Work Blueprint data for the personal map.
(function () {
    'use strict';
    var owner = null;
    var blueprints = [];
    var status = 'idle';
    var generation = 0;
    var graph = null;
    var selectedIds = [];
    var selectionWarning = '';

    function selectionKey(uid) {
        return 'bp-agent-support-selection:' + uid;
    }

    function readSelection(uid) {
        selectedIds = [];
        selectionWarning = '';
        try {
            var saved = window.localStorage.getItem(selectionKey(uid));
            if (saved !== null) {
                var parsed = JSON.parse(saved);
                if (!Array.isArray(parsed) || parsed.some(function (id) { return typeof id !== 'string'; })) {
                    throw new Error('Invalid selection');
                }
                selectedIds = Array.from(new Set(parsed));
            }
        } catch (error) {
            selectionWarning = 'Saved choices could not be read. Choose Blueprints again for this visit.';
        }
    }

    function saveSelection() {
        try {
            window.localStorage.setItem(selectionKey(owner), JSON.stringify(selectedIds));
            selectionWarning = '';
        } catch (error) {
            selectionWarning = 'Choices apply for this visit but could not be saved in this browser.';
        }
    }

    function context() {
        var user = window.fbUser;
        var allowed = user && window.fbDb && !window.isReadOnlyProfile
            && !window.showcaseMode && !(window.appContext && window.appContext.mode === 'demo');
        return allowed ? user.uid : null;
    }

    function reset() {
        generation++;
        owner = null;
        blueprints = [];
        status = 'idle';
        graph = null;
        selectedIds = [];
        selectionWarning = '';
        if (window.bpAgentSupportMap) window.bpAgentSupportMap.clear();
    }

    function draw() {
        if (!graph || !window.bpAgentSupportMap) return;
        if (context() !== owner) { reset(); return; }
        var uid = owner;
        var mountedGraph = graph;
        var version = generation;
        function isCurrent() {
            return context() === uid && owner === uid && graph === mountedGraph && generation === version;
        }
        function requestLoad() {
            if (isCurrent()) return load();
        }
        window.bpAgentSupportMap.render({
            svg: graph.svg, node: graph.node, link: graph.link,
            blueprints: blueprints, status: status,
            selectedBlueprintIds: selectedIds.slice(),
            selectionWarning: selectionWarning,
            onSelectionChange: function (ids) {
                if (!isCurrent() || status !== 'ready' || !Array.isArray(ids)) return;
                var available = new Set(blueprints.map(function (bp) { return bp.id; }));
                selectedIds = Array.from(new Set(ids.filter(function (id) { return available.has(id); })));
                saveSelection();
                draw();
            },
            onLoad: requestLoad, onRefresh: requestLoad
        });
    }

    async function load() {
        var uid = context();
        if (!uid || uid !== owner || status === 'loading') return;
        var request = ++generation;
        status = 'loading';
        draw();
        try {
            // No ontology/library fetches; reuse the saved Work Blueprint schema.
            var snapshot = await window.fbDb.collection('users').doc(uid)
                .collection('work_blueprints').get();
            if (request !== generation || context() !== uid || owner !== uid) return;
            var next = [];
            snapshot.forEach(function (doc) {
                next.push(Object.assign({}, doc.data(), { id: doc.id }));
            });
            blueprints = next;
            // Deleted Blueprints disappear; newly saved ones require an explicit choice.
            var available = new Set(next.map(function (bp) { return bp.id; }));
            var retained = selectedIds.filter(function (id) { return available.has(id); });
            if (retained.length !== selectedIds.length) {
                selectedIds = retained;
                saveSelection();
            }
            status = 'ready';
        } catch (error) {
            if (request !== generation || context() !== uid || owner !== uid) return;
            // Never present stale requirements as the current saved work model.
            blueprints = [];
            status = 'error';
            console.warn('Work Blueprint map support could not be loaded.');
        }
        draw();
    }

    function mount(nextGraph) {
        var uid = context();
        if (uid !== owner) reset();
        if (!uid) { reset(); return; }
        if (uid !== owner) readSelection(uid);
        owner = uid;
        graph = nextGraph;
        draw();
    }

    function clear() {
        graph = null;
        if (window.bpAgentSupportMap) window.bpAgentSupportMap.clear();
    }

    window.bpAgentSupportData = { mount: mount, clear: clear, reset: reset };
})();
