// views/network.js — Blueprint v4.46.21
// Phase 7c extraction — D3 network visualization

import { bpIcon }     from '../ui/icons.js';
import { escapeHtml } from '../core/security.js';
import { showToast }  from '../ui/toast.js';
import { _sd, _bd, waitForUserData } from '../core/data-helpers.js';

// ─── Module-level state (was closure-scoped in monolith) ─────────────────────
let currentView = 'network';
let activeRole = 'all';
let activeLevel = null;
let simulation;
let networkMatchMode = 'you';
let activeJobForNetwork = null;

// ===== NETWORK JOB SELECTOR WIDGET =====
var jobSelectorExpanded = false;

export function toggleJobSelector() {
    jobSelectorExpanded = !jobSelectorExpanded;
    renderJobSelectorWidget();
}
export function renderJobSelectorWidget() {
    // Clean up any old elements
    var oldFloat = document.getElementById('networkJobSelector');
    if (oldFloat) oldFloat.remove();
    var oldDrop = document.getElementById('jobSelectorDropdown');
    if (oldDrop) oldDrop.remove();
    
    var container = document.getElementById('inlineJobSelector');
    if (!container) return;
    
    var jobs = window._userData.savedJobs || [];
    if (jobs.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    // Only show when skills tab is active
    var networkSvg = document.getElementById('networkView');
    var isNetworkVisible = networkSvg && networkSvg.style.display !== 'none';
    var cardView = document.getElementById('cardView');
    var isCardVisible = cardView && cardView.style.display !== 'none';
    if (!isNetworkVisible && !isCardVisible) {
        container.style.display = 'none';
        return;
    }
    
    container.style.cssText = 'display:inline-flex; align-items:center; margin-left:8px;';
    
    // Render pill button
    var activeLabel = activeJobForNetwork ? escapeHtml(activeJobForNetwork.title || 'Job').substring(0, 18) + '...' : '';
    var hasActive = !!activeJobForNetwork;
    container.innerHTML = '<button id="jobSelectorPill" style="'
        + 'display:inline-flex; align-items:center; gap:6px; padding:6px 14px; '
        + 'background:' + (hasActive ? 'var(--accent)' : 'var(--c-surface-2)') + '; '
        + 'border:1px solid ' + (hasActive ? 'var(--accent)' : 'var(--border)') + '; border-radius:20px; '
        + 'color:' + (hasActive ? '#fff' : 'var(--text-secondary)') + '; cursor:pointer; '
        + 'font-size:0.78em; font-weight:600; font-family:Outfit,sans-serif; '
        + 'white-space:nowrap; transition:all 0.2s;">'
        + bpIcon('target', 12) + ' '
        + (hasActive ? activeLabel : jobs.length + ' Job' + (jobs.length !== 1 ? 's' : ''))
        + '</button>';
    
    container.querySelector('#jobSelectorPill').addEventListener('click', function(e) {
        e.stopPropagation();
        toggleJobSelector();
    });
    
    // Expanded: render dropdown as fixed-position overlay on body
    if (jobSelectorExpanded) {
        var pill = container.querySelector('#jobSelectorPill');
        var rect = pill.getBoundingClientRect();
        
        var drop = document.createElement('div');
        drop.id = 'jobSelectorDropdown';
        var dropLeft = rect.left;
        var dropWidth = Math.min(360, window.innerWidth - 16);
        if (dropLeft + dropWidth > window.innerWidth - 8) {
            dropLeft = Math.max(8, window.innerWidth - dropWidth - 8);
        }
        drop.style.cssText = 'position:fixed; top:' + (rect.bottom + 6) + 'px; left:' + dropLeft + 'px; '
            + 'background:var(--bg-elevated); border:1px solid var(--border); border-radius:12px; '
            + 'box-shadow:0 8px 40px rgba(0,0,0,0.4); width:' + dropWidth + 'px; overflow:hidden; '
            + 'z-index:9999; font-family:Outfit,sans-serif;';
        
        var html = '';
        // Header
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid var(--border);">'
            + '<span style="font-weight:700; font-size:0.85em; color:var(--text-primary);">Compare to Job</span>'
            + '<span id="jobDropClose" style="color:var(--text-muted); cursor:pointer; font-size:1.2em; padding:2px 6px; user-select:none;">&times;</span></div>';
        
        // List
        html += '<div style="max-height:260px; overflow-y:auto; padding:4px 0;">';
        
        if (activeJobForNetwork) {
            html += '<div class="jsel-row" data-act="clear" style="display:flex; align-items:center; gap:10px; padding:9px 14px; cursor:pointer;">'
                + '<span style="width:7px; height:7px; border-radius:50%; background:var(--text-muted); flex-shrink:0;"></span>'
                + '<span style="font-size:0.8em; color:var(--text-muted);">Clear overlay</span></div>';
        }
        
        jobs.forEach(function(job, idx) {
            var isSel = activeJobForNetwork && activeJobForNetwork.id === job.id;
            var score = job.matchData ? job.matchData.score : 0;
            var sColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#6b7280';
            html += '<div class="jsel-row" data-act="pick" data-idx="' + idx + '" style="'
                + 'display:flex; align-items:center; gap:10px; padding:9px 14px; cursor:pointer; '
                + 'background:' + (isSel ? 'rgba(96,165,250,0.12)' : 'transparent') + ';">'
                + '<span style="width:7px; height:7px; border-radius:50%; background:' + (isSel ? 'var(--accent)' : sColor) + '; flex-shrink:0;"></span>'
                + '<div style="min-width:0; flex:1;">'
                + '<div style="font-size:0.8em; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(job.title || '') + '</div>'
                + '<div style="font-size:0.7em; color:var(--text-muted);">' + escapeHtml(job.company || '') + '</div>'
                + '</div>'
                + '<span style="font-size:0.75em; font-weight:700; color:' + sColor + ';">' + score + '%</span>'
                + '</div>';
        });
        html += '</div>';
        
        drop.innerHTML = html;
        document.body.appendChild(drop);
        
        // Event listeners (addEventListener, not inline onclick)
        drop.querySelector('#jobDropClose').addEventListener('click', function(e) {
            e.stopPropagation();
            jobSelectorExpanded = false;
            renderJobSelectorWidget();
        });
        
        drop.querySelectorAll('.jsel-row').forEach(function(row) {
            row.addEventListener('mouseenter', function() { this.style.background = 'var(--c-surface-2)'; });
            row.addEventListener('mouseleave', function() {
                var idx = this.dataset.idx;
                var isSel = idx && activeJobForNetwork && activeJobForNetwork.id === ((window._userData.savedJobs || [])[idx] || {}).id;
                this.style.background = isSel ? 'rgba(96,165,250,0.12)' : 'transparent';
            });
            row.addEventListener('click', function(e) {
                e.stopPropagation();
                if (this.dataset.act === 'clear') {
                    clearJobOverlay();
                } else if (this.dataset.act === 'pick') {
                    activateJobOverlay(parseInt(this.dataset.idx));
                }
                jobSelectorExpanded = false;
                renderJobSelectorWidget();
            });
        });
        
        // Close on outside click
        setTimeout(function() {
            function dismissDropdown(e) {
                var d = document.getElementById('jobSelectorDropdown');
                var p = document.getElementById('jobSelectorPill');
                if (!d) {
                    document.removeEventListener('click', dismissDropdown, true);
                    return;
                }
                if (!d.contains(e.target) && (!p || !p.contains(e.target))) {
                    jobSelectorExpanded = false;
                    renderJobSelectorWidget();
                    document.removeEventListener('click', dismissDropdown, true);
                }
            }
            document.addEventListener('click', dismissDropdown, true);
        }, 50);
    }
}
export function networkLabelLines(name, maxChars) {
    if (!name) return [''];
    if (name.length <= maxChars) return [name];
    var words = name.split(' ');
    var lines = [];
    var cur = '';
    for (var i = 0; i < words.length; i++) {
        var test = cur ? cur + ' ' + words[i] : words[i];
        if (test.length > maxChars && cur.length > 0) {
            if (lines.length >= 1) {
                cur = cur.length > maxChars ? cur.substring(0, maxChars - 1) + '\u2026' : cur;
                lines.push(cur);
                return lines;
            }
            lines.push(cur);
            cur = words[i];
        } else {
            cur = test;
        }
    }
    if (cur) {
        if (lines.length >= 1 && cur.length > maxChars) {
            cur = cur.substring(0, maxChars - 1) + '\u2026';
        }
        lines.push(cur);
    }
    if (lines.length > 2) {
        lines = lines.slice(0, 2);
        var last = lines[1];
        if (last.length > maxChars - 1) last = last.substring(0, maxChars - 1);
        lines[1] = last + '\u2026';
    }
    return lines;
}

// Network label visibility state
var networkShowRoleLabels = true;
var networkShowSkillLabels = true;

var networkShowValueLabels = true;
export function toggleNetworkLabels(type) {
    var svg = d3.select('#networkView');
    if (!svg.node()) return;
    if (type === 'roles') {
        networkShowRoleLabels = !networkShowRoleLabels;
        svg.selectAll('text').filter(function(d) { return d && d.type === 'role'; })
            .style('display', networkShowRoleLabels ? 'block' : 'none');
        var btn = document.getElementById('labelPillRole');
        if (btn) btn.classList.toggle('active', networkShowRoleLabels);
    } else if (type === 'skills') {
        networkShowSkillLabels = !networkShowSkillLabels;
        svg.selectAll('text').filter(function(d) { return d && d.type === 'skill'; })
            .style('display', networkShowSkillLabels ? 'block' : 'none');
        var btn2 = document.getElementById('labelPillSkill');
        if (btn2) btn2.classList.toggle('active', networkShowSkillLabels);
    } else if (type === 'values') {
        networkShowValueLabels = !networkShowValueLabels;
        svg.selectAll('text').filter(function(d) { return d && d.type === 'value'; })
            .style('display', networkShowValueLabels ? 'block' : 'none');
        var btn3 = document.getElementById('labelPillValue');
        if (btn3) btn3.classList.toggle('active', networkShowValueLabels);
    }
}
export async function initNetwork() {
    if (!window._userData || !window._userData.initialized) {
        await waitForUserData();
    }
    // Empty state: no skills and signed in (not viewing a sample)
    var hasSkills = _sd().skills && _sd().skills.length > 0;
    var hasRoles = _sd().roles && _sd().roles.length > 0;
    if (!hasSkills && !hasRoles && fbUser && !window.isReadOnlyProfile) {
        var nv = document.getElementById('networkView');
        if (nv) {
            nv.setAttribute('width', window.innerWidth);
            nv.setAttribute('height', Math.max(300, window.innerHeight - 100));
            d3.select('#networkView').selectAll('*').remove();
            var fo = d3.select('#networkView').append('foreignObject')
                .attr('x', 0).attr('y', 0)
                .attr('width', window.innerWidth)
                .attr('height', Math.max(300, window.innerHeight - 100));
            fo.append('xhtml:div')
                .style('display', 'flex')
                .style('flex-direction', 'column')
                .style('align-items', 'center')
                .style('justify-content', 'center')
                .style('height', '100%')
                .style('text-align', 'center')
                .style('padding', '40px')
                .html(
                    '<div style="font-size:3em; margin-bottom:20px; opacity:0.3;">🎯</div>'
                    + '<div style="font-family:Outfit,sans-serif; font-size:1.4em; font-weight:700; color:var(--text-primary); margin-bottom:12px; letter-spacing:0.04em;">Build Your Blueprint</div>'
                    + '<div style="font-size:0.95em; color:var(--text-muted); max-width:420px; margin-bottom:28px; line-height:1.6;">'
                    + 'Your career intelligence profile is empty. Add your skills, roles, and experience to unlock the full power of Blueprint.'
                    + '</div>'
                    + '<div style="display:flex; gap:12px; flex-wrap:wrap; justify-content:center;">'
                    + '<button onclick="showOnboardingWizard();" '
                    + 'style="padding:12px 24px; background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em;">'
                    + '+ Add Skills Manually</button>'
                    + '<button onclick="showOnboardingWizard();" '
                    + 'style="padding:12px 24px; background:transparent; color:var(--accent); border:2px solid var(--accent); border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em;">'
                    + 'Go to Blueprint</button>'
                    + '</div>'
                );
        }
        return;
    }
    
    // Safety: ensure roles are normalized before building D3 graph
    if (typeof normalizeUserRoles === 'function') normalizeUserRoles();
    const width = window.innerWidth;
    const isMobile = width <= 768;
    // Height: subtract navbar + controls (no page header on desktop)
    var heightOffset = 100; // desktop: navbar(52) + controls(48)
    if (isMobile) {
        heightOffset = 52 + 48 + 60; // header + controls + bottom nav
        if (document.getElementById('readonlyBanner')?.style.display !== 'none') heightOffset += 44;
        if (document.getElementById('matchModeToggle')?.style.display !== 'none') heightOffset += 40;
    }
    const height = Math.max(300, window.innerHeight - heightOffset);
    
    // Scale factor — makes network fill viewport proportionally
    var scaleFactor = Math.min(width, height) / 900;
    scaleFactor = Math.max(0.8, Math.min(scaleFactor, 1.6));
    
    const svg = d3.select("#networkView")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("*").remove();

    // Create nodes
    // Center node stays with the network body; text label offsets left for readability
    var networkCenterX = isMobile ? width * 0.45 : width / 2;
    var centerY = Math.max(80, height * 0.22);
    var nameX = isMobile ? width * 0.72 : Math.max(width * 0.22, 180);
    var nameY = centerY;
    var centerName = window._userData.profile.name || "You";
    var maxNameLen = isMobile ? 18 : 24;
    if (centerName.length > maxNameLen) {
        // Try first name only
        var firstName = centerName.split(' ')[0];
        if (firstName.length <= maxNameLen) {
            centerName = firstName;
        } else {
            centerName = centerName.substring(0, maxNameLen - 1) + '\u2026';
        }
    }
    const nodes = [
        { id: "center", name: centerName, type: "center", homeX: nameX, homeY: nameY, x: nameX, y: nameY, fx: nameX, fy: nameY }
    ];

    // Add role nodes — orbit around network center, not the name node
    var visibleRoles = getVisibleRoles();
    visibleRoles.forEach((role, i) => {
        const angle = (i / visibleRoles.length) * 2 * Math.PI;
        const radius = (isMobile ? 130 : 200) * scaleFactor;
        var roleId = role.id || role.name;
        nodes.push({
            id: roleId,
            name: role.name,
            type: "role",
            color: role.color,
            x: networkCenterX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
        });
    });

    // Add skill nodes — on mobile, only key/top skills to reduce clutter
    // On all devices, only show skills connected to at least one visible role
    var visibleRoleIds = new Set();
    visibleRoles.forEach(function(r) { visibleRoleIds.add(r.id || r.name); visibleRoleIds.add(r.name); });
    var connectedSkills = _sd().skills.filter(function(s) {
        return (s.roles || []).some(function(rid) { return visibleRoleIds.has(rid); });
    });
    var skillsToShow = connectedSkills;
    if (isMobile) {
        var levelPri = { 'mastery': 5, 'expert': 4, 'advanced': 3, 'proficient': 2, 'novice': 1 };
        var keySkills = connectedSkills.filter(function(s) { return s.key; });
        var topLevelSkills = connectedSkills.filter(function(s) {
            var lvl = String(s.level || '').toLowerCase();
            return lvl === 'mastery' || lvl === 'expert';
        });
        // Merge key + top-level, deduplicate, cap at 30
        var seen = new Set();
        skillsToShow = [];
        keySkills.concat(topLevelSkills).forEach(function(s) {
            if (!seen.has(s.name) && skillsToShow.length < 30) {
                seen.add(s.name);
                skillsToShow.push(s);
            }
        });
        // If still under 30, backfill with Advanced
        if (skillsToShow.length < 30) {
            connectedSkills.filter(function(s) { return String(s.level || '').toLowerCase() === 'advanced' && !seen.has(s.name); })
                .slice(0, 30 - skillsToShow.length)
                .forEach(function(s) { skillsToShow.push(s); seen.add(s.name); });
        }
        // If still under 30, backfill with Proficient
        if (skillsToShow.length < 30) {
            connectedSkills.filter(function(s) { return String(s.level || '').toLowerCase() === 'proficient' && !seen.has(s.name); })
                .slice(0, 30 - skillsToShow.length)
                .forEach(function(s) { skillsToShow.push(s); seen.add(s.name); });
        }
        // FALLBACK: if level-based filters found nothing, take any skills sorted by level priority
        if (skillsToShow.length === 0 && connectedSkills.length > 0) {
            var sorted = connectedSkills.slice().sort(function(a, b) {
                return (levelPri[String(b.level || '').toLowerCase()] || 0) - (levelPri[String(a.level || '').toLowerCase()] || 0);
            });
            sorted.slice(0, 30).forEach(function(s) { skillsToShow.push(s); });
        }
    }

    skillsToShow.forEach((skill, i) => {
        nodes.push({
            id: `skill-${i}`,
            name: skill.name,
            type: "skill",
            level: skill.level,
            roles: skill.roles,
            key: skill.key
        });
    });

    // Create links
    const links = [];
    
    // Center to roles
    visibleRoles.forEach(role => {
        links.push({ source: "center", target: role.id || role.name, type: "role" });
    });

    // Build set of valid role node IDs for link validation
    var validRoleIds = new Set();
    visibleRoles.forEach(role => { validRoleIds.add(role.id || role.name); });

    // Roles to skills — with fallback for profiles where skills lack role assignments
    var roleIds = Array.from(validRoleIds);
    var unlinkedCount = 0;
    skillsToShow.forEach((skill, i) => {
        if (skill.roles && skill.roles.length > 0) {
            skill.roles.forEach(roleRef => {
                var targetRole = roleRef;
                if (!validRoleIds.has(targetRole)) {
                    var match = visibleRoles.find(r => r.name === roleRef || r.id === roleRef);
                    if (match) targetRole = match.id || match.name;
                    else return; // role is hidden or doesn't exist — skip link
                }
                links.push({ 
                    source: targetRole, 
                    target: `skill-${i}`,
                    type: "skill"
                });
            });
        } else if (roleIds.length > 0) {
            // Skill has no role assignment — distribute round-robin across roles
            var assignedRole = roleIds[unlinkedCount % roleIds.length];
            links.push({
                source: assignedRole,
                target: `skill-${i}`,
                type: "skill"
            });
            unlinkedCount++;
        }
    });

    // Create simulation with viewport-scaled forces
    var linkDist = isMobile ? [120, 105] : [140 * scaleFactor, 160 * scaleFactor];
    var chargeStr = isMobile ? [-300, -140] : [-250 * scaleFactor, -180 * scaleFactor];
    var collisionR = isMobile ? [55, 48, 30] : [70 * scaleFactor, 65 * scaleFactor, 45 * scaleFactor];
    var gravityCenter = isMobile ? height * 0.46 : height * 0.48;
    
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(d => {
            if (d.type === "role") return linkDist[0];
            return linkDist[1];
        }))
        .force("charge", d3.forceManyBody().strength(d => {
            if (d.type === "center") return 0;
            if (d.type === "role") return chargeStr[0];
            return chargeStr[1];
        }))
        .force("center", d3.forceCenter(networkCenterX, gravityCenter))
        .force("collision", d3.forceCollide().radius(d => {
            if (d.type === "center") return collisionR[0];
            if (d.type === "role") return collisionR[1];
            return collisionR[2];
        }))
        .force("x", d3.forceX(networkCenterX).strength(isMobile ? 0.08 : 0.06))
        .force("y", d3.forceY(gravityCenter).strength(isMobile ? 0.08 : 0.08))
        .force("radial", d3.forceRadial(d => {
            if (d.type === "skill") return Math.min(width, height) * (isMobile ? 0.32 : 0.4) * scaleFactor;
            return 0;
        }).strength(isMobile ? 0.08 : 0.1));

    // Draw links
    const link = svg.append("g").attr("class", "link-layer")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("class", "link");

    // Draw nodes
    const node = svg.append("g").attr("class", "node-layer")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("class", d => `node ${d.type}`)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("circle")
        .attr("r", d => {
            if (d.type === "center") return isMobile ? 30 : Math.round(40 * scaleFactor);
            if (d.type === "role") return isMobile ? 24 : Math.round(30 * scaleFactor);
            var base = d.key ? 12 : 8;
            return isMobile ? (d.key ? 14 : 10) : Math.round(base * scaleFactor);
        })
        .attr("fill", d => {
            if (d.type === "center") return "#60a5fa";
            if (d.type === "role") return d.color;
            return levelColors[d.level] || '#6b7280';
        })
        .style("cursor", d => d.type === "center" ? "pointer" : "grab")
        .on("click", (event, d) => {
            if (d.type === "center") {
                // Center node click resets layout and filters
                resetNetworkLayout();
                filterByRole('all');
            } else if (d.type === "role") {
                // Toggle: click active role again to reset
                if (activeRole === d.id) {
                    filterByRole('all');
                } else {
                    filterByRole(d.id);
                }
            } else if (d.type === "skill") {
                event.stopPropagation();
                // Look up full skill object from skillsData instead of using node data
                const fullSkill = _sd().skills.find(s => s.name === d.name);
                if (fullSkill) {
                    openSkillModal(d.name, fullSkill);
                } else {
                    console.error('Skill not found in skillsData:', d.name);
                }
            }
        })
        .on("mouseover", (event, d) => showTooltip(event, d))
        .on("mouseout", hideTooltip);

    node.append("text")
        .each(function(d) {
            var el = d3.select(this);
            var maxC = d.type === 'center' ? 25 : d.type === 'role' ? (isMobile ? 16 : 22) : (isMobile ? 12 : 15);
            var lines = networkLabelLines(d.name, maxC);
            if (d.type === 'center') {
                var r = isMobile ? 30 : Math.round(40 * scaleFactor);
                el.attr('text-anchor', 'end');
                lines.forEach(function(ln, i) { el.append('tspan').text(ln).attr('x', -(r + 8)).attr('dy', i === 0 ? 4 : 12); });
            } else if (d.type === 'role') {
                var roleBaseY = Math.round(-35 * scaleFactor);
                el.attr('text-anchor', 'middle');
                lines.forEach(function(ln, i) { el.append('tspan').text(ln).attr('x', 0).attr('dy', i === 0 ? roleBaseY - (lines.length - 1) * 5 : 11); });
            } else {
                el.attr('text-anchor', 'middle');
                lines.forEach(function(ln, i) { el.append('tspan').text(ln).attr('x', 0).attr('dy', i === 0 ? -19 - (lines.length - 1) * 5 : 10); });
            }
        });

    // Bring center and role nodes to front (SVG z-order = draw order)
    node.filter(d => d.type === 'role').raise();
    node.filter(d => d.type === 'center').raise();

    simulation.on("tick", () => {
        // Constrain nodes to viewport with padding
        const padding = isMobile ? 30 : 100;
        nodes.forEach(d => {
            if (d.type !== "center") {  // Don't constrain center node
                d.x = Math.max(padding, Math.min(width - padding, d.x));
                d.y = Math.max(padding, Math.min(height - padding, d.y));
            }
        });
        
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    window.networkData = { nodes, links, svg, link, node };
    setTimeout(applyLabelToggles, 100);
    
    // Labels always on (toggle removed in v4.27.3.3)
    if (isMobile) {
        
        // Add info badge only when skills are actually capped (more than 30 total)
        var existingBadge = document.getElementById('mobileNetworkBadge');
        if (existingBadge) existingBadge.remove();
        if (skillsToShow.length < _sd().skills.length && _sd().skills.length > 30) {
            var badge = document.createElement('div');
            badge.id = 'mobileNetworkBadge';
            badge.style.cssText = 'position:absolute; bottom:12px; left:50%; transform:translateX(-50%); '
                + 'background:rgba(30,64,175,0.8); color:#e0e0e0; font-size:0.72em; padding:5px 14px; '
                + 'border-radius:20px; backdrop-filter:blur(8px); pointer-events:none; z-index:10;';
            badge.textContent = 'Showing top ' + skillsToShow.length + ' of ' + _sd().skills.length + ' skills';
            var container = document.getElementById('networkView').parentElement;
            if (container) { container.style.position = 'relative'; container.appendChild(badge); }
        }
    }
    
    // Render job selector widget
    renderJobSelectorWidget();
}

// ===== NETWORK OVERLAY ENGINE (Phase 2) =====

export function activateJobOverlay(idx) {
    var job = (window._userData.savedJobs || [])[idx];
    if (!job) { showToast('Job not found.', 'error'); return; }
    
    // Ensure companyValues is computed (jobs from older versions may lack it)
    if (!job.companyValues) job.companyValues = getCompanyValues(job.company, job.rawText || job.description || "");
    
    activeJobForNetwork = job;
    networkMatchMode = 'match'; // Start on the overlay view
    
    // Switch to network view if not already there
    currentSkillsView = 'network';
    switchView('network');
    
    // Show the toggle and badge
    updateMatchOverlayUI();
    
    // Render the match network
    setNetworkMatchMode('match');
    renderJobSelectorWidget();
}
export function activateValuesOverlay(idx) {
    var job = (window._userData.savedJobs || [])[idx];
    if (!job) { showToast('Job not found.', 'error'); return; }
    
    // Ensure companyValues is computed
    if (!job.companyValues) job.companyValues = getCompanyValues(job.company, job.rawText || job.description || "");
    
    activeJobForNetwork = job;
    networkMatchMode = 'values';
    
    currentSkillsView = 'network';
    switchView('network');
    
    updateMatchOverlayUI();
    setNetworkMatchMode('values');
}
export function clearJobOverlay() {
    activeJobForNetwork = null;
    networkMatchMode = 'you';
    
    // Hide toggle and badge
    var toggle = document.getElementById('matchModeToggle');
    var badge = document.getElementById('matchActiveBadge');
    if (toggle) toggle.style.display = 'none';
    if (badge) badge.style.display = 'none';
    
    // Remove legend and job info tile
    var legend = document.getElementById('matchLegend');
    if (legend) legend.remove();
    var valuesLegend = document.getElementById('valuesAlignmentPanel');
    if (valuesLegend) valuesLegend.remove();
    var jobTile = document.getElementById('jobInfoTile');
    if (jobTile) jobTile.remove();
    
    // Re-render normal network
    window.networkInitialized = false;
    initNetwork();
    window.networkInitialized = true;
    renderJobSelectorWidget();
}
export function updateMatchOverlayUI() {
    var toggle = document.getElementById('matchModeToggle');
    var badge = document.getElementById('matchActiveBadge');
    
    if (!activeJobForNetwork) {
        if (toggle) toggle.style.display = 'none';
        if (badge) badge.style.display = 'none';
        return;
    }
    
    if (toggle) toggle.style.display = 'inline-flex';
    // Badge hidden — replaced by job info tile in network canvas
    if (badge) badge.style.display = 'none';
    
    // Update active mode button
    document.querySelectorAll('.match-mode-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.mode === networkMatchMode);
    });
}

export function setNetworkMatchMode(mode) {
    networkMatchMode = mode;
    updateMatchOverlayUI();
    
    // Hide skills page header on overlay modes (job/match/values) and on mobile always
    var _sph = document.getElementById('skillsPageHeader');
    if (_sph) _sph.style.display = 'none';
    // Label toggles disabled — interactive nodes make them unnecessary
    // var nc = document.getElementById('networkControls');
    // if (nc) nc.style.display = '';
    
    // Show/hide Values pill based on mode
    var valPill = document.getElementById('labelPillValue');
    if (valPill) valPill.style.display = (mode === 'values') ? '' : 'none';
    // Show/hide Role+Skill pills (not relevant in values mode)
    var rolePill = document.getElementById('labelPillRole');
    var skillPill = document.getElementById('labelPillSkill');
    if (rolePill) rolePill.style.display = (mode === 'values') ? 'none' : '';
    if (skillPill) skillPill.style.display = (mode === 'values') ? 'none' : '';
    if (mode === 'values') {
        networkShowValueLabels = true;
        if (valPill) valPill.classList.add('active');
    } else {
        if (rolePill) rolePill.classList.toggle('active', networkShowRoleLabels);
        if (skillPill) skillPill.classList.toggle('active', networkShowSkillLabels);
    }
    
    // Remove any existing overlays
    var legend = document.getElementById('matchLegend');
    if (legend) legend.remove();
    var valuesLegend = document.getElementById('valuesAlignmentPanel');
    if (valuesLegend) valuesLegend.remove();
    var jobTile = document.getElementById('jobInfoTile');
    if (jobTile) jobTile.remove();
    // Hide role info card and tooltip when switching modes
    var ric = document.getElementById('roleInfoCard');
    if (ric) ric.style.display = 'none';
    hideTooltip();
    // Remove skills count badge — only relevant in 'you' mode
    var mnb = document.getElementById('mobileNetworkBadge');
    if (mnb) mnb.remove();
    
    if (mode === 'you') {
        // Standard network
        window.networkInitialized = false;
        initNetwork();
        window.networkInitialized = true;
    } else if (mode === 'job') {
        initJobNetwork(activeJobForNetwork);
    } else if (mode === 'match') {
        initMatchNetwork(activeJobForNetwork);
    } else if (mode === 'values') {
        initValuesNetwork(activeJobForNetwork);
    }
}
// ===== JOB-ONLY NETWORK =====

export function initJobNetwork(job) {
    var jobSkillsArr = getJobSkills(job);
    if (!job || !jobSkillsArr.length) return;
    
    var width = window.innerWidth;
    var height = window.innerHeight - 100;
    var isMobile = width <= 768;
    var scaleFactor = Math.min(width, height) / 900;
    scaleFactor = Math.max(0.8, Math.min(scaleFactor, 1.6));
    
    var svg = d3.select("#networkView")
        .attr("width", width)
        .attr("height", height);
    svg.selectAll("*").remove();
    if (simulation) simulation.stop();
    
    var centerX = isMobile ? width * 0.68 : width * 0.35;
    var centerY = isMobile ? height * 0.18 : height * 0.22;
    var maxTitleLen = isMobile ? 20 : 30;
    var truncTitle = (job.title || "Job").length > maxTitleLen ? (job.title || "Job").substring(0, maxTitleLen - 2) + '\u2026' : (job.title || "Job");
    var nodes = [
        { id: "center", name: truncTitle, type: "center", x: centerX, y: centerY, fx: centerX, fy: centerY, homeX: centerX, homeY: centerY }
    ];
    
    // Group job skills by category into roles
    var categoryMap = {};
    var roleColors = ['#3b82f6', '#fb923c', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#84cc16'];
    jobSkillsArr.forEach(function(s) {
        var cat = s.category || 'General';
        if (!categoryMap[cat]) categoryMap[cat] = [];
        categoryMap[cat].push(s);
    });
    
    var categories = Object.keys(categoryMap);
    categories.forEach(function(cat, i) {
        var angle = -Math.PI * 0.5 + (i / categories.length) * 2 * Math.PI;
        var radius = (isMobile ? 160 : 220) * scaleFactor;
        nodes.push({
            id: 'role-' + cat,
            name: cat,
            type: 'role',
            color: roleColors[i % roleColors.length],
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
        });
    });
    
    // Skill nodes
    var allSkills = [];
    categories.forEach(function(cat) {
        categoryMap[cat].forEach(function(s) { allSkills.push({ skill: s, cat: cat }); });
    });
    
    // Cap for mobile
    var skillsToRender = isMobile ? allSkills.slice(0, 25) : allSkills;
    
    skillsToRender.forEach(function(entry, i) {
        var isRequired = entry.skill.level === 'Required';
        nodes.push({
            id: 'jskill-' + i,
            name: entry.skill.name,
            type: 'skill',
            level: entry.skill.level,
            category: entry.cat,
            required: isRequired
        });
    });
    
    // Links
    var links = [];
    categories.forEach(function(cat) { links.push({ source: 'center', target: 'role-' + cat, type: 'role' }); });
    skillsToRender.forEach(function(entry, i) { links.push({ source: 'role-' + entry.cat, target: 'jskill-' + i, type: 'skill' }); });
    
    // Simulation — spacious layout
    var gravityCenter = isMobile ? height * 0.52 : height * 0.45;
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(function(d) { return d.id; }).distance(function(d) { return d.type === 'role' ? (isMobile ? 140 : 200 * scaleFactor) : (isMobile ? 120 : 160 * scaleFactor); }))
        .force("charge", d3.forceManyBody().strength(function(d) { return d.type === 'center' ? 0 : d.type === 'role' ? (isMobile ? -400 : -350) * scaleFactor : (isMobile ? -180 : -150) * scaleFactor; }))
        .force("collision", d3.forceCollide().radius(function(d) { return d.type === 'center' ? (isMobile ? 50 : 60) * scaleFactor : d.type === 'role' ? (isMobile ? 55 : 50) * scaleFactor : (isMobile ? 35 : 35) * scaleFactor; }))
        .force("x", d3.forceX(function(d) { return d.type === 'center' ? centerX : (isMobile ? width * 0.40 : width * 0.48); }).strength(function(d) { return d.type === 'center' ? 0 : (isMobile ? 0.03 : 0.04); }))
        .force("y", d3.forceY(gravityCenter).strength(isMobile ? 0.03 : 0.04));
    
    // Draw - links layer BELOW nodes layer
    var isLtC = document.documentElement.getAttribute('data-theme') === 'light';
    var linkLayer = svg.append("g").attr("class", "link-layer");
    var nodeLayer = svg.append("g").attr("class", "node-layer");
    var link = linkLayer.selectAll("line").data(links).join("line")
        .attr("class", "link")
        .style("stroke", isLtC ? 'rgba(100,116,139,0.25)' : undefined)
        .style("stroke-opacity", isLtC ? 1 : 0.2)
        .style("stroke-width", 1.5);
    
    var node = nodeLayer.selectAll("g").data(nodes).join("g")
        .attr("class", function(d) { return 'node ' + d.type; })
        .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));
    
    node.append("circle")
        .attr("r", function(d) {
            if (d.type === 'center') return isMobile ? 30 : Math.round(40 * scaleFactor);
            if (d.type === 'role') return isMobile ? 22 : Math.round(28 * scaleFactor);
            return d.required ? Math.round(13 * scaleFactor) : Math.round(10 * scaleFactor);
        })
        .attr("fill", function(d) {
            if (d.type === 'center') return '#f59e0b';
            if (d.type === 'role') return d.color;
            return d.required ? '#fb923c' : '#a78bfa';
        })
        .attr("stroke", function(d) { return d.required ? '#fff' : 'none'; })
        .attr("stroke-width", function(d) { return d.required ? 2 : 0; })
        .style("cursor", function(d) { return d.type === 'center' ? 'pointer' : 'grab'; })
        .on("click", function(event, d) {
            if (d.type === 'center') {
                resetNetworkLayout();
            }
        });
    
    node.append("text")
        .each(function(d) {
            var el = d3.select(this);
            var maxC = d.type === 'center' ? 25 : d.type === 'role' ? (isMobile ? 16 : 22) : (isMobile ? 12 : 15);
            var lines = networkLabelLines(d.name, maxC);
            if (d.type === 'center') {
                var r = isMobile ? 30 : Math.round(40 * scaleFactor);
                el.attr('text-anchor', 'end');
                lines.forEach(function(ln, i) { el.append('tspan').text(ln).attr('x', -(r + 8)).attr('dy', i === 0 ? 4 : 12); });
            } else {
                var baseY = d.type === 'role' ? -34 : -22;
                el.attr('text-anchor', 'middle');
                lines.forEach(function(ln, i) { el.append('tspan').text(ln).attr('x', 0).attr('dy', i === 0 ? baseY - (lines.length - 1) * 5 : 11); });
            }
        })
        .style("font-size", function(d) { return d.type === 'center' ? '14px' : d.type === 'role' ? '11px' : '9px'; });
    
    if (isMobile) node.selectAll('text').filter(function(d) { return d.type === 'skill'; }).classed('hidden', true);
    
    // Bring center and role nodes to front
    node.filter(function(d) { return d.type === 'role'; }).raise();
    node.filter(function(d) { return d.type === 'center'; }).raise();
    
    simulation.on("tick", function() {
        var padding = isMobile ? 30 : 80;
        nodes.forEach(function(d) { if (d.type !== 'center') { d.x = Math.max(padding, Math.min(width - padding, d.x)); d.y = Math.max(padding, Math.min(height - padding, d.y)); } });
        link.attr("x1", function(d) { return d.source.x; }).attr("y1", function(d) { return d.source.y; }).attr("x2", function(d) { return d.target.x; }).attr("y2", function(d) { return d.target.y; });
        node.attr("transform", function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });
    
    // Add job info tile
    addJobInfoTile(job);
    setTimeout(applyLabelToggles, 100);
}

// ===== MATCH OVERLAY NETWORK =====

export function initMatchNetwork(job) {
    if (!job || !job.matchData) return;
    
    var width = window.innerWidth;
    var height = window.innerHeight - 100;
    var isMobile = width <= 768;
    var match = job.matchData;
    var scaleFactor = Math.min(width, height) / 900;
    scaleFactor = Math.max(0.8, Math.min(scaleFactor, 1.6));
    
    var svg = d3.select("#networkView")
        .attr("width", width)
        .attr("height", height);
    svg.selectAll("*").remove();
    if (simulation) simulation.stop();
    
    // Build lookup sets for classification
    var matchedUserSkills = new Set();
    var matchedJobSkills = new Set();
    (match.matched || []).forEach(function(m) {
        matchedUserSkills.add(m.userSkill.toLowerCase());
        matchedJobSkills.add(m.jobSkill.toLowerCase());
    });
    var gapSkills = new Set();
    (match.gaps || []).forEach(function(g) { gapSkills.add(g.name.toLowerCase()); });
    
    // === LAYOUT: Name upper-right, Job Needs upper-left on mobile ===
    var nameX = isMobile ? width * 0.75 : width * 0.22;
    var nameY = isMobile ? height * 0.12 : height * 0.38;
    var networkBodyX = isMobile ? width * 0.50 : width * 0.22;
    var jobX = isMobile ? width * 0.18 : width * 0.78;
    var jobY = isMobile ? height * 0.12 : height * 0.32;
    
    var matchCenterName = window._userData.profile.name || "You";
    var maxMatchNameLen = isMobile ? 18 : 28;
    if (matchCenterName.length > maxMatchNameLen) {
        var fn = matchCenterName.split(' ')[0];
        matchCenterName = fn.length <= maxMatchNameLen ? fn : matchCenterName.substring(0, maxMatchNameLen - 1) + '\u2026';
    }
    var nodes = [
        { id: "center", name: matchCenterName, type: "center", matchState: 'center', x: nameX, y: nameY, fx: nameX, fy: nameY, homeX: nameX, homeY: nameY }
    ];
    
    // Use the user's actual roles — fan them out from network body center (not name pin)
    var matchVisibleRoles = getVisibleRoles();
    matchVisibleRoles.forEach(function(role, i) {
        var angle = -Math.PI * 0.6 + (i / Math.max(matchVisibleRoles.length - 1, 1)) * Math.PI * 1.2;
        var radius = (isMobile ? 140 : 180) * scaleFactor;
        var roleId = role.id || role.name;
        nodes.push({
            id: roleId, name: role.name, type: 'role', color: role.color, matchState: 'role',
            x: networkBodyX + Math.cos(angle) * radius, y: (isMobile ? height * 0.45 : nameY) + Math.sin(angle) * radius
        });
    });
    
    // Add a "job requirements" pseudo-role — pinned to RIGHT side
    nodes.push({
        id: 'role-job-req', name: ((job.title || 'Job').length > (isMobile ? 18 : 25) ? (job.title || 'Job').substring(0, isMobile ? 16 : 23) + '\u2026' : (job.title || 'Job')) + ' Needs', type: 'role', color: '#fbbf24', matchState: 'role',
        x: jobX, y: jobY, fx: jobX, fy: jobY, homeX: jobX, homeY: jobY
    });
    
    var links = [];
    var nodeIdx = 0;
    
    // Center → user roles
    var validMatchRoleIds = new Set();
    matchVisibleRoles.forEach(function(role) { var rid = role.id || role.name; validMatchRoleIds.add(rid); links.push({ source: 'center', target: rid, type: 'role' }); });
    validMatchRoleIds.add('role-job-req');
    // Center → job req role
    links.push({ source: 'center', target: 'role-job-req', type: 'role' });
    
    // User skills with match state
    var userSkillsToShow = isMobile
        ? _sd().skills.filter(function(s) { return s.key || matchedUserSkills.has(s.name.toLowerCase()) || s.level === 'Mastery' || s.level === 'Expert'; }).slice(0, 30)
        : _sd().skills;
    
    userSkillsToShow.forEach(function(skill) {
        var isMatched = matchedUserSkills.has(skill.name.toLowerCase());
        var state = isMatched ? 'matched' : 'surplus';
        var id = 'u-' + nodeIdx++;
        nodes.push({
            id: id, name: skill.name, type: 'skill', level: skill.level, key: skill.key,
            matchState: state, roles: skill.roles, source: 'user'
        });
        // Link to user roles (only if role node exists)
        var linkedToRole = false;
        (skill.roles || []).forEach(function(roleId) {
            if (validMatchRoleIds.has(roleId)) {
                links.push({ source: roleId, target: id, type: 'skill' });
                linkedToRole = true;
            }
        });
        // Orphan skills (no role link) → connect to center node directly
        if (!linkedToRole) {
            links.push({ source: 'center', target: id, type: 'skill' });
        }
        // Matched skills also link to job req
        if (isMatched) {
            links.push({ source: 'role-job-req', target: id, type: 'match' });
        }
    });
    
    // Gap skills (job needs, user doesn't have)
    (match.gaps || []).forEach(function(gap) {
        // Cap gaps on mobile
        if (isMobile && nodeIdx > 40) return;
        var id = 'g-' + nodeIdx++;
        nodes.push({
            id: id, name: gap.name, type: 'skill', level: gap.level || 'Required',
            matchState: 'gap', source: 'job'
        });
        links.push({ source: 'role-job-req', target: id, type: 'skill' });
    });
    
    // Color scheme
    var matchColors = {
        matched: '#10b981', // green
        gap: '#fbbf24',     // amber — attention needed
        surplus: '#475569'  // slate grey (dimmed)
    };
    
    // Simulation — left/right layout forces
    var gravityCenter = isMobile ? height * 0.52 : height * 0.45;
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(function(d) { return d.id; }).distance(function(d) {
            if (d.type === 'role') return (isMobile ? 120 : 150) * scaleFactor;
            if (d.type === 'match') return (isMobile ? 80 : 100) * scaleFactor;
            return (isMobile ? 100 : 130) * scaleFactor;
        }))
        .force("charge", d3.forceManyBody().strength(function(d) {
            if (d.type === 'center') return 0;
            if (d.type === 'role') return (isMobile ? -300 : -250) * scaleFactor;
            if (d.matchState === 'gap') return (isMobile ? -120 : -120) * scaleFactor;
            return (isMobile ? -160 : -150) * scaleFactor;
        }))
        .force("collision", d3.forceCollide().radius(function(d) {
            if (d.type === 'center') return (isMobile ? 45 : 55) * scaleFactor;
            if (d.type === 'role') return (isMobile ? 45 : 50) * scaleFactor;
            return (isMobile ? 28 : 30) * scaleFactor;
        }))
        .force("x", d3.forceX(function(d) {
            if (d.type === 'center') return nameX;
            if (d.id === 'role-job-req') return jobX;
            if (d.matchState === 'gap') return isMobile ? width * 0.25 : jobX;
            if (d.matchState === 'matched') return isMobile ? width * 0.50 : width * 0.5;
            return isMobile ? width * 0.55 : networkBodyX + width * 0.05;
        }).strength(function(d) {
            if (d.type === 'center' || d.id === 'role-job-req') return 0;
            if (d.matchState === 'matched') return 0.06;
            return isMobile ? 0.06 : 0.1;
        }))
        .force("y", d3.forceY(gravityCenter).strength(isMobile ? 0.04 : 0.06));
    
    // Draw links - BELOW nodes
    var isLt = document.documentElement.getAttribute('data-theme') === 'light';
    var linkLayerM = svg.append("g").attr("class", "link-layer");
    var nodeLayerM = svg.append("g").attr("class", "node-layer");
    var link = linkLayerM.selectAll("line").data(links).join("line")
        .attr("class", "link")
        .style("stroke", function(d) { return d.type === 'match' ? matchColors.matched : (isLt ? 'rgba(100,116,139,0.25)' : undefined); })
        .style("stroke-opacity", function(d) { return d.type === 'match' ? 0.5 : (isLt ? 1 : 0.2); })
        .style("stroke-width", function(d) { return d.type === 'match' ? 2.5 : 1.5; })
        .style("stroke-dasharray", function(d) { return d.type === 'match' ? '4,3' : 'none'; });
    
    // Draw nodes
    var node = nodeLayerM.selectAll("g").data(nodes).join("g")
        .attr("class", function(d) { return 'node ' + d.type; })
        .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));
    
    node.append("circle")
        .attr("r", function(d) {
            if (d.type === 'center') return isMobile ? 28 : Math.round(38 * scaleFactor);
            if (d.type === 'role') return isMobile ? 22 : Math.round(28 * scaleFactor);
            if (d.matchState === 'matched') return isMobile ? 12 : Math.round(14 * scaleFactor);
            if (d.matchState === 'gap') return isMobile ? 10 : Math.round(12 * scaleFactor);
            return isMobile ? 7 : Math.round(8 * scaleFactor); // surplus
        })
        .attr("fill", function(d) {
            if (d.type === 'center') return isLt ? '#2563eb' : '#60a5fa';
            if (d.type === 'role') {
                if (d.id === 'role-job-req') return isLt ? '#fef3c7' : '#422006';
                return isLt ? '#e2e8f0' : '#1e293b';
            }
            return matchColors[d.matchState] || '#6b7280';
        })
        .attr("opacity", function(d) {
            if (d.matchState === 'surplus') return 0.35;
            return 1;
        })
        .attr("stroke", function(d) {
            if (d.type === 'role') {
                return d.id === 'role-job-req' ? '#fbbf24' : (isLt ? '#94a3b8' : '#475569');
            }
            if (d.matchState === 'matched') return isLt ? '#d1d5db' : '#fff';
            if (d.matchState === 'gap') return '#fde68a';
            return 'none';
        })
        .attr("stroke-width", function(d) {
            if (d.type === 'role') return 2.5;
            if (d.matchState === 'matched' || d.matchState === 'gap') return 2.5;
            return 0;
        })
        .style("cursor", function(d) { return d.type === 'center' ? 'pointer' : 'grab'; })
        .on("click", function(event, d) {
            if (d.type === 'center') {
                resetNetworkLayout();
            } else if (d.type === 'skill' && d.source === 'user') {
                var fullSkill = _sd().skills.find(function(s) { return s.name === d.name; });
                if (fullSkill) openSkillModal(d.name, fullSkill);
            }
        })
        .on("mouseover", function(event, d) { showTooltip(event, d); })
        .on("mouseout", hideTooltip);
    
    // Labels
    node.append("text")
        .each(function(d) {
            var el = d3.select(this);
            var maxC = d.type === 'center' ? 25 : d.type === 'role' ? (isMobile ? 16 : 22) : (isMobile ? 12 : 15);
            var lines = networkLabelLines(d.name, maxC);
            if (d.type === 'center') {
                var r = isMobile ? 28 : Math.round(38 * scaleFactor);
                el.attr('text-anchor', 'end');
                lines.forEach(function(ln, i) { el.append('tspan').text(ln).attr('x', -(r + 8)).attr('dy', i === 0 ? 4 : 12); });
            } else {
                var baseY = d.type === 'role' ? -34 : -22;
                el.attr('text-anchor', 'middle');
                lines.forEach(function(ln, i) { el.append('tspan').text(ln).attr('x', 0).attr('dy', i === 0 ? baseY - (lines.length - 1) * 5 : 11); });
            }
        })
        .style("font-size", function(d) { return d.type === 'center' ? '14px' : d.type === 'role' ? '11px' : '9px'; })
        .style("fill", function(d) {
            if (d.matchState === 'matched') return matchColors.matched;
            if (d.matchState === 'gap') return matchColors.gap;
            if (d.matchState === 'surplus') return isLt ? '#64748b' : '#64748b';
            if (d.type === 'role' && d.id === 'role-job-req') return '#fbbf24';
            if (d.type === 'role') return isLt ? '#1e293b' : '#94a3b8';
            return isLt ? '#1e293b' : undefined;
        })
        .style("font-weight", function(d) { return (d.type === 'center' || d.type === 'role') ? '700' : '500'; })
        .style("opacity", function(d) { return d.matchState === 'surplus' ? 0.4 : 1; });
    
    // On mobile hide skill labels
    if (isMobile) node.selectAll('text').filter(function(d) { return d.type === 'skill'; }).classed('hidden', true);
    
    // Bring center and role nodes to front
    node.filter(function(d) { return d.type === 'role'; }).raise();
    node.filter(function(d) { return d.type === 'center'; }).raise();
    
    // Tick
    simulation.on("tick", function() {
        var padding = isMobile ? 30 : 80;
        nodes.forEach(function(d) { if (d.type !== 'center') { d.x = Math.max(padding, Math.min(width - padding, d.x)); d.y = Math.max(padding, Math.min(height - padding, d.y)); } });
        link.attr("x1", function(d) { return d.source.x; }).attr("y1", function(d) { return d.source.y; }).attr("x2", function(d) { return d.target.x; }).attr("y2", function(d) { return d.target.y; });
        node.attr("transform", function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });
    
    // Add legend and job info tile
    addMatchLegend(match);
    addJobInfoTile(job);
    setTimeout(applyLabelToggles, 100);
}

export function makeTileDraggable(el) {
    if (!el || window.innerWidth <= 768) return;
    var startX, startY, startLeft, startTop, isDragging = false;
    function onDown(e) {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('a')) return;
        isDragging = true;
        el.classList.add('dragging');
        var rect = el.getBoundingClientRect();
        var parentRect = el.parentElement.getBoundingClientRect();
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startY = e.clientY || (e.touches && e.touches[0].clientY);
        startLeft = rect.left - parentRect.left;
        startTop = rect.top - parentRect.top;
        el.style.right = 'auto';
        el.style.bottom = 'auto';
        el.style.left = startLeft + 'px';
        el.style.top = startTop + 'px';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
        e.preventDefault();
    }
    function onMove(e) {
        if (!isDragging) return;
        var cx = e.clientX || (e.touches && e.touches[0].clientX);
        var cy = e.clientY || (e.touches && e.touches[0].clientY);
        var dx = cx - startX;
        var dy = cy - startY;
        var parentRect = el.parentElement.getBoundingClientRect();
        var newLeft = Math.max(0, Math.min(parentRect.width - el.offsetWidth, startLeft + dx));
        var newTop = Math.max(0, Math.min(parentRect.height - el.offsetHeight, startTop + dy));
        el.style.left = newLeft + 'px';
        el.style.top = newTop + 'px';
    }
    function onUp() {
        isDragging = false;
        el.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
    }
    el.addEventListener('mousedown', onDown);
    el.addEventListener('touchstart', onDown, { passive: false });
}

export function addJobInfoTile(job) {
    var existing = document.getElementById('jobInfoTile');
    if (existing) existing.remove();
    if (!job) return;
    
    var tile = document.createElement('div');
    tile.id = 'jobInfoTile';
    tile.className = 'job-info-tile';
    
    var html = '<div class="jit-header" onclick="this.parentElement.classList.toggle(\'jit-expanded\')" style="display:flex; align-items:center; justify-content:space-between; cursor:pointer;">'
        + '<div style="flex:1; min-width:0;">'
        + '<div class="jit-title">' + escapeHtml(job.title || 'Untitled Position') + '</div>';
    if (job.company) {
        html += '<div class="jit-company">' + escapeHtml(job.company) + '</div>';
    }
    html += '</div>'
        + '<div class="jit-chevron" style="color:var(--text-muted); font-size:0.8em; margin-left:8px; transition:transform 0.2s;">▾</div>'
        + '</div>';
    
    // Collapsible body — hidden by default on mobile
    html += '<div class="jit-body">';
    
    // Meta row: seniority, date added
    var metaItems = [];
    if (job.seniority) {
        metaItems.push('<span class="jit-meta-item">' + bpIcon('target', 12) + ' ' + job.seniority + '</span>');
    }
    if (job.addedAt) {
        var d = new Date(job.addedAt);
        metaItems.push('<span class="jit-meta-item">' + bpIcon('clock', 12) + ' ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</span>');
    }
    if (metaItems.length > 0) {
        html += '<div class="jit-meta">' + metaItems.join('') + '</div>';
    }
    
    // BLS salary
    var bls = job.blsSalary;
    if (bls && bls.median) {
        var lo = bls.pct25 ? '$' + bls.pct25.toLocaleString() : null;
        var hi = bls.pct75 ? '$' + bls.pct75.toLocaleString() : null;
        var rangeStr = lo && hi ? lo + ' \u2013 ' + hi : '$' + bls.median.toLocaleString();
        html += '<div class="jit-salary">'
            + '<div class="jit-salary-range">' + rangeStr + '</div>'
            + '<div class="jit-salary-label">' + bls.title + ' \u00B7 BLS ' + (bls.source || '').replace('BLS OEWS ', '') + '</div>'
            + '</div>';
    }
    
    // Source link
    if (job.sourceUrl) {
        html += '<div class="jit-source"><a href="' + sanitizeUrl(job.sourceUrl) + '" target="_blank" rel="noopener noreferrer">View posting \u2192</a></div>';
    }
    
    html += '</div>'; // close jit-body
    
    tile.innerHTML = html;
    
    var container = document.getElementById('networkView').parentElement;
    if (container) { container.style.position = 'relative'; container.appendChild(tile); }
    makeTileDraggable(tile);
}

export function addMatchLegend(match) {
    var existing = document.getElementById('matchLegend');
    if (existing) existing.remove();
    
    var matchCount = (match.matched || []).length;
    var gapCount = (match.gaps || []).length;
    var surplusCount = (match.surplus || []).length;
    var profGapCount = (match.matched || []).filter(function(m) { return m.profGap; }).length;
    var score = match.score || 0;
    
    // Score color
    var scoreColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
    
    // Job info
    var job = activeJobForNetwork || {};
    var jobTitle = job.title || 'Job Match';
    var jobCompany = job.company || '';
    
    var legend = document.createElement('div');
    legend.id = 'matchLegend';
    legend.className = 'match-legend';
    
    legend.innerHTML = ''
        // Score row — always visible, clickable to expand on mobile
        + '<div class="ml-score-row" onclick="this.parentElement.classList.toggle(\'ml-expanded\')" style="cursor:pointer;">'
        + '<div class="ml-score-num" style="color:' + scoreColor + ';">' + score + '%</div>'
        + '<div style="flex:1;">'
        + '<div style="font-size:0.78em; color:var(--text-muted); margin-bottom:4px;">Overall Match</div>'
        + '<div class="ml-score-bar"><div class="ml-score-fill" style="width:' + score + '%; background:' + scoreColor + ';"></div></div>'
        + '</div>'
        + '<div class="ml-chevron" style="color:var(--text-muted); font-size:0.8em; margin-left:8px; transition:transform 0.2s;">▾</div>'
        + '</div>'
        
        // Collapsible body
        + '<div class="ml-body">'
        
        // Stats grid
        + '<div class="ml-stats">'
        + '<div class="ml-stat"><div class="ml-stat-num" style="color:#10b981;">' + matchCount + '</div><div class="ml-stat-label">Matched</div></div>'
        + '<div class="ml-stat"><div class="ml-stat-num" style="color:#ef4444;">' + gapCount + '</div><div class="ml-stat-label">Gaps</div></div>'
        + '<div class="ml-stat"><div class="ml-stat-num" style="color:#64748b;">' + surplusCount + '</div><div class="ml-stat-label">Surplus</div></div>'
        + '</div>'
        
        // Proficiency gaps if any
        + (profGapCount > 0 ? '<div style="padding:6px 16px; font-size:0.78em; color:#f59e0b; background:rgba(245,158,11,0.06);">' + bpIcon('warning',12) + ' ' + profGapCount + ' skill' + (profGapCount > 1 ? 's' : '') + ' matched at a lower proficiency</div>' : '')
        
        // Legend dots
        + '<div class="ml-legend-row">'
        + '<div class="match-legend-item"><div class="match-legend-dot" style="background:#10b981;"></div>You have</div>'
        + '<div class="match-legend-item"><div class="match-legend-dot" style="background:#ef4444;"></div>You need</div>'
        + '<div class="match-legend-item"><div class="match-legend-dot" style="background:#475569; opacity:0.4;"></div>Your extra</div>'
        + '</div>'
        
        // Action buttons
        + '<div class="ml-actions">'
        + '<button class="ml-action-btn" onclick="clearJobOverlay()">✕ Close</button>'
        + '<button class="ml-action-btn" style="color:var(--accent); border-color:rgba(96,165,250,0.3);" '
        + 'onclick="var idx=findJobIdx(); clearJobOverlay(); switchView(\'opportunities\'); setTimeout(function(){showJobDetail(idx);},200);">View Details</button>'
        + '</div>'
        + '<button class="ml-scout-btn" onclick="launchScoutingReport()">'
        + bpIcon('file-text',14) + ' Create Scouting Report'
        + '</button>'
        + '</div>'; // close ml-body
    
    var container = document.getElementById('networkView').parentElement;
    if (container) { container.style.position = 'relative'; container.appendChild(legend); }
    makeTileDraggable(legend);
}

// ===== VALUES ALIGNMENT NETWORK =====

export function initValuesNetwork(job) {
    if (!job) { showToast('Select a job first to compare values.', 'info'); return; }
    
    // Lazy-compute companyValues if missing (jobs loaded before v4.27)
    if (!job.companyValues) {
        job.companyValues = getCompanyValues(job.company, job.rawText || job.description || "");
    }
    var cv = job.companyValues;
    if (!cv) {
        console.warn('Values overlay: no company values for', job.company, '| rawText length:', (job.rawText || '').length);
        showToast('No company values data for ' + (job.company || 'this job') + '.', 'warning');
        return;
    }
    
    // Compute alignment
    var userVals = (_bd().values) || [];
    if (userVals.length === 0) { inferValues(); userVals = _bd().values || []; }
    var alignment = computeValuesAlignment(userVals, cv);
    if (!alignment) { showToast('Select values in your Blueprint first.', 'warning'); return; }
    
    var width = window.innerWidth;
    var isMobile = width <= 768;
    var height = isMobile ? Math.max(window.innerHeight - 200, 400) : window.innerHeight - 100;
    var scaleFactor = Math.min(width, height) / 900;
    scaleFactor = Math.max(0.8, Math.min(scaleFactor, 1.6));
    
    var svg = d3.select("#networkView")
        .attr("width", width)
        .attr("height", height);
    svg.selectAll("*").remove();
    if (simulation) simulation.stop();
    
    // Layout: user values on left, company values on right
    var centerY = height * 0.45;
    var leftX = isMobile ? width * 0.30 : width * 0.28;
    var rightX = isMobile ? width * 0.70 : width * 0.72;
    var topY = isMobile ? Math.max(45, height * 0.10) : Math.max(60, height * 0.13);
    
    // Build lookup sets
    var alignedSet = new Set(alignment.aligned.map(function(a) { return a.name; }));
    var tensionSet = new Set(alignment.tensionRisk.map(function(t) { return t.name; }));
    var theirPrioritySet = new Set(alignment.theirPriority.map(function(t) { return t.name; }));
    var yourPrioritySet = new Set(alignment.yourPriority.map(function(y) { return y.name; }));
    
    var nodes = [];
    var links = [];
    
    // Hub nodes
    var userName = (userData && window._userData.profile && window._userData.profile.name) || 'You';
    var userFirst = userName.split(' ')[0];
    var userPossessive = userFirst.endsWith('s') ? userFirst + "'" : userFirst + "'s";
    nodes.push({
        id: 'hub-you', name: userPossessive + ' Values', type: 'hub', side: 'user',
        x: leftX, y: topY, fx: leftX, fy: topY, homeX: leftX, homeY: topY
    });
    var companyName = job.company || 'Company';
    if (isMobile && companyName.length > 14) {
        var truncAt = companyName.lastIndexOf(' ', 12);
        if (truncAt < 6) truncAt = 12;
        companyName = companyName.substring(0, truncAt) + '\u2026';
    }
    var companyPossessive = companyName.endsWith('s') ? companyName + "'" : companyName + "'s";
    nodes.push({
        id: 'hub-company', name: companyPossessive, type: 'hub', side: 'company',
        x: rightX, y: topY, fx: rightX, fy: topY, homeX: rightX, homeY: topY
    });
    
    // User value nodes
    var userSelected = userVals.filter(function(v) { return v && v.selected; });
    userSelected.forEach(function(val, i) {
        var state = 'yours';
        if (alignedSet.has(val.name)) state = 'aligned';
        else if (tensionSet.has(val.name)) state = 'tension';
        // else stays 'yours' = your priority, their silence
        
        var angle = ((i / userSelected.length) * Math.PI * 0.8) + Math.PI * 0.6;
        var radius = (isMobile ? 155 : 180) * scaleFactor;
        nodes.push({
            id: 'uv-' + i, name: val.name, type: 'value', side: 'user',
            valState: state,
            x: leftX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius * 0.7
        });
        links.push({ source: 'hub-you', target: 'uv-' + i, type: 'spoke' });
    });
    
    // Company value nodes (primary + secondary)
    var companyAllVals = [];
    (cv.primary || []).forEach(function(name) { companyAllVals.push({ name: name, tier: 'primary' }); });
    (cv.secondary || []).forEach(function(name) { companyAllVals.push({ name: name, tier: 'secondary' }); });
    
    companyAllVals.forEach(function(cval, i) {
        var state = 'theirs';
        if (alignedSet.has(cval.name)) state = 'aligned';
        // else stays 'theirs' = their priority, you don't hold it
        
        var angle = ((i / companyAllVals.length) * Math.PI * 0.8) + Math.PI * 1.6;
        var radius = (isMobile ? 155 : 180) * scaleFactor;
        nodes.push({
            id: 'cv-' + i, name: cval.name, type: 'value', side: 'company',
            valState: state, tier: cval.tier,
            x: rightX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius * 0.7
        });
        links.push({ source: 'hub-company', target: 'cv-' + i, type: 'spoke' });
    });
    
    // Alignment bridges — connect matching values across the two sides
    userSelected.forEach(function(val, ui) {
        if (alignedSet.has(val.name)) {
            var ci = companyAllVals.findIndex(function(c) { return c.name === val.name; });
            if (ci !== -1) {
                links.push({ source: 'uv-' + ui, target: 'cv-' + ci, type: 'bridge' });
            }
        }
    });
    
    // Tension nodes (company's tension values that the user holds)
    var tensionVals = cv.tensions || [];
    tensionVals.forEach(function(tName, i) {
        if (tensionSet.has(tName)) {
            // Find the user value node
            var ui = userSelected.findIndex(function(v) { return v.name === tName; });
            if (ui !== -1) {
                // Add a small "friction" indicator node between them
                nodes.push({
                    id: 'tension-' + i, name: '\u26A0', type: 'tension-marker',
                    x: (leftX + rightX) / 2,
                    y: centerY + (i * 40) - 20
                });
                links.push({ source: 'uv-' + ui, target: 'tension-' + i, type: 'tension-link' });
            }
        }
    });
    
    // Value state colors
    var valColors = {
        aligned: '#10b981',
        yours: '#f59e0b',
        theirs: '#6366f1',
        tension: '#fbbf24'
    };
    
    // Simulation
    simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(function(d) { return d.id; }).distance(function(d) {
            if (d.type === 'bridge') return (isMobile ? 180 : 260) * scaleFactor;
            if (d.type === 'tension-link') return (isMobile ? 100 : 140) * scaleFactor;
            return (isMobile ? 100 : 150) * scaleFactor;
        }).strength(function(d) {
            if (d.type === 'bridge') return 0.12;
            return 0.5;
        }))
        .force("charge", d3.forceManyBody().strength(function(d) {
            if (d.type === 'hub') return 0;
            if (d.type === 'tension-marker') return -40;
            return (isMobile ? -280 : -300) * scaleFactor;
        }))
        .force("collision", d3.forceCollide().radius(function(d) {
            if (d.type === 'hub') return (isMobile ? 48 : 60) * scaleFactor;
            if (d.type === 'tension-marker') return 18;
            return (isMobile ? 38 : 48) * scaleFactor;
        }))
        .force("x", d3.forceX(function(d) {
            if (d.side === 'user') return leftX;
            if (d.side === 'company') return rightX;
            return width / 2;
        }).strength(0.08))
        .force("y", d3.forceY(centerY).strength(0.04));
    
    // Draw links - BELOW nodes
    var isLtV = document.documentElement.getAttribute('data-theme') === 'light';
    var linkLayerV = svg.append("g").attr("class", "link-layer");
    var nodeLayerV = svg.append("g").attr("class", "node-layer");
    var link = linkLayerV.selectAll("line").data(links).join("line")
        .attr("class", "link")
        .style("stroke", function(d) {
            if (d.type === 'bridge') return valColors.aligned;
            if (d.type === 'tension-link') return valColors.tension;
            return isLtV ? 'rgba(100,116,139,0.2)' : undefined;
        })
        .style("stroke-opacity", function(d) {
            if (d.type === 'bridge') return 0.6;
            if (d.type === 'tension-link') return 0.5;
            return isLtV ? 1 : 0.15;
        })
        .style("stroke-width", function(d) {
            if (d.type === 'bridge') return 2.5;
            if (d.type === 'tension-link') return 1.5;
            return 1.5;
        })
        .style("stroke-dasharray", function(d) {
            if (d.type === 'bridge') return '6,4';
            if (d.type === 'tension-link') return '3,3';
            return 'none';
        });
    
    // Draw nodes
    var node = nodeLayerV.selectAll("g").data(nodes).join("g")
        .attr("class", function(d) { return 'node ' + d.type; })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
    
    node.append("circle")
        .attr("r", function(d) {
            if (d.type === 'hub') return isMobile ? 26 : Math.round(34 * scaleFactor);
            if (d.type === 'tension-marker') return isMobile ? 8 : 10;
            // Value nodes: aligned are bigger
            if (d.valState === 'aligned') return isMobile ? 16 : Math.round(20 * scaleFactor);
            return isMobile ? 12 : Math.round(15 * scaleFactor);
        })
        .attr("fill", function(d) {
            if (d.type === 'hub') return d.side === 'user' ? (isLtV ? '#2563eb' : '#60a5fa') : '#f59e0b';
            if (d.type === 'tension-marker') return valColors.tension;
            return valColors[d.valState] || '#6b7280';
        })
        .attr("stroke", function(d) {
            if (d.type === 'hub') return isLtV ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)';
            if (d.valState === 'aligned') return isLtV ? '#d1fae5' : '#fff';
            if (d.valState === 'tension') return '#fde68a';
            return 'none';
        })
        .attr("stroke-width", function(d) {
            if (d.type === 'hub') return 2.5;
            if (d.valState === 'aligned' || d.valState === 'tension') return 2.5;
            return 0;
        })
        .attr("opacity", function(d) {
            if (d.valState === 'theirs') return 0.6;
            return 1;
        })
        .style("cursor", function(d) { return d.type === 'hub' ? 'pointer' : 'grab'; })
        .on("click", function(event, d) {
            if (d.type === 'hub') {
                resetNetworkLayout();
            }
        })
        .on("mouseover", function(event, d) { showTooltip(event, d); })
        .on("mouseout", hideTooltip);
    
    // Labels
    node.append("text")
        .each(function(d) {
            var el = d3.select(this);
            if (d.type === 'tension-marker') {
                el.text('\u26A0').attr('x', 0).attr('y', 4).attr('text-anchor', 'middle');
                return;
            }
            var maxC = d.type === 'hub' ? (isMobile ? 18 : 24) : (isMobile ? 14 : 18);
            var lines = networkLabelLines(d.name, maxC);
            var baseY = d.type === 'hub' ? -(isMobile ? 36 : Math.round(46 * scaleFactor)) : -(isMobile ? 26 : Math.round(30 * scaleFactor));
            el.attr('text-anchor', 'middle');
            lines.forEach(function(ln, i) {
                el.append('tspan').text(ln).attr('x', 0).attr('dy', i === 0 ? baseY - (lines.length - 1) * 5 : 11);
            });
        })
        .style("font-size", function(d) {
            if (d.type === 'hub') return isMobile ? '12px' : '14px';
            if (d.type === 'tension-marker') return '12px';
            return isMobile ? '9px' : '10.5px';
        })
        .style("fill", function(d) {
            if (d.type === 'hub') return d.side === 'user' ? (isLtV ? '#1d4ed8' : '#93c5fd') : (isLtV ? '#b45309' : '#fbbf24');
            if (d.type === 'tension-marker') return valColors.tension;
            return valColors[d.valState] || (isLtV ? '#334155' : '#94a3b8');
        })
        .style("font-weight", function(d) {
            if (d.type === 'hub') return '700';
            if (d.valState === 'aligned') return '600';
            return '500';
        });
    
    // Bring hubs to front
    node.filter(function(d) { return d.type === 'hub'; }).raise();
    
    // Hide skill labels on mobile
    if (isMobile) {
        node.selectAll('text').filter(function(d) { return d.type === 'value' && d.valState !== 'aligned'; }).classed('hidden', true);
    }
    
    // Tick
    simulation.on("tick", function() {
        var padding = isMobile ? 50 : 55;
        nodes.forEach(function(d) {
            if (d.type !== 'hub') {
                d.x = Math.max(padding, Math.min(width - padding, d.x));
                d.y = Math.max(padding, Math.min(height - padding, d.y));
            }
        });
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });
        node.attr("transform", function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });
    
    // Add values panel (includes job info) — skip separate job tile
    addValuesAlignmentPanel(alignment, job, cv);
    var existingJIT = document.getElementById('jobInfoTile');
    if (existingJIT) existingJIT.remove();
    setTimeout(applyLabelToggles, 100);
}

export function addValuesAlignmentPanel(alignment, job, cv) {
    var existing = document.getElementById('valuesAlignmentPanel');
    if (existing) existing.remove();
    
    var score = alignment.score;
    var scoreColor = score >= 65 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
    var isMobile = window.innerWidth <= 768;
    
    var panel = document.createElement('div');
    panel.id = 'valuesAlignmentPanel';
    panel.className = 'values-alignment-panel';
    
    var html = '';
    
    // Header: job info + collapse/close
    html += '<div class="vap-header" id="vapDragHandle">'
        + '<div class="vap-header-left">'
        + '<div class="vap-job-title">' + escapeHtml(job.title || 'Untitled Position') + '</div>'
        + '<div class="vap-job-company">' + escapeHtml(job.company || '') + '</div>'
        + '</div>'
        + '<div class="vap-header-controls">'
        + '<button class="vap-ctrl-btn" onclick="toggleValuesPanel()" title="Collapse" id="vapCollapseBtn">\u2212</button>'
        + '<button class="vap-ctrl-btn" onclick="closeValuesPanel()" title="Close">\u2715</button>'
        + '</div>'
        + '</div>';
    
    // Collapsible body
    html += '<div class="vap-body" id="vapBody">';
    
    // Score row
    html += '<div class="vap-score-row">'
        + '<div class="vap-score-num" style="color:' + scoreColor + ';">' + score + '%</div>'
        + '<div style="flex:1;">'
        + '<div style="font-size:0.78em; color:var(--text-muted); margin-bottom:4px;">Values Alignment</div>'
        + '<div class="ml-score-bar"><div class="ml-score-fill" style="width:' + score + '%; background:' + scoreColor + ';"></div></div>'
        + '</div>'
        + '</div>';
    
    // Stats grid
    html += '<div class="ml-stats">'
        + '<div class="ml-stat"><div class="ml-stat-num" style="color:#10b981;">' + alignment.aligned.length + '</div><div class="ml-stat-label">Aligned</div></div>'
        + '<div class="ml-stat"><div class="ml-stat-num" style="color:#f59e0b;">' + alignment.yourPriority.length + '</div><div class="ml-stat-label">Your Priority</div></div>'
        + '<div class="ml-stat"><div class="ml-stat-num" style="color:#6366f1;">' + alignment.theirPriority.length + '</div><div class="ml-stat-label">Their Priority</div></div>'
        + (alignment.tensionRisk.length > 0
            ? '<div class="ml-stat"><div class="ml-stat-num" style="color:#ef4444;">' + alignment.tensionRisk.length + '</div><div class="ml-stat-label">Friction</div></div>'
            : '')
        + '</div>';
    
    // Company story
    if (cv.story) {
        html += '<div class="val-story">'
            + '<div class="val-story-label">' + bpIcon('info', 12) + ' Culture Signal</div>'
            + '<div class="val-story-text">' + cv.story + '</div>'
            + '</div>';
    }
    
    // Tension warnings
    if (alignment.tensionRisk.length > 0) {
        html += '<div class="val-tension-warn">'
            + '<div style="font-weight:600; margin-bottom:4px;">\u26A0 Friction Risk</div>';
        alignment.tensionRisk.forEach(function(t) {
            html += '<div class="val-tension-item">'
                + '<span style="color:#ef4444;">' + t.name + '</span>'
                + ' \u2014 <span style="color:var(--text-muted); font-size:0.85em;">you value this, but this culture may not support it</span>'
                + '</div>';
        });
        html += '</div>';
    }
    
    // Legend
    html += '<div class="ml-legend-row">'
        + '<div class="match-legend-item"><div class="match-legend-dot" style="background:#10b981;"></div>Aligned</div>'
        + '<div class="match-legend-item"><div class="match-legend-dot" style="background:#f59e0b;"></div>Your priority</div>'
        + '<div class="match-legend-item"><div class="match-legend-dot" style="background:#6366f1;"></div>Their priority</div>'
        + (alignment.tensionRisk.length > 0
            ? '<div class="match-legend-item"><div class="match-legend-dot" style="background:#ef4444;"></div>Friction</div>'
            : '')
        + '</div>';
    
    // Inferred note
    if (cv.inferred) {
        html += '<div style="padding:6px 16px; font-size:0.72em; color:var(--text-muted); font-style:italic;">'
            + 'Values inferred from job description language. Curated company profiles provide deeper insight.'
            + '</div>';
    }
    
    html += '</div>'; // close .vap-body
    
    panel.innerHTML = html;
    
    if (isMobile) {
        // Mobile: overlay on the network container (like match-legend)
        var networkContainer = document.getElementById('networkContainer') || (document.getElementById('networkView') && document.getElementById('networkView').parentElement);
        if (networkContainer) {
            networkContainer.style.position = 'relative';
            networkContainer.appendChild(panel);
        }
    } else {
        // Desktop: fixed to viewport, draggable
        document.body.appendChild(panel);
        initPanelDrag(panel, document.getElementById('vapDragHandle'));
    }
}

export function toggleValuesPanel() {
    var body = document.getElementById('vapBody');
    var btn = document.getElementById('vapCollapseBtn');
    if (!body) return;
    var isCollapsed = body.classList.toggle('vap-collapsed');
    btn.textContent = isCollapsed ? '+' : '\u2212';
    btn.title = isCollapsed ? 'Expand' : 'Collapse';
}
export function closeValuesPanel() {
    var panel = document.getElementById('valuesAlignmentPanel');
    if (panel) panel.remove();
}
export function initPanelDrag(panel, handle) {
    var isDragging = false;
    var startX, startY, panelStartX, panelStartY;
    handle.style.cursor = 'grab';
    
    handle.addEventListener('mousedown', function(e) {
        if (e.target.closest('.vap-ctrl-btn')) return;
        isDragging = true;
        handle.style.cursor = 'grabbing';
        var rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        panelStartX = rect.left;
        panelStartY = rect.top;
        e.preventDefault();
    });
    function cleanupDragListeners() {
        document.removeEventListener('mousemove', onDocMouseMove);
        document.removeEventListener('mouseup', onDocMouseUp);
        document.removeEventListener('touchmove', onDocTouchMove);
        document.removeEventListener('touchend', onDocTouchEnd);
    }
    function onDocMouseMove(e) {
        if (!panel.isConnected) { cleanupDragListeners(); return; }
        if (!isDragging) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        panel.style.left = Math.max(0, Math.min(window.innerWidth - 100, panelStartX + dx)) + 'px';
        panel.style.top = Math.max(0, Math.min(window.innerHeight - 50, panelStartY + dy)) + 'px';
        panel.style.bottom = 'auto';
    }
    function onDocMouseUp() {
        if (!panel.isConnected) { cleanupDragListeners(); return; }
        if (isDragging) { isDragging = false; handle.style.cursor = 'grab'; }
    }
    function onDocTouchMove(e) {
        if (!panel.isConnected) { cleanupDragListeners(); return; }
        if (!isDragging) return;
        var touch = e.touches[0];
        panel.style.left = Math.max(0, panelStartX + touch.clientX - startX) + 'px';
        panel.style.top = Math.max(0, panelStartY + touch.clientY - startY) + 'px';
        panel.style.bottom = 'auto';
    }
    function onDocTouchEnd() {
        if (!panel.isConnected) { cleanupDragListeners(); return; }
        isDragging = false;
    }
    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);
    
    // Touch support
    handle.addEventListener('touchstart', function(e) {
        if (e.target.closest('.vap-ctrl-btn')) return;
        isDragging = true;
        var touch = e.touches[0];
        var rect = panel.getBoundingClientRect();
        startX = touch.clientX; startY = touch.clientY;
        panelStartX = rect.left; panelStartY = rect.top;
    }, { passive: true });
    document.addEventListener('touchmove', onDocTouchMove, { passive: true });
    document.addEventListener('touchend', onDocTouchEnd);
}

export function findJobIdx() {
    var job = activeJobForNetwork;
    if (!job) return 0;
    var jobs = window._userData.savedJobs || [];
    for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].id === job.id || jobs[i].title === job.title) return i;
    }
    return 0;
}
export function initCardView() {
    const cardView = document.getElementById('cardView');
    
    // Safety: if no skills data, show empty state
    if (!_sd().skills || _sd().skills.length === 0) {
        cardView.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted);">'
            + '<div style="font-size:2em; margin-bottom:12px;">🎯</div>'
            + '<div style="font-size:1.05em; font-weight:600; color:var(--text-secondary); margin-bottom:8px;">No skills to display</div>'
            + '<div style="font-size:0.88em; line-height:1.6;">Switch to the Network view or select a sample profile to explore skills.</div>'
            + '</div>';
        return;
    }
    
    try {

    // ── Rarity-based grouping — market intelligence view ──────────────
    const levelPriority = { Mastery: 5, Expert: 4, Advanced: 3, Proficient: 2, Novice: 1 };
    const levelColors = { Mastery: '#10b981', Expert: '#fb923c', Advanced: '#a78bfa', Proficient: '#60a5fa', Novice: '#94a3b8' };

    const rarityTiers = {
        rare: {
            label: 'Rare', desc: 'Your market differentiators',
            icon: bpIcon('flame', 20),
            bg: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))',
            border: 'rgba(245,158,11,0.3)', accent: '#f59e0b',
            pillBg: 'rgba(245,158,11,0.2)', pillColor: '#f59e0b', skills: []
        },
        uncommon: {
            label: 'Uncommon', desc: 'Strong competitive advantages',
            icon: bpIcon('diamond', 20),
            bg: 'linear-gradient(135deg, rgba(96,165,250,0.06), rgba(139,92,246,0.04))',
            border: 'rgba(96,165,250,0.25)', accent: '#60a5fa',
            pillBg: 'rgba(96,165,250,0.2)', pillColor: '#60a5fa', skills: []
        },
        common: {
            label: 'Common', desc: 'Foundational capabilities',
            icon: bpIcon('check', 20),
            bg: 'var(--c-surface-2a, rgba(255,255,255,0.03))',
            border: 'var(--border, rgba(255,255,255,0.08))', accent: '#6b7280',
            pillBg: 'rgba(107,114,128,0.2)', pillColor: '#9ca3af', skills: []
        }
    };

    _sd().skills.forEach(function(skill) {
        var impact = getSkillImpact(skill);
        var rarity;
        if (skill.category === 'unique') {
            rarity = (skill.userAssessment && skill.userAssessment.rarity) || 'uncommon';
        } else if (impact && impact.marketScarcity) {
            rarity = impact.marketScarcity;
        } else {
            var fallbackMap = { critical: 'rare', high: 'rare', moderate: 'uncommon', standard: 'common', supplementary: 'common' };
            rarity = fallbackMap[(impact && impact.level) || 'moderate'] || 'common';
        }
        if (!rarityTiers[rarity]) rarity = 'common';
        rarityTiers[rarity].skills.push(skill);
    });

    Object.values(rarityTiers).forEach(function(tier) {
        tier.skills.sort(function(a, b) {
            if (a.key && !b.key) return -1;
            if (!a.key && b.key) return 1;
            var lvl = (levelPriority[b.level] || 0) - (levelPriority[a.level] || 0);
            if (lvl !== 0) return lvl;
            return (a.name || '').localeCompare(b.name || '');
        });
    });

    var html = '<div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; padding:8px 16px; margin-bottom:8px; font-size:0.72em; color:var(--c-muted, var(--text-muted));">'
        + '<span style="font-weight:600; color:var(--c-faint, var(--text-muted));">Legend:</span>'
        + '<span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#f59e0b;">&#9733;</span> Core</span>'
        + '<span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#10b981;">' + bpIcon('shield',11) + '</span> Verified</span>'
        + '<span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#10b981;">' + bpIcon('check',11) + '</span> Evidence</span>'
        + '<span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#fbbf24;">&#9888;</span> Gap</span>'
        + '<span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#60a5fa;">' + bpIcon('tool',11) + '</span> Skill</span>'
        + '<span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#a78bfa;">' + bpIcon('zap',11) + '</span> Ability</span>'
        + '<span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#10b981;">' + bpIcon('heart',11) + '</span> Work Style</span>'
        + '<span style="display:inline-flex; align-items:center; gap:3px;"><span style="color:#fbbf24;">' + bpIcon('star',11) + '</span> Unique</span>'
        + '</div>';
    html += '<div class="cards-grid">';

    ['rare', 'uncommon', 'common'].forEach(function(tierKey) {
        var tier = rarityTiers[tierKey];
        if (tier.skills.length === 0) return;

        var levelCounts = {};
        var evidenceBacked = 0;
        var verifiedTotal = 0;
        tier.skills.forEach(function(sk) {
            var lv = sk.level || 'Proficient';
            levelCounts[lv] = (levelCounts[lv] || 0) + 1;
            if (typeof getEvidenceSummary === 'function') {
                var ev = getEvidenceSummary(sk);
                if (ev.evidenceCount > 0) evidenceBacked++;
                if (ev.verifiedCount > 0) verifiedTotal++;
            }
        });
        var levelOrder = ['Mastery', 'Expert', 'Advanced', 'Proficient', 'Novice'];
        var levelStatsHtml = levelOrder
            .filter(function(lv) { return levelCounts[lv]; })
            .map(function(lv) { return '<span style="color:' + (levelColors[lv] || '#6b7280') + ';">' + levelCounts[lv] + ' ' + lv + '</span>'; })
            .join(' <span style="opacity:0.3;">\u00B7</span> ');
        var evidenceHtml = evidenceBacked > 0 ? ' <span style="opacity:0.3;">\u00B7</span> <span style="color:#10b981;">' + evidenceBacked + '/' + tier.skills.length + ' evidence-backed</span>' : '';
        var verifiedHtml = verifiedTotal > 0 ? ' <span style="opacity:0.3;">\u00B7</span> <span style="color:#10b981;">' + verifiedTotal + ' verified</span>' : '';

        html += '<div style="margin-bottom:20px; border:1px solid ' + tier.border + '; border-radius:12px; overflow:hidden;">'
            + '<div style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; background:' + tier.bg + '; border-bottom:1px solid ' + tier.border + ';">'
            + '<div style="display:flex; align-items:center; gap:10px;">'
            + '<span style="color:' + tier.accent + ';">' + tier.icon + '</span>'
            + '<div>'
            + '<div style="font-weight:700; font-size:0.95em; color:var(--c-heading, var(--text-secondary));">' + tier.label + ' <span style="font-weight:400; opacity:0.6;">(' + tier.skills.length + ')</span></div>'
            + '<div style="font-size:0.75em; color:var(--c-muted, var(--text-muted)); margin-top:2px;">' + tier.desc + '</div>'
            + '</div></div>'
            + '</div>'
            + '<div style="font-size:0.73em; padding:8px 18px; color:var(--c-muted, var(--text-muted)); border-bottom:1px solid rgba(255,255,255,0.04);">'
            + levelStatsHtml + evidenceHtml + verifiedHtml
            + '</div>';

        html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px; padding:14px;">';

        tier.skills.forEach(function(skill) {
            var lc = levelColors[skill.level] || '#6b7280';
            var escapedName = escapeHtml(skill.name).replace(/'/g, "\\'");

            var roleNames = (skill.roles || []).map(function(roleId) {
                var role = (_sd().roles || []).find(function(r) { return r.id === roleId; });
                return role ? role.name : '';
            }).filter(Boolean);

            var details = _sd().skillDetails && _sd().skillDetails[skill.name];
            var years = details && details.years ? details.years : 0;

            var skillImpact = calculateSkillValue(skill);
            var impactColor = getImpactColor(skillImpact.level);

            var catLabels = { skill: 'Skill', ability: 'Ability', workstyle: 'Work Style', unique: 'Unique' };

            var evs = typeof getEvidenceSummary === 'function' ? getEvidenceSummary(skill) : null;
            var hasEvidence = evs && evs.evidenceCount > 0;
            var hasGap = evs && evs.hasGap;
            var isVerified = evs && evs.verifiedCount > 0;

            var catIcons = { skill: bpIcon('tool',11), ability: bpIcon('zap',11), workstyle: bpIcon('heart',11), unique: bpIcon('star',11) };
            var catColors = { skill: '#60a5fa', ability: '#a78bfa', workstyle: '#10b981', unique: '#fbbf24' };
            var catTitles = { skill: 'Skill', ability: 'Ability', workstyle: 'Work Style', unique: 'Unique Skill' };

            html += '<div onclick=\'openUnifiedSkillEditor("' + escapedName + '")\' style="'
                + 'background:var(--c-surface-1, var(--card-bg, rgba(255,255,255,0.03))); '
                + 'border:1px solid var(--c-surface-4, rgba(255,255,255,0.06)); border-radius:10px; '
                + 'padding:14px 16px; cursor:pointer; transition:all 0.15s;" '
                + 'onmouseover="this.style.borderColor=\'' + tier.accent + '40\';this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 4px 16px rgba(0,0,0,0.2)\'" '
                + 'onmouseout="this.style.borderColor=\'var(--c-surface-4, rgba(255,255,255,0.06))\';this.style.transform=\'none\';this.style.boxShadow=\'none\'">';

            html += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">'
                + '<div style="width:10px; height:10px; border-radius:3px; background:' + lc + '; flex-shrink:0;"></div>'
                + '<span style="font-size:0.92em; font-weight:600; color:var(--c-heading, var(--text-secondary)); flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(skill.name) + '</span>'
                + '<div style="display:flex; gap:4px; flex-shrink:0;">'
                + (skill.key ? '<span title="Core Skill" style="color:#f59e0b; font-size:0.85em; line-height:1;">&#9733;</span>' : '')
                + (isVerified ? '<span title="Verified by ' + evs.verifiedCount + '" style="color:#10b981; font-size:0.8em; line-height:1;">' + bpIcon('shield',13) + '</span>' : '')
                + (hasGap ? '<span title="Evidence gap: claimed ' + (evs.claimedLevel||'') + ', supports ' + (evs.effectiveLevel||'') + '" style="color:#fbbf24; font-size:0.8em; line-height:1;">&#9888;</span>' : (hasEvidence ? '<span title="' + evs.evidenceCount + ' outcomes, ' + evs.points + ' pts" style="color:#10b981; font-size:0.75em; line-height:1;">' + bpIcon('check',12) + '</span>' : ''))
                + '<span title="' + (catTitles[skill.category] || 'Skill') + '" style="color:' + (catColors[skill.category] || '#60a5fa') + '; font-size:0.75em; line-height:1;">' + (catIcons[skill.category] || bpIcon('tool',11)) + '</span>'
                + '</div></div>';

            html += '<div style="display:flex; align-items:center; gap:6px; padding-left:18px; flex-wrap:wrap;">'
                + '<span style="font-size:0.72em; padding:2px 10px; border-radius:10px; background:' + lc + '22; color:' + lc + '; font-weight:600;">' + escapeHtml(skill.level || 'Proficient') + '</span>'
                + '<span title="' + skillImpact.label + '" style="font-size:0.75em; color:' + impactColor + ';">' + skillImpact.icon + '</span>'
                + '<span style="font-size:0.62em; padding:1px 7px; border-radius:8px; background:' + tier.pillBg + '; color:' + tier.pillColor + '; font-weight:700; letter-spacing:0.04em; text-transform:uppercase;">' + tier.label + '</span>'
                + (years ? '<span style="font-size:0.68em; color:var(--c-muted, var(--text-muted));">' + years + 'y</span>' : '')
                + '</div>';

            if (roleNames.length > 0) {
                html += '<div style="margin-top:6px; padding-left:18px; font-size:0.68em; color:var(--c-faint, var(--text-muted)); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + roleNames.join(' \u00B7 ') + '</div>';
            }

            html += '</div>';
        });

        html += '</div></div>';
    });

    html += '</div>';
    
    // Role-based skill suggestions
    var suggestions = getRoleSuggestions();
    if (suggestions.length > 0) {
        html += '<div style="margin-top:20px; padding:20px; border-radius:12px; '
            + 'background:linear-gradient(135deg, rgba(96,165,250,0.06), rgba(139,92,246,0.04)); '
            + 'border:1px solid rgba(96,165,250,0.15);">'
            + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">'
            + '<h3 style="font-size:0.92em; font-weight:700; color:var(--accent); margin:0;">'
            + bpIcon('lightbulb',16) + ' Suggested Skills for Your Roles</h3>'
            + '<span style="font-size:0.72em; color:var(--text-muted);">Based on industry standards</span></div>'
            + '<div style="display:flex; flex-wrap:wrap; gap:6px;">';
        suggestions.slice(0, 20).forEach(function(s) {
            html += '<span style="display:inline-flex; align-items:center; gap:4px; padding:5px 12px; border-radius:16px; '
                + 'font-size:0.82em; cursor:pointer; transition:all 0.15s; '
                + 'background:rgba(96,165,250,0.08); border:1px solid rgba(96,165,250,0.2); color:var(--text-secondary);" '
                + 'onclick="quickAddSuggested(\'' + escapeHtml(s.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(s.level) + '\', \'' + escapeHtml(s.roleId) + '\')" '
                + 'title="Expected for ' + escapeHtml(s.reason) + ' (' + escapeHtml(s.level) + ') — click to add">'
                + '<span style="font-size:0.9em;">+</span> ' + escapeHtml(s.name)
                + '<span style="font-size:0.7em; opacity:0.5;">' + escapeHtml(s.reason) + '</span></span>';
        });
        if (suggestions.length > 20) {
            html += '<span style="font-size:0.78em; color:var(--text-muted); padding:5px 8px;">+' + (suggestions.length - 20) + ' more</span>';
        }
        html += '</div></div>';
    }
    
    cardView.innerHTML = html;
    } catch (err) {
        console.error('initCardView error:', err);
        showToast('Card view failed to load: ' + err.message, 'error');
        cardView.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted);">'
            + '<div style="font-size:2em; margin-bottom:12px;">⚠️</div>'
            + '<div style="font-size:1.05em; font-weight:600; color:var(--text-secondary); margin-bottom:8px;">Card view error</div>'
            + '<div style="font-size:0.88em; line-height:1.6;">' + escapeHtml(err.message) + '</div>'
            + '</div>';
    }
}

var opportunitiesData = [];
var currentMatchThreshold = (window._userData.preferences && window._userData.preferences.minimumMatchScore) || 20;
let currentSkillsView = 'network'; // Track whether showing network or card within Skills Ontology

// Module DOMContentLoaded — skipped when legacy.js already ran initializeApp()
document.addEventListener('DOMContentLoaded', () => {
    if (window._legacyInitComplete) {
        console.log('[module] Skipping module DOMContentLoaded — legacy.js already initialized');
        return;
    }
    console.warn('[module] legacy.js did not init first — this path should not run in production');
}); // Close DOMContentLoaded

var _skipHistoryPush = false;

// ╔══════════════════════════════════════════════════════════════════╗
// ║          REPORTS DASHBOARD — Scouting Report Control Plane       ║
// ╚══════════════════════════════════════════════════════════════════╝

if (!window.toggleJobSelector) window.toggleJobSelector = toggleJobSelector;
if (!window.renderJobSelectorWidget) window.renderJobSelectorWidget = renderJobSelectorWidget;
if (!window.networkLabelLines) window.networkLabelLines = networkLabelLines;
if (!window.toggleNetworkLabels) window.toggleNetworkLabels = toggleNetworkLabels;
if (!window.initNetwork) window.initNetwork = initNetwork;
if (!window.activateJobOverlay) window.activateJobOverlay = activateJobOverlay;
if (!window.activateValuesOverlay) window.activateValuesOverlay = activateValuesOverlay;
if (!window.clearJobOverlay) window.clearJobOverlay = clearJobOverlay;
if (!window.updateMatchOverlayUI) window.updateMatchOverlayUI = updateMatchOverlayUI;
if (!window.setNetworkMatchMode) window.setNetworkMatchMode = setNetworkMatchMode;
if (!window.initJobNetwork) window.initJobNetwork = initJobNetwork;
if (!window.initMatchNetwork) window.initMatchNetwork = initMatchNetwork;
if (!window.makeTileDraggable) window.makeTileDraggable = makeTileDraggable;
if (!window.addJobInfoTile) window.addJobInfoTile = addJobInfoTile;
if (!window.addMatchLegend) window.addMatchLegend = addMatchLegend;
if (!window.initValuesNetwork) window.initValuesNetwork = initValuesNetwork;
if (!window.addValuesAlignmentPanel) window.addValuesAlignmentPanel = addValuesAlignmentPanel;
if (!window.toggleValuesPanel) window.toggleValuesPanel = toggleValuesPanel;
if (!window.closeValuesPanel) window.closeValuesPanel = closeValuesPanel;
if (!window.initPanelDrag) window.initPanelDrag = initPanelDrag;
if (!window.findJobIdx) window.findJobIdx = findJobIdx;
if (!window.initCardView) window.initCardView = initCardView;
