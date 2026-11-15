/**
 * src/ui/nav.js — Phase 4
 * View routing, keyboard shortcuts, popstate, app mode detection,
 * read-only guard, demo mode, save orchestration, theme, profile chip.
 *
 * MONOLITH LINES:
 *   3110–3131   keyboard shortcuts
 *   14449–14474 saveAll / saveUserData
 *   14474–14848 checkReadOnly, readOnlyGuard, detectAppMode, demoGate,
 *               enterDemoMode, exitDemoMode, toggleDemoMode, switchDemoProfile,
 *               updateDemoToggleUI, gatedPromptHTML
 *   24597       _skipHistoryPush
 *   24956–25197 switchView, toggleSkillsView
 *   46372–46430 initTheme, updateProfileChip, toggleFilterPanel
 *   46830–46841 popstate handler
 *
 * DEPENDENCIES (transition globals from legacy.js):
 *   userData, skillsData, blueprintData, templates, appContext, appMode,
 *   showcaseMode, isReadOnlyProfile, fbUser, fbIsAdmin, fbDb,
 *   waitlistPosition, waitlistEmail, currentView, currentSkillsView,
 *   activeRole, activeJobForNetwork, networkMatchMode, jobSelectorExpanded,
 *   simulation, bpTracker, window._bpTour
 *   initNetwork, initCardView, initOpportunities, initApplications,
 *   initBlueprint, initConsent, initReports, initSettings, initAdminView,
 *   initMatchNetwork, initValuesNetwork, initJobNetwork,
 *   renderWelcomePage, renderJobSelectorWidget, updateMatchOverlayUI,
 *   clearJobOverlay, updateStatsBar, renderFilterChips, normalizeUserRoles,
 *   inferValues, extractOutcomesFromEvidence, rescoreAllJobs,
 *   rebuildProfileDropdown, showWaitlist, showHelp
 */

import { safeGet, safeSet, safeSetAvatar, escapeHtml, debouncedSave } from '../core/security.js';
import { saveToFirestore }               from '../core/firebase.js';
import { bpIcon }                                       from './icons.js';
import { showToast }                                    from './toast.js';

// ─── Routing state ────────────────────────────────────────────────────────────

var _skipHistoryPush = false;
window._skipHistoryPush = false; // legacy.js reads this directly

// ─── Theme ────────────────────────────────────────────────────────────────────

export function initTheme() {
    var saved = safeGet('wbTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    var btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = saved === 'light' ? '\u2600\uFE0F' : '\uD83C\uDF19';
}
if (!window.initTheme) window.initTheme = initTheme;

// ─── Profile chip ─────────────────────────────────────────────────────────────

export function updateProfileChip(name) {
    if (!name) return;
    var initials = name.split(' ').map(function(w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    var avatar   = document.getElementById('profileAvatar');
    var chipName = document.getElementById('profileChipName');
    if (avatar) {
        var isDemo   = window.appContext && window.appContext.mode === 'demo';
        var photoURL = (window.userData && window.userData.profile && window.userData.profile.photo)
            || (!isDemo && window.fbUser && window.fbUser.photoURL)
            || null;
        if (photoURL) safeSetAvatar(avatar, photoURL, true);
        else avatar.textContent = initials;
    }
    if (chipName) chipName.textContent = name;
    document.title = 'Blueprint\u2122';
}
if (!window.updateProfileChip) window.updateProfileChip = updateProfileChip;

// ─── Filter panel ─────────────────────────────────────────────────────────────

export function toggleFilterPanel() {
    var panel = document.getElementById('filterPanel');
    var btn   = document.getElementById('filterToggleBtn');
    var isOpen = panel.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
}
if (!window.toggleFilterPanel) window.toggleFilterPanel = toggleFilterPanel;

// ─── Save orchestration ───────────────────────────────────────────────────────

export function saveAll() {
    if (readOnlyGuard()) return;
    saveUserData();
    if (typeof saveValues === 'function') saveValues();
    if (window.fbUser && window.fbDb) saveToFirestore();
}
if (!window.saveAll) window.saveAll = saveAll;

export function saveUserData() {
    try {
        if (window.appContext && window.appContext.mode === 'demo') return true;
        var id = (window.userData && window.userData.templateId)
            || Object.keys(window.templates || {})[0]
            || 'walter-white';
        safeSet('currentProfile', id);
        console.log('\u2713 Profile preference saved:', id);
        if (window.fbUser && window.fbDb) saveToFirestore();
        return true;
    } catch(e) {
        console.error('Error saving profile preference:', e);
        return false;
    }
}
if (!window.saveUserData) window.saveUserData = saveUserData;

// ─── Read-only & app mode ─────────────────────────────────────────────────────

export var isReadOnlyProfile = false;

export function checkReadOnly() {
    if (window.showcaseMode) {
        isReadOnlyProfile = true;
        window.isReadOnlyProfile = true;
        document.body.classList.add('readonly-mode');
        return;
    }
    var templateId = (window.userData && window.userData.templateId) || '';
    var isSample   = templateId.indexOf('demo') !== -1 || templateId.indexOf('sample') !== -1;
    if (!isSample && window.profilesManifest && window.profilesManifest.profiles) {
        isSample = window.profilesManifest.profiles.some(function(p) { return p.id === templateId; });
    }
    isReadOnlyProfile = isSample && !window.fbIsAdmin;
    window.isReadOnlyProfile = isReadOnlyProfile;
    document.body.classList.toggle('readonly-mode', isReadOnlyProfile);

    var banner      = document.getElementById('readonlyBanner');
    var profileName = escapeHtml((window.userData && window.userData.profile && window.userData.profile.name) || 'Sample Profile');

    if (isSample) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'readonlyBanner';
            banner.className = 'readonly-banner';
            banner.style.cssText = 'display:block !important; text-align:center; padding:10px 16px; font-size:0.88em; word-spacing:normal; white-space:normal;';
            var header = document.querySelector('.header');
            if (header) header.parentNode.insertBefore(banner, header.nextSibling);
        }
        var isDemoMode = window.appContext && window.appContext.mode === 'demo';
        var bannerHTML = '';
        if (window.fbIsAdmin) {
            bannerHTML = bpIcon(isDemoMode ? 'eye' : 'lock', 14)
                + ' <strong>Viewing: ' + profileName + '</strong> \u00B7 '
                + (isDemoMode ? 'Demo Mode' : 'Admin mode')
                + ' \u00B7 <a href="#" onclick="event.preventDefault(); exitDemoMode();" style="color:inherit; text-decoration:underline; font-weight:700;">\u2190 Return to my profile</a>';
        } else if (window.fbUser && isDemoMode) {
            bannerHTML = bpIcon('eye', 14)
                + ' <strong>Viewing: ' + profileName + '</strong> \u00B7 Demo Mode \u00B7 '
                + '<a href="#" onclick="event.preventDefault(); exitDemoMode();" style="color:inherit; text-decoration:underline; font-weight:700;">\u2190 Return to my profile</a>';
        } else if (window.appMode === 'waitlisted') {
            bannerHTML = bpIcon('lock', 14)
                + ' <strong>Viewing: ' + profileName + '</strong> \u00B7 Sample profile. You\u2019re #<span id="bannerPosition">'
                + (window.waitlistPosition || '...') + '</span> on the waitlist.';
        } else if (window.fbUser) {
            bannerHTML = bpIcon('lock', 14)
                + ' <strong>Viewing: ' + profileName + '</strong> \u00B7 Sample profile. '
                + '<a href="#" onclick="event.preventDefault(); loadUserFromFirestore(fbUser.uid);" style="color:inherit; text-decoration:underline; font-weight:700;">\u2190 Back to my profile</a>';
        } else {
            bannerHTML = bpIcon('lock', 14)
                + ' <strong>Viewing: ' + profileName + '</strong> \u00B7 Sample profile. '
                + '<a href="#" onclick="event.preventDefault(); showWaitlist();" style="color:inherit; text-decoration:underline; font-weight:700;">Join the waitlist</a> for early access '
                + 'or <a href="#" onclick="event.preventDefault(); showAuthModal(\'signin\');" style="color:inherit; text-decoration:underline;">sign in</a>.';
        }
        banner.innerHTML = bannerHTML;
        banner.style.cssText = 'display:block !important; text-align:center; padding:10px 16px; font-size:0.88em; word-spacing:normal; white-space:normal;';
    } else {
        if (banner) banner.style.display = 'none';
    }
}
if (!window.checkReadOnly) window.checkReadOnly = checkReadOnly;

export function readOnlyGuard() {
    if (isReadOnlyProfile) { demoGate('edit this profile'); return true; }
    return false;
}
if (!window.readOnlyGuard) window.readOnlyGuard = readOnlyGuard;

// ─── App mode detection ───────────────────────────────────────────────────────

export function detectAppMode() {
    if (window.showcaseMode) return;
    if (window.fbUser && window.fbIsAdmin) { window.appMode = 'active'; return; }
    if (window.fbUser && window.userData && window.userData.templateId && window.userData.templateId.indexOf('firestore') !== -1) {
        window.appMode = 'active'; return;
    }
    try {
        var urlParams = new URLSearchParams(window.location.search);
        var inviteDocId = urlParams.get('invite');
        if (inviteDocId && window.fbDb) {
            window.appMode = 'invited';
            window.fbDb.collection('waitlist').doc(inviteDocId).get().then(function(doc) {
                if (doc.exists && doc.data().status === 'invited') {
                    safeSet('blueprint_waitlist', JSON.stringify({ name: doc.data().name, email: doc.data().email, status: 'invited', position: doc.data().position }));
                    window.waitlistEmail = doc.data().email;
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, '', window.location.pathname + window.location.hash);
                    }
                } else { window.appMode = 'demo'; }
            }).catch(function() {});
            return;
        }
    } catch(e) {}
    var wlData = safeGet('blueprint_waitlist');
    if (wlData) {
        try {
            var parsed = JSON.parse(wlData);
            if (parsed.status === 'invited') { window.appMode = 'invited'; return; }
            if (parsed.status === 'waiting') { window.appMode = 'waitlisted'; window.waitlistPosition = parsed.position || null; window.waitlistEmail = parsed.email || null; return; }
        } catch(e) {}
    }
    if (window.fbUser) { window.appMode = 'invited'; return; }
    window.appMode = 'demo';
}
if (!window.detectAppMode) window.detectAppMode = detectAppMode;

// ─── Demo gate ────────────────────────────────────────────────────────────────

export function demoGate(featureName) {
    if (window.appMode === 'active' || window.appMode === 'invited') return false;
    if (window.showcaseMode) { showToast('Editing disabled in showcase mode', 'info'); return true; }
    var isWl    = window.appMode === 'waitlisted';
    var msg     = isWl ? 'You\u2019re #' + (window.waitlistPosition || '?') + ' on the waitlist! We\u2019ll unlock <strong>' + featureName + '</strong> when it\u2019s your turn.' : 'Join the waitlist to unlock <strong>' + featureName + '</strong> and build your own Blueprint.';
    var btnText = isWl ? 'Check Your Position' : 'Join the Waitlist';
    var btnAct  = isWl ? "closeExportModal(); showToast('You are #" + (window.waitlistPosition || '?') + " on the waitlist. We will be in touch!', 'info');" : 'closeExportModal(); showWaitlist();';
    var modal = document.getElementById('exportModal');
    var mc    = modal.querySelector('.modal-content');
    mc.innerHTML = '<div class="modal-header"><div class="modal-header-left"><h2 class="modal-title">' + bpIcon('lock', 18) + ' Early Access Feature</h2></div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button></div>'
        + '<div class="modal-body" style="padding:40px 32px; text-align:center;">'
        + '<div style="font-size:2.8em; margin-bottom:16px; opacity:0.8;">\u25C8</div>'
        + '<div style="font-size:1.1em; color:var(--text-primary); margin-bottom:8px; font-weight:600;">This feature is available to invited members</div>'
        + '<div style="font-size:0.9em; color:var(--text-secondary); margin-bottom:24px; line-height:1.6;">' + msg + '</div>'
        + '<button onclick="' + btnAct + '" style="padding:12px 32px; border-radius:10px; border:none; background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; font-weight:700; font-size:0.95em; cursor:pointer;">' + btnText + '</button>'
        + '<div style="margin-top:16px; font-size:0.78em; color:var(--text-muted);">Explore sample profiles in the meantime \u2014 they\u2019re fully interactive.</div></div>';
    history.pushState({ modal: true }, '');
    modal.classList.add('active');
    return true;
}
if (!window.demoGate) window.demoGate = demoGate;

export function gatedPromptHTML(featureName, description) {
    if (window.appMode === 'active' || window.appMode === 'invited') return '';
    var btnAct  = window.appMode === 'waitlisted' ? "showToast('You are on the waitlist! We will unlock this soon.', 'info')" : 'showWaitlist()';
    var btnText = window.appMode === 'waitlisted' ? 'You\u2019re on the list \u2714' : 'Join Waitlist for Access';
    return '<div class="gated-prompt"><div class="gp-icon">' + bpIcon('lock', 48) + '</div>'
        + '<div class="gp-title">' + featureName + '</div>'
        + '<div class="gp-text">' + description + '</div>'
        + '<button class="gp-btn" onclick="' + btnAct + '">' + btnText + '</button></div>';
}
if (!window.gatedPromptHTML) window.gatedPromptHTML = gatedPromptHTML;

// ─── Demo mode ────────────────────────────────────────────────────────────────

export function enterDemoMode(templateId) {
    if (window.appContext && window.appContext.mode === 'demo') return;
    var target = templateId || (window.appContext && window.appContext.demoTemplateId) || 'breaking-bad';
    if (!window.templates || !window.templates[target]) { showToast('Demo profile not available.', 'error'); return; }

    window.appContext.userSnapshot      = JSON.parse(JSON.stringify(window.userData));
    window.appContext.skillsSnapshot    = { roles: JSON.parse(JSON.stringify(window.skillsData.roles || [])), skills: JSON.parse(JSON.stringify(window.skillsData.skills || [])) };
    window.appContext.blueprintSnapshot = { values: JSON.parse(JSON.stringify(window.blueprintData.values || [])), outcomes: JSON.parse(JSON.stringify(window.blueprintData.outcomes || [])), purpose: window.blueprintData.purpose || '' };

    var activeNav = document.querySelector('.nav-btn.active');
    window.appContext.returnView = (activeNav && activeNav.dataset.view) || 'network';
    window.appContext.mode = 'demo';
    window.appContext.demoTemplateId = target;

    if (typeof loadTemplate === 'function') loadTemplate(target);
    if (typeof normalizeUserRoles === 'function') normalizeUserRoles();
    window.skillsData.skills = window.userData.skills;
    window.skillsData.roles  = window.userData.roles;
    window.blueprintData.values = []; window.blueprintData.outcomes = []; window.blueprintData.purpose = '';
    if (typeof inferValues === 'function') inferValues();
    if (typeof extractOutcomesFromEvidence === 'function') extractOutcomesFromEvidence();
    if (typeof rescoreAllJobs === 'function') rescoreAllJobs();

    window.blueprintInitialized = window.opportunitiesInitialized = window.applicationsInitialized = window.networkInitialized = window.cardViewInitialized = false;

    checkReadOnly(); updateDemoToggleUI();
    updateProfileChip(window.userData.profile.name || 'Demo Profile');
    if (typeof clearJobOverlay === 'function') clearJobOverlay();
    switchView('network');
    setTimeout(function() { window.scrollTo(0, 0); }, 50);
    setTimeout(function() { if (typeof renderJobSelectorWidget === 'function') renderJobSelectorWidget(); }, 500);
    showToast('Exploring demo: ' + (window.userData.profile.name || target) + '. Your data is safely preserved.', 'info', 3000);
}
if (!window.enterDemoMode) window.enterDemoMode = enterDemoMode;

export function exitDemoMode() {
    if (!window.appContext || window.appContext.mode !== 'demo' || !window.appContext.userSnapshot) {
        if (window.fbUser && window.fbDb) {
            if (typeof loadUserFromFirestore === 'function') loadUserFromFirestore(window.fbUser.uid).then(function() {
                if (typeof normalizeUserRoles === 'function') normalizeUserRoles();
                window.blueprintInitialized = window.networkInitialized = window.cardViewInitialized = false;
                checkReadOnly(); updateProfileChip(window.userData.profile.name || 'My Profile'); switchView('blueprint');
            });
        }
        return;
    }
    window.userData = window.appContext.userSnapshot;
    window._userData = window.userData;
    window.skillsData.roles = window.appContext.skillsSnapshot.roles;
    window.skillsData.skills = window.appContext.skillsSnapshot.skills;
    window.blueprintData.values = window.appContext.blueprintSnapshot.values;
    window.blueprintData.outcomes = window.appContext.blueprintSnapshot.outcomes;
    window.blueprintData.purpose = window.appContext.blueprintSnapshot.purpose;
    window.appContext.userSnapshot = window.appContext.skillsSnapshot = window.appContext.blueprintSnapshot = null;
    window.appContext.mode = 'live';

    if (typeof normalizeUserRoles === 'function') normalizeUserRoles();
    if (typeof rescoreAllJobs === 'function') rescoreAllJobs();
    window.blueprintInitialized = window.opportunitiesInitialized = window.applicationsInitialized = window.networkInitialized = window.cardViewInitialized = false;

    checkReadOnly(); updateDemoToggleUI();
    updateProfileChip(window.userData.profile.name || 'My Profile');
    if (typeof clearJobOverlay === 'function') clearJobOverlay();
    switchView('blueprint');
    setTimeout(function() { window.scrollTo(0, 0); }, 50);
    showToast('Welcome back! Your Blueprint is restored.', 'info', 2000);
    if (typeof rebuildProfileDropdown === 'function') rebuildProfileDropdown();
}
if (!window.exitDemoMode) window.exitDemoMode = exitDemoMode;

export function toggleDemoMode() {
    if (window.appContext && window.appContext.mode === 'demo') exitDemoMode(); else enterDemoMode();
}
if (!window.toggleDemoMode) window.toggleDemoMode = toggleDemoMode;

export function switchDemoProfile(templateId) {
    if (!window.appContext || window.appContext.mode !== 'demo') { enterDemoMode(templateId); return; }
    if (!window.templates || !window.templates[templateId]) return;
    window.appContext.demoTemplateId = templateId;
    if (typeof loadTemplate === 'function') loadTemplate(templateId);
    if (typeof normalizeUserRoles === 'function') normalizeUserRoles();
    window.skillsData.skills = window.userData.skills;
    window.skillsData.roles  = window.userData.roles;
    window.blueprintData.values = []; window.blueprintData.outcomes = []; window.blueprintData.purpose = '';
    if (typeof inferValues === 'function') inferValues();
    if (typeof extractOutcomesFromEvidence === 'function') extractOutcomesFromEvidence();
    if (typeof rescoreAllJobs === 'function') rescoreAllJobs();
    window.blueprintInitialized = window.opportunitiesInitialized = window.networkInitialized = window.cardViewInitialized = false;
    checkReadOnly(); updateProfileChip(window.userData.profile.name || templateId);
    if (typeof clearJobOverlay === 'function') clearJobOverlay();
    switchView('network');
}
if (!window.switchDemoProfile) window.switchDemoProfile = switchDemoProfile;

export function updateDemoToggleUI() {
    var toggle    = document.getElementById('demoModeToggle');
    var indicator = document.getElementById('demoModeIndicator');
    if (!toggle) return;
    toggle.style.display = window.fbUser ? '' : 'none';
    var inDemo = window.appContext && window.appContext.mode === 'demo';
    toggle.classList.toggle('demo-active', inDemo);
    toggle.title = inDemo ? 'Return to My Blueprint' : 'Explore Demo Profiles';
    if (indicator) indicator.style.display = inDemo ? '' : 'none';
}
if (!window.updateDemoToggleUI) window.updateDemoToggleUI = updateDemoToggleUI;

// ─── switchView ───────────────────────────────────────────────────────────────

export function switchView(view, event) {
    if (window.bpAgentSupportData) window.bpAgentSupportData.clear();
    // Aliases
    if (view === 'skills') view = 'network';
    if (view === 'jobs')   view = 'opportunities';
    if (view === 'applications') { view = 'opportunities'; window.jobsSubTab = 'tracker'; }

    if (window.bpTracker && window.bpTracker.sid) window.bpTracker.trackView(view);

    window.currentView = view;
    window.scrollTo(0, 0);

    // Stop D3 simulation when leaving network
    if (view !== 'network' && window.simulation) { try { window.simulation.stop(); } catch(e) {} }

    // Restore tour help button when leaving admin
    if (view !== 'admin') { var tourBtn = document.getElementById('tourHelpBtn'); if (tourBtn) tourBtn.style.display = ''; }

    // Screen reader announcement
    var viewNames = { network: 'Map', opportunities: 'Jobs', blueprint: 'Blueprint', reports: 'Reports', settings: 'Settings', consent: 'Settings', welcome: 'Home', admin: 'Admin' };
    var srEl = document.getElementById('srAnnounce');
    if (srEl) srEl.textContent = (viewNames[view] || view) + ' view';

    // Browser history
    if (!_skipHistoryPush) history.pushState({ view: view }, '', '#' + view);

    // Desktop nav active state
    document.querySelectorAll('.nav-btn').forEach(function(btn) { btn.classList.remove('active'); btn.removeAttribute('aria-current'); });
    var navMap = { network:'nav-skills', skills:'nav-skills', opportunities:'nav-jobs', jobs:'nav-jobs', applications:'nav-jobs', blueprint:'nav-blueprint', reports:'nav-reports', settings:'nav-settings', consent:'nav-settings' };
    var navId = navMap[view];
    if (navId) { var nb = document.getElementById(navId); if (nb) { nb.classList.add('active'); nb.setAttribute('aria-current', 'page'); } }

    // Controls bar
    var _cb = document.getElementById('controlsBar'); if (_cb) _cb.style.display = 'none';
    var mc = document.querySelector('.main-content');
    if (mc) {
        mc.classList.remove('with-filters', 'with-controls');
        var hasBanner = document.getElementById('readonlyBanner') && document.getElementById('readonlyBanner').style.display !== 'none';
        mc.classList.toggle('with-banner', !!hasBanner);
    }

    // Clear network overlay when leaving
    if (view !== 'network') {
        ['matchModeToggle','matchActiveBadge'].forEach(function(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
        ['matchLegend','jobInfoTile','valuesAlignmentPanel','mobileNetworkBadge'].forEach(function(id) { var el = document.getElementById(id); if (el) el.remove(); });
        var ric = document.getElementById('roleInfoCard'); if (ric) ric.style.display = 'none';
    }

    // Mobile nav active state
    document.querySelectorAll('.mobile-nav-btn').forEach(function(b) { b.classList.remove('active'); b.removeAttribute('aria-current'); });
    var mobMap = { network:'mob-skills', opportunities:'mob-jobs', applications:'mob-jobs', blueprint:'mob-blueprint', reports:'mob-reports', settings:'mob-settings', consent:'mob-settings' };
    var mobId = mobMap[view];
    if (mobId) { var mb = document.getElementById(mobId); if (mb) { mb.classList.add('active'); mb.setAttribute('aria-current', 'page'); } }

    // Hide all views
    ['welcomeView','networkView','cardView','opportunitiesView','applicationsView','blueprintView','consentView','settingsView','reportsView'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    var _sph  = document.getElementById('skillsPageHeader'); if (_sph) _sph.style.display = 'none';
    var _jsel = document.getElementById('networkJobSelector'); if (_jsel) _jsel.remove();
    var _ijsel = document.getElementById('inlineJobSelector'); if (_ijsel) { _ijsel.style.display = 'none'; _ijsel.innerHTML = ''; }
    var _jdrop = document.getElementById('jobSelectorDropdown'); if (_jdrop) _jdrop.remove();
    var adminV = document.getElementById('adminView'); if (adminV) adminV.style.display = 'none';
    var controls = document.querySelector('.controls'); if (controls) controls.style.display = 'none';

    // Readonly banner visibility
    var roBanner = document.getElementById('readonlyBanner');
    if (roBanner) {
        if (view === 'welcome' || view === 'consent' || view === 'admin') {
            roBanner.style.display = 'none';
        } else if (isReadOnlyProfile) {
            roBanner.style.cssText = 'display:block !important; text-align:center; padding:10px 16px; font-size:0.88em; word-spacing:normal; white-space:normal;';
        }
    }

    // App footer
    var appFooter = document.getElementById('appFooter');
    if (appFooter) appFooter.style.display = (view === 'welcome' || view === 'admin') ? 'none' : 'block';

    // ── Render selected view ──
    if (view === 'welcome') {
        var wv = document.getElementById('welcomeView');
        if (wv) wv.style.display = 'block';
        if (!window._welcomePickerActive && typeof renderWelcomePage === 'function') renderWelcomePage();
        window._welcomePickerActive = false;

    } else if (view === 'network') {
        if (controls) controls.style.display = 'flex';
        if (mc) mc.classList.add('with-controls');
        document.querySelectorAll('#skillsViewToggle .view-pill').forEach(function(chip) {
            chip.classList.toggle('active', chip.dataset.view === window.currentSkillsView);
        });
        if (window.currentSkillsView === 'network') {
            var _nv = document.getElementById('networkView'); if (_nv) _nv.style.display = 'block';
            var _lt = document.getElementById('networkLabelToggles'); if (_lt) _lt.style.display = window.innerWidth >= 768 ? 'flex' : 'none';
            var fBtn = document.getElementById('filterToggleBtn'); if (fBtn) fBtn.style.display = 'none';
            var fPnl = document.getElementById('filterPanel'); if (fPnl) fPnl.classList.remove('open');
            var nfp  = document.getElementById('networkFilterPill'); if (nfp) nfp.style.display = (window.activeRole && window.activeRole !== 'all') ? 'flex' : 'none';
            if (!window.networkInitialized && typeof initNetwork === 'function') { initNetwork(); window.networkInitialized = true; }
            setTimeout(function() { if (typeof renderJobSelectorWidget === 'function') renderJobSelectorWidget(); }, 100);
            if (window.activeJobForNetwork) {
                if (typeof updateMatchOverlayUI === 'function') updateMatchOverlayUI();
                if (window.networkMatchMode !== 'you' && typeof setNetworkMatchMode === 'function') setNetworkMatchMode(window.networkMatchMode);
            }
        } else {
            var _cvEl = document.getElementById('cardView'); if (_cvEl) _cvEl.style.display = 'block';
            var _lt2  = document.getElementById('networkLabelToggles'); if (_lt2) _lt2.style.display = 'none';
            var fBtn2 = document.getElementById('filterToggleBtn'); if (fBtn2) fBtn2.style.display = 'none';
            var fPnl3 = document.getElementById('filterPanel'); if (fPnl3) { fPnl3.classList.remove('open'); fPnl3.style.display = 'none'; }
            var nfp2  = document.getElementById('networkFilterPill'); if (nfp2) nfp2.style.display = 'none';
            if (!window.cardViewInitialized && typeof initCardView === 'function') { initCardView(); window.cardViewInitialized = true; }
            setTimeout(function() { if (typeof renderJobSelectorWidget === 'function') renderJobSelectorWidget(); }, 100);
        }
        if (typeof updateStatsBar === 'function') updateStatsBar();

    } else if (view === 'opportunities') {
        var _ovEl = document.getElementById('opportunitiesView'); if (_ovEl) _ovEl.style.display = 'block';
        if (typeof initOpportunities === 'function') {
            if (!window.opportunitiesInitialized) { initOpportunities(); window.opportunitiesInitialized = true; }
            else initOpportunities();
        }
        if (typeof updateStatsBar === 'function') updateStatsBar();

    } else if (view === 'applications') {
        var _avEl = document.getElementById('applicationsView'); if (_avEl) _avEl.style.display = 'block';
        if (!window.applicationsInitialized && typeof initApplications === 'function') { initApplications(); window.applicationsInitialized = true; }
        if (typeof updateStatsBar === 'function') updateStatsBar();

    } else if (view === 'blueprint') {
        var _bvEl = document.getElementById('blueprintView'); if (_bvEl) _bvEl.style.display = 'block';
        if (!window.blueprintInitialized && typeof initBlueprint === 'function') { initBlueprint(); window.blueprintInitialized = true; }
        if (typeof updateStatsBar === 'function') updateStatsBar();

    } else if (view === 'consent') {
        var _cnvEl = document.getElementById('consentView'); if (_cnvEl) _cnvEl.style.display = 'block';
        if (!window.consentInitialized && typeof initConsent === 'function') { initConsent(); window.consentInitialized = true; }
        if (typeof updateStatsBar === 'function') updateStatsBar();

    } else if (view === 'reports') {
        var _rpvEl = document.getElementById('reportsView'); if (_rpvEl) _rpvEl.style.display = 'block';
        if (!window.reportsInitialized && typeof initReports === 'function') { initReports(); window.reportsInitialized = true; }
        if (typeof updateStatsBar === 'function') updateStatsBar();

    } else if (view === 'settings') {
        var _svEl = document.getElementById('settingsView'); if (_svEl) _svEl.style.display = 'block';
        if (!window.settingsInitialized && typeof initSettings === 'function') { initSettings(); window.settingsInitialized = true; }
        if (typeof updateStatsBar === 'function') updateStatsBar();

    } else if (view === 'admin') {
        var av = document.getElementById('adminView');
        if (av) { av.style.display = 'block'; if (typeof initAdminView === 'function') initAdminView(); }
    }
}
if (!window.switchView) window.switchView = switchView;

// ─── toggleSkillsView ─────────────────────────────────────────────────────────

export function toggleSkillsView(view) {
    window.currentSkillsView = view;
    document.querySelectorAll('#skillsViewToggle .view-pill').forEach(function(chip) {
        chip.classList.toggle('active', chip.dataset.view === view);
    });
    var matchToggle = document.getElementById('matchModeToggle');
    var matchBadge  = document.getElementById('matchActiveBadge');

    if (view === 'network') {
        var nv = document.getElementById('networkView'); if (nv) nv.style.display = 'block';
        var cv = document.getElementById('cardView');    if (cv) cv.style.display = 'none';
        var labelToggles = document.getElementById('networkLabelToggles');
        if (labelToggles) labelToggles.style.display = window.innerWidth >= 768 ? 'flex' : 'none';
        if (!window.networkInitialized && typeof initNetwork === 'function') { initNetwork(); window.networkInitialized = true; }
        var filterBtn = document.getElementById('filterToggleBtn'); if (filterBtn) filterBtn.style.display = 'none';
        var filterPnl = document.getElementById('filterPanel');     if (filterPnl) filterPnl.classList.remove('open');
        var nfPill = document.getElementById('networkFilterPill');  if (nfPill) nfPill.style.display = (window.activeRole && window.activeRole !== 'all') ? 'flex' : 'none';
        if (window.activeJobForNetwork) {
            if (matchToggle) matchToggle.style.display = 'inline-flex';
            var badgeTitle = document.getElementById('matchActiveTitle');
            if (badgeTitle) badgeTitle.textContent = window.activeJobForNetwork.title || 'Job Match';
            if (matchBadge) matchBadge.style.display = 'inline-flex';
            var mode = window.networkMatchMode;
            if (typeof initMatchNetwork === 'function' && mode === 'match') initMatchNetwork(window.activeJobForNetwork);
            else if (typeof initValuesNetwork === 'function' && mode === 'values') initValuesNetwork(window.activeJobForNetwork);
            else if (typeof initJobNetwork === 'function' && mode === 'job') initJobNetwork(window.activeJobForNetwork);
            else { window.networkInitialized = false; if (typeof initNetwork === 'function') initNetwork(); window.networkInitialized = true; }
        }
    } else {
        var nv2 = document.getElementById('networkView'); if (nv2) nv2.style.display = 'none';
        var cv2 = document.getElementById('cardView');    if (cv2) cv2.style.display = 'block';
        var lt2 = document.getElementById('networkLabelToggles'); if (lt2) lt2.style.display = 'none';
        if (!window.cardViewInitialized && typeof initCardView === 'function') { initCardView(); window.cardViewInitialized = true; }
        var fb2 = document.getElementById('filterToggleBtn'); if (fb2) fb2.style.display = 'none';
        var fp2 = document.getElementById('filterPanel'); if (fp2) { fp2.classList.remove('open'); fp2.style.display = 'none'; }
        var nfp3 = document.getElementById('networkFilterPill'); if (nfp3) nfp3.style.display = 'none';
        ['jobInfoTile','matchLegend','valuesAlignmentPanel','roleInfoCard','mobileNetworkBadge','jobSelectorDropdown'].forEach(function(id) {
            var el = document.getElementById(id); if (el) { if (id === 'roleInfoCard') el.style.display = 'none'; else el.remove(); }
        });
        window.jobSelectorExpanded = false;
        if (matchToggle) matchToggle.style.display = 'none';
        if (matchBadge)  matchBadge.style.display  = 'none';
    }
}
if (!window.toggleSkillsView) window.toggleSkillsView = toggleSkillsView;

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

document.addEventListener('keydown', function(e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    var exportModal = document.getElementById('exportModal');
    if (exportModal && exportModal.style.display !== 'none' && exportModal.style.display !== '') return;
    if (window._bpTour && document.querySelector('.tour-overlay')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
        case '1': e.preventDefault(); switchView('skills'); break;
        case '2': e.preventDefault(); switchView('jobs'); break;
        case '3': e.preventDefault(); switchView('blueprint'); break;
        case '4': e.preventDefault(); switchView('reports'); break;
        case '5': e.preventDefault(); switchView('settings'); break;
        case '?': e.preventDefault(); if (typeof showHelp === 'function') showHelp(); break;
    }
});

// ─── Popstate (browser back/forward) ─────────────────────────────────────────

window.addEventListener('popstate', function(e) {
    var openModal = document.querySelector('.modal.active');
    if (openModal) { openModal.classList.remove('active'); return; }
    var view = (e.state && e.state.view) ? e.state.view : 'welcome';
    _skipHistoryPush = true;
    window._skipHistoryPush = true;
    switchView(view);
    _skipHistoryPush = false;
    window._skipHistoryPush = false;
});
