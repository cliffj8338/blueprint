// ui/profile-dropdown.js — Blueprint v4.46.21
// Phase 8b extraction — Profile dropdown, overflow menu, help, resize handler

import { bpIcon }      from './icons.js';
import { escapeHtml }  from '../core/security.js';


// ===== PROFILE DROPDOWN =====
// Profile dropdown removed — stubs for backward compat
export function toggleProfileDropdown(event) { if (event) event.stopPropagation(); }
window.toggleProfileDropdown = toggleProfileDropdown;
export function closeProfileDropdown() { /* no-op */ }
window.closeProfileDropdown = closeProfileDropdown;
export function buildProfileDropdown() { /* no-op */ }

function updateProfileChip(name) {
    if (!name) return;
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const avatar = document.getElementById('profileAvatar');
    const chipName = document.getElementById('profileChipName');
    if (avatar) {
        // In demo mode, only use the sample profile's own photo (not the signed-in user's Google photo)
        var isDemo = appContext && appContext.mode === 'demo';
        var photoURL = (window._userData.profile && window._userData.profile.photo) || (!isDemo && fbUser && fbUser.photoURL) || null;
        if (photoURL) {
            safeSetAvatar(avatar, photoURL, true);
        } else {
            avatar.textContent = initials;
        }
    }
    if (chipName) chipName.textContent = name;
    document.title = 'Blueprint\u2122';
}

// ===== FILTER PANEL TOGGLE =====
function toggleFilterPanel() {
    const panel = document.getElementById('filterPanel');
    const btn = document.getElementById('filterToggleBtn');
    const isOpen = panel.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
}

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
    // Close overflow menu
    const menu = document.getElementById('overflowMenu');
    const moreBtn = document.getElementById('overflowMenuBtn');
    if (menu && moreBtn && menu.style.display === 'block') {
        if (!menu.contains(e.target) && !moreBtn.contains(e.target)) closeOverflowMenu();
    }
});

export function toggleOverflowMenu(event) {
    if (event) {
        event.stopPropagation();
    }
    // Close profile dropdown if open
    closeProfileDropdown();
    
    const menu = document.getElementById('overflowMenu');
    const btn = document.getElementById('overflowMenuBtn');
    const isVisible = menu.style.display === 'block';
    
    if (isVisible) {
        menu.style.display = 'none';
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
    } else {
        menu.style.display = 'block';
        btn.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
    }
}

export function closeOverflowMenu() {
    const menu = document.getElementById('overflowMenu');
    const btn = document.getElementById('overflowMenuBtn');
    if (menu) menu.style.display = 'none';
    if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-expanded', 'false'); }
}

export function showHelp() {
    const modal = document.getElementById('exportModal');
    const modalContent = modal.querySelector('.modal-content');
    
    // Demo-aware banner
    var demoBanner = '';
    if (isReadOnlyProfile) {
        var ctaAction = appMode === 'waitlisted'
            ? "closeExportModal(); showToast('You are #" + (waitlistPosition || '?') + " on the waitlist!', 'info');"
            : 'closeExportModal(); showWaitlist();';
        var ctaText = appMode === 'waitlisted' ? 'You\u2019re #' + (waitlistPosition || '?') + ' on the waitlist \u2714' : 'Join the Waitlist \u2192';
        demoBanner = '<div style="background:linear-gradient(135deg, rgba(96,165,250,0.12), rgba(99,102,241,0.08)); border:1px solid rgba(96,165,250,0.25); border-radius:12px; padding:20px; margin-bottom:24px;">'
            + '<div style="font-weight:700; color:#60a5fa; margin-bottom:8px; font-size:0.95em;">\uD83D\uDD0D You\u2019re exploring a sample profile</div>'
            + '<div style="color:var(--c-muted, #9ca3af); font-size:0.88em; line-height:1.6; margin-bottom:12px;">'
            + 'Everything you see is fully interactive \u2014 browse skills, explore job matches, compare values. '
            + 'The one export available is the <strong style="color:#10b981;">Scouting Report PDF</strong>, so you can see what Blueprint delivers to hiring teams.</div>'
            + '<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:14px;">'
            + '<div style="font-size:0.78em; font-weight:600; color:var(--c-faint, #6b7280); min-width:100%;">AVAILABLE NOW:</div>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(16,185,129,0.15); color:#10b981;">Browse all tabs</span>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(16,185,129,0.15); color:#10b981;">Skill networks</span>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(16,185,129,0.15); color:#10b981;">Job matching</span>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(16,185,129,0.15); color:#10b981;">Scouting Report PDF</span>'
            + '</div>'
            + '<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:16px;">'
            + '<div style="font-size:0.78em; font-weight:600; color:var(--c-faint, #6b7280); min-width:100%;">WITH YOUR OWN BLUEPRINT:</div>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(96,165,250,0.15); color:#60a5fa;">Shareable HTML reports</span>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(96,165,250,0.15); color:#60a5fa;">Executive Blueprint</span>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(96,165,250,0.15); color:#60a5fa;">Resume &amp; cover letters</span>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(96,165,250,0.15); color:#60a5fa;">Interview prep</span>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(96,165,250,0.15); color:#60a5fa;">Negotiation guide</span>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(96,165,250,0.15); color:#60a5fa;">LinkedIn optimizer</span>'
            + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:rgba(96,165,250,0.15); color:#60a5fa;">Share links</span>'
            + '</div>'
            + '<button onclick="' + ctaAction + '" style="padding:10px 24px; border-radius:8px; border:none; background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; font-weight:600; font-size:0.88em; cursor:pointer;">' + ctaText + '</button>'
            + '</div>';
    }
    
    var settingsHelp = isReadOnlyProfile ? '' : '<div style="display: flex; gap: 15px; align-items: start;">'
        + '<div style="min-width: 40px;">' + bpIcon("settings",28) + '</div>'
        + '<div>'
        + '<div style="color: #60a5fa; font-weight: 600; margin-bottom: 5px;">Settings (More menu)</div>'
        + '<div style="color: #d1d5db; font-size: 0.95em; line-height: 1.6;">Update your profile info, preferences, and manage your skills. Export your full profile as JSON to save your work or move it to another device.</div>'
        + '</div></div>';
    
    var scoutingDesc = isReadOnlyProfile
        ? 'Generate a Scouting Report PDF to see how Blueprint builds targeted career intelligence for a specific job \u2014 match analysis, gap bridging, verified credentials, and market positioning.'
        : 'Your premium career intelligence artifact. Each scouting report is a standalone, shareable document built for a specific job \u2014 including interactive skill/value networks, match analysis, gap bridging, verified credentials, and blind mode for bias-free evaluation.';
    
    var blueprintDesc = 'Your source of truth. See your market valuation, manage outcomes, choose values, and write your purpose statement.'
        + (isReadOnlyProfile ? '' : ' Export as a resume or personalized page to share with recruiters.');
    
    modalContent.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left"><h2 class="modal-title">How to Use Blueprint</h2></div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding: 30px;">'
        // Preview disclosure
        + '<div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.18); border-radius:10px; padding:16px; margin-bottom:20px;">'
        + '<div style="font-size:0.85em; color:#fbbf24; font-weight:700; margin-bottom:6px;">\u26A1 Active Preview</div>'
        + '<div style="font-size:0.82em; color:var(--c-muted, #9ca3af); line-height:1.6; margin-bottom:10px;">'
        + 'Blueprint is in active development. What you\u2019re exploring is a working preview \u2014 features are shipping weekly and the platform is evolving fast. '
        + 'Sample scouting reports are available for select characters during the preview. Your feedback directly shapes what gets built next.'
        + '</div>'
        + '<button onclick="closeExportModal(); sendFeedback(\'help\');" style="padding:7px 16px; border-radius:7px; border:1px solid rgba(245,158,11,0.25); background:rgba(245,158,11,0.08); color:#fbbf24; font-weight:600; font-size:0.78em; cursor:pointer; transition:all 0.2s;"'
        + ' onmouseover="this.style.background=\'rgba(245,158,11,0.15)\'" onmouseout="this.style.background=\'rgba(245,158,11,0.08)\'">'
        + '\u2709 Give Feedback</button>'
        + '</div>'
        + demoBanner
        + '<div style="display: flex; flex-direction: column; gap: 20px;">'
        // Skills Network
        + '<div style="display: flex; gap: 15px; align-items: start;">'
        + '<div style="min-width: 40px;">' + bpIcon("compass",28) + '</div>'
        + '<div>'
        + '<div style="color: #60a5fa; font-weight: 600; margin-bottom: 5px;">Skills Network</div>'
        + '<div style="color: #d1d5db; font-size: 0.95em; line-height: 1.6;">Your interactive skill constellation. Every node is a skill; every cluster is a professional domain.</div>'
        + '<div style="margin-top:10px; padding:12px 14px; background:rgba(96,165,250,0.08); border:1px solid rgba(96,165,250,0.2); border-radius:8px;">'
        + '<div style="font-size:0.82em; color:#60a5fa; font-weight:700; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em;">Network Controls</div>'
        + '<div style="display:grid; gap:6px; font-size:0.88em; color:#d1d5db;">'
        + '<div><strong style="color:#f59e0b;">Drag</strong> any node to rearrange the layout \u2014 the network remembers where you put things</div>'
        + '<div><strong style="color:#f59e0b;">Hover</strong> over a skill to highlight its connections and see which domains it bridges</div>'
        + '<div><strong style="color:#f59e0b;">Click a skill</strong> to open its detail card with evidence, proficiency level, and role assignments</div>'
        + '<div><strong style="color:#f59e0b;">Click a domain</strong> (large node) to filter the network to just that role cluster</div>'
        + '<div><strong style="color:#f59e0b;">Match Overlay</strong> \u2014 select a job from the Pipeline, then return to Skills. Four overlay modes light up: <em>You \u00B7 Job \u00B7 Match \u00B7 Values</em></div>'
        + '</div></div></div></div>'
        // Jobs Tab
        + '<div style="display: flex; gap: 15px; align-items: start;">'
        + '<div style="min-width: 40px;">' + bpIcon("briefcase",28) + '</div>'
        + '<div>'
        + '<div style="color: #60a5fa; font-weight: 600; margin-bottom: 5px;">Jobs Tab</div>'
        + '<div style="color: #d1d5db; font-size: 0.95em; line-height: 1.6;">Find opportunities matched to your actual skill profile. Skills you have are highlighted green; gaps shown in red. Generate a personalized outreach message for any role.</div>'
        + '</div></div>'
        // Blueprint Tab
        + '<div style="display: flex; gap: 15px; align-items: start;">'
        + '<div style="min-width: 40px;">' + bpIcon("bar-chart",28) + '</div>'
        + '<div>'
        + '<div style="color: #60a5fa; font-weight: 600; margin-bottom: 5px;">Blueprint Tab</div>'
        + '<div style="color: #d1d5db; font-size: 0.95em; line-height: 1.6;">' + blueprintDesc + '</div>'
        + '</div></div>'
        // Scouting Reports
        + '<div style="display: flex; gap: 15px; align-items: start;">'
        + '<div style="min-width: 40px;">' + bpIcon("target",28) + '</div>'
        + '<div>'
        + '<div style="color: #60a5fa; font-weight: 600; margin-bottom: 5px;">Scouting Reports</div>'
        + '<div style="color: #d1d5db; font-size: 0.95em; line-height: 1.6;">' + scoutingDesc + '</div>'
        + '<div style="margin-top:10px; padding:12px 14px; background:rgba(96,165,250,0.08); border:1px solid rgba(96,165,250,0.2); border-radius:8px;">'
        + '<div style="font-size:0.82em; color:#60a5fa; font-weight:700; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em;">How to Create</div>'
        + '<div style="display:grid; gap:6px; font-size:0.88em; color:#d1d5db;">'
        + '<div><strong style="color:#f59e0b;">From any job card</strong> in your Pipeline \u2014 tap \u201CCreate Scouting Report\u201D</div>'
        + '<div><strong style="color:#f59e0b;">From Job Detail</strong> \u2014 the Scouting Report button sits alongside Compare Skills and Values Fit</div>'
        + '<div><strong style="color:#f59e0b;">From Match Overlay</strong> \u2014 after comparing skills, create the report right from the match legend</div>'
        + '<div><strong style="color:#f59e0b;">From Blueprint Tab</strong> \u2014 Export \u2192 Scouting Report card</div>'
        + '</div></div>'
        + '<button onclick="closeExportModal(); openSampleScoutingReport()" style="margin-top:12px; padding:10px 20px; border-radius:8px; border:1px solid rgba(96,165,250,0.3); background:linear-gradient(135deg, rgba(96,165,250,0.1), rgba(99,102,241,0.06)); color:#60a5fa; font-weight:600; font-size:0.88em; cursor:pointer; display:flex; align-items:center; gap:8px;">'
        + bpIcon("file-text",16) + ' View Sample Scouting Report</button>'
        + '</div></div>'
        // Settings (hidden for demos)
        + settingsHelp
        + '</div></div>';
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}        
// ===== FIRST-VISIT TEASER MODAL =====
export function showTeaserModal() {
    // Don't show if already exists
    if (document.getElementById('teaserOverlay')) return;
    
    var overlay = document.createElement('div');
    overlay.id = 'teaserOverlay';
    overlay.className = 'teaser-overlay';
    
    overlay.innerHTML = '<div class="teaser-card">'
        + '<div class="teaser-header">'
        + '<div class="teaser-mark"><span class="teaser-mark-dot"></span> BLUEPRINT</div>'
        + '<div class="teaser-title">The resume is dead.<br>Here is your <em>Blueprint.</em></div>'
        + '<div class="teaser-sub">'
        + 'You collapse your life\'s work into a flat document that barely represents your capability. '
        + 'Not because you lack ability, but because the enterprise owns the systems that evaluate you.'
        + '<br><br>'
        + 'Blueprint changes that. It maps the hidden architecture of your skills, proficiency, values, and outcomes '
        + 'against the world\'s largest skill ontologies, then gives you the intelligence to own every career conversation.'
        + '</div>'
        + '</div>'
        
        // Feature cards
        + '<div class="teaser-features">'
        + '<div class="teaser-feat">'
        + '<div class="teaser-feat-icon" style="color:#60a5fa;">' + bpIcon('skills', 15) + ' Skills Architecture</div>'
        + '<div class="teaser-feat-desc">Your complete skill ontology mapped across roles, proficiency levels, and evidence. Not a keyword list.</div>'
        + '</div>'
        + '<div class="teaser-feat">'
        + '<div class="teaser-feat-icon" style="color:#10b981;">' + bpIcon('jobs', 15) + ' Job Intelligence</div>'
        + '<div class="teaser-feat-desc">Paste any job description. Blueprint scores the match, finds gaps, and builds your talking points.</div>'
        + '</div>'
        + '<div class="teaser-feat">'
        + '<div class="teaser-feat-icon" style="color:#f59e0b;">' + bpIcon('values', 15) + ' Values Alignment</div>'
        + '<div class="teaser-feat-desc">Your operating principles surfaced and mapped against company culture. Know the fit before you walk in.</div>'
        + '</div>'
        + '<div class="teaser-feat">'
        + '<div class="teaser-feat-icon" style="color:#a78bfa;">' + bpIcon('target', 15) + ' Scouting Reports</div>'
        + '<div class="teaser-feat-desc">Interactive career intelligence documents that attract recruiters and hiring managers to you.</div>'
        + '</div>'
        + '<div class="teaser-feat">'
        + '<div class="teaser-feat-icon" style="color:#ec4899;">' + bpIcon('dollar', 15) + ' Market Valuation</div>'
        + '<div class="teaser-feat-desc">Evidence-based compensation intelligence. Know your worth before negotiation starts.</div>'
        + '</div>'
        + '<div class="teaser-feat">'
        + '<div class="teaser-feat-icon" style="color:#06b6d4;">' + bpIcon('purpose', 15) + ' Purpose & Narrative</div>'
        + '<div class="teaser-feat-desc">Your career story distilled into the language that connects who you are with what the work demands.</div>'
        + '</div>'
        + '</div>'
        
        // Promise
        + '<div class="teaser-promise">'
        + '<strong>Free for the individual.</strong> No corporate gatekeeping. Your data stays yours.<br>'
        + 'I\'ve been advocating for replacing the resume and job description for years. This is the proof of concept.'
        + '</div>'
        
        // Actions
        + '<div class="teaser-actions">'
        + '<button class="teaser-btn-primary" onclick="closeTeaserModal(); showWaitlist(\'teaser\');">Join the Waitlist</button>'
        + '<button class="teaser-btn-ghost" onclick="closeTeaserModal();">Start Exploring</button>'
        + '</div>'
        
        // Backstory link
        + '<div class="teaser-backstory">'
        + 'This project has been in the making publicly since 2024. '
        + '<a href="https://www.linkedin.com/posts/cliffj_workblueprint-futureofwork-skillsbasedorganizations-activity-7387133545355345920-eOwI" target="_blank" rel="noopener">See the backstory on LinkedIn \u2192</a>'
        + '</div>'
        
        + '</div>'; // close teaser-card
    
    document.body.appendChild(overlay);
    
    // Animate in
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            overlay.classList.add('visible');
        });
    });
    
    // Close on backdrop click (not card click)
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeTeaserModal();
    });
    
    // Close on Escape
    var escHandler = function(e) {
        if (!overlay.isConnected) { document.removeEventListener('keydown', escHandler); return; }
        if (e.key === 'Escape') { closeTeaserModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
}
window.showTeaserModal = showTeaserModal;

export function closeTeaserModal() {
    var overlay = document.getElementById('teaserOverlay');
    if (!overlay) return;
    safeSet('bp_teaser_seen', '1');
    overlay.classList.remove('visible');
    setTimeout(function() { overlay.remove(); }, 400);
}
window.closeTeaserModal = closeTeaserModal;

export function showAbout() {
    const modal = document.getElementById('exportModal');
    const modalContent = modal.querySelector('.modal-content');
    modalContent.innerHTML = `
        <div class="modal-header" style="flex-direction:column; align-items:center; text-align:center; padding-bottom:20px;">
            <button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()" style="position:absolute; top:16px; right:16px;">\u00D7</button>
            <h2 class="modal-title" style="text-align:center; width:100%;">The Resume is Dead.<br>Here is Your Blueprint.<span style="font-size:0.5em; font-weight:400; vertical-align:super;">\u2122</span></h2>
            <p style="color: var(--text-secondary); margin-top: 8px; font-size:0.95em;">Your career, fully represented.</p>
            <p style="color: var(--text-muted); margin-top: 4px; font-size:0.78em;">${BP_VERSION}</p>
        </div>
        <div class="modal-body" style="padding: 30px;">
            <p style="color: #d1d5db; line-height: 1.8; margin-bottom: 20px;">
                Most professionals are forced to collapse their life\u2019s work into a flat, one-dimensional document 
                that barely scratches the surface of their true capability. You don\u2019t underrepresent yourself because 
                you lack ability\u2014you do it because the enterprise owns the systems of evaluation.
            </p>
            <p style="color: #d1d5db; line-height: 1.8; margin-bottom: 28px;">
                Blueprint changes that. This is your counter-intelligence suite. By mapping the hidden architecture 
                of your skills, proficiency levels, and values against the world\u2019s largest skill ontologies, Blueprint 
                gives you the same high-fidelity data that employers use. It moves you from a passive applicant to an 
                informed operator, giving you the radical clarity and evidence you need to own every career conversation 
                and negotiate your true market value.
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="background: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.3); border-radius: 8px; padding: 15px;">
                    <div style="color: #60a5fa; font-weight: 700; margin-bottom: 4px;">${bpIcon("compass",14)} Decode Your Expertise</div>
                    <div style="color: #9ca3af; font-size: 0.9em; line-height:1.6;">Surface the latent skills and differentiators that standard resumes ignore.</div>
                </div>
                <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 15px;">
                    <div style="color: #10b981; font-weight: 700; margin-bottom: 4px;">${bpIcon("dollar",14)} Negotiate with Intelligence</div>
                    <div style="color: #9ca3af; font-size: 0.9em; line-height:1.6;">Access real-world market ranges to know your worth before you walk into the room.</div>
                </div>
                <div style="background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); border-radius: 8px; padding: 15px;">
                    <div style="color: #fbbf24; font-weight: 700; margin-bottom: 4px;">${bpIcon("bar-chart",14)} Own Your Narrative</div>
                    <div style="color: #9ca3af; font-size: 0.9em; line-height:1.6;">A complete system for documenting outcomes, values, and purpose\u2014on your terms.</div>
                </div>
                <div style="background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.3); border-radius: 8px; padding: 15px;">
                    <div style="color: #a78bfa; font-weight: 700; margin-bottom: 4px;">${bpIcon("external",14)} Bridge the Gap</div>
                    <div style="color: #9ca3af; font-size: 0.9em; line-height:1.6;">Connect your architecture directly to the role with interactive, human-centric storytelling.</div>
                </div>
            </div>
            <p style="color: #6b7280; font-size: 0.85em; text-align: center; line-height:1.6;">Free for the individual. No corporate fluff. Your data stays yours.</p>
        </div>
    `;
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

// ===== FEEDBACK =====
export function sendFeedback(context) {
    var profileName = (window._userData.profile && window._userData.profile.name) || 'Unknown';
    var templateId = window._userData.templateId || 'none';
    var viewName = currentView || 'unknown';
    var contextNote = context ? ' (' + context + ')' : '';
    var subject = encodeURIComponent('Blueprint Feedback ' + BP_VERSION + contextNote);
    var body = encodeURIComponent(
        'Profile: ' + profileName + '\n'
        + 'Template: ' + templateId + '\n'
        + 'View: ' + viewName + '\n'
        + 'Version: ' + BP_VERSION + '\n'
        + 'Mode: ' + (appContext.mode || 'live') + '\n'
        + 'Date: ' + new Date().toISOString() + '\n'
        + '\n--- Your feedback below ---\n\n'
    );
    window.open('mailto:cliffj8338@gmail.com?subject=' + subject + '&body=' + body, '_blank');
}
window.sendFeedback = sendFeedback;

export function showLegalNotice() {
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">Legal &amp; Intellectual Property Notice</h2>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">&times;</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:28px; color:var(--text-secondary); line-height:1.8; font-size:0.9em;">'
        + '<h3 style="color:var(--text-primary); font-size:1.05em; margin-bottom:12px;">Trademark</h3>'
        + '<p style="margin-bottom:20px;">Blueprint&trade; is a trademark of Cliff Jurkiewicz. '
        + 'The Blueprint name, logo, network mark, and associated visual identity are the property of Cliff Jurkiewicz. '
        + 'Unauthorized use of the Blueprint name or mark is prohibited.</p>'
        + '<h3 style="color:var(--text-primary); font-size:1.05em; margin-bottom:12px;">Copyright</h3>'
        + '<p style="margin-bottom:20px;">&copy; ' + new Date().getFullYear() + ' Cliff Jurkiewicz. All rights reserved. '
        + 'The Blueprint software, including its source code, user interface design, visual assets, and documentation, '
        + 'is the copyrighted work of Cliff Jurkiewicz. No portion of this software may be reproduced, distributed, '
        + 'or transmitted in any form without prior written permission.</p>'
        + '<h3 style="color:var(--text-primary); font-size:1.05em; margin-bottom:12px;">Intellectual Property</h3>'
        + '<p style="margin-bottom:20px;">The following are original methodologies and intellectual property of Cliff Jurkiewicz:</p>'
        + '<div style="margin-bottom:20px; padding:16px; background:var(--c-accent-bg-2e); border:1px solid var(--c-accent-bg-6d); border-radius:8px;">'
        + '<div style="margin-bottom:8px;"><strong style="color:var(--text-primary);">Blueprint Ontology System</strong> &mdash; The professional skill ontology architecture, role-cluster mapping methodology, and 90-skill framework integrating O*NET occupational data with individualized career modeling.</div>'
        + '<div style="margin-bottom:8px;"><strong style="color:var(--text-primary);">Match Algorithm</strong> &mdash; The weighted skill-matching engine including fuzzy word-overlap scoring, requirement-level classification, and proficiency-weighted gap analysis.</div>'
        + '<div style="margin-bottom:8px;"><strong style="color:var(--text-primary);">Network Visualization</strong> &mdash; The force-directed ontology visualization system including the match overlay methodology for displaying skill alignment between professional profiles and job requirements.</div>'
        + '<div><strong style="color:var(--text-primary);">Proprietary Frameworks</strong> &mdash; Including but not limited to: human-in-the-lead (vs. human-in-the-loop), candidate experience architecture, and AI fluency models.</div>'
        + '</div>'
        + '<h3 style="color:var(--text-primary); font-size:1.05em; margin-bottom:12px;">Third-Party Data</h3>'
        + '<p style="margin-bottom:20px;">Blueprint incorporates data from the O*NET program (U.S. Department of Labor) and the ESCO classification (European Commission). '
        + 'These datasets are used under their respective open-access terms. Their inclusion does not imply endorsement by these organizations.</p>'
        + '<h3 style="color:var(--text-primary); font-size:1.05em; margin-bottom:12px;">User Data</h3>'
        + '<p>Users retain ownership of their personal data entered into Blueprint. Blueprint does not sell, share, or monetize user data. '
        + 'Profile data is stored locally in the browser and, when authenticated, encrypted in cloud storage accessible only to the account holder.</p>'
        + '</div>';
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}
window.showLegalNotice = showLegalNotice;
document.addEventListener('click', function(event) {
    const menu = document.getElementById('overflowMenu');
    const btn = document.getElementById('overflowMenuBtn');
    if (menu && btn && menu.style.display === 'block') {
        if (!menu.contains(event.target) && !btn.contains(event.target)) {
            closeOverflowMenu();
        }
    }
});

// ===== BULK OPERATIONS =====

let bulkSelectionMode = false;
let selectedSkills = [];
// [removed] selectAllSkills — dead code cleanup v4.22.0
// [removed] updateBulkModeBar — dead code cleanup v4.22.0





// ===== SKILL TEMPLATES =====




// ===== SORTING =====

let currentSort = 'category'; // category, proficiency, alphabetical, role, core, recent



// Resize handler — preserves active job match mode
var _resizeTimer = null;
window.addEventListener('resize', function() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function() {
        if (currentView === 'network' && currentSkillsView === 'network') {
            if (activeJobForNetwork && networkMatchMode !== 'you') {
                // Re-render the active match/job view
                setNetworkMatchMode(networkMatchMode);
            } else {
                window.networkInitialized = false;
                initNetwork();
                window.networkInitialized = true;
            }
        }
    }, 250);
});

// C2: Browser back button navigation
window.addEventListener('popstate', function(e) {
    // Close any open modals first
    var openModal = document.querySelector('.modal.active');
    if (openModal) {
        openModal.classList.remove('active');
        return;
    }
    var view = (e.state && e.state.view) ? e.state.view : 'welcome';
    _skipHistoryPush = true;
    switchView(view);
    _skipHistoryPush = false;
});
window.toggleProfileDropdown = toggleProfileDropdown;
window.closeProfileDropdown = closeProfileDropdown;
window.buildProfileDropdown = buildProfileDropdown;
window.toggleOverflowMenu = toggleOverflowMenu;
window.closeOverflowMenu = closeOverflowMenu;
window.showHelp = showHelp;
window.showTeaserModal = showTeaserModal;
window.closeTeaserModal = closeTeaserModal;
window.showAbout = showAbout;
window.sendFeedback = sendFeedback;
window.showLegalNotice = showLegalNotice;
