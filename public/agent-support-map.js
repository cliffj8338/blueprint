(function (global) {
    'use strict';

    var current = null;
    var STYLE_ID = 'bp-agent-support-map-style';
    var LEGEND_ID = 'bp-agent-support-map-legend';
    var DIALOG_ID = 'bp-agent-support-map-dialog';

    function normalize(value) {
        return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLocaleLowerCase() : '';
    }

    function asText(value) {
        return value == null ? '' : String(value).trim();
    }

    function indexSupport(blueprints, skills) {
        var index = new Map();
        var allowed = new Map();
        (Array.isArray(skills) ? skills : []).forEach(function (skill) {
            if (!skill || typeof skill.name !== 'string' || !skill.name.trim()) return;
            var key = normalize(skill.name);
            if (key && !allowed.has(key)) allowed.set(key, skill.name.trim().replace(/\s+/g, ' '));
        });

        (Array.isArray(blueprints) ? blueprints : []).forEach(function (blueprint) {
            if (!blueprint || typeof blueprint !== 'object' || !Array.isArray(blueprint.workTasks)) return;
            blueprint.workTasks.forEach(function (task) {
                if (!task || typeof task !== 'object' || !Array.isArray(task.agentCapabilities)) return;
                var seen = new Set();
                task.agentCapabilities.forEach(function (capability) {
                    if (!capability || typeof capability !== 'object') return;
                    var related = typeof capability.relatedHumanSkill === 'string' ? capability.relatedHumanSkill.trim().replace(/\s+/g, ' ') : '';
                    var key = normalize(related);
                    if (!key || !allowed.has(key)) return;
                    var capabilityName = asText(capability.name);
                    if (!capabilityName) return;
                    var dedupeKey = key + '\u0000' + normalize(capabilityName);
                    if (seen.has(dedupeKey)) return;
                    seen.add(dedupeKey);
                    if (!index.has(key)) index.set(key, []);
                    index.get(key).push({ blueprint: blueprint, task: task, capability: capability });
                });
            });
        });
        return index;
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.bp-agent-support-legend{box-sizing:border-box;position:absolute;z-index:20;top:10px;right:12px;width:min(310px,calc(100% - 24px));padding:11px 13px;border:1px solid var(--border,rgba(148,163,184,.28));border-radius:12px;background:var(--bg-elevated,rgba(20,27,39,.96));color:var(--text-primary,#e8edf5);font:500 12px/1.45 Outfit,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.18)}',
            '.bp-agent-support-legend [data-part=header]{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:4px}',
            '.bp-agent-support-legend strong{font-size:13px;letter-spacing:.01em}',
            '.bp-agent-support-legend p{margin:4px 0 0;color:var(--text-muted,#9aa8ba)}',
            '.bp-agent-support-legend button,.bp-agent-support-dialog button{font:600 12px/1.3 Outfit,sans-serif;cursor:pointer}',
            '.bp-agent-support-legend button{border:1px solid var(--accent,#60a5fa);border-radius:7px;padding:6px 9px;background:transparent;color:var(--accent,#60a5fa);white-space:nowrap}',
            '.bp-agent-support-legend button:hover,.bp-agent-support-dialog button:hover{filter:brightness(1.08)}',
            '.bp-agent-support-legend button:focus-visible,.bp-agent-support-marker:focus-visible,.bp-agent-support-dialog button:focus-visible{outline:3px solid var(--accent,#60a5fa);outline-offset:2px}',
            '.bp-agent-support-legend [data-state=loading]{opacity:.75}',
            '.bp-agent-support-key{display:flex;align-items:center;gap:7px;margin-top:5px;color:var(--text-secondary)}',
            '.bp-agent-support-key span{flex:none;width:13px;height:13px;border:2px dashed #b889ff;border-radius:50%}',
            '.bp-agent-support-ring{fill:none;stroke:#b889ff;stroke-width:2;stroke-dasharray:3 3;pointer-events:none}',
            '.bp-agent-support-marker{cursor:pointer;pointer-events:all}',
            '.bp-agent-support-marker circle{fill:#f2eaff;stroke:#8056bd;stroke-width:1.5}',
            '.bp-agent-support-marker text{fill:#583586;font:700 9px Outfit,sans-serif;text-anchor:middle;dominant-baseline:central;pointer-events:none}',
            '.bp-agent-support-edge{stroke:#b889ff!important;stroke-dasharray:5 4!important;stroke-width:2!important;opacity:.92!important;pointer-events:none}',
            '.bp-agent-support-dialog{position:fixed;inset:0;z-index:10020;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,14,24,.62);font-family:Outfit,sans-serif}',
            '.bp-agent-support-dialog[hidden]{display:none}',
            '.bp-agent-support-dialog [data-part=panel]{box-sizing:border-box;width:min(510px,100%);max-height:min(82dvh,700px);overflow:auto;border:1px solid var(--border,rgba(148,163,184,.3));border-radius:16px;background:var(--bg-elevated,#182231);color:var(--text-primary,#e8edf5);box-shadow:0 24px 80px rgba(0,0,0,.35);padding:21px}',
            '.bp-agent-support-dialog [data-part=top]{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}',
            '.bp-agent-support-dialog h2{font-size:19px;line-height:1.25;margin:0}',
            '.bp-agent-support-dialog [data-part=eyebrow]{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--accent,#60a5fa);margin-bottom:5px}',
            '.bp-agent-support-dialog [data-part=close]{border:0;background:transparent;color:var(--text-muted,#9aa8ba);font-size:22px;padding:0 4px}',
            '.bp-agent-support-dialog dl{display:grid;grid-template-columns:112px 1fr;gap:9px 14px;margin:0}',
            '.bp-agent-support-dialog dl+dl{margin-top:18px;padding-top:18px;border-top:1px solid var(--border)}',
            '.bp-agent-support-dialog dt{color:var(--text-muted,#9aa8ba);font-size:12px}',
            '.bp-agent-support-dialog dd{margin:0;font-size:13px;overflow-wrap:anywhere}',
            '.bp-agent-support-dialog [data-part=notice]{margin:18px 0 0;padding:11px 12px;border-left:3px solid #b889ff;background:rgba(184,137,255,.1);font-size:12px;line-height:1.5;color:var(--text-secondary,#c8d2df)}',
            '@media(max-width:600px){.bp-agent-support-legend{top:6px;right:6px;width:min(270px,calc(100% - 12px));padding:8px 10px;font-size:11px}.bp-agent-support-legend strong{font-size:12px}.bp-agent-support-legend button{padding:5px 7px;font-size:11px}.bp-agent-support-dialog{align-items:flex-end;padding:8px}.bp-agent-support-dialog [data-part=panel]{max-height:86dvh;border-radius:15px;padding:17px}.bp-agent-support-dialog dl{grid-template-columns:92px 1fr;gap:8px 10px}}'
        ].join('');
        document.head.appendChild(style);
    }

    function removePrior() {
        if (current && current.destroy) current.destroy();
        current = null;
        var legend = document.getElementById(LEGEND_ID);
        var dialog = document.getElementById(DIALOG_ID);
        if (legend) legend.remove();
        if (dialog) dialog.remove();
    }

    function el(tag, className, text) {
        var item = document.createElement(tag);
        if (className) item.className = className;
        if (text != null) item.textContent = text;
        return item;
    }

    function getDatum(selection) {
        if (!selection) return [];
        var result = [];
        if (typeof selection.each === 'function') {
            selection.each(function (datum) { result.push({ element: this, datum: datum }); });
        } else if (typeof selection.nodes === 'function') {
            selection.nodes().forEach(function (element) {
                result.push({ element: element, datum: global.d3 && global.d3.select ? global.d3.select(element).datum() : null });
            });
        }
        return result;
    }

    function nodeElement(nodeGroup) {
        if (!nodeGroup) return null;
        if (nodeGroup.matches && nodeGroup.matches('circle')) return nodeGroup;
        return nodeGroup.querySelector ? nodeGroup.querySelector('circle') : null;
    }

    function render(options) {
        options = options || {};
        removePrior();
        if (!global.document) return;
        ensureStyles();
        var svgSelection = options.svg;
        var svgElement = svgSelection && typeof svgSelection.node === 'function' ? svgSelection.node() : svgSelection;
        var anchor = document.getElementById('networkView');
        var container = anchor && anchor.parentElement;
        var changedContainerPosition = false;
        var priorContainerPosition = '';
        if (container && global.getComputedStyle(container).position === 'static') {
            priorContainerPosition = container.style.position;
            container.style.position = 'relative';
            changedContainerPosition = true;
        }

        var state = options.status || 'idle';
        if (['idle', 'loading', 'ready', 'error'].indexOf(state) < 0) state = 'idle';
        var blueprints = Array.isArray(options.blueprints) ? options.blueprints : [];
        var entries = indexSupport(blueprints, getDatum(options.node).map(function (entry) {
            return entry.datum && entry.datum.type === 'skill' ? { name: entry.datum.name } : null;
        }).filter(Boolean));
        var supportedNames = new Set(entries.keys());
        var records = getDatum(options.node);
        var listeners = [];
        var linkedEdges = [];
        var edgeObservers = [];
        var originalTransforms = [];

        var legend = el('section', 'bp-agent-support-legend');
        legend.id = LEGEND_ID;
        legend.dataset.component = 'agent-support-map-legend';
        legend.dataset.state = state;
        legend.setAttribute('aria-label', 'Agent support map legend');
        var head = el('div');
        head.dataset.part = 'header';
        head.appendChild(el('strong', '', 'Agent support'));
        if (state === 'idle' || state === 'error') {
            var loadButton = el('button', '', state === 'error' ? 'Retry loading' : 'Load saved Work Blueprints');
            loadButton.type = 'button';
            loadButton.dataset.action = state === 'error' ? 'retry' : 'load';
            loadButton.addEventListener('click', function () {
                if (typeof options.onLoad === 'function') options.onLoad();
            });
            head.appendChild(loadButton);
        } else if (state === 'ready') {
            var refreshButton = el('button', '', 'Refresh');
            refreshButton.type = 'button';
            refreshButton.dataset.action = 'refresh';
            refreshButton.addEventListener('click', function () {
                if (typeof options.onRefresh === 'function') options.onRefresh();
            });
            head.appendChild(refreshButton);
        } else {
            head.appendChild(el('span', '', 'Loading…'));
        }
        legend.appendChild(head);
        var message = state === 'loading'
            ? 'Checking saved task-level capability links.'
            : state === 'error'
                ? 'Saved Blueprints could not be loaded. Try again.'
                : state === 'ready' && supportedNames.size
                    ? 'Dashed rings mark explicit capability links to your skills.'
                    : state === 'ready'
                        ? 'No linked support found. Saved Blueprints may not yet have linked capabilities.'
                        : 'Saved Blueprints may not yet have linked capabilities. Load them to check.';
        var copy = el('p', '', message);
        copy.dataset.part = 'status';
        legend.appendChild(copy);
        var key = el('div', 'bp-agent-support-key');
        var swatch = el('span');
        swatch.setAttribute('aria-hidden', 'true');
        key.appendChild(swatch);
        key.appendChild(el('div', '', 'Dashed ring / edge + AI: required support'));
        legend.appendChild(key);
        legend.appendChild(el('p', '', 'Skill color and size still describe you. Select AI to inspect tasks.'));
        var caveat = el('p', '', 'Requirements do not prove an agent is available or verified.');
        caveat.dataset.part = 'caveat';
        legend.appendChild(caveat);
        if (container) container.appendChild(legend);

        var overlayLayer = null;
        var edgeLayer = null;
        if (state === 'ready' && supportedNames.size && svgElement && svgElement.namespaceURI === 'http://www.w3.org/2000/svg') {
            var svgDoc = svgElement.ownerDocument;
            overlayLayer = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
            overlayLayer.setAttribute('class', 'bp-agent-support-overlays');
            overlayLayer.setAttribute('data-component', 'agent-support-overlays');
            overlayLayer.setAttribute('pointer-events', 'none');
            var nodeParent = records.length ? records[0].element.parentNode : svgElement;
            (nodeParent || svgElement).appendChild(overlayLayer);

            records.forEach(function (record) {
                var d = record.datum;
                if (!d || d.type !== 'skill' || !supportedNames.has(normalize(d.name))) return;
                var circle = nodeElement(record.element);
                if (!circle) return;
                var skillEntries = entries.get(normalize(d.name)) || [];
                var group = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.setAttribute('class', 'bp-agent-support-decoration');
                group.setAttribute('data-skill', d.name);
                var ring = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
                ring.setAttribute('class', 'bp-agent-support-ring');
                var radius = parseFloat(circle.getAttribute('r')) || 8;
                ring.setAttribute('r', String(radius + 5));
                group.appendChild(ring);
                var markerGroup = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
                markerGroup.setAttribute('class', 'bp-agent-support-marker');
                markerGroup.setAttribute('data-action', 'open-support');
                markerGroup.setAttribute('data-skill', d.name);
                markerGroup.setAttribute('role', 'button');
                markerGroup.setAttribute('tabindex', '0');
                markerGroup.setAttribute('aria-label', 'View agent capability links for ' + d.name);
                markerGroup.setAttribute('pointer-events', 'all');
                markerGroup.setAttribute('transform', 'translate(' + (radius + 2) + ',' + (-radius - 2) + ')');
                var hitArea = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'rect');
                hitArea.setAttribute('x', '-14');
                hitArea.setAttribute('y', '-14');
                hitArea.setAttribute('width', '28');
                hitArea.setAttribute('height', '28');
                hitArea.setAttribute('fill', 'transparent');
                markerGroup.appendChild(hitArea);
                var marker = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
                marker.setAttribute('r', '8');
                markerGroup.appendChild(marker);
                var label = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('y', '.4');
                label.textContent = 'AI';
                label.style.fontSize = '7px';
                markerGroup.appendChild(label);
                group.appendChild(markerGroup);
                var transform = record.element.getAttribute('transform');
                if (transform) group.setAttribute('transform', transform);
                overlayLayer.appendChild(group);
                var open = function (event) {
                    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.stopPropagation();
                    showDialog(d, skillEntries, markerGroup);
                };
                markerGroup.addEventListener('click', open);
                markerGroup.addEventListener('keydown', open);
                listeners.push({ node: markerGroup, open: open });
            });

            edgeLayer = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'g');
            edgeLayer.setAttribute('class', 'bp-agent-support-edge-layer');
            edgeLayer.setAttribute('data-component', 'agent-support-edges');
            edgeLayer.setAttribute('pointer-events', 'none');
            var linkRecords = getDatum(options.link);
            linkRecords.forEach(function (record) {
                var datum = record.datum || {};
                var source = datum.source && typeof datum.source === 'object' ? datum.source : null;
                var target = datum.target && typeof datum.target === 'object' ? datum.target : null;
                var skill = source && source.type === 'skill' ? source : target && target.type === 'skill' ? target : null;
                if (!skill || !supportedNames.has(normalize(skill.name))) return;
                var original = record.element;
                if (!original || !original.ownerSVGElement) return;
                var accent = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'line');
                accent.setAttribute('class', 'bp-agent-support-edge');
                accent.setAttribute('data-skill', skill.name);
                ['x1', 'y1', 'x2', 'y2'].forEach(function (name) {
                    var value = original.getAttribute(name);
                    if (value != null) accent.setAttribute(name, value);
                });
                edgeLayer.appendChild(accent);
                linkedEdges.push({ original: original, accent: accent });
                var edgeObserver = new MutationObserver(function () {
                    ['x1', 'y1', 'x2', 'y2'].forEach(function (name) {
                        var value = original.getAttribute(name);
                        if (value != null) accent.setAttribute(name, value);
                    });
                });
                edgeObserver.observe(original, { attributes: true, attributeFilter: ['x1', 'y1', 'x2', 'y2'] });
                edgeObservers.push(edgeObserver);
            });
            var linkParent = linkRecords.length ? linkRecords[0].element.parentNode : svgElement;
            (linkParent || svgElement).appendChild(edgeLayer);
        }

        var dialog = el('div', 'bp-agent-support-dialog');
        dialog.id = DIALOG_ID;
        dialog.dataset.component = 'agent-support-dialog';
        dialog.setAttribute('role', 'presentation');
        dialog.hidden = true;
        var panel = el('div');
        panel.dataset.part = 'panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-labelledby', 'bp-agent-support-title');
        var top = el('div');
        top.dataset.part = 'top';
        var titleWrap = el('div');
        titleWrap.appendChild(el('div', '', 'Human + agent work model'));
        titleWrap.firstChild.dataset.part = 'eyebrow';
        var title = el('h2', '', 'Capability support');
        title.id = 'bp-agent-support-title';
        titleWrap.appendChild(title);
        top.appendChild(titleWrap);
        var closeButton = el('button', '', '×');
        closeButton.type = 'button';
        closeButton.dataset.part = 'close';
        closeButton.setAttribute('aria-label', 'Close details');
        top.appendChild(closeButton);
        panel.appendChild(top);
        var body = el('div');
        body.dataset.part = 'details';
        panel.appendChild(body);
        var notice = el('p', '', 'A required capability does not establish that an agent is available or verified, and it does not change your human skill proficiency.');
        notice.dataset.part = 'notice';
        panel.appendChild(notice);
        dialog.appendChild(panel);
        document.body.appendChild(dialog);

        var previousFocus = null;
        var activeMarker = null;
        var openDialog = false;
        function showDialog(skill, skillEntries, marker) {
            activeMarker = marker;
            previousFocus = document.activeElement;
            body.replaceChildren();
            title.textContent = skill.name + ' support';
            var list = document.createElement('div');
            skillEntries.forEach(function (entry) {
                var dl = document.createElement('dl');
                var blueprint = entry.blueprint || {};
                var task = entry.task || {};
                var capability = entry.capability || {};
                var rows = [
                    ['Human skill', skill.name],
                    ['Proficiency', asText(skill.level) || 'Not specified'],
                    ['Work Blueprint', asText(blueprint.title) || 'Untitled Blueprint'],
                    ['Task', asText(task.task) || 'Not specified'],
                    ['Outcome', asText(task.outcome) || 'Not specified'],
                    ['Owner', asText(task.owner) || 'Not specified'],
                    ['Agent capability', asText(capability.name) || 'Not specified'],
                    ['Required proficiency', asText(capability.proficiency) || 'Not specified'],
                    ['Human review', asText(task.humanReview) || 'Not specified']
                ];
                rows.forEach(function (row) {
                    var dt = document.createElement('dt');
                    dt.textContent = row[0];
                    var dd = document.createElement('dd');
                    dd.textContent = row[1];
                    dl.appendChild(dt);
                    dl.appendChild(dd);
                });
                list.appendChild(dl);
            });
            body.appendChild(list);
            dialog.hidden = false;
            openDialog = true;
            closeButton.focus();
        }

        function closeDialog() {
            if (!openDialog) return;
            dialog.hidden = true;
            openDialog = false;
            if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
            else if (activeMarker && document.contains(activeMarker)) activeMarker.focus();
        }
        function onBackdrop(event) {
            if (event.target === dialog) closeDialog();
        }
        function onKeys(event) {
            if (!openDialog) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDialog();
            } else if (event.key === 'Tab') {
                event.preventDefault();
                closeButton.focus();
            }
        }
        closeButton.addEventListener('click', closeDialog);
        dialog.addEventListener('click', onBackdrop);
        document.addEventListener('keydown', onKeys);

        if (overlayLayer) {
            records.forEach(function (record) {
                if (record.datum && record.datum.type === 'skill' && supportedNames.has(normalize(record.datum.name))) {
                    var decoration = Array.prototype.find.call(overlayLayer.children, function (candidate) {
                        return candidate.getAttribute('data-skill') === record.datum.name;
                    });
                    if (decoration) {
                        var observer = new MutationObserver(function () {
                            var transform = record.element.getAttribute('transform');
                            if (transform) decoration.setAttribute('transform', transform);
                        });
                        observer.observe(record.element, { attributes: true, attributeFilter: ['transform'] });
                        originalTransforms.push(observer);
                    }
                }
            });
        }
        current = {
            destroy: function () {
                closeDialog();
                closeButton.removeEventListener('click', closeDialog);
                dialog.removeEventListener('click', onBackdrop);
                document.removeEventListener('keydown', onKeys);
                listeners.forEach(function (item) {
                    item.node.removeEventListener('click', item.open);
                    item.node.removeEventListener('keydown', item.open);
                });
                originalTransforms.forEach(function (observer) { observer.disconnect(); });
                edgeObservers.forEach(function (observer) { observer.disconnect(); });
                if (overlayLayer && overlayLayer.parentNode) overlayLayer.remove();
                if (edgeLayer && edgeLayer.parentNode) edgeLayer.remove();
                linkedEdges.length = 0;
                if (dialog.parentNode) dialog.remove();
                if (legend.parentNode) legend.remove();
                if (changedContainerPosition && container && container.style.position === 'relative') {
                    container.style.position = priorContainerPosition;
                }
            }
        };
    }

    var api = {
        render: render,
        clear: removePrior,
        indexSupport: indexSupport
    };
    global.bpAgentSupportMap = api;
})(window);
