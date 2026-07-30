// views/welcome.js — Blueprint v4.46.21
// Phase 7e extraction — Welcome page, onboarding wizard, skill valuation

import { bpIcon }                                 from '../ui/icons.js';
import { escapeHtml, sanitizeImport, safeGet }    from '../core/security.js';
import { showToast }                              from '../ui/toast.js';
import { _sd, _bd, waitForUserData }              from '../core/data-helpers.js';
import { BP_AI_MODEL, BP_AI_MODEL_FAST }          from '../core/constants.js';

// ===== WELCOME / LANDING PAGE =====
export function renderWelcomePage() {
    var el = document.getElementById('welcomeView');
    if (!el) return;
    var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    
    // ── INVITED USER WELCOME ──────────────────────────
    if (appMode === 'invited' || appMode === 'active') {
        el.innerHTML = ''
            + '<div style="max-width:680px; margin:0 auto; padding:80px 24px 0; text-align:center;">'
            
            // Welcome badge
            + '<div style="display:inline-block; padding:6px 16px; border-radius:20px; '
            + 'background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.25); '
            + 'font-size:0.82em; font-weight:600; color:#10b981; letter-spacing:0.5px; margin-bottom:24px;">'
            + bpIcon('check',14) + ' You\u2019re In</div>'
            
            // Headline
            + '<h2 style="font-size:clamp(1.6em, 6vw, 2.3em); font-weight:700; color:var(--text-primary); '
            + 'margin-bottom:16px; line-height:1.15;">Welcome to Blueprint<span style="font-size:0.4em; vertical-align:super;">\u2122</span></h2>'
            
            // Copy
            + '<p style="font-size:1.05em; color:var(--text-secondary); line-height:1.7; max-width:520px; margin:0 auto 36px;">'
            + 'Your access is unlocked. In about five minutes, you\u2019ll have your skills mapped against professional taxonomies, '
            + 'your market value calculated, and a career intelligence system that works for you.</p>'
            
            // Feature highlights
            + '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:40px; text-align:left;" class="welcome-steps-grid">'
            
            + '<div style="padding:18px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-subtle);">'
            + '<div style="font-size:0.92em; font-weight:600; color:var(--accent); margin-bottom:6px;">'
            + bpIcon('network',14) + ' Skills Architecture</div>'
            + '<div style="font-size:0.8em; color:var(--text-muted); line-height:1.5;">'
            + '43,000+ skills from ESCO, O*NET, and Lightcast mapped to your experience.</div></div>'
            
            + '<div style="padding:18px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-subtle);">'
            + '<div style="font-size:0.92em; font-weight:600; color:#10b981; margin-bottom:6px;">'
            + bpIcon('dollar',14) + ' Market Valuation</div>'
            + '<div style="font-size:0.8em; color:var(--text-muted); line-height:1.5;">'
            + 'Compensation intelligence from BLS data. Know your worth before negotiation starts.</div></div>'
            
            + '<div style="padding:18px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-subtle);">'
            + '<div style="font-size:0.92em; font-weight:600; color:#f59e0b; margin-bottom:6px;">'
            + bpIcon('briefcase',14) + ' Job Intelligence</div>'
            + '<div style="font-size:0.8em; color:var(--text-muted); line-height:1.5;">'
            + '6-pass ontology matching scores every JD against your actual capability.</div></div>'
            
            + '</div>'
            
            // CTAs
            + '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px; margin-bottom:32px;">'
            + '<button onclick="showOnboardingWizard()" style="'
            + 'padding:18px; border-radius:10px; font-size:1em; cursor:pointer; text-align:center; '
            + 'background:var(--accent); color:#fff; border:1px solid var(--accent); transition:all 0.2s; '
            + 'animation:ctaGlow 2.5s ease-in-out infinite;">'
            + '<div style="font-weight:700; margin-bottom:4px;">' + bpIcon('zap',16) + ' Get Started</div>'
            + '<div style="font-size:0.75em; font-weight:400; opacity:0.85;">Build your Blueprint in ~5 min</div>'
            + '</button>'
            + '<button onclick="viewSampleProfile()" style="'
            + 'padding:18px; border-radius:10px; font-size:1em; cursor:pointer; text-align:center; '
            + 'background:var(--bg-card); color:var(--text-secondary); border:1px solid var(--border-subtle); transition:all 0.2s;">'
            + '<div style="font-weight:700; margin-bottom:4px;">' + bpIcon('users',16) + ' See a Demo First</div>'
            + '<div style="font-size:0.75em; font-weight:400; color:var(--text-muted);">Explore a sample profile</div>'
            + '</button>'
            + '<button onclick="if(window._bpTour)window._bpTour.startWelcome();" style="'
            + 'padding:18px; border-radius:10px; font-size:1em; cursor:pointer; text-align:center; '
            + 'background:var(--bg-card); color:var(--text-secondary); border:1px solid var(--border-subtle); transition:all 0.2s;">'
            + '<div style="font-weight:700; margin-bottom:4px;">' + bpIcon('help',16) + ' Tour Blueprint</div>'
            + '<div style="font-size:0.75em; font-weight:400; color:var(--text-muted);">Guided walkthrough</div>'
            + '</button>'
            + '</div>'
            
            // Sign in nudge
            + '<div style="font-size:0.85em; color:var(--text-muted); margin-bottom:48px;">'
            + 'Already started? <a href="#" onclick="event.preventDefault(); showAuthModal(\x27signin\x27);" '
            + 'style="color:var(--accent); text-decoration:underline;">Sign in</a> to pick up where you left off.</div>'
            
            + '</div>'
            
            // Network showcase
            + '<div style="position:relative; width:100%; height:300px; margin-bottom:4px; opacity:0.5;">'
            + '<canvas id="heroNetworkCanvas" style="width:100%; height:100%; display:block;"></canvas>'
            + '</div>';
        
        setTimeout(function() { initHeroNetwork(); }, 50);
        return;
    }
    
    // ── PUBLIC LANDING PAGE ───────────────────────────
    
    el.innerHTML = ''
        // Hero section: text left, nothing behind
        + '<div style="max-width:920px; margin:0 auto; padding:48px 24px 0;">'
        
        // Headline + subtitle + CTAs
        + '<div style="text-align:center; margin-bottom:32px;">'
        + '<h2 style="font-size:clamp(1.8em, 7vw, 2.6em); font-weight:700; color:var(--accent); margin-bottom:14px; line-height:1.12;">'
        + 'The Resume <span style="white-space:nowrap;">is Dead.</span><br>Here is Your Blueprint.<span style="font-size:0.45em; font-weight:400; vertical-align:super;">\u2122</span></h2>'
        + '<p style="font-size:1.08em; color:var(--text-secondary); line-height:1.7; max-width:620px; margin:0 auto 28px;">'
        + 'The resume is a relic of a broken system. It\u2019s a static record of where you\u2019ve been, not a projection of what you can do. We built Blueprint to dismantle that limitation. It maps your actual capabilities, calculates your market worth, and defines your trajectory. Stop guessing your value and start negotiating with data. This isn\u2019t a profile. It\u2019s your\u00a0leverage.</p>'
        + '<div class="hero-ctas" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:40px;">'
        + '<button onclick="viewSampleProfile()" style="'
        + 'padding:16px 20px; border-radius:10px; font-size:0.95em; cursor:pointer; text-align:center; '
        + 'background:transparent; color:var(--accent); border:2px solid var(--accent); transition:all 0.2s; animation:ctaGlow 2.5s ease-in-out infinite;'
        + '"><div style="font-weight:700;">' + bpIcon('users',16) + ' See It In Action</div>'
        + '<div style="font-size:0.75em; font-weight:400; color:var(--text-muted); margin-top:4px;">Explore a sample profile</div>'
        + '</button>'
        + '<button onclick="handleBuildMyBlueprint()" style="'
        + 'padding:16px 20px; border-radius:10px; font-size:0.95em; cursor:pointer; text-align:center; '
        + 'background:var(--accent); color:#fff; border:2px solid var(--accent); transition:all 0.2s;'
        + '"><div style="font-weight:700;">' + bpIcon('zap',16) + ' Build My Blueprint</div>'
        + '<div style="font-size:0.75em; font-weight:400; opacity:0.85; margin-top:4px;">Map your skills in ~5 min</div>'
        + '</button>'
        + '<button onclick="showAbout()" style="'
        + 'padding:16px 20px; border-radius:10px; font-size:0.95em; cursor:pointer; text-align:center; '
        + 'background:transparent; color:#10b981; border:2px solid #10b981; transition:all 0.2s;'
        + '"><div style="font-weight:700;">' + bpIcon('about',16) + ' Why Blueprint</div>'
        + '<div style="font-size:0.75em; font-weight:400; color:var(--text-muted); margin-top:4px;">The intelligence behind it</div>'
        + '</button>'
        + '<button onclick="if(window._bpTour)window._bpTour.startWelcome();" style="'
        + 'padding:16px 20px; border-radius:10px; font-size:0.95em; cursor:pointer; text-align:center; '
        + 'background:transparent; color:var(--text-secondary); border:2px solid var(--border-subtle); transition:all 0.2s;'
        + '"><div style="font-weight:700;">' + bpIcon('help',16) + ' Tour Blueprint</div>'
        + '<div style="font-size:0.75em; font-weight:400; color:var(--text-muted); margin-top:4px;">Guided walkthrough</div>'
        + '</button>'
        + '</div>'
        + '</div>'
        
        // Network showcase - frameless, breathes into the page
        + '<div style="position:relative; width:100%; height:360px; margin-bottom:4px;">'
        + '<canvas id="heroNetworkCanvas" style="width:100%; height:100%; display:block;"></canvas>'
        + '</div>'
        + '<div style="text-align:center; font-size:0.78em; color:var(--text-muted); margin-bottom:48px;">'
        + 'Interactive skills network \u2014 each node is a skill, grouped by professional role</div>'
        
        + '</div>'

        // How it works
        + '<div style="max-width:820px; margin:0 auto; padding:0 24px 48px;">'
        + '<div style="text-align:center; margin-bottom:32px;">'
        + '<div style="font-size:0.8em; text-transform:uppercase; letter-spacing:2px; color:var(--text-muted);">Career Intelligence in Three Steps</div>'
        + '</div>'
        
        + '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:24px; margin-bottom:48px;" class="welcome-steps-grid">'
        
        + '<div style="text-align:center; padding:20px 16px;">'
        + '<div style="width:44px; height:44px; border-radius:50%; background:rgba(96,165,250,0.12); '
        + 'display:flex; align-items:center; justify-content:center; margin:0 auto 12px; font-size:1.2em; color:var(--accent); font-weight:700;">1</div>'
        + '<div style="font-weight:600; color:var(--text-primary); margin-bottom:5px; font-size:0.95em;">Map Your Architecture</div>'
        + '<div style="font-size:0.83em; color:var(--text-muted); line-height:1.5;">'
        + 'AI scans your experience against professional skill taxonomies from ESCO and O*NET \u2014 the same frameworks used by governments and Fortune 500s.</div>'
        + '</div>'
        
        + '<div style="text-align:center; padding:20px 16px;">'
        + '<div style="width:44px; height:44px; border-radius:50%; background:rgba(16,185,129,0.12); '
        + 'display:flex; align-items:center; justify-content:center; margin:0 auto 12px; font-size:1.2em; color:#10b981; font-weight:700;">2</div>'
        + '<div style="font-weight:600; color:var(--text-primary); margin-bottom:5px; font-size:0.95em;">Know Your Market Value</div>'
        + '<div style="font-size:0.83em; color:var(--text-muted); line-height:1.5;">'
        + 'Compensation analysis powered by BLS salary data, skill rarity, and impact tier. The intelligence recruiters charge thousands for \u2014 instantly.</div>'
        + '</div>'
        
        + '<div style="text-align:center; padding:20px 16px;">'
        + '<div style="width:44px; height:44px; border-radius:50%; background:rgba(251,191,36,0.12); '
        + 'display:flex; align-items:center; justify-content:center; margin:0 auto 12px; font-size:1.2em; color:#fbbf24; font-weight:700;">3</div>'
        + '<div style="font-weight:600; color:var(--text-primary); margin-bottom:5px; font-size:0.95em;">Own Every Conversation</div>'
        + '<div style="font-size:0.83em; color:var(--text-muted); line-height:1.5;">'
        + 'Scouting reports, negotiation guides, executive blueprints \u2014 walk into any interview or review armed with data, not guesswork.</div>'
        + '</div>'
        
        + '</div>'

        // Sign in
        + '<div style="text-align:center; color:var(--text-muted); font-size:0.9em; margin-bottom:24px;">'
        + 'Already have an account? <a href="#" onclick="event.preventDefault(); showAuthModal(\x27signin\x27);" style="color:var(--accent); text-decoration:underline;">Sign in</a>'
        + '</div>'

        // Disclaimer
        + '<div style="text-align:center; padding:16px; background:var(--c-amber-bg-1); '
        + 'border:1px solid var(--c-amber-border-1b); border-radius:8px; '
        + 'font-size:0.78em; color:var(--c-muted); line-height:1.5;">'
        + 'This is a demonstration project. Data and valuations are illustrative, not professional advice. '
        + '<a href="#" onclick="event.preventDefault(); switchView(\x27consent\x27);" style="color:inherit; text-decoration:underline;">Full disclaimer</a>.'
        + '</div>'
        + '</div>';
    
    setTimeout(function() { initHeroNetwork(); }, 50);
}
if (!window.renderWelcomePage) window.renderWelcomePage = renderWelcomePage;

// ===== ANIMATED HERO NETWORK =====
export function initHeroNetwork() {
    var canvas = document.getElementById('heroNetworkCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    var W = rect.width;
    var H = rect.height;
    var centerX = W / 2, centerY = H / 2;
    
    var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    var colors = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#22d3ee', '#38bdf8'];
    var domainNames = ['Strategy', 'Leadership', 'Analytics', 'Innovation', 'Communication', 'Technology', 'Operations', 'Finance'];
    
    var nodes = [];
    var numNodes = 40;
    
    // Center - fixed sun
    nodes.push({ angle: 0, dist: 0, speed: 0, r: 20, color: '#60a5fa', alpha: 0.95, label: 'YOU', isCenter: true, isHub: false, domain: -1, x: centerX, y: centerY });
    
    // Domain hubs - planets in distinct orbital bands
    // Spread across 3 orbital bands so they have room
    // Inner band (~58-68), middle band (~78-90), outer band (~100-115)
    var hubConfigs = [
        { dist: 60,  speed: -0.085, band: 0 }, // Strategy
        { dist: 105, speed: -0.032, band: 2 }, // Leadership
        { dist: 80,  speed: -0.052, band: 1 }, // Analytics
        { dist: 68,  speed: -0.072, band: 0 }, // Innovation
        { dist: 92,  speed: -0.042, band: 1 }, // Communication
        { dist: 112, speed: -0.028, band: 2 }, // Technology
        { dist: 75,  speed: -0.058, band: 1 }, // Operations
        { dist: 100, speed: -0.035, band: 2 }, // Finance
    ];
    
    for (var d = 0; d < 8; d++) {
        var cfg = hubConfigs[d];
        // Spread starting angles more evenly with mild jitter
        var baseAngle = (d / 8) * Math.PI * 2 - Math.PI / 2;
        var jitter = (Math.random() - 0.5) * 0.3;
        nodes.push({
            angle: baseAngle + jitter, dist: cfg.dist,
            speed: cfg.speed, baseSpeed: cfg.speed,
            r: 11 + Math.random() * 4, color: colors[d], alpha: 0.7,
            label: domainNames[d], isCenter: false, isHub: true, domain: d,
            x: 0, y: 0
        });
    }
    
    // Skill nodes - satellites
    for (var i = 9; i < numNodes; i++) {
        var dom = Math.floor(Math.random() * 8);
        var parentIdx = dom + 1;
        var parent = nodes[parentIdx];
        var spread = 18 + Math.random() * 45;
        var a = Math.random() * Math.PI * 2;
        var localX = Math.cos(parent.angle) * parent.dist + Math.cos(a) * spread;
        var localY = Math.sin(parent.angle) * parent.dist + Math.sin(a) * spread;
        var nodeDist = Math.sqrt(localX * localX + localY * localY);
        var nodeAngle = Math.atan2(localY, localX);
        var speedVar = 1 + (Math.random() - 0.5) * 0.25;
        nodes.push({
            angle: nodeAngle, dist: nodeDist,
            speed: parent.speed * speedVar, baseSpeed: parent.speed * speedVar,
            r: 2.5 + Math.random() * 3.5, color: colors[dom],
            alpha: 0.35 + Math.random() * 0.3, label: '',
            isCenter: false, isHub: false, domain: dom, x: 0, y: 0
        });
    }
    
    // Links
    var links = [];
    for (var d = 1; d <= 8; d++) links.push({ source: 0, target: d, strength: 0.6 });
    for (var i = 9; i < numNodes; i++) {
        links.push({ source: nodes[i].domain + 1, target: i, strength: 0.3 });
        if (Math.random() < 0.12) {
            var od = Math.floor(Math.random() * 8) + 1;
            if (od !== nodes[i].domain + 1) links.push({ source: i, target: od, strength: 0.08 });
        }
    }
    
    // Minimum distance between hub centers (sum of radii + padding)
    var HUB_MIN_DIST = 38;
    var HUB_REPEL_RANGE = 65;
    
    // === CLICK-EMIT PARTICLES ===
    var particles = [];
    var clickedNode = -1;
    var clickGlow = 0;
    var clickTimer = 1.2;
    var emitDone = false;
    var clickable = [];
    for (var i = 1; i < numNodes; i++) clickable.push(i);
    
    function startClick() {
        clickedNode = clickable[Math.floor(Math.random() * clickable.length)];
        clickGlow = 0; emitDone = false; particles = [];
    }
    
    function emitParticles() {
        var n = nodes[clickedNode];
        var count = 3 + Math.floor(Math.random() * 2);
        for (var i = 0; i < count; i++) {
            var angle = (i / count) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
            var speed = 28 + Math.random() * 18;
            particles.push({
                ox: 0, oy: 0,
                tx: Math.cos(angle) * speed, ty: Math.sin(angle) * speed,
                r: 2 + Math.random() * 1.5, color: n.color,
                phase: 0, progress: 0
            });
        }
        emitDone = true;
    }
    
    var animId = null;
    var lastTime = performance.now();
    
    function draw(now) {
        var dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        
        // Update hub angles
        for (var i = 1; i <= 8; i++) {
            nodes[i].speed = nodes[i].baseSpeed; // reset to base each frame
        }
        
        // Hub-hub gravitational repulsion (angular nudge)
        for (var i = 1; i <= 8; i++) {
            for (var j = i + 1; j <= 8; j++) {
                var ni = nodes[i], nj = nodes[j];
                // Compute current positions
                var xi = centerX + Math.cos(ni.angle) * ni.dist;
                var yi = centerY + Math.sin(ni.angle) * ni.dist;
                var xj = centerX + Math.cos(nj.angle) * nj.dist;
                var yj = centerY + Math.sin(nj.angle) * nj.dist;
                var dx = xj - xi, dy = yj - yi;
                var dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < HUB_REPEL_RANGE) {
                    // Repulsion strength: stronger as they get closer
                    var strength = (1 - dist / HUB_REPEL_RANGE);
                    strength = strength * strength * 0.15; // quadratic falloff
                    
                    // Determine which direction to nudge angularly
                    // Cross product of position vectors tells us relative angular order
                    var cross = Math.cos(ni.angle) * Math.sin(nj.angle) - Math.sin(ni.angle) * Math.cos(nj.angle);
                    
                    if (cross > 0) {
                        // j is ahead of i angularly - push i back, j forward
                        ni.speed -= strength;
                        nj.speed += strength;
                    } else {
                        ni.speed += strength;
                        nj.speed -= strength;
                    }
                    
                    // Also nudge orbital distance apart slightly
                    if (dist < HUB_MIN_DIST) {
                        var pushStr = (1 - dist / HUB_MIN_DIST) * 8;
                        if (ni.dist <= nj.dist) {
                            ni.dist = Math.max(50, ni.dist - pushStr * dt);
                            nj.dist = Math.min(120, nj.dist + pushStr * dt);
                        } else {
                            nj.dist = Math.max(50, nj.dist - pushStr * dt);
                            ni.dist = Math.min(120, ni.dist + pushStr * dt);
                        }
                    }
                }
            }
        }
        
        // Apply orbital motion
        for (var i = 1; i < nodes.length; i++) {
            var n = nodes[i];
            n.angle += n.speed * dt;
            n.x = centerX + Math.cos(n.angle) * n.dist;
            n.y = centerY + Math.sin(n.angle) * n.dist;
        }
        
        // Click state machine
        if (clickedNode === -1) {
            clickTimer -= dt;
            if (clickTimer <= 0) { startClick(); clickTimer = 1.2 + Math.random() * 0.8; }
        } else {
            clickGlow = Math.min(clickGlow + dt * 4.5, 1);
            if (!emitDone && clickGlow >= 0.45) emitParticles();
            var allDone = emitDone;
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.progress += dt * 1.3;
                if (p.progress < 0.45) {
                    var t = p.progress / 0.45;
                    var ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
                    p.ox = p.tx * ease; p.oy = p.ty * ease; p.phase = 0; allDone = false;
                } else if (p.progress < 0.55) {
                    p.ox = p.tx; p.oy = p.ty; p.phase = 1; allDone = false;
                } else if (p.progress < 1.0) {
                    var t = (p.progress - 0.55) / 0.45;
                    var ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
                    p.ox = p.tx * (1 - ease); p.oy = p.ty * (1 - ease); p.phase = 2; allDone = false;
                } else { p.ox = 0; p.oy = 0; p.phase = 3; }
            }
            if (allDone && emitDone) {
                clickGlow = Math.max(clickGlow - dt * 3.5, 0);
                if (clickGlow <= 0) { clickedNode = -1; particles = []; }
            }
        }
        
        ctx.clearRect(0, 0, W, H);
        
        // Draw links
        for (var i = 0; i < links.length; i++) {
            var l = links[i]; var s = nodes[l.source]; var e = nodes[l.target];
            var dx = e.x - s.x; var dy = e.y - s.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 180) continue;
            var alpha = l.strength * (1 - dist / 180) * 0.6;
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
            ctx.strokeStyle = isDark ? 'rgba(96,165,250,1)' : 'rgba(37,99,235,1)';
            ctx.globalAlpha = alpha * 0.35; ctx.lineWidth = 1;
            ctx.stroke(); ctx.globalAlpha = 1;
        }
        
        // Draw nodes
        for (var i = nodes.length - 1; i >= 0; i--) {
            var n = nodes[i];
            var r = n.r; var a = n.alpha;
            var isClicked = (i === clickedNode && clickGlow > 0);
            if (isClicked) { r = n.r * (1 + 0.25 * clickGlow); a = Math.min(n.alpha + 0.3 * clickGlow, 1); }
            if (r > 5 || isClicked) {
                ctx.beginPath(); ctx.arc(n.x, n.y, isClicked ? r * 3.5 : r * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = n.color; ctx.globalAlpha = isClicked ? a * 0.2 : a * 0.07;
                ctx.fill(); ctx.globalAlpha = 1;
            }
            ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fillStyle = n.color; ctx.globalAlpha = a;
            ctx.fill(); ctx.globalAlpha = 1;
            if (n.label && (r > 6 || n.isCenter)) {
                ctx.font = (n.isCenter ? 'bold 10px' : '8.5px') + ' "Outfit", -apple-system, system-ui, sans-serif';
                ctx.fillStyle = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
                ctx.textAlign = 'center';
                ctx.fillText(n.label, n.x, n.y + r + 13);
            }
        }
        
        // Draw particles
        if (clickedNode >= 0) {
            var pn = nodes[clickedNode];
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                if (p.phase >= 3) continue;
                var fadeAlpha = p.phase === 2 ? Math.max(0, 1 - (p.progress - 0.55) / 0.45) : 1;
                ctx.beginPath(); ctx.arc(pn.x + p.ox, pn.y + p.oy, p.r, 0, Math.PI * 2);
                ctx.fillStyle = p.color; ctx.globalAlpha = 0.85 * fadeAlpha;
                ctx.fill(); ctx.globalAlpha = 1;
            }
        }
        
        animId = requestAnimationFrame(draw);
    }
    
    animId = requestAnimationFrame(draw);
    var observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) { if (!animId) { lastTime = performance.now(); animId = requestAnimationFrame(draw); } }
        else { if (animId) { cancelAnimationFrame(animId); animId = null; } }
    });
    observer.observe(canvas);
    window._heroNetworkCleanup = function() { if (animId) cancelAnimationFrame(animId); observer.disconnect(); };
}

export function viewSampleProfile() {
    var el = document.getElementById('welcomeView');
    if (!el) return;
    
    // ===== TV SHOW COLLECTIONS =====
    var collections = [
        {
            id: 'breaking-bad',
            show: 'Breaking Bad',
            color: '#22c55e',
            tagline: 'From Albuquerque labs to the boardroom',
            description: 'Six characters from Breaking Bad prove that even the most unconventional career paths map to real-world professional skills.',
            characters: [
                { id: 'walter-white', name: 'Walter White', title: 'Chemistry Educator & Researcher', emoji: '\u2697\uFE0F',
                  desc: 'PhD chemist with 20 years in education, groundbreaking research background, and an unexpected talent for operations management.' },
                { id: 'gus-fring', name: 'Gus Fring', title: 'Restaurant Chain Owner & Operator', emoji: '\uD83C\uDF54',
                  desc: 'Multi-unit restaurant operator with ruthless operational discipline, supply chain mastery, and a spotless community reputation.' },
                { id: 'hank-schrader', name: 'Hank Schrader', title: 'DEA Senior Agent', emoji: '\uD83D\uDD75\uFE0F',
                  desc: 'Federal law enforcement leader with deep investigative analytics, team leadership, and relentless pattern recognition.' },
                { id: 'jesse-pinkman', name: 'Jesse Pinkman', title: 'Artisan & Entrepreneur', emoji: '\uD83E\uDE91',
                  desc: 'Skilled woodworker, natural salesman, and street-smart entrepreneur with untapped creative and technical talent.' },
                { id: 'saul-goodman', name: 'Saul Goodman', title: 'Attorney & Marketing Strategist', emoji: '\u2696\uFE0F',
                  desc: 'Creative legal mind with unmatched client acquisition skills, crisis management expertise, and brand-building instincts.' },
                { id: 'tuco-salamanca', name: 'Tuco Salamanca', title: 'Regional Distribution Director', emoji: '\uD83D\uDCA5',
                  desc: 'High-energy distribution leader with explosive intensity, instinctive product assessment, and territory control through sheer force of personality.' }
            ]
        },
        {
            id: 'stranger-things',
            show: 'Stranger Things',
            color: '#ef4444',
            tagline: 'Small-town heroes with world-class skills',
            description: 'The residents of Hawkins, Indiana demonstrate that extraordinary capability exists in the most ordinary settings.',
            characters: [
                { id: 'jim-hopper', name: 'Jim Hopper', title: 'Police Chief & Crisis Leader', emoji: '\uD83D\uDE93',
                  desc: 'Military veteran turned law enforcement leader. Crisis management, community protection, and unwavering resilience under impossible conditions.' },
                { id: 'eleven', name: 'Eleven', title: 'Research Subject & Field Operative', emoji: '\uD83E\uDDE0',
                  desc: 'Raised in a government research facility. Extraordinary sensory perception, pattern recognition, nonverbal communication, and crisis leadership.' },
                { id: 'steve-harrington', name: 'Steve Harrington', title: 'Customer Service & Youth Mentor', emoji: '\uD83C\uDFD2',
                  desc: 'Former high school king turned selfless leader. Customer service excellence, youth mentoring, and a growth arc that defines career reinvention.' },
                { id: 'dustin-henderson', name: 'Dustin Henderson', title: 'STEM Prodigy & Communicator', emoji: '\uD83D\uDCE1',
                  desc: 'Electronics and radio expert, cryptography enthusiast, born problem-solver. Bridges technical complexity with infectious enthusiasm.' },
                { id: 'joyce-byers', name: 'Joyce Byers', title: 'Retail Worker & Investigator', emoji: '\uD83D\uDD26',
                  desc: 'Single mother, retail veteran, and the most tenacious investigator in Hawkins. Proves that determination outperforms credentials every time.' },
                { id: 'vecna', name: 'Vecna', title: 'Interdimensional Architect', emoji: '\uD83D\uDD73\uFE0F',
                  desc: 'Visionary who restructured an entire dimension, built a hive-mind network, and executed a multi-decade strategic campaign. The ultimate hostile takeover.' }
            ]
        },
        {
            id: 'succession',
            show: 'Succession',
            color: '#b5cc4b',
            tagline: 'Power, ambition, and corporate warfare',
            description: 'The Roy family and their orbit showcase every shade of corporate strategy, media empire management, and ruthless executive leadership.',
            characters: [
                { id: 'logan-roy', name: 'Logan Roy', title: 'Media Conglomerate CEO', emoji: '\uD83D\uDC51',
                  desc: 'Self-made media titan. Five decades of M&A, board-level dominance, and empire-building that redefined an industry.' },
                { id: 'kendall-roy', name: 'Kendall Roy', title: 'Corporate Strategy & Acquisitions', emoji: '\uD83D\uDCC8',
                  desc: 'Ivy League-educated dealmaker with deep M&A experience, digital media vision, and the relentless drive to step out of a massive shadow.' },
                { id: 'shiv-roy', name: 'Siobhan "Shiv" Roy', title: 'Political Strategist & Consultant', emoji: '\u265F\uFE0F',
                  desc: 'Sharp political operative turned corporate strategist. Combines policy expertise with boardroom instincts and razor-sharp communication.' },
                { id: 'roman-roy', name: 'Roman Roy', title: 'Entertainment & Business Development', emoji: '\uD83C\uDFAC',
                  desc: 'Irreverent dealmaker with genuine instincts for entertainment and emerging markets. The wild card who often reads the room better than anyone.' },
                { id: 'tom-wambsgans', name: 'Tom Wambsgans', title: 'Media Operations & Compliance', emoji: '\uD83D\uDCBC',
                  desc: 'The consummate corporate climber. Network operations, regulatory compliance, and a masterclass in navigating organizational politics.' },
                { id: 'connor-roy', name: 'Connor Roy', title: 'Rancher, Producer & Ambassador', emoji: '\uD83E\uDD20',
                  desc: 'The eldest Roy son. Gentleman rancher, Broadway producer, presidential candidate, and the only family member everyone can still talk to.' }
            ]
        },
        {
            id: 'game-of-thrones',
            show: 'Game of Thrones',
            color: '#B8860B',
            tagline: 'When you play the game of thrones, you win or you die',
            description: 'Six architects of power from the Seven Kingdoms. From self-made financial empires to dragon-backed conquest, these characters demonstrate that leadership takes many forms \u2014 and the most dangerous weapon is always the mind.',
            characters: [
                { id: 'tyrion-lannister', name: 'Tyrion Lannister', title: 'Hand of the King & Strategic Advisor', emoji: '\uD83C\uDF77',
                  desc: 'Two-time Hand of the King. Survived assassination, exile, and trial by combat through intellectual superiority and strategic alliances. The smartest person in every room.' },
                { id: 'cersei-lannister', name: 'Cersei Lannister', title: 'Queen of the Seven Kingdoms', emoji: '\uD83D\uDC51',
                  desc: 'Seized the Iron Throne through strategic elimination of rivals and absolute refusal to accept limitations. Twenty-five years at the highest levels of power.' },
                { id: 'daenerys-targaryen', name: 'Daenerys Targaryen', title: 'Queen & Empire Builder', emoji: '\uD83D\uDD25',
                  desc: 'From stateless refugee to sovereign of the largest military force in the known world. Built an empire from zero assets. The ultimate founder story.' },
                { id: 'jon-snow', name: 'Jon Snow', title: 'King in the North & Lord Commander', emoji: '\u2744\uFE0F',
                  desc: 'Rose from bastard to king through merit alone. United ancient enemies against an existential threat. Chose duty over ambition at every turn.' },
                { id: 'petyr-baelish', name: 'Petyr "Littlefinger" Baelish', title: 'Master of Coin & Lord Protector', emoji: '\uD83D\uDD73\uFE0F',
                  desc: 'The most successful self-made operator in Westeros. Built a financial empire from nothing, then leveraged wealth into political power that toppled kingdoms.' },
                { id: 'tywin-lannister', name: 'Tywin Lannister', title: 'Hand of the King & Warden of the West', emoji: '\uD83E\uDD81',
                  desc: 'The most powerful man in Westeros for four decades. Rebuilt a dynasty, served as Hand for 20 years, and proved that gold wins more wars than swords.' }
            ]
        }
    ];
    
    // Store for reference
    window._sampleCollections = collections;
    
    var html = '<div style="max-width:1100px; margin:0 auto; padding:48px 24px 80px;">';
    
    // Header
    html += '<div style="text-align:center; margin-bottom:36px;">'
        + '<div style="font-family:Outfit,sans-serif; font-size:1.6em; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; color:#60a5fa; margin-bottom:12px;">SAMPLE BLUEPRINTS</div>'
        + '<div style="font-size:1em; color:var(--text-secondary); max-width:600px; margin:0 auto; line-height:1.6;">Famous fictional characters &rarr; real-world career Blueprints. Explore their skills, outcomes, and job matches to see how Blueprint works.</div>'
        + '</div>';
    
    // Show selector tabs
    html += '<div style="display:flex; justify-content:center; gap:8px; margin-bottom:32px; flex-wrap:wrap;">';
    collections.forEach(function(col, i) {
        html += '<button onclick="selectShowCollection(\'' + col.id + '\')" id="showTab-' + col.id + '" '
            + 'style="padding:12px 24px; border-radius:10px; cursor:pointer; font-weight:700; font-size:0.95em; '
            + 'transition: all 0.2s; border:2px solid ' + col.color + '; '
            + (i === 0 ? 'background:' + col.color + '; color:#000;' : 'background:transparent; color:' + col.color + ';')
            + '">' + col.show + '</button>';
    });
    html += '</div>';
    
    // Collection content area
    html += '<div id="showCollectionContent"></div>';
    
    // Back link
    html += '<div style="text-align:center; margin-top:32px;">'
        + '<a href="#" onclick="event.preventDefault(); window._welcomePickerActive=false; switchView(\'welcome\');" '
        + 'style="color:var(--text-muted); font-size:0.9em; text-decoration:underline;">\u2190 Back to home</a>'
        + '</div></div>';
    
    el.innerHTML = html;
    window._welcomePickerActive = true;
    switchView('welcome');
    
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.mobile-nav-btn').forEach(function(b) { b.classList.remove('active'); });
    
    // Show first collection
    selectShowCollection(collections[0].id);
}
if (!window.viewSampleProfile) window.viewSampleProfile = viewSampleProfile;

export function selectShowCollection(showId) {
    var collections = window._sampleCollections;
    if (!collections) return;
    var col = collections.find(function(c) { return c.id === showId; });
    if (!col) return;
    
    // Update tabs
    collections.forEach(function(c) {
        var tab = document.getElementById('showTab-' + c.id);
        if (!tab) return;
        if (c.id === showId) {
            tab.style.background = c.color;
            tab.style.color = '#000';
        } else {
            tab.style.background = 'transparent';
            tab.style.color = c.color;
        }
    });
    
    // Render collection content
    var container = document.getElementById('showCollectionContent');
    if (!container) return;
    
    var html = '';
    
    // Show banner
    html += '<div style="padding:24px 28px; border-radius:14px; margin-bottom:24px; '
        + 'background: linear-gradient(135deg, ' + col.color + '18, ' + col.color + '08); '
        + 'border:1px solid ' + col.color + '30;">'
        + '<div style="font-size:0.82em; text-transform:uppercase; letter-spacing:0.1em; color:' + col.color + '; font-weight:700; margin-bottom:4px;">' + col.show + '</div>'
        + '<div style="font-size:1.1em; color:var(--text-primary); font-weight:600; font-style:italic; margin-bottom:6px;">\u201C' + col.tagline + '\u201D</div>'
        + '<div style="font-size:0.88em; color:var(--text-secondary); line-height:1.5;">' + col.description + '</div>'
        + '</div>';
    
    // Character cards grid
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px;">';
    
    col.characters.forEach(function(ch) {
        var profileId = ch.id;
        var hasProfile = !!templates[profileId];
        var template = templates[profileId];
        var skillCount = template ? (template.skills || []).length : 0;
        var initials = ch.name.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
        
        html += '<div style="padding:20px; background:var(--bg-card); border:1px solid var(--border); border-radius:12px; '
            + 'cursor:' + (hasProfile ? 'pointer' : 'default') + '; transition: all 0.2s; position:relative; '
            + 'opacity:' + (hasProfile ? '1' : '0.5') + ';" '
            + (hasProfile ? 'onclick="switchProfile(\'' + profileId + '\')" ' : '')
            + 'onmouseover="if(' + hasProfile + ')this.style.borderColor=\'' + col.color + '\';this.style.transform=\'translateY(-2px)\'" '
            + 'onmouseout="this.style.borderColor=\'var(--border)\';this.style.transform=\'none\'">'
            
            // Avatar + name row
            + '<div style="display:flex; align-items:center; gap:14px; margin-bottom:12px;">'
            + '<div style="width:50px; height:50px; border-radius:50%; '
            + 'background:linear-gradient(135deg, ' + col.color + ', ' + col.color + 'cc); '
            + 'color:#000; display:flex; align-items:center; justify-content:center; '
            + 'font-weight:800; font-size:1.1em; flex-shrink:0;">'
            + initials + '</div>'
            + '<div style="flex:1; min-width:0;">'
            + '<div style="font-weight:700; color:var(--text-primary); font-size:1.05em;">' + ch.emoji + ' ' + ch.name + '</div>'
            + '<div style="font-size:0.82em; color:' + col.color + '; font-weight:600;">' + ch.title + '</div>'
            + '</div>'
            + (skillCount > 0 ? '<div style="font-size:0.78em; color:var(--text-muted); text-align:right;">' + skillCount + ' skills</div>' : '')
            + '</div>'
            
            // Description
            + '<div style="font-size:0.85em; color:var(--text-secondary); line-height:1.5;">' + ch.desc + '</div>'
            
            // Status
            + (hasProfile 
                ? '<div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">'
                    + '<span style="font-size:0.75em; color:var(--text-muted);">Click to explore Blueprint</span>'
                    + '<span style="font-size:0.78em; font-weight:600; color:' + col.color + ';">View \u2192</span></div>'
                : '<div style="margin-top:12px; font-size:0.78em; color:var(--text-muted); font-style:italic;">Profile coming soon</div>')
            
            + '</div>';
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}
if (!window.selectShowCollection) window.selectShowCollection = selectShowCollection;

export function showWelcomeView() {
    switchView('welcome');
}
if (!window.showWelcomeView) window.showWelcomeView = showWelcomeView;

// ===== TOAST NOTIFICATION SYSTEM =====
let toastCounter = 0;
// showToast — provided by imported module

if (!window.showToast) window.showToast = showToast;

// dismissToast — provided by imported module

if (!window.dismissToast) window.dismissToast = dismissToast;

// ===== USER DATA CONFIGURATION =====
// This will eventually come from onboarding wizard

// userData now defined in v2.0 architecture below (line ~2224)

// ===== MARKET VALUATION CALCULATOR =====

function calculateSkillValue(skill) {
    // Now returns IMPACT rating, not dollar value
    return getSkillImpact(skill);
}

// Valuation mode: 'evidence' (default, uses effective levels) or 'potential' (uses claimed levels)
var valuationMode = 'evidence';

function calculateTotalMarketValue(mode) {
    var useMode = mode || valuationMode || 'evidence';
    
    if (!skillsData || !_sd().skills) {
        return { 
            total: 0, 
            yourWorth: 0,
            marketRate: 0,
            conservativeOffer: 0,
            standardOffer: 0,
            competitiveOffer: 0,
            breakdown: [], 
            roleLevel: 'Entry',
            top10Skills: [],
            totalPoints: 0,
            compaRatio: 100,
            criticalSkills: [],
            highSkills: [],
            criticalBonus: 0,
            highBonus: 0,
            rarityBonus: 0,
            premiumAmount: 0,
            mode: useMode,
            roleFloor: 0,
            roleFloorApplied: false,
            salaryCap: 0,
            salaryCapApplied: false
        };
    }
    
    // REDESIGNED MODEL: Function-based salary anchors + evidence premiums
    
    // Helper: get the level to use based on mode
    function getLevelForMode(skill) {
        if (useMode === 'potential') return skill.level; // Trust claimed level
        return getValuationLevel(skill); // Evidence-backed
    }
    
    // ---- STEP 1: Detect functional area from title, roles, and skills ----
    var titleStr = ((window._userData.profile || {}).currentTitle || '').toLowerCase();
    var rolesStr = ((window._userData.roles || []).map(function(r) { return r.name || ''; }).join(' ')).toLowerCase();
    var skillNames = (_sd().skills || []).map(function(s) { return (s.name || '').toLowerCase(); }).join(' ');
    var allSignals = titleStr + ' ' + rolesStr + ' ' + skillNames;
    
    // BLS OEWS May 2024 — National cross-industry wage data
    // Base = entry:25th pct, mid:median, senior:75th, director:75th(mgr), vp:90th(mgr)
    var SALARY_TABLE = {
        education: [29120, 62340, 83010, 132550, 165820],
        engineering: [53230, 102320, 130290, 152670, 238291],
        finance: [41390, 81680, 132050, 214210, 246341],
        general: [27780, 43630, 82340, 164130, 206000],
        healthcare: [30370, 62340, 107960, 162420, 219080],
        hr: [42360, 72910, 91550, 189960, 218453],
        legal: [48190, 61010, 215420, 247732, 284891],
        marketing: [56220, 76950, 95940, 211080, 242741],
        operations: [53190, 101190, 133140, 164130, 188749],
        recruiting: [42360, 72910, 97270, 189960, 218453],
        retail: [27780, 34580, 60510, 201490, 231713],
        sales: [29140, 66260, 97570, 201490, 231713],
        strategy: [76770, 101190, 133140, 164130, 230000],
        technology: [76360, 133080, 169000, 216220, 248652],
        trades: [29060, 62350, 81730, 100200, 176990]
    };
    
    // Caps = entry:median, mid:75th, senior:90th, director:90th(mgr), vp:90th(mgr)
    var SALARY_CAP = {
        education: [35240, 79410, 104670, 165820, 198984],
        engineering: [64790, 130290, 161240, 183510, 290094],
        finance: [49210, 106450, 180550, 299894, 359872],
        general: [31190, 52560, 102980, 229781, 290000],
        healthcare: [34900, 73160, 135320, 219080, 262896],
        hr: [49440, 97270, 120190, 265944, 319132],
        legal: [61010, 78280, 93936, 301588, 361905],
        marketing: [76950, 104870, 129480, 295512, 354614],
        operations: [66140, 133140, 174140, 229781, 275737],
        recruiting: [49440, 97270, 126540, 265944, 319132],
        retail: [31190, 37850, 76560, 282086, 338503],
        sales: [34580, 98780, 134470, 282086, 338503],
        strategy: [101190, 133140, 174140, 229781, 330000],
        technology: [108970, 169000, 211450, 302708, 363249],
        trades: [35250, 81730, 99000, 126690, 176990]
    };
    
    var functionPatterns = [
        { fn: 'strategy', patterns: /\b(strategy|strategic|futurist|evangelist|thought leader|advisory|consulting|consultant)\b/ },
        { fn: 'technology', patterns: /\b(software|developer|devops|cloud|aws|azure|kubernetes|programming|frontend|backend|full.?stack|data scientist|machine learning|ai engineer|cybersecurity|infosec|cissp)\b/ },
        { fn: 'recruiting', patterns: /\b(recruit|talent acqui|sourcing|hiring|ats|applicant|staffing|headhunt)\b/ },
        { fn: 'hr', patterns: /\b(human resource|hr |shrm|people ops|workforce|talent manage|employee relation|compensation|benefits|hris|organizational develop|learning.+develop)\b/ },
        { fn: 'marketing', patterns: /\b(marketing|brand|content|seo|digital market|growth|demand gen|product market|communications|pr |public relation)\b/ },
        { fn: 'finance', patterns: /\b(finance|financial|accounting|cpa|cfa|controller|treasury|audit|tax|revenue|fp&a|investment)\b/ },
        { fn: 'sales', patterns: /\b(sales|account exec|business develop|quota|pipeline|customer success|client relation)\b/ },
        { fn: 'operations', patterns: /\b(operations|supply chain|logistics|procurement|manufacturing|quality|lean|six sigma|process improve)\b/ },
        { fn: 'healthcare', patterns: /\b(nurse|clinical|patient|medical|pharma|health|hospital|physician|therapy|diagnostic)\b/ },
        { fn: 'education', patterns: /\b(teaching|teacher|professor|instructor|curriculum|education|academic|school|training)\b/ },
        { fn: 'legal', patterns: /\b(legal|attorney|lawyer|litigation|compliance|regulatory|paralegal|contract law|bar exam)\b/ },
        { fn: 'engineering', patterns: /\b(mechanical|electrical|civil|structural|pe |professional engineer|cad|construction|architect)\b/ },
        { fn: 'trades', patterns: /\b(hair|stylist|cosmetolog|barber|plumb|electri|weld|hvac|carpenter|mechanic|technician|maintenance|repair|install)\b/ },
        { fn: 'retail', patterns: /\b(cashier|retail|store|merchandise|stock|inventory clerk|customer service rep|point of sale|pos )\b/ }
    ];
    
    // Detect function: title+roles first (strongest signal), then skills as fallback
    var detectedFunction = 'general';
    var titleAndRoles = titleStr + ' ' + rolesStr;
    for (var fi = 0; fi < functionPatterns.length; fi++) {
        if (functionPatterns[fi].patterns.test(titleAndRoles)) {
            detectedFunction = functionPatterns[fi].fn;
            break;
        }
    }
    // If title didn't match, try skills
    if (detectedFunction === 'general') {
        for (var fi2 = 0; fi2 < functionPatterns.length; fi2++) {
            if (functionPatterns[fi2].patterns.test(skillNames)) {
                detectedFunction = functionPatterns[fi2].fn;
                break;
            }
        }
    }
    
    // User override (from BLS category edit)
    var autoDetected = detectedFunction;
    if ((window._userData.preferences || {}).blsFunctionOverride) {
        detectedFunction = window._userData.preferences.blsFunctionOverride;
    }
    
    // ---- STEP 2: Detect seniority from title keywords + experience ----
    var seniorityLevel = 0; // 0=entry, 1=mid, 2=senior, 3=director, 4=vp
    
    // Title-based seniority (strongest signal)
    if (/\b(ceo|cto|cfo|coo|cmo|cio|ciso|chief|c-suite|president|evp|svp)\b/.test(titleStr)) {
        seniorityLevel = 4;
    } else if (/\b(vp|vice president)\b/.test(titleStr)) {
        seniorityLevel = 4;
    } else if (/\b(senior director|sr\.? director)\b/.test(titleStr)) {
        seniorityLevel = 3;
    } else if (/\b(director|head of)\b/.test(titleStr)) {
        seniorityLevel = 3;
    } else if (/\b(senior manager|sr\.? manager|principal|lead)\b/.test(titleStr)) {
        seniorityLevel = 2;
    } else if (/\b(senior|sr\.?|manager)\b/.test(titleStr)) {
        seniorityLevel = 2;
    } else if (/\b(associate|specialist|coordinator|analyst)\b/.test(titleStr)) {
        seniorityLevel = 1;
    }
    
    // Experience-based boost (if title doesn't already set high)
    var yearsExp = parseInt(((window._userData.profile || {}).yearsExperience || '0').toString()) || 0;
    if (yearsExp >= 20 && seniorityLevel < 4) seniorityLevel = Math.max(seniorityLevel, 3);
    else if (yearsExp >= 12 && seniorityLevel < 3) seniorityLevel = Math.max(seniorityLevel, 2);
    else if (yearsExp >= 5 && seniorityLevel < 2) seniorityLevel = Math.max(seniorityLevel, 1);
    
    // Skill depth can also boost seniority (secondary signal)
    const masteryCount = _sd().skills.filter(s => getLevelForMode(s) === 'Mastery').length;
    const expertCount = _sd().skills.filter(s => getLevelForMode(s) === 'Expert').length;
    const advancedCount = _sd().skills.filter(s => getLevelForMode(s) === 'Advanced').length;
    const proficientCount = _sd().skills.filter(s => getLevelForMode(s) === 'Proficient').length;
    const totalSkills = _sd().skills.length;
    const totalPoints = (masteryCount * 4) + (expertCount * 3) + (advancedCount * 2) + (proficientCount * 1);
    
    if (totalPoints >= 80 && seniorityLevel < 4) seniorityLevel = Math.max(seniorityLevel, 3);
    else if (totalPoints >= 40 && seniorityLevel < 3) seniorityLevel = Math.max(seniorityLevel, 2);
    else if (totalPoints >= 20 && seniorityLevel < 2) seniorityLevel = Math.max(seniorityLevel, 1);
    
    // ---- STEP 3: Look up base salary ----
    var salaryBand = SALARY_TABLE[detectedFunction] || SALARY_TABLE.general;
    var baseMarketRate = salaryBand[seniorityLevel];
    
    var roleLevelNames = ['Entry', 'Mid-Level', 'Senior', 'Director', 'VP/C-Suite'];
    var roleLevel = roleLevelNames[seniorityLevel];
    var percentile = seniorityLevel >= 4 ? '75th' : '50th';
    
    // Step 2: Calculate premium factors (total capped at 35% of base)
    
    // FACTOR 1: Work Styles & Soft Skills (max 8%)
    const workStyleSkills = _sd().skills.filter(s => 
        s.category === 'workstyle' && (getLevelForMode(s) === 'Advanced' || getLevelForMode(s) === 'Expert' || getLevelForMode(s) === 'Mastery')
    );
    const workStylesPct = Math.min((workStyleSkills.length * 0.01), 0.08);
    
    // FACTOR 2: Evidence Quality (max 12%)
    let evidenceScore = 0;
    _sd().skills.forEach(skill => {
        if (skill.evidence && skill.evidence.length > 0) {
            skill.evidence.forEach(ev => {
                if (ev.outcome && (ev.outcome.match(/\d+%|\$\d+|[0-9,]+/) || ev.outcome.includes('reduced') || ev.outcome.includes('increased'))) {
                    evidenceScore += 2;
                } else if (ev.outcome) {
                    evidenceScore += 1;
                }
            });
        }
    });
    const evidenceQualityPct = Math.min((evidenceScore * 0.003), 0.12);
    
    // FACTOR 3: Skill Mix Rarity (max 8%)
    let rarityPct = 0;
    const hasAI = _sd().skills.some(s => s.name.toLowerCase().includes('ai') || s.name.toLowerCase().includes('machine learning'));
    const hasPilot = _sd().skills.some(s => s.name.toLowerCase().includes('aviation') || s.name.toLowerCase().includes('ifr'));
    const hasStrategy = _sd().skills.some(s => s.name.toLowerCase().includes('strategic'));
    const hasTechnical = _sd().skills.some(s => s.category === 'skill' && s.name.toLowerCase().includes('programming'));
    const hasLeadership = _sd().skills.some(s => s.name.toLowerCase().includes('leadership') || s.name.toLowerCase().includes('management'));
    const hasCreative = _sd().skills.some(s => s.name.toLowerCase().includes('color') || s.name.toLowerCase().includes('styling') || s.name.toLowerCase().includes('creative'));
    const hasBehavioral = _sd().skills.some(s => s.name.toLowerCase().includes('behavioral') || s.name.toLowerCase().includes('economics'));
    
    if (hasPilot && hasStrategy) rarityPct += 0.04;
    if (hasAI && hasStrategy) rarityPct += 0.03;
    if (hasTechnical && hasLeadership) rarityPct += 0.03;
    if (hasCreative && hasTechnical) rarityPct += 0.03;
    if (hasBehavioral && hasStrategy) rarityPct += 0.02;
    rarityPct = Math.min(rarityPct, 0.08);
    
    // FACTOR 4: Critical Depth (max 5%)
    const masteryInCriticalSkills = _sd().skills.filter(s => {
        const impact = getSkillImpact(s);
        return (getLevelForMode(s) === 'Mastery' || getLevelForMode(s) === 'Expert') && (impact.level === 'critical' || impact.level === 'high');
    });
    const criticalDepthPct = Math.min((masteryInCriticalSkills.length * 0.01), 0.05);
    
    // FACTOR 5: Learning & Growth (max 2%)
    const noviceSkills = _sd().skills.filter(s => s.level === 'Novice');
    const learningPct = Math.min((noviceSkills.length * 0.005), 0.02);
    
    // Total premium: hard cap at 35%
    const totalPremiumPct = Math.min(workStylesPct + evidenceQualityPct + rarityPct + criticalDepthPct + learningPct, 0.35);
    
    // Calculate dollar amounts for breakdown
    const workStylesBonus = Math.round(baseMarketRate * workStylesPct);
    const evidenceBonus = Math.round(baseMarketRate * evidenceQualityPct);
    const rarityBonus = Math.round(baseMarketRate * rarityPct);
    const criticalDepthBonus = Math.round(baseMarketRate * criticalDepthPct);
    const learningBonus = Math.round(baseMarketRate * learningPct);
    const premiumAmount = workStylesBonus + evidenceBonus + rarityBonus + criticalDepthBonus + learningBonus;
    
    // Step 3: Location adjustment
    const locationMultiplier = skillValuations?.locationMultipliers?.[window._userData.profile.location] || 1.0;
    
    const totalValue = Math.round((baseMarketRate + premiumAmount) * locationMultiplier);
    
    // Step 4: Role-based minimum floor from user's title/roles
    var roleFloor = 0;
    // Use titleAndRoles (title + roles combined) from Step 1
    
    if (/\b(ceo|cto|cfo|coo|cmo|cio|ciso|chief|c-suite|president)\b/.test(titleAndRoles)) {
        roleFloor = 200000;
    } else if (/\b(svp|evp|senior vice president|executive vice president)\b/.test(titleAndRoles)) {
        roleFloor = 180000;
    } else if (/\b(vp|vice president)\b/.test(titleAndRoles)) {
        roleFloor = 150000;
    } else if (/\b(senior director|sr\. director|sr director)\b/.test(titleAndRoles)) {
        roleFloor = 130000;
    } else if (/\b(director)\b/.test(titleAndRoles)) {
        roleFloor = 110000;
    } else if (/\b(senior manager|sr\. manager|sr manager|principal)\b/.test(titleAndRoles)) {
        roleFloor = 95000;
    } else if (/\b(manager|lead|head of)\b/.test(titleAndRoles)) {
        roleFloor = 75000;
    } else if (/\b(senior|sr\.)\b/.test(titleAndRoles)) {
        roleFloor = 65000;
    }
    
    // Apply location multiplier to floor too
    roleFloor = Math.round(roleFloor * locationMultiplier);
    
    var finalValue = Math.max(totalValue, roleFloor);
    var roleFloorApplied = finalValue > totalValue;
    
    // Apply salary cap (90th percentile ceiling for function/seniority)
    var capBand = SALARY_CAP[detectedFunction] || SALARY_CAP.general;
    var salaryCap = Math.round((capBand[seniorityLevel] || capBand[4]) * locationMultiplier);
    var salaryCapApplied = finalValue > salaryCap;
    if (salaryCapApplied) finalValue = salaryCap;
    
    // Calculate offer ranges
    const conservativeOffer = Math.round(finalValue * 0.75);
    const standardOffer = Math.round(finalValue * 0.85);
    const competitiveOffer = Math.round(finalValue * 0.95);
    
    // Build critical/high skills for compatibility
    const criticalSkills = _sd().skills.filter(s => {
        const impact = getSkillImpact(s);
        return impact.level === 'critical';
    });
    
    const highSkills = _sd().skills.filter(s => {
        const impact = getSkillImpact(s);
        return impact.level === 'high';
    });
    
    // Build top10Skills for compatibility
    const top10Skills = [
        ...criticalSkills.slice(0, 5).map(s => ({ skill: s.name, level: s.level, impact: 'Critical', impactLabel: 'Critical Impact' })),
        ...highSkills.slice(0, 5).map(s => ({ skill: s.name, level: s.level, impact: 'High', impactLabel: 'High Impact' }))
    ].slice(0, 10);
    
    // Calculate compa-ratio (your worth vs base market rate)
    const compaRatio = baseMarketRate > 0 ? Math.round((finalValue / baseMarketRate) * 100) : 100;
    
    return {
        // New structure
        total: finalValue,
        baseMarketRate: baseMarketRate,
        roleLevel: roleLevel,
        criticalSkills: criticalSkills.map(s => ({ name: s.name, level: s.level })),
        highSkills: highSkills.map(s => ({ name: s.name, level: s.level })),
        
        // NEW: Premium breakdown
        workStylesBonus: workStylesBonus,
        evidenceBonus: evidenceBonus,
        rarityBonus: rarityBonus,
        criticalDepthBonus: criticalDepthBonus,
        learningBonus: learningBonus,
        
        // Backward compatibility
        criticalBonus: criticalDepthBonus,
        highBonus: evidenceBonus,
        
        // Backward compatibility fields
        yourWorth: finalValue,
        marketRate: baseMarketRate,
        conservativeOffer: conservativeOffer,
        standardOffer: standardOffer,
        competitiveOffer: competitiveOffer,
        top10Skills: top10Skills,
        totalPoints: totalPoints,
        compaRatio: compaRatio,
        premiumAmount: premiumAmount,
        domainPremium: totalPremiumPct,
        percentile: percentile,
        
        // Mode and floor info
        mode: useMode,
        roleFloor: roleFloor,
        roleFloorApplied: roleFloorApplied,
        salaryCap: salaryCap,
        salaryCapApplied: salaryCapApplied,
        rawCalculatedValue: totalValue,
        detectedFunction: detectedFunction,
        autoDetectedFunction: autoDetected,
        seniorityIndex: seniorityLevel,
        
        breakdown: {
            base: baseMarketRate,
            critical: criticalDepthBonus,
            high: evidenceBonus,
            rarity: rarityBonus,
            location: locationMultiplier
        }
    };
}

var BLS_FUNCTION_LABELS = {
    education: 'Education & Training',
    engineering: 'Engineering & Manufacturing',
    finance: 'Finance & Accounting',
    general: 'General / Cross-functional',
    healthcare: 'Healthcare & Medical',
    hr: 'Human Resources',
    legal: 'Legal & Compliance',
    marketing: 'Marketing & Communications',
    operations: 'Operations & Supply Chain',
    recruiting: 'Recruiting & Talent Acquisition',
    retail: 'Retail & Customer Service',
    sales: 'Sales & Business Development',
    strategy: 'Strategy & Consulting',
    technology: 'Technology & Software',
    trades: 'Trades & Skilled Labor'
};

export function showBlsCategoryEditor() {
    var tv = calculateTotalMarketValue();
    var current = tv.detectedFunction || 'general';
    var auto = tv.autoDetectedFunction || 'general';
    var isOverride = (window._userData.preferences || {}).blsFunctionOverride ? true : false;
    
    var options = Object.keys(BLS_FUNCTION_LABELS).sort(function(a, b) {
        return BLS_FUNCTION_LABELS[a].localeCompare(BLS_FUNCTION_LABELS[b]);
    }).map(function(key) {
        return '<option value="' + key + '"' + (key === current ? ' selected' : '') + '>' + BLS_FUNCTION_LABELS[key] + '</option>';
    }).join('');
    
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">' + bpIcon('bar-chart', 18) + ' BLS Compensation Category</h2>'
        + '<p style="color:#9ca3af; margin-top:5px;">This determines your market benchmark</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:30px;">'
        + '<div style="margin-bottom:20px; padding:16px; background:rgba(96,165,250,0.1); border-radius:8px;">'
        + '<div style="font-size:0.82em; color:#9ca3af; margin-bottom:4px;">Auto-detected from your title, roles, and skills:</div>'
        + '<div style="font-weight:600; color:var(--c-text);">' + BLS_FUNCTION_LABELS[auto] + '</div>'
        + (isOverride ? '<div style="font-size:0.78em; color:#fbbf24; margin-top:4px;">Currently overridden to: ' + BLS_FUNCTION_LABELS[current] + '</div>' : '')
        + '</div>'
        + '<div style="margin-bottom:20px;">'
        + '<label style="display:block; font-size:0.85em; font-weight:600; color:var(--c-text); margin-bottom:8px;">Select your BLS category:</label>'
        + '<select id="blsCategorySelect" class="settings-select" style="width:100%;">' + options + '</select>'
        + '<div style="font-size:0.78em; color:var(--c-muted); margin-top:6px;">BLS categories determine the salary bands used for your market benchmark. Pick the one closest to your actual role.</div>'
        + '</div>'
        + '<div style="display:flex; gap:10px; justify-content:flex-end;">'
        + (isOverride ? '<button onclick="clearBlsCategoryOverride()" style="padding:8px 16px; background:transparent; border:1px solid rgba(239,68,68,0.4); color:#ef4444; border-radius:6px; cursor:pointer; font-size:0.85em;">Reset to Auto</button>' : '')
        + '<button onclick="saveBlsCategoryOverride()" style="padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85em;">Save Category</button>'
        + '</div>'
        + '</div>';
    modal.style.display = 'flex';
}
if (!window.showBlsCategoryEditor) window.showBlsCategoryEditor = showBlsCategoryEditor;

export function saveBlsCategoryOverride() {
    var sel = document.getElementById('blsCategorySelect');
    if (!sel) return;
    if (!window._userData.preferences) window._userData.preferences = {};
    window._userData.preferences.blsFunctionOverride = sel.value;
    saveUserData();
    closeExportModal();
    showToast('BLS category updated to ' + BLS_FUNCTION_LABELS[sel.value] + '. Compensation recalculated.', 'success');
    if (typeof initBlueprint === 'function') initBlueprint();
}
if (!window.saveBlsCategoryOverride) window.saveBlsCategoryOverride = saveBlsCategoryOverride;

export function clearBlsCategoryOverride() {
    if (!window._userData.preferences) window._userData.preferences = {};
    delete window._userData.preferences.blsFunctionOverride;
    saveUserData();
    closeExportModal();
    showToast('BLS category reset to auto-detection.', 'info');
    if (typeof initBlueprint === 'function') initBlueprint();
}
if (!window.clearBlsCategoryOverride) window.clearBlsCategoryOverride = clearBlsCategoryOverride;

export function setValuationMode(mode) {
    valuationMode = mode;
    // Re-render the Blueprint content directly
    if (typeof renderBlueprint === 'function') {
        renderBlueprint();
    }
}
if (!window.setValuationMode) window.setValuationMode = setValuationMode;

// ===== COMPENSATION DISPLAY SYSTEM =====

// Format compensation value for display
// Under $1M: full number "$185,000"
// $1M+: abbreviated "$4.5M"
// $1B+: abbreviated "$1.2B"
export function formatCompValue(value) {
    if (!value || value <= 0) return '';
    if (value >= 1e9) {
        var b = value / 1e9;
        return '$' + (b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)) + 'B';
    }
    if (value >= 1e6) {
        var m = value / 1e6;
        return '$' + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + 'M';
    }
    return '$' + Math.round(value).toLocaleString();
}
if (!window.formatCompValue) window.formatCompValue = formatCompValue;

// Curated compensation for demo profiles (total comp, not just base)
var DEMO_COMP = {
    'steve-harrington': 45000,
    'jesse-pinkman': 450000,
    'dustin-henderson': 75000,
    'eleven': 65000,
    'joyce-byers': 52000,
    'saul-goodman': 1800000,
    'walter-white': 3200000,
    'hank-schrader': 165000,
    'jim-hopper': 135000,
    'gus-fring': 4500000,
    'kendall-roy': 8500000,
    'shiv-roy': 5200000,
    'roman-roy': 6800000,
    'tom-wambsgans': 3800000,
    'logan-roy': 95000000,
    'vecna': 12000000,
    'tuco-salamanca': 2100000,
    'connor-roy': 1200000,
    'tyrion-lannister': 4200000,
    'cersei-lannister': 28000000,
    'daenerys-targaryen': 45000000,
    'jon-snow': 850000,
    'petyr-baelish': 18000000,
    'tywin-lannister': 125000000
};

// Get the effective compensation to display
// Priority: 1) user-reported comp  2) curated demo value  3) algorithm estimate
export function getEffectiveComp() {
    var calculated = calculateTotalMarketValue();
    var templateId = window._userData.templateId || '';
    
    // User-reported comp (real users)
    var reported = (window._userData.profile || {}).reportedComp;
    if (reported && reported > 0) {
        calculated.displayComp = reported;
        calculated.compSource = 'reported';
        calculated.compLabel = 'Your Compensation';
        calculated.algorithmEstimate = calculated.total;
        return calculated;
    }
    
    // Curated demo value
    if (DEMO_COMP[templateId]) {
        calculated.displayComp = DEMO_COMP[templateId];
        calculated.compSource = 'curated';
        calculated.compLabel = 'Market Value';
        calculated.algorithmEstimate = calculated.total;
        return calculated;
    }
    
    // Algorithm estimate (default)
    calculated.displayComp = calculated.total;
    calculated.compSource = 'algorithm';
    calculated.compLabel = 'Market Estimate';
    calculated.algorithmEstimate = calculated.total;
    return calculated;
}
if (!window.getEffectiveComp) window.getEffectiveComp = getEffectiveComp;

// [removed] getClosestRoleBenchmark — dead code cleanup v4.22.0

// ===== SKILL VALUATIONS SYSTEM =====

// ===== EVIDENCE QUALITY ENGINE (v4.16.0) =====
// Outcome quality scoring: each outcome earns 1-5 evidence points based on impact
// Effective level is derived from evidence points, not self-reported claims

var evidenceConfig = {
    // Points required per effective level (admin-configurable)
    thresholds: {
        'Competent': 2,
        'Proficient': 5,
        'Advanced': 10,
        'Expert': 18,
        'Mastery': 28
    },
    // Certification floor: certs bump effective level to at least this
    certFloor: 'Proficient',
    certFloorPoints: 5,
    // Verification bonus: legacy flat multiplier (kept for admin UI compat)
    verificationMultiplier: 1.5,
    // Credibility weights by verifier relationship (replaces flat multiplier)
    credibilityWeights: {
        'Manager': 2.0,
        'Executive': 2.0,
        'Client': 1.8,
        'Colleague': 1.5,
        'Industry Peer': 1.5,
        'Peer': 1.5,
        'Direct Report': 1.3,
        'Board Member': 1.8,
        'Co-founder': 1.8,
        'Other': 1.2
    },
    // Verification expiry: pending requests older than this are auto-expired
    verificationExpiryDays: 30
};

// Load/save admin-configured thresholds
export function loadEvidenceConfig() {
    try {
        var stored = safeGet('wbEvidenceConfig');
        if (stored) {
            var parsed = JSON.parse(stored);
            if (parsed.thresholds) evidenceConfig.thresholds = parsed.thresholds;
            if (parsed.certFloor) evidenceConfig.certFloor = parsed.certFloor;
            if (parsed.certFloorPoints) evidenceConfig.certFloorPoints = parsed.certFloorPoints;
            if (parsed.verificationMultiplier) evidenceConfig.verificationMultiplier = parsed.verificationMultiplier;
        }
    } catch (e) { /* parse error */ }
}
loadEvidenceConfig();

export function saveEvidenceConfig() {
    if (readOnlyGuard()) return;
    try {
        safeSet('wbEvidenceConfig', JSON.stringify(evidenceConfig));
    } catch (e) { /* quota */ }
}

// Score a single outcome text: returns 1-5 based on impact signals
export function scoreOutcome(text) {
    if (!text || typeof text !== 'string') return 1;
    var score = 1; // Base: any outcome is worth 1 point
    var t = text.toLowerCase();
    
    // Financial impact (major)
    if (/\$[\d,.]+\s*(m|million|b|billion)/i.test(text)) score += 2;
    else if (/\$[\d,.]+/i.test(text)) score += 1;
    
    // Percentage impact
    if (/\d{2,}%/.test(text)) score += 1; // 10%+ = meaningful
    else if (/\d+%/.test(text)) score += 0.5;
    
    // Multiplier/scale language
    if (/\d+x|\d+ times/i.test(text)) score += 1;
    if (/million|billion|thousands|global|enterprise|company-wide|organization-wide|industry/i.test(text)) score += 0.5;
    
    // Scope/leadership signals
    if (/founded|created from scratch|built|designed|architected|pioneered|invented/i.test(text)) score += 0.5;
    
    // Recognition signals
    if (/award|published|patent|speaker|keynote|featured|recognized|first ever|world/i.test(text)) score += 1;
    
    // Crisis/extreme context
    if (/zero (injuries|incidents|downtime)|perfect (record|score)|saved|prevented|emergency/i.test(text)) score += 0.5;
    
    return Math.min(Math.round(score * 2) / 2, 5); // Cap at 5, allow 0.5 increments
}

// Calculate total evidence points for a skill
export function calculateEvidencePoints(skill) {
    if (!skill) return 0;
    var points = 0;
    var evidence = skill.evidence || [];
    
    // Get the best verification for this skill (highest credibility)
    var verifications = getSkillVerifications(skill.name);
    var confirmedVerifications = verifications.filter(function(v) { return v.status === 'confirmed'; });
    var bestMultiplier = 1.0;
    if (confirmedVerifications.length > 0) {
        confirmedVerifications.forEach(function(v) {
            var rel = v.relationship || 'Other';
            var weight = evidenceConfig.credibilityWeights[rel] || evidenceConfig.verificationMultiplier || 1.2;
            if (weight > bestMultiplier) bestMultiplier = weight;
        });
    }
    
    evidence.forEach(function(ev) {
        var text = ((ev.outcome || '') + ' ' + (ev.description || '')).trim();
        if (!text) return;
        var outcomeScore = scoreOutcome(text);
        
        // Apply credibility-weighted verification bonus
        if (bestMultiplier > 1.0) {
            outcomeScore = Math.min(outcomeScore * bestMultiplier, 5);
        }
        
        points += outcomeScore;
    });
    
    // Certification floor check — tier-aware (highest cert wins)
    if (hasLinkedCertification(skill.name)) {
        var tier = getHighestCertTier(skill.name);
        var floorLevel = tier >= 2 ? 'Advanced' : 'Proficient';
        var floorPts = evidenceConfig.thresholds[floorLevel] || evidenceConfig.certFloorPoints;
        points = Math.max(points, floorPts);
    }
    
    // Verifier-suggested level adjustment (v4.44.44)
    // When a verifier suggests a different level than claimed, adjust points
    if (confirmedVerifications.length > 0) {
        var claimedVal = proficiencyValue(skill.level || 'Novice');
        confirmedVerifications.forEach(function(v) {
            if (v.confirmedLevel && v.confirmedLevel !== skill.level) {
                var rel = v.relationship || 'Other';
                var weight = evidenceConfig.credibilityWeights[rel] || 1.2;
                var suggestedVal = proficiencyValue(v.confirmedLevel);
                if (suggestedVal > claimedVal) {
                    // Verifier thinks you're better than claimed: bonus
                    points += weight * 1.5;
                } else if (suggestedVal < claimedVal) {
                    // Verifier disagrees with your claim: penalty
                    points -= weight * 1.5;
                }
            }
        });
        points = Math.max(points, 0); // floor at 0
    }
    
    return Math.round(points * 10) / 10; // one decimal
}

// Map evidence points to effective level
export function getEffectiveLevel(skill) {
    var points = calculateEvidencePoints(skill);
    return getEffectiveLevelFromPoints(points);
}

export function getEffectiveLevelFromPoints(points) {
    var t = evidenceConfig.thresholds;
    if (points >= t['Mastery']) return 'Mastery';
    if (points >= t['Expert']) return 'Expert';
    if (points >= t['Advanced']) return 'Advanced';
    if (points >= t['Proficient']) return 'Proficient';
    if (points >= t['Competent']) return 'Competent';
    return 'Novice';
}

// Check if a skill has a linked certification (manual links OR library maps)
export function hasLinkedCertification(skillName) {
    var certs = window._userData.certifications || [];
    var sn = skillName.toLowerCase();
    return certs.some(function(c) {
        // Check manual links first
        var linkedSkills = c.linkedSkills || [];
        if (linkedSkills.some(function(ls) { return ls.toLowerCase() === sn; })) return true;
        // Check library skill maps
        var libCert = findCertInLibrary(c.name) || findCertInLibrary(c.abbr);
        if (libCert && libCert.skills) {
            return libCert.skills.some(function(ls) { return ls.toLowerCase() === sn; });
        }
        return false;
    });
}

// Get the highest cert tier that links to this skill
export function getHighestCertTier(skillName) {
    var certs = window._userData.certifications || [];
    var sn = skillName.toLowerCase();
    var highestTier = 0;
    certs.forEach(function(c) {
        var isLinked = false;
        var linkedSkills = c.linkedSkills || [];
        if (linkedSkills.some(function(ls) { return ls.toLowerCase() === sn; })) isLinked = true;
        if (!isLinked) {
            var libCert = findCertInLibrary(c.name) || findCertInLibrary(c.abbr);
            if (libCert && libCert.skills && libCert.skills.some(function(ls) { return ls.toLowerCase() === sn; })) {
                isLinked = true;
                if (libCert.tier > highestTier) highestTier = libCert.tier;
            }
        }
        if (isLinked && highestTier < 2) {
            // Check tier from library
            var lib = findCertInLibrary(c.name) || findCertInLibrary(c.abbr);
            var tier = lib ? lib.tier : 1;
            if (tier > highestTier) highestTier = tier;
        }
    });
    return highestTier;
}

// Get verifications for a skill (from verifications array on userData)
export function getSkillVerifications(skillName) {
    var all = window._userData.verifications || [];
    return all.filter(function(v) { return v.skillName === skillName; });
}

// Get the level used for valuation: min(claimed, effective) or effective if higher
// The valuation engine uses the evidence-backed level, not the claim
export function getValuationLevel(skill) {
    var claimed = skill.level || 'Novice';
    var effective = getEffectiveLevel(skill);
    var claimedVal = proficiencyValue(claimed);
    var effectiveVal = proficiencyValue(effective);
    // If skill has substantial evidence (4+ outcomes), trust the claimed level
    // Evidence validates the claim rather than constraining it
    var evidenceCount = (skill.evidence || []).length;
    if (evidenceCount >= 4) return claimed;
    // Otherwise: valuation uses whichever is LOWER — can't claim above evidence
    return effectiveVal < claimedVal ? effective : claimed;
}

// Summary stats for a skill's evidence status
export function getEvidenceSummary(skill) {
    var points = calculateEvidencePoints(skill);
    var effectiveLevel = getEffectiveLevelFromPoints(points);
    var claimed = skill.level || 'Novice';
    var evidenceCount = (skill.evidence || []).length;
    var hasCert = hasLinkedCertification(skill.name);
    var verifications = getSkillVerifications(skill.name);
    var verifiedCount = verifications.filter(function(v) { return v.status === 'confirmed'; }).length;
    var pendingCount = verifications.filter(function(v) { return v.status === 'pending'; }).length;
    
    // Track verifier level suggestions (v4.44.44)
    var levelSuggestions = verifications.filter(function(v) {
        return v.status === 'confirmed' && v.confirmedLevel && v.confirmedLevel !== claimed;
    }).map(function(v) {
        return { name: v.verifierName, level: v.confirmedLevel, relationship: v.relationship };
    });
    
    // Find next level threshold
    var nextLevel = null;
    var pointsNeeded = 0;
    var levels = ['Competent', 'Proficient', 'Advanced', 'Expert', 'Mastery'];
    for (var i = 0; i < levels.length; i++) {
        if (evidenceConfig.thresholds[levels[i]] > points) {
            nextLevel = levels[i];
            pointsNeeded = Math.round((evidenceConfig.thresholds[levels[i]] - points) * 10) / 10;
            break;
        }
    }
    
    var gap = proficiencyValue(claimed) > proficiencyValue(effectiveLevel);
    
    return {
        points: points,
        effectiveLevel: effectiveLevel,
        claimedLevel: claimed,
        evidenceCount: evidenceCount,
        hasGap: gap,
        hasCert: hasCert,
        verifiedCount: verifiedCount,
        pendingCount: pendingCount,
        levelSuggestions: levelSuggestions,
        nextLevel: nextLevel,
        pointsNeeded: pointsNeeded
    };
}

// Expose to global scope
if (!window.scoreOutcome) window.scoreOutcome = scoreOutcome;
if (!window.calculateEvidencePoints) window.calculateEvidencePoints = calculateEvidencePoints;
if (!window.getEffectiveLevel) window.getEffectiveLevel = getEffectiveLevel;
if (!window.getEvidenceSummary) window.getEvidenceSummary = getEvidenceSummary;
if (!window.getValuationLevel) window.getValuationLevel = getValuationLevel;

// ===== VERIFICATION SYSTEM (v4.16.0) =====
// Note: window._userData.verifications initialized in userData declaration and template loading

export function requestVerification(skillNames) {
    if (readOnlyGuard()) return;
    if (!Array.isArray(skillNames)) skillNames = [skillNames];
    
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    
    var skillListHTML = skillNames.map(function(sn) {
        var skill = (_sd().skills || []).find(function(s) { return s.name === sn; });
        var summary = skill ? getEvidenceSummary(skill) : { points:0, effectiveLevel:'Novice', evidenceCount:0 };
        var evPreview = (skill && skill.evidence) ? skill.evidence.slice(0,3).map(function(e) {
            var t = (e.outcome || e.description || '').substring(0, 80);
            return '<div style="font-size:0.8em; color:var(--c-muted); padding:2px 0;">• ' + escapeHtml(t) + (t.length >= 80 ? '\u2026' : '') + '</div>';
        }).join('') : '<div style="font-size:0.8em; color:var(--c-faint); font-style:italic;">No evidence yet</div>';
        
        return '<div style="padding:10px; background:var(--c-surface-1); border-radius:8px; margin-bottom:8px;">'
            + '<div style="font-weight:600; color:var(--c-text-alt);">' + escapeHtml(sn) + '</div>'
            + '<div style="font-size:0.82em; color:var(--c-accent); margin-top:2px;">Claimed: ' + (skill ? skill.level : '?') + ' · Evidence: ' + summary.points + ' pts → ' + summary.effectiveLevel + '</div>'
            + evPreview + '</div>';
    }).join('');
    
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">' + bpIcon('check', 18) + ' Request Verification</h2>'
        + '<p style="color:var(--c-muted); margin-top:5px;">Ask a colleague or manager to verify your evidence</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px; max-height:70vh; overflow-y:auto;">'
        + '<div style="margin-bottom:16px;">' + skillListHTML + '</div>'
        + '<div style="display:grid; gap:14px;">'
        + '<div class="settings-group"><label class="settings-label">Verifier Name *</label>'
        + '<input type="text" class="settings-input" id="verifyName" placeholder="Jane Smith"></div>'
        + '<div class="settings-group"><label class="settings-label">Verifier Email *</label>'
        + '<input type="email" class="settings-input" id="verifyEmail" placeholder="jane@company.com"></div>'
        + '<div class="settings-group"><label class="settings-label">Relationship</label>'
        + '<select class="settings-select" id="verifyRelationship">'
        + '<option value="Manager">Manager / Supervisor (2.0x \u2014 Highest)</option>'
        + '<option value="Executive">Executive Sponsor (2.0x \u2014 Highest)</option>'
        + '<option value="Client">Client / Customer (1.8x \u2014 High)</option>'
        + '<option value="Board Member">Board Member (1.8x \u2014 High)</option>'
        + '<option value="Colleague">Colleague / Peer (1.5x \u2014 Standard)</option>'
        + '<option value="Industry Peer">Industry Peer (1.5x \u2014 Standard)</option>'
        + '<option value="Direct Report">Direct Report (1.3x \u2014 Basic)</option>'
        + '<option value="Other">Other (1.2x)</option>'
        + '</select></div>'
        + '<div class="settings-group"><label class="settings-label">Personal Note (Optional)</label>'
        + '<textarea class="settings-input" id="verifyNote" rows="2" style="resize:vertical; font-size:0.88em;" '
        + 'placeholder="Hi Jane, could you confirm my expertise in these areas?"></textarea></div>'
        + '</div>'
        + '<div style="display:flex; gap:10px; margin-top:20px;">'
        + '<button onclick="sendVerificationRequest(\'' + skillNames.map(function(s) { return s.replace(/'/g,"\\'"); }).join("','") + '\')" '
        + 'style="background:var(--accent); color:#fff; border:none; padding:10px 24px; border-radius:8px; cursor:pointer; font-weight:600;">'
        + 'Generate Verification Email</button>'
        + '<button onclick="closeExportModal()" style="background:transparent; color:var(--c-muted); border:1px solid var(--c-border-solid); padding:10px 20px; border-radius:8px; cursor:pointer;">Cancel</button>'
        + '</div></div>';
    
    modal.style.display = 'flex';
}

export function sendVerificationRequest() {
    var skillNames = Array.from(arguments);
    var verifierName = document.getElementById('verifyName').value.trim();
    var verifierEmail = document.getElementById('verifyEmail').value.trim();
    var relationship = document.getElementById('verifyRelationship').value;
    var personalNote = document.getElementById('verifyNote').value.trim();
    
    if (!verifierName || !verifierEmail) {
        showToast('Name and email are required.', 'warning');
        return;
    }
    
    var token = 'vrf-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    var profileName = window._userData.profile.name || 'A professional';
    
    // Create verification records
    var records = skillNames.map(function(sn) {
        var skill = (_sd().skills || []).find(function(s) { return s.name === sn; });
        var evidence = skill ? (skill.evidence || []).map(function(e) { return (e.outcome || '') + ' ' + (e.description || ''); }).join('; ') : '';
        
        var record = {
            id: token + '-' + sn.replace(/\s+/g, '-').toLowerCase().substring(0, 20),
            skillName: sn,
            claimedLevel: skill ? skill.level : 'Unknown',
            evidenceSummary: evidence.substring(0, 500),
            verifierName: verifierName,
            verifierEmail: verifierEmail,
            relationship: relationship,
            token: token,
            status: 'pending',
            confirmedLevel: null,
            verifierNote: '',
            requestedAt: new Date().toISOString(),
            respondedAt: null
        };
        
        // Store locally
        if (!window._userData.verifications) window._userData.verifications = [];
        window._userData.verifications.push(record);
        
        return record;
    });
    
    // Save to Firestore if available
    if (fbUser && fbDb) {
        records.forEach(function(rec) {
            fbDb.collection('users').doc(fbUser.uid).collection('verifications').doc(rec.id).set(rec)
                .catch(function(err) { console.error('Verification save error:', err); showToast('Verification could not be saved: ' + err.message, 'error'); });
        });
        saveToFirestore();
    }
    saveAll();
    
    // Build verification URL
    var baseUrl = window.location.origin + window.location.pathname;
    var verifyUrl = baseUrl + '?verify=' + token + (fbUser ? '&uid=' + fbUser.uid : '');
    
    // Build email
    var skillsSummary = records.map(function(r) {
        return '  • ' + r.skillName + ' (claimed: ' + r.claimedLevel + ')\n    Evidence: ' + (r.evidenceSummary || 'None provided').substring(0, 200);
    }).join('\n\n');
    
    var subject = encodeURIComponent('Skill Verification Request from ' + profileName);
    var body = encodeURIComponent(
        'Hi ' + verifierName + ',\n\n'
        + (personalNote ? personalNote + '\n\n' : '')
        + profileName + ' is requesting your verification of the following professional skills:\n\n'
        + skillsSummary + '\n\n'
        + 'To verify, please visit:\n' + verifyUrl + '\n\n'
        + 'You can confirm, suggest a different level, or decline. Your response helps validate professional expertise through Blueprint.\n\n'
        + 'Thank you for your time.\n\n'
        + '---\nGenerated by Blueprint\u2122 · ' + new Date().toLocaleDateString() + ' · myblueprint.work'
    );
    
    // Open mailto
    window.open('mailto:' + verifierEmail + '?subject=' + subject + '&body=' + body);
    
    closeExportModal();
    showToast('Verification request created for ' + records.length + ' skill(s). Email client opened.', 'success');
}

// Mark a verification as confirmed with optional level suggestion
export function confirmVerification(verificationId, confirmedLevel) {
    var vIdx = (window._userData.verifications || []).findIndex(function(v) { return v.id === verificationId; });
    if (vIdx >= 0) {
        window._userData.verifications[vIdx].status = 'confirmed';
        window._userData.verifications[vIdx].respondedAt = new Date().toISOString();
        if (confirmedLevel && confirmedLevel !== 'confirm') {
            window._userData.verifications[vIdx].confirmedLevel = confirmedLevel;
        } else {
            window._userData.verifications[vIdx].confirmedLevel = window._userData.verifications[vIdx].claimedLevel;
        }
        saveAll();
        showToast('Verification confirmed.', 'success');
    }
}

export function declineVerification(verificationId) {
    var vIdx = (window._userData.verifications || []).findIndex(function(v) { return v.id === verificationId; });
    if (vIdx >= 0) {
        window._userData.verifications[vIdx].status = 'declined';
        window._userData.verifications[vIdx].respondedAt = new Date().toISOString();
        saveAll();
        showToast('Verification declined.', 'info');
    }
}

// Profile-level verification stats
export function getVerificationStats() {
    var skills = _sd().skills || [];
    var total = skills.length;
    var verifications = window._userData.verifications || [];
    var confirmedSkillNames = {};
    verifications.forEach(function(v) {
        if (v.status === 'confirmed') confirmedSkillNames[v.skillName] = true;
    });
    var verifiedCount = skills.filter(function(s) { return confirmedSkillNames[s.name]; }).length;
    var pendingCount = verifications.filter(function(v) { return v.status === 'pending'; }).length;
    
    return {
        total: total,
        verified: verifiedCount,
        pending: pendingCount,
        unverified: total - verifiedCount
    };
}

// Expose verification functions
if (!window.requestVerification) window.requestVerification = requestVerification;
if (!window.sendVerificationRequest) window.sendVerificationRequest = sendVerificationRequest;
if (!window.confirmVerification) window.confirmVerification = confirmVerification;
if (!window.declineVerification) window.declineVerification = declineVerification;
if (!window.getVerificationStats) window.getVerificationStats = getVerificationStats;

// ===== VERIFICATION EXPIRY (v4.44.35) =====
// Auto-expire pending verifications older than configured TTL
export function expireStalePendingVerifications() {
    var verifications = window._userData.verifications || [];
    var ttlMs = (evidenceConfig.verificationExpiryDays || 30) * 24 * 60 * 60 * 1000;
    var now = Date.now();
    var expired = 0;
    verifications.forEach(function(v) {
        if (v.status === 'pending' && v.requestedAt) {
            var requestedMs = new Date(v.requestedAt).getTime();
            if (now - requestedMs > ttlMs) {
                v.status = 'expired';
                v.respondedAt = new Date().toISOString();
                expired++;
            }
        }
    });
    if (expired > 0) {
        console.log('Verification expiry: marked ' + expired + ' pending request(s) as expired');
        saveAll();
    }
}

// Get credibility weight label for display
export function getCredibilityLabel(relationship) {
    var weight = evidenceConfig.credibilityWeights[relationship] || 1.2;
    if (weight >= 2.0) return { label: 'Highest', color: '#10b981', weight: weight };
    if (weight >= 1.8) return { label: 'High', color: '#60a5fa', weight: weight };
    if (weight >= 1.5) return { label: 'Standard', color: '#a78bfa', weight: weight };
    return { label: 'Basic', color: '#9ca3af', weight: weight };
}
if (!window.getCredibilityLabel) window.getCredibilityLabel = getCredibilityLabel;
if (!window.expireStalePendingVerifications) window.expireStalePendingVerifications = expireStalePendingVerifications;

// ===== VERIFIER LANDING PAGE (v4.44.35) =====
// When someone visits ?verify=TOKEN&uid=UID, show standalone verification UI
export function checkVerificationLandingPage() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('verify');
    var uid = params.get('uid');
    if (!token || !uid) return false;
    
    // We have a verification URL — show the landing page
    showVerifierLandingPage(token, uid);
    return true;
}

// ===== ADMIN SHOWCASE MODE (v4.44.36) =====
// URL: myblueprint.work?showcase=blueprint-demo-2026
// Loads admin profile as read-only with full admin UI, no auth required
// Sensitive data (emails, API keys, user PII) redacted
export function checkShowcaseMode() {
    var params = new URLSearchParams(window.location.search);
    var key = params.get('showcase');
    if (!key || key !== SHOWCASE_CONFIG.key) return false;
    
    // Activate showcase mode globals
    showcaseMode = true;
    fbIsAdmin = true;
    window.isReadOnlyProfile = true;
    appMode = 'showcase';
    
    console.log('🎭 Showcase mode activated');
    
    // Run async init
    initShowcaseMode();
    return true;
}

async function initShowcaseMode() {
    initTheme();
    
    var sp = document.getElementById('splashProgress');
    if (sp) sp.style.width = '30%';
    
    // Load data libraries in parallel
    try {
        var libResults = await Promise.allSettled([
            fetch('onet-skills-library.json').then(r => r.json()),
            fetch('onet-abilities-library.json').then(r => r.json()),
            fetch('onet-workstyles-library.json').then(r => r.json()),
            fetch('onet-knowledge-library.json').then(r => r.json()),
            fetch('onet-work-activities-library.json').then(r => r.json()),
            fetch('trades-creative-library.json').then(r => r.json()),
            fetch('values-library.json').then(r => r.json()),
            fetch('bls-wages.json').then(r => r.json()),
            fetch('companies.json').then(r => r.json())
        ]);
        
        var libNames = ['onetSkillsLibrary','onetAbilitiesLibrary','onetWorkstylesLibrary',
            'onetKnowledgeLibrary','onetWorkActivitiesLibrary','tradesCreativeLibrary',
            'valuesLibrary','blsWages','companiesData'];
        libResults.forEach(function(r, i) {
            if (r.status === 'fulfilled') window[libNames[i]] = r.value;
        });
        console.log('✓ Data libraries loaded for showcase');
        setTimeout(_loadCrosswalkDeferred, 100);
    } catch(e) {
        console.warn('⚠ Library load error:', e);
    }
    
    if (sp) sp.style.width = '50%';
    
    // Load profiles manifest (for admin overview counts)
    try {
        var manifest = await fetch('profiles-manifest.json?v=' + Date.now()).then(r => r.json());
        if (Array.isArray(manifest)) manifest = { profiles: manifest };
        window.profilesManifest = manifest;
        var enabledProfiles = manifest.profiles.filter(function(p) { return p.enabled; });
        var cb = '?v=' + Date.now();
        await Promise.allSettled(enabledProfiles.map(function(pm) {
            return fetch(pm.path + cb).then(function(r) { return r.json(); }).then(function(tpl) {
                templates[pm.id] = tpl;
            });
        }));
    } catch(e) {
        console.warn('⚠ Manifest load error:', e);
    }
    
    if (sp) sp.style.width = '70%';
    
    // Load showcase profile
    try {
        var profileData = await fetch('profiles/showcase/admin-demo.json?v=' + Date.now()).then(r => r.json());
        
        userData = {
            initialized: true,
            profile: profileData.profile || {},
            skills: profileData.skills || [],
            skillDetails: profileData.skillDetails || {},
            values: profileData.values || [],
            purpose: profileData.purpose || '',
            roles: (profileData.roles || []).map(function(r) { if (!r.id) r.id = r.name; return r; }),
            workHistory: profileData.workHistory || [],
            education: profileData.education || [],
            certifications: profileData.certifications || [],
            verifications: profileData.verifications || [],
            preferences: profileData.preferences || {},
            templateId: 'admin-showcase'
        };
        window._userData = userData;
        
        console.log('✓ Showcase profile loaded:', window._userData.skills.length, 'skills');
    } catch(e) {
        console.error('✗ Failed to load showcase profile:', e);
        showcaseMode = false;
        window.location.href = window.location.pathname; // Fallback to normal app
        return;
    }
    
    if (sp) sp.style.width = '90%';
    
    // Set up header for showcase
    var authBtn = document.getElementById('authNavBtn');
    if (authBtn) authBtn.style.display = 'none';
    var overflowSignIn = document.getElementById('overflowSignIn');
    if (overflowSignIn) overflowSignIn.style.display = 'none';
    var overflowSignOut = document.getElementById('overflowSignOut');
    if (overflowSignOut) overflowSignOut.style.display = 'none';
    
    // Show admin badge and overflow admin button
    var adminBadge = document.getElementById('adminBadge');
    if (adminBadge) adminBadge.style.display = 'inline-block';
    var overflowAdmin = document.getElementById('overflowAdmin');
    if (overflowAdmin) overflowAdmin.style.display = '';
    
    // Show profile chip with showcase identity
    var profileChip = document.getElementById('profileChip');
    if (profileChip) profileChip.style.display = '';
    var nameEl = document.getElementById('profileChipName');
    if (nameEl) nameEl.textContent = window._userData.profile.name || 'Admin Showcase';
    var avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) avatarEl.textContent = getInitials(window._userData.profile.name || 'AS');
    
    // Add showcase banner
    var header = document.querySelector('.header');
    if (header) {
        var banner = document.createElement('div');
        banner.id = 'showcaseBanner';
        banner.style.cssText = 'display:block; text-align:center; padding:10px 16px; font-size:0.88em; '
            + 'background:linear-gradient(135deg, rgba(251,191,36,0.12), rgba(139,92,246,0.12)); '
            + 'border-bottom:1px solid rgba(251,191,36,0.25); color:var(--text-secondary);';
        banner.innerHTML = '<span style="color:#fbbf24; font-weight:700;">' + bpIcon('shield', 14) + ' SHOWCASE MODE</span>'
            + ' &mdash; ' + SHOWCASE_CONFIG.bannerText
            + ' &bull; <a href="' + window.location.pathname + '" style="color:var(--accent); text-decoration:underline;">Exit showcase</a>';
        header.parentNode.insertBefore(banner, header.nextSibling);
    }
    
    // Add readonly body class
    document.body.classList.add('readonly-mode');
    
    // Hydrate SVG icons (normally done in initializeApp which showcase skips)
    hydrateIcons();
    
    // Expire stale verifications
    if (typeof expireStalePendingVerifications === 'function') expireStalePendingVerifications();
    
    // Initialize card view
    if (typeof initCardView === 'function') initCardView();
    
    bpTracker.init();
    bpTracker.trackFunnel('visit');
    bpTracker.trackFeature('showcase_visit', { referrer: document.referrer || 'direct' });

    // Navigate to admin dashboard (showcase landing)
    switchView('admin');
    
    // Dismiss splash
    var splash = document.getElementById('appSplash');
    if (splash) {
        if (sp) sp.style.width = '100%';
        setTimeout(function() {
            splash.style.opacity = '0';
            setTimeout(function() { splash.remove(); }, 400);
        }, 300);
    }
    
    console.log('🎭 Showcase mode ready');
}

export function showVerifierLandingPage(token, uid) {
    // Hide all normal app UI
    Array.from(document.body.children).forEach(function(child) {
        if (child.nodeType === 1) child.style.display = 'none';
    });
    
    // Create standalone verification container
    var container = document.createElement('div');
    container.id = 'verifierLanding';
    container.style.cssText = 'min-height:100vh; background:var(--bg, #0f172a); color:#e2e8f0; display:flex; align-items:center; justify-content:center; padding:20px; font-family:Inter,system-ui,sans-serif;';
    container.innerHTML = '<div style="max-width:640px; width:100%; text-align:center;">'
        + '<div style="margin-bottom:32px;">'
        + '<div style="font-family:Outfit,sans-serif; font-size:1.4em; font-weight:700; letter-spacing:0.12em; color:#60a5fa;">BLUEPRINT\u2122</div>'
        + '<div style="font-size:0.85em; color:#94a3b8; margin-top:4px;">Skill Verification</div>'
        + '</div>'
        + '<div id="verifyLandingContent" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:32px;">'
        + '<div style="color:#94a3b8;">Loading verification request\u2026</div>'
        + '</div>'
        + '<div style="margin-top:24px; font-size:0.75em; color:#475569;">Powered by Blueprint\u2122 Career Intelligence \u00B7 myblueprint.work</div>'
        + '</div>';
    document.body.appendChild(container);
    
    // Fetch verification data from serverless proxy
    fetchVerificationData(token, uid);
}

export function fetchVerificationData(token, uid) {
    var el = document.getElementById('verifyLandingContent');
    
    // Try the serverless API first
    fetch('/api/verify?token=' + encodeURIComponent(token) + '&uid=' + encodeURIComponent(uid))
        .then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(function(data) {
            if (!data.records || data.records.length === 0) {
                el.innerHTML = '<div style="color:#ef4444; font-size:1.1em; font-weight:600; margin-bottom:12px;">Verification Not Found</div>'
                    + '<div style="color:#94a3b8;">This verification link may have expired or already been completed.</div>';
                return;
            }
            renderVerifierForm(data.records, data.profileName || 'A professional', token, uid);
        })
        .catch(function(err) {
            console.warn('Verify API error:', err);
            // Fallback: try direct Firestore read if user happens to be signed in
            if (typeof fbDb !== 'undefined' && fbDb) {
                fbDb.collection('users').doc(uid).get()
                    .then(function(doc) {
                        if (!doc.exists) throw new Error('User not found');
                        var d = doc.data();
                        var vRecords = (d.verifications || []).filter(function(v) { return v.token === token && v.status === 'pending'; });
                        if (vRecords.length === 0) {
                            el.innerHTML = '<div style="color:#ef4444; font-size:1.1em; font-weight:600; margin-bottom:12px;">Verification Not Found</div>'
                                + '<div style="color:#94a3b8;">This link may have expired or been completed already.</div>';
                            return;
                        }
                        renderVerifierForm(vRecords, d.profile ? d.profile.name : 'A professional', token, uid);
                    })
                    .catch(function(e2) {
                        el.innerHTML = '<div style="color:#ef4444; font-size:1.1em; font-weight:600; margin-bottom:12px;">Unable to Load</div>'
                            + '<div style="color:#94a3b8;">The verification API is not yet deployed. Please ask the profile owner to deploy <code>/api/verify.js</code> to Vercel.</div>';
                    });
            } else {
                el.innerHTML = '<div style="color:#ef4444; font-size:1.1em; font-weight:600; margin-bottom:12px;">Unable to Load</div>'
                    + '<div style="color:#94a3b8;">Could not connect to the verification service. The link may be invalid.</div>';
            }
        });
}

export function renderVerifierForm(records, profileName, token, uid) {
    var el = document.getElementById('verifyLandingContent');
    
    var skillCards = records.map(function(rec, idx) {
        var cred = getCredibilityLabel(rec.relationship || 'Other');
        return '<div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:20px; margin-bottom:12px; text-align:left;">'
            + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">'
            + '<div style="font-weight:700; font-size:1.05em; color:#e2e8f0;">' + escapeHtml(rec.skillName) + '</div>'
            + '<div style="font-size:0.75em; padding:3px 10px; border-radius:12px; background:rgba(96,165,250,0.15); color:#60a5fa;">Claimed: ' + escapeHtml(rec.claimedLevel) + '</div>'
            + '</div>'
            + (rec.evidenceSummary ? '<div style="font-size:0.82em; color:#94a3b8; margin-bottom:12px; line-height:1.5;">' + escapeHtml(rec.evidenceSummary).substring(0, 300) + '</div>' : '')
            + '<div style="margin-bottom:8px;">'
            + '<label style="font-size:0.82em; color:#94a3b8; display:block; margin-bottom:4px;">Your assessment of this skill level:</label>'
            + '<select id="verifyLevel_' + idx + '" style="width:100%; padding:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#e2e8f0; font-size:0.9em;">'
            + '<option value="confirm">\u2713 Confirm ' + escapeHtml(rec.claimedLevel) + ' level</option>'
            + '<option value="Mastery">Suggest: Mastery</option>'
            + '<option value="Expert">Suggest: Expert</option>'
            + '<option value="Advanced">Suggest: Advanced</option>'
            + '<option value="Proficient">Suggest: Proficient</option>'
            + '<option value="Competent">Suggest: Competent</option>'
            + '<option value="decline">\u2717 Decline to verify</option>'
            + '</select></div>'
            + '</div>';
    }).join('');
    
    el.innerHTML = '<div style="text-align:left;">'
        + '<div style="margin-bottom:20px;">'
        + '<div style="font-size:1.2em; font-weight:700; color:#e2e8f0; margin-bottom:6px;">'
        + escapeHtml(profileName) + ' has requested your verification</div>'
        + '<div style="font-size:0.88em; color:#94a3b8; line-height:1.5;">Please review the skills below and confirm, suggest a different level, or decline. '
        + 'Your verification strengthens their professional credibility.</div>'
        + '</div>'
        
        + '<div style="margin-bottom:16px;">' + skillCards + '</div>'
        
        + '<div style="margin-bottom:16px;">'
        + '<label style="font-size:0.82em; color:#94a3b8; display:block; margin-bottom:4px;">Add a note (optional):</label>'
        + '<textarea id="verifyResponseNote" rows="3" style="width:100%; padding:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#e2e8f0; font-size:0.88em; resize:vertical; box-sizing:border-box;" '
        + 'placeholder="Any additional context about your professional assessment\u2026"></textarea></div>'
        
        + '<div style="margin-bottom:16px;">'
        + '<label style="font-size:0.82em; color:#94a3b8; display:block; margin-bottom:4px;">Your name (for attribution):</label>'
        + '<input type="text" id="verifyResponseName" value="' + escapeHtml(records[0].verifierName || '') + '" '
        + 'style="width:100%; padding:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#e2e8f0; font-size:0.9em; box-sizing:border-box;"></div>'
        
        + '<button onclick="submitVerifierResponse(\'' + escapeHtml(token).replace(/'/g,"\\'") + '\',\'' + escapeHtml(uid).replace(/'/g,"\\'") + '\',' + records.length + ')" '
        + 'style="width:100%; padding:14px; background:linear-gradient(135deg, #60a5fa, #8b5cf6); color:#fff; border:none; border-radius:10px; font-weight:700; font-size:1em; cursor:pointer; transition:opacity 0.2s;" '
        + 'onmouseover="this.style.opacity=\'0.9\'" onmouseout="this.style.opacity=\'1\'">Submit Verification</button>'
        + '</div>';
}

export function submitVerifierResponse(token, uid, count) {
    var responses = [];
    for (var i = 0; i < count; i++) {
        var sel = document.getElementById('verifyLevel_' + i);
        if (sel) responses.push(sel.value);
    }
    var note = (document.getElementById('verifyResponseNote') || {}).value || '';
    var name = (document.getElementById('verifyResponseName') || {}).value || '';
    
    var payload = {
        token: token,
        uid: uid,
        responses: responses,
        note: note.trim(),
        verifierName: name.trim(),
        respondedAt: new Date().toISOString()
    };
    
    // Submit to serverless API
    var el = document.getElementById('verifyLandingContent');
    
    fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
    })
    .then(function(data) {
        el.innerHTML = '<div style="text-align:center; padding:40px 20px;">'
            + '<div style="font-size:3em; margin-bottom:16px;">\u2705</div>'
            + '<div style="font-size:1.3em; font-weight:700; color:#10b981; margin-bottom:12px;">Verification Submitted</div>'
            + '<div style="color:#94a3b8; line-height:1.6;">Thank you for verifying ' + escapeHtml(data.profileName || 'this professional') + '\'s skills. '
            + 'Your assessment has been recorded and will strengthen their Blueprint profile.</div>'
            + '<div style="margin-top:24px; padding:16px; background:rgba(16,185,129,0.1); border-radius:10px; font-size:0.85em; color:#94a3b8;">'
            + 'Verification weight: <strong style="color:#10b981;">' + (data.credibilityLabel || 'Standard') + '</strong></div>'
            + '</div>';
    })
    .catch(function(err) {
        console.warn('Verify submit error:', err);
        el.innerHTML = '<div style="text-align:center; padding:40px 20px;">'
            + '<div style="font-size:3em; margin-bottom:16px;">\u26A0\uFE0F</div>'
            + '<div style="font-size:1.1em; font-weight:600; color:#f59e0b; margin-bottom:12px;">Submission Issue</div>'
            + '<div style="color:#94a3b8;">The verification API may not be deployed yet. Your response was:</div>'
            + '<pre style="text-align:left; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; margin-top:12px; font-size:0.8em; color:#94a3b8; overflow-x:auto;">' + JSON.stringify(payload, null, 2) + '</pre>'
            + '<div style="margin-top:12px; font-size:0.82em; color:#64748b;">Please share this response with the profile owner.</div>'
            + '</div>';
    });
}
if (!window.submitVerifierResponse) window.submitVerifierResponse = submitVerifierResponse;

// ===== EVIDENCE CRUD (v4.16.1) =====

export function addOutcomeToSkill(skillName) {
    if (readOnlyGuard()) return;
    showOutcomeForm(skillName, -1);
}

export function editSkillOutcome(skillName, idx) {
    if (readOnlyGuard()) return;
    showOutcomeForm(skillName, idx);
}

export function removeOutcome(skillName, idx) {
    if (readOnlyGuard()) return;
    var skill = (_sd().skills || []).find(function(s) { return s.name === skillName; });
    var userSkill = (window._userData.skills || []).find(function(s) { return s.name === skillName; });
    if (!skill || !skill.evidence || idx < 0 || idx >= skill.evidence.length) return;
    
    skill.evidence.splice(idx, 1);
    if (userSkill && userSkill.evidence) userSkill.evidence.splice(idx, 1);
    
    saveAll();
    // Re-open skill modal to refresh
    closeSkillModal();
    setTimeout(function() { openSkillModal(skillName, skill); }, 100);
    showToast('Outcome removed.', 'info');
}

export function showOutcomeForm(skillName, idx) {
    var skill = (_sd().skills || []).find(function(s) { return s.name === skillName; });
    if (!skill) return;
    if (!skill.evidence) skill.evidence = [];
    
    var existing = idx >= 0 ? skill.evidence[idx] : { description: '', outcome: '' };
    var isEdit = idx >= 0;
    var escapedName = escapeHtml(skillName).replace(/'/g, "\\'");
    
    // Inject form into the evidence list area of the open modal
    var container = document.getElementById('skillEvidenceList');
    if (!container) {
        // Fallback: use export modal
        var modal = document.getElementById('exportModal');
        var mc = modal.querySelector('.modal-content');
        container = mc;
    }
    
    // Calculate live score preview
    var previewText = ((existing.outcome || '') + ' ' + (existing.description || '')).trim();
    var previewScore = previewText ? scoreOutcome(previewText) : 0;
    
    var formHTML = '<div id="outcomeFormContainer" style="padding:16px; margin:8px 0; background:var(--c-green-bg-1a); '
        + 'border:1px solid var(--c-green-bg-6); border-radius:10px;">'
        + '<div style="font-weight:700; font-size:0.88em; color:var(--c-success); margin-bottom:12px;">'
        + (isEdit ? '\u270E Edit Outcome' : '+ New Outcome') + '</div>'
        
        + '<div class="settings-group" style="margin-bottom:10px;">'
        + '<label class="settings-label" style="font-size:0.82em;">What was the measurable result? *</label>'
        + '<input type="text" class="settings-input" id="outcomeResult" '
        + 'value="' + escapeHtml(existing.outcome || '') + '" '
        + 'placeholder="e.g., Increased pipeline velocity 40% saving $2.3M annually" '
        + 'oninput="updateOutcomeScorePreview()" '
        + 'style="font-size:0.88em;">'
        + '<div class="settings-help">Include numbers, dollars, percentages, or scale for maximum evidence points</div>'
        + '</div>'
        
        + '<div class="settings-group" style="margin-bottom:10px;">'
        + '<label class="settings-label" style="font-size:0.82em;">Context: what did you do?</label>'
        + '<textarea class="settings-input" id="outcomeDescription" rows="2" '
        + 'placeholder="e.g., Redesigned the lead qualification process across 3 sales teams" '
        + 'oninput="updateOutcomeScorePreview()" '
        + 'style="font-size:0.88em; resize:vertical;">' + escapeHtml(existing.description || '') + '</textarea>'
        + '</div>'
        
        + '<div style="display:flex; justify-content:space-between; align-items:center;">'
        + '<div id="outcomeScorePreview" style="font-size:0.82em; color:var(--c-muted);">'
        + 'Score: <strong>' + previewScore + '</strong> pts</div>'
        + '<div style="display:flex; gap:8px;">'
        + '<button onclick="saveOutcomeForm(\'' + escapedName + '\',' + idx + ')" '
        + 'style="padding:7px 18px; background:#10b981; color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85em;">'
        + (isEdit ? 'Save' : 'Add Outcome') + '</button>'
        + '<button onclick="cancelOutcomeForm(\'' + escapedName + '\')" '
        + 'style="padding:7px 14px; background:transparent; color:var(--c-muted); border:1px solid var(--c-border-solid); border-radius:6px; cursor:pointer; font-size:0.85em;">'
        + 'Cancel</button>'
        + '</div></div>'
        + '</div>';
    
    // Insert at top of evidence list
    var existingForm = document.getElementById('outcomeFormContainer');
    if (existingForm) existingForm.remove();
    container.insertAdjacentHTML('afterbegin', formHTML);
    
    // Focus the result field
    var resultField = document.getElementById('outcomeResult');
    if (resultField) resultField.focus();
}

export function updateOutcomeScorePreview() {
    var result = (document.getElementById('outcomeResult') || {}).value || '';
    var desc = (document.getElementById('outcomeDescription') || {}).value || '';
    var text = (result + ' ' + desc).trim();
    var score = text ? scoreOutcome(text) : 0;
    var preview = document.getElementById('outcomeScorePreview');
    if (preview) {
        var color = score >= 4 ? '#10b981' : score >= 2.5 ? '#60a5fa' : 'var(--c-muted)';
        preview.innerHTML = 'Score: <strong style="color:' + color + ';">' + score + '</strong> pts'
            + (score >= 4 ? ' \uD83D\uDD25 High impact' : score >= 2.5 ? ' \u2714 Solid' : score > 0 ? ' \u2197 Add metrics for more' : '');
    }
}

export function saveOutcomeForm(skillName, idx) {
    if (readOnlyGuard()) return;
    var result = (document.getElementById('outcomeResult') || {}).value.trim();
    var desc = (document.getElementById('outcomeDescription') || {}).value.trim();
    
    if (!result) { showToast('Outcome result is required.', 'warning'); return; }
    
    var skill = (_sd().skills || []).find(function(s) { return s.name === skillName; });
    var userSkill = (window._userData.skills || []).find(function(s) { return s.name === skillName; });
    if (!skill) return;
    if (!skill.evidence) skill.evidence = [];
    if (userSkill && !userSkill.evidence) userSkill.evidence = [];
    
    var entry = { description: desc, outcome: result };
    
    if (idx >= 0 && idx < skill.evidence.length) {
        skill.evidence[idx] = entry;
        if (userSkill && userSkill.evidence) userSkill.evidence[idx] = entry;
    } else {
        skill.evidence.push(entry);
        if (userSkill && userSkill.evidence) userSkill.evidence.push(entry);
    }
    
    saveAll();
    
    // Refresh skill modal
    closeSkillModal();
    setTimeout(function() { openSkillModal(skillName, skill); }, 100);
    showToast(idx >= 0 ? 'Outcome updated.' : 'Outcome added. Evidence points recalculated.', 'success');
}

export function cancelOutcomeForm(skillName) {
    var form = document.getElementById('outcomeFormContainer');
    if (form) form.remove();
}

if (!window.addOutcomeToSkill) window.addOutcomeToSkill = addOutcomeToSkill;
if (!window.editSkillOutcome) window.editSkillOutcome = editSkillOutcome;
if (!window.removeOutcome) window.removeOutcome = removeOutcome;
if (!window.showOutcomeForm) window.showOutcomeForm = showOutcomeForm;
if (!window.updateOutcomeScorePreview) window.updateOutcomeScorePreview = updateOutcomeScorePreview;
if (!window.saveOutcomeForm) window.saveOutcomeForm = saveOutcomeForm;
if (!window.cancelOutcomeForm) window.cancelOutcomeForm = cancelOutcomeForm;

// ===== END EVIDENCE & VERIFICATION ENGINE =====

let skillValuations = {
    skillBaseValues: {},
    proficiencyMultipliers: { 
        "Novice": 0.7, 
        "Proficient": 1.0, 
        "Advanced": 1.5, 
        "Expert": 1.9, 
        "Mastery": 2.2 
    },
    locationMultipliers: {},
    demandFactors: {},
    rarityBonuses: {},
    roleBenchmarks: {}
};

// Load skill valuations from JSON
var certLibrary = { credentials: [], tiers: {} };

fetch('certification_library.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
        certLibrary = data;
        console.log('\u2705 Certification library loaded: ' + data.totalCredentials + ' credentials');
        // Chain: load Lightcast certifications if available
        return fetch('certifications/lightcast-certs.json').then(function(r2) { return r2.json(); }).then(function(lcData) {
            if (lcData && lcData.credentials && lcData.credentials.length > 0) {
                // Deduplicate: only add certs not already in the base library
                var existingNames = new Set(certLibrary.credentials.map(function(c) { return c.name.toLowerCase(); }));
                var existingAbbrs = new Set(certLibrary.credentials.map(function(c) { return (c.abbr || '').toLowerCase(); }));
                var added = 0;
                lcData.credentials.forEach(function(lc) {
                    var lcName = (lc.name || '').toLowerCase();
                    var lcAbbr = (lc.abbr || '').toLowerCase();
                    if (!existingNames.has(lcName) && (!lcAbbr || !existingAbbrs.has(lcAbbr))) {
                        lc.source = lc.source || 'lightcast';
                        certLibrary.credentials.push(lc);
                        existingNames.add(lcName);
                        if (lcAbbr) existingAbbrs.add(lcAbbr);
                        added++;
                    }
                });
                certLibrary.totalCredentials = certLibrary.credentials.length;
                if (added > 0) console.log('\u2705 Lightcast certifications merged: +' + added + ' new (' + certLibrary.credentials.length + ' total)');
            }
        }).catch(function() { /* Lightcast certs file not deployed yet — base library still works */ });
    })
    .catch(function(e) { console.warn('\u26A0\uFE0F Could not load certification library:', e); });

// Search certification library by name, abbreviation, or description
// searchCertLibrary — provided by imported module


// Find a specific cert by abbreviation or exact name
// findCertInLibrary — provided by imported module


// Get skill associations for a cert (curated first, fallback to category matching)
export function getCertSkillAssociations(cert) {
    if (!cert) return [];
    // Curated maps take priority
    if (cert.skills && cert.skills.length > 0) return cert.skills.slice();
    // Fallback: match cert category keywords to profile skill names
    return getFallbackSkillMatches(cert);
}

// Fallback: keyword matching between cert description/category and profile skills
export function getFallbackSkillMatches(cert) {
    if (!cert) return [];
    var keywords = (cert.description + ' ' + cert.category + ' ' + cert.name)
        .toLowerCase().split(/[\s,.\-\/]+/).filter(function(w) { return w.length > 3; });
    // Remove common stop words
    var stops = ['and','the','for','with','from','that','this','level','based','state','national','professional','certified','certification','license','advanced'];
    keywords = keywords.filter(function(w) { return stops.indexOf(w) < 0; });
    
    var matches = [];
    (_sd().skills || []).forEach(function(skill) {
        var sn = skill.name.toLowerCase();
        var matchCount = keywords.filter(function(kw) { return sn.includes(kw); }).length;
        if (matchCount > 0) matches.push({ name: skill.name, score: matchCount });
    });
    matches.sort(function(a, b) { return b.score - a.score; });
    return matches.slice(0, 6).map(function(m) { return m.name; });
}

// Get cert floor level based on tier
export function getCertFloorLevel(cert) {
    if (!cert) return evidenceConfig.certFloor;
    return cert.tier === 2 ? 'Advanced' : 'Proficient';
}

// Get cert floor POINTS based on tier
// [removed] getCertFloorPoints — dead code cleanup v4.22.0

// Expose
if (!window.searchCertLibrary) window.searchCertLibrary = searchCertLibrary;
if (!window.findCertInLibrary) window.findCertInLibrary = findCertInLibrary;
if (!window.getCertSkillAssociations) window.getCertSkillAssociations = getCertSkillAssociations;
if (!window.getCertFloorLevel) window.getCertFloorLevel = getCertFloorLevel;

fetch('skill_valuations.json')
    .then(response => response.json())
    .then(data => {
        skillValuations = data;
        console.log('✅ Skill valuations loaded');
        // Recalculate values if already rendered
        if (document.getElementById('totalMarketValue')) {
            updateMarketValueDisplay();
        }
    })
    .catch(error => {
        console.warn('⚠️ Could not load skill valuations, using defaults:', error);
    });

// Data structure
const skillsData = {
    roles: [
        { id: "strategy", name: "VP Global Strategy", icon: "target", color: "#fb923c" },
        { id: "futurist", name: "Futurist & Evangelist", icon: "zap", color: "#f59e0b" },
        { id: "pilot", name: "IFR Pilot", icon: "compass", color: "#3b82f6" },
        { id: "musician", name: "Musician", icon: "heart", color: "#8b5cf6" },
        { id: "advocate", name: "Recovery Advocate", icon: "heart", color: "#10b981" },
        { id: "tech", name: "Technology Strategist", icon: "settings", color: "#06b6d4" },
        { id: "creative", name: "Creative Director", icon: "creative", color: "#ec4899" },
        { id: "operations", name: "Operations Leader", icon: "layers", color: "#f97316" },
        { id: "entrepreneur", name: "Entrepreneur", icon: "trending-up", color: "#a855f7" }
    ],
    
    skills: [
        // Strategic Core
        { name: "Enterprise AI Strategy", level: "Mastery", roles: ["strategy", "futurist", "tech"], key: false },
        { name: "Go-to-Market Strategy", level: "Advanced", roles: ["strategy", "tech", "entrepreneur"], key: false },
        { name: "Business Case Development", level: "Advanced", roles: ["strategy", "tech", "entrepreneur"], key: false },
        { name: "C-Suite Advisory & Influence", level: "Advanced", roles: ["strategy", "futurist"], key: false },
        { name: "Customer Advisory Board Leadership", level: "Mastery", roles: ["strategy"], key: false },
        { name: "Strategic Foresight & Market Prediction", level: "Mastery", roles: ["strategy", "futurist"], key: true },
        { name: "Organizational Transformation", level: "Advanced", roles: ["strategy", "tech", "entrepreneur"], key: false },
        { name: "Risk Assessment & Mitigation", level: "Mastery", roles: ["strategy", "pilot", "operations", "entrepreneur"], key: false },
        { name: "Revenue Pipeline Development", level: "Advanced", roles: ["strategy", "operations", "entrepreneur"], key: false },
        { name: "Financial Management & Budget Discipline", level: "Proficient", roles: ["strategy", "operations", "entrepreneur"], key: false },
        
        // Technology & Product
        { name: "AI/ML Product Strategy", level: "Mastery", roles: ["strategy", "tech", "futurist"], key: false },
        { name: "Talent Intelligence Platform Design", level: "Mastery", roles: ["strategy", "tech"], key: false },
        { name: "HR Technology Market Intelligence", level: "Mastery", roles: ["strategy", "futurist"], key: false },
        { name: "Technology Lifecycle & Disruption Analysis", level: "Mastery", roles: ["futurist", "tech"], key: false },
        { name: "Computational & Systems Thinking", level: "Advanced", roles: ["tech", "pilot"], key: false },
        { name: "Platform Integration Architecture", level: "Advanced", roles: ["tech", "entrepreneur"], key: false },
        { name: "Weak Signal Detection & Trend Recognition", level: "Mastery", roles: ["futurist", "strategy"], key: true },
        { name: "Spatial Reasoning & 3D Problem Solving", level: "Mastery", roles: ["pilot", "musician", "creative", "tech"], key: true },
        
        // Futurist & Innovation
        { name: "Technology Trend Forecasting", level: "Mastery", roles: ["futurist", "strategy"], key: true },
        { name: "Predictive Framework Development", level: "Mastery", roles: ["futurist", "strategy"], key: true },
        { name: "Disruptive Innovation Identification", level: "Mastery", roles: ["futurist", "strategy"], key: false },
        { name: "Scenario Planning & Strategic Alternatives", level: "Advanced", roles: ["strategy", "futurist"], key: false },
        { name: "Human-AI Collaboration Model Design", level: "Mastery", roles: ["futurist", "strategy"], key: true },
        
        // Communication & Influence
        { name: "Executive Narrative & Storytelling", level: "Mastery", roles: ["futurist", "strategy"], key: false },
        { name: "Technical Concept Translation", level: "Mastery", roles: ["futurist", "tech", "strategy"], key: true },
        { name: "Public Speaking & Keynote Delivery", level: "Mastery", roles: ["futurist", "musician"], key: false },
        { name: "Thought Leadership Authorship", level: "Mastery", roles: ["futurist"], key: false },
        { name: "Rhetorical Strategy & Persuasion", level: "Mastery", roles: ["futurist", "strategy"], key: false },
        { name: "Media Relations & Spokesperson Work", level: "Mastery", roles: ["futurist"], key: false },
        { name: "Podcast Production & Hosting", level: "Advanced", roles: ["futurist", "musician"], key: false },
        { name: "Real-Time Improvisation", level: "Mastery", roles: ["musician", "futurist"], key: false },
        { name: "Industry Evangelism", level: "Mastery", roles: ["futurist"], key: false },
        { name: "Teaching & Knowledge Transfer", level: "Advanced", roles: ["futurist", "advocate"], key: false },
        
        // Domain Expertise
        { name: "Talent Acquisition Strategy", level: "Mastery", roles: ["strategy"], key: false },
        { name: "Candidate Experience Architecture", level: "Mastery", roles: ["strategy"], key: true },
        { name: "AI Ethics & Responsible Implementation", level: "Advanced", roles: ["strategy", "futurist"], key: false },
        { name: "Workforce Intelligence & Analytics", level: "Mastery", roles: ["strategy"], key: false },
        { name: "Talent Marketplace Dynamics", level: "Advanced", roles: ["strategy", "futurist"], key: false },
        { name: "Behavioral Economics in Talent", level: "Advanced", roles: ["strategy", "futurist"], key: false },
        { name: "Workforce Trends & Future of Work Analysis", level: "Mastery", roles: ["futurist", "strategy"], key: false },
        { name: "Generational Workforce Analysis", level: "Advanced", roles: ["futurist", "strategy"], key: false },
        { name: "AI Impact on Human Work", level: "Mastery", roles: ["futurist", "strategy"], key: false },
        
        // Leadership & Interpersonal
        { name: "Enterprise Client Relationship Management", level: "Mastery", roles: ["strategy", "entrepreneur"], key: false },
        { name: "Strategic Team Building", level: "Advanced", roles: ["strategy", "operations", "tech", "entrepreneur"], key: false },
        { name: "Executive Mentorship", level: "Advanced", roles: ["strategy"], key: false },
        { name: "Multi-Stakeholder Alignment", level: "Advanced", roles: ["strategy", "tech", "entrepreneur"], key: false },
        { name: "Executive Presence & Authority", level: "Mastery", roles: ["strategy", "futurist"], key: false },
        { name: "Crisis Leadership & Decision Making", level: "Mastery", roles: ["pilot", "operations", "advocate", "strategy", "entrepreneur"], key: true },
        { name: "High-Pressure Performance", level: "Mastery", roles: ["pilot", "musician", "operations"], key: false },
        
        // Creative & Performance
        { name: "Creative Direction", level: "Mastery", roles: ["creative", "entrepreneur"], key: false },
        { name: "Live Musical Performance", level: "Mastery", roles: ["musician"], key: false },
        { name: "Music Composition & Arrangement", level: "Advanced", roles: ["musician"], key: false },
        { name: "Music Production & Artist Development", level: "Advanced", roles: ["musician"], key: false },
        { name: "Stage Command & Audience Connection", level: "Mastery", roles: ["musician", "futurist"], key: false },
        { name: "Performance Logistics", level: "Proficient", roles: ["musician"], key: false },
        
        // Aviation
        { name: "Single-Pilot IFR in Complex Airspace", level: "Mastery", roles: ["pilot"], key: false },
        { name: "Single-Pilot Resource Management", level: "Mastery", roles: ["pilot"], key: false },
        { name: "Weather Systems Analysis", level: "Advanced", roles: ["pilot"], key: false },
        { name: "ATC Communication & Coordination", level: "Mastery", roles: ["pilot"], key: false },
        { name: "Emergency Airmanship", level: "Mastery", roles: ["pilot"], key: true },
        { name: "Aeronautical Decision Making Under Uncertainty", level: "Mastery", roles: ["pilot"], key: false },
        { name: "Situational Awareness in Dynamic Environments", level: "Mastery", roles: ["pilot", "operations"], key: false },
        { name: "Multi-Channel Cognitive Load Management", level: "Mastery", roles: ["pilot", "operations"], key: false },
        
        // Analytical & Research
        { name: "Data-Driven Strategy Development", level: "Advanced", roles: ["strategy", "tech"], key: false },
        { name: "Market & Competitive Intelligence", level: "Advanced", roles: ["strategy", "futurist"], key: false },
        { name: "Research Synthesis & Pattern Recognition", level: "Mastery", roles: ["futurist", "strategy"], key: true },
        { name: "Critical Analysis & Evaluation", level: "Advanced", roles: ["strategy", "tech", "futurist"], key: false },
        
        // Advocacy
        { name: "Leadership Through Lived Experience", level: "Mastery", roles: ["advocate"], key: false },
        { name: "Mental Health & Addiction Advocacy", level: "Mastery", roles: ["advocate"], key: false },
        { name: "Nonprofit Founding & Operations", level: "Advanced", roles: ["advocate", "entrepreneur"], key: false },
        { name: "Authentic Leadership & Trust Building", level: "Mastery", roles: ["advocate", "futurist"], key: true },
        { name: "Culture Change & Inclusion Initiatives", level: "Advanced", roles: ["advocate"], key: false },
        { name: "Complex Problem Diagnosis & Resolution", level: "Advanced", roles: ["advocate"], key: false }
    ],
    
    skillDetails: {} // Will be loaded from skill_evidence.json
};

// ===== v2.0: USER DATA MANAGEMENT SYSTEM =====

let userData = {
    initialized: false,
    profile: {
        name: "",
        email: "",
        phone: "",
        linkedinUrl: "",
        location: "Remote"
    },
    skills: [],
    skillDetails: {},
    values: [],
    purpose: "",
    roles: [],
    workHistory: [],
    education: [],
    certifications: [],
    verifications: [],
    preferences: {
        seniorityLevel: "Mid-Career",
        targetTitles: [],
        seniorityKeywords: ['vp', 'vice president', 'chief', 'head of', 'director', 'principal', 'senior director'],
        excludeRoles: ['engineer', 'developer', 'designer', 'analyst', 'coordinator', 'specialist', 
                      'junior', 'mid-level', 'associate', 'intern', 'entry', 'qa', 'frontend', 'backend',
                      'full stack', 'fullstack', 'software', 'devops', 'ui/ux', 'data scientist'],
        strategicKeywords: ['strategy', 'strategic', 'transformation', 'innovation', 'evangelist', 
                           'thought leader', 'advisory', 'ai', 'ml', 'product', 'growth', 'business'],
        targetIndustries: [],
        minSalary: null,
        locationPreferences: ["US", "Remote"],
        minimumSkillMatches: 3,
        minimumMatchScore: 50
    },
    applications: [],
    savedJobs: []
};

let templates = {};
let valuesLibrary = [];

// Check if user has existing profile
// Removed checkUserProfile - using template-based loading instead

// Build profile selector dropdown from manifest
export function buildProfileSelector(profiles) {
    // Hidden select (kept for backward compatibility)
    const selector = document.getElementById('profileSelector');
    const currentId = safeGet('currentProfile') || profiles[0]?.id;

    if (selector) {
        selector.innerHTML = profiles.map(p =>
            `<option value="${p.id}" ${p.id === currentId ? 'selected' : ''}>${p.name}</option>`
        ).join('');
    }

    // Rebuild auth-aware dropdown (includes sample profiles + auth controls)
    rebuildProfileDropdown();

    // Update the profile chip name/avatar (only if not signed in, otherwise auth controls it)
    if (!fbUser) {
        const current = profiles.find(p => p.id === currentId) || profiles[0];
        if (current) updateProfileChip(current.name);
    }

    console.log(`✓ Profile selector built with ${profiles.length} options`);
}

// Switch to a different profile (admin functionality)
export function switchProfile(templateId) {
    console.log('🔄 Switching profile to:', templateId);
    
    // Demo mode routing: if in demo mode, route sample switches through switchDemoProfile
    if (appContext.mode === 'demo' && templateId.indexOf('firestore-') !== 0) {
        closeProfileDropdown();
        switchDemoProfile(templateId);
        return;
    }
    // If in demo mode and switching to own profile, exit demo
    if (appContext.mode === 'demo' && templateId.indexOf('firestore-') === 0) {
        closeProfileDropdown();
        exitDemoMode();
        return;
    }
    
    // Signed-in users viewing sample profiles → enter demo mode (snapshot + isolate)
    if (fbUser && templateId.indexOf('firestore-') !== 0) {
        closeProfileDropdown();
        enterDemoMode(templateId);
        return;
    }
    
    // Close dropdown immediately before rebuilding DOM
    closeProfileDropdown();
    
    if (!templates[templateId]) {
        console.error('Template not found:', templateId);
        showToast('Profile not found.', 'error');
        return;
    }
    
    // Load template inline (no page reload)
    loadTemplate(templateId);
    window._profileExplicitlySelected = true;
    // Only save profile preference for non-signed-in users
    // Signed-in users always load their own Firestore data on boot
    if (!fbUser) {
        safeSet('currentProfile', templateId);
    }
    
    // Re-initialize views with new data
    if (typeof skillsData !== 'undefined') {
        normalizeUserRoles();
        _sd().skills = window._userData.skills;
        _sd().roles = window._userData.roles;
    }
    
    // Update profile chip — only for non-signed-in sample browsing
    // Signed-in admins keep their own name in the header chip
    if (!fbUser && window._userData.profile && window._userData.profile.name) {
        updateProfileChip(window._userData.profile.name);
    }
    
    // Reset initialized flags so views re-render
    window.blueprintInitialized = false;
    window.opportunitiesInitialized = false;
    window.applicationsInitialized = false;
    window.consentInitialized = false;
    window.settingsInitialized = false;
    window.networkInitialized = false;
    window.cardViewInitialized = false;
    
    // CRITICAL: Clear stale blueprintData so values/outcomes refresh from the new profile
    _bd().values = [];
    _bd().outcomes = [];
    _bd().purpose = "";
    // Force immediate re-inference from the new profile's userData
    inferValues();
    extractOutcomesFromEvidence();
    
    // Rescore jobs against the new profile's skills
    if (typeof rescoreAllJobs === 'function') rescoreAllJobs();
    
    // Reset network state for new profile
    if (typeof activeRole !== 'undefined') activeRole = 'all';
    if (typeof activeJobForNetwork !== 'undefined') activeJobForNetwork = null;
    if (typeof networkMatchMode !== 'undefined') networkMatchMode = 'you';
    var searchInput = document.getElementById('skillSearch');
    if (searchInput) searchInput.value = '';
    
    // Clean up any network overlay DOM elements
    var legend = document.getElementById('matchLegend');
    if (legend) legend.remove();
    var jobTile = document.getElementById('jobInfoTile');
    if (jobTile) jobTile.remove();
    var toggle = document.getElementById('matchModeToggle');
    if (toggle) toggle.style.display = 'none';
    var badge = document.getElementById('matchActiveBadge');
    if (badge) badge.style.display = 'none';
    
    // Check read-only status
    checkReadOnly();
    rebuildProfileDropdown();
    
    // Navigate to Skills view (network on desktop, card on mobile)
    if (window.innerWidth <= 768) {
        currentSkillsView = 'card';
    }
    switchView('network');
    // Ensure we're at the top after view switch
    setTimeout(function() { window.scrollTo(0, 0); }, 50);
    // Defensive: re-render job selector after DOM settles (timing issue on profile switch)
    setTimeout(function() { renderJobSelectorWidget(); }, 500);
}

// Save user data preference (which profile they're viewing)
// saveUserData — provided by imported module


// ===== SKILL LIBRARY SYSTEM (v2.3.0) =====
let skillLibraryIndex = null;
let _skillLibraryPromise = null; // resolves when library is loaded or failed

async function loadSkillLibraryIndex() {
    const cacheBuster = '?v=20260227-v4';
    const candidates = ['skills/index-v4.json', 'skills/index-v3.json'];
    
    for (const path of candidates) {
        try {
            const response = await fetch(path + cacheBuster);
            if (!response.ok) continue;
            const data = await response.json();
            skillLibraryIndex = data;
            window._skillNameSet = new Set();
            window._skillLibNameMap = new Map();
            if (data.index) { data.index.forEach(function(e) { var ln = (e.name || e.n || '').toLowerCase(); if (ln) { window._skillNameSet.add(ln); window._skillLibNameMap.set(ln, e); } }); }
            recategorizeLightcastSkills();
            buildEscoCategoryIndex();
            const count = data.count || data.totalSkills || data.index?.length || '?';
            const src = data.source || path;
            console.log(`✓ Skill library loaded: ${Number(count).toLocaleString()} skills (${path})`);
            if (data.sources) {
                Object.entries(data.sources).forEach(function(e) { console.log('  ' + e[0] + ': ' + e[1].count + ' skills (v' + e[1].version + ')'); });
            }
            const badge = document.getElementById('availableSkillsCount');
            if (badge && count !== '?') badge.textContent = Number(count).toLocaleString();
            return;
        } catch (e) {
            // Try next candidate
        }
    }
    
    skillLibraryIndex = { totalSkills: 0, index: [] };
    console.warn('⚠ Skill library not found — Add Skills search will be empty. Other features unaffected.');
}

// Gate: ensures skill library is loaded before job parsing
// Returns immediately if already loaded, otherwise waits up to 8s
async function ensureSkillLibrary() {
    if (skillLibraryIndex && skillLibraryIndex.index && skillLibraryIndex.index.length > 0) return true;
    if (_skillLibraryPromise) {
        try { await Promise.race([_skillLibraryPromise, new Promise(function(_, rej) { setTimeout(function() { rej('timeout'); }, 8000); })]); }
        catch(e) { console.warn('ensureSkillLibrary: ' + e); }
    }
    return !!(skillLibraryIndex && skillLibraryIndex.index && skillLibraryIndex.index.length > 0);
}

async function loadExternalSynonyms() {
    try {
        const response = await fetch('skills/synonyms.json?v=20260227');
        if (!response.ok) return;
        const data = await response.json();
        const map = data.map || {};
        var added = 0;
        Object.keys(map).forEach(function(key) {
            var lower = key.toLowerCase();
            if (!_synonymLookup[lower]) _synonymLookup[lower] = [];
            map[key].forEach(function(syn) {
                var synLower = syn.toLowerCase();
                if (_synonymLookup[lower].indexOf(synLower) === -1) {
                    _synonymLookup[lower].push(synLower);
                    added++;
                }
                if (!_synonymLookup[synLower]) _synonymLookup[synLower] = [];
                if (_synonymLookup[synLower].indexOf(lower) === -1) _synonymLookup[synLower].push(lower);
            });
        });
        console.log('✓ Extended synonyms loaded: ' + added + ' new mappings from ' + Object.keys(map).length + ' entries');
    } catch (e) {
        // External synonyms optional — hardcoded SKILL_SYNONYMS still work
    }
}

// ── Lightcast Skill Recategorization ──
// Reassigns 28K+ Lightcast skills from "General Professional" to ESCO-style categories
// Runs once after skill library load, before category bridge build
function recategorizeLightcastSkills() {
    if (!skillLibraryIndex || !skillLibraryIndex.index) return;
    
    // Category rules: array of [regex, category, subcategory]
    // Order matters — first match wins. Most specific patterns first.
    var rules = [
        // Technology — Programming & Software
        [/\b(java(?:script)?|python|ruby|php|c\+\+|c#|swift|kotlin|golang|go lang|rust|scala|perl|typescript|\.net|vb\.net|objective.c|dart|lua|haskell|erlang|clojure|fortran|cobol|assembly|bash|shell|powershell)\b/i, 'Technology', 'Programming Languages'],
        [/\b(react|angular|vue|svelte|next\.?js|nuxt|ember|backbone|jquery|bootstrap|tailwind|sass|less|webpack|vite|node\.?js|express|django|flask|spring|laravel|rails|asp\.net|fastapi)\b/i, 'Technology', 'Web Frameworks'],
        [/\b(html|css|dom|web develop|front.?end|back.?end|full.?stack|responsive design|web design|rest api|graphql|websocket|microservice)\b/i, 'Technology', 'Web Development'],
        [/\b(sql|mysql|postgresql|oracle|mongodb|redis|elasticsearch|cassandra|dynamodb|firebase|neo4j|sqlite|mariadb|database|data model|data warehouse|etl|data pipeline|data lake|snowflake|bigquery|redshift)\b/i, 'Technology', 'Data & Databases'],
        [/\b(aws|amazon web|azure|google cloud|gcp|cloud comput|cloud architect|cloud engineer|docker|kubernetes|k8s|terraform|ansible|puppet|chef|jenkins|ci.?cd|devops|infrastructure as code|serverless|lambda|cloudformation)\b/i, 'Technology', 'Cloud & DevOps'],
        [/\b(machine learn|deep learn|neural network|nlp|natural language|computer vision|tensorflow|pytorch|keras|scikit|reinforcement learn|generative ai|llm|large language|gpt|transformer|bert|diffusion|embedding|fine.?tun|prompt engineer|rag|retrieval augment)\b/i, 'Technology', 'AI & Machine Learning'],
        [/\b(data analy|data scien|data visual|tableau|power bi|looker|qlik|sas|spss|r programming|stata|pandas|numpy|matplotlib|statistical|regression|hypothesis|a.b test|analytics)\b/i, 'Technology', 'Data Science & Analytics'],
        [/\b(cyber.?secur|information secur|network secur|penetration test|ethical hack|firewall|encryption|soc analyst|incident response|vulnerability|malware|threat|siem|compliance.*security|iam|identity.*access)\b/i, 'Technology', 'Cybersecurity'],
        [/\b(ios|android|mobile develop|react native|flutter|xamarin|swiftui|app develop|mobile app)\b/i, 'Technology', 'Mobile Development'],
        [/\b(git|github|gitlab|bitbucket|version control|agile|scrum|kanban|jira|confluence|trello|product manag|sprint|backlog|user stor)\b/i, 'Technology', 'Software Development Practices'],
        [/\b(linux|unix|windows server|vmware|virtualization|active directory|system admin|network admin|tcp.?ip|dns|dhcp|load balanc|nginx|apache|it support|help desk|troubleshoot|hardware)\b/i, 'Technology', 'IT & Systems Administration'],
        [/\b(blockchain|cryptocurrency|smart contract|web3|defi|nft|solidity|ethereum)\b/i, 'Technology', 'Blockchain & Web3'],
        [/\b(iot|internet of things|embedded|arduino|raspberry pi|firmware|fpga|plc|scada|sensor)\b/i, 'Technology', 'IoT & Embedded Systems'],
        [/\b(api|sdk|integration|middleware|soap|webhook|microservice|service.?orient|event.?driven)\b/i, 'Technology', 'Software Architecture'],
        [/\b(test.*automat|quality assur|qa |selenium|cypress|jest|unit test|integration test|load test|regression test|bug track|defect)\b/i, 'Technology', 'Quality Assurance & Testing'],
        [/\b(erp|sap|oracle.*cloud|workday|servicenow|salesforce.*admin|crm.*admin|dynamics 365|netsuite)\b/i, 'Technology', 'Enterprise Software'],
        [/\b(robotic process|rpa|uipath|automation anywhere|blue prism|business process automat)\b/i, 'Technology', 'Process Automation'],
        
        // Business & Management
        [/\b(project manag|program manag|pmp|prince2|pmbok|waterfall|stakeholder manag|change manag|risk manag|portfolio manag)\b/i, 'Business & Management', 'Project Management'],
        [/\b(strategic plan|business strateg|corporate strateg|competitive analysis|swot|market analysis|business develop|growth strateg)\b/i, 'Business & Management', 'Strategy'],
        [/\b(leadership|team lead|people manag|team manag|executive|c.?suite|director|vp of|chief.*officer|management develop|succession plan)\b/i, 'Business & Management', 'Leadership & Management'],
        [/\b(operations manag|supply chain|logistics|procurement|inventory|lean|six sigma|process improve|kaizen|quality manag|iso 9001)\b/i, 'Business & Management', 'Operations & Supply Chain'],
        [/\b(consult|advisory|client manag|engagement manag|professional servic|management consult|business consult)\b/i, 'Business & Management', 'Consulting'],
        [/\b(entrepreneur|startup|venture|business plan|pitch deck|fundrais|incubat|acceler)\b/i, 'Business & Management', 'Entrepreneurship'],
        [/\b(negotiat|conflict resolut|mediati|facilitat|stakeholder|vendor manag|contract negoti)\b/i, 'Business & Management', 'Negotiation & Facilitation'],
        [/\b(presentation|public speak|communicat|storytell|executive communicat|technical writ|report writ|business writ)\b/i, 'Business & Management', 'Communication'],
        
        // Finance & Accounting
        [/\b(account|bookkeep|gaap|ifrs|general ledger|accounts payable|accounts receivable|journal entr|trial balance|chart of account|cpa|audit)\b/i, 'Finance & Accounting', 'Accounting'],
        [/\b(financial analy|financial model|valuation|dcf|discounted cash|investment bank|equity research|m&a|merger|acquisition|ipo|due diligence)\b/i, 'Finance & Accounting', 'Financial Analysis & Investment'],
        [/\b(budget|forecast|financial plan|treasury|cash flow|capital|portfolio manag.*financ|asset manag|wealth manag|cfp|cfa)\b/i, 'Finance & Accounting', 'Financial Planning'],
        [/\b(tax|taxation|irs|revenue|income tax|corporate tax|sales tax|transfer pric|tax plan|enrolled agent)\b/i, 'Finance & Accounting', 'Tax'],
        [/\b(banking|loan|credit|mortgage|underwriting|fintech|payment|insurance|actuari|risk.*financ|compliance.*financ)\b/i, 'Finance & Accounting', 'Banking & Insurance'],
        [/\b(payroll|compensat|benefit|total reward|401k|pension|equity comp)\b/i, 'Finance & Accounting', 'Payroll & Compensation'],
        
        // Marketing & Sales
        [/\b(digital market|seo|sem|ppc|google ads|facebook ads|social media market|content market|email market|marketing automat|hubspot|marketo|mailchimp)\b/i, 'Marketing & Sales', 'Digital Marketing'],
        [/\b(brand|branding|brand strateg|brand manag|brand identity|positioning|messaging|go.?to.?market)\b/i, 'Marketing & Sales', 'Brand Management'],
        [/\b(sales|selling|cold call|prospecting|business develop|account execut|quota|pipeline|crm|salesforce|lead generat|revenue|closing|upsell|cross.?sell)\b/i, 'Marketing & Sales', 'Sales'],
        [/\b(market research|consumer insight|focus group|survey|competitive intel|market segment|persona|buyer journ)\b/i, 'Marketing & Sales', 'Market Research'],
        [/\b(advertising|ad campaign|media buy|media plan|rtb|programmatic|display ad|native ad|affiliate)\b/i, 'Marketing & Sales', 'Advertising'],
        [/\b(public relat|pr |press release|media relat|crisis communicat|reputation|influencer|earned media|thought leadership)\b/i, 'Marketing & Sales', 'Public Relations'],
        [/\b(customer success|customer experience|cx|customer service|customer support|retention|nps|csat|churn|onboarding.*customer)\b/i, 'Marketing & Sales', 'Customer Experience'],
        [/\b(e.?commerce|shopify|magento|woocommerce|amazon seller|marketplace|conversion.*rate|cart|checkout)\b/i, 'Marketing & Sales', 'E-Commerce'],
        
        // Human Resources
        [/\b(recruiting|talent acquis|sourcing|ats|applicant track|hiring|interview|onboard|job post|employer brand|recruiter|headhunt)\b/i, 'Human Resources', 'Talent Acquisition'],
        [/\b(hris|human resource|hr manag|people operation|workforce plan|org design|organizational develop|culture|employee engag|employee relat)\b/i, 'Human Resources', 'HR Management'],
        [/\b(training|learning.*develop|l&d|instructional design|lms|elearning|e.learning|curriculum|professional develop|coaching|mentoring)\b/i, 'Human Resources', 'Learning & Development'],
        [/\b(diversity|equity|inclusion|dei|belonging|accessibility|ada compliance|equal opportunity|affirmative action)\b/i, 'Human Resources', 'DEI & Belonging'],
        [/\b(performance manag|performance review|360 feedback|okr|kpi|goal setting|talent review|calibrat)\b/i, 'Human Resources', 'Performance Management'],
        [/\b(labor relat|union|collective bargain|employment law|worker.*comp|osha|workplace safety|grievanc)\b/i, 'Human Resources', 'Labor Relations & Compliance'],
        
        // Healthcare & Medical
        [/\b(nursing|rn |lpn|nurse practition|clinical|patient care|hospital|medical|physician|doctor|surgeon|diagnos|treatment|emr|ehr|epic|cerner|hipaa|healthcare)\b/i, 'Healthcare & Medical', 'Clinical & Patient Care'],
        [/\b(pharma|drug|fda|clinical trial|gmp|regulatory.*pharma|biotech|biolog|molecular|genomic|dna|rna|crispr|stem cell|lab tech|patholog)\b/i, 'Healthcare & Medical', 'Pharmaceutical & Biotech'],
        [/\b(mental health|psychology|psychiatr|therapy|therapist|counseling|social work|behavioral health|substance|addiction)\b/i, 'Healthcare & Medical', 'Mental Health & Social Work'],
        [/\b(dental|vision|optometr|physical therap|occupational therap|speech therap|rehabilit|chiropract)\b/i, 'Healthcare & Medical', 'Allied Health'],
        [/\b(public health|epidemiol|preventive|vaccination|disease control|community health|health education|global health)\b/i, 'Healthcare & Medical', 'Public Health'],
        
        // Engineering & Manufacturing
        [/\b(mechanical engineer|thermal|fluid|cad|solidworks|autocad|catia|3d model|structural|civil engineer|geotechnical|environmental engineer)\b/i, 'Engineering & Manufacturing', 'Mechanical & Civil Engineering'],
        [/\b(electrical engineer|electronics|circuit|pcb|power system|signal process|control system|instrumentation)\b/i, 'Engineering & Manufacturing', 'Electrical & Electronics'],
        [/\b(chemical engineer|process engineer|refinery|petroleum|oil.*gas|pipeline|drilling|reservoir|mining)\b/i, 'Engineering & Manufacturing', 'Chemical & Process Engineering'],
        [/\b(manufactur|cnc|machining|welding|fabricat|assembly line|production|industrial engineer|plant manag|maintenance|reliability)\b/i, 'Engineering & Manufacturing', 'Manufacturing & Production'],
        [/\b(automotive|aerospace|aviat|vehicle|engine design|propulsion|aerodynamic)\b/i, 'Engineering & Manufacturing', 'Automotive & Aerospace'],
        [/\b(construction|building|architect.*engineer|surveying|blueprint.*build|roofing|plumbing|hvac|electrical.*trade)\b/i, 'Engineering & Manufacturing', 'Construction & Trades'],
        [/\b(materials science|metallurg|polymer|ceramic|composit|nanotechnol|3d print|additive manuf)\b/i, 'Engineering & Manufacturing', 'Materials Science'],
        
        // Legal & Compliance
        [/\b(legal|attorney|lawyer|litigation|contract.*law|corporate law|intellectual property|patent|trademark|copyright)\b/i, 'Legal & Compliance', 'Legal Practice'],
        [/\b(compliance|regulatory|gdpr|sox|aml|kyc|anti.?money|sanctions|risk.*compliance|governance)\b/i, 'Legal & Compliance', 'Compliance & Regulatory'],
        [/\b(paralegal|legal research|westlaw|lexis|case manag|court|deposition|discovery|legal writ)\b/i, 'Legal & Compliance', 'Legal Operations'],
        [/\b(privacy|data protect|ccpa|data governance|information governance|records manag)\b/i, 'Legal & Compliance', 'Data Privacy & Governance'],
        
        // Creative & Design
        [/\b(graphic design|visual design|photoshop|illustrator|indesign|figma|sketch|ui design|ux design|user experience|user interface|wireframe|prototype|usability|interaction design)\b/i, 'Creative & Design', 'Design & UX'],
        [/\b(video|film|edit.*video|premiere|final cut|after effects|motion graphic|animation|3d animation|cinema 4d|blender|maya|vfx)\b/i, 'Creative & Design', 'Video & Animation'],
        [/\b(photo|camera|lightroom|portrait|landscape|studio|visual storytell|image edit)\b/i, 'Creative & Design', 'Photography & Visual'],
        [/\b(copywriting|content creat|content strateg|blog|editorial|journalism|editor|proofread|creative writ|script)\b/i, 'Creative & Design', 'Content & Writing'],
        [/\b(music|audio|sound|podcast|voice|recording|mixing|mastering|acoustic)\b/i, 'Creative & Design', 'Audio & Music'],
        [/\b(interior design|industrial design|fashion|textile|product design|packaging design|exhibit|display)\b/i, 'Creative & Design', 'Industrial & Spatial Design'],
        [/\b(game design|game develop|unity|unreal|godot|level design|game art)\b/i, 'Creative & Design', 'Game Design']
    ];
    
    var recategorized = 0;
    var catCounts = {};
    
    skillLibraryIndex.index.forEach(function(entry) {
        var cat = (entry.c || '').trim();
        // Only recategorize "General Professional" skills
        if (cat !== 'General Professional') return;
        
        var name = entry.n || '';
        for (var i = 0; i < rules.length; i++) {
            if (rules[i][0].test(name)) {
                entry.c = rules[i][1];
                entry.sc = rules[i][2];
                recategorized++;
                catCounts[rules[i][1]] = (catCounts[rules[i][1]] || 0) + 1;
                break;
            }
        }
    });
    
    if (recategorized > 0) {
        var breakdown = Object.entries(catCounts).sort(function(a, b) { return b[1] - a[1]; })
            .map(function(e) { return e[0] + ': ' + e[1]; }).join(', ');
        console.log('\u2713 Recategorized ' + recategorized + ' skills from General Professional (' + breakdown + ')');
    }
}

// Builds a subcategory → skill names index from the 14K skill library
// Used by comparison engine to find related skills (category siblings)
var _escoSubcategoryIndex = {};  // subcategory_lower → [skill_name_lower, ...]
var _escoSkillToSubcategory = {}; // skill_name_lower → subcategory_lower

function buildEscoCategoryIndex() {
    if (!skillLibraryIndex || !skillLibraryIndex.index) return;
    _escoSubcategoryIndex = {};
    _escoSkillToSubcategory = {};
    var count = 0;
    skillLibraryIndex.index.forEach(function(entry) {
        var name = (entry.n || '').toLowerCase().trim();
        var subcat = (entry.sc || entry.c || '').toLowerCase().trim();
        if (!name || !subcat || name.length < 3) return;
        _escoSkillToSubcategory[name] = subcat;
        if (!_escoSubcategoryIndex[subcat]) _escoSubcategoryIndex[subcat] = [];
        _escoSubcategoryIndex[subcat].push(name);
        count++;
    });
    
    // Also index user's own skills for reverse lookup
    if (skillsData && _sd().skills) {
        _sd().skills.forEach(function(s) {
            var name = (s.name || '').toLowerCase().trim();
            if (!name || name.length < 3 || _escoSkillToSubcategory[name]) return;
            var libMatch = window._skillLibNameMap ? window._skillLibNameMap.get(name) || null :
                skillLibraryIndex.index.find(function(e) { var ln = (e.n || '').toLowerCase(); return ln === name; });
            if (libMatch) {
                var subcat = (libMatch.sc || libMatch.c || '').toLowerCase().trim();
                if (subcat) {
                    _escoSkillToSubcategory[name] = subcat;
                    if (_escoSubcategoryIndex[subcat]) _escoSubcategoryIndex[subcat].push(name);
                }
            }
        });
    }
    
    var subcats = Object.keys(_escoSubcategoryIndex).length;
    console.log('✓ ESCO category bridge: ' + count + ' skills across ' + subcats + ' subcategories');
}

// Find skills in the same ESCO subcategory (siblings)
// Caps at subcategories with ≤ 25 skills to prevent overly broad matches
// getEscoCategorySiblings — provided by imported module


// ===== ADMIN SKILL BLOCKLIST =====
// Firestore-backed list of skill names to exclude from JD parsing results
var _adminSkillBlocklist = new Set();
var _adminSkillBlocklistLoaded = false;

// loadAdminSkillBlocklist — provided by imported module


function saveAdminSkillBlocklist() {
    if (!fbDb) return;
    var arr = Array.from(_adminSkillBlocklist).sort();
    var payload = { skills: arr, updatedAt: new Date().toISOString() };
    fbDb.collection('meta').doc('skillBlocklist').set(payload)
        .then(function() { console.log('Skill blocklist saved: ' + arr.length + ' entries'); })
        .catch(function() {
            if (fbUser) {
                fbDb.collection('users').doc(fbUser.uid).collection('work_blueprints').doc('__skill_blocklist').set(payload, { merge: true })
                    .then(function() { console.log('Skill blocklist saved (user fallback): ' + arr.length + ' entries'); })
                    .catch(function() {});
            }
        });
}

var _adminApprovedSkills = new Set();

// loadAdminApprovedSkills — provided by imported module


function saveAdminApprovedSkills() {
    if (!fbDb) return;
    var arr = Array.from(_adminApprovedSkills).sort();
    var payload = { skills: arr, updatedAt: new Date().toISOString() };
    fbDb.collection('meta').doc('parserApprovedSkills').set(payload)
        .then(function() { console.log('Approved skills saved: ' + arr.length + ' entries'); })
        .catch(function() {
            if (fbUser) {
                fbDb.collection('users').doc(fbUser.uid).collection('work_blueprints').doc('__approved_skills').set(payload, { merge: true })
                    .then(function() { console.log('Approved skills saved (user fallback): ' + arr.length + ' entries'); })
                    .catch(function() {});
            }
        });
}

function adminApproveSkill(name) {
    if (readOnlyGuard()) return;
    var lower = (name || '').toLowerCase().trim();
    if (!lower) return;
    _adminApprovedSkills.add(lower);
    _adminSkillBlocklist.delete(lower);
    saveAdminApprovedSkills();
    saveAdminSkillBlocklist();
    showToast('Approved: \u201C' + lower + '\u201D \u2014 added to parser dictionary.', 'success', 3000);
}

function adminBlockFromAudit(name) {
    if (readOnlyGuard()) return;
    var lower = (name || '').toLowerCase().trim();
    if (!lower) return;
    _adminSkillBlocklist.add(lower);
    _adminApprovedSkills.delete(lower);
    saveAdminSkillBlocklist();
    saveAdminApprovedSkills();
    showToast('Blocked: \u201C' + lower + '\u201D \u2014 will be excluded from parsing.', 'info', 3000);
}

// isSkillApproved — provided by imported module


// isSkillBlocklisted — provided by imported module


function adminBlockSkill(name, jobIdx) {
    if (readOnlyGuard()) return;
    var lower = (name || '').toLowerCase().trim();
    if (!lower) return;
    _adminSkillBlocklist.add(lower);
    saveAdminSkillBlocklist();
    showToast('Blocked: "' + name + '" — will be filtered from all future parses.', 'info', 3000);
    // Re-render current job if viewing one
    if (typeof jobIdx === 'number' && jobIdx >= 0) {
        var jobs = window._userData.savedJobs || [];
        if (jobs[jobIdx] && jobs[jobIdx].matchData) {
            jobs[jobIdx].matchData.gaps = (jobs[jobIdx].matchData.gaps || []).filter(function(g) {
                return !isSkillBlocklisted(g.name);
            });
            showJobDetail(jobIdx);
        }
    }
}

function adminUnblockSkill(name) {
    _adminSkillBlocklist.delete((name || '').toLowerCase().trim());
    saveAdminSkillBlocklist();
    showToast('Unblocked: "' + name + '"', 'info', 2000);
}

// Show blocklist entries that affect a specific job's gaps
function showAdminBlocklistInContext(jobIdx) {
    var job = (window._userData.savedJobs || [])[jobIdx];
    if (!job || !getJobSkills(job).length) return;
    
    // Re-run matching to identify which gaps hit the blocklist
    var jobSkillsArr = getJobSkills(job);
    var userSkills = _sd().skills || [];
    var userMap = {};
    userSkills.forEach(function(s) { userMap[s.name.toLowerCase()] = true; });
    
    var blockedForThisJob = [];
    jobSkillsArr.forEach(function(ps) {
        var name = typeof ps === 'string' ? ps : ps.name;
        if (!name) return;
        var lower = name.toLowerCase().trim();
        if (!userMap[lower] && isSkillBlocklisted(name)) {
            blockedForThisJob.push(name);
        }
    });
    
    if (blockedForThisJob.length === 0) {
        showToast('No blocklist entries affect this job.', 'info');
        return;
    }
    
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:480px;width:100%;max-height:70vh;overflow-y:auto;';
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
        + '<h3 style="margin:0;font-size:1.05em;color:var(--text-primary);">Blocked Gap Skills for This Job</h3>'
        + '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.3em;cursor:pointer;">✕</button></div>'
        + '<p style="font-size:0.82em;color:var(--text-muted);margin-bottom:16px;">' + blockedForThisJob.length + ' skill' + (blockedForThisJob.length !== 1 ? 's' : '') + ' from this JD are on your admin blocklist and were hidden from gap analysis.</p>'
        + blockedForThisJob.map(function(name) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin-bottom:4px;border-radius:8px;background:var(--elev-1);border:1px solid var(--border);">'
                + '<span style="font-size:0.88em;color:var(--text-primary);">' + escapeHtml(name) + '</span>'
                + '<button onclick="adminUnblockSkill(\'' + escapeHtml(name).replace(/'/g, "\\'") + '\');this.parentElement.style.opacity=0.3;this.disabled=true;showToast(\'Unblocked: ' + escapeHtml(name).replace(/'/g, "\\'") + '. Re-analyze to update.\',\'success\')" '
                + 'style="background:none;border:1px solid rgba(16,185,129,0.3);color:#10b981;padding:3px 10px;border-radius:5px;cursor:pointer;font-size:0.78em;">Unblock</button></div>';
        }).join('')
        + '<div style="margin-top:16px;text-align:right;">'
        + '<button onclick="this.closest(\'div[style*=fixed]\').remove();reanalyzeJob(' + jobIdx + ')" style="padding:8px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.88em;">Unblock & Re-analyze</button></div>';
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
}

function renderAdminBlocklistPanel() {
    var sorted = Array.from(_adminSkillBlocklist).sort();
    var html = '<div class="blueprint-section">'
        + '<div class="blueprint-section-header">'
        + '<div class="blueprint-section-title">'
        + '<span class="section-icon">' + bpIcon('cancel', 20) + '</span>'
        + '<span>Skill Blocklist (' + sorted.length + ')</span>'
        + '</div>'
        + '</div>'
        + '<p style="font-size:0.82em; color:var(--text-muted); margin-bottom:16px;">Skills on this list are filtered from all JD parsing results. Block garbage, fragments, and non-skills that leak through the extraction engine.</p>'
        + '<div style="margin-bottom:16px; display:flex; gap:8px;">'
        + '<input type="text" id="blocklistAddInput" class="settings-input" placeholder="Add a skill to block..." style="flex:1;" onkeydown="if(event.key===\'Enter\'){adminBlockSkillFromInput()}">'
        + '<button onclick="adminBlockSkillFromInput()" style="padding:6px 16px; background:var(--accent); color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.85em;">Block</button>'
        + '</div>';
    
    if (sorted.length === 0) {
        html += '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85em;">No blocked skills yet. Block skills from gap chips in job details, or add them here.</div>';
    } else {
        html += '<div style="display:flex; flex-wrap:wrap; gap:6px;">';
        sorted.forEach(function(skill) {
            html += '<span style="display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:5px; font-size:0.82em; color:#ef4444;">'
                + escapeHtml(skill)
                + '<span onclick="adminUnblockSkill(\'' + escapeHtml(skill).replace(/'/g, "\\'") + '\'); renderAdminBlocklistPanel();" style="cursor:pointer; opacity:0.6; font-size:1.1em;" title="Unblock">\u00D7</span>'
                + '</span>';
        });
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function adminBlockSkillFromInput() {
    var inp = document.getElementById('blocklistAddInput');
    if (!inp || !inp.value.trim()) return;
    adminBlockSkill(inp.value.trim(), -1);
    inp.value = '';
    // Re-render panel
    var container = document.getElementById('adminBlocklistContainer');
    if (container) container.innerHTML = renderAdminBlocklistPanel();
}

// Search skills by query - returns array always
// searchSkills — provided by imported module


export function getCategoryColor(category) {
    const colors = {
        'Technology': '#3b82f6',
        'Business & Management': '#8b5cf6',
        'Finance & Accounting': '#10b981',
        'Marketing & Sales': '#f59e0b',
        'Human Resources': '#ec4899',
        'Healthcare & Medical': '#14b8a6',
        'Engineering & Manufacturing': '#6366f1',
        'Legal & Compliance': '#78716c',
        'Creative & Design': '#f97316',
        'General Professional': '#64748b'
    };
    return colors[category] || '#9ca3af';
}

export function isSkillAlreadyAdded(skillName) {
    return window._userData.skills.some(s => 
        s.name.toLowerCase() === skillName.toLowerCase()
    );
}

// Dedup: remove duplicate skills from both userData and skillsData
// Keeps the first occurrence (or the one with more evidence/verification)
// deduplicateSkills — provided by imported module

if (!window.deduplicateSkills) window.deduplicateSkills = deduplicateSkills;

// Skill cap enforcement: returns true if skill can be added, false if at cap
// canAddSkill — provided by imported module

if (!window.canAddSkill) window.canAddSkill = canAddSkill;

// Over-cap triage: forces user to remove skills until at/below PROFILE_SKILL_CAP
export function showSkillCapTriage() {
    var skills = window._userData.skills || [];
    if (skills.length <= PROFILE_SKILL_CAP) return;
    
    var excess = skills.length - PROFILE_SKILL_CAP;
    
    // Score each skill for removal suggestion (lower = more likely to suggest removal)
    var scored = skills.map(function(s, idx) {
        var score = 0;
        score += (s.verified ? 50 : 0);
        score += ((s.evidence || []).length * 15);
        score += (s.key ? 20 : 0);
        var profScores = { 'Mastery': 25, 'Expert': 20, 'Advanced': 15, 'Proficient': 10, 'Competent': 5, 'Novice': 2 };
        score += (profScores[s.level] || 10);
        // Penalize generic/soft skills that overlap with many others
        var generic = /^(communication|teamwork|problem solving|time management|organization|adaptability|creativity|critical thinking|attention to detail|work ethic|writing|leadership)$/i;
        if (generic.test(s.name)) score -= 15;
        return { skill: s, idx: idx, score: score };
    });
    
    // Sort: lowest score first (best candidates for removal)
    scored.sort(function(a, b) { return a.score - b.score; });
    
    // Pre-select the bottom N for removal
    var toRemove = new Set();
    scored.slice(0, excess).forEach(function(s) { toRemove.add(s.idx); });
    
    var modal = document.getElementById('exportModal');
    if (!modal) return;
    var mc = modal.querySelector('.modal-content');
    
    var html = '<div class="modal-header">'
        + '<div class="modal-header-left"><h2 class="modal-title">\u26A0 Skill Cap Reached</h2></div>'
        + '<div style="font-size:0.82em; color:var(--text-muted);">Must remove ' + excess + ' to continue</div>'
        + '</div>'
        + '<div class="modal-body" style="padding:20px; max-height:70vh; overflow-y:auto;">'
        + '<div style="padding:12px 16px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:10px; margin-bottom:16px;">'
        + '<div style="font-weight:700; color:#ef4444; margin-bottom:4px;">Profile has ' + skills.length + ' skills (cap: ' + PROFILE_SKILL_CAP + ')</div>'
        + '<div style="font-size:0.82em; color:var(--text-muted); line-height:1.5;">Select at least ' + excess + ' skill' + (excess !== 1 ? 's' : '') + ' to remove. '
        + 'Skills with low proficiency and no evidence are pre-selected. Verified and key skills are preserved.</div>'
        + '</div>'
        + '<div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">'
        + '<span id="triageCount" style="font-size:0.88em; font-weight:600; color:#ef4444;">' + toRemove.size + ' selected for removal</span>'
        + '<span style="font-size:0.78em; color:var(--text-muted);">Need: ' + excess + '+</span>'
        + '</div>';
    
    scored.forEach(function(item) {
        var s = item.skill;
        var checked = toRemove.has(item.idx);
        var levelColors = { 'Mastery': '#10b981', 'Expert': '#fb923c', 'Advanced': '#a78bfa', 'Proficient': '#60a5fa', 'Novice': '#94a3b8' };
        var badges = '';
        if (s.verified) badges += '<span style="font-size:0.65em; padding:1px 6px; border-radius:8px; background:rgba(16,185,129,0.15); color:#10b981;">\u2713 Verified</span> ';
        if (s.key) badges += '<span style="font-size:0.65em; padding:1px 6px; border-radius:8px; background:rgba(245,158,11,0.15); color:#f59e0b;">\u2605 Key</span> ';
        if ((s.evidence || []).length > 0) badges += '<span style="font-size:0.65em; padding:1px 6px; border-radius:8px; background:rgba(96,165,250,0.15); color:#60a5fa;">' + s.evidence.length + ' evidence</span>';
        
        html += '<label style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:8px; cursor:pointer; transition:background 0.15s; border:1px solid ' + (checked ? 'rgba(239,68,68,0.3)' : 'transparent') + '; background:' + (checked ? 'rgba(239,68,68,0.05)' : 'transparent') + ';"'
            + ' onmouseover="this.style.background=\'rgba(255,255,255,0.03)\'" onmouseout="this.style.background=\'' + (checked ? 'rgba(239,68,68,0.05)' : 'transparent') + '\'">'
            + '<input type="checkbox" data-triage-idx="' + item.idx + '" ' + (checked ? 'checked' : '') + ' onchange="updateTriageCount()" style="accent-color:#ef4444; flex-shrink:0;">'
            + '<div style="flex:1; min-width:0;">'
            + '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">'
            + '<span style="font-weight:600; font-size:0.88em; color:var(--text-primary);">' + escapeHtml(s.name) + '</span>'
            + '<span style="font-size:0.72em; padding:1px 8px; border-radius:8px; background:' + (levelColors[s.level] || '#6b7280') + '22; color:' + (levelColors[s.level] || '#6b7280') + '; font-weight:600;">' + (s.level || 'Proficient') + '</span>'
            + badges
            + '</div></div></label>';
    });
    
    html += '</div>'
        + '<div style="padding:16px 20px; border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:10px;">'
        + '<button id="triageConfirmBtn" onclick="confirmSkillCapTriage()" style="padding:10px 24px; background:#ef4444; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-size:0.92em;">'
        + 'Remove Selected (' + excess + '+)</button></div>';
    
    mc.innerHTML = html;
    history.pushState({ modal: true }, '');
    modal.classList.add('active');
}
if (!window.showSkillCapTriage) window.showSkillCapTriage = showSkillCapTriage;

export function updateTriageCount() {
    var checks = document.querySelectorAll('[data-triage-idx]:checked');
    var countEl = document.getElementById('triageCount');
    var btn = document.getElementById('triageConfirmBtn');
    var excess = (window._userData.skills || []).length - PROFILE_SKILL_CAP;
    if (countEl) countEl.textContent = checks.length + ' selected for removal';
    if (btn) {
        btn.disabled = checks.length < excess;
        btn.style.opacity = checks.length < excess ? '0.4' : '1';
    }
}
if (!window.updateTriageCount) window.updateTriageCount = updateTriageCount;

export function confirmSkillCapTriage() {
    var checks = document.querySelectorAll('[data-triage-idx]:checked');
    var excess = (window._userData.skills || []).length - PROFILE_SKILL_CAP;
    if (checks.length < excess) {
        showToast('Select at least ' + excess + ' skills to remove.', 'warning');
        return;
    }
    var removeIndices = new Set();
    checks.forEach(function(cb) { removeIndices.add(parseInt(cb.getAttribute('data-triage-idx'))); });
    
    window._userData.skills = window._userData.skills.filter(function(_, idx) { return !removeIndices.has(idx); });
    _sd().skills = window._userData.skills;
    
    saveUserData();
    if (typeof debouncedSave === 'function' && fbUser) debouncedSave();
    if (typeof rescoreAllJobs === 'function') rescoreAllJobs();
    if (typeof refreshAllViews === 'function') refreshAllViews();
    
    closeExportModal();
    showToast('Removed ' + removeIndices.size + ' skills. Profile now has ' + window._userData.skills.length + ' skills.', 'success', 5000);
}
if (!window.confirmSkillCapTriage) window.confirmSkillCapTriage = confirmSkillCapTriage;

// Load library on page load
window.addEventListener('DOMContentLoaded', () => {
    _skillLibraryPromise = loadSkillLibraryIndex();
    loadExternalSynonyms();
    var cy = document.getElementById('copyrightYear');
    if (cy) cy.textContent = new Date().getFullYear();
});

// Load template into userData
// ===== SAMPLE JOBS FOR DEMO PROFILES =====
export function getSampleJobsForProfile(templateId, template) {
    var allRoles = (template.roles || []).map(function(r) { return r.name.toLowerCase(); }).join(' ');
    var titleStr = ((template.profile || {}).currentTitle || '').toLowerCase();
    var profileName = (template.profile && template.profile.name) || '';
    var skills = template.skills || [];
    var allSkillNames = skills.map(function(s) { return s.name.toLowerCase(); }).join(' ');
    
    // Detect profile type — roles and title are primary signals, skills only for retail/trades
    var roleSignals = titleStr + ' ' + allRoles;
    
    var isRecruiter = /recruit|talent acqui|sourcing|staffing/.test(roleSignals);
    var isProduct = /product manager|product lead|product director|product owner/.test(roleSignals);
    var isStrategy = /strateg|advisory|futurist|evangelist|transformation|chief|vp |vice president|executive/.test(roleSignals);
    var isTech = /\b(engineer|developer|architect|software|devops|frontend|backend|full.?stack|sre|infrastructure)\b/.test(roleSignals);
    // Retail and trades check skills too since role names may be generic
    var isRetail = /cashier|retail|store|merchandise|customer service|point of sale|barista/.test(roleSignals + ' ' + allSkillNames);
    var isTrades = /hair|stylist|cosmetolog|barber|electrician|plumb|hvac|carpenter|mechanic|weld/.test(roleSignals + ' ' + allSkillNames);
    
    var jobMeta;
    
    // ===== CHARACTER-SPECIFIC DEMO JOBS =====
    var characterJobs = {
        'walter-white': [
            { id: 'sample-high', title: 'Senior Research Chemist', company: 'Pfizer',
              rawText: 'Pfizer seeks a Senior Research Chemist to lead organic synthesis programs in our drug discovery division. You will design synthesis routes, manage laboratory operations, mentor junior scientists, analyze spectroscopic data, and publish research findings. Requires PhD in chemistry, 10+ years research experience, and expertise in crystallography and analytical chemistry.',
              parsedRoles: ['Chemistry', 'Research'], seniority: 'Senior', tier: 'high' },
            { id: 'sample-mid', title: 'Director of Chemistry Education', company: 'Khan Academy',
              rawText: 'Khan Academy is hiring a Director of Chemistry Education to build our AP and college-level chemistry curriculum. You will design instructional content, develop laboratory simulations, train content creators, and assess learning outcomes. Requires teaching experience, deep chemistry knowledge, and ability to make complex science accessible to diverse learners.',
              parsedRoles: ['Education', 'Chemistry'], seniority: 'Senior', tier: 'mid' },
            { id: 'sample-low', title: 'VP of Manufacturing Operations', company: 'BASF',
              rawText: 'BASF seeks a VP of Manufacturing Operations to oversee chemical production at our North American facilities. You will manage $500M production budget, lead 200+ person manufacturing teams, ensure EPA and OSHA regulatory compliance, optimize production yield and efficiency, and implement quality control systems. Requires expertise in chemical engineering, GMP processes, supply chain management, and Six Sigma certification.',
              parsedRoles: ['Manufacturing', 'Operations'], seniority: 'Executive', tier: 'low' }
        ],
        'gus-fring': [
            { id: 'sample-high', title: 'VP of Multi-Unit Operations', company: 'Chick-fil-A',
              rawText: 'Chick-fil-A seeks a VP of Multi-Unit Operations to oversee franchise performance across 50+ locations. You will drive operational excellence, quality assurance, supply chain optimization, and community relations. Requires 15+ years in QSR operations, multi-unit P&L management, and exceptional standards enforcement. Must embody our commitment to service excellence.',
              parsedRoles: ['Operations', 'Restaurant Management'], seniority: 'Executive', tier: 'high' },
            { id: 'sample-mid', title: 'Chief Operating Officer', company: 'Sysco',
              rawText: 'Sysco is seeking a COO to lead our distribution and supply chain operations across North America. You will manage 60,000+ employees, optimize logistics networks, implement quality control systems, drive operational efficiency, and build strategic supplier relationships. Requires expertise in supply chain management, food safety compliance, and international distribution.',
              parsedRoles: ['Operations', 'Supply Chain'], seniority: 'C-Suite', tier: 'mid' },
            { id: 'sample-low', title: 'Director of Risk & Compliance', company: 'Yum! Brands',
              rawText: 'Yum! Brands seeks a Director of Risk & Compliance to build enterprise risk management across our global restaurant portfolio. You will design compliance frameworks, manage regulatory audits, oversee food safety standards, investigate operational incidents, and coordinate with legal teams across 150 countries. Requires expertise in regulatory compliance, crisis management, and corporate governance.',
              parsedRoles: ['Compliance', 'Risk Management'], seniority: 'Senior', tier: 'low' }
        ],
        'hank-schrader': [
            { id: 'sample-high', title: 'Director of Investigations', company: 'FBI',
              rawText: 'The FBI is seeking a Director of Investigations to lead complex criminal investigation programs. You will oversee multi-agency task forces, manage forensic analysis teams, direct surveillance operations, coordinate with federal prosecutors, and mentor field agents. Requires 15+ years federal law enforcement experience, expertise in evidence management, and inter-agency coordination skills.',
              parsedRoles: ['Investigation', 'Law Enforcement'], seniority: 'Senior', tier: 'high' },
            { id: 'sample-mid', title: 'VP of Corporate Security', company: 'JPMorgan Chase',
              rawText: 'JPMorgan Chase seeks a VP of Corporate Security to lead our global security and investigations team. You will manage threat assessment programs, coordinate with law enforcement, oversee forensic investigations, build intelligence analysis capabilities, and protect company assets. Requires federal law enforcement background, team leadership, and financial crimes investigation experience.',
              parsedRoles: ['Security', 'Investigation'], seniority: 'Executive', tier: 'mid' },
            { id: 'sample-low', title: 'Chief Analytics Officer', company: 'Palantir',
              rawText: 'Palantir seeks a Chief Analytics Officer to lead intelligence analysis platforms for law enforcement clients. You will design data integration architectures, build predictive analytics models, manage technical teams, and present to government stakeholders. Requires expertise in data science, machine learning, Python programming, and experience translating analytical insights into operational outcomes.',
              parsedRoles: ['Analytics', 'Technology'], seniority: 'Executive', tier: 'low' }
        ],
        'jesse-pinkman': [
            { id: 'sample-high', title: 'Custom Furniture Maker', company: 'Etsy Studio',
              rawText: 'Seeking a skilled Custom Furniture Maker to join our artisan collective. You will design and build custom wood furniture, operate woodworking equipment, manage client consultations, and maintain workshop safety standards. Requires woodworking experience, precision craftsmanship, and customer service skills. Portfolio of completed work preferred.',
              parsedRoles: ['Craftsmanship', 'Woodworking'], seniority: 'Entry', tier: 'high' },
            { id: 'sample-mid', title: 'Production Technician', company: 'Tesla',
              rawText: 'Tesla is hiring a Production Technician for our Gigafactory. You will operate manufacturing equipment, maintain quality standards, troubleshoot production issues, follow safety protocols, and track inventory. Requires hands-on technical aptitude, attention to detail, ability to work in fast-paced environment, and commitment to quality control.',
              parsedRoles: ['Production', 'Manufacturing'], seniority: 'Entry', tier: 'mid' },
            { id: 'sample-low', title: 'Territory Sales Manager', company: 'Snap-on Tools',
              rawText: 'Snap-on Tools seeks a Territory Sales Manager to build and manage a route-based sales territory. You will develop customer relationships, demonstrate products, manage inventory, negotiate deals, and maintain sales records. Requires sales aptitude, territory management skills, mechanical knowledge, and ability to build trust with skilled trades professionals.',
              parsedRoles: ['Sales', 'Territory Management'], seniority: 'Mid', tier: 'low' }
        ],
        'saul-goodman': [
            { id: 'sample-high', title: 'Criminal Defense Attorney', company: 'Public Defender\'s Office',
              rawText: 'Seeking an experienced Criminal Defense Attorney to handle a high-volume caseload. You will represent clients in felony and misdemeanor cases, negotiate plea agreements, conduct jury trials, manage evidence review, and mentor junior attorneys. Requires active bar license, courtroom litigation experience, and strong client relationship skills.',
              parsedRoles: ['Legal', 'Criminal Defense'], seniority: 'Senior', tier: 'high' },
            { id: 'sample-mid', title: 'Director of Marketing', company: 'LegalZoom',
              rawText: 'LegalZoom seeks a Director of Marketing to lead our brand strategy and client acquisition programs. You will develop advertising campaigns, manage digital marketing spend, create compelling content, build brand recognition, and drive measurable lead generation. Requires marketing strategy expertise, creative campaign development, and experience in professional services marketing.',
              parsedRoles: ['Marketing', 'Business Development'], seniority: 'Senior', tier: 'mid' },
            { id: 'sample-low', title: 'General Counsel', company: 'Better Business Bureau',
              rawText: 'The BBB seeks a General Counsel to oversee all legal operations, manage regulatory compliance, advise the board on governance matters, handle commercial contracts, and coordinate litigation strategy. Requires JD, 15+ years legal experience, corporate governance expertise, and experience in consumer protection law and regulatory frameworks.',
              parsedRoles: ['Legal', 'Compliance'], seniority: 'Executive', tier: 'low' }
        ],
        'tuco-salamanca': [
            { id: 'sample-high', title: 'Regional Distribution Manager', company: 'Red Bull',
              rawText: 'Red Bull seeks a Regional Distribution Manager to own territory growth across the Southwest. You will manage distributor relationships, enforce brand standards, drive product placement, negotiate retail partnerships, and lead a team of 15 field reps. Requires high energy, territory management experience, and ability to maintain quality standards across distribution channels.',
              parsedRoles: ['Distribution', 'Sales'], seniority: 'Mid', tier: 'high' },
            { id: 'sample-mid', title: 'Operations Manager, Logistics', company: 'FedEx',
              rawText: 'FedEx is hiring an Operations Manager to lead logistics operations at our Albuquerque hub. You will manage package sorting teams, enforce safety protocols, optimize delivery routes, handle personnel issues, and maintain throughput targets. Requires strong leadership presence, ability to make rapid decisions under pressure, and experience managing hourly workforce.',
              parsedRoles: ['Operations', 'Logistics'], seniority: 'Mid', tier: 'mid' },
            { id: 'sample-low', title: 'Director of Supply Chain', company: 'Sysco',
              rawText: 'Sysco seeks a Director of Supply Chain to build our regional procurement and distribution network. You will manage supplier relationships, negotiate contracts, optimize inventory systems, lead cross-border logistics, and implement quality assurance programs. Requires supply chain management expertise, vendor negotiation skills, and experience in food distribution.',
              parsedRoles: ['Supply Chain', 'Procurement'], seniority: 'Senior', tier: 'low' }
        ],
        'jim-hopper': [
            { id: 'sample-high', title: 'Director of Public Safety', company: 'City of Indianapolis',
              rawText: 'The City of Indianapolis seeks a Director of Public Safety to oversee police, fire, and emergency management operations. You will coordinate inter-agency response, manage crisis situations, build community trust programs, lead a department of 3,000+ personnel, and interface with federal agencies. Requires 15+ years law enforcement leadership, crisis management certification, and community policing experience.',
              parsedRoles: ['Law Enforcement', 'Emergency Management'], seniority: 'Executive', tier: 'high' },
            { id: 'sample-mid', title: 'VP of Global Security', company: 'Amazon',
              rawText: 'Amazon seeks a VP of Global Security to lead physical security operations across our fulfillment network. You will build security teams, manage crisis response protocols, coordinate with law enforcement agencies, protect employee safety, and oversee investigation units. Requires federal or military law enforcement background, team leadership at scale, and experience managing security in distributed operations.',
              parsedRoles: ['Security', 'Operations'], seniority: 'Executive', tier: 'mid' },
            { id: 'sample-low', title: 'FEMA Regional Administrator', company: 'FEMA',
              rawText: 'FEMA seeks a Regional Administrator to lead disaster preparedness, response, and recovery for Region V. You will coordinate federal, state, and local emergency response, manage disaster declarations, allocate federal resources, and build community resilience programs. Requires emergency management expertise, inter-agency coordination, political stakeholder management, and experience leading operations under extreme pressure.',
              parsedRoles: ['Emergency Management', 'Government'], seniority: 'Executive', tier: 'low' }
        ],
        'eleven': [
            { id: 'sample-high', title: 'Field Research Specialist', company: 'DARPA',
              rawText: 'DARPA seeks a Field Research Specialist for classified programs involving advanced human performance. You will participate in controlled research studies, demonstrate unique capabilities under observation, collaborate with scientific teams, and provide field intelligence in austere environments. Requires exceptional focus under pressure, adaptability, and willingness to operate in high-risk conditions. Clearance required.',
              parsedRoles: ['Research', 'Field Operations'], seniority: 'Entry', tier: 'high' },
            { id: 'sample-mid', title: 'Crisis Response Team Leader', company: 'American Red Cross',
              rawText: 'The Red Cross seeks a Crisis Response Team Leader to deploy to disaster zones and lead on-the-ground relief operations. You will assess threats, coordinate volunteer teams, manage resource distribution, communicate with emergency services, and provide emotional support to affected populations. Requires courage under pressure, adaptability, empathy, and experience leading teams in dangerous conditions.',
              parsedRoles: ['Crisis Response', 'Leadership'], seniority: 'Mid', tier: 'mid' },
            { id: 'sample-low', title: 'Intelligence Analyst', company: 'National Security Agency',
              rawText: 'The NSA seeks an Intelligence Analyst to support national security threat assessment programs. You will analyze signals intelligence, produce threat briefings, identify patterns in surveillance data, coordinate with field operatives, and brief senior officials. Requires advanced analytical skills, pattern recognition, emotional regulation under stress, and ability to maintain classified information security.',
              parsedRoles: ['Intelligence', 'Analysis'], seniority: 'Mid', tier: 'low' }
        ],
        'steve-harrington': [
            { id: 'sample-high', title: 'Team Lead, Customer Experience', company: 'Apple Retail',
              rawText: 'Apple seeks a Team Lead for our retail customer experience team. You will mentor associates, resolve customer escalations, manage daily store operations during your shift, and create a welcoming environment. Requires strong communication skills, leadership by example, product knowledge, and genuine enthusiasm for helping people.',
              parsedRoles: ['Retail', 'Customer Service'], seniority: 'Entry', tier: 'high' },
            { id: 'sample-mid', title: 'Youth Program Coordinator', company: 'Boys & Girls Club',
              rawText: 'The Boys & Girls Club seeks a Youth Program Coordinator to lead after-school programs for teens. You will mentor youth, plan activities, manage volunteers, ensure participant safety, and build trusting relationships with young people. Requires patience, protectiveness, ability to connect with teenagers, first aid certification, and a clean background check.',
              parsedRoles: ['Youth Services', 'Program Management'], seniority: 'Entry', tier: 'mid' },
            { id: 'sample-low', title: 'Assistant Store Manager', company: 'REI',
              rawText: 'REI seeks an Assistant Store Manager to lead daily operations, manage a team of 20+ associates, drive sales performance, handle inventory management, and develop staff through coaching and mentoring. Requires 2+ years retail supervisory experience, team building skills, physical fitness, and passion for customer service.',
              parsedRoles: ['Retail Management', 'Operations'], seniority: 'Mid', tier: 'low' }
        ],
        'dustin-henderson': [
            { id: 'sample-high', title: 'Junior Electronics Technician', company: 'SpaceX',
              rawText: 'SpaceX is hiring a Junior Electronics Technician to support our communications systems team. You will build and test radio frequency equipment, troubleshoot electronic systems, maintain documentation, and assist senior engineers. Requires strong aptitude for electronics, hands-on building experience, problem-solving skills, and enthusiasm for technical challenges.',
              parsedRoles: ['Electronics', 'Engineering'], seniority: 'Entry', tier: 'high' },
            { id: 'sample-mid', title: 'STEM Education Facilitator', company: 'Museum of Science & Industry',
              rawText: 'The Museum of Science & Industry seeks a STEM Education Facilitator to design and lead hands-on science programs for students. You will teach electronics, physics, and engineering concepts through interactive demonstrations, build educational prototypes, and inspire curiosity in young learners. Requires science knowledge, communication skills, and infectious enthusiasm.',
              parsedRoles: ['Education', 'STEM'], seniority: 'Entry', tier: 'mid' },
            { id: 'sample-low', title: 'Communications Systems Engineer', company: 'Motorola Solutions',
              rawText: 'Motorola Solutions seeks a Communications Systems Engineer to design and deploy public safety radio networks. You will engineer RF systems, conduct site surveys, troubleshoot complex radio installations, and support mission-critical communications. Requires RF engineering knowledge, radio licensing, systems troubleshooting, and project management skills.',
              parsedRoles: ['Communications', 'Engineering'], seniority: 'Mid', tier: 'low' }
        ],
        'joyce-byers': [
            { id: 'sample-high', title: 'Store Manager', company: 'Ace Hardware',
              rawText: 'Ace Hardware seeks a Store Manager to run daily operations at our Hawkins location. You will manage inventory, provide customer service, handle scheduling for 8 associates, maintain store appearance, and drive local marketing. Requires retail experience, reliability, budget management skills, and the ability to handle anything that comes through the door.',
              parsedRoles: ['Retail', 'Management'], seniority: 'Mid', tier: 'high' },
            { id: 'sample-mid', title: 'Community Outreach Coordinator', company: 'United Way',
              rawText: 'United Way seeks a Community Outreach Coordinator to build relationships with local families and service organizations. You will identify community needs, coordinate volunteer programs, manage crisis resources, connect families with support services, and advocate for underserved populations. Requires empathy, resourcefulness, persistence, and ability to navigate bureaucratic systems.',
              parsedRoles: ['Community Services', 'Outreach'], seniority: 'Mid', tier: 'mid' },
            { id: 'sample-low', title: 'Missing Persons Investigator', company: 'National Center for Missing & Exploited Children',
              rawText: 'NCMEC seeks a Missing Persons Investigator to support active cases and family services. You will conduct research, interview families, coordinate with law enforcement, analyze leads, and manage case documentation. Requires investigative tenacity, pattern recognition, empathy with families in crisis, and ability to persist when conventional methods fail.',
              parsedRoles: ['Investigation', 'Victim Services'], seniority: 'Mid', tier: 'low' }
        ],
        'vecna': [
            { id: 'sample-high', title: 'Chief Architect, Cloud Infrastructure', company: 'Amazon Web Services',
              rawText: 'AWS seeks a Chief Architect to design planet-scale distributed systems infrastructure. You will architect multi-region networks, design fault-tolerant systems, manage massive compute clusters, and build monitoring frameworks spanning millions of nodes. Requires mastery of systems architecture, network design, distributed computing, and ability to think in terms of entire ecosystems.',
              parsedRoles: ['Architecture', 'Infrastructure'], seniority: 'Executive', tier: 'high' },
            { id: 'sample-mid', title: 'Director of Psychological Operations', company: 'Department of Defense',
              rawText: 'The DoD seeks a Director of Psychological Operations to lead influence campaign development and execution. You will design strategic communication programs, analyze target audience vulnerabilities, develop persuasion frameworks, and coordinate multi-channel operations. Requires expertise in psychological warfare, strategic patience, and ability to operate across unconventional domains.',
              parsedRoles: ['Psychological Operations', 'Strategy'], seniority: 'Senior', tier: 'mid' },
            { id: 'sample-low', title: 'Chief Executive Officer', company: 'Neuralink',
              rawText: 'Neuralink seeks a CEO to lead our brain-computer interface company into commercial deployment. You will set corporate vision, manage neural engineering teams, navigate FDA regulatory approval, build strategic partnerships, and communicate a bold vision for the future of human-machine integration. Requires visionary leadership, comfort with biological systems, and willingness to fundamentally reshape human experience.',
              parsedRoles: ['Executive', 'Neurotechnology'], seniority: 'C-Suite', tier: 'low' }
        ],
        'logan-roy': [
            { id: 'sample-high', title: 'Chairman & CEO', company: 'News Corp',
              rawText: 'News Corp seeks a Chairman & CEO to lead our global media empire spanning broadcast, publishing, and digital platforms. You will set corporate strategy, manage board relations, oversee $15B revenue portfolio, drive M&A activity, and maintain editorial direction across properties. Requires 20+ years media industry leadership, board governance expertise, and ability to command loyalty in high-stakes environments.',
              parsedRoles: ['CEO', 'Media'], seniority: 'C-Suite', tier: 'high' },
            { id: 'sample-mid', title: 'CEO', company: 'Warner Bros. Discovery',
              rawText: 'Warner Bros. Discovery seeks a CEO to lead our combined media and entertainment company through digital transformation. You will manage $40B revenue portfolio, direct content strategy, oversee streaming platform development, navigate regulatory landscape, and rebuild investor confidence. Requires media empire leadership, M&A experience, political relationships, and ability to make decisions others cannot.',
              parsedRoles: ['CEO', 'Entertainment'], seniority: 'C-Suite', tier: 'mid' },
            { id: 'sample-low', title: 'U.S. Ambassador to the United Kingdom', company: 'U.S. State Department',
              rawText: 'The State Department seeks a U.S. Ambassador to the United Kingdom. You will represent American interests, manage diplomatic relationships, host high-level delegations, navigate complex political stakeholder dynamics, and influence bilateral trade policy. Requires political connections, negotiation skills at the highest level, media savvy, and ability to command respect in rooms full of heads of state.',
              parsedRoles: ['Diplomacy', 'Government'], seniority: 'C-Suite', tier: 'low' }
        ],
        'kendall-roy': [
            { id: 'sample-high', title: 'Managing Director, TMT M&A', company: 'Goldman Sachs',
              rawText: 'Goldman Sachs seeks a Managing Director to lead our Technology, Media & Telecom M&A advisory practice. You will originate and execute $10B+ transactions, manage client relationships with Fortune 100 CEOs, lead deal teams of 30+ professionals, and develop junior talent. Requires 15+ years investment banking experience, deep media industry expertise, and proven track record of closing transformative transactions.',
              parsedRoles: ['Investment Banking', 'M&A'], seniority: 'Executive', tier: 'high' },
            { id: 'sample-mid', title: 'Chief Strategy Officer', company: 'Spotify',
              rawText: 'Spotify seeks a Chief Strategy Officer to drive corporate strategy and M&A activity. You will evaluate acquisition targets, develop competitive positioning, lead digital transformation initiatives, manage investor relations, and present to the board. Requires expertise in digital media strategy, financial modeling, capital markets, and experience navigating rapid industry disruption.',
              parsedRoles: ['Strategy', 'M&A'], seniority: 'Executive', tier: 'mid' },
            { id: 'sample-low', title: 'CEO', company: 'Vice Media',
              rawText: 'Vice Media seeks a CEO to lead our turnaround and digital transformation. You will restructure operations, raise capital, rebuild advertiser relationships, develop streaming strategy, and restore brand credibility. Requires media industry experience, turnaround leadership, fundraising capability, and ability to inspire a demoralized organization while making tough decisions.',
              parsedRoles: ['CEO', 'Media'], seniority: 'C-Suite', tier: 'low' }
        ],
        'shiv-roy': [
            { id: 'sample-high', title: 'Chief Communications Officer', company: 'Meta',
              rawText: 'Meta seeks a Chief Communications Officer to lead global corporate communications, government affairs, and crisis management. You will manage media relations, develop political strategy, oversee internal communications for 80,000 employees, and navigate regulatory scrutiny. Requires political strategy background, crisis communications expertise, stakeholder management, and ability to operate in hostile media environments.',
              parsedRoles: ['Communications', 'Government Affairs'], seniority: 'Executive', tier: 'high' },
            { id: 'sample-mid', title: 'Senior Partner, Political Strategy', company: 'McKinsey',
              rawText: 'McKinsey seeks a Senior Partner to lead our Political & Social Strategy practice. You will advise governments and corporations on organizational transformation, political risk, stakeholder engagement, and crisis navigation. Requires campaign management experience, policy expertise, change management skills, and ability to influence senior leaders on sensitive organizational dynamics.',
              parsedRoles: ['Strategy', 'Political Consulting'], seniority: 'Executive', tier: 'mid' },
            { id: 'sample-low', title: 'Chief People Officer', company: 'Salesforce',
              rawText: 'Salesforce seeks a Chief People Officer to lead our global HR transformation. You will redesign organizational structure, build diversity and inclusion programs, manage executive talent assessment, lead change management across 70,000 employees, and advise the CEO on culture strategy. Requires organizational behavior expertise, executive coaching background, and data-driven HR strategy skills.',
              parsedRoles: ['HR', 'Organizational Development'], seniority: 'C-Suite', tier: 'low' }
        ],
        'roman-roy': [
            { id: 'sample-high', title: 'VP of Content Strategy', company: 'Netflix',
              rawText: 'Netflix seeks a VP of Content Strategy to lead programming decisions across our entertainment portfolio. You will evaluate content investments, identify audience trends, manage creative talent relationships, and develop original programming strategy. Requires instinctive understanding of audience psychology, entertainment industry relationships, digital media expertise, and willingness to take creative risks.',
              parsedRoles: ['Content', 'Entertainment'], seniority: 'Executive', tier: 'high' },
            { id: 'sample-mid', title: 'Chief Brand Officer', company: 'TikTok',
              rawText: 'TikTok seeks a Chief Brand Officer to lead global brand strategy and marketing. You will direct social media campaigns, manage influencer partnerships, develop brand architecture, and drive audience growth among younger demographics. Requires native understanding of digital culture, creative instincts, international business development, and ability to move fast in dynamic markets.',
              parsedRoles: ['Brand', 'Digital Media'], seniority: 'Executive', tier: 'mid' },
            { id: 'sample-low', title: 'CEO, Theme Parks & Experiences', company: 'Walt Disney Company',
              rawText: 'Disney seeks a CEO for our Parks & Experiences division to lead a $30B business unit. You will oversee global theme park operations, develop new attractions, manage entertainment talent, drive hospitality innovation, and build international expansion strategy. Requires entertainment operations experience, brand management, P&L ownership, and vision for immersive guest experiences.',
              parsedRoles: ['Entertainment', 'Operations'], seniority: 'C-Suite', tier: 'low' }
        ],
        'tom-wambsgans': [
            { id: 'sample-high', title: 'SVP of Operations & Compliance', company: 'Fox Corporation',
              rawText: 'Fox Corporation seeks an SVP of Operations & Compliance to oversee broadcast operations and regulatory compliance across our media properties. You will manage operational efficiency, lead crisis response, coordinate with legal teams, oversee talent contracts, and ensure FCC compliance. Requires media operations experience, regulatory knowledge, crisis navigation skills, and ability to thrive in complex organizational politics.',
              parsedRoles: ['Operations', 'Compliance'], seniority: 'Executive', tier: 'high' },
            { id: 'sample-mid', title: 'Chief Operating Officer', company: 'Paramount Global',
              rawText: 'Paramount Global seeks a COO to lead operational integration across our media portfolio. You will standardize processes across divisions, manage $2B operational budget, oversee vendor relationships, and drive post-merger integration planning. Requires enterprise operations experience, budget management, institutional knowledge-building, and strategic patience to navigate complex corporate environments.',
              parsedRoles: ['Operations', 'Media'], seniority: 'C-Suite', tier: 'mid' },
            { id: 'sample-low', title: 'CEO', company: 'iHeartMedia',
              rawText: 'iHeartMedia seeks a CEO to lead our radio and podcast media company through industry transformation. You will set corporate vision, manage investor relations, oversee 850+ radio stations, build podcast strategy, and navigate complex regulatory landscape. Requires media industry leadership, operational discipline, political navigation skills, and ability to build trust with skeptical stakeholders.',
              parsedRoles: ['CEO', 'Media'], seniority: 'C-Suite', tier: 'low' }
        ],
        'connor-roy': [
            { id: 'sample-high', title: 'Director of Cultural Affairs', company: 'City of Santa Fe',
              rawText: 'The City of Santa Fe seeks a Director of Cultural Affairs to lead arts programming, heritage preservation, and cultural event management. You will manage relationships with artists and galleries, coordinate festivals, oversee public art installations, and promote Santa Fe as a cultural destination. Requires arts patronage experience, event management, community engagement, and genuine passion for cultural preservation.',
              parsedRoles: ['Arts', 'Cultural Affairs'], seniority: 'Senior', tier: 'high' },
            { id: 'sample-mid', title: 'Ranch Operations Manager', company: 'Turner Ranches',
              rawText: 'Turner Ranches seeks an Operations Manager to oversee a 50,000-acre working cattle ranch. You will manage livestock operations, coordinate seasonal activities, supervise ranch hands, maintain equipment, implement conservation practices, and host VIP guests. Requires ranching experience, land management knowledge, hospitality skills, and ability to balance production with environmental stewardship.',
              parsedRoles: ['Ranch Operations', 'Hospitality'], seniority: 'Mid', tier: 'mid' },
            { id: 'sample-low', title: 'Deputy Chief of Mission', company: 'U.S. Embassy Ljubljana',
              rawText: 'The State Department seeks a Deputy Chief of Mission for the U.S. Embassy in Ljubljana, Slovenia. You will manage embassy operations, coordinate diplomatic programs, represent U.S. interests at government events, and build bilateral relationships. Requires diplomatic experience, cultural sensitivity, stakeholder relationship management, and willingness to represent your country with optimism and persistence.',
              parsedRoles: ['Diplomacy', 'Government'], seniority: 'Executive', tier: 'low' }
        ],
        'tyrion-lannister': [
            { id: 'sample-high', title: 'Chief of Staff to the Secretary-General', company: 'United Nations',
              rawText: 'The United Nations seeks a Chief of Staff to the Secretary-General. You will lead strategic planning across 193 member states, conduct political analysis of emerging crises, and manage complex stakeholder management across competing factions. Core responsibilities include alliance building between hostile parties, high-stakes negotiation of multilateral agreements, and crisis management during geopolitical flashpoints. You will oversee public administration of UN agencies, provide financial management oversight of the $3.2B budget, and deliver persuasive communication to the General Assembly and Security Council. The role demands exceptional intelligence gathering on member state positions, pattern recognition in geopolitical trends, conflict resolution between rival delegations, cross-cultural communication fluency, and rigorous risk assessment of intervention options. You will demonstrate leadership under pressure during humanitarian emergencies, draw on historical analysis to inform policy, and show resilience navigating institutional politics. Requires adaptive leadership across diverse organizational cultures, talent assessment for senior appointments, mastery of rhetoric in diplomatic settings, economic analysis capability, emotional intelligence in sensitive negotiations, organizational design experience, and budget management at scale.',
              parsedRoles: ['Diplomacy', 'Strategy'], seniority: 'C-Suite', tier: 'high' },
            { id: 'sample-mid', title: 'VP of Government Affairs & Geopolitical Strategy', company: 'Palantir',
              rawText: 'Palantir seeks a VP of Government Affairs to lead political strategy and geopolitical engagement. You will drive strategic planning for government market expansion, conduct political analysis of regulatory landscapes, and own stakeholder management with defense and intelligence agencies. Requires exceptional negotiation skills with government procurement offices, alliance building across inter-agency partnerships, crisis management during congressional investigations, and persuasive communication with elected officials. You will lead intelligence gathering on competitor positioning, demonstrate pattern recognition in policy trends, execute conflict resolution between engineering and government teams, conduct risk assessment of regulatory exposure, show leadership under pressure during public scrutiny, apply cross-cultural communication across allied nations, and bring talent assessment skills for government relations hiring. Must display resilience navigating complex institutional politics, emotional intelligence in high-stakes government relationships, and budget management overseeing the public sector business unit.',
              parsedRoles: ['Government Affairs', 'Strategy'], seniority: 'Executive', tier: 'mid' },
            { id: 'sample-low', title: 'Director of Strategic Advisory', company: 'McKinsey & Company',
              rawText: 'McKinsey seeks a Director to lead our Government & Public Sector strategic advisory practice. You will advise heads of state and cabinet ministers on governance reform, institutional design, and coalition-building. The role involves strategic planning for national transformation programs, negotiation with multilateral stakeholders, and crisis management during political transitions. Requires demonstrated financial management capability, persuasive communication with executive audiences, and organizational design expertise for public institutions. Must bring resilience operating in politically sensitive environments and strong budget management discipline.',
              parsedRoles: ['Consulting', 'Public Sector'], seniority: 'Executive', tier: 'low' }
        ],
        'cersei-lannister': [
            { id: 'sample-high', title: 'CEO', company: 'Lockheed Martin',
              rawText: 'Lockheed Martin seeks a CEO to lead our $67B defense and aerospace enterprise. You will execute power acquisition strategies in new defense markets, navigate organizational politics across Pentagon stakeholders, and deploy strategic intimidation in competitive procurement battles. Core capabilities include alliance negotiation with allied defense ministries, financial leverage management across a $15B R&D portfolio, and crisis decision-making during program failures and geopolitical escalations. You will own succession planning for 200+ senior leaders, lead competitive intelligence operations against rival defense contractors, and drive institutional manipulation of regulatory frameworks in your favor. The role demands talent recruitment of world-class engineers, brand management protecting our reputation with Congress, exceptional risk tolerance on multi-billion-dollar program bets, and defensive strategy against activist investors. You must demonstrate regulatory manipulation expertise navigating ITAR and export controls, commanding executive presence before congressional committees, vendor management of 30,000+ suppliers, psychological warfare awareness in competitive intelligence, and operational security protecting classified programs.',
              parsedRoles: ['CEO', 'Defense'], seniority: 'C-Suite', tier: 'high' },
            { id: 'sample-mid', title: 'Managing Director, Hostile M&A Advisory', company: 'Goldman Sachs',
              rawText: 'Goldman Sachs seeks a Managing Director to lead our hostile M&A advisory practice. You will advise on power acquisition through corporate takeovers, navigate organizational politics of target company boards, and execute strategic intimidation in proxy fights. Requires alliance negotiation with activist investors, financial leverage structuring for leveraged buyouts, and crisis decision-making during live deal situations. Must demonstrate competitive intelligence gathering on target companies, brand management of client reputation during hostile proceedings, risk tolerance on high-conviction deal strategies, executive presence in boardroom presentations, and vendor management of legal and advisory teams. Requires operational security protecting deal-sensitive information.',
              parsedRoles: ['Investment Banking', 'M&A'], seniority: 'Executive', tier: 'mid' },
            { id: 'sample-low', title: 'Chief Political Strategist', company: 'National Political Campaign',
              rawText: 'Seeking a Chief Political Strategist for a national presidential campaign. You will manage organizational politics across party factions, execute crisis decision-making during media firestorms, and build competitive intelligence operations against opponents. Requires brand management of the candidate\'s public image, executive presence at campaign events, risk tolerance making high-stakes tactical bets, and operational security protecting campaign strategy from leaks. Must demonstrate psychological warfare awareness in opposition research.',
              parsedRoles: ['Political Strategy', 'Campaign'], seniority: 'Executive', tier: 'low' }
        ],
        'daenerys-targaryen': [
            { id: 'sample-high', title: 'CEO', company: 'Abu Dhabi Investment Authority',
              rawText: 'The Abu Dhabi Investment Authority seeks a CEO to lead one of the world\'s largest sovereign wealth funds managing $990B+ in global assets. You will provide visionary leadership setting multi-decade investment strategy, oversee scaling operations across 30+ country offices, and direct military-grade security strategy protecting sovereign assets. Core responsibilities include force projection of economic influence across emerging markets, social transformation through sustainable investment mandates, and coalition building with sovereign funds, central banks, and heads of state. The role demands diplomatic communication with royal families and government leaders, crisis leadership during market dislocations, talent identification recruiting top global investment professionals, and brand building establishing ADIA as the world\'s premier institutional investor. You must demonstrate insurgency management navigating hostile regulatory environments, resource acquisition identifying undervalued sovereign assets, exceptional public speaking at Davos and G20 forums, governance design for investment committees, cross-cultural leadership managing 65+ nationalities, supply chain management oversight of real estate and infrastructure portfolios, resilience through market cycles, and succession and legacy planning for generational wealth preservation.',
              parsedRoles: ['CEO', 'Sovereign Finance'], seniority: 'C-Suite', tier: 'high' },
            { id: 'sample-mid', title: 'Deputy Secretary-General', company: 'United Nations',
              rawText: 'The United Nations seeks a Deputy Secretary-General to lead peacekeeping and humanitarian operations across 50+ countries. You will demonstrate visionary leadership setting UN reform agenda, oversee scaling operations from regional to continental peacekeeping missions, and execute military strategy coordinating multinational forces. Requires coalition building with member state governments, diplomatic communication with Security Council ambassadors, crisis leadership during active conflicts, talent identification appointing special envoys, and brand building for UN credibility. Must show cross-cultural leadership managing diverse peacekeeping forces, public speaking before the General Assembly, supply chain management of humanitarian logistics, and resilience operating under sustained political pressure.',
              parsedRoles: ['International Affairs', 'Leadership'], seniority: 'C-Suite', tier: 'mid' },
            { id: 'sample-low', title: 'Chief Impact Officer', company: 'Open Society Foundations',
              rawText: 'Open Society Foundations seeks a Chief Impact Officer to lead global programs promoting democracy and human rights. You will provide visionary leadership for $1.5B in annual grants, build coalition partnerships with liberation movements, demonstrate brand building as the public face of global philanthropy, and show resilience operating in politically hostile environments. Requires public speaking at international conferences, cross-cultural leadership, and crisis leadership responding to authoritarian crackdowns against grantees.',
              parsedRoles: ['Social Impact', 'Foundation'], seniority: 'C-Suite', tier: 'low' }
        ],
        'jon-snow': [
            { id: 'sample-high', title: 'Director of National Emergency Operations', company: 'FEMA',
              rawText: 'FEMA seeks a Director of National Emergency Operations to lead disaster response across the United States. You will demonstrate crisis leadership commanding multi-agency task forces during catastrophic events, coalition building uniting federal, state, and military responders who rarely cooperate, and military tactics coordinating National Guard deployments. Core requirements include strategic decision-making under extreme time pressure with incomplete information, inspirational leadership rallying demoralized response teams, intelligence operations synthesizing real-time threat data, and negotiation with state governors and local officials over resource allocation. You must show personnel development building the next generation of emergency managers, ethical leadership maintaining public trust during politically charged disasters, adaptive strategy when initial response plans fail, inter-cultural communication working with diverse affected communities, garrison command managing FEMA regional offices, reconnaissance conducting rapid damage assessment, moral courage making evacuation decisions that will be second-guessed, and survival skills operating in extreme weather operations and austere disaster environments.',
              parsedRoles: ['Emergency Management', 'Leadership'], seniority: 'Executive', tier: 'high' },
            { id: 'sample-mid', title: 'VP of Security & Humanitarian Operations', company: 'International Committee of the Red Cross',
              rawText: 'The ICRC seeks a VP of Security and Humanitarian Operations to lead protection in conflict zones. You will demonstrate crisis leadership managing field operations under fire, coalition building uniting warring factions for humanitarian access, negotiation with armed groups over prisoner treatment and aid corridors, and ethical leadership upholding the Geneva Conventions. Requires intelligence operations assessing security threats, strategic decision-making on field team deployment, inter-cultural communication with diverse populations, personnel development mentoring field delegates, survival skills in hostile environments, moral courage entering active conflict zones, and adaptive strategy when ceasefire agreements collapse.',
              parsedRoles: ['Security', 'Humanitarian'], seniority: 'Executive', tier: 'mid' },
            { id: 'sample-low', title: 'Park Superintendent', company: 'National Park Service — Denali',
              rawText: 'The National Park Service seeks a Superintendent for Denali National Park. You will demonstrate crisis leadership during search-and-rescue emergencies, garrison command managing 200+ rangers across 6 million acres, and personnel development building ranger capabilities. Requires extreme weather operations in arctic conditions, survival skills in remote wilderness, ethical leadership as a public steward, and reconnaissance assessing trail and wildlife conditions.',
              parsedRoles: ['Conservation', 'Operations'], seniority: 'Senior', tier: 'low' }
        ],
        'petyr-baelish': [
            { id: 'sample-high', title: 'Managing Partner & CIO', company: 'Bridgewater Associates',
              rawText: 'Bridgewater Associates seeks a Managing Partner and Chief Investment Officer to lead our $150B macro investment strategy. You will apply financial engineering to structure complex derivative positions, execute political manipulation — reading central bank signals and government policy shifts before markets price them in, and deploy strategic deception through misdirection in portfolio positioning. Core capabilities include information warfare leveraging proprietary data networks for alpha generation, revenue generation across global macro, credit, and currency strategies, and asset acquisition identifying distressed opportunities. The role demands network building with sovereign wealth funds and central banks, long-range planning developing multi-year macro theses, rigorous risk management across $150B in exposure, and persuasion in capital raising from institutional allocators. You must demonstrate market analysis synthesizing geopolitical and economic signals, institutional knowledge of Federal Reserve operations and Treasury markets, crisis exploitation turning market dislocations into outsized returns, due diligence on sovereign credit and corporate targets, operational security protecting proprietary trading strategies, and social climbing building relationships across the global financial establishment.',
              parsedRoles: ['Finance', 'Investment'], seniority: 'C-Suite', tier: 'high' },
            { id: 'sample-mid', title: 'Chief Strategy Officer', company: 'The Blackstone Group',
              rawText: 'Blackstone seeks a Chief Strategy Officer to identify and execute transformative deals. You will apply financial engineering structuring complex transactions, leverage network building cultivating deal flow relationships, and demonstrate asset acquisition identifying undervalued targets. Requires long-range planning for portfolio construction, risk management across deal exposure, persuasion in negotiating terms, market analysis evaluating sectors, due diligence on target companies, revenue generation from portfolio optimization, and institutional knowledge of private equity market dynamics. Must show operational security during sensitive deal processes.',
              parsedRoles: ['Private Equity', 'Strategy'], seniority: 'C-Suite', tier: 'mid' },
            { id: 'sample-low', title: 'Director of Political Intelligence', company: 'Eurasia Group',
              rawText: 'Eurasia Group seeks a Director of Political Intelligence to lead geopolitical risk analysis. You will deploy information warfare techniques gathering intelligence on regime stability, demonstrate market analysis assessing political risk exposure for clients, and apply risk management frameworks to geopolitical scenarios. Requires network building with political sources, persuasion presenting to institutional clients, and due diligence evaluating emerging market governance.',
              parsedRoles: ['Intelligence', 'Consulting'], seniority: 'Executive', tier: 'low' }
        ],
        'tywin-lannister': [
            { id: 'sample-high', title: 'Chairman & CEO', company: 'Berkshire Hathaway',
              rawText: 'Berkshire Hathaway seeks a Chairman & CEO to lead our $900B conglomerate. You will demonstrate executive leadership commanding a portfolio of 60+ operating companies, strategic planning setting multi-decade capital allocation strategy, and military command-level decisiveness in competitive market battles. Core requirements include army logistics-scale coordination across global supply chains, financial management overseeing $300B+ in investments, wealth preservation protecting the permanent capital base, and alliance architecture building partnerships with portfolio company CEOs. The role demands succession planning ensuring generational continuity, governance administration of board operations and shareholder relations, talent management identifying and developing subsidiary leaders, and intimidation and deterrence establishing competitive moats that discourage rivals. You must show negotiation expertise in deal-making, crisis management during market dislocations, organizational restructuring of underperforming subsidiaries, legacy building extending the institutional culture, delegation empowering operating managers, political judgment navigating regulatory landscapes, supply chain management oversight, and institutional design building systems that outlast any individual leader.',
              parsedRoles: ['CEO', 'Conglomerate'], seniority: 'C-Suite', tier: 'high' },
            { id: 'sample-mid', title: 'Secretary of Defense', company: 'United States Government',
              rawText: 'The President seeks a Secretary of Defense to lead the Department of Defense with 3.4M personnel and $850B annual budget. You will demonstrate executive leadership commanding the world\'s largest organization, strategic planning for national defense posture, and military command overseeing all armed services. Requires financial management of defense budgets, alliance architecture maintaining NATO and bilateral partnerships, governance administration of Pentagon bureaucracy, talent management developing senior military leaders, negotiation with Congress on defense authorization, crisis management during national security emergencies, delegation across combatant commands, and political judgment advising the President on use of force decisions.',
              parsedRoles: ['Defense', 'Government'], seniority: 'C-Suite', tier: 'mid' },
            { id: 'sample-low', title: 'Executive Chairman', company: 'JPMorgan Chase',
              rawText: 'JPMorgan Chase seeks an Executive Chairman to provide strategic oversight of the world\'s largest bank. You will demonstrate executive leadership guiding corporate strategy, succession planning for CEO transition, financial management oversight of the balance sheet, crisis management navigating regulatory challenges, governance administration of board operations, and legacy building protecting the institution\'s 225-year reputation. Requires negotiation with regulators and political judgment in stakeholder relations.',
              parsedRoles: ['Banking', 'Governance'], seniority: 'C-Suite', tier: 'low' }
        ]
    };
    
    // Use character-specific jobs if available
    if (characterJobs[templateId]) {
        jobMeta = characterJobs[templateId];
    } else if (isRecruiter) {
        jobMeta = [
            { id: 'sample-high', title: 'Senior Technical Recruiter', company: 'Datadog',
              rawText: 'Datadog is hiring a Senior Technical Recruiter to drive full-lifecycle hiring across our engineering organization. You will own sourcing strategy, candidate experience, and stakeholder partnerships for technical hiring across multiple product teams. This is a high-impact role for someone who thrives in fast-paced SaaS environments and can balance volume hiring with quality bar management.',
              parsedRoles: ['Recruiting', 'HR'], seniority: 'Senior', tier: 'high' },
            { id: 'sample-mid', title: 'Talent Acquisition Manager', company: 'Figma',
              rawText: 'Figma seeks a Talent Acquisition Manager to build and lead a recruiting team supporting go-to-market and G&A functions. You will design scalable hiring processes, develop workforce plans, partner with finance on headcount modeling, and implement recruiting analytics. Experience with employer brand strategy, executive search, and international hiring required.',
              parsedRoles: ['Talent Acquisition', 'Management'], seniority: 'Senior', tier: 'mid' },
            { id: 'sample-low', title: 'Director, People Analytics & Workforce Strategy', company: 'McKinsey',
              rawText: 'McKinsey is seeking a Director of People Analytics & Workforce Strategy to lead advanced analytics capabilities across our global people function. This role requires deep expertise in statistical modeling, predictive workforce analytics, organizational design, compensation benchmarking, and HRIS architecture. You will build machine learning models for attrition prediction, design org network analysis frameworks, and advise partners on talent deployment optimization.',
              parsedRoles: ['People Analytics', 'HR Strategy'], seniority: 'Executive', tier: 'low' }
        ];
    } else if (isProduct) {
        jobMeta = [
            { id: 'sample-high', title: 'Senior Product Manager, Collaboration', company: 'Notion',
              rawText: 'Notion is hiring a Senior Product Manager to own our collaboration and real-time editing features. You will drive product strategy, run experiments, analyze user data, manage the roadmap, and work cross-functionally with engineering and design. Strong product sense, analytical skills, and experience shipping consumer products required.',
              parsedRoles: ['Product', 'Technology'], seniority: 'Senior', tier: 'high' },
            { id: 'sample-mid', title: 'Director of Product, Platform', company: 'Stripe',
              rawText: 'Stripe is looking for a Director of Product to lead our platform and developer experience team. You will set multi-year strategy, manage a team of PMs, own P&L for platform products, drive executive alignment, and build partnerships with key ecosystem players. Requires experience with API products, developer tooling, and enterprise sales motion.',
              parsedRoles: ['Product', 'Leadership'], seniority: 'Executive', tier: 'mid' },
            { id: 'sample-low', title: 'VP Engineering, Machine Learning Infrastructure', company: 'Scale AI',
              rawText: 'Scale AI seeks a VP of Engineering to lead our ML Infrastructure division. This role requires hands-on expertise in distributed systems architecture, GPU cluster management, model training pipelines, MLOps automation, Kubernetes orchestration, and C++ performance optimization. You will manage 60+ engineers, own a $40M infrastructure budget, and drive our technical roadmap for foundation model training.',
              parsedRoles: ['Engineering', 'ML Infrastructure'], seniority: 'Executive', tier: 'low' }
        ];
    } else if (isRetail) {
        jobMeta = [
            { id: 'sample-high', title: 'Customer Service Associate', company: 'Target',
              rawText: 'Target is hiring a Customer Service Associate for our guest services team. You will handle transactions, assist customers with returns and exchanges, maintain store standards, and support team goals. Strong communication skills, cash handling experience, and a friendly attitude required. Flexible scheduling including weekends and holidays.',
              parsedRoles: ['Customer Service', 'Retail'], seniority: 'Entry', tier: 'high' },
            { id: 'sample-mid', title: 'Shift Supervisor', company: 'Starbucks',
              rawText: 'Starbucks is looking for a Shift Supervisor to lead store operations during assigned shifts. You will manage team workflow, handle customer escalations, oversee cash management and inventory counts, train new partners, and ensure food safety compliance. Prior retail supervisory experience, barista skills, and ability to work in fast-paced environments required.',
              parsedRoles: ['Retail Management', 'Food Service'], seniority: 'Entry', tier: 'mid' },
            { id: 'sample-low', title: 'Assistant Store Manager', company: 'Nordstrom',
              rawText: 'Nordstrom seeks an Assistant Store Manager to oversee daily store operations, manage a team of 20+ associates, drive sales performance, handle P&L responsibilities, lead visual merchandising strategy, and manage vendor relationships. Requires 3+ years retail management experience, strong analytical skills, inventory management expertise, and ability to develop and coach teams.',
              parsedRoles: ['Store Management', 'Retail Operations'], seniority: 'Mid', tier: 'low' }
        ];
    } else if (isTrades) {
        jobMeta = [
            { id: 'sample-high', title: 'Stylist', company: 'Great Clips',
              rawText: 'Great Clips is hiring a licensed Stylist to join our team. You will provide haircuts, styling services, color applications, and consultations. Strong customer service, time management, and technical hair skills required. Must hold valid cosmetology license. Competitive base pay plus tips and product commission.',
              parsedRoles: ['Stylist', 'Customer Service'], seniority: 'Entry', tier: 'high' },
            { id: 'sample-mid', title: 'Senior Stylist & Colorist', company: 'Aveda Salon',
              rawText: 'Aveda Salon seeks a Senior Stylist & Colorist with advanced color correction experience. You will manage a full book of clients, mentor junior stylists, drive retail product sales, and maintain expertise in current trends and techniques. Requires 3+ years behind the chair, balayage and vivid color certification preferred, and strong client retention track record.',
              parsedRoles: ['Senior Stylist', 'Colorist'], seniority: 'Senior', tier: 'mid' },
            { id: 'sample-low', title: 'Salon Manager', company: 'Ulta Beauty',
              rawText: 'Ulta Beauty is looking for a Salon Manager to lead a team of 10+ stylists, manage scheduling and payroll, drive salon revenue targets, handle inventory and vendor ordering, maintain health and safety compliance, and build client loyalty programs. Requires cosmetology license, 3+ years management experience, P&L knowledge, and retail operations expertise.',
              parsedRoles: ['Salon Management', 'Retail Operations'], seniority: 'Mid', tier: 'low' }
        ];
    } else if (isStrategy || (!isTech && !isRecruiter)) {
        // Strategy/Advisory/Executive — Cliff Jones and any unmatched exec profiles
        jobMeta = [
            { id: 'sample-high', title: 'VP of Strategy & Transformation', company: 'ServiceNow',
              rawText: 'ServiceNow is hiring a VP of Strategy & Transformation to lead enterprise-wide strategic initiatives. You will drive digital transformation programs, develop competitive positioning, lead cross-functional teams, present to C-suite stakeholders, and shape thought leadership content. This role requires deep experience in strategic planning, change management, and executive communication.',
              parsedRoles: ['Strategy', 'Executive'], seniority: 'Executive', tier: 'high' },
            { id: 'sample-mid', title: 'Director of AI Strategy & Advisory', company: 'Deloitte',
              rawText: 'Deloitte seeks a Director to lead AI Strategy engagements for Fortune 500 clients. You will assess organizational AI readiness, build transformation roadmaps, advise on responsible AI governance, develop client relationships, and publish thought leadership. Requires blend of strategic thinking, AI literacy, consulting skills, and ability to influence C-level executives on technology adoption.',
              parsedRoles: ['Strategy', 'Consulting'], seniority: 'Senior', tier: 'mid' },
            { id: 'sample-low', title: 'Chief Data Officer', company: 'Palantir',
              rawText: 'Palantir is seeking a Chief Data Officer to build our enterprise data governance function from the ground up. This role requires deep expertise in data architecture, SQL and Python programming, statistical modeling, regulatory compliance (GDPR, CCPA, SOX), data mesh architecture, ETL pipeline design, and cloud infrastructure management. You will own a $25M data platform budget, build a 40-person data engineering team, and implement real-time analytics infrastructure.',
              parsedRoles: ['Data', 'Executive'], seniority: 'Executive', tier: 'low' }
        ];
    } else {
        // Technology/Engineering — Mike Rodriguez
        jobMeta = [
            { id: 'sample-high', title: 'Senior Software Engineer, Platform', company: 'Cloudflare',
              rawText: 'Cloudflare is hiring a Senior Software Engineer for our core platform team. You will design and build distributed systems that handle millions of requests per second, improve observability and reliability, mentor junior engineers, and contribute to architecture decisions. Strong experience with systems programming, networking, and performance optimization required. Experience with Go, Rust, or C++ preferred.',
              parsedRoles: ['Engineering', 'Platform'], seniority: 'Senior', tier: 'high' },
            { id: 'sample-mid', title: 'Staff Engineer, Infrastructure', company: 'Datadog',
              rawText: 'Datadog seeks a Staff Engineer to lead technical direction for our cloud infrastructure platform. You will design large-scale distributed systems, drive cross-team technical initiatives, evaluate build vs buy decisions, and own system reliability targets. Requires deep expertise in cloud architecture, container orchestration, database internals, and capacity planning. Must have shipped production systems at significant scale.',
              parsedRoles: ['Engineering', 'Infrastructure'], seniority: 'Staff', tier: 'mid' },
            { id: 'sample-low', title: 'Director of Engineering, AI/ML', company: 'Anthropic',
              rawText: 'Anthropic seeks a Director of Engineering to lead our AI/ML training infrastructure team. This role requires deep expertise in distributed training systems, GPU cluster management, model optimization, research engineering management, and scientific computing. You will manage a team of 25+ research engineers, own training compute budget and efficiency, and drive technical strategy for next-generation model development.',
              parsedRoles: ['Engineering Management', 'AI/ML'], seniority: 'Director', tier: 'low' }
        ];
    }
    
    // Helpers
    function pickRandom(arr, n) {
        var shuffled = arr.slice().sort(function() { return 0.5 - Math.random(); });
        return shuffled.slice(0, Math.min(n, shuffled.length));
    }
    function matchingProf(level) {
        var levels = ['Novice', 'Competent', 'Proficient', 'Advanced', 'Expert', 'Mastery'];
        var idx = levels.indexOf(level);
        return levels[Math.max(0, idx === -1 ? 2 : idx)];
    }
    function stretchProf(level) {
        var levels = ['Novice', 'Competent', 'Proficient', 'Advanced', 'Expert', 'Mastery'];
        var idx = levels.indexOf(level);
        return levels[Math.min((idx === -1 ? 2 : idx) + 1, 5)];
    }
    
    // Gap skill pools — skills unlikely to be in recruiter/product/strategy profiles
    var gapPools = {
        technical: [
            { name: 'Kubernetes Administration', cat: 'Technical' },
            { name: 'SQL Database Design', cat: 'Technical' },
            { name: 'Python Programming', cat: 'Technical' },
            { name: 'Cloud Architecture (AWS)', cat: 'Technical' },
            { name: 'Machine Learning Engineering', cat: 'Technical' },
            { name: 'CI/CD Pipeline Management', cat: 'Technical' },
            { name: 'API Design & Governance', cat: 'Technical' },
            { name: 'Statistical Modeling', cat: 'Technical' },
            { name: 'Data Pipeline Architecture', cat: 'Technical' },
            { name: 'Cybersecurity Compliance', cat: 'Technical' }
        ],
        finance: [
            { name: 'Financial Modeling', cat: 'Business' },
            { name: 'Revenue Forecasting', cat: 'Business' },
            { name: 'Capital Allocation Strategy', cat: 'Business' },
            { name: 'Regulatory Compliance (SOX)', cat: 'Business' },
            { name: 'Actuarial Analysis', cat: 'Business' },
            { name: 'Tax Strategy', cat: 'Business' },
            { name: 'Treasury Management', cat: 'Business' },
            { name: 'Mergers & Acquisitions Due Diligence', cat: 'Business' }
        ],
        operations: [
            { name: 'Supply Chain Optimization', cat: 'Operations' },
            { name: 'Lean Six Sigma', cat: 'Operations' },
            { name: 'Facilities Management', cat: 'Operations' },
            { name: 'Logistics Planning', cat: 'Operations' },
            { name: 'Procurement Strategy', cat: 'Operations' },
            { name: 'Quality Assurance Frameworks', cat: 'Operations' },
            { name: 'Vendor Risk Assessment', cat: 'Operations' },
            { name: 'Capacity Planning', cat: 'Operations' }
        ],
        data: [
            { name: 'Predictive Analytics', cat: 'Technical' },
            { name: 'Data Governance Frameworks', cat: 'Technical' },
            { name: 'ETL Pipeline Design', cat: 'Technical' },
            { name: 'Real-Time Analytics Infrastructure', cat: 'Technical' },
            { name: 'Data Mesh Architecture', cat: 'Technical' },
            { name: 'Natural Language Processing', cat: 'Technical' },
            { name: 'Computer Vision Systems', cat: 'Technical' },
            { name: 'GPU Cluster Management', cat: 'Technical' }
        ],
        management: [
            { name: 'P&L Management', cat: 'Business' },
            { name: 'Team Scheduling', cat: 'Operations' },
            { name: 'Payroll Administration', cat: 'Business' },
            { name: 'Visual Merchandising', cat: 'Retail' },
            { name: 'Loss Prevention', cat: 'Operations' },
            { name: 'Vendor Negotiation', cat: 'Business' },
            { name: 'Health & Safety Compliance', cat: 'Operations' },
            { name: 'Employee Training Programs', cat: 'Management' }
        ],
        creative: [
            { name: 'Color Correction (Advanced)', cat: 'Technical' },
            { name: 'Chemical Processing Knowledge', cat: 'Technical' },
            { name: 'Retail Product Sales', cat: 'Business' },
            { name: 'Social Media Marketing', cat: 'Marketing' },
            { name: 'Client Consultation Techniques', cat: 'Domain' },
            { name: 'Salon Software Proficiency', cat: 'Technical' },
            { name: 'Continuing Education Credits', cat: 'Professional' },
            { name: 'Portfolio Development', cat: 'Professional' }
        ]
    };
    
    var profileSkillNames = new Set();
    skills.forEach(function(s) { profileSkillNames.add(s.name.toLowerCase()); });
    function cleanGaps(pool) { return pool.filter(function(g) { return !profileSkillNames.has(g.name.toLowerCase()); }); }
    
    var keySkills = skills.filter(function(s) { return s.key; });
    var otherSkills = skills.filter(function(s) { return !s.key; });
    
    var jobs = jobMeta.map(function(meta) {
        var parsedSkills = [];
        
        if (meta.tier === 'high') {
            // TARGET: 80-90% — heavy overlap, achievable proficiency levels, minimal gaps
            var fromKey = pickRandom(keySkills, Math.min(keySkills.length, 6));
            var fromOther = pickRandom(otherSkills, Math.min(6, otherSkills.length));
            var profilePicks = fromKey.concat(fromOther).slice(0, 10);
            profilePicks.forEach(function(s) {
                parsedSkills.push({
                    name: s.name,
                    requirement: s.key ? 'Required' : 'Preferred',
                    proficiency: matchingProf(s.level),
                    category: s.category || 'Domain'
                });
            });
            // 1-2 soft gaps from a relevant-but-stretch pool
            var softPool = isRetail || isTrades ? gapPools.management : gapPools.operations;
            cleanGaps(softPool).slice(0, 2).forEach(function(g) {
                parsedSkills.push({ name: g.name, requirement: 'Preferred', proficiency: 'Competent', category: g.cat });
            });
            
        } else if (meta.tier === 'mid') {
            // TARGET: 50-65% — moderate overlap, some stretch levels, meaningful gaps
            var fromKey = pickRandom(keySkills, Math.min(keySkills.length, 4));
            var fromOther = pickRandom(otherSkills, Math.min(3, otherSkills.length));
            var profilePicks = fromKey.concat(fromOther).slice(0, 6);
            profilePicks.forEach(function(s, i) {
                parsedSkills.push({
                    name: s.name,
                    requirement: 'Required',
                    proficiency: i < 2 ? stretchProf(s.level) : matchingProf(s.level),
                    category: s.category || 'Domain'
                });
            });
            // 5-6 Required gaps — profile-appropriate
            var pool1, pool2;
            if (isRetail) { pool1 = cleanGaps(gapPools.management).slice(0, 3); pool2 = cleanGaps(gapPools.operations).slice(0, 3); }
            else if (isTrades) { pool1 = cleanGaps(gapPools.creative).slice(0, 3); pool2 = cleanGaps(gapPools.management).slice(0, 3); }
            else if (isTech) { pool1 = cleanGaps(gapPools.data).slice(0, 3); pool2 = cleanGaps(gapPools.operations).slice(0, 3); }
            else { pool1 = cleanGaps(gapPools.finance).slice(0, 3); pool2 = cleanGaps(gapPools.technical).slice(0, 3); }
            pool1.concat(pool2).forEach(function(g) {
                parsedSkills.push({ name: g.name, requirement: 'Required', proficiency: 'Proficient', category: g.cat });
            });
            
        } else {
            // TARGET: <50% — minimal overlap, heavy alien-domain gaps
            var fromKey = pickRandom(keySkills, Math.min(2, keySkills.length));
            var fromOther = pickRandom(otherSkills, Math.min(1, otherSkills.length));
            var profilePicks = fromKey.concat(fromOther).slice(0, 3);
            profilePicks.forEach(function(s) {
                parsedSkills.push({
                    name: s.name,
                    requirement: 'Preferred',
                    proficiency: stretchProf(s.level),
                    category: s.category || 'Domain'
                });
            });
            // 9-10 Required gaps at Expert from alien domains
            var pool1, pool2, pool3;
            if (isRetail) { pool1 = cleanGaps(gapPools.management).slice(0, 4); pool2 = cleanGaps(gapPools.finance).slice(0, 3); pool3 = cleanGaps(gapPools.operations).slice(0, 3); }
            else if (isTrades) { pool1 = cleanGaps(gapPools.management).slice(0, 4); pool2 = cleanGaps(gapPools.finance).slice(0, 3); pool3 = cleanGaps(gapPools.creative).slice(0, 3); }
            else if (isTech) { pool1 = cleanGaps(gapPools.finance).slice(0, 4); pool2 = cleanGaps(gapPools.operations).slice(0, 3); pool3 = cleanGaps(gapPools.data).slice(0, 3); }
            else { pool1 = cleanGaps(gapPools.technical).slice(0, 4); pool2 = cleanGaps(gapPools.data).slice(0, 3); pool3 = cleanGaps(gapPools.finance).slice(0, 3); }
            pool1.concat(pool2).concat(pool3).forEach(function(g) {
                parsedSkills.push({ name: g.name, requirement: 'Required', proficiency: 'Expert', category: g.cat });
            });
        }
        
        return {
            id: meta.id, title: meta.title, company: meta.company,
            sourceUrl: '', sourceNote: 'Sample job for demo',
            rawText: meta.rawText, parsedSkills: parsedSkills,
            parsedRoles: meta.parsedRoles, seniority: meta.seniority,
            addedAt: new Date().toISOString(),
            sample: true  // LOCKED — non-admin cannot edit or delete
        };
    });
    
    // Score each job against the profile and match to BLS
    // For demo character jobs, generate company values that produce realistic match spread:
    //   7 user values → maxScore = 140
    //   sample-high  → 5 primary matches = 100/140 = 71%  (≥70% ✓)
    //   sample-mid   → 4 primary matches =  80/140 = 57%  (>50% ✓)
    //   sample-low   → 2 primary matches =  40/140 = 29%  (<50% ✓)
    var catalogNames = new Set();
    VALUES_CATALOG.forEach(function(g) { g.values.forEach(function(v) { catalogNames.add(v.name); }); });
    var templateVals = (template.values || []).map(function(v) { return typeof v === 'string' ? v : v.name; });
    var userCatVals = templateVals.filter(function(v) { return catalogNames.has(v); });
    
    // Non-matching catalog values for filler
    var allCatNames = [];
    VALUES_CATALOG.forEach(function(g) { g.values.forEach(function(v) { allCatNames.push(v.name); }); });
    var nonUserCatVals = allCatNames.filter(function(v) { return userCatVals.indexOf(v) === -1; });
    
    jobs.forEach(function(job) {
        job.matchData = matchJobToProfile(getJobSkills(job));
        job.blsSalary = matchJobToBLS(job.title, job.rawText || (job.raw && job.raw.text) || '');
        
        if (characterJobs[templateId] && userCatVals.length >= 3) {
            // Curated company values for character demo jobs
            if (job.id === 'sample-high') {
                // 5 user values as primary → 71% match
                job.companyValues = { primary: userCatVals.slice(0, 5), secondary: nonUserCatVals.slice(0, 2), tensions: [], story: '', inferred: false };
            } else if (job.id === 'sample-mid') {
                // 4 user values as primary → 57% match
                job.companyValues = { primary: userCatVals.slice(0, 4), secondary: nonUserCatVals.slice(0, 3), tensions: [], story: '', inferred: false };
            } else {
                // 2 user values as primary → 29% match
                job.companyValues = { primary: userCatVals.slice(0, 2), secondary: nonUserCatVals.slice(0, 4), tensions: [], story: '', inferred: false };
            }
        } else {
            job.companyValues = getCompanyValues(job.company, job.rawText || job.description || "");
        }
    });
    
    // Sort: high match first
    jobs.sort(function(a, b) { return (b.matchData.score || 0) - (a.matchData.score || 0); });
    
    var detectedType = isRecruiter ? 'recruiter' : isProduct ? 'product' : isRetail ? 'retail' : isTrades ? 'trades' : (isStrategy || !isTech) ? 'strategy' : 'technology';
    console.log('📋 Injected ' + jobs.length + ' calibrated sample jobs for ' + profileName + ' (type: ' + detectedType + ')');
    
    return jobs;
}

export function loadTemplate(templateId) {
    const template = templates[templateId];
    if (!template) {
        console.error('Template not found:', templateId);
        return false;
    }
    
    console.log('📋 Loading template:', templateId);
    console.log('  → Template has', template.skills.length, 'skills');
    console.log('  → First skill:', template.skills[0].name);
    console.log('  → First skill has evidence:', template.skills[0].evidence ? `YES (${template.skills[0].evidence.length} items)` : 'NO');
    
    userData = {
        initialized: true,
        profile: {...template.profile},
        skills: [...template.skills],
        skillDetails: {},
        values: template.values ? [...template.values] : [],
        purpose: template.purpose || "",
        roles: [...template.roles].map(function(r) { if (!r.id) r.id = r.name; return r; }),
        workHistory: template.workHistory ? JSON.parse(JSON.stringify(template.workHistory)) : [],
        education: template.education ? JSON.parse(JSON.stringify(template.education)) : [],
        certifications: template.certifications ? JSON.parse(JSON.stringify(template.certifications)) : [],
        verifications: template.verifications ? JSON.parse(JSON.stringify(template.verifications)) : [],
        preferences: {
            seniorityLevel: template.profile.roleLevel || "Mid-Career",
            targetTitles: [],
            seniorityKeywords: ['vp', 'vice president', 'chief', 'head of', 'director', 'principal', 'senior director'],
            excludeRoles: ['engineer', 'developer', 'designer', 'analyst', 'coordinator', 'specialist', 
                          'junior', 'mid-level', 'associate', 'intern', 'entry', 'qa', 'frontend', 'backend',
                          'full stack', 'fullstack', 'software', 'devops', 'ui/ux', 'data scientist'],
            strategicKeywords: ['strategy', 'strategic', 'transformation', 'innovation', 'evangelist', 
                               'thought leader', 'advisory', 'ai', 'ml', 'product', 'growth', 'business'],
            targetIndustries: [],
            minSalary: null,
            locationPreferences: ["US", "Remote"],
            minimumSkillMatches: 3,
            minimumMatchScore: 50
        },
        applications: [],
        savedJobs: template.savedJobs ? JSON.parse(JSON.stringify(template.savedJobs)) : [],
        templateId: templateId  // Store which template this is
    };
    
    // Inject sample jobs for manifest-loaded sample profiles (always refresh on load)
    // Skip if profile has curated jobs already
    var hasCuratedJobs = template.savedJobs && template.savedJobs.length > 0 && template.savedJobs[0].curated;
    var isManifestProfile = false;
    if (window.profilesManifest && window.profilesManifest.profiles) {
        isManifestProfile = window.profilesManifest.profiles.some(function(p) { return p.id === templateId; });
    }
    
    // CRITICAL: Clear stale localStorage values/purpose when switching demo profiles
    // Otherwise inferValues() loads the PREVIOUS profile's cached values
    if (isManifestProfile || templateId.indexOf('demo') !== -1 || templateId.indexOf('sample') !== -1) {
        safeRemove('wbValues');
        safeRemove('wbPurpose');
    }
    
    // CRITICAL: Sync skillsData BEFORE sample job injection.
    // getSampleJobsForProfile → matchJobToProfile reads _sd().skills,
    // which still points to the PREVIOUS profile if we don't update it here.
    _sd().skills = window._userData.skills;
    _sd().roles = window._userData.roles;
    window._userData = userData;
    
    if (!hasCuratedJobs) {
        if (isManifestProfile || templateId.indexOf('demo') !== -1 || templateId.indexOf('sample') !== -1) {
            window._userData.savedJobs = getSampleJobsForProfile(templateId, template);
        }
    }
    
    console.log('  → window._userData.skills[0] has evidence:', window._userData.skills[0].evidence ? `YES (${window._userData.skills[0].evidence.length} items)` : 'NO');
    
    // Load skill evidence if it exists
    fetch('skill_evidence.json')
        .then(response => response.json())
        .then(data => {
            window._userData.skillDetails = data;
            console.log('✓ Loaded evidence for', Object.keys(data).length, 'skills');
        })
        .catch(error => console.log('No skill evidence file found'));
    
    saveUserData();
    console.log('✓ Template loaded:', template.templateName);
    return true;
}

// Initialize app - check for profile or show welcome

// ===== HYDRATE SVG ICONS =====
// Replaces data-icon placeholder spans with actual SVG markup
// hydrateIcons — provided by imported module


function _loadCrosswalkDeferred() {
    if (window.onetCrosswalk) return;
    fetch('onet-crosswalk.json').then(function(r) { return r.json(); }).then(function(data) {
        window.onetCrosswalk = data;
        var occCount = Object.keys(data.occupations || {}).length;
        var aliasCount = Object.keys(data.aliases || {}).length;
        console.log('✅ O*NET Crosswalk loaded (deferred): ' + occCount + ' occupations, ' + aliasCount + ' aliases');
        recordApiHealth('onet-crosswalk', 'ok', occCount + ' occupations, ' + aliasCount + ' aliases');
    }).catch(function(e) {
        window.onetCrosswalk = null;
        console.warn('⚠ onet-crosswalk.json failed to load:', e.message);
        recordApiHealth('onet-crosswalk', 'down', 'Failed to load');
    });
}

async function initializeApp() {
    initTheme();
    var sp = document.getElementById('splashProgress');
    if (sp) sp.style.width = '20%';
    const cacheBust = `?v=${Date.now()}`;

    var profilesPromise = (async function() {
        try {
            console.log('📋 Loading profiles manifest...');
            let manifest = await fetch(`profiles-manifest.json${cacheBust}`).then(r => r.json());
            if (Array.isArray(manifest)) manifest = { profiles: manifest };
            window.profilesManifest = manifest;

            const enabledProfiles = manifest.profiles.filter(p => p.enabled);
            console.log(`✓ Found ${enabledProfiles.length} enabled profiles in manifest`);

            var profileResults = await Promise.allSettled(
                enabledProfiles.map(function(pm) {
                    return fetch(`${pm.path}${cacheBust}`).then(r => r.json()).then(function(t) {
                        templates[pm.id] = t;
                        console.log(`  ✓ Loaded: ${pm.name} (${pm.title}) from ${pm.path}`);
                    });
                })
            );
            profileResults.forEach(function(r, i) {
                if (r.status === 'rejected') console.error(`  ✗ Failed to load ${enabledProfiles[i].path}:`, r.reason);
            });

            var blankTemplate = await fetch(`profiles/templates/blank.json${cacheBust}`).then(r => r.json());
            templates['blank'] = blankTemplate;

            console.log(`✓ Profile loading complete: ${enabledProfiles.length} profiles ready`);
            buildProfileSelector(enabledProfiles);
        } catch (e) {
            console.error('Error loading profiles:', e);
        }
    })();

    var librariesPromise = Promise.allSettled([
        fetch('onet-skills-library.json').then(r => r.json()),
        fetch('onet-abilities-library.json').then(r => r.json()),
        fetch('onet-workstyles-library.json').then(r => r.json()),
        fetch('onet-knowledge-library.json').then(r => r.json()),
        fetch('onet-work-activities-library.json').then(r => r.json()),
        fetch('trades-creative-library.json').then(r => r.json()),
        fetch('values-library.json').then(r => r.json()),
        fetch('bls-wages.json').then(r => r.json()),
        fetch('companies.json').then(r => r.json())
    ]);

    await Promise.all([profilesPromise, librariesPromise]);
    if (sp) sp.style.width = '60%';

    var libResults = await librariesPromise;
    if (libResults[0].status === 'fulfilled') { window.onetSkillsLibrary = libResults[0].value; console.log('✓ O*NET Skills Library loaded'); }
    if (libResults[1].status === 'fulfilled') { window.onetAbilitiesLibrary = libResults[1].value; console.log('✓ O*NET Abilities Library loaded (' + (libResults[1].value.abilities?.length || '?') + ')'); }
    if (libResults[2].status === 'fulfilled') { window.onetWorkStylesLibrary = libResults[2].value; console.log('✓ O*NET Work Styles Library loaded (' + (libResults[2].value.workStyles?.length || '?') + ')'); }
    if (libResults[3].status === 'fulfilled') { window.onetKnowledgeLibrary = libResults[3].value; console.log('✓ O*NET Knowledge Library loaded (' + (libResults[3].value.knowledge?.length || '?') + ')'); }
    if (libResults[4].status === 'fulfilled') { window.onetWorkActivitiesLibrary = libResults[4].value; console.log('✓ O*NET Work Activities Library loaded (' + (libResults[4].value.activities?.length || '?') + ')'); }
    if (libResults[5].status === 'fulfilled') { window.tradesCreativeLibrary = libResults[5].value; console.log('✓ Trades & Creative Library loaded (' + (libResults[5].value.count || '?') + ')'); }
    if (libResults[6].status === 'fulfilled') { valuesLibrary = libResults[6].value.values || []; console.log('✓ Values library loaded: ' + valuesLibrary.length); }
    if (libResults[7].status === 'fulfilled') { window.blsWages = libResults[7].value; console.log('✅ BLS wage data loaded: ' + libResults[7].value.count + ' occupations'); }
    else { window.blsWages = null; }
    if (libResults[8].status === 'fulfilled') { window.companyDataLoaded = libResults[8].value; console.log('✅ Company values loaded: ' + Object.keys(libResults[8].value).length + ' companies'); }
    else { window.companyDataLoaded = {}; console.warn('⚠ companies.json failed to load — using JD inference fallback'); }

    setTimeout(_loadCrosswalkDeferred, 100);
    
    // ===== PROFILE DECISION FLOW =====
    const currentProfile = safeGet('currentProfile');
    
    // CASE 1: Signed-in user — DO NOT load scaffold, go straight to Firestore
    if (fbUser && fbDb) {
        // Initialize minimal userData structure (no scaffold contamination)
        userData = {
            initialized: false,
            profile: { name: fbUser.displayName || fbUser.email.split('@')[0], email: fbUser.email || '' },
            skills: [], skillDetails: {}, values: [], purpose: '',
            roles: [], workHistory: [], education: [], certifications: [],
            verifications: [], preferences: window._userData.preferences || {},
            applications: [], savedJobs: [], templateId: 'firestore-' + fbUser.uid
        };
        _sd().skills = [];
        _sd().roles = [];
        window._userData = userData;
        
        initializeMainApp();
        window._profileExplicitlySelected = true; // signed-in users always have a profile
        
        var targetView = 'welcome';
        
        // Respect URL hash if present (e.g. #opportunities, #network, #blueprint)
        var hashView = window.location.hash.replace('#', '');
        var validViews = ['network', 'opportunities', 'blueprint', 'reports', 'settings', 'admin', 'consent'];
        var hashTarget = validViews.indexOf(hashView) !== -1 ? hashView : null;
        
        try {
            var loaded = await loadUserFromFirestore(fbUser.uid);
            if (loaded) {
                console.log('☁ Firestore profile applied for', fbUser.displayName || fbUser.email);
                targetView = hashTarget || 'blueprint';
            } else {
                console.log('ℹ️ No Firestore data for signed-in user');
                targetView = hashTarget || 'blueprint';
            }
        } catch(e) {
            console.warn('Firestore load failed:', e);
            targetView = hashTarget || 'blueprint';
        }
        // Reset view init flags so they render with correct data
        window.blueprintInitialized = false;
        window.settingsInitialized = false;
        window.opportunitiesInitialized = false;
        window.applicationsInitialized = false;
        window.consentInitialized = false;
        window.networkInitialized = false;
        window.cardViewInitialized = false;
        checkReadOnly();
        return targetView;
    }
    
    // CASE 2: Not signed in — load scaffold for demo browsing
    var firstTemplateId = Object.keys(templates).find(function(k) { return k !== 'blank'; }) || 'walter-white';
    var scaffoldId = currentProfile || firstTemplateId;
    if (!templates[scaffoldId]) scaffoldId = firstTemplateId;
    if (templates[scaffoldId]) loadTemplate(scaffoldId);
    initializeMainApp();
    
    // Track whether user has explicitly chosen a profile in THIS session
    // Always false on fresh page load — must click Samples or start Tour to unlock
    window._profileExplicitlySelected = false;
    
    // Determine which view to show
    // Demo/non-signed-in users always start on Welcome (the front door)
    // They can navigate to profiles from there
    var targetView = 'welcome';
    checkReadOnly();
    
    // Return target view so DOMContentLoaded can use it
    return targetView;
}

// Non-intrusive first-visit prompt to build own profile

// Show welcome screen for new users

// Start with selected template
window.startWithTemplate = function(templateId) {
    console.log('🎯 Starting with template:', templateId);
    
    if (!templates[templateId]) {
        showToast('Template not found. Please refresh and try again.', 'error');
        return;
    }
    
    if (loadTemplate(templateId)) {
        console.log('✓ Template loaded successfully');
        
        // If blank, show onboarding wizard
        if (templateId === 'blank') {
            showOnboardingWizard();
        } else {
            // Force hard reload with cache bypass
            console.log('🔄 Reloading page...');
            window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
        }
    } else {
        showToast('Failed to load template. Please try again.', 'error');
    }
};

// Import profile from JSON file
window.importProfile = function(event) {
    if (readOnlyGuard()) return;
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = sanitizeImport(JSON.parse(e.target.result));
            userData = imported;
            window._userData.initialized = true;
            window._userData = userData;
            saveUserData();
            location.reload();
        } catch (error) {
            showToast('Import error: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
};

// =====================================================================
// ONBOARDING WIZARD v1.0
// Multi-step guided profile builder with Claude AI resume parsing
// =====================================================================

let wizardState = {
    step: 1,
    totalSteps: 9,
    resumeText: '',
    parsedData: null,
    profile: {},
    skills: [],
    values: [],
    purpose: '',
    processing: false
};

export function showOnboardingWizard() {
    if (readOnlyGuard()) return;
    if (demoGate('Build Your Blueprint')) return;
    // Remove any existing wizard
    const existing = document.getElementById('onboardingWizard');
    if (existing) existing.remove();

    wizardState = { step: 1, totalSteps: 9, resumeText: '', parsedData: null,
                    profile: {}, skills: [], values: [], purpose: '', processing: false,
                    resumeFileBase64: null, resumeFileName: null, resumeFileSize: null, useFileUpload: false };

    const overlay = document.createElement('div');
    overlay.id = 'onboardingWizard';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 50000;
        background: var(--bg-base);
        display: flex; flex-direction: column;
        overflow: hidden;
    `;
    document.body.appendChild(overlay);
    renderWizardStep();
}

export function closeWizard() {
    const el = document.getElementById('onboardingWizard');
    if (el) el.remove();
}

export function renderWizardStep() {
    const overlay = document.getElementById('onboardingWizard');
    if (!overlay) return;

    var isExplorer = wizardState.entryMode === 'explorer';
    const steps = isExplorer ? [
        { label: 'Start' },
        { label: 'Education' },
        { label: 'Activities' },
        { label: 'Interests' },
        { label: 'Skills' },
        { label: 'Careers' },
        { label: 'Complete' }
    ] : [
        { label: 'Start' },
        { label: 'Resume' },
        { label: 'Parsing' },
        { label: 'Profile' },
        { label: 'Enrich' },
        { label: 'Skills' },
        { label: 'Values' },
        { label: 'Purpose' },
        { label: 'Complete' }
    ];

    const progressPct = ((wizardState.step - 1) / (wizardState.totalSteps - 1)) * 100;

    overlay.innerHTML = `
        <!-- Wizard Header -->
        <div style="display:flex; align-items:center; justify-content:space-between;
                    padding:0 28px; height:56px; border-bottom:1px solid var(--border);
                    background:var(--nav-bg); backdrop-filter:blur(20px); flex-shrink:0;">
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
                    <svg width="24" height="24" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="24" stroke="#60a5fa" stroke-width="1.5" opacity="0.25"/><line x1="26" y1="26" x2="12" y2="10" stroke="#60a5fa" stroke-width="1.5" opacity="0.5"/><line x1="26" y1="26" x2="42" y2="12" stroke="#60a5fa" stroke-width="1.5" opacity="0.5"/><line x1="26" y1="26" x2="40" y2="40" stroke="#60a5fa" stroke-width="1.5" opacity="0.5"/><line x1="26" y1="26" x2="10" y2="40" stroke="#60a5fa" stroke-width="1.5" opacity="0.5"/><circle cx="26" cy="26" r="5" fill="#60a5fa"/><circle cx="12" cy="10" r="3.5" fill="#93bbfc"/><circle cx="42" cy="12" r="3" fill="#818cf8"/><circle cx="40" cy="40" r="3.5" fill="#93bbfc"/><circle cx="10" cy="40" r="3" fill="#818cf8"/></svg></div>
                <span style="font-family:'Outfit',sans-serif; font-weight:500; color:var(--accent); font-size:0.82em; letter-spacing:0.22em; text-transform:uppercase;">
                    Blueprint
                </span>
                <span style="color:var(--text-muted); font-size:0.8em; margin-left:8px;">
                    Build Your Profile
                </span>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <span style="font-size:0.78em; color:var(--text-muted);">
                    Step ${wizardState.step} of ${wizardState.totalSteps}
                </span>
                <button onclick="confirmExitWizard()" style="
                    background:none; border:1px solid var(--border); border-radius:7px;
                    padding:5px 12px; color:var(--text-secondary); cursor:pointer; font-size:0.8em;">
                    Exit
                </button>
            </div>
        </div>

        <!-- Progress bar -->
        <div style="height:3px; background:var(--border); flex-shrink:0;">
            <div style="height:100%; width:${progressPct}%;
                        background:linear-gradient(90deg,var(--accent),#818cf8);
                        transition:width 0.4s ease;"></div>
        </div>

        <!-- Step indicators -->
        <div style="display:flex; justify-content:center; gap:4px; padding:14px 28px 0;
                    flex-shrink:0; flex-wrap:wrap;">
            ${steps.map((s, i) => {
                const n = i + 1;
                const active = n === wizardState.step;
                const done = n < wizardState.step;
                return `<div style="display:flex; align-items:center; gap:4px;">
                    <div style="width:22px; height:22px; border-radius:50%; display:flex;
                                align-items:center; justify-content:center; font-size:0.7em;
                                font-weight:700; transition:all 0.2s;
                                background:${done ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--input-bg)'};
                                color:${done || active ? '#fff' : 'var(--text-muted)'};
                                border:2px solid ${done || active ? 'var(--accent)' : 'var(--border)'};">
                        ${done ? '✓' : n}
                    </div>
                    <span style="font-size:0.72em; color:${active ? 'var(--accent)' : 'var(--text-muted)'};">
                        ${s.label}
                    </span>
                    ${i < steps.length - 1 ? '<div style="width:12px; height:1px; background:var(--border); margin:0 2px;"></div>' : ''}
                </div>`;
            }).join('')}
        </div>

        <!-- Step content -->
        <div id="wizardStepContent" style="flex:1; overflow-y:auto; padding:32px 28px;">
            <div style="max-width:700px; margin:0 auto;" id="wizardInner">
                <!-- Populated per step -->
            </div>
        </div>
    `;

    // Render the current step content
    const inner = document.getElementById('wizardInner');
    if (isExplorer) {
        switch(wizardState.step) {
            case 1: renderWizardStep1(inner); break;
            case 2: renderExplorerEducation(inner); break;
            case 3: renderExplorerActivities(inner); break;
            case 4: renderExplorerInterests(inner); break;
            case 5: renderExplorerSkills(inner); break;
            case 6: renderExplorerCareers(inner); break;
            case 7: renderExplorerComplete(inner); break;
        }
    } else {
        switch(wizardState.step) {
            case 1: renderWizardStep1(inner); break;
            case 2: renderWizardStep2(inner); break;
            case 3: renderWizardStep3(inner); break;
            case 4: renderWizardStep4(inner); break;
            case 5: renderWizardStep5(inner); break;
            case 6: renderWizardStep6(inner); break;
            case 7: renderWizardStep7(inner); break;
            case 8: renderWizardStep8(inner); break;
            case 9: renderWizardStep9(inner); break;
        }
    }
}

export function wizardNext() {
    wizardState.step = Math.min(wizardState.step + 1, wizardState.totalSteps);
    renderWizardStep();
}

export function wizardBack() {
    var newStep = wizardState.step - 1;
    if (wizardState.entryMode === 'explorer') {
        if (wizardState.step === 2) newStep = 1;
    } else if (wizardState.step === 4 && (wizardState.entryMode === 'linkedin' || wizardState.entryMode === 'manual')) {
        newStep = wizardState.entryMode === 'manual' ? 1 : 2;
    }
    wizardState.step = Math.max(newStep, 1);
    renderWizardStep();
}

export function confirmExitWizard() {
    if (wizardState.step > 2) {
        if (!confirm('Exit the wizard? Your progress will be lost.')) return;
    }
    closeWizard();
}

// ── Shared UI helpers ─────────────────────────────────────────────────
// [removed] wizardCard — dead code cleanup v4.22.0

export function wizardHeading(icon, title, subtitle) {
    return `<div style="text-align:center; margin-bottom:32px;">
                <div style="font-size:2.8em; margin-bottom:12px;">${icon}</div>
                <h2 style="color:var(--text-primary); font-size:1.6em; font-weight:700;
                           margin-bottom:8px; letter-spacing:-0.02em;">${title}</h2>
                <p style="color:var(--text-secondary); font-size:0.95em; line-height:1.6;
                          max-width:500px; margin:0 auto;">${subtitle}</p>
            </div>`;
}

export function wizardBtn(label, onclick, style='primary') {
    const styles = {
        primary: `background:var(--accent); color:#fff; border:none;`,
        secondary: `background:var(--input-bg); color:var(--text-primary); border:1px solid var(--border);`,
        ghost: `background:none; color:var(--text-secondary); border:1px solid var(--border);`
    };
    return `<button onclick="${onclick}" style="${styles[style]}
                padding:11px 24px; border-radius:9px; cursor:pointer; font-size:0.9em;
                font-weight:600; transition:all 0.18s; letter-spacing:0.01em;">
                ${label}
            </button>`;
}

// ═══════════════════════════════════════════════════════════
// LINKEDIN ZIP PARSER (standalone, reusable)
// ═══════════════════════════════════════════════════════════

async function parseLinkedInZipContents(file) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip library not loaded.');
    if (typeof Papa === 'undefined') throw new Error('PapaParse library not loaded.');
    
    var zip = await JSZip.loadAsync(file);
    var csvFiles = {};
    
    var targetFiles = ['Profile.csv', 'Positions.csv', 'Skills.csv', 'Education.csv',
        'Certifications.csv', 'Languages.csv', 'Projects.csv', 'Email Addresses.csv',
        'Endorsement_Received_Info.csv', 'Recommendations_Received.csv',
        'Volunteering.csv', 'Honors.csv', 'Causes You Care About.csv',
        'Rich_Media.csv', 'Learning.csv', 'Organizations.csv',
        'Connections.csv', 'Company_Follows.csv'];
    
    var headerMap = {
        'first name': 'First Name', 'first_name': 'First Name', 'firstname': 'First Name',
        'last name': 'Last Name', 'last_name': 'Last Name', 'lastname': 'Last Name',
        'headline': 'Headline', 'summary': 'Summary', 'about': 'Summary',
        'geo location': 'Geo Location', 'geolocation': 'Geo Location', 'industry': 'Industry',
        'company name': 'Company Name', 'company': 'Company Name', 'organization name': 'Company Name',
        'title': 'Title', 'position': 'Title', 'job title': 'Job Title',
        'description': 'Description', 'location': 'Location',
        'started on': 'Started On', 'start date': 'Started On',
        'finished on': 'Finished On', 'end date': 'Finished On',
        'name': 'Name', 'skill': 'Name', 'skill name': 'Skill Name',
        'school name': 'School Name', 'school': 'School Name', 'institution': 'School Name',
        'degree name': 'Degree Name', 'degree': 'Degree Name',
        'notes': 'Notes', 'field of study': 'Field Of Study',
        'activities': 'Activities', 'activities and societies': 'Activities',
        'authority': 'Authority', 'issuing organization': 'Authority',
        'license number': 'License Number', 'credential id': 'License Number',
        'url': 'Url', 'credential url': 'Url',
        'email address': 'Email Address', 'email': 'Email Address',
        'endorsement date': 'Endorsement Date',
        'endorser first name': 'Endorser First Name', 'endorser last name': 'Endorser Last Name',
        'endorsement status': 'Endorsement Status',
        'text': 'Text', 'creation date': 'Creation Date', 'status': 'Status',
        'role': 'Role', 'cause': 'Cause', 'issued on': 'Issued On',
        'content title': 'Content Title', 'content type': 'Content Type',
        'content completed at (if completed)': 'Content Completed At',
        'media description': 'Media Description', 'media link': 'Media Link',
        'date/time': 'Date/Time', 'supported cause': 'Supported Cause'
    };
    
    function normalizeRow(row) {
        var n = {};
        Object.keys(row).forEach(function(key) {
            var t = key.trim().replace(/^\uFEFF/, '');
            var c = headerMap[t.toLowerCase()] || t;
            if (!(c in n)) n[c] = row[key];
        });
        return n;
    }
    
    for (var ti = 0; ti < targetFiles.length; ti++) {
        var targetName = targetFiles[ti];
        var found = null;
        zip.forEach(function(path, entry) {
            if (!entry.dir && path.endsWith(targetName)) found = entry;
        });
        if (found) {
            var text = await found.async('text');
            var result = Papa.parse(text, { header: true, skipEmptyLines: true });
            csvFiles[targetName] = result.data.map(normalizeRow);
        }
    }
    
    var parsed = {};
    
    // Profile
    var pRow = (csvFiles['Profile.csv'] || [])[0] || {};
    parsed.profile = {
        name: [pRow['First Name'], pRow['Last Name']].filter(Boolean).join(' '),
        linkedinHeadline: pRow['Headline'] || '',
        location: pRow['Geo Location'] || pRow['Location'] || '',
        summary: pRow['Summary'] || ''
    };
    var emailRows = csvFiles['Email Addresses.csv'] || [];
    if (emailRows.length > 0) parsed.profile.email = emailRows[0]['Email Address'] || '';
    
    // Positions
    parsed.workHistory = (csvFiles['Positions.csv'] || []).map(function(row) {
        return { title: row['Title'] || '', company: row['Company Name'] || '',
            location: row['Location'] || '', description: row['Description'] || '',
            startDate: row['Started On'] || '', endDate: row['Finished On'] || 'Present' };
    }).filter(function(w) { return w.title || w.company; });
    
    // Skills
    parsed.rawSkills = (csvFiles['Skills.csv'] || []).map(function(row) {
        return (row['Name'] || row['Skill'] || Object.values(row)[0] || '').trim();
    }).filter(Boolean);
    
    // Education
    parsed.education = (csvFiles['Education.csv'] || []).map(function(row) {
        return { school: row['School Name'] || '', degree: row['Degree Name'] || '',
            field: row['Field Of Study'] || row['Notes'] || '',
            startDate: row['Start Date'] || row['Started On'] || '',
            endDate: row['End Date'] || row['Finished On'] || '', activities: row['Activities'] || '' };
    }).filter(function(e) { return e.school; });
    
    // Certifications
    parsed.certifications = (csvFiles['Certifications.csv'] || []).map(function(row) {
        return { name: row['Name'] || '', authority: row['Authority'] || '',
            licenseNumber: row['License Number'] || '', url: row['Url'] || '',
            startDate: row['Started On'] || '', endDate: row['Finished On'] || '' };
    }).filter(function(c) { return c.name; });
    
    // Endorsements
    parsed.endorsements = {};
    (csvFiles['Endorsement_Received_Info.csv'] || []).forEach(function(row) {
        var skill = (row['Skill Name'] || '').trim();
        if (skill) parsed.endorsements[skill] = (parsed.endorsements[skill] || 0) + 1;
    });
    
    // Recommendations
    parsed.recommendations = (csvFiles['Recommendations_Received.csv'] || []).filter(function(row) {
        return (row['Status'] || '').toUpperCase() === 'VISIBLE' && (row['Text'] || '').length > 20;
    }).map(function(row) {
        return { from: [row['First Name'], row['Last Name']].filter(Boolean).join(' '),
            company: row['Company'] || '', title: row['Job Title'] || '',
            text: row['Text'] || '', date: row['Creation Date'] || '' };
    });
    
    // Volunteering, Honors, Causes, Organizations
    parsed.volunteering = (csvFiles['Volunteering.csv'] || []).map(function(r) {
        return { company: r['Company Name'] || '', role: r['Role'] || '', cause: r['Cause'] || '',
            description: r['Description'] || '', startDate: r['Started On'] || '', endDate: r['Finished On'] || '' };
    }).filter(function(v) { return v.company || v.role; });
    
    parsed.honors = (csvFiles['Honors.csv'] || []).map(function(r) {
        return { title: r['Title'] || r['Name'] || '', description: r['Description'] || '', date: r['Issued On'] || '' };
    }).filter(function(h) { return h.title; });
    
    parsed.causes = (csvFiles['Causes You Care About.csv'] || []).map(function(r) {
        return r['Supported Cause'] || Object.values(r)[0] || '';
    }).filter(Boolean);
    
    parsed.organizations = (csvFiles['Organizations.csv'] || []).map(function(r) {
        return { name: r['Name'] || '', position: r['Position'] || '', description: r['Description'] || '' };
    }).filter(function(o) { return o.name; });
    
    // Learning
    var learningRows = csvFiles['Learning.csv'] || [];
    parsed.learning = learningRows.filter(function(r) {
        return (r['Content Completed At'] || '') !== '' && r['Content Completed At'] !== 'N/A';
    }).map(function(r) {
        return { title: r['Content Title'] || '', type: r['Content Type'] || '', completedAt: r['Content Completed At'] || '' };
    });
    parsed.learningTotal = learningRows.length;
    
    // Rich Media
    parsed.richMedia = (csvFiles['Rich_Media.csv'] || []).filter(function(r) {
        return (r['Media Description'] || '').length > 100;
    }).map(function(r) {
        return { date: r['Date/Time'] || '', content: r['Media Description'] || '', link: r['Media Link'] || '' };
    });
    
    // Articles from HTML
    parsed.articles = [];
    var articleEntries = [];
    zip.forEach(function(path, entry) {
        if (!entry.dir && path.toLowerCase().includes('article') && path.endsWith('.html')) articleEntries.push(entry);
    });
    for (var ai = 0; ai < articleEntries.length; ai++) {
        try {
            var aHtml = await articleEntries[ai].async('text');
            var titleM = aHtml.match(/<title>(.*?)<\/title>/i);
            var createdM = aHtml.match(/Created on ([\d-]+)/);
            var bodyM = aHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            var bodyText = (bodyM ? bodyM[1] : aHtml).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            parsed.articles.push({ title: titleM ? titleM[1].trim() : 'Untitled',
                created: createdM ? createdM[1] : '', wordCount: bodyText.split(/\s+/).length,
                text: bodyText.substring(0, 2000) });
        } catch(e) { /* skip */ }
    }
    
    parsed.networkSize = (csvFiles['Connections.csv'] || []).length;
    return parsed;
}

// ═══════════════════════════════════════════════════════════
// LINKEDIN MERGE — Parse → Compare → User Selects → Apply
// ═══════════════════════════════════════════════════════════

async function handleLinkedInMerge(input) {
    if (!input || !input.files || !input.files[0]) return;
    var file = input.files[0];
    if (!file.name.endsWith('.zip')) { showToast('Please upload a LinkedIn .zip archive.', 'warning'); return; }
    
    var statusEl = document.getElementById('liMergeStatus');
    if (statusEl) { statusEl.style.display = 'block'; statusEl.innerHTML = bpIcon('settings', 12) + ' Reading LinkedIn archive...'; }
    
    try {
        var parsed = await parseLinkedInZipContents(file);
        if (statusEl) statusEl.style.display = 'none';
        openMergeComparisonModal(parsed);
    } catch(err) {
        showToast('Failed to read zip: ' + err.message, 'error', 6000);
        if (statusEl) { statusEl.textContent = 'Failed: ' + err.message; }
    }
    input.value = '';
}
if (!window.handleLinkedInMerge) window.handleLinkedInMerge = handleLinkedInMerge;

export function openMergeComparisonModal(parsed) {
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    
    // ── Build diff ──
    var existingJobs = window._userData.workHistory || [];
    var existingEd = window._userData.education || [];
    var existingCerts = window._userData.certifications || [];
    var existingSkillNames = (_sd().skills || []).map(function(s) { return s.name.toLowerCase(); });
    
    // Positions diff
    var posItems = parsed.workHistory.map(function(li) {
        var key = (li.company + '|' + li.title + '|' + li.startDate).toLowerCase().trim();
        var exists = existingJobs.some(function(ej) {
            return (ej.company + '|' + ej.title + '|' + ej.startDate).toLowerCase().trim() === key;
        });
        return { data: li, exists: exists, label: li.title + (li.company ? ' at ' + li.company : ''),
            sub: (li.startDate || '') + (li.endDate ? ' \u2013 ' + li.endDate : '') };
    });
    
    // Education diff
    var edItems = parsed.education.map(function(li) {
        var key = (li.school + '|' + li.degree).toLowerCase().trim();
        var exists = existingEd.some(function(e) {
            return (e.school + '|' + (e.degree || '')).toLowerCase().trim() === key;
        });
        return { data: li, exists: exists, label: (li.degree || '') + (li.field ? ' in ' + li.field : ''),
            sub: li.school + (li.endDate ? ' \u00B7 ' + li.endDate : '') };
    });
    
    // Certifications diff
    var certItems = parsed.certifications.map(function(li) {
        var key = li.name.toLowerCase().trim();
        var exists = existingCerts.some(function(c) { return (c.name || '').toLowerCase().trim() === key; });
        return { data: li, exists: exists, label: li.name, sub: li.authority || '' };
    });
    
    // Skills diff
    var skillItems = parsed.rawSkills.map(function(sn) {
        var exists = existingSkillNames.indexOf(sn.toLowerCase()) >= 0;
        return { data: sn, exists: exists, label: sn, sub: exists ? 'Already in profile' : 'New skill' };
    });
    
    // Endorsement summary
    var endorseKeys = Object.keys(parsed.endorsements || {});
    var totalEndorsements = endorseKeys.reduce(function(s, k) { return s + parsed.endorsements[k]; }, 0);
    
    // Content summary
    var contentCounts = {
        recommendations: (parsed.recommendations || []).length,
        articles: (parsed.articles || []).length,
        posts: (parsed.richMedia || []).length,
        volunteering: (parsed.volunteering || []).length,
        honors: (parsed.honors || []).length,
        causes: (parsed.causes || []).length,
        organizations: (parsed.organizations || []).length,
        learning: (parsed.learning || []).length,
        learningTotal: parsed.learningTotal || 0,
        network: parsed.networkSize || 0
    };
    
    // Store parsed for apply
    window._mergeParsed = parsed;
    window._mergeDiff = { posItems: posItems, edItems: edItems, certItems: certItems, skillItems: skillItems };
    
    // ── Count new items ──
    var newPos = posItems.filter(function(i) { return !i.exists; }).length;
    var newEd = edItems.filter(function(i) { return !i.exists; }).length;
    var newCerts = certItems.filter(function(i) { return !i.exists; }).length;
    var newSkills = skillItems.filter(function(i) { return !i.exists; }).length;
    
    // ── Build modal HTML ──
    var html = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">' + bpIcon('network', 20) + ' LinkedIn Import Review</h2>'
        + '<p style="color:var(--c-muted); margin-top:4px; font-size:0.85em;">Review what\'s new, select what to add. Nothing is changed until you confirm.</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:20px; max-height:75vh; overflow-y:auto;">';
    
    // Helper to build a section
    function section(title, icon, items, sectionKey, allNew, allExisting) {
        if (items.length === 0) return '';
        var newCount = items.filter(function(i) { return !i.exists; }).length;
        var existCount = items.length - newCount;
        
        var s = '<div style="margin-bottom:20px;">'
            + '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">'
            + '<div style="display:flex; align-items:center; gap:8px;">'
            + '<span style="font-size:1em;">' + icon + '</span>'
            + '<span style="font-weight:700; color:var(--text-primary); font-size:0.92em;">' + title + '</span>'
            + (newCount > 0 ? '<span style="font-size:0.72em; padding:2px 8px; border-radius:10px; background:rgba(16,185,129,0.12); color:#10b981; font-weight:700;">+' + newCount + ' new</span>' : '')
            + (existCount > 0 ? '<span style="font-size:0.72em; padding:2px 8px; border-radius:10px; background:var(--c-surface-4a); color:var(--c-muted); font-weight:600;">' + existCount + ' existing</span>' : '')
            + '</div>';
        
        if (newCount > 1) {
            s += '<label style="font-size:0.75em; color:var(--accent); cursor:pointer; display:flex; align-items:center; gap:4px;">'
                + '<input type="checkbox" checked onchange="mergeToggleAll(\'' + sectionKey + '\', this.checked)" style="accent-color:var(--accent);"> Select all new</label>';
        }
        s += '</div>';
        
        items.forEach(function(item, idx) {
            var cbId = 'merge-' + sectionKey + '-' + idx;
            if (item.exists) {
                s += '<div style="padding:8px 12px; margin-bottom:4px; opacity:0.45; border-radius:6px; display:flex; align-items:center; gap:10px;">'
                    + '<span style="width:18px; height:18px; border-radius:4px; background:var(--c-surface-5); display:flex; align-items:center; justify-content:center; font-size:0.7em; color:var(--c-muted); flex-shrink:0;">\u2713</span>'
                    + '<div style="flex:1; min-width:0;">'
                    + '<div style="font-size:0.85em; color:var(--c-muted);">' + escapeHtml(item.label) + '</div>'
                    + (item.sub ? '<div style="font-size:0.72em; color:var(--c-faint);">' + escapeHtml(item.sub) + ' \u2014 already in profile</div>' : '')
                    + '</div></div>';
            } else {
                s += '<div style="padding:8px 12px; margin-bottom:4px; background:rgba(16,185,129,0.04); border:1px solid rgba(16,185,129,0.12); border-radius:6px; display:flex; align-items:center; gap:10px;">'
                    + '<input type="checkbox" id="' + cbId + '" data-merge-section="' + sectionKey + '" checked style="accent-color:#10b981; flex-shrink:0; width:16px; height:16px; cursor:pointer;">'
                    + '<div style="flex:1; min-width:0;">'
                    + '<div style="font-size:0.85em; font-weight:600; color:var(--c-text-alt);">' + escapeHtml(item.label) + '</div>'
                    + (item.sub ? '<div style="font-size:0.72em; color:var(--c-muted);">' + escapeHtml(item.sub) + '</div>' : '')
                    + '</div>'
                    + '<span style="font-size:0.68em; padding:2px 6px; border-radius:6px; background:rgba(16,185,129,0.12); color:#10b981; font-weight:700; flex-shrink:0;">NEW</span>'
                    + '</div>';
            }
        });
        
        s += '</div>';
        return s;
    }
    
    html += section('Positions', '\uD83D\uDCBC', posItems, 'pos');
    html += section('Education', '\uD83C\uDF93', edItems, 'ed');
    html += section('Certifications', '\uD83D\uDCDC', certItems, 'cert');
    
    // Skills — compact chips instead of full rows
    if (skillItems.length > 0) {
        var newSkillItems = skillItems.filter(function(i) { return !i.exists; });
        var existSkillItems = skillItems.filter(function(i) { return i.exists; });
        
        html += '<div style="margin-bottom:20px;">'
            + '<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">'
            + '<span style="font-size:1em;">\u2B50</span>'
            + '<span style="font-weight:700; color:var(--text-primary); font-size:0.92em;">Skills</span>'
            + (newSkillItems.length > 0 ? '<span style="font-size:0.72em; padding:2px 8px; border-radius:10px; background:rgba(16,185,129,0.12); color:#10b981; font-weight:700;">+' + newSkillItems.length + ' new</span>' : '')
            + (existSkillItems.length > 0 ? '<span style="font-size:0.72em; padding:2px 8px; border-radius:10px; background:var(--c-surface-4a); color:var(--c-muted); font-weight:600;">' + existSkillItems.length + ' existing</span>' : '')
            + '</div>';
        
        if (newSkillItems.length > 0) {
            html += '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">';
            skillItems.forEach(function(item, idx) {
                if (item.exists) return;
                var cbId = 'merge-skill-' + idx;
                html += '<label for="' + cbId + '" style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; '
                    + 'border-radius:14px; font-size:0.78em; font-weight:600; cursor:pointer; '
                    + 'background:rgba(16,185,129,0.08); color:#10b981; border:1px solid rgba(16,185,129,0.15);">'
                    + '<input type="checkbox" id="' + cbId + '" data-merge-section="skill" checked style="accent-color:#10b981; width:12px; height:12px;">'
                    + escapeHtml(item.label) + '</label>';
            });
            html += '</div>';
        }
        if (existSkillItems.length > 0) {
            html += '<div style="display:flex; flex-wrap:wrap; gap:4px;">';
            existSkillItems.forEach(function(item) {
                html += '<span style="padding:3px 8px; border-radius:10px; font-size:0.72em; background:var(--c-surface-4a); color:var(--c-muted);">' + escapeHtml(item.label) + '</span>';
            });
            html += '</div>';
        }
        html += '</div>';
    }
    
    // ── Endorsements (always applied, informational) ──
    if (totalEndorsements > 0) {
        html += '<div style="margin-bottom:20px; padding:12px; background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.15); border-radius:8px;">'
            + '<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">'
            + '<span style="font-size:1em;">\uD83D\uDC4D</span>'
            + '<span style="font-weight:700; color:var(--text-primary); font-size:0.92em;">Endorsements</span>'
            + '<span style="font-size:0.72em; padding:2px 8px; border-radius:10px; background:rgba(245,158,11,0.12); color:#f59e0b; font-weight:700;">' + totalEndorsements + ' across ' + endorseKeys.length + ' skills</span>'
            + '</div>'
            + '<div style="font-size:0.78em; color:var(--c-muted);">Endorsement counts will be applied to matching skills. Skills with 10+ endorsements get +1 level boost, 25+ get +2.</div>'
            + '</div>';
    }
    
    // ── Content & Evidence (split: opt-in for high-volume, auto for low-volume) ──
    var hasOptional = contentCounts.articles > 0 || contentCounts.posts > 0 || contentCounts.learning > 0;
    var autoApplied = [];
    if (contentCounts.recommendations > 0) autoApplied.push(contentCounts.recommendations + ' recommendations');
    if (contentCounts.volunteering > 0) autoApplied.push(contentCounts.volunteering + ' volunteering roles');
    if (contentCounts.honors > 0) autoApplied.push(contentCounts.honors + ' honors');
    if (contentCounts.causes > 0) autoApplied.push(contentCounts.causes + ' causes');
    if (contentCounts.organizations > 0) autoApplied.push(contentCounts.organizations + ' organizations');
    if (contentCounts.network > 0) autoApplied.push(contentCounts.network.toLocaleString() + ' connections');
    
    if (hasOptional || autoApplied.length > 0) {
        html += '<div style="margin-bottom:20px; padding:12px; background:rgba(96,165,250,0.05); border:1px solid rgba(96,165,250,0.15); border-radius:8px;">'
            + '<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">'
            + '<span style="font-size:1em;">\uD83D\uDCCB</span>'
            + '<span style="font-weight:700; color:var(--text-primary); font-size:0.92em;">Content & Evidence</span>'
            + '</div>';
        
        // Optional high-volume content
        if (hasOptional) {
            html += '<div style="font-size:0.78em; color:var(--c-muted); margin-bottom:8px;">Choose which content to import. These can be large collections.</div>'
                + '<div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">';
            
            if (contentCounts.articles > 0) {
                html += '<label style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--c-surface-2); border:1px solid var(--c-surface-5b); border-radius:6px; cursor:pointer;">'
                    + '<input type="checkbox" id="merge-opt-articles" checked style="accent-color:var(--accent); width:15px; height:15px;">'
                    + '<div style="flex:1;"><span style="font-weight:600; color:var(--c-text-alt); font-size:0.85em;">\uD83D\uDCF0 Articles</span>'
                    + ' <span style="font-size:0.75em; color:var(--c-muted);">' + contentCounts.articles + ' published</span></div></label>';
            }
            if (contentCounts.posts > 0) {
                html += '<label style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--c-surface-2); border:1px solid var(--c-surface-5b); border-radius:6px; cursor:pointer;">'
                    + '<input type="checkbox" id="merge-opt-posts" checked style="accent-color:var(--accent); width:15px; height:15px;">'
                    + '<div style="flex:1;"><span style="font-weight:600; color:var(--c-text-alt); font-size:0.85em;">\uD83D\uDCAC Posts</span>'
                    + ' <span style="font-size:0.75em; color:var(--c-muted);">' + contentCounts.posts + ' substantial posts</span></div></label>';
            }
            if (contentCounts.learning > 0) {
                html += '<label style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:var(--c-surface-2); border:1px solid var(--c-surface-5b); border-radius:6px; cursor:pointer;">'
                    + '<input type="checkbox" id="merge-opt-learning" checked style="accent-color:var(--accent); width:15px; height:15px;">'
                    + '<div style="flex:1;"><span style="font-weight:600; color:var(--c-text-alt); font-size:0.85em;">\uD83D\uDCDA Courses</span>'
                    + ' <span style="font-size:0.75em; color:var(--c-muted);">' + contentCounts.learning + ' completed of ' + contentCounts.learningTotal + '</span></div></label>';
            }
            html += '</div>';
        }
        
        // Auto-applied low-volume content
        if (autoApplied.length > 0) {
            html += '<div style="font-size:0.72em; color:var(--c-muted); margin-bottom:4px;">Always included:</div>'
                + '<div style="display:flex; flex-wrap:wrap; gap:5px;">'
                + autoApplied.map(function(l) {
                    return '<span style="font-size:0.72em; padding:2px 8px; border-radius:8px; background:var(--c-surface-4a); color:var(--text-secondary);">' + l + '</span>';
                }).join('')
                + '</div>';
        }
        
        html += '</div>';
    }
    
    // ── Summary bar + action buttons ──
    var totalNew = newPos + newEd + newCerts + newSkills;
    html += '<div style="padding:14px; background:var(--c-surface-2); border-radius:8px; margin-bottom:16px;">'
        + '<div style="display:flex; justify-content:space-between; align-items:center;">'
        + '<div>'
        + '<span style="font-weight:700; color:var(--text-primary);">' + totalNew + ' new item' + (totalNew !== 1 ? 's' : '') + ' to add</span>'
        + '<span style="font-size:0.82em; color:var(--c-muted);"> \u00B7 ' + (posItems.length + edItems.length + certItems.length + skillItems.length - totalNew) + ' already in your profile</span>'
        + '</div></div></div>';
    
    html += '<div style="display:flex; gap:10px;">'
        + '<button onclick="applyMergeSelections()" style="padding:12px 28px; background:#10b981; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.95em;">'
        + bpIcon('check', 14) + ' Merge Selected</button>'
        + '<button onclick="closeExportModal()" style="padding:12px 20px; background:transparent; color:var(--c-muted); border:1px solid var(--c-border-solid); border-radius:8px; cursor:pointer;">Cancel</button>'
        + '</div>';
    
    html += '</div>';
    mc.innerHTML = html;
    modal.style.display = 'flex';
}

export function mergeToggleAll(sectionKey, checked) {
    document.querySelectorAll('[data-merge-section="' + sectionKey + '"]').forEach(function(cb) {
        cb.checked = checked;
    });
}
if (!window.mergeToggleAll) window.mergeToggleAll = mergeToggleAll;

export function applyMergeSelections() {
    var parsed = window._mergeParsed;
    var diff = window._mergeDiff;
    if (!parsed || !diff) { showToast('No merge data found.', 'error'); return; }
    
    var added = { positions: 0, education: 0, certifications: 0, skills: 0 };
    
    // ── Apply selected positions ──
    diff.posItems.forEach(function(item, idx) {
        if (item.exists) return;
        var cb = document.getElementById('merge-pos-' + idx);
        if (cb && cb.checked) {
            window._userData.workHistory.push(item.data);
            added.positions++;
        }
    });
    
    // Rebuild company tenures
    var companyGroups = {};
    (window._userData.workHistory || []).forEach(function(job) {
        var normCo = (job.company || '').trim().replace(/,?\s*(LLC|Inc\.?|Corp\.?|Ltd\.?|Co\.?|People|Group|Holdings)\.?\s*$/i, '').trim().toLowerCase();
        if (!normCo) return;
        if (!companyGroups[normCo]) companyGroups[normCo] = { name: job.company, positions: [] };
        companyGroups[normCo].positions.push(job);
    });
    Object.values(companyGroups).forEach(function(g) {
        g.name = g.positions[g.positions.length - 1].company;
        g.isProgression = g.positions.length > 1;
    });
    window._userData.companyTenures = Object.values(companyGroups);
    
    // ── Apply selected education ──
    diff.edItems.forEach(function(item, idx) {
        if (item.exists) return;
        var cb = document.getElementById('merge-ed-' + idx);
        if (cb && cb.checked) {
            window._userData.education.push({
                id: 'ed-li-' + Date.now() + '-' + Math.random().toString(36).substr(2,4),
                type: 'degree', school: item.data.school, degree: item.data.degree, field: item.data.field,
                year: item.data.endDate || '', startYear: item.data.startDate || '', endYear: item.data.endDate || ''
            });
            added.education++;
        }
    });
    
    // ── Apply selected certifications ──
    diff.certItems.forEach(function(item, idx) {
        if (item.exists) return;
        var cb = document.getElementById('merge-cert-' + idx);
        if (cb && cb.checked) {
            window._userData.certifications.push({ name: item.data.name, issuer: item.data.authority, abbr: '',
                year: item.data.endDate || item.data.startDate || '', type: 'Certification', tier: 1, linkedSkills: [] });
            added.certifications++;
        }
    });
    
    // ── Apply selected skills ──
    var existingSkillNames = (_sd().skills || []).map(function(s) { return s.name.toLowerCase(); });
    diff.skillItems.forEach(function(item, idx) {
        if (item.exists) return;
        var cb = document.getElementById('merge-skill-' + idx);
        if (cb && cb.checked && existingSkillNames.indexOf(item.data.toLowerCase()) < 0) {
            _sd().skills.push({ name: item.data, level: 'Proficient', category: 'skill',
                key: false, roles: [], evidence: [], source: 'linkedin-merge' });
            existingSkillNames.push(item.data.toLowerCase());
            added.skills++;
        }
    });
    
    // ── Always apply endorsements ──
    var endorsementCounts = parsed.endorsements || {};
    var boosted = 0;
    if (Object.keys(endorsementCounts).length > 0) {
        var lvlOrder = ['Novice', 'Proficient', 'Advanced', 'Expert', 'Mastery'];
        (_sd().skills || []).forEach(function(skill) {
            var sLow = skill.name.toLowerCase();
            var eCount = 0;
            Object.keys(endorsementCounts).forEach(function(en) {
                if (en.toLowerCase() === sLow || sLow.indexOf(en.toLowerCase()) >= 0 || en.toLowerCase().indexOf(sLow) >= 0)
                    eCount += endorsementCounts[en];
            });
            if (eCount > 0) {
                skill.endorsements = eCount;
                var ci = lvlOrder.indexOf(skill.level);
                if (ci >= 0) {
                    var b = eCount >= 25 ? 2 : eCount >= 10 ? 1 : 0;
                    var ni = Math.min(ci + b, lvlOrder.length - 1);
                    if (ni > ci) { skill.level = lvlOrder[ni]; skill.endorsementBoosted = true; boosted++; }
                }
            }
        });
    }
    
    // ── Update linkedinContent (respecting opt-in checkboxes) ──
    var includeArticles = !document.getElementById('merge-opt-articles') || document.getElementById('merge-opt-articles').checked;
    var includePosts = !document.getElementById('merge-opt-posts') || document.getElementById('merge-opt-posts').checked;
    var includeLearning = !document.getElementById('merge-opt-learning') || document.getElementById('merge-opt-learning').checked;
    
    window._userData.linkedinContent = {
        endorsements: parsed.endorsements, recommendations: parsed.recommendations,
        volunteering: parsed.volunteering, honors: parsed.honors, causes: parsed.causes,
        organizations: parsed.organizations,
        articles: includeArticles ? parsed.articles.map(function(a) { return { title: a.title, created: a.created, wordCount: a.wordCount, text: a.text }; }) : (window._userData.linkedinContent || {}).articles || [],
        posts: includePosts ? parsed.richMedia.map(function(p) { return { date: p.date, content: p.content.substring(0, 1500) }; }) : (window._userData.linkedinContent || {}).posts || [],
        learning: includeLearning ? parsed.learning : (window._userData.linkedinContent || {}).learning || [],
        networkSize: parsed.networkSize
    };
    
    window._userData.importStats = { lastMerge: new Date().toISOString(), positions: parsed.workHistory.length,
        skills: parsed.rawSkills.length,
        endorsements: Object.values(endorsementCounts).reduce(function(s,v) { return s+v; }, 0),
        recommendations: (parsed.recommendations || []).length, articles: (parsed.articles || []).length,
        posts: (parsed.richMedia || []).length, learning: parsed.learningTotal || 0,
        learningCompleted: (parsed.learning || []).length, volunteering: (parsed.volunteering || []).length,
        honors: (parsed.honors || []).length, causes: (parsed.causes || []).length, network: parsed.networkSize || 0 };
    
    // Save
    window._userData.skills = _sd().skills;
    saveAll();
    if (fbUser) debouncedSave();
    logAnalyticsEvent('linkedin_merge', { positions: added.positions, skills: added.skills, boosted: boosted });
    
    // Clean up
    delete window._mergeParsed;
    delete window._mergeDiff;
    
    closeExportModal();
    
    var summary = [];
    if (added.positions > 0) summary.push(added.positions + ' position' + (added.positions > 1 ? 's' : ''));
    if (added.education > 0) summary.push(added.education + ' education');
    if (added.certifications > 0) summary.push(added.certifications + ' cert' + (added.certifications > 1 ? 's' : ''));
    if (added.skills > 0) summary.push(added.skills + ' skill' + (added.skills > 1 ? 's' : ''));
    if (boosted > 0) summary.push(boosted + ' skill' + (boosted > 1 ? 's' : '') + ' boosted');
    
    showToast('Merged: ' + (summary.length > 0 ? summary.join(', ') : 'content updated') + '.', 'success', 5000);
    refreshExperienceContent();
}
if (!window.applyMergeSelections) window.applyMergeSelections = applyMergeSelections;

// ── STEP 1: Entry point ───────────────────────────────────────────────

export function renderWizardStep1(el) {
    var hasExistingProfile = (_sd().skills || []).length > 0 || (window._userData.workHistory || []).length > 0;
    
    el.innerHTML = `
        ${wizardHeading(bpIcon('blueprint',22), 'Build Your Blueprint',
            'Most people undersell themselves when applying for work \u2014 not because they lack ability, but because they\u2019ve never had the right tool to articulate it. This changes that.')}

        ${hasExistingProfile ? `
        <div style="padding:14px 18px; margin-bottom:20px; background:linear-gradient(135deg, rgba(10,102,194,0.08), rgba(10,102,194,0.02));
            border:2px solid rgba(10,102,194,0.25); border-radius:12px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                <div>
                    <div style="font-weight:700; color:var(--text-primary); font-size:0.95em;">Update Existing Blueprint</div>
                    <div style="font-size:0.82em; color:var(--text-secondary); line-height:1.4;">
                        You already have a profile with ${(_sd().skills || []).length} skills and ${(window._userData.workHistory || []).length} positions.
                        Upload a LinkedIn .zip to merge in new data without losing anything.
                    </div>
                </div>
            </div>
            <label style="padding:10px 20px; background:#0a66c2; color:#fff; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.88em; display:inline-flex; align-items:center; gap:6px; white-space:nowrap;">
                ${bpIcon('network', 14)} Upload LinkedIn .zip
                <input type="file" accept=".zip" onchange="handleLinkedInMerge(this); closeWizard();" style="display:none;">
            </label>
        </div>
        <div style="text-align:center; color:var(--c-muted); font-size:0.78em; margin-bottom:16px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em;">
            \u2014 or start fresh \u2014
        </div>
        ` : ''}

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-bottom:24px;">
            <div onclick="wizardChooseUpload()" id="card-upload"
                 style="background:var(--bg-elevated); border:2px solid var(--border);
                        border-radius:12px; padding:28px; cursor:pointer; transition:all 0.2s;
                        text-align:center;"
                 onmouseover="this.style.borderColor='var(--accent)'"
                 onmouseout="this.style.borderColor='var(--border)'">
                <div style="margin-bottom:12px;">${bpIcon("file-text",32)}</div>
                <div style="font-weight:700; color:var(--text-primary); margin-bottom:6px;">Upload Resume</div>
                <div style="font-size:0.85em; color:var(--text-secondary); line-height:1.5;">
                    PDF or paste text. Claude reads it and builds your profile automatically.
                </div>
                <div style="margin-top:14px; font-size:0.78em; color:var(--accent); font-weight:600;">
                    RECOMMENDED
                </div>
            </div>

            <div onclick="wizardChooseLinkedIn()" id="card-linkedin"
                 style="background:var(--bg-elevated); border:2px solid var(--border);
                        border-radius:12px; padding:28px; cursor:pointer; transition:all 0.2s;
                        text-align:center;"
                 onmouseover="this.style.borderColor='#0a66c2'"
                 onmouseout="this.style.borderColor='var(--border)'">
                <div style="margin-bottom:12px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
                </div>
                <div style="font-weight:700; color:var(--text-primary); margin-bottom:6px;">LinkedIn Import</div>
                <div style="font-size:0.85em; color:var(--text-secondary); line-height:1.5;">
                    Upload your LinkedIn data export (.zip). Structured data, no AI needed.
                </div>
                <div style="margin-top:14px; font-size:0.78em; color:#0a66c2; font-weight:600;">
                    ZERO COST \u00B7 INSTANT
                </div>
            </div>

            <div onclick="wizardChooseManual()" id="card-manual"
                 style="background:var(--bg-elevated); border:2px solid var(--border);
                        border-radius:12px; padding:28px; cursor:pointer; transition:all 0.2s;
                        text-align:center;"
                 onmouseover="this.style.borderColor='var(--accent)'"
                 onmouseout="this.style.borderColor='var(--border)'">
                <div style="font-size:2.2em; margin-bottom:12px;">${bpIcon('edit',32)}</div>
                <div style="font-weight:700; color:var(--text-primary); margin-bottom:6px;">Start Fresh</div>
                <div style="font-size:0.85em; color:var(--text-secondary); line-height:1.5;">
                    Build your profile step by step. Good if you don't have a resume handy.
                </div>
            </div>
        </div>

        <div onclick="wizardChooseExplorer()" id="card-explorer"
             style="background:linear-gradient(135deg, rgba(139,92,246,0.06), rgba(96,165,250,0.06));
                    border:2px solid rgba(139,92,246,0.25); border-radius:12px; padding:20px 24px;
                    cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:16px;
                    margin-bottom:24px;"
             onmouseover="this.style.borderColor='#8b5cf6'"
             onmouseout="this.style.borderColor='rgba(139,92,246,0.25)'">
            <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg,#8b5cf6,#60a5fa);
                        display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                ${bpIcon('compass',24)}
            </div>
            <div style="flex:1;">
                <div style="font-weight:700; color:var(--text-primary); font-size:0.95em; margin-bottom:4px;">
                    \uD83C\uDF93 I'm Just Getting Started
                </div>
                <div style="font-size:0.82em; color:var(--text-secondary); line-height:1.5;">
                    Student, recent grad, or career changer? No resume needed. We'll discover your skills from
                    school, activities, interests, and hobbies \u2014 then suggest career paths that fit you.
                </div>
                <div style="margin-top:8px; font-size:0.72em; color:#8b5cf6; font-weight:600; text-transform:uppercase; letter-spacing:0.06em;">
                    Explorer Mode \u00B7 AI-Guided
                </div>
            </div>
        </div>

        <div onclick="wizardChooseImport()"
             style="background:var(--bg-elevated); border:2px dashed var(--border);
                    border-radius:12px; padding:18px 24px; cursor:pointer; transition:all 0.2s;
                    display:flex; align-items:center; gap:16px; margin-bottom:24px;"
             onmouseover="this.style.borderColor='var(--accent)'"
             onmouseout="this.style.borderColor='var(--border)'">
            <div>${bpIcon("layers",28)}</div>
            <div>
                <div style="font-weight:600; color:var(--text-primary); font-size:0.9em;">
                    Import Saved Blueprint
                </div>
                <div style="font-size:0.82em; color:var(--text-secondary);">
                    Already have a profile JSON? Load it here.
                </div>
            </div>
            <input type="file" id="wizardImportFile" accept=".json" style="display:none"
                   onchange="wizardImportProfile(event)">
        </div>

        <p style="text-align:center; font-size:0.8em; color:var(--text-muted); margin-top:8px;">
            ${bpIcon("lock",14)} Your data is saved securely to your account. You own everything.
        </p>
    `;
}

// ── Overwrite safety gate for existing profiles ──
export function wizardOverwriteGuard(proceedFn) {
    var hasSkills = (_sd().skills || []).length > 0;
    var hasWork = (window._userData.workHistory || []).length > 0;
    var hasEd = (window._userData.education || []).length > 0;
    if (!hasSkills && !hasWork && !hasEd) {
        proceedFn();
        return;
    }
    
    var counts = [];
    if (hasSkills) counts.push((_sd().skills || []).length + ' skills');
    if (hasWork) counts.push((window._userData.workHistory || []).length + ' positions');
    if (hasEd) counts.push((window._userData.education || []).length + ' education entries');
    var certCount = (window._userData.certifications || []).length;
    if (certCount > 0) counts.push(certCount + ' certifications');
    var outcomeCount = (_bd().outcomes || []).length;
    if (outcomeCount > 0) counts.push(outcomeCount + ' outcomes');
    
    var inner = document.getElementById('wizardInner');
    if (!inner) { proceedFn(); return; }
    
    inner.innerHTML = `
        <div style="max-width:560px; margin:0 auto; padding:20px;">
            <div style="text-align:center; margin-bottom:24px;">
                <div style="font-size:2.5em; margin-bottom:12px;">⚠️</div>
                <div style="font-family:Outfit,sans-serif; font-size:1.3em; font-weight:700; color:#f59e0b; margin-bottom:8px;">
                    You Have an Existing Blueprint
                </div>
                <div style="color:var(--text-secondary); font-size:0.92em; line-height:1.6;">
                    Starting fresh will <strong style="color:#ef4444;">replace your entire profile</strong>, including ${counts.join(', ')}.
                    This cannot be undone.
                </div>
            </div>
            
            <div style="padding:16px; background:rgba(96,165,250,0.06); border:1px solid rgba(96,165,250,0.2); border-radius:10px; margin-bottom:16px;">
                <div style="font-weight:700; color:var(--text-primary); font-size:0.9em; margin-bottom:6px;">
                    ${bpIcon('export', 16)} Back up your profile first
                </div>
                <div style="font-size:0.82em; color:var(--text-muted); margin-bottom:10px; line-height:1.5;">
                    Download a JSON copy of everything. You can re-import it later if you change your mind.
                </div>
                <button onclick="wizardQuickExport()" style="padding:8px 18px; background:var(--accent); color:#fff; border:none; border-radius:7px; cursor:pointer; font-weight:600; font-size:0.85em;">
                    ${bpIcon('export', 12)} Download Backup
                </button>
            </div>
            
            <div style="padding:16px; background:rgba(10,102,194,0.06); border:1px solid rgba(10,102,194,0.2); border-radius:10px; margin-bottom:20px;">
                <div style="font-weight:700; color:var(--text-primary); font-size:0.9em; margin-bottom:6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a66c2" style="vertical-align:-2px;"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    Did you mean to update instead?
                </div>
                <div style="font-size:0.82em; color:var(--text-muted); margin-bottom:10px; line-height:1.5;">
                    Upload a LinkedIn .zip to <strong>add</strong> new data to your existing profile. Nothing gets overwritten, you choose what merges in.
                </div>
                <label style="padding:8px 18px; background:#0a66c2; color:#fff; border-radius:7px; cursor:pointer; font-weight:600; font-size:0.85em; display:inline-flex; align-items:center; gap:5px;">
                    ${bpIcon('network', 12)} Update from LinkedIn Instead
                    <input type="file" accept=".zip" onchange="handleLinkedInMerge(this); closeWizard();" style="display:none;">
                </label>
            </div>
            
            <div style="border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:space-between; align-items:center;">
                <button onclick="wizardState.step = 1; renderWizardStep();" style="padding:8px 16px; background:transparent; border:1px solid var(--border); color:var(--text-muted); border-radius:7px; cursor:pointer; font-size:0.85em;">
                    \u2190 Go Back
                </button>
                <button id="wizardOverwriteConfirmBtn" onclick="window._wizardOverwriteProceed && window._wizardOverwriteProceed()" 
                    style="padding:8px 18px; background:transparent; border:1px solid rgba(239,68,68,0.3); color:#ef4444; border-radius:7px; cursor:pointer; font-weight:600; font-size:0.85em;">
                    I understand, start fresh
                </button>
            </div>
        </div>
    `;
    
    window._wizardOverwriteProceed = proceedFn;
}

export function wizardQuickExport() {
    var exportData = {
        profile: window._userData.profile || {},
        skills: _sd().skills || [],
        roles: _sd().roles || [],
        values: _bd().values || [],
        purpose: _bd().purpose || '',
        outcomes: _bd().outcomes || [],
        preferences: window._userData.preferences || {},
        workHistory: window._userData.workHistory || [],
        education: window._userData.education || [],
        certifications: window._userData.certifications || [],
        verifications: window._userData.verifications || [],
        savedJobs: window._userData.savedJobs || [],
        linkedinContent: window._userData.linkedinContent || {},
        companyTenures: window._userData.companyTenures || [],
        importStats: window._userData.importStats || {},
        contentVisibility: window._userData.contentVisibility || {},
        exportedAt: new Date().toISOString(),
        exportedFor: (window._userData.profile || {}).name || 'backup',
        version: BP_VERSION
    };
    
    var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'blueprint-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Backup downloaded. You can re-import this anytime.', 'success', 4000);
    
    // Visually confirm the export happened
    var btn = document.getElementById('wizardOverwriteConfirmBtn');
    if (btn) {
        btn.style.background = 'rgba(239,68,68,0.08)';
        btn.style.borderColor = '#ef4444';
    }
}
if (!window.wizardQuickExport) window.wizardQuickExport = wizardQuickExport;

export function wizardChooseUpload() {
    wizardOverwriteGuard(function() {
        wizardState.entryMode = 'upload';
        wizardNext();
    });
}

export function wizardChooseLinkedIn() {
    wizardOverwriteGuard(function() {
        wizardState.entryMode = 'linkedin';
        wizardNext();
    });
}

export function wizardChooseManual() {
    wizardOverwriteGuard(function() {
        wizardState.entryMode = 'manual';
        wizardState.step = 4;
        renderWizardStep();
    });
}

export function wizardChooseExplorer() {
    wizardOverwriteGuard(function() {
        wizardState.entryMode = 'explorer';
        wizardState.totalSteps = 7;
        wizardState.explorerData = { education: {}, activities: [], interests: [], partTimeJobs: [] };
        wizardState.step = 2;
        renderWizardStep();
    });
}

export function wizardChooseImport() {
    if (readOnlyGuard()) return;
    document.getElementById('wizardImportFile').click();
}

export function wizardImportProfile(event) {
    if (readOnlyGuard()) return;
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = sanitizeImport(JSON.parse(e.target.result));
            userData = { ...imported, initialized: true };
            window._userData = userData;
            saveUserData();
            closeWizard();
            location.reload();
        } catch(err) {
            showToast('File read error: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

// ── STEP 2: Resume input OR LinkedIn .zip upload ─────────────────────

export function renderWizardStep2(el) {
    if (wizardState.entryMode === 'linkedin') {
        return renderWizardStep2LinkedIn(el);
    }
    el.innerHTML = `
        ${wizardHeading(bpIcon('file-text',22), 'Add Your Resume',
            'Upload a PDF, paste resume text, or copy your LinkedIn profile. Claude will extract your skills, experience, and outcomes automatically.')}

        <div style="background:var(--bg-elevated); border:1px solid var(--border);
                    border-radius:14px; padding:24px; margin-bottom:20px;">
            <div style="display:flex; gap:8px; margin-bottom:16px;">
                <button onclick="wizardSetResumeTab('upload')" id="rtab-upload"
                        style="padding:7px 16px; border-radius:7px; border:none; cursor:pointer;
                               background:var(--accent); color:#fff; font-size:0.85em; font-weight:600;">
                    Upload PDF
                </button>
                <button onclick="wizardSetResumeTab('paste')" id="rtab-paste"
                        style="padding:7px 16px; border-radius:7px; border:1px solid var(--border);
                               background:var(--input-bg); color:var(--text-secondary);
                               cursor:pointer; font-size:0.85em;">
                    Paste Text
                </button>
                <button onclick="wizardSetResumeTab('linkedin')" id="rtab-linkedin"
                        style="padding:7px 16px; border-radius:7px; border:1px solid var(--border);
                               background:var(--input-bg); color:var(--text-secondary);
                               cursor:pointer; font-size:0.85em;">
                    LinkedIn Text
                </button>
            </div>

            <div id="rtab-upload-content">
                <div id="resumeDropZone"
                     style="border:2px dashed var(--border); border-radius:10px; padding:40px 24px;
                            text-align:center; cursor:pointer; transition:all 0.2s;"
                     onclick="document.getElementById('resumeFileInput').click()"
                     ondragover="event.preventDefault(); this.style.borderColor='var(--accent)'; this.style.background='var(--accent-glow)'"
                     ondragleave="this.style.borderColor='var(--border)'; this.style.background='none'"
                     ondrop="event.preventDefault(); this.style.borderColor='var(--border)'; this.style.background='none'; wizardHandleResumeDrop(event)">
                    <div style="margin-bottom:12px;">${bpIcon("file-text",40)}</div>
                    <div style="font-weight:700; color:var(--text-primary); margin-bottom:8px;">
                        Drop your resume here
                    </div>
                    <div style="font-size:0.85em; color:var(--text-secondary);">
                        PDF files up to 10 MB \u00B7 or click to browse
                    </div>
                    <input type="file" id="resumeFileInput" accept=".pdf" style="display:none"
                           onchange="wizardHandleResumeFile(event)">
                </div>
                <div id="resumeFileInfo" style="display:none; margin-top:12px; padding:12px 16px;
                            background:var(--input-bg); border-radius:8px;
                            display:none; align-items:center; gap:10px;">
                    <span id="resumeFileName" style="color:var(--text-primary); font-size:0.88em; font-weight:500;"></span>
                    <button onclick="wizardClearResumeFile()" style="background:none; border:none; color:var(--text-muted);
                                   cursor:pointer; font-size:0.82em; margin-left:auto;">\u2715 Remove</button>
                </div>
            </div>

            <div id="rtab-paste-content" style="display:none;">
                <textarea id="wizardResumeText" placeholder="Paste your full resume here \u2014 the more detail, the better the profile Claude builds for you.

Include: job titles, companies, dates, responsibilities, achievements, metrics, skills, education, certifications..."
                          style="width:100%; min-height:280px; background:var(--input-bg);
                                 border:1px solid var(--border); border-radius:8px; padding:14px;
                                 color:var(--text-primary); font-size:0.88em; line-height:1.7;
                                 font-family:inherit; resize:vertical; outline:none;
                                 transition:border-color 0.2s;"
                          onfocus="this.style.borderColor='var(--accent)'"
                          onblur="this.style.borderColor='var(--border)'"
                          oninput="wizardCheckResumeReady()">${escapeHtml(wizardState.resumeText)}</textarea>
            </div>

            <div id="rtab-linkedin-content" style="display:none;">
                <p style="color:var(--text-secondary); font-size:0.85em; line-height:1.6; margin-bottom:14px;">
                    Go to your LinkedIn profile \u2192 click <strong>More</strong> \u2192 <strong>Save to PDF</strong>,
                    then paste the text here. Or copy your About section and each job entry manually.
                </p>
                <textarea id="wizardLinkedInText" placeholder="Paste your LinkedIn profile text here..."
                          style="width:100%; min-height:240px; background:var(--input-bg);
                                 border:1px solid var(--border); border-radius:8px; padding:14px;
                                 color:var(--text-primary); font-size:0.88em; line-height:1.7;
                                 font-family:inherit; resize:vertical; outline:none;"
                          oninput="wizardCheckResumeReady()"></textarea>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
            ${wizardBtn('\u2190 Back', 'wizardBack()', 'ghost')}
            <div style="display:flex; gap:10px; align-items:center;">
                <button onclick="wizardSkipParsing()"
                        style="background:none; border:none; color:var(--text-muted);
                               cursor:pointer; font-size:0.82em; text-decoration:underline;">
                    Skip \u2014 enter manually
                </button>
                <button id="wizardParseBtn" onclick="wizardStartParsing()" disabled
                        style="background:var(--accent); color:#fff; border:none;
                               padding:11px 28px; border-radius:9px; cursor:pointer;
                               font-size:0.9em; font-weight:600; opacity:0.5; transition:opacity 0.2s;">
                    Parse with Claude \u2192
                </button>
            </div>
        </div>
    `;
}

export function wizardSetResumeTab(tab) {
    var upload = document.getElementById('rtab-upload-content');
    var paste = document.getElementById('rtab-paste-content');
    var li = document.getElementById('rtab-linkedin-content');
    var btnUpload = document.getElementById('rtab-upload');
    var btnPaste = document.getElementById('rtab-paste');
    var btnLi = document.getElementById('rtab-linkedin');

    var activeStyle = 'background:var(--accent); color:#fff; border:none;';
    var inactiveStyle = 'background:var(--input-bg); color:var(--text-secondary); border:1px solid var(--border);';

    // Hide all
    if (upload) upload.style.display = 'none';
    if (paste) paste.style.display = 'none';
    if (li) li.style.display = 'none';

    // Reset all buttons
    [btnUpload, btnPaste, btnLi].forEach(function(btn) {
        if (btn) btn.style.cssText = 'padding:7px 16px; border-radius:7px; cursor:pointer; font-size:0.85em; font-weight:600; ' + inactiveStyle;
    });

    // Show active
    if (tab === 'upload' && upload) {
        upload.style.display = 'block';
        if (btnUpload) btnUpload.style.cssText = 'padding:7px 16px; border-radius:7px; cursor:pointer; font-size:0.85em; font-weight:600; ' + activeStyle;
    } else if (tab === 'paste' && paste) {
        paste.style.display = 'block';
        if (btnPaste) btnPaste.style.cssText = 'padding:7px 16px; border-radius:7px; cursor:pointer; font-size:0.85em; font-weight:600; ' + activeStyle;
    } else if (tab === 'linkedin' && li) {
        li.style.display = 'block';
        if (btnLi) btnLi.style.cssText = 'padding:7px 16px; border-radius:7px; cursor:pointer; font-size:0.85em; font-weight:600; ' + activeStyle;
    }
    wizardCheckResumeReady();
}

// ── Resume PDF file handling ────────────────────────────────────────

export function wizardHandleResumeDrop(event) {
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) wizardProcessResumeFile(file);
}

export function wizardHandleResumeFile(event) {
    var file = event.target && event.target.files && event.target.files[0];
    if (file) wizardProcessResumeFile(file);
}

export function wizardProcessResumeFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please upload a PDF file.', 'warning');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast('File is too large. Maximum size is 10 MB.', 'warning');
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        var base64 = e.target.result.split(',')[1];
        wizardState.resumeFileBase64 = base64;
        wizardState.resumeFileName = file.name;
        wizardState.resumeFileSize = file.size;

        // Show file info
        var info = document.getElementById('resumeFileInfo');
        var nameEl = document.getElementById('resumeFileName');
        var dropZone = document.getElementById('resumeDropZone');
        if (info) info.style.display = 'flex';
        if (nameEl) nameEl.textContent = file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)';
        if (dropZone) dropZone.style.display = 'none';

        wizardCheckResumeReady();
    };
    reader.readAsDataURL(file);
}

export function wizardClearResumeFile() {
    wizardState.resumeFileBase64 = null;
    wizardState.resumeFileName = null;
    wizardState.resumeFileSize = null;

    var info = document.getElementById('resumeFileInfo');
    var dropZone = document.getElementById('resumeDropZone');
    if (info) info.style.display = 'none';
    if (dropZone) dropZone.style.display = 'block';

    var input = document.getElementById('resumeFileInput');
    if (input) input.value = '';

    wizardCheckResumeReady();
}

export function wizardCheckResumeReady() {
    const t1 = document.getElementById('wizardResumeText')?.value?.trim() || '';
    const t2 = document.getElementById('wizardLinkedInText')?.value?.trim() || '';
    const hasText = t1.length > 50 || t2.length > 50;
    const hasFile = !!wizardState.resumeFileBase64;
    const ready = hasText || hasFile;
    const btn = document.getElementById('wizardParseBtn');
    if (btn) {
        btn.disabled = !ready;
        btn.style.opacity = ready ? '1' : '0.5';
        btn.style.cursor = ready ? 'pointer' : 'default';
    }
}

export function wizardSkipParsing() {
    wizardState.entryMode = 'manual';
    wizardState.step = 4;
    renderWizardStep();
}

async function wizardStartParsing() {
    const t1 = document.getElementById('wizardResumeText')?.value?.trim() || '';
    const t2 = document.getElementById('wizardLinkedInText')?.value?.trim() || '';
    wizardState.resumeText = t1 || t2;
    // File upload takes priority if present
    wizardState.useFileUpload = !!wizardState.resumeFileBase64 && !wizardState.resumeText;
    wizardNext(); // Go to step 3 (parsing/loading)
    await wizardRunParsing();
}

// ── STEP 2 (LinkedIn): .zip upload + CSV parsing ────────────────────

export function renderWizardStep2LinkedIn(el) {
    el.innerHTML = `
        ${wizardHeading(
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>',
            'Import from LinkedIn',
            'Upload the data archive from your LinkedIn account. Your positions, skills, education, and certifications are imported instantly \u2014 no AI processing required.')}

        <div style="background:var(--bg-elevated); border:1px solid var(--border);
                    border-radius:14px; padding:24px; margin-bottom:20px;">

            <div id="linkedinDropZone"
                 style="border:2px dashed var(--border); border-radius:10px; padding:40px 24px;
                        text-align:center; cursor:pointer; transition:all 0.2s; margin-bottom:20px;"
                 onclick="document.getElementById('linkedinZipInput').click()"
                 ondragover="event.preventDefault(); this.style.borderColor='#0a66c2'; this.style.background='var(--accent-glow)'"
                 ondragleave="this.style.borderColor='var(--border)'; this.style.background='none'"
                 ondrop="event.preventDefault(); this.style.borderColor='var(--border)'; this.style.background='none'; wizardHandleLinkedInDrop(event)">
                <div style="font-size:2.4em; margin-bottom:12px;">${bpIcon('upload', 36)}</div>
                <div style="font-weight:700; color:var(--text-primary); margin-bottom:8px;">
                    Drop your LinkedIn .zip file here
                </div>
                <div style="font-size:0.85em; color:var(--text-secondary); margin-bottom:14px;">
                    or click to browse
                </div>
                <input type="file" id="linkedinZipInput" accept=".zip" style="display:none"
                       onchange="wizardHandleLinkedInFile(event)">
            </div>

            <div id="linkedinParseStatus" style="display:none; text-align:center; padding:20px;">
                <div style="animation:spin 2s linear infinite; display:inline-block;">${bpIcon("settings",24)}</div>
                <div id="linkedinParseMsg" style="color:var(--text-secondary); font-size:0.9em; margin-top:10px;">
                    Processing...
                </div>
            </div>

            <details style="margin-top:4px;">
                <summary style="font-size:0.85em; color:var(--accent); cursor:pointer; font-weight:600;">
                    How to get your LinkedIn data archive
                </summary>
                <div style="padding:14px 0 0; font-size:0.84em; color:var(--text-secondary); line-height:1.7;">
                    <ol style="padding-left:18px; margin:0;">
                        <li>Go to <strong>LinkedIn.com</strong> \u2192 click your profile photo \u2192 <strong>Settings & Privacy</strong></li>
                        <li>Select <strong>Data Privacy</strong> tab \u2192 <strong>Get a copy of your data</strong></li>
                        <li>Choose <strong>"Want something in particular?"</strong> and select these items:<br>
                            <span style="color:var(--text-primary); font-weight:500;">Profile, Positions, Skills, Education, Certifications, Endorsements, Recommendations, Articles, Posts, Learning, Volunteering, Honors, Causes</span></li>
                        <li>Click <strong>Request archive</strong> \u2014 LinkedIn emails you the download link in ~15 minutes</li>
                        <li>Download the .zip file and upload it here</li>
                    </ol>
                    <div style="margin-top:12px; padding:10px 14px; background:var(--input-bg); border-radius:8px;
                                border-left:3px solid #0a66c2;">
                        <strong>Privacy note:</strong> Your .zip is parsed entirely in your browser. No data is sent to any server.
                        Blueprint only reads the career-related CSV files and ignores everything else.
                    </div>
                </div>
            </details>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
            ${wizardBtn('\u2190 Back', 'wizardBack()', 'ghost')}
            <div style="display:flex; gap:10px; align-items:center;">
                <button onclick="wizardSkipParsing()"
                        style="background:none; border:none; color:var(--text-muted);
                               cursor:pointer; font-size:0.82em; text-decoration:underline;">
                    Skip \u2014 enter manually
                </button>
            </div>
        </div>
    `;
}

export function wizardHandleLinkedInDrop(event) {
    const file = event.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.zip')) {
        wizardParseLinkedInZip(file);
    } else {
        showToast('Please drop a .zip file from LinkedIn\u2019s data export.', 'warning');
    }
}

export function wizardHandleLinkedInFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
        showToast('Please select a .zip file from LinkedIn\u2019s data export.', 'warning');
        return;
    }
    wizardParseLinkedInZip(file);
}

async function wizardParseLinkedInZip(file) {
    const dropZone = document.getElementById('linkedinDropZone');
    const status = document.getElementById('linkedinParseStatus');
    const msg = document.getElementById('linkedinParseMsg');
    if (dropZone) dropZone.style.display = 'none';
    if (status) status.style.display = 'block';

    const setMsg = (text) => { if (msg) msg.textContent = text; };

    try {
        setMsg('Reading archive...');
        logAnalyticsEvent('linkedin_zip_import', {});

        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not loaded. Please refresh and try again.');
        }

        const zip = await JSZip.loadAsync(file);
        setMsg('Extracting CSV files...');

        // Parse each CSV file we care about
        const csvFiles = {};
        const targetFiles = ['Profile.csv', 'Positions.csv', 'Skills.csv', 'Education.csv',
                             'Certifications.csv', 'Languages.csv', 'Projects.csv', 'Email Addresses.csv',
                             'Endorsement_Received_Info.csv', 'Recommendations_Received.csv',
                             'Volunteering.csv', 'Honors.csv', 'Causes You Care About.csv',
                             'Rich_Media.csv', 'Learning.csv', 'Organizations.csv',
                             'Connections.csv', 'Company_Follows.csv'];

        // Header normalization map: lowercase variant -> canonical name
        // Handles LinkedIn format changes across regions and export versions
        var headerMap = {
            // Profile.csv
            'first name': 'First Name', 'first_name': 'First Name', 'firstname': 'First Name',
            'last name': 'Last Name', 'last_name': 'Last Name', 'lastname': 'Last Name',
            'headline': 'Headline',
            'summary': 'Summary', 'about': 'Summary',
            'geo location': 'Geo Location', 'geolocation': 'Geo Location',
            'industry': 'Industry',
            // Positions.csv
            'company name': 'Company Name', 'company': 'Company Name', 'organization name': 'Company Name', 'org name': 'Company Name',
            'title': 'Title', 'position': 'Title', 'job title': 'Title',
            'description': 'Description',
            'location': 'Location',
            'started on': 'Started On', 'start date': 'Started On', 'start_date': 'Started On',
            'finished on': 'Finished On', 'end date': 'Finished On', 'end_date': 'Finished On',
            // Skills.csv
            'name': 'Name', 'skill': 'Name', 'skill name': 'Name',
            // Education.csv
            'school name': 'School Name', 'school': 'School Name', 'institution': 'School Name', 'university': 'School Name',
            'degree name': 'Degree Name', 'degree': 'Degree Name',
            'notes': 'Notes', 'field of study': 'Field Of Study',
            'activities': 'Activities', 'activities and societies': 'Activities',
            // Certifications.csv
            'authority': 'Authority', 'issuing organization': 'Authority',
            'license number': 'License Number', 'credential id': 'License Number',
            'url': 'Url', 'credential url': 'Url',
            // Email
            'email address': 'Email Address', 'email': 'Email Address',
            // Endorsement_Received_Info.csv
            'endorsement date': 'Endorsement Date', 'skill name': 'Skill Name',
            'endorser first name': 'Endorser First Name', 'endorser last name': 'Endorser Last Name',
            'endorsement status': 'Endorsement Status',
            // Recommendations_Received.csv
            'first name': 'First Name', 'last name': 'Last Name',
            'company': 'Company', 'job title': 'Job Title', 'text': 'Text',
            'creation date': 'Creation Date', 'status': 'Status',
            // Volunteering.csv
            'role': 'Role', 'cause': 'Cause',
            // Honors.csv
            'issued on': 'Issued On',
            // Learning.csv
            'content title': 'Content Title', 'content type': 'Content Type',
            'content completed at (if completed)': 'Content Completed At',
            // Rich_Media.csv
            'media description': 'Media Description', 'media link': 'Media Link',
            'date/time': 'Date/Time',
            // Causes
            'supported cause': 'Supported Cause'
        };

        function normalizeLinkedInRow(row) {
            var normalized = {};
            Object.keys(row).forEach(function(key) {
                var trimmed = key.trim();
                // Remove BOM characters that LinkedIn sometimes includes
                trimmed = trimmed.replace(/^\uFEFF/, '');
                var lower = trimmed.toLowerCase();
                var canonical = headerMap[lower] || trimmed;
                // Don't overwrite if canonical already set (first match wins)
                if (!(canonical in normalized)) {
                    normalized[canonical] = row[key];
                }
            });
            return normalized;
        }

        for (const targetName of targetFiles) {
            // LinkedIn .zip may have files at root or in a subdirectory
            let found = null;
            zip.forEach(function(path, entry) {
                if (!entry.dir && path.endsWith(targetName)) {
                    found = entry;
                }
            });
            if (found) {
                const text = await found.async('text');
                if (typeof Papa !== 'undefined') {
                    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
                    csvFiles[targetName] = result.data.map(normalizeLinkedInRow);
                }
            }
        }

        setMsg('Mapping profile data...');

        const foundFiles = Object.keys(csvFiles);
        console.log('\u2713 LinkedIn .zip parsed. Found:', foundFiles.join(', '));

        if (foundFiles.length === 0) {
            throw new Error('No recognized LinkedIn CSV files found in this archive. Make sure you uploaded the LinkedIn data export .zip.');
        }

        // ── Map Profile.csv ──
        const profileRows = csvFiles['Profile.csv'] || [];
        const profileRow = profileRows[0] || {};
        wizardState.profile = {
            name: [profileRow['First Name'], profileRow['Last Name']].filter(Boolean).join(' '),
            currentTitle: '', // Set after parsing positions
            linkedinHeadline: profileRow['Headline'] || '',
            location: profileRow['Geo Location'] || profileRow['Location'] || '',
            email: '',
            phone: '',
            yearsExperience: 0,
            executiveSummary: profileRow['Summary'] || ''
        };

        // Get email from Email Addresses.csv
        const emailRows = csvFiles['Email Addresses.csv'] || [];
        if (emailRows.length > 0) {
            wizardState.profile.email = emailRows[0]['Email Address'] || emailRows[0]['email'] || '';
        }

        // ── Map Positions.csv (with multi-position career progression) ──
        const positionRows = csvFiles['Positions.csv'] || [];
        
        // Normalize company names for grouping (e.g. "Phenom People" → "Phenom")
        function normalizeCompanyName(name) {
            if (!name) return '';
            var n = name.trim();
            // Common suffixes/variants to strip for matching
            var stripped = n.replace(/,?\s*(LLC|Inc\.?|Corp\.?|Ltd\.?|Co\.?|People|Group|Holdings)\.?\s*$/i, '').trim();
            return stripped || n;
        }
        
        var rawPositions = positionRows.map(function(row) {
            var startStr = row['Started On'] || '';
            var endStr = row['Finished On'] || '';
            // Parse year from "Jan 2024" or "2004"
            var startYear = parseInt(startStr.split(' ').pop()) || parseInt(startStr) || 0;
            var endYear = endStr ? (parseInt(endStr.split(' ').pop()) || parseInt(endStr) || 0) : new Date().getFullYear();
            return {
                title: row['Title'] || '',
                company: row['Company Name'] || '',
                companyNorm: normalizeCompanyName(row['Company Name'] || ''),
                location: row['Location'] || '',
                description: row['Description'] || '',
                startDate: startStr,
                endDate: endStr || 'Present',
                startYear: startYear,
                endYear: endYear
            };
        }).filter(function(w) { return w.title || w.company; });
        
        // Group positions by normalized company name
        var companyGroups = {};
        rawPositions.forEach(function(pos) {
            var key = pos.companyNorm.toLowerCase();
            if (!companyGroups[key]) companyGroups[key] = { name: pos.company, positions: [] };
            companyGroups[key].positions.push(pos);
        });
        
        // Sort positions within each company by start year (earliest first)
        Object.values(companyGroups).forEach(function(group) {
            group.positions.sort(function(a, b) { return a.startYear - b.startYear; });
            // Use the most common/recent company name variant
            group.name = group.positions[group.positions.length - 1].company;
            // Calculate total tenure
            var earliest = group.positions[0].startYear;
            var latest = Math.max.apply(null, group.positions.map(function(p) { return p.endYear; }));
            group.totalYears = latest - earliest;
            group.startYear = earliest;
            group.endYear = latest;
            group.isProgression = group.positions.length > 1;
        });
        
        // Build flat work history (for existing consumers) and enriched company tenures
        wizardState.workHistory = rawPositions.map(function(pos) {
            return {
                title: pos.title,
                company: pos.company,
                location: pos.location,
                description: pos.description,
                startDate: pos.startDate,
                endDate: pos.endDate
            };
        });
        
        // Store company tenures for career progression display
        wizardState.companyTenures = Object.values(companyGroups).sort(function(a, b) {
            return b.endYear - a.endYear;  // Most recent first
        });

        // Infer years of experience from earliest position
        if (wizardState.workHistory.length > 0) {
            var mostRecent = wizardState.workHistory[0];
            wizardState.profile.currentTitle = mostRecent.title || wizardState.profile.linkedinHeadline || '';
            
            var earliest = rawPositions.reduce(function(min, w) {
                return w.startYear > 0 && w.startYear < min ? w.startYear : min;
            }, 9999);
            if (earliest < 9999) {
                wizardState.profile.yearsExperience = new Date().getFullYear() - earliest;
            }
        } else {
            wizardState.profile.currentTitle = wizardState.profile.linkedinHeadline || '';
        }

        // Build roles — for multi-position companies, create unified role with progression note
        var roleMap = {};
        var roleColors = ['#3b82f6','#fb923c','#10b981','#f59e0b','#a855f7','#ec4899','#06b6d4','#84cc16'];
        var roleIdx = 0;
        
        // Process company groups: multi-position companies get a single role with latest title
        wizardState.companyTenures.forEach(function(group) {
            if (group.isProgression) {
                // Multi-position: use latest title, note the progression
                var latest = group.positions[group.positions.length - 1];
                var key = (latest.title + '@' + group.name).toLowerCase();
                if (!roleMap[key]) {
                    var progression = group.positions.map(function(p) { return p.title; });
                    roleMap[key] = {
                        id: 'role' + (++roleIdx),
                        name: latest.title,
                        company: group.name,
                        years: group.positions[0].startDate + ' - ' + (latest.endDate || 'Present'),
                        color: roleColors[(roleIdx - 1) % roleColors.length],
                        progression: progression,
                        totalYears: group.totalYears,
                        descriptions: group.positions.map(function(p) { return p.description; }).filter(Boolean)
                    };
                }
            } else {
                // Single position at this company
                var pos = group.positions[0];
                var key = (pos.title + '@' + pos.company).toLowerCase();
                if (!roleMap[key]) {
                    roleMap[key] = {
                        id: 'role' + (++roleIdx),
                        name: pos.title,
                        company: pos.company,
                        years: pos.startDate + (pos.endDate !== 'Present' ? ' - ' + pos.endDate : ' - Present'),
                        color: roleColors[(roleIdx - 1) % roleColors.length],
                        descriptions: pos.description ? [pos.description] : []
                    };
                }
            }
        });
        var parsedRoles = Object.values(roleMap).slice(0, 8);

        // ── Map Endorsements (peer validation scores) ──
        var endorsementRows = csvFiles['Endorsement_Received_Info.csv'] || [];
        var endorsementCounts = {};
        endorsementRows.forEach(function(row) {
            var skill = (row['Skill Name'] || '').trim();
            if (skill) endorsementCounts[skill] = (endorsementCounts[skill] || 0) + 1;
        });
        wizardState.endorsements = endorsementCounts;
        var totalEndorsements = Object.values(endorsementCounts).reduce(function(s, v) { return s + v; }, 0);
        console.log('\u2713 LinkedIn endorsements:', totalEndorsements, 'across', Object.keys(endorsementCounts).length, 'skills');
        
        // ── Map Recommendations Received ──
        var recRows = csvFiles['Recommendations_Received.csv'] || [];
        wizardState.recommendations = recRows.filter(function(row) {
            return (row['Status'] || '').toUpperCase() === 'VISIBLE' && (row['Text'] || '').length > 20;
        }).map(function(row) {
            return {
                from: [row['First Name'], row['Last Name']].filter(Boolean).join(' '),
                company: row['Company'] || '',
                title: row['Job Title'] || '',
                text: row['Text'] || '',
                date: row['Creation Date'] || ''
            };
        });
        console.log('\u2713 LinkedIn recommendations:', wizardState.recommendations.length);
        
        // ── Map Volunteering ──
        var volRows = csvFiles['Volunteering.csv'] || [];
        wizardState.volunteering = volRows.map(function(row) {
            return {
                company: row['Company Name'] || '',
                role: row['Role'] || '',
                cause: row['Cause'] || '',
                description: row['Description'] || '',
                startDate: row['Started On'] || '',
                endDate: row['Finished On'] || ''
            };
        }).filter(function(v) { return v.company || v.role; });
        
        // ── Map Honors ──
        var honorsRows = csvFiles['Honors.csv'] || [];
        wizardState.honors = honorsRows.map(function(row) {
            return {
                title: row['Title'] || row['Name'] || '',
                description: row['Description'] || '',
                date: row['Issued On'] || ''
            };
        }).filter(function(h) { return h.title; });
        
        // ── Map Causes ──
        var causesRows = csvFiles['Causes You Care About.csv'] || [];
        wizardState.causes = causesRows.map(function(row) {
            return row['Supported Cause'] || Object.values(row)[0] || '';
        }).filter(Boolean);
        
        // ── Map Organizations ──
        var orgRows = csvFiles['Organizations.csv'] || [];
        wizardState.organizations = orgRows.map(function(row) {
            return {
                name: row['Name'] || '',
                position: row['Position'] || '',
                description: row['Description'] || ''
            };
        }).filter(function(o) { return o.name; });
        
        // ── Map LinkedIn Learning (completed courses) ──
        var learningRows = csvFiles['Learning.csv'] || [];
        wizardState.learning = learningRows.filter(function(row) {
            var completed = row['Content Completed At'] || '';
            return completed && completed !== 'N/A';
        }).map(function(row) {
            return {
                title: row['Content Title'] || '',
                type: row['Content Type'] || '',
                completedAt: row['Content Completed At'] || ''
            };
        });
        var totalLearning = learningRows.length;
        var completedLearning = wizardState.learning.length;
        console.log('\u2713 LinkedIn Learning:', completedLearning, 'completed /', totalLearning, 'total courses');
        
        // ── Map Rich Media (posts/content) ──
        var mediaRows = csvFiles['Rich_Media.csv'] || [];
        wizardState.richMedia = mediaRows.filter(function(row) {
            var desc = row['Media Description'] || '';
            return desc.length > 100;  // Only substantial posts
        }).map(function(row) {
            return {
                date: row['Date/Time'] || '',
                content: row['Media Description'] || '',
                link: row['Media Link'] || ''
            };
        });
        console.log('\u2713 LinkedIn posts:', wizardState.richMedia.length, 'substantial');
        
        // ── Extract Articles from .html files in Articles/ folder ──
        wizardState.articles = [];
        zip.forEach(function(path, entry) {
            if (!entry.dir && path.toLowerCase().includes('article') && path.endsWith('.html')) {
                wizardState._articleEntries = wizardState._articleEntries || [];
                wizardState._articleEntries.push(entry);
            }
        });
        if (wizardState._articleEntries && wizardState._articleEntries.length > 0) {
            for (var ae of wizardState._articleEntries) {
                try {
                    var artHtml = await ae.async('text');
                    var titleMatch = artHtml.match(/<title>(.*?)<\/title>/i);
                    var createdMatch = artHtml.match(/Created on ([\d-]+)/);
                    // Strip HTML to get plain text
                    var artText = artHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    // Extract body content only (between <body> and </body>)
                    var bodyMatch = artHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                    var bodyText = bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : artText;
                    
                    wizardState.articles.push({
                        title: titleMatch ? titleMatch[1].trim() : 'Untitled',
                        created: createdMatch ? createdMatch[1] : '',
                        wordCount: bodyText.split(/\s+/).length,
                        text: bodyText.substring(0, 2000)  // First 2000 chars for analysis
                    });
                } catch(e) { /* skip unparseable articles */ }
            }
            delete wizardState._articleEntries;
            console.log('\u2713 LinkedIn articles:', wizardState.articles.length);
        }
        
        // ── Network size ──
        var connRows = csvFiles['Connections.csv'] || [];
        wizardState.networkSize = connRows.length;
        
        // ── Summary stats for import report ──
        wizardState.importStats = {
            positions: rawPositions.length,
            companies: Object.keys(companyGroups).length,
            progressions: Object.values(companyGroups).filter(function(g) { return g.isProgression; }).length,
            skills: (csvFiles['Skills.csv'] || []).length,
            endorsements: totalEndorsements,
            endorsedSkills: Object.keys(endorsementCounts).length,
            recommendations: wizardState.recommendations.length,
            articles: wizardState.articles ? wizardState.articles.length : 0,
            posts: wizardState.richMedia ? wizardState.richMedia.length : 0,
            learning: totalLearning,
            learningCompleted: completedLearning,
            volunteering: wizardState.volunteering ? wizardState.volunteering.length : 0,
            honors: wizardState.honors ? wizardState.honors.length : 0,
            causes: wizardState.causes ? wizardState.causes.length : 0,
            network: wizardState.networkSize
        };

        // ── Map Skills.csv ──
        const skillRows = csvFiles['Skills.csv'] || [];
        var rawSkills = skillRows.map(function(row) {
            return (row['Name'] || row['Skill'] || row['name'] || Object.values(row)[0] || '').trim();
        }).filter(Boolean);

        // ── Map Education.csv ──
        const eduRows = csvFiles['Education.csv'] || [];
        wizardState.education = eduRows.map(function(row) {
            return {
                school: row['School Name'] || '',
                degree: row['Degree Name'] || '',
                field: row['Field Of Study'] || row['Notes'] || '',
                startDate: row['Start Date'] || row['Started On'] || '',
                endDate: row['End Date'] || row['Finished On'] || '',
                activities: row['Activities'] || ''
            };
        }).filter(function(e) { return e.school; });

        // ── Map Certifications.csv ──
        const certRows = csvFiles['Certifications.csv'] || [];
        wizardState.certifications = certRows.map(function(row) {
            return {
                name: row['Name'] || '',
                authority: row['Authority'] || '',
                licenseNumber: row['License Number'] || '',
                startDate: row['Started On'] || '',
                endDate: row['Finished On'] || '',
                url: row['Url'] || ''
            };
        }).filter(function(c) { return c.name; });

        setMsg('Analyzing skills against O*NET data...');

        // ── Deterministic skill inference via O*NET crosswalk ──
        var SKILL_CAP = 30;
        var inferredSkills = inferSkillsDeterministic(rawSkills, wizardState.workHistory, parsedRoles, SKILL_CAP);
        
        // ── Boost skill levels using endorsement peer validation ──
        if (Object.keys(endorsementCounts).length > 0) {
            var levelOrder = ['Novice', 'Proficient', 'Advanced', 'Expert', 'Mastery'];
            inferredSkills.forEach(function(skill) {
                // Find endorsements matching this skill (case-insensitive partial match)
                var skillLower = skill.name.toLowerCase();
                var endorseCount = 0;
                Object.keys(endorsementCounts).forEach(function(eName) {
                    if (eName.toLowerCase() === skillLower || 
                        skillLower.indexOf(eName.toLowerCase()) >= 0 ||
                        eName.toLowerCase().indexOf(skillLower) >= 0) {
                        endorseCount += endorsementCounts[eName];
                    }
                });
                if (endorseCount > 0) {
                    skill.endorsements = endorseCount;
                    // Boost: 10+ endorsements = +1 level, 25+ = +2 levels (capped at Mastery)
                    var currentIdx = levelOrder.indexOf(skill.level);
                    if (currentIdx >= 0) {
                        var boost = endorseCount >= 25 ? 2 : endorseCount >= 10 ? 1 : 0;
                        var newIdx = Math.min(currentIdx + boost, levelOrder.length - 1);
                        if (newIdx > currentIdx) {
                            skill.level = levelOrder[newIdx];
                            skill.endorsementBoosted = true;
                        }
                    }
                }
            });
            var boosted = inferredSkills.filter(function(s) { return s.endorsementBoosted; }).length;
            if (boosted > 0) console.log('\u2713 Endorsement-boosted skills:', boosted);
        }

        wizardState.skills = inferredSkills;
        wizardState.parsedData = {
            profile: wizardState.profile,
            roles: parsedRoles,
            skills: inferredSkills,
            values: [],
            purpose: '',
            companyTenures: wizardState.companyTenures || [],
            endorsements: wizardState.endorsements || {},
            recommendations: wizardState.recommendations || [],
            volunteering: wizardState.volunteering || [],
            honors: wizardState.honors || [],
            causes: wizardState.causes || [],
            organizations: wizardState.organizations || [],
            articles: wizardState.articles || [],
            richMedia: wizardState.richMedia || [],
            learning: wizardState.learning || [],
            networkSize: wizardState.networkSize || 0,
            importStats: wizardState.importStats || {}
        };

        setMsg('Done! \u2713');
        await new Promise(function(r) { setTimeout(r, 400); });

        // Show import summary before proceeding
        var stats = wizardState.importStats;
        var summaryLines = [];
        summaryLines.push(stats.positions + ' positions across ' + stats.companies + ' companies');
        if (stats.progressions > 0) summaryLines.push(stats.progressions + ' career progression' + (stats.progressions > 1 ? 's' : '') + ' detected');
        if (stats.endorsements > 0) summaryLines.push(stats.endorsements + ' endorsements across ' + stats.endorsedSkills + ' skills');
        if (stats.recommendations > 0) summaryLines.push(stats.recommendations + ' recommendations');
        if (stats.articles > 0) summaryLines.push(stats.articles + ' published articles');
        if (stats.posts > 0) summaryLines.push(stats.posts + ' LinkedIn posts');
        if (stats.learning > 0) summaryLines.push(stats.learningCompleted + '/' + stats.learning + ' courses completed');
        if (stats.volunteering > 0) summaryLines.push(stats.volunteering + ' volunteer roles');
        if (stats.honors > 0) summaryLines.push(stats.honors + ' honor' + (stats.honors > 1 ? 's' : ''));
        if (stats.causes > 0) summaryLines.push(stats.causes + ' causes');
        if (stats.network > 0) summaryLines.push(stats.network.toLocaleString() + ' connections');
        
        if (status) {
            var optionalContent = '';
            if (stats.articles > 0 || stats.posts > 0 || stats.learning > 0) {
                optionalContent = '<div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border);">'
                    + '<div style="font-size:0.78em; color:var(--c-muted); margin-bottom:6px; font-weight:600;">Optional content to include:</div>';
                if (stats.articles > 0) {
                    optionalContent += '<label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer;">'
                        + '<input type="checkbox" id="wiz-opt-articles" checked style="accent-color:var(--accent);">'
                        + '<span style="font-size:0.82em; color:var(--text-secondary);">\uD83D\uDCF0 ' + stats.articles + ' articles</span></label>';
                }
                if (stats.posts > 0) {
                    optionalContent += '<label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer;">'
                        + '<input type="checkbox" id="wiz-opt-posts" checked style="accent-color:var(--accent);">'
                        + '<span style="font-size:0.82em; color:var(--text-secondary);">\uD83D\uDCAC ' + stats.posts + ' posts</span></label>';
                }
                if (stats.learning > 0) {
                    optionalContent += '<label style="display:flex; align-items:center; gap:6px; margin-bottom:4px; cursor:pointer;">'
                        + '<input type="checkbox" id="wiz-opt-learning" checked style="accent-color:var(--accent);">'
                        + '<span style="font-size:0.82em; color:var(--text-secondary);">\uD83D\uDCDA ' + stats.learningCompleted + '/' + stats.learning + ' courses</span></label>';
                }
                optionalContent += '</div>';
            }
            
            status.innerHTML = '<div style="text-align:left; max-width:400px; margin:0 auto;">'
                + '<div style="font-size:1.1em; font-weight:700; color:var(--text-primary); margin-bottom:12px;">'
                + bpIcon('check', 18) + ' Import Complete</div>'
                + '<div style="display:flex; flex-direction:column; gap:4px;">'
                + summaryLines.map(function(line) {
                    return '<div style="font-size:0.82em; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">'
                        + '<span style="width:5px; height:5px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>' + line + '</div>';
                }).join('')
                + '</div>'
                + optionalContent
                + '<button onclick="wizardApplyContentOpts(); wizardState.step=4; renderWizardStep();" style="margin-top:16px; padding:10px 24px; '
                + 'background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; '
                + 'font-weight:600; font-size:0.9em; width:100%;">Continue to Profile Review \u2192</button>'
                + '</div>';
        }
        
        return;  // Don't auto-advance; let user click through after seeing summary

    } catch(err) {
        console.error('LinkedIn .zip parse error:', err);
        logIncident('critical', 'linkedin-import', 'LinkedIn import failed: ' + err.message, { rawError: err.message });
        if (dropZone) dropZone.style.display = 'block';
        if (status) status.style.display = 'none';
        showToast('Import error: ' + err.message, 'error', 6000);
    }
}

// ── STEP 3: AI Parsing ────────────────────────────────────────────────

export function renderWizardStep3(el) {
    el.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center;
                    justify-content:center; min-height:320px; text-align:center; gap:24px;">
            <div id="wizardParsingIcon" style="animation:spin 2s linear infinite;">${bpIcon("settings",48)}</div>
            <div>
                <h2 style="color:var(--text-primary); font-size:1.4em; margin-bottom:10px;">
                    Claude is reading your resume
                </h2>
                <p id="wizardParsingStatus" style="color:var(--text-secondary); font-size:0.9em;">
                    Extracting skills, evidence, and outcomes...
                </p>
            </div>
            <div style="width:280px; height:4px; background:var(--border); border-radius:4px; overflow:hidden;">
                <div id="wizardParseProgress" style="height:100%; width:0%;
                            background:linear-gradient(90deg,var(--accent),#818cf8);
                            border-radius:4px; transition:width 0.5s ease;"></div>
            </div>
            <p style="color:var(--text-muted); font-size:0.8em;">Usually takes 10–20 seconds</p>
        </div>
    `;
}

async function wizardRunParsing() {
    const setStatus = (msg, pct) => {
        const s = document.getElementById('wizardParsingStatus');
        const p = document.getElementById('wizardParseProgress');
        if (s) s.textContent = msg;
        if (p) p.style.width = pct + '%';
    };

    try {
        logAnalyticsEvent('resume_parse', {});
        setStatus('Sending to Claude...', 15);

        var wizardApiKey = safeGet('wbAnthropicKey');
        if (!wizardApiKey && !(typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)) {
            setStatus('', 0);
            var icon = document.getElementById('wizardParsingIcon');
            if (icon) icon.style.animation = 'none';
            showToast('Sign in or add an Anthropic API key in Settings to use AI parsing.', 'warning', 6000);
            return;
        }

        const systemPrompt = `You are a professional career analyst. Extract structured profile data from a resume or LinkedIn profile text.

Return ONLY valid JSON in this exact shape — no markdown, no explanation, just the JSON object:
{
  "profile": {
    "name": "Full Name",
    "currentTitle": "Current Job Title",
    "location": "City, State or Remote",
    "email": "",
    "phone": "",
    "yearsExperience": 10,
    "executiveSummary": "2-3 sentence professional summary in first person"
  },
  "roles": [
    { "id": "role1", "name": "Role Name", "years": "2019-Present", "company": "Company Name" }
  ],
  "skills": [
    {
      "name": "Skill Name",
      "level": "Mastery|Expert|Advanced|Proficient|Novice",
      "category": "skill|ability|workstyle|unique",
      "roles": ["role1"],
      "key": true,
      "evidence": [
{ "description": "What you did", "outcome": "Measurable result or impact" }
      ]
    }
  ],
  "values": [
    { "name": "Value Name", "description": "Brief personal description of this value", "selected": true }
  ],
  "purpose": "One paragraph purpose statement in first person — what you do, who you help, how you do it differently"
}

Rules:
- Extract 15-40 skills. Include technical skills, soft skills, leadership abilities, and unique differentiators.
- Level guide: Mastery=career-defining expertise (15+ yrs), Expert=deep proficiency (8-15 yrs), Advanced=strong competency (4-8 yrs), Proficient=solid (1-4 yrs), Novice=learning.
- For each skill, extract 1-3 evidence items from the resume. Outcomes must be specific — include numbers, percentages, dollar amounts wherever present in the text.
- Infer 4-6 values from the resume's tone, achievements, and career pattern. Make them personal, not generic.
- Write the purpose statement to be compelling and authentic to this person's actual experience.
- category="unique" for skills not in standard O*NET taxonomy (industry-specific, rare combinations).`;

        // Build message content: PDF document or plain text
        var userContent;
        if (wizardState.useFileUpload && wizardState.resumeFileBase64) {
            userContent = [
                {
                    type: 'document',
                    source: {
                        type: 'base64',
                        media_type: 'application/pdf',
                        data: wizardState.resumeFileBase64
                    }
                },
                { type: 'text', text: 'Parse this resume PDF and extract structured profile data.' }
            ];
        } else {
            userContent = 'Parse this resume:\n\n' + wizardState.resumeText;
        }

        var data = await callAnthropicAPI({
                model: BP_AI_MODEL,
                max_tokens: 4000,
                system: systemPrompt,
                messages: [{ role: 'user', content: userContent }]
            }, wizardApiKey, 'resume-parse');
        setStatus('Structuring your profile data...', 55);
        const rawText = data.content[0]?.text || '';

        setStatus('Extracting skills and evidence...', 75);

        // Strip markdown fences if present
        const clean = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(clean);

        setStatus('Building your Blueprint...', 95);

        wizardState.parsedData = parsed;
        wizardState.profile = parsed.profile || {};
        wizardState.skills = parsed.skills || [];
        wizardState.values = (parsed.values || []).map(v => ({ ...v, selected: v.selected !== false }));
        wizardState.purpose = parsed.purpose || '';

        await new Promise(r => setTimeout(r, 600));
        setStatus('Done! ✓', 100);
        await new Promise(r => setTimeout(r, 400));

        wizardState.step = 4;
        renderWizardStep();

    } catch (err) {
        console.error('Parsing error:', err);
        const el = document.getElementById('wizardParsingIcon');
        if (el) el.style.animation = 'none';
        const status = document.getElementById('wizardParsingStatus');
        if (status) status.innerHTML = `
            <span style="color:var(--danger);">
                Parsing failed: ${escapeHtml(err.message)}<br><br>
            </span>
            <button onclick="wizardState.step=2; renderWizardStep();"
                    style="background:var(--accent); color:#fff; border:none; padding:9px 20px;
                           border-radius:7px; cursor:pointer; font-size:0.85em; margin-right:10px;">
                ← Try Again
            </button>
            <button onclick="wizardSkipParsing()"
                    style="background:var(--input-bg); color:var(--text-primary); border:1px solid var(--border);
                           padding:9px 20px; border-radius:7px; cursor:pointer; font-size:0.85em;">
                Enter Manually
            </button>
        `;
    }
}

// ── STEP 4: Profile review ─────────────────────────────────────────────

export function renderWizardStep4(el) {
    const p = wizardState.profile;
    const isFromResume = !!wizardState.parsedData;

    el.innerHTML = `
        ${wizardHeading(isFromResume ? bpIcon('check',22) : bpIcon('profile',22), 
            isFromResume ? 'Review Your Profile' : 'Your Profile',
            isFromResume ? 'Claude extracted this from your resume. Review and correct anything that’s off.' 
                         : 'Fill in your basic information to get started.')}

        <div style="background:var(--bg-elevated); border:1px solid var(--border);
                    border-radius:14px; padding:24px; margin-bottom:20px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                ${wizardField('Full Name', 'wizardName', p.name || '', 'e.g. Alex Johnson')}
                ${wizardField('Current Title', 'wizardTitle', p.currentTitle || '', 'e.g. VP of Engineering')}
                ${wizardField('Location', 'wizardLocation', p.location || '', 'e.g. Austin, TX / Remote')}
                ${wizardField('Email', 'wizardEmail', p.email || '', 'your@email.com')}
                ${wizardField('Years of Experience', 'wizardYears', p.yearsExperience || '', 'e.g. 15')}
                ${wizardField('Phone (optional)', 'wizardPhone', p.phone || '', '')}
                ${wizardField('Total Compensation (optional)', 'wizardComp', p.reportedComp ? Math.round(p.reportedComp).toLocaleString() : '', 'e.g. 350,000')}
            </div>
            <div style="margin-top:16px;">
                <label style="display:block; font-size:0.82em; font-weight:600;
                              color:var(--text-secondary); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em;">
                    Professional Summary
                </label>
                <textarea id="wizardSummary" placeholder="A 2-3 sentence summary of who you are professionally..."
                          style="width:100%; min-height:100px; background:var(--input-bg);
                                 border:1px solid var(--border); border-radius:8px; padding:12px;
                                 color:var(--text-primary); font-size:0.9em; line-height:1.6;
                                 font-family:inherit; resize:vertical; outline:none;"
                          onfocus="this.style.borderColor='var(--accent)'"
                          onblur="this.style.borderColor='var(--border)'">${escapeHtml(p.executiveSummary || '')}</textarea>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between;">
            ${wizardBtn('← Back', wizardState.entryMode === 'manual' ? 'wizardBack()' : 'wizardBack()', 'ghost')}
            ${wizardBtn('Continue → Occupation Match', 'wizardSaveProfile()', 'primary')}
        </div>
    `;
}

export function wizardField(label, id, value, placeholder) {
    return `<div>
        <label style="display:block; font-size:0.82em; font-weight:600;
                      color:var(--text-secondary); margin-bottom:6px;
                      text-transform:uppercase; letter-spacing:0.04em;">
            ${label}
        </label>
        <input id="${id}" type="text" value="${escapeHtml(String(value ?? ''))}"
               placeholder="${placeholder}"
               style="width:100%; padding:10px 12px; background:var(--input-bg);
                      border:1px solid var(--border); border-radius:8px;
                      color:var(--text-primary); font-size:0.9em; outline:none;
                      transition:border-color 0.2s; font-family:inherit;"
               onfocus="this.style.borderColor='var(--accent)'"
               onblur="this.style.borderColor='var(--border)'">
    </div>`;
}

export function wizardSaveProfile() {
    if (readOnlyGuard()) return;
    wizardState.profile = {
        name: document.getElementById('wizardName')?.value?.trim() || '',
        currentTitle: document.getElementById('wizardTitle')?.value?.trim() || '',
        location: document.getElementById('wizardLocation')?.value?.trim() || '',
        email: document.getElementById('wizardEmail')?.value?.trim() || '',
        phone: document.getElementById('wizardPhone')?.value?.trim() || '',
        yearsExperience: parseInt(document.getElementById('wizardYears')?.value) || 0,
        executiveSummary: document.getElementById('wizardSummary')?.value?.trim() || '',
        reportedComp: parseInt((document.getElementById('wizardComp')?.value || '').replace(/[^0-9]/g, ''), 10) || null
    };

    if (!wizardState.profile.name) {
        showToast('Please enter your name to continue.', 'warning');
        document.getElementById('wizardName')?.focus();
        return;
    }
    wizardNext();
}

// ── STEP 5: O*NET Occupation Enrichment ─────────────────────────────

export function renderWizardStep5(el) {
    // If crosswalk not loaded, skip enrichment
    if (!window.onetCrosswalk) {
        el.innerHTML = `
            ${wizardHeading(bpIcon('compass',22), 'Skill Enrichment',
                'O*NET crosswalk data is loading. You can continue and add skills manually.')}
            <div style="background:var(--bg-elevated); border:2px dashed var(--border);
                        border-radius:14px; padding:32px; text-align:center; margin-bottom:20px;">
                <p style="color:var(--text-secondary);">Occupation matching is not available right now. Continuing to skill review.</p>
            </div>
            <div style="display:flex; justify-content:space-between;">
                ${wizardBtn('← Back', 'wizardBack()', 'ghost')}
                ${wizardBtn('Continue → Skills', 'wizardNext()', 'primary')}
            </div>
        `;
        return;
    }

    // Gather titles to resolve
    var titles = [];
    var currentTitle = (wizardState.profile.currentTitle || '').trim();
    if (currentTitle) {
        titles.push({ label: currentTitle, source: 'current' });
    }
    var roles = (wizardState.parsedData && wizardState.parsedData.roles) ? wizardState.parsedData.roles : [];
    roles.forEach(function(r) {
        var rName = (r.name || '').trim();
        if (rName && rName.toLowerCase() !== currentTitle.toLowerCase()) {
            titles.push({ label: rName, source: 'history', company: r.company || '', years: r.years || '' });
        }
    });

    // Resolve all titles
    var resolutions = [];
    var seenSocs = {};
    titles.forEach(function(t) {
        var result = resolveTitle(t.label);
        if (result && !seenSocs[result.soc]) {
            seenSocs[result.soc] = true;
            resolutions.push({
                inputTitle: t.label,
                source: t.source,
                company: t.company || '',
                years: t.years || '',
                soc: result.soc,
                occTitle: result.title,
                family: result.family,
                confidence: result.confidence,
                alternatives: result.alternatives || []
            });
        }
    });

    // Run gap analysis for primary occupation (highest confidence current title, or first match)
    var primaryRes = resolutions.find(function(r) { return r.source === 'current'; }) || resolutions[0];
    var gapResult = null;
    var gapSkills = [];
    if (primaryRes) {
        gapResult = suggestMissingSkills(wizardState.skills, primaryRes.soc);
        if (gapResult) {
            // Filter to meaningful gaps (importance > 40, not already in user skills)
            gapSkills = gapResult.gaps.filter(function(g) {
                return (g.importance || 0) >= 40;
            }).slice(0, 20);
        }
    }

    // Store enrichment state for the save function
    wizardState.enrichment = {
        resolutions: resolutions,
        primarySoc: primaryRes ? primaryRes.soc : null,
        gapResult: gapResult,
        gapSkills: gapSkills
    };

    var confidenceColor = function(c) {
        if (c >= 0.9) return '#10b981';
        if (c >= 0.7) return '#f59e0b';
        return '#f97316';
    };

    var categoryIcon = function(cat) {
        if (cat === 'skill') return '\u{1F3AF}';
        if (cat === 'ability') return '\u26A1';
        if (cat === 'knowledge') return '\u{1F4DA}';
        if (cat === 'workstyle') return '\u{1F9E0}';
        return '\u{1F4A1}';
    };

    el.innerHTML = `
        ${wizardHeading(bpIcon('target',22), 'Occupation Match & Skill Enrichment',
            resolutions.length > 0
                ? 'We matched your roles to O*NET occupations and found skills you may want to add.'
                : 'No role titles could be matched. Continue to review your skills.')}

        ${resolutions.length > 0 ? `
        <div style="background:var(--bg-elevated); border:1px solid var(--border);
                    border-radius:14px; padding:20px; margin-bottom:20px;">
            <div style="font-weight:700; color:var(--text-primary); margin-bottom:14px; font-size:0.92em;">
                Occupation Matches
            </div>
            ${resolutions.map(function(r) {
                return '<div style="display:flex; align-items:center; gap:12px; padding:10px 0;'
                    + 'border-bottom:1px solid var(--border);">'
                    + '<div style="flex:1; min-width:0;">'
                    + '<div style="font-weight:600; color:var(--text-primary); font-size:0.9em;">'
                    + escapeHtml(r.inputTitle)
                    + (r.company ? ' <span style="color:var(--text-muted); font-weight:400;">at ' + escapeHtml(r.company) + '</span>' : '')
                    + '</div>'
                    + '<div style="font-size:0.8em; color:var(--text-secondary); margin-top:2px;">'
                    + '\u2192 ' + escapeHtml(r.occTitle) + ' <span style="color:var(--text-muted);">(' + r.soc + ')</span>'
                    + '</div>'
                    + '</div>'
                    + '<div style="display:flex; align-items:center; gap:6px;">'
                    + '<div style="width:8px; height:8px; border-radius:50%; background:' + confidenceColor(r.confidence) + ';"></div>'
                    + '<span style="font-size:0.78em; color:var(--text-secondary);">' + Math.round(r.confidence * 100) + '%</span>'
                    + '</div>'
                    + '</div>';
            }).join('')}
        </div>
        ` : ''}

        ${gapSkills.length > 0 ? `
        <div style="background:var(--bg-elevated); border:1px solid var(--border);
                    border-radius:14px; padding:20px; margin-bottom:20px;">
            <div style="font-weight:700; color:var(--text-primary); margin-bottom:4px; font-size:0.92em;">
                Suggested Skills from O*NET
            </div>
            <p style="font-size:0.82em; color:var(--text-muted); margin-bottom:14px;">
                Based on ${escapeHtml(primaryRes.occTitle)}, these skills are typical for the role but missing from your profile. Check the ones you want to add.
            </p>
            <div style="max-height:340px; overflow-y:auto;">
                ${gapSkills.map(function(g, i) {
                    return '<div style="display:flex; align-items:center; gap:12px; padding:8px 0;'
                        + 'border-bottom:1px solid var(--border);">'
                        + '<input type="checkbox" id="enrich-skill-' + i + '"'
                        + ' style="width:16px; height:16px; cursor:pointer; accent-color:var(--accent); flex-shrink:0;">'
                        + '<span style="font-size:0.85em; flex-shrink:0;">' + categoryIcon(g.category) + '</span>'
                        + '<div style="flex:1; min-width:0;">'
                        + '<div style="font-weight:600; color:var(--text-primary); font-size:0.88em;">'
                        + escapeHtml(g.name) + '</div>'
                        + '<div style="font-size:0.76em; color:var(--text-muted);">'
                        + (g.category || 'skill') + ' \u00B7 ' + (g.occupationLevel || 'Proficient')
                        + '</div></div></div>';
                }).join('')}
            </div>
        </div>

        ${gapResult ? `
        <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
            <div style="flex:1; min-width:120px; background:var(--bg-elevated); border:1px solid var(--border);
                        border-radius:10px; padding:14px; text-align:center;">
                <div style="font-size:1.5em; font-weight:800; color:var(--accent);">${gapResult.matchPercent}%</div>
                <div style="font-size:0.78em; color:var(--text-muted);">Profile Match</div>
            </div>
            <div style="flex:1; min-width:120px; background:var(--bg-elevated); border:1px solid var(--border);
                        border-radius:10px; padding:14px; text-align:center;">
                <div style="font-size:1.5em; font-weight:800; color:#10b981;">${gapResult.matched.length}</div>
                <div style="font-size:0.78em; color:var(--text-muted);">Skills Matched</div>
            </div>
            <div style="flex:1; min-width:120px; background:var(--bg-elevated); border:1px solid var(--border);
                        border-radius:10px; padding:14px; text-align:center;">
                <div style="font-size:1.5em; font-weight:800; color:#f59e0b;">${gapSkills.length}</div>
                <div style="font-size:0.78em; color:var(--text-muted);">Gaps Found</div>
            </div>
        </div>
        ` : ''}
        ` : `
        <div style="background:var(--bg-elevated); border:2px dashed var(--border);
                    border-radius:14px; padding:32px; text-align:center; margin-bottom:20px;">
            <p style="color:var(--text-secondary);">
                No skill gaps identified. Your existing skills cover the matched occupation profile well.
            </p>
        </div>
        `}

        <div style="display:flex; justify-content:space-between;">
            ${wizardBtn('\u2190 Back', 'wizardBack()', 'ghost')}
            ${wizardBtn('Continue \u2192 Skills', 'wizardSaveEnrichment()', 'primary')}
        </div>
    `;
}

export function wizardSaveEnrichment() {
    if (readOnlyGuard()) return;
    var enrichment = wizardState.enrichment;
    if (!enrichment || !enrichment.gapSkills) {
        wizardNext();
        return;
    }

    // Collect checked gap skills
    var addedCount = 0;
    enrichment.gapSkills.forEach(function(g, i) {
        var cb = document.getElementById('enrich-skill-' + i);
        if (cb && cb.checked) {
            // Map O*NET level to Blueprint level
            var levelMap = { 'Mastery': 'Mastery', 'Expert': 'Expert', 'Advanced': 'Advanced', 'Proficient': 'Proficient', 'Novice': 'Novice' };
            var level = levelMap[g.occupationLevel] || 'Proficient';

            wizardState.skills.push({
                name: g.name,
                level: level,
                category: g.category || 'skill',
                roles: [],
                key: false,
                evidence: [],
                onetId: g.elementId || null,
                sources: ['onet-enrichment:' + new Date().toISOString().substring(0, 10)]
            });
            addedCount++;
        }
    });

    if (addedCount > 0) {
        showToast(addedCount + ' skill' + (addedCount > 1 ? 's' : '') + ' added from O*NET enrichment.', 'success');
    }

    wizardNext();
}

// ── STEP 6: Skills review ──────────────────────────────────────────────

export function renderWizardStep6(el) {
    const skills = wizardState.skills;
    const isFromResume = skills.length > 0;
    const levelColors = { Mastery:'#10b981', Expert:'#fb923c', Advanced:'#a78bfa', Proficient:'#60a5fa', Novice:'#94a3b8' };

    el.innerHTML = `
        ${wizardHeading(bpIcon('compass',22),
            isFromResume ? `${skills.length} Skills Extracted` : 'Your Skills',
            isFromResume ? 'Claude identified these from your resume. Toggle any off you do not want to include. You can add more later.'
                         : 'Add your key skills. You can build this out further after setup.')}

        ${isFromResume ? `
        <div style="background:var(--bg-elevated); border:1px solid var(--border);
                    border-radius:14px; padding:20px; margin-bottom:20px; max-height:420px; overflow-y:auto;">
            ${skills.map((s, i) => `
                <div style="display:flex; align-items:center; gap:12px; padding:10px 0;
                            border-bottom:1px solid var(--border);">
                    <input type="checkbox" id="skill-check-${i}" checked
                           style="width:16px; height:16px; cursor:pointer; accent-color:var(--accent);">
                    <div style="width:10px; height:10px; border-radius:50%; flex-shrink:0;
                                background:${levelColors[s.level] || '#6b7280'};"></div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:600; color:var(--text-primary); font-size:0.9em;">
                            ${escapeHtml(s.name)}
                        </div>
                        <div style="font-size:0.78em; color:var(--text-muted);">
                            ${escapeHtml(s.level)} · ${s.evidence?.length || 0} evidence items
                        </div>
                    </div>
                    <span style="font-size:0.75em; padding:3px 9px; border-radius:10px;
                                 background:var(--chip-bg); color:var(--text-secondary);">
                        ${escapeHtml(s.level)}
                    </span>
                </div>
            `).join('')}
        </div>
        <p style="font-size:0.82em; color:var(--text-muted); margin-bottom:20px;">
            Uncheck skills you want to exclude. You can add, edit, and add evidence to all skills after setup.
        </p>
        ` : `
        <div style="background:var(--bg-elevated); border:2px dashed var(--border);
                    border-radius:14px; padding:32px; text-align:center; margin-bottom:20px;">
            <p style="color:var(--text-secondary); margin-bottom:16px;">
                Skills are best built from your resume. You can add them manually in the Skills tab after setup.
            </p>
            <p style="color:var(--text-muted); font-size:0.85em;">
                The system includes 90+ O*NET standard skills you can browse and add.
            </p>
        </div>
        `}

        <div style="display:flex; justify-content:space-between;">
            ${wizardBtn('← Back', 'wizardBack()', 'ghost')}
            ${wizardBtn('Continue → Values', 'wizardSaveSkills()', 'primary')}
        </div>
    `;
}

export function wizardSaveSkills() {
    if (readOnlyGuard()) return;
    // Filter to only checked skills
    wizardState.skills = wizardState.skills.filter((s, i) => {
        const cb = document.getElementById(`skill-check-${i}`);
        return !cb || cb.checked;
    });
    wizardNext();
}

// ── STEP 7: Values ────────────────────────────────────────────────────

export function renderWizardStep7(el) {
    var hasAIValues = wizardState.values.length > 0 && wizardState.values.some(function(v) { return v._fromAI; });
    if (wizardState.values.length === 0) {
        wizardState.values = [
            { name: 'Intellectual Integrity', description: 'Evidence-based decisions. Challenge assumptions before accepting conclusions.', selected: false },
            { name: 'Outcome-Focused', description: 'Judge by impact delivered, not activity performed.', selected: false },
            { name: 'Continuous Learning', description: 'Seek disconfirming evidence. Update beliefs when data changes.', selected: false },
            { name: 'Authentic Leadership', description: 'Lead with transparency and truth, especially when it costs something.', selected: false },
            { name: 'Customer-Centric', description: 'Solve real problems. Understand needs before building solutions.', selected: false },
            { name: 'Innovation', description: 'Find better ways. Challenge the status quo with purpose, not novelty.', selected: false },
            { name: 'Collaboration', description: 'Build with others. Shared ownership creates better outcomes than solo brilliance.', selected: false },
            { name: 'Accountability', description: 'Own the result, not just the effort. Follow through without being chased.', selected: false },
            { name: 'Craftsmanship', description: 'Sweat the details. Quality compounds over time in ways shortcuts never do.', selected: false },
            { name: 'Mentorship', description: 'Invest in the people around you. The best legacy is who you helped grow.', selected: false },
            { name: 'Resilience', description: 'Stay steady under pressure. Adversity reveals character, not just capability.', selected: false },
            { name: 'Strategic Thinking', description: 'See the system, not just the task. Connect decisions to outcomes two moves ahead.', selected: false },
            { name: 'Empathy', description: 'Understand before prescribing. Context changes everything about the right answer.', selected: false },
            { name: 'Service Orientation', description: 'Lead by serving others first. The work matters more than the credit.', selected: false }
        ];
    }
    var vals = wizardState.values;
    var selectedCount = vals.filter(function(v) { return v.selected; }).length;

    var subtitle = hasAIValues
        ? 'Claude suggested these from your career history. Select the ones that resonate, edit descriptions, or add your own.'
        : 'Select the values that define how you work, or add your own. Click a description to edit it.';

    el.innerHTML = `
        ${wizardHeading(bpIcon('lightbulb',16), 'Your Professional Values', subtitle)}

        <div id="valuesGrid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; max-height:400px; overflow-y:auto; padding:2px;">
            ${vals.map(function(v, i) {
                var sel = v.selected;
                return '<div onclick="wizardToggleValue(' + i + ')" id="val-card-' + i + '"'
                    + ' data-selected="' + (sel ? '1' : '0') + '"'
                    + ' style="background:' + (sel ? 'rgba(59,130,246,0.08)' : 'var(--bg-elevated, #1e293b)') + ';'
                    + ' border:2px solid ' + (sel ? 'var(--accent, #3b82f6)' : 'var(--border, #334155)') + ';'
                    + ' border-radius:10px; padding:12px; cursor:pointer; transition:border-color 0.18s, background 0.18s;'
                    + ' position:relative; overflow:hidden;">'
                    + '<div style="display:flex; align-items:start; gap:10px; position:relative; z-index:1;">'
                    + '<div style="width:18px; height:18px; border-radius:4px; flex-shrink:0; margin-top:2px;'
                    + ' background:' + (sel ? 'var(--accent, #3b82f6)' : 'var(--input-bg, #0f172a)') + ';'
                    + ' border:2px solid ' + (sel ? 'var(--accent, #3b82f6)' : 'var(--border, #334155)') + ';'
                    + ' display:flex; align-items:center; justify-content:center;'
                    + ' color:#fff; font-size:11px; line-height:1;">'
                    + (sel ? '\u2713' : '')
                    + '</div>'
                    + '<div style="flex:1; min-width:0;">'
                    + '<div style="font-weight:700; color:var(--text-primary, #e2e8f0); font-size:0.86em; margin-bottom:3px;">'
                    + escapeHtml(v.name) + '</div>'
                    + '<div onclick="event.stopPropagation(); wizardEditValueDesc(' + i + ', this)" '
                    + 'style="font-size:0.76em; color:var(--text-secondary, #94a3b8); line-height:1.4; cursor:text;" '
                    + 'title="Click to edit">'
                    + escapeHtml(v.description || '') + '</div>'
                    + '</div></div></div>';
            }).join('')}
        </div>

        <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:10px;
                    padding:14px; margin-bottom:20px;">
            <div style="font-size:0.82em; font-weight:600; color:var(--text-secondary); margin-bottom:8px;">
                Add a Custom Value
            </div>
            <div style="display:flex; gap:8px;">
                <input id="wizardCustomValueName" type="text" placeholder="Value name (e.g. Radical Candor)"
                       style="flex:1; padding:8px 12px; background:var(--input-bg); border:1px solid var(--border);
                              border-radius:8px; color:var(--text-primary); font-size:0.88em; outline:none;
                              font-family:inherit;"
                       onfocus="this.style.borderColor='var(--accent)'"
                       onblur="this.style.borderColor='var(--border)'"
                       onkeydown="if(event.key==='Enter'){wizardAddCustomValue();}">
                <input id="wizardCustomValueDesc" type="text" placeholder="Brief description (optional)"
                       style="flex:1.5; padding:8px 12px; background:var(--input-bg); border:1px solid var(--border);
                              border-radius:8px; color:var(--text-primary); font-size:0.88em; outline:none;
                              font-family:inherit;"
                       onfocus="this.style.borderColor='var(--accent)'"
                       onblur="this.style.borderColor='var(--border)'"
                       onkeydown="if(event.key==='Enter'){wizardAddCustomValue();}">
                <button onclick="wizardAddCustomValue()"
                        style="padding:8px 16px; background:var(--accent); color:#fff; border:none;
                               border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85em; white-space:nowrap;">
                    + Add
                </button>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center;">
            ${wizardBtn('\u2190 Back', 'wizardBack()', 'ghost')}
            <div style="display:flex; align-items:center; gap:16px;">
                <span id="valuesCount" style="font-size:0.82em; color:var(--text-muted);">
                    ${selectedCount} selected
                </span>
                ${wizardBtn('Continue \u2192 Purpose', 'wizardSaveValues()', 'primary')}
            </div>
        </div>
    `;
}

export function wizardToggleValue(i) {
    if (readOnlyGuard()) return;
    wizardState.values[i].selected = !wizardState.values[i].selected;
    // Re-render the grid and counter (avoids fragile DOM patching)
    var grid = document.getElementById('valuesGrid');
    if (grid) {
        var vals = wizardState.values;
        grid.innerHTML = vals.map(function(v, idx) {
            var sel = v.selected;
            return '<div onclick="wizardToggleValue(' + idx + ')" id="val-card-' + idx + '"'
                + ' style="background:' + (sel ? 'rgba(59,130,246,0.08)' : 'var(--bg-elevated, #1e293b)') + ';'
                + ' border:2px solid ' + (sel ? 'var(--accent, #3b82f6)' : 'var(--border, #334155)') + ';'
                + ' border-radius:10px; padding:12px; cursor:pointer;">'
                + '<div style="display:flex; align-items:start; gap:10px;">'
                + '<div style="width:18px; height:18px; border-radius:4px; flex-shrink:0; margin-top:2px;'
                + ' background:' + (sel ? 'var(--accent, #3b82f6)' : 'var(--input-bg, #0f172a)') + ';'
                + ' border:2px solid ' + (sel ? 'var(--accent, #3b82f6)' : 'var(--border, #334155)') + ';'
                + ' display:flex; align-items:center; justify-content:center;'
                + ' color:#fff; font-size:11px; line-height:1;">'
                + (sel ? '\u2713' : '')
                + '</div>'
                + '<div style="flex:1; min-width:0;">'
                + '<div style="font-weight:700; color:var(--text-primary, #e2e8f0); font-size:0.86em; margin-bottom:3px;">'
                + escapeHtml(v.name) + '</div>'
                + '<div onclick="event.stopPropagation(); wizardEditValueDesc(' + idx + ', this)" '
                + 'style="font-size:0.76em; color:var(--text-secondary, #94a3b8); line-height:1.4; cursor:text;" '
                + 'title="Click to edit">'
                + escapeHtml(v.description || '') + '</div>'
                + '</div></div></div>';
        }).join('');
    }
    var countEl = document.getElementById('valuesCount');
    if (countEl) countEl.textContent = wizardState.values.filter(function(v) { return v.selected; }).length + ' selected';
}

export function wizardEditValueDesc(i, el) {
    var v = wizardState.values[i];
    var current = v.description || '';
    var input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.style.cssText = 'width:100%; padding:4px 8px; background:var(--input-bg); border:1px solid var(--accent); border-radius:4px; color:var(--text-primary); font-size:1em; line-height:1.4; outline:none; font-family:inherit;';
    input.onblur = function() {
        wizardState.values[i].description = input.value.trim();
        el.textContent = input.value.trim() || current;
    };
    input.onkeydown = function(e) { if (e.key === 'Enter') input.blur(); };
    el.textContent = '';
    el.appendChild(input);
    input.focus();
}

export function wizardAddCustomValue() {
    if (readOnlyGuard()) return;
    var nameEl = document.getElementById('wizardCustomValueName');
    var descEl = document.getElementById('wizardCustomValueDesc');
    var name = (nameEl ? nameEl.value.trim() : '');
    var desc = (descEl ? descEl.value.trim() : '');
    if (!name) {
        showToast('Enter a value name.', 'warning');
        if (nameEl) nameEl.focus();
        return;
    }
    // Check for duplicates
    var exists = wizardState.values.some(function(v) { return v.name.toLowerCase() === name.toLowerCase(); });
    if (exists) {
        showToast('That value already exists.', 'warning');
        return;
    }
    wizardState.values.push({ name: name, description: desc, selected: true, _custom: true });
    if (nameEl) nameEl.value = '';
    if (descEl) descEl.value = '';
    showToast('"' + name + '" added and selected.', 'success');
    // Re-render to show new card
    var inner = document.getElementById('wizardInner');
    if (inner) renderWizardStep7(inner);
}
if (!window.wizardAddCustomValue) window.wizardAddCustomValue = wizardAddCustomValue;
if (!window.wizardEditValueDesc) window.wizardEditValueDesc = wizardEditValueDesc;

export function wizardSaveValues() {
    if (readOnlyGuard()) return;
    wizardNext();
}

// ── STEP 8: Purpose ───────────────────────────────────────────────────

export function renderWizardStep8(el) {
    const purpose = wizardState.purpose;
    const isFromResume = !!wizardState.parsedData;

    el.innerHTML = `
        ${wizardHeading(bpIcon('edit',22),
            'Your Purpose Statement',
            isFromResume ? 'Claude drafted this from your resume. Often the hardest thing to write about yourself — edit it until it sounds like you.'
                         : 'Write a brief statement about what you do, who you help, and what makes your approach distinctive.')}

        <div style="background:var(--bg-elevated); border:1px solid var(--border);
                    border-radius:14px; padding:24px; margin-bottom:20px;">
            <textarea id="wizardPurpose"
                      placeholder="I help [who] achieve [what] through [how]. I bring [distinctive quality] that enables [specific outcome]..."
                      style="width:100%; min-height:160px; background:var(--input-bg);
                             border:1px solid var(--border); border-radius:8px; padding:14px;
                             color:var(--text-primary); font-size:0.95em; line-height:1.7;
                             font-family:inherit; resize:vertical; outline:none;"
                      onfocus="this.style.borderColor='var(--accent)'"
                      onblur="this.style.borderColor='var(--border)'">${escapeHtml(purpose)}</textarea>

            ${isFromResume ? `
            <button onclick="wizardRegeneratePurpose()"
                    style="margin-top:12px; background:none; border:1px solid var(--border);
                           border-radius:7px; padding:7px 14px; color:var(--text-secondary);
                           cursor:pointer; font-size:0.82em; transition:all 0.18s;"
                    onmouseover="this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'"
                    onmouseout="this.style.borderColor='var(--border)'; this.style.color='var(--text-secondary)'">
                ↺ Regenerate with Claude
            </button>` : ''}
        </div>

        <div style="background:var(--accent-glow); border:1px solid var(--border);
                    border-radius:10px; padding:16px; margin-bottom:24px;">
            <div style="font-size:0.82em; color:var(--text-secondary); line-height:1.6;">
                <strong style="color:var(--accent);">${bpIcon('lightbulb',12)} What makes a strong purpose statement:</strong><br>
                Specific about who you help · Describes real outcomes, not activities · Reflects your actual approach · Sounds like a person, not a job description
            </div>
        </div>

        <div style="display:flex; justify-content:space-between;">
            ${wizardBtn('← Back', 'wizardBack()', 'ghost')}
            ${wizardBtn('Continue → Finish', 'wizardSavePurpose()', 'primary')}
        </div>
    `;
}

async function wizardRegeneratePurpose() {
    if (readOnlyGuard()) return;
    const btn = event.target.closest('button');
    if (btn) { btn.textContent = '⟳ Regenerating...'; btn.disabled = true; }

    var purposeApiKey = safeGet('wbAnthropicKey');
    if (!purposeApiKey && !(typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)) {
        showToast('Sign in or add an Anthropic API key in Settings to use AI features.', 'warning');
        if (btn) { btn.textContent = '⟳ Regenerate'; btn.disabled = false; }
        return;
    }

    try {
        var data = await callAnthropicAPI({
                model: BP_AI_MODEL,
                max_tokens: 300,
                messages: [{
                    role: 'user',
                    content: `Write a 2-3 sentence professional purpose statement for this person. Make it specific, human, and authentic — not generic corporate speak. Return only the statement, no preamble.

Name: ${wizardState.profile.name}
Title: ${wizardState.profile.currentTitle}
Top skills: ${wizardState.skills.slice(0,8).map(s=>s.name).join(', ')}
Values: ${wizardState.values.filter(v=>v.selected).map(v=>v.name).join(', ')}
Selected outcomes: ${wizardState.skills.flatMap(s=>s.evidence||[]).slice(0,5).map(e=>e.outcome).filter(Boolean).join(' | ')}`
                }]
            }, purposeApiKey, 'purpose-regen');
        const newPurpose = data.content[0]?.text?.trim() || '';
        if (newPurpose) {
            wizardState.purpose = newPurpose;
            const ta = document.getElementById('wizardPurpose');
            if (ta) ta.value = newPurpose;
            resolveIncidents('purpose-regen');
        }
    } catch(err) {
        console.error('Regenerate error:', err);
        logIncident(
            err.message.includes('credit balance') ? 'critical' : 'warning',
            'purpose-regen',
            'Purpose generation failed: ' + err.message,
            { rawError: err.message }
        );
        var toastMsg = err.message.includes('credit balance')
            ? 'Anthropic API credits depleted. Top up at console.anthropic.com.'
            : 'Purpose generation failed: ' + err.message;
        showToast(toastMsg, 'error', 6000);
    }

    if (btn) { btn.textContent = '↺ Regenerate with Claude'; btn.disabled = false; }
}

export function wizardSavePurpose() {
    if (readOnlyGuard()) return;
    wizardState.purpose = document.getElementById('wizardPurpose')?.value?.trim() || '';
    wizardNext();
}

// ── STEP 9: Complete ──────────────────────────────────────────────────

export function renderWizardStep9(el) {
    const skillCount = wizardState.skills.length;
    const valueCount = wizardState.values.filter(v => v.selected).length;
    const evidenceCount = wizardState.skills.reduce((n, s) => n + (s.evidence?.length || 0), 0);

    el.innerHTML = `
        ${wizardHeading(bpIcon('star',22), 'Your Blueprint is Ready',
            'Here is what we built together. Download your profile to save it, then explore your full dashboard.')}

        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px;">
            ${[
                [bpIcon('compass',14), skillCount, 'Skills'],
                [bpIcon('clipboard',12), evidenceCount, 'Evidence Items'],
                [bpIcon('lightbulb',12), valueCount, 'Values']
            ].map(([icon, n, label]) => `
                <div style="background:var(--bg-elevated); border:1px solid var(--border);
                            border-radius:12px; padding:20px; text-align:center;">
                    <div style="font-size:1.8em; margin-bottom:6px;">${icon}</div>
                    <div style="font-size:1.8em; font-weight:800; color:var(--accent); line-height:1;">${n}</div>
                    <div style="font-size:0.82em; color:var(--text-secondary); margin-top:4px;">${label}</div>
                </div>
            `).join('')}
        </div>

        <div style="background:var(--bg-elevated); border:1px solid var(--border);
                    border-radius:14px; padding:22px; margin-bottom:20px;">
            <div style="font-weight:700; color:var(--text-primary); margin-bottom:12px; font-size:0.95em;">
                ${escapeHtml(wizardState.profile.name || 'Your')} · ${escapeHtml(wizardState.profile.currentTitle || '')}
            </div>
            ${wizardState.purpose ? `
            <p style="color:var(--text-secondary); font-size:0.88em; line-height:1.7; margin-bottom:14px;
                       font-style:italic; border-left:3px solid var(--accent); padding-left:14px;">
                "${escapeHtml(wizardState.purpose)}"
            </p>` : ''}
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${wizardState.values.filter(v=>v.selected).slice(0,5).map(v =>
                    `<span style="background:var(--chip-bg); border:1px solid var(--border);
                                  padding:4px 10px; border-radius:10px; font-size:0.78em;
                                  color:var(--text-secondary);">${escapeHtml(v.name)}</span>`
                ).join('')}
            </div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; gap:12px; margin-bottom:24px;">
            <button onclick="wizardSaveAndGo()"
                    style="width:100%; max-width:360px; background:var(--accent); color:#fff; border:none;
                           padding:16px 24px; border-radius:10px; cursor:pointer;
                           font-size:0.95em; font-weight:700;">
                ${bpIcon("save",14)} Save & Go to Dashboard
            </button>
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.82em; color:var(--text-secondary);">
                <input type="checkbox" id="wizardDownloadCheck" checked style="accent-color:var(--accent);">
                Also download JSON backup
            </label>
        </div>

        <p style="text-align:center; font-size:0.8em; color:var(--text-muted);">
            Your profile saves to your account automatically when signed in.
        </p>
    `;
}

export function wizardApplyContentOpts() {
    var artCb = document.getElementById('wiz-opt-articles');
    var postCb = document.getElementById('wiz-opt-posts');
    var learnCb = document.getElementById('wiz-opt-learning');
    if (artCb && !artCb.checked) { wizardState.articles = []; if (wizardState.parsedData) wizardState.parsedData.articles = []; }
    if (postCb && !postCb.checked) { wizardState.richMedia = []; if (wizardState.parsedData) wizardState.parsedData.richMedia = []; }
    if (learnCb && !learnCb.checked) { wizardState.learning = []; if (wizardState.parsedData) wizardState.parsedData.learning = []; }
}
if (!window.wizardApplyContentOpts) window.wizardApplyContentOpts = wizardApplyContentOpts;

// ═══════════════════════════════════════════════════════════════════════
// EXPLORER MODE — Interview wizard for students / early-career (v4.47.37i)
// ═══════════════════════════════════════════════════════════════════════

var explorerFieldStyle = 'width:100%; padding:10px 14px; background:var(--input-bg); border:1px solid var(--border); border-radius:8px; color:var(--text-primary); font-size:0.92em; box-sizing:border-box;';
var explorerLabelStyle = 'display:block; font-size:0.82em; font-weight:600; color:var(--text-secondary); margin-bottom:5px;';
var explorerCardStyle = 'background:var(--bg-elevated); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:16px;';
var explorerChipStyle = 'display:inline-flex; align-items:center; gap:4px; padding:6px 14px; border-radius:20px; font-size:0.82em; cursor:pointer; transition:all 0.15s; border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-secondary);';
var explorerChipActiveStyle = 'display:inline-flex; align-items:center; gap:4px; padding:6px 14px; border-radius:20px; font-size:0.82em; cursor:pointer; transition:all 0.15s; border:1px solid #8b5cf6; background:rgba(139,92,246,0.15); color:#8b5cf6; font-weight:600;';

export function renderExplorerEducation(el) {
    var ed = wizardState.explorerData.education || {};
    el.innerHTML = `
        ${wizardHeading('\uD83C\uDF93', 'Tell Us About Your Education',
            'Where did you go to school? What did you study? This is the foundation of your profile.')}
        <div style="${explorerCardStyle}">
            <div style="display:grid; gap:14px;">
                <div>
                    <label style="${explorerLabelStyle}">School / University *</label>
                    <input type="text" id="expSchool" value="${escapeAttr(ed.school || '')}" placeholder="e.g. University of Texas at Austin" style="${explorerFieldStyle}">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                        <label style="${explorerLabelStyle}">Degree</label>
                        <select id="expDegree" style="${explorerFieldStyle}">
                            <option value="">Select...</option>
                            <option value="High School Diploma"${ed.degree === 'High School Diploma' ? ' selected' : ''}>High School Diploma</option>
                            <option value="Associate's"${ed.degree === "Associate's" ? ' selected' : ''}>Associate's Degree</option>
                            <option value="Bachelor's"${ed.degree === "Bachelor's" ? ' selected' : ''}>Bachelor's Degree</option>
                            <option value="Master's"${ed.degree === "Master's" ? ' selected' : ''}>Master's Degree</option>
                            <option value="PhD"${ed.degree === 'PhD' ? ' selected' : ''}>PhD / Doctorate</option>
                            <option value="Certificate"${ed.degree === 'Certificate' ? ' selected' : ''}>Certificate Program</option>
                            <option value="Bootcamp"${ed.degree === 'Bootcamp' ? ' selected' : ''}>Bootcamp</option>
                            <option value="Other"${ed.degree === 'Other' ? ' selected' : ''}>Other</option>
                        </select>
                    </div>
                    <div>
                        <label style="${explorerLabelStyle}">Graduation Year</label>
                        <input type="number" id="expGradYear" value="${ed.gradYear || ''}" placeholder="${new Date().getFullYear()}" min="2000" max="2035" style="${explorerFieldStyle}">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                        <label style="${explorerLabelStyle}">Major / Field of Study *</label>
                        <input type="text" id="expMajor" value="${escapeAttr(ed.major || '')}" placeholder="e.g. Computer Science" style="${explorerFieldStyle}">
                    </div>
                    <div>
                        <label style="${explorerLabelStyle}">Minor (optional)</label>
                        <input type="text" id="expMinor" value="${escapeAttr(ed.minor || '')}" placeholder="e.g. Business Administration" style="${explorerFieldStyle}">
                    </div>
                </div>
                <div>
                    <label style="${explorerLabelStyle}">GPA (optional)</label>
                    <input type="text" id="expGPA" value="${escapeAttr(ed.gpa || '')}" placeholder="e.g. 3.5" style="${explorerFieldStyle} max-width:120px;">
                </div>
                <div>
                    <label style="${explorerLabelStyle}">Notable Coursework or Projects</label>
                    <textarea id="expCoursework" rows="3" placeholder="e.g. Senior capstone project on renewable energy analysis, Data Structures, Machine Learning course, marketing case study competition..." style="${explorerFieldStyle} resize:vertical;">${escapeHtml(ed.coursework || '')}</textarea>
                </div>
            </div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:20px;">
            ${wizardBtn('Back', 'wizardBack()', 'secondary')}
            ${wizardBtn('Next \u2192', 'explorerSaveEducation()', 'primary')}
        </div>
    `;
}

export function explorerSaveEducation() {
    var school = (document.getElementById('expSchool') || {}).value || '';
    var major = (document.getElementById('expMajor') || {}).value || '';
    if (!school.trim() || !major.trim()) {
        showToast('Please enter your school and major.', 'error');
        return;
    }
    wizardState.explorerData.education = {
        school: school.trim(),
        degree: (document.getElementById('expDegree') || {}).value || '',
        gradYear: (document.getElementById('expGradYear') || {}).value || '',
        major: major.trim(),
        minor: (document.getElementById('expMinor') || {}).value || '',
        gpa: (document.getElementById('expGPA') || {}).value || '',
        coursework: (document.getElementById('expCoursework') || {}).value || ''
    };
    wizardNext();
}

export function renderExplorerActivities(el) {
    var acts = wizardState.explorerData.activities || [];
    var jobs = wizardState.explorerData.partTimeJobs || [];

    var actCategories = [
        { id: 'greek', label: 'Greek Life (Fraternity/Sorority)', icon: '\uD83C\uDFDB\uFE0F' },
        { id: 'sports', label: 'Sports Team / Intramurals', icon: '\u26BD' },
        { id: 'student-gov', label: 'Student Government', icon: '\uD83C\uDFDB\uFE0F' },
        { id: 'volunteer', label: 'Volunteering / Community Service', icon: '\u2764\uFE0F' },
        { id: 'clubs', label: 'Academic or Interest Clubs', icon: '\uD83D\uDCDA' },
        { id: 'scouts', label: 'Boy Scouts / Girl Scouts', icon: '\u26FA' },
        { id: 'church', label: 'Church / Religious Groups', icon: '\u26EA' },
        { id: 'arts', label: 'Music / Theater / Art', icon: '\uD83C\uDFA8' },
        { id: 'research', label: 'Research / Lab Work', icon: '\uD83D\uDD2C' },
        { id: 'military', label: 'ROTC / Military', icon: '\uD83C\uDF96\uFE0F' },
        { id: 'startup', label: 'Startup / Side Business', icon: '\uD83D\uDE80' },
        { id: 'mentoring', label: 'Tutoring / Mentoring', icon: '\uD83D\uDC65' }
    ];

    var actChips = actCategories.map(function(cat) {
        var isActive = acts.some(function(a) { return a.category === cat.id; });
        return '<span onclick="explorerToggleActivity(\'' + cat.id + '\')" style="' + (isActive ? explorerChipActiveStyle : explorerChipStyle) + '">'
            + cat.icon + ' ' + cat.label + '</span>';
    }).join(' ');

    var actDetails = acts.map(function(a, i) {
        var cat = actCategories.find(function(c) { return c.id === a.category; });
        return '<div style="padding:12px; background:var(--c-surface-1); border:1px solid var(--c-surface-4); border-radius:8px; margin-top:8px;">'
            + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">'
            + '<span style="font-weight:600; color:var(--text-primary); font-size:0.88em;">' + (cat ? cat.icon + ' ' + cat.label : a.category) + '</span>'
            + '<button onclick="explorerRemoveActivity(' + i + ')" style="background:none; border:none; color:var(--c-muted); cursor:pointer; font-size:0.82em;">\u2715</button></div>'
            + '<input type="text" value="' + escapeAttr(a.role || '') + '" placeholder="Your role (e.g. Treasurer, Team Captain, Eagle Scout)" '
            + 'onchange="explorerUpdateActivity(' + i + ',\'role\',this.value)" style="' + explorerFieldStyle + ' margin-bottom:6px; font-size:0.85em;">'
            + '<textarea placeholder="What did you do? What did you accomplish? Be specific!" '
            + 'onchange="explorerUpdateActivity(' + i + ',\'description\',this.value)" rows="2" style="' + explorerFieldStyle + ' resize:vertical; font-size:0.85em;">' + escapeHtml(a.description || '') + '</textarea>'
            + '</div>';
    }).join('');

    var jobEntries = jobs.map(function(j, i) {
        return '<div style="padding:10px; background:var(--c-surface-1); border:1px solid var(--c-surface-4); border-radius:8px; margin-top:8px; display:grid; gap:6px;">'
            + '<input type="text" value="' + escapeAttr(j.title || '') + '" placeholder="Job title (e.g. Barista, Camp Counselor)" '
            + 'onchange="explorerUpdateJob(' + i + ',\'title\',this.value)" style="' + explorerFieldStyle + ' font-size:0.85em;">'
            + '<input type="text" value="' + escapeAttr(j.company || '') + '" placeholder="Where?" '
            + 'onchange="explorerUpdateJob(' + i + ',\'company\',this.value)" style="' + explorerFieldStyle + ' font-size:0.85em;">'
            + '<textarea placeholder="What were your responsibilities?" '
            + 'onchange="explorerUpdateJob(' + i + ',\'description\',this.value)" rows="2" style="' + explorerFieldStyle + ' resize:vertical; font-size:0.85em;">' + escapeHtml(j.description || '') + '</textarea>'
            + '<button onclick="explorerRemoveJob(' + i + ')" style="background:none; border:1px solid var(--border); border-radius:6px; padding:4px 10px; color:var(--c-muted); cursor:pointer; font-size:0.78em; width:fit-content;">Remove</button>'
            + '</div>';
    }).join('');

    el.innerHTML = `
        ${wizardHeading('\uD83C\uDFC6', 'Activities & Experience',
            'What have you been involved in? Every club, team, job, or volunteer role builds real skills \u2014 even if it doesn\u2019t feel like it yet.')}
        <div style="${explorerCardStyle}">
            <div style="font-weight:600; color:var(--text-primary); margin-bottom:10px; font-size:0.9em;">Select activities you've been part of:</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">${actChips}</div>
            <div id="explorerActDetails">${actDetails}</div>
        </div>
        <div style="${explorerCardStyle}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="font-weight:600; color:var(--text-primary); font-size:0.9em;">Part-time Jobs or Internships</div>
                <button onclick="explorerAddJob()" style="padding:5px 12px; background:var(--accent); color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.82em; font-weight:600;">+ Add</button>
            </div>
            <div style="font-size:0.8em; color:var(--text-muted); margin-bottom:8px;">Summer jobs, campus positions, internships \u2014 they all count!</div>
            <div id="explorerJobEntries">${jobEntries}</div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:20px;">
            ${wizardBtn('Back', 'wizardBack()', 'secondary')}
            ${wizardBtn('Next \u2192', 'explorerSaveActivities()', 'primary')}
        </div>
    `;
}

export function explorerToggleActivity(catId) {
    var acts = wizardState.explorerData.activities;
    var idx = acts.findIndex(function(a) { return a.category === catId; });
    if (idx >= 0) {
        acts.splice(idx, 1);
    } else {
        acts.push({ category: catId, role: '', description: '' });
    }
    renderWizardStep();
}

export function explorerUpdateActivity(idx, field, val) {
    if (wizardState.explorerData.activities[idx]) {
        wizardState.explorerData.activities[idx][field] = val;
    }
}

export function explorerRemoveActivity(idx) {
    wizardState.explorerData.activities.splice(idx, 1);
    renderWizardStep();
}

export function explorerAddJob() {
    wizardState.explorerData.partTimeJobs.push({ title: '', company: '', description: '' });
    renderWizardStep();
}

export function explorerUpdateJob(idx, field, val) {
    if (wizardState.explorerData.partTimeJobs[idx]) {
        wizardState.explorerData.partTimeJobs[idx][field] = val;
    }
}

export function explorerRemoveJob(idx) {
    wizardState.explorerData.partTimeJobs.splice(idx, 1);
    renderWizardStep();
}

export function explorerSaveActivities() {
    wizardNext();
}

export function renderExplorerInterests(el) {
    var interests = wizardState.explorerData.interests || [];
    var interestSuggestions = [
        'Coding / Programming', 'Gaming', 'Music', 'Art / Design', 'Writing / Blogging',
        'Fitness / Sports', 'Photography', 'Video Production', 'Cooking', 'Travel',
        'Podcasting', 'Social Media', 'Reading', 'Investing / Finance', 'Teaching',
        'Nature / Outdoors', 'Fashion', 'Public Speaking', 'Robotics / Engineering',
        'Mental Health / Wellness', 'Animals', 'Cars / Mechanics', 'Politics / Advocacy',
        'Data / Analytics', 'Event Planning', 'Real Estate', 'Entrepreneurship'
    ];

    var chips = interestSuggestions.map(function(int) {
        var isActive = interests.indexOf(int) >= 0;
        return '<span onclick="explorerToggleInterest(\'' + escapeAttr(int).replace(/'/g, "\\'") + '\')" style="' + (isActive ? explorerChipActiveStyle : explorerChipStyle) + '">' + int + '</span>';
    }).join(' ');

    el.innerHTML = `
        ${wizardHeading('\u2728', 'Interests & Passions',
            'What gets you excited? Your interests reveal transferable skills and help us suggest careers you\u2019ll actually enjoy.')}
        <div style="${explorerCardStyle}">
            <div style="font-weight:600; color:var(--text-primary); margin-bottom:10px; font-size:0.9em;">Select all that apply (or add your own):</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;">${chips}</div>
            <div style="display:flex; gap:8px;">
                <input type="text" id="expCustomInterest" placeholder="Add your own interest..." style="${explorerFieldStyle} flex:1;">
                <button onclick="explorerAddCustomInterest()" style="padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.88em; white-space:nowrap;">+ Add</button>
            </div>
            ${interests.length > 0 ? '<div style="margin-top:14px; font-size:0.82em; color:#8b5cf6; font-weight:600;">' + interests.length + ' interest' + (interests.length !== 1 ? 's' : '') + ' selected</div>' : ''}
        </div>
        <div style="${explorerCardStyle}">
            <label style="${explorerLabelStyle}">Tell us more about what drives you (optional)</label>
            <textarea id="expDriveStatement" rows="3" placeholder="What kind of work environment excites you? What problems do you want to solve? What impact do you want to make?" style="${explorerFieldStyle} resize:vertical;">${escapeHtml(wizardState.explorerData.driveStatement || '')}</textarea>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:20px;">
            ${wizardBtn('Back', 'wizardBack()', 'secondary')}
            ${wizardBtn('Discover My Skills \u2192', 'explorerSaveInterests()', 'primary')}
        </div>
    `;
}

export function explorerToggleInterest(name) {
    var arr = wizardState.explorerData.interests;
    var idx = arr.indexOf(name);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(name);
    renderWizardStep();
}

export function explorerAddCustomInterest() {
    var input = document.getElementById('expCustomInterest');
    if (!input || !input.value.trim()) return;
    var val = input.value.trim();
    if (wizardState.explorerData.interests.indexOf(val) < 0) {
        wizardState.explorerData.interests.push(val);
    }
    input.value = '';
    renderWizardStep();
}

export function explorerSaveInterests() {
    wizardState.explorerData.driveStatement = (document.getElementById('expDriveStatement') || {}).value || '';
    if (wizardState.explorerData.interests.length === 0 && wizardState.explorerData.activities.length === 0) {
        showToast('Please select at least one interest or activity so we can discover your skills.', 'error');
        return;
    }
    explorerRunSkillDiscovery();
}

export async function explorerRunSkillDiscovery() {
    var ed = wizardState.explorerData;
    var prompt = 'You are a career counselor AI helping a student or early-career person discover their professional skills.\n\n'
        + 'Based on the following information about this person, extract 15-30 professional skills they likely possess. '
        + 'Map each to O*NET skill/ability/workstyle categories. Assign realistic proficiency levels for someone early in their career (mostly Novice or Competent, occasionally Proficient for areas of deep involvement). '
        + 'For each skill, provide a brief "reason" explaining which activity/interest/course gave them this skill.\n\n'
        + 'Also suggest a professional "headline" and a brief "purpose statement" for this person.\n\n'
        + '--- PERSON INFO ---\n'
        + 'Education: ' + (ed.education.degree || '') + ' in ' + (ed.education.major || '') + (ed.education.minor ? ', Minor: ' + ed.education.minor : '') + ' from ' + (ed.education.school || '') + (ed.education.gradYear ? ' (' + ed.education.gradYear + ')' : '') + '\n'
        + 'Notable coursework/projects: ' + (ed.education.coursework || 'None specified') + '\n\n'
        + 'Activities & Organizations:\n';
    ed.activities.forEach(function(a) {
        prompt += '- ' + a.category + (a.role ? ' (Role: ' + a.role + ')' : '') + (a.description ? ': ' + a.description : '') + '\n';
    });
    prompt += '\nPart-time jobs / internships:\n';
    (ed.partTimeJobs || []).forEach(function(j) {
        if (j.title) prompt += '- ' + j.title + (j.company ? ' at ' + j.company : '') + (j.description ? ': ' + j.description : '') + '\n';
    });
    prompt += '\nInterests & Hobbies: ' + (ed.interests || []).join(', ') + '\n';
    if (ed.driveStatement) prompt += '\nWhat drives them: ' + ed.driveStatement + '\n';
    prompt += '\n--- OUTPUT FORMAT ---\n'
        + 'Return ONLY a JSON object with this structure (no markdown, no explanation):\n'
        + '{\n'
        + '  "headline": "e.g. Aspiring Data Analyst | University of Texas",\n'
        + '  "purpose": "2-3 sentence purpose statement",\n'
        + '  "skills": [\n'
        + '    { "name": "Skill Name", "level": "Novice|Competent|Proficient", "category": "skill|ability|workstyle|unique", "reason": "Why they have this skill based on their info" }\n'
        + '  ]\n'
        + '}';

    wizardState.step = 5;
    renderWizardStep();
    var inner = document.getElementById('wizardInner');
    inner.innerHTML = wizardHeading('\uD83D\uDD0D', 'Discovering Your Skills...',
        'Our AI is analyzing your education, activities, and interests to find the professional skills you already have.')
        + '<div style="text-align:center; padding:40px 0;">'
        + '<div class="bp-spinner" style="margin:0 auto 16px;"></div>'
        + '<div style="color:var(--text-muted); font-size:0.88em;">This usually takes about 15-20 seconds...</div>'
        + '</div>';

    try {
        var response = await callAnthropicAPI({
            model: BP_AI_MODEL,
            max_tokens: 3000,
            messages: [{ role: 'user', content: prompt }]
        }, null, 'explorer-skills');

        var text = response.content[0].text;
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        var parsed = JSON.parse(text);

        wizardState.explorerData.discoveredSkills = parsed.skills || [];
        wizardState.explorerData.headline = parsed.headline || '';
        wizardState.explorerData.purpose = parsed.purpose || '';
        wizardState.explorerData.discoveredSkills.forEach(function(s) { s.selected = true; });

        renderWizardStep();
    } catch (err) {
        inner.innerHTML = wizardHeading('\u26A0\uFE0F', 'Skill Discovery Issue',
            'We had trouble analyzing your profile. You can try again or continue manually.')
            + '<div style="text-align:center; padding:20px;">'
            + '<div style="color:var(--c-warn); font-size:0.85em; margin-bottom:16px;">' + escapeHtml(err.message) + '</div>'
            + '<button onclick="explorerRunSkillDiscovery()" style="padding:10px 24px; background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Try Again</button>'
            + ' <button onclick="wizardState.explorerData.discoveredSkills=[]; wizardNext();" style="padding:10px 24px; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:8px; cursor:pointer;">Skip</button>'
            + '</div>';
    }
}

export function renderExplorerSkills(el) {
    var skills = wizardState.explorerData.discoveredSkills || [];
    if (skills.length === 0) {
        el.innerHTML = wizardHeading('\uD83D\uDCA1', 'Your Discovered Skills',
            'No skills were discovered. Go back and add more details about your activities and interests.')
            + '<div style="display:flex; justify-content:space-between; margin-top:20px;">'
            + wizardBtn('Back', 'wizardBack()', 'secondary')
            + wizardBtn('Next \u2192', 'explorerSaveSkills()', 'primary')
            + '</div>';
        return;
    }

    var selectedCount = skills.filter(function(s) { return s.selected; }).length;
    var catColors = { skill: '#60a5fa', ability: '#a78bfa', workstyle: '#10b981', unique: '#fbbf24' };
    var catLabels = { skill: 'Skill', ability: 'Ability', workstyle: 'Work Style', unique: 'Unique' };

    var skillCards = skills.map(function(s, i) {
        var cc = catColors[s.category] || '#60a5fa';
        return '<div onclick="explorerToggleSkill(' + i + ')" style="padding:12px 14px; border-radius:10px; cursor:pointer; transition:all 0.15s; '
            + 'background:' + (s.selected ? 'rgba(' + (s.category === 'ability' ? '139,92,246' : s.category === 'workstyle' ? '16,185,129' : '96,165,250') + ',0.08)' : 'var(--c-surface-1)') + '; '
            + 'border:1px solid ' + (s.selected ? cc + '40' : 'var(--c-surface-4)') + ';">'
            + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">'
            + '<span style="font-weight:600; color:var(--text-primary); font-size:0.88em;">' + escapeHtml(s.name) + '</span>'
            + '<div style="display:flex; align-items:center; gap:6px;">'
            + '<span style="font-size:0.68em; padding:2px 8px; border-radius:8px; background:' + cc + '18; color:' + cc + '; font-weight:600;">' + (catLabels[s.category] || 'Skill') + '</span>'
            + '<span style="font-size:0.72em; padding:2px 8px; border-radius:8px; background:var(--c-surface-3); color:var(--text-muted);">' + escapeHtml(s.level) + '</span>'
            + (s.selected ? '<span style="color:#10b981;">\u2713</span>' : '<span style="color:var(--c-muted);">\u25CB</span>') + '</div></div>'
            + '<div style="font-size:0.78em; color:var(--text-muted); line-height:1.4;">' + escapeHtml(s.reason || '') + '</div>'
            + '</div>';
    }).join('');

    el.innerHTML = `
        ${wizardHeading('\uD83D\uDCA1', 'Your Discovered Skills',
            'We found ' + skills.length + ' skills based on your background. Toggle any you disagree with. These become the foundation of your Blueprint.')}
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <span style="font-size:0.85em; color:var(--text-secondary); font-weight:600;">${selectedCount} of ${skills.length} selected</span>
            <div style="display:flex; gap:8px;">
                <button onclick="explorerSelectAllSkills(true)" style="padding:4px 12px; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:6px; cursor:pointer; font-size:0.78em;">Select All</button>
                <button onclick="explorerSelectAllSkills(false)" style="padding:4px 12px; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:6px; cursor:pointer; font-size:0.78em;">Deselect All</button>
            </div>
        </div>
        <div style="display:grid; gap:8px; max-height:50vh; overflow-y:auto; padding-right:4px;">${skillCards}</div>
        <div style="display:flex; justify-content:space-between; margin-top:20px;">
            ${wizardBtn('Back', 'wizardBack()', 'secondary')}
            ${wizardBtn('Find Career Paths \u2192', 'explorerSaveSkills()', 'primary')}
        </div>
    `;
}

export function explorerToggleSkill(idx) {
    var skills = wizardState.explorerData.discoveredSkills;
    if (skills[idx]) skills[idx].selected = !skills[idx].selected;
    renderWizardStep();
}

export function explorerSelectAllSkills(val) {
    (wizardState.explorerData.discoveredSkills || []).forEach(function(s) { s.selected = val; });
    renderWizardStep();
}

export async function explorerSaveSkills() {
    var selected = (wizardState.explorerData.discoveredSkills || []).filter(function(s) { return s.selected; });
    if (selected.length === 0) {
        showToast('Please select at least a few skills to continue.', 'error');
        return;
    }
    wizardState.skills = selected.map(function(s, i) {
        return {
            name: s.name,
            level: s.level || 'Novice',
            category: s.category || 'skill',
            key: false,
            roles: [],
            evidence: [],
            userAssessment: { years: 0, impact: 'moderate', rarity: 'common' }
        };
    });

    wizardState.step = 6;
    renderWizardStep();
    var inner = document.getElementById('wizardInner');
    inner.innerHTML = wizardHeading('\uD83D\uDEE4\uFE0F', 'Finding Your Career Paths...',
        'Analyzing your skills, education, and interests to suggest career paths that fit your profile.')
        + '<div style="text-align:center; padding:40px 0;">'
        + '<div class="bp-spinner" style="margin:0 auto 16px;"></div>'
        + '<div style="color:var(--text-muted); font-size:0.88em;">Exploring possibilities...</div>'
        + '</div>';

    var skillNames = selected.map(function(s) { return s.name; }).join(', ');
    var ed = wizardState.explorerData.education;
    var prompt = 'You are a career counselor AI. Based on the following student/early-career profile, suggest 5 realistic career paths.\n\n'
        + 'For each path, provide:\n'
        + '- A job title they could aim for as an entry-level position\n'
        + '- Why it fits their specific background (reference their actual skills/activities)\n'
        + '- Salary data: entry-level range string, plus numeric values for entry, mid-career (3-5yr), and senior (8-10yr)\n'
        + '- Growth potential description\n'
        + '- Which of their current skills already apply to this path (2-4 skill names from their profile)\n'
        + '- 4 new skills they should learn, each with: skill name, added market value (numeric, in dollars), time to learn, and how to learn it (specific free/low-cost resource)\n'
        + '- 3-4 concrete next steps to pursue this path\n\n'
        + '--- PROFILE ---\n'
        + 'Education: ' + (ed.degree || '') + ' in ' + (ed.major || '') + (ed.minor ? ', Minor: ' + ed.minor : '') + ' from ' + (ed.school || '') + '\n'
        + 'Skills: ' + skillNames + '\n'
        + 'Activities: ' + (wizardState.explorerData.activities || []).map(function(a) { return a.category + (a.role ? ' (' + a.role + ')' : ''); }).join(', ') + '\n'
        + 'Interests: ' + (wizardState.explorerData.interests || []).join(', ') + '\n'
        + (wizardState.explorerData.driveStatement ? 'Motivation: ' + wizardState.explorerData.driveStatement + '\n' : '')
        + '\n--- OUTPUT ---\n'
        + 'Return ONLY a JSON object (no markdown):\n'
        + '{\n'
        + '  "careerPaths": [\n'
        + '    {\n'
        + '      "title": "Entry-Level Job Title",\n'
        + '      "whyFit": "Why this fits their specific background",\n'
        + '      "salary": "$XX,000 - $YY,000",\n'
        + '      "entryValue": 45000,\n'
        + '      "midValue": 72000,\n'
        + '      "seniorValue": 110000,\n'
        + '      "growth": "Growth outlook description",\n'
        + '      "skillsYouHave": ["Skill1", "Skill2"],\n'
        + '      "skillsToLearn": [\n'
        + '        { "name": "New Skill", "valueAdd": 8000, "timeToLearn": "2-3 months", "how": "Specific resource or certification" }\n'
        + '      ],\n'
        + '      "nextSteps": ["Step 1", "Step 2", "Step 3"]\n'
        + '    }\n'
        + '  ],\n'
        + '  "values": ["Value1", "Value2", "Value3", "Value4", "Value5"]\n'
        + '}';

    try {
        var response = await callAnthropicAPI({
            model: BP_AI_MODEL,
            max_tokens: 3000,
            messages: [{ role: 'user', content: prompt }]
        }, null, 'explorer-careers');

        var text = response.content[0].text;
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        var parsed = JSON.parse(text);

        wizardState.explorerData.careerPaths = parsed.careerPaths || [];
        wizardState.explorerData.suggestedValues = parsed.values || [];

        renderWizardStep();
    } catch (err) {
        inner.innerHTML = wizardHeading('\u26A0\uFE0F', 'Career Path Issue',
            'We had trouble suggesting career paths.')
            + '<div style="text-align:center; padding:20px;">'
            + '<div style="color:var(--c-warn); font-size:0.85em; margin-bottom:16px;">' + escapeHtml(err.message) + '</div>'
            + '<button onclick="explorerSaveSkills()" style="padding:10px 24px; background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Try Again</button>'
            + ' <button onclick="wizardState.explorerData.careerPaths=[]; renderWizardStep();" style="padding:10px 24px; background:transparent; border:1px solid var(--border); color:var(--text-secondary); border-radius:8px; cursor:pointer;">Skip</button>'
            + '</div>';
    }
}

export function renderExplorerCareers(el) {
    var paths = wizardState.explorerData.careerPaths || [];
    var selectedIdx = wizardState.explorerData.selectedCareerIdx;
    if (typeof selectedIdx === 'undefined') selectedIdx = null;

    var pathCards = paths.map(function(p, i) {
        var isSelected = selectedIdx === i;
        var salaryStr = p.salary || p.salaryRange || 'Varies';
        var growthStr = p.growth || p.growthPath || '';
        var entryV = Number(p.entryValue) || 0;
        var midV = Number(p.midValue) || 0;
        var seniorV = Number(p.seniorValue) || 0;
        var stl = p.skillsToLearn || [];
        var totalAdd = 0;
        stl.forEach(function(s) { totalAdd += (Number(s.valueAdd) || 0); });
        return '<div onclick="explorerSelectCareer(' + i + ')" style="padding:16px; border-radius:12px; cursor:pointer; transition:all 0.15s; '
            + 'background:' + (isSelected ? 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(96,165,250,0.08))' : 'var(--bg-elevated)') + '; '
            + 'border:2px solid ' + (isSelected ? '#8b5cf6' : 'var(--border)') + ';">'
            + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">'
            + '<div style="font-weight:700; color:var(--text-primary); font-size:1em;">' + escapeHtml(p.title) + '</div>'
            + (isSelected ? '<span style="color:#8b5cf6; font-weight:700;">\u2713 Selected</span>' : '')
            + '</div>'
            + (entryV > 0 ? '<div style="display:flex; gap:8px; align-items:center; margin-bottom:10px; font-size:0.82em; flex-wrap:wrap;">'
                + '<span style="color:#10b981; font-weight:700;">$' + entryV.toLocaleString() + '</span>'
                + '<span style="color:var(--text-muted); font-size:0.75em;">\u2192</span>'
                + (midV > 0 ? '<span style="color:#60a5fa; font-weight:700;">$' + midV.toLocaleString() + '</span>'
                    + '<span style="color:var(--text-muted); font-size:0.75em;">\u2192</span>' : '')
                + '<span style="color:#8b5cf6; font-weight:700;">$' + seniorV.toLocaleString() + '</span>'
                + '<span style="color:var(--text-muted); font-size:0.72em; margin-left:4px;">salary progression</span>'
                + '</div>' : '')
            + '<div style="font-size:0.82em; color:var(--text-secondary); line-height:1.4; margin-bottom:10px;">' + escapeHtml(p.whyFit) + '</div>'
            + '<div style="display:flex; gap:16px; flex-wrap:wrap; font-size:0.78em;">'
            + '<span style="color:var(--text-muted);">\uD83D\uDCB0 ' + escapeHtml(salaryStr) + '</span>'
            + '<span style="color:var(--text-muted);">\uD83D\uDCC8 ' + escapeHtml(growthStr) + '</span>'
            + (totalAdd > 0 ? '<span style="color:#10b981; font-weight:600;">\uD83D\uDCA1 +$' + totalAdd.toLocaleString() + ' skill growth</span>' : '')
            + '</div>'
            + (isSelected && p.nextSteps ? '<div style="margin-top:10px; padding:10px; background:var(--c-surface-1); border-radius:8px;">'
                + '<div style="font-size:0.78em; font-weight:600; color:var(--text-primary); margin-bottom:6px;">Next Steps:</div>'
                + p.nextSteps.map(function(s, si) { return '<div style="font-size:0.78em; color:var(--text-secondary); padding:2px 0;">' + (si+1) + '. ' + escapeHtml(s) + '</div>'; }).join('')
                + '</div>' : '')
            + '</div>';
    }).join('');

    el.innerHTML = `
        ${wizardHeading('\uD83D\uDEE4\uFE0F', 'Your Career Paths',
            paths.length > 0 ? 'Based on your skills and interests, here are career paths that could be a great fit. Select one to focus your Blueprint around it.' : 'No career paths were generated. You can still complete your Explorer Blueprint.')}
        <div style="display:grid; gap:12px; margin-bottom:20px;">${pathCards}</div>
        <div style="display:flex; justify-content:space-between; margin-top:20px;">
            ${wizardBtn('Back', 'wizardBack()', 'secondary')}
            ${wizardBtn('Complete Blueprint \u2192', 'explorerSaveCareers()', 'primary')}
        </div>
    `;
}

export function explorerSelectCareer(idx) {
    wizardState.explorerData.selectedCareerIdx = idx;
    renderWizardStep();
}

export function explorerSaveCareers() {
    wizardState.values = (wizardState.explorerData.suggestedValues || []).map(function(v) {
        return { name: v, selected: true, description: '' };
    });
    wizardState.purpose = wizardState.explorerData.purpose || '';
    wizardState.profile = {
        name: '',
        currentTitle: wizardState.explorerData.headline || (wizardState.explorerData.education.major || 'Student') + ' | Explorer',
        yearsExperience: 0,
        location: ''
    };
    wizardNext();
}

export function renderExplorerComplete(el) {
    var ed = wizardState.explorerData;
    var skillCount = (wizardState.skills || []).length;
    var pathCount = (ed.careerPaths || []).length;
    var selectedPath = typeof ed.selectedCareerIdx === 'number' ? ed.careerPaths[ed.selectedCareerIdx] : null;

    el.innerHTML = `
        ${wizardHeading('\uD83C\uDF89', 'Your Explorer Blueprint is Ready!',
            'We\u2019ve built your initial profile from your education, activities, and interests. This is your starting point \u2014 it will grow as you gain experience.')}

        <div style="${explorerCardStyle}">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; text-align:center;">
                <div style="padding:14px; background:rgba(96,165,250,0.08); border-radius:10px;">
                    <div style="font-size:1.8em; font-weight:700; color:#60a5fa;">${skillCount}</div>
                    <div style="font-size:0.78em; color:var(--text-muted);">Skills Discovered</div>
                </div>
                <div style="padding:14px; background:rgba(139,92,246,0.08); border-radius:10px;">
                    <div style="font-size:1.8em; font-weight:700; color:#8b5cf6;">${pathCount}</div>
                    <div style="font-size:0.78em; color:var(--text-muted);">Career Paths</div>
                </div>
            </div>
        </div>

        ${selectedPath ? `
        <div style="${explorerCardStyle} border-color:#8b5cf640;">
            <div style="font-size:0.72em; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#8b5cf6; margin-bottom:6px;">Focused Career Path</div>
            <div style="font-weight:700; color:var(--text-primary); font-size:1.05em; margin-bottom:4px;">${escapeHtml(selectedPath.title)}</div>
            <div style="font-size:0.82em; color:var(--text-secondary); line-height:1.5;">${escapeHtml(selectedPath.whyFit)}</div>
        </div>` : ''}

        <div style="${explorerCardStyle}">
            <div style="font-weight:600; color:var(--text-primary); margin-bottom:8px; font-size:0.9em;">Your name</div>
            <input type="text" id="expFinalName" placeholder="Your full name" style="${explorerFieldStyle}" value="${escapeAttr(wizardState.profile.name || '')}">
            <div style="font-size:0.75em; color:var(--text-muted); margin-top:4px;">This will appear on your Blueprint profile.</div>
        </div>

        <div style="padding:14px 18px; background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.2); border-radius:10px; margin-bottom:16px;">
            <div style="font-size:0.85em; color:var(--text-secondary); line-height:1.6;">
                <strong style="color:#8b5cf6;">Explorer Mode</strong> \u2014 Your Blueprint focuses on potential and transferable skills.
                Once you land your first role, you can convert to a full Blueprint with salary data, market valuation, and advanced evidence tracking.
            </div>
        </div>

        <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
            <button onclick="explorerLaunch()" style="width:100%; max-width:360px; background:linear-gradient(135deg,#8b5cf6,#60a5fa); color:#fff; border:none; border-radius:12px; padding:14px 28px; cursor:pointer; font-weight:700; font-size:1em;">
                Launch My Explorer Blueprint
            </button>
        </div>
    `;
}

export function explorerLaunch() {
    var nameInput = document.getElementById('expFinalName');
    if (nameInput) wizardState.profile.name = nameInput.value.trim();

    var ed = wizardState.explorerData;
    var selectedPath = typeof ed.selectedCareerIdx === 'number' ? ed.careerPaths[ed.selectedCareerIdx] : null;

    var built = {
        initialized: true,
        templateId: 'explorer-built',
        profileType: 'explorer',
        explorerData: {
            education: ed.education,
            activities: ed.activities,
            interests: ed.interests,
            partTimeJobs: ed.partTimeJobs,
            driveStatement: ed.driveStatement || '',
            careerPaths: ed.careerPaths || [],
            selectedCareerIdx: ed.selectedCareerIdx,
            discoveredSkills: ed.discoveredSkills || []
        },
        profile: {
            ...wizardState.profile,
            headline: wizardState.profile.currentTitle || ''
        },
        skills: (wizardState.skills || []).map(function(s) {
            return { ...s, roles: s.roles || [], key: false };
        }),
        roles: selectedPath ? [{ id: 'target1', name: selectedPath.title, company: 'Target Role', years: '', color: '#8b5cf6' }] : [],
        values: wizardState.values || [],
        purpose: wizardState.purpose || '',
        workHistory: (ed.partTimeJobs || []).filter(function(j) { return j.title; }).map(function(j, i) {
            return { title: j.title, company: j.company || '', startDate: '', endDate: '', current: false, description: j.description || '' };
        }),
        companyTenures: [],
        education: [{
            school: ed.education.school || '',
            degree: (ed.education.degree || '') + ' in ' + (ed.education.major || ''),
            fieldOfStudy: ed.education.major || '',
            graduationYear: ed.education.gradYear || '',
            gpa: ed.education.gpa || ''
        }],
        certifications: [],
        verifications: [],
        linkedinContent: {},
        importStats: {},
        preferences: { seniorityLevel: 'Entry', minimumMatchScore: 40, minimumSkillMatches: 2 },
        applications: []
    };

    wizardApplyAndLaunch(built);
}

// ═══════════════════════════════════════════════════════════════════════
// END EXPLORER MODE
// ═══════════════════════════════════════════════════════════════════════

export function wizardBuildUserData() {
    return {
        initialized: true,
        templateId: 'wizard-built',
        profile: {
            ...wizardState.profile,
            headline: `${wizardState.profile.currentTitle || ''} · ${wizardState.profile.yearsExperience || ''}+ Years`
        },
        skills: wizardState.skills.map(s => ({
            ...s,
            roles: s.roles || [],
            key: s.key || false,
            onetId: s.onetId || null,
            endorsements: s.endorsements || 0,
            endorsementBoosted: s.endorsementBoosted || false
        })),
        roles: (wizardState.parsedData?.roles || []).map((r, i) => ({
            id: r.id || `role${i+1}`,
            name: r.name || r.company || `Role ${i+1}`,
            company: r.company || '',
            years: r.years || '',
            progression: r.progression || null,
            totalYears: r.totalYears || null,
            color: ['#fb923c','#f59e0b','#a78bfa','#10b981','#3b82f6','#8b5cf6','#ec4899'][i % 7]
        })),
        values: wizardState.values,
        purpose: wizardState.purpose,
        workHistory: wizardState.workHistory || [],
        companyTenures: wizardState.companyTenures || [],
        education: wizardState.education || [],
        certifications: wizardState.certifications || [],
        verifications: [],
        // LinkedIn content repository
        linkedinContent: {
            endorsements: wizardState.endorsements || {},
            recommendations: wizardState.recommendations || [],
            volunteering: wizardState.volunteering || [],
            honors: wizardState.honors || [],
            causes: wizardState.causes || [],
            organizations: wizardState.organizations || [],
            articles: (wizardState.articles || []).map(function(a) {
                return { title: a.title, created: a.created, wordCount: a.wordCount, text: a.text };
            }),
            posts: (wizardState.richMedia || []).map(function(p) {
                return { date: p.date, content: p.content.substring(0, 1500) };
            }),
            learning: wizardState.learning || [],
            networkSize: wizardState.networkSize || 0
        },
        importStats: wizardState.importStats || {},
        preferences: { seniorityLevel: 'Senior', minimumMatchScore: 60, minimumSkillMatches: 3 },
        applications: []
    };
}

export function wizardSaveAndGo() {
    var built = wizardBuildUserData();
    // Download JSON if checkbox is checked
    var dlCheck = document.getElementById('wizardDownloadCheck');
    if (dlCheck && dlCheck.checked) {
        var blob = new Blob([JSON.stringify(built, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'blueprint-' + (built.profile.name || 'profile').toLowerCase().replace(/\s+/g, '-') + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }
    wizardApplyAndLaunch(built);
}

export function wizardDownloadBackup() {
    const built = wizardBuildUserData();
    // Download JSON backup
    const blob = new Blob([JSON.stringify(built, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint-${(built.profile.name || 'profile').toLowerCase().replace(/\s+/g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup downloaded.', 'info');
}

export function wizardLaunchOnly() {
    wizardApplyAndLaunch(wizardBuildUserData());
}

export function wizardApplyAndLaunch(built) {
    userData = built;
    window._userData.initialized = true;
    window._userData = userData;
    safeSet('currentProfile', 'wizard-built');

    // Store wizard profile in templates so it loads on reload
    templates['wizard-built'] = built;

    // Update all data structures BEFORE saving to Firestore
    // (saveToFirestore reads from skillsData and blueprintData, not userData directly)
    normalizeUserRoles();
    _sd().skills = window._userData.skills || [];
    _sd().roles = window._userData.roles || [];
    _sd().skillDetails = {};
    _bd().values = window._userData.values || [];
    _bd().purpose = window._userData.purpose || '';
    _bd().outcomes = window._userData.outcomes || [];

    // Save to Firestore if signed in
    if (fbUser && fbDb) {
        saveToFirestore().then(function(ok) {
            if (ok) {
                showToast('Profile saved to your account.', 'success');
            } else {
                showToast('Profile save failed. Use Download Backup to keep your data.', 'warning', 6000);
                logIncident('critical', 'wizard-save', 'Firestore save returned false after wizard completion');
            }
        }).catch(function(err) {
            showToast('Save error: ' + err.message, 'error', 6000);
            logIncident('critical', 'wizard-save', 'Firestore save threw: ' + err.message);
        });
    } else {
        // Prompt to sign in so data persists
        showToast('Sign in to save your profile permanently.', 'info');
    }

    closeWizard();
    renderFilterChips();
    // Only update chip for non-signed-in users (signed-in users get chip from updateAuthUI)
    if (!fbUser) {
        updateProfileChip(window._userData.profile.name || 'My Profile');
    }
    // Reset tab initialization flags so they re-render with new data
    window.blueprintInitialized = false;
    window.opportunitiesInitialized = false;
    window.applicationsInitialized = false;
    window.consentInitialized = false;
    window.networkInitialized = false;
    window.cardViewInitialized = false;
    // Network will re-init when user navigates to Skills tab (lazy init)
    switchView('network');
}

// Normalize roles: ensure every role has id, color, and skills list
function normalizeUserRoles() {
    var roleColors = ['#3b82f6', '#fb923c', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#84cc16'];
    var bannedReds = ['#ef4444','#f87171','#dc2626','#b91c1c','#fca5a5','#fee2e2'];
    (window._userData.roles || []).forEach(function(role, i) {
        if (!role.id) role.id = role.name;
        if (!role.color || bannedReds.indexOf(role.color) !== -1) role.color = roleColors[i % roleColors.length];
        if (!role.skills) {
            role.skills = [];
            (window._userData.skills || []).forEach(function(s) {
                if (s.roles && (s.roles.indexOf(role.id) !== -1 || s.roles.indexOf(role.name) !== -1)) {
                    if (role.skills.indexOf(s.name) === -1) role.skills.push(s.name);
                }
            });
        }
    });
}

// Initialize main app with user data
async function initializeMainApp() {
    if (!window._userData || !window._userData.initialized) {
        await waitForUserData();
    }
    normalizeUserRoles();
    // Replace skillsData with userData
    _sd().skills = window._userData.skills || [];
    _sd().roles = window._userData.roles || _sd().roles;
    _sd().skillDetails = window._userData.skillDetails || {};

// Expose wizard and nav functions to global scope for onclick handlers
if (!window.showOnboardingWizard) window.showOnboardingWizard = showOnboardingWizard;
if (!window.wizardChooseUpload) window.wizardChooseUpload = wizardChooseUpload;
if (!window.wizardChooseLinkedIn) window.wizardChooseLinkedIn = wizardChooseLinkedIn;
if (!window.wizardChooseManual) window.wizardChooseManual = wizardChooseManual;
if (!window.wizardChooseImport) window.wizardChooseImport = wizardChooseImport;
if (!window.wizardImportProfile) window.wizardImportProfile = wizardImportProfile;
if (!window.wizardBack) window.wizardBack = wizardBack;
if (!window.wizardNext) window.wizardNext = wizardNext;
if (!window.wizardSetResumeTab) window.wizardSetResumeTab = wizardSetResumeTab;
if (!window.wizardHandleResumeDrop) window.wizardHandleResumeDrop = wizardHandleResumeDrop;
if (!window.wizardHandleResumeFile) window.wizardHandleResumeFile = wizardHandleResumeFile;
if (!window.wizardClearResumeFile) window.wizardClearResumeFile = wizardClearResumeFile;
if (!window.wizardSkipParsing) window.wizardSkipParsing = wizardSkipParsing;
if (!window.wizardStartParsing) window.wizardStartParsing = wizardStartParsing;
if (!window.wizardHandleLinkedInDrop) window.wizardHandleLinkedInDrop = wizardHandleLinkedInDrop;
if (!window.wizardHandleLinkedInFile) window.wizardHandleLinkedInFile = wizardHandleLinkedInFile;
if (!window.wizardSaveProfile) window.wizardSaveProfile = wizardSaveProfile;
if (!window.wizardSaveSkills) window.wizardSaveSkills = wizardSaveSkills;
if (!window.wizardToggleValue) window.wizardToggleValue = wizardToggleValue;
if (!window.wizardSaveValues) window.wizardSaveValues = wizardSaveValues;
if (!window.wizardSavePurpose) window.wizardSavePurpose = wizardSavePurpose;
if (!window.wizardRegeneratePurpose) window.wizardRegeneratePurpose = wizardRegeneratePurpose;
if (!window.wizardDownloadBackup) window.wizardDownloadBackup = wizardDownloadBackup;
if (!window.wizardLaunchOnly) window.wizardLaunchOnly = wizardLaunchOnly;
if (!window.wizardSaveAndGo) window.wizardSaveAndGo = wizardSaveAndGo;
if (!window.confirmExitWizard) window.confirmExitWizard = confirmExitWizard;
if (!window.toggleFilterPanel) window.toggleFilterPanel = toggleFilterPanel;
if (!window.renderFilterChips) window.renderFilterChips = renderFilterChips;

    // Render dynamic filter chips from profile data
    renderFilterChips();

    // Show mobile nav on small screens
    if (window.innerWidth <= 768) {
        const mobileNav = document.getElementById('mobileNav');
        if (mobileNav) mobileNav.style.display = 'flex';
    }
    
    console.log('✓ Main app initialized with', window._userData.skills.length, 'skills');
    if (typeof bpTracker !== 'undefined' && bpTracker.sid && window._userData.skills.length > 0) bpTracker.trackFunnel('skills_added');
    hydrateIcons();
}

// Export current profile

// ===== END v2.0 USER DATA MANAGEMENT =====

// Load skill evidence dynamically
fetch('skill_evidence.json')
    .then(response => response.json())
    .then(data => {
        _sd().skillDetails = data;
        console.log('✓ Loaded evidence for', Object.keys(data).length, 'skills');
    })
    .catch(error => console.error('Error loading skill evidence:', error));

const levelColors = {
    "Mastery":    "#10b981",
    "Expert":     "#fb923c",
    "Advanced":   "#a78bfa",
    "Proficient": "#60a5fa",
    "Novice":     "#94a3b8"
};

let currentView = 'network';
let activeRole = 'all';
let activeLevel = null;
let simulation;

// Job overlay state
let networkMatchMode = 'you'; // 'you' | 'job' | 'match'
let activeJobForNetwork = null; // saved job object when overlay is active

// ===== NETWORK JOB SELECTOR WIDGET =====
if (!window.renderWelcomePage) window.renderWelcomePage = renderWelcomePage;
if (!window.initHeroNetwork) window.initHeroNetwork = initHeroNetwork;
if (!window.viewSampleProfile) window.viewSampleProfile = viewSampleProfile;
if (!window.selectShowCollection) window.selectShowCollection = selectShowCollection;
if (!window.showWelcomeView) window.showWelcomeView = showWelcomeView;
if (!window.showBlsCategoryEditor) window.showBlsCategoryEditor = showBlsCategoryEditor;
if (!window.saveBlsCategoryOverride) window.saveBlsCategoryOverride = saveBlsCategoryOverride;
if (!window.clearBlsCategoryOverride) window.clearBlsCategoryOverride = clearBlsCategoryOverride;
if (!window.setValuationMode) window.setValuationMode = setValuationMode;
if (!window.formatCompValue) window.formatCompValue = formatCompValue;
if (!window.getEffectiveComp) window.getEffectiveComp = getEffectiveComp;
if (!window.loadEvidenceConfig) window.loadEvidenceConfig = loadEvidenceConfig;
if (!window.saveEvidenceConfig) window.saveEvidenceConfig = saveEvidenceConfig;
if (!window.scoreOutcome) window.scoreOutcome = scoreOutcome;
if (!window.calculateEvidencePoints) window.calculateEvidencePoints = calculateEvidencePoints;
if (!window.getEffectiveLevel) window.getEffectiveLevel = getEffectiveLevel;
if (!window.getEffectiveLevelFromPoints) window.getEffectiveLevelFromPoints = getEffectiveLevelFromPoints;
if (!window.hasLinkedCertification) window.hasLinkedCertification = hasLinkedCertification;
if (!window.getHighestCertTier) window.getHighestCertTier = getHighestCertTier;
if (!window.getSkillVerifications) window.getSkillVerifications = getSkillVerifications;
if (!window.getValuationLevel) window.getValuationLevel = getValuationLevel;
if (!window.getEvidenceSummary) window.getEvidenceSummary = getEvidenceSummary;
if (!window.requestVerification) window.requestVerification = requestVerification;
if (!window.sendVerificationRequest) window.sendVerificationRequest = sendVerificationRequest;
if (!window.confirmVerification) window.confirmVerification = confirmVerification;
if (!window.declineVerification) window.declineVerification = declineVerification;
if (!window.getVerificationStats) window.getVerificationStats = getVerificationStats;
if (!window.expireStalePendingVerifications) window.expireStalePendingVerifications = expireStalePendingVerifications;
if (!window.getCredibilityLabel) window.getCredibilityLabel = getCredibilityLabel;
if (!window.checkVerificationLandingPage) window.checkVerificationLandingPage = checkVerificationLandingPage;
if (!window.checkShowcaseMode) window.checkShowcaseMode = checkShowcaseMode;
if (!window.showVerifierLandingPage) window.showVerifierLandingPage = showVerifierLandingPage;
if (!window.fetchVerificationData) window.fetchVerificationData = fetchVerificationData;
if (!window.renderVerifierForm) window.renderVerifierForm = renderVerifierForm;
if (!window.submitVerifierResponse) window.submitVerifierResponse = submitVerifierResponse;
if (!window.addOutcomeToSkill) window.addOutcomeToSkill = addOutcomeToSkill;
if (!window.editSkillOutcome) window.editSkillOutcome = editSkillOutcome;
if (!window.removeOutcome) window.removeOutcome = removeOutcome;
if (!window.showOutcomeForm) window.showOutcomeForm = showOutcomeForm;
if (!window.updateOutcomeScorePreview) window.updateOutcomeScorePreview = updateOutcomeScorePreview;
if (!window.saveOutcomeForm) window.saveOutcomeForm = saveOutcomeForm;
if (!window.cancelOutcomeForm) window.cancelOutcomeForm = cancelOutcomeForm;
if (!window.getCertSkillAssociations) window.getCertSkillAssociations = getCertSkillAssociations;
if (!window.getFallbackSkillMatches) window.getFallbackSkillMatches = getFallbackSkillMatches;
if (!window.getCertFloorLevel) window.getCertFloorLevel = getCertFloorLevel;
if (!window.buildProfileSelector) window.buildProfileSelector = buildProfileSelector;
if (!window.switchProfile) window.switchProfile = switchProfile;
if (!window.getCategoryColor) window.getCategoryColor = getCategoryColor;
if (!window.isSkillAlreadyAdded) window.isSkillAlreadyAdded = isSkillAlreadyAdded;
if (!window.showSkillCapTriage) window.showSkillCapTriage = showSkillCapTriage;
if (!window.updateTriageCount) window.updateTriageCount = updateTriageCount;
if (!window.confirmSkillCapTriage) window.confirmSkillCapTriage = confirmSkillCapTriage;
if (!window.getSampleJobsForProfile) window.getSampleJobsForProfile = getSampleJobsForProfile;
if (!window.loadTemplate) window.loadTemplate = loadTemplate;
if (!window.showOnboardingWizard) window.showOnboardingWizard = showOnboardingWizard;
if (!window.closeWizard) window.closeWizard = closeWizard;
if (!window.renderWizardStep) window.renderWizardStep = renderWizardStep;
if (!window.wizardNext) window.wizardNext = wizardNext;
if (!window.wizardBack) window.wizardBack = wizardBack;
if (!window.confirmExitWizard) window.confirmExitWizard = confirmExitWizard;
if (!window.wizardHeading) window.wizardHeading = wizardHeading;
if (!window.wizardBtn) window.wizardBtn = wizardBtn;
if (!window.openMergeComparisonModal) window.openMergeComparisonModal = openMergeComparisonModal;
if (!window.mergeToggleAll) window.mergeToggleAll = mergeToggleAll;
if (!window.applyMergeSelections) window.applyMergeSelections = applyMergeSelections;
if (!window.renderWizardStep1) window.renderWizardStep1 = renderWizardStep1;
if (!window.wizardOverwriteGuard) window.wizardOverwriteGuard = wizardOverwriteGuard;
if (!window.wizardQuickExport) window.wizardQuickExport = wizardQuickExport;
if (!window.wizardChooseUpload) window.wizardChooseUpload = wizardChooseUpload;
if (!window.wizardChooseLinkedIn) window.wizardChooseLinkedIn = wizardChooseLinkedIn;
if (!window.wizardChooseManual) window.wizardChooseManual = wizardChooseManual;
if (!window.wizardChooseImport) window.wizardChooseImport = wizardChooseImport;
if (!window.wizardImportProfile) window.wizardImportProfile = wizardImportProfile;
if (!window.renderWizardStep2) window.renderWizardStep2 = renderWizardStep2;
if (!window.wizardSetResumeTab) window.wizardSetResumeTab = wizardSetResumeTab;
if (!window.wizardHandleResumeDrop) window.wizardHandleResumeDrop = wizardHandleResumeDrop;
if (!window.wizardHandleResumeFile) window.wizardHandleResumeFile = wizardHandleResumeFile;
if (!window.wizardProcessResumeFile) window.wizardProcessResumeFile = wizardProcessResumeFile;
if (!window.wizardClearResumeFile) window.wizardClearResumeFile = wizardClearResumeFile;
if (!window.wizardCheckResumeReady) window.wizardCheckResumeReady = wizardCheckResumeReady;
if (!window.wizardSkipParsing) window.wizardSkipParsing = wizardSkipParsing;
if (!window.renderWizardStep2LinkedIn) window.renderWizardStep2LinkedIn = renderWizardStep2LinkedIn;
if (!window.wizardHandleLinkedInDrop) window.wizardHandleLinkedInDrop = wizardHandleLinkedInDrop;
if (!window.wizardHandleLinkedInFile) window.wizardHandleLinkedInFile = wizardHandleLinkedInFile;
if (!window.renderWizardStep3) window.renderWizardStep3 = renderWizardStep3;
if (!window.renderWizardStep4) window.renderWizardStep4 = renderWizardStep4;
if (!window.wizardField) window.wizardField = wizardField;
if (!window.wizardSaveProfile) window.wizardSaveProfile = wizardSaveProfile;
if (!window.renderWizardStep5) window.renderWizardStep5 = renderWizardStep5;
if (!window.wizardSaveEnrichment) window.wizardSaveEnrichment = wizardSaveEnrichment;
if (!window.renderWizardStep6) window.renderWizardStep6 = renderWizardStep6;
if (!window.wizardSaveSkills) window.wizardSaveSkills = wizardSaveSkills;
if (!window.renderWizardStep7) window.renderWizardStep7 = renderWizardStep7;
if (!window.wizardToggleValue) window.wizardToggleValue = wizardToggleValue;
if (!window.wizardEditValueDesc) window.wizardEditValueDesc = wizardEditValueDesc;
if (!window.wizardAddCustomValue) window.wizardAddCustomValue = wizardAddCustomValue;
if (!window.wizardSaveValues) window.wizardSaveValues = wizardSaveValues;
if (!window.renderWizardStep8) window.renderWizardStep8 = renderWizardStep8;
if (!window.wizardSavePurpose) window.wizardSavePurpose = wizardSavePurpose;
if (!window.renderWizardStep9) window.renderWizardStep9 = renderWizardStep9;
if (!window.wizardApplyContentOpts) window.wizardApplyContentOpts = wizardApplyContentOpts;
if (!window.wizardBuildUserData) window.wizardBuildUserData = wizardBuildUserData;
if (!window.wizardSaveAndGo) window.wizardSaveAndGo = wizardSaveAndGo;
if (!window.wizardDownloadBackup) window.wizardDownloadBackup = wizardDownloadBackup;
if (!window.wizardLaunchOnly) window.wizardLaunchOnly = wizardLaunchOnly;
if (!window.wizardApplyAndLaunch) window.wizardApplyAndLaunch = wizardApplyAndLaunch;
if (!window.wizardChooseExplorer) window.wizardChooseExplorer = wizardChooseExplorer;
if (!window.renderExplorerEducation) window.renderExplorerEducation = renderExplorerEducation;
if (!window.explorerSaveEducation) window.explorerSaveEducation = explorerSaveEducation;
if (!window.renderExplorerActivities) window.renderExplorerActivities = renderExplorerActivities;
if (!window.explorerToggleActivity) window.explorerToggleActivity = explorerToggleActivity;
if (!window.explorerUpdateActivity) window.explorerUpdateActivity = explorerUpdateActivity;
if (!window.explorerRemoveActivity) window.explorerRemoveActivity = explorerRemoveActivity;
if (!window.explorerAddJob) window.explorerAddJob = explorerAddJob;
if (!window.explorerUpdateJob) window.explorerUpdateJob = explorerUpdateJob;
if (!window.explorerRemoveJob) window.explorerRemoveJob = explorerRemoveJob;
if (!window.explorerSaveActivities) window.explorerSaveActivities = explorerSaveActivities;
if (!window.renderExplorerInterests) window.renderExplorerInterests = renderExplorerInterests;
if (!window.explorerToggleInterest) window.explorerToggleInterest = explorerToggleInterest;
if (!window.explorerAddCustomInterest) window.explorerAddCustomInterest = explorerAddCustomInterest;
if (!window.explorerSaveInterests) window.explorerSaveInterests = explorerSaveInterests;
if (!window.explorerRunSkillDiscovery) window.explorerRunSkillDiscovery = explorerRunSkillDiscovery;
if (!window.renderExplorerSkills) window.renderExplorerSkills = renderExplorerSkills;
if (!window.explorerToggleSkill) window.explorerToggleSkill = explorerToggleSkill;
if (!window.explorerSelectAllSkills) window.explorerSelectAllSkills = explorerSelectAllSkills;
if (!window.explorerSaveSkills) window.explorerSaveSkills = explorerSaveSkills;
if (!window.renderExplorerCareers) window.renderExplorerCareers = renderExplorerCareers;
if (!window.explorerSelectCareer) window.explorerSelectCareer = explorerSelectCareer;
if (!window.explorerSaveCareers) window.explorerSaveCareers = explorerSaveCareers;
if (!window.renderExplorerComplete) window.renderExplorerComplete = renderExplorerComplete;
if (!window.explorerLaunch) window.explorerLaunch = explorerLaunch;
