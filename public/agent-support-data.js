// On-demand, account-scoped Work Blueprint data for the personal map.
(function () {
    'use strict';
    var owner = null;
    var blueprints = [];
    var status = 'idle';
    var generation = 0;
    var graph = null;

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
        if (window.bpAgentSupportMap) window.bpAgentSupportMap.clear();
    }

    function draw() {
        if (!graph || !window.bpAgentSupportMap) return;
        if (context() !== owner) { reset(); return; }
        window.bpAgentSupportMap.render({
            svg: graph.svg, node: graph.node, link: graph.link,
            blueprints: blueprints, status: status,
            onLoad: load, onRefresh: load
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
