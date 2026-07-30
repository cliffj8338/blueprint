// views/reports.js — Blueprint v4.46.21
// Phase 7a extraction

import { bpIcon }    from '../ui/icons.js';
import { escapeHtml } from '../core/security.js';
import { showToast }  from '../ui/toast.js';
import { _bd, waitForUserData } from '../core/data-helpers.js';


export async function initReports() {
    var el = document.getElementById('reportsView');
    if (!window._userData || !window._userData.initialized) {
        if (el) el.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-muted);">Loading...</div>';
        await waitForUserData();
    }
    var demoProfiles = [
        { name: 'Tyrion Lannister', show: 'Game of Thrones', role: 'Chief of Staff', company: 'United Nations', match: 75, file: 'reports/demos/tyrion-lannister.html', emoji: '🍷', date: 'Feb 22, 2026' },
        { name: 'Walter White', show: 'Breaking Bad', role: 'Chief Science Officer', company: 'Gray Matter Technologies', match: 82, file: 'reports/demos/walter-white.html', emoji: '⚗️', date: 'Feb 22, 2026' },
        { name: 'Jim Hopper', show: 'Stranger Things', role: 'Dir. National Crisis Response', company: 'Dept. of Homeland Security', match: 78, file: 'reports/demos/jim-hopper.html', emoji: '🏚️', date: 'Feb 22, 2026' },
        { name: 'Kendall Roy', show: 'Succession', role: 'Chief Executive Officer', company: 'Waystar Royco', match: 71, file: 'reports/demos/kendall-roy.html', emoji: '👔', date: 'Feb 22, 2026' }
    ];
    
    var scoreColor = function(s) { return s >= 70 ? 'var(--c-success, #10b981)' : s >= 50 ? 'var(--c-warning, #f59e0b)' : 'var(--c-danger, #ef4444)'; };
    
    // ══════════════════════════════════════════════════════
    // DEMO / READ-ONLY: Show sample experience
    // ══════════════════════════════════════════════════════
    if (window.isReadOnlyProfile) {
        var mockAnalytics = {
            totalViews: 847, uniqueViewers: 312, shortlisted: 23, notesReceived: 8, avgTimeOnPage: '4m 32s',
            sectionHeatmap: [
                { name: 'Skills Network', pct: 94 }, { name: 'Gap Analysis', pct: 82 },
                { name: 'Values Alignment', pct: 76 }, { name: 'Outcomes', pct: 71 },
                { name: 'Credentials', pct: 63 }, { name: 'Competency Domains', pct: 48 },
                { name: 'Compensation', pct: 41 }
            ]
        };
        
        var html = '<div class="blueprint-container">';
        
        // Sign-up CTA banner
        html += '<div style="padding:16px 20px; background:linear-gradient(135deg, rgba(96,165,250,0.12), rgba(167,139,250,0.08)); border:1px solid rgba(96,165,250,0.25); border-radius:12px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">'
            + '<div>'
            + '<div style="font-weight:700; font-size:0.95em; margin-bottom:2px;">Generate reports with your real career data</div>'
            + '<div style="font-size:0.82em; color:var(--text-secondary); line-height:1.4;">Sign up free to build your profile, match to jobs, and create targeted scouting reports.</div>'
            + '</div>'
            + '<button onclick="showAuthModal()" style="padding:10px 22px; border-radius:10px; border:none; background:var(--accent); color:#fff; font-weight:600; cursor:pointer; white-space:nowrap; font-size:0.88em;">Get Started</button>'
            + '</div>';
        
        // Analytics (sample)
        html += '<div style="position:relative;">'
            + '<div style="position:absolute; top:8px; right:12px; z-index:2; font-size:0.68em; padding:2px 10px; border-radius:8px; background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); font-weight:600;">SAMPLE DATA</div>'
            + '<div class="rpt-metrics">'
            + '<div class="rpt-metric-card"><div class="rpt-metric-n">' + mockAnalytics.totalViews.toLocaleString() + '</div><div class="rpt-metric-l">' + bpIcon('eye', 14) + ' Total Views</div><div class="rpt-metric-sub">' + mockAnalytics.uniqueViewers + ' unique viewers</div></div>'
            + '<div class="rpt-metric-card"><div class="rpt-metric-n" style="color:var(--c-success, #10b981);">' + mockAnalytics.shortlisted + '</div><div class="rpt-metric-l">' + bpIcon('star', 14) + ' Shortlisted</div><div class="rpt-metric-sub">by recruiters</div></div>'
            + '<div class="rpt-metric-card"><div class="rpt-metric-n" style="color:var(--accent);">' + mockAnalytics.notesReceived + '</div><div class="rpt-metric-l">' + bpIcon('message', 14) + ' Notes Received</div><div class="rpt-metric-sub">from hiring teams</div></div>'
            + '<div class="rpt-metric-card"><div class="rpt-metric-n">' + mockAnalytics.avgTimeOnPage + '</div><div class="rpt-metric-l">' + bpIcon('clock', 14) + ' Avg. Time on Page</div><div class="rpt-metric-sub">across all reports</div></div>'
            + '</div>';
        
        // Heatmap (sample)
        html += '<div class="rpt-card" style="margin-bottom:20px; position:relative;">'
            + '<div style="position:absolute; top:12px; right:14px; z-index:2; font-size:0.68em; padding:2px 10px; border-radius:8px; background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); font-weight:600;">SAMPLE DATA</div>'
            + '<div class="rpt-card-h">' + bpIcon('bar-chart', 16) + ' Section Engagement Heatmap</div>'
            + '<div class="rpt-card-sub">Which sections recruiters spend the most time on</div>'
            + '<div style="margin-top:16px;">';
        mockAnalytics.sectionHeatmap.forEach(function(s) {
            var hue = s.pct > 80 ? 'var(--c-success, #10b981)' : s.pct > 60 ? 'var(--accent, #3b82f6)' : 'var(--text-muted, #64748b)';
            html += '<div class="rpt-heatmap-row"><div class="rpt-heatmap-label">' + s.name + '</div>'
                + '<div class="rpt-heatmap-track"><div class="rpt-heatmap-fill" style="width:' + s.pct + '%; background:' + hue + ';"></div></div>'
                + '<div class="rpt-heatmap-val">' + s.pct + '%</div></div>';
        });
        html += '</div></div>';
        
        // Demo Profiles
        html += '<div class="rpt-card" style="margin-bottom:20px;">'
            + '<div class="rpt-card-h">' + bpIcon('users', 16) + ' Sample Scouting Reports</div>'
            + '<div class="rpt-card-sub">Preview scouting reports built from TV character profiles to see how the format works.</div>'
            + '<div class="rpt-demo-grid">';
        demoProfiles.forEach(function(p) {
            html += '<div class="rpt-demo-card" onclick="openDemoScoutingReport(\'' + escapeHtml(p.file) + '\', \'' + escapeHtml(p.name).replace(/'/g, "\\'") + '\')">'
                + '<div class="rpt-demo-emoji">' + p.emoji + '</div>'
                + '<div style="flex:1; min-width:0;">'
                + '<div style="font-weight:700; margin-bottom:2px;">' + escapeHtml(p.name) + '</div>'
                + '<div style="font-size:0.78em; color:var(--text-muted); margin-bottom:4px;">' + escapeHtml(p.show) + '</div>'
                + '<div style="font-size:0.82em; color:var(--text-secondary);">' + escapeHtml(p.role) + '</div>'
                + '<div style="font-size:0.78em; color:var(--text-muted);">' + escapeHtml(p.company) + '</div></div>'
                + '<div style="text-align:center; min-width:48px;">'
                + '<div style="font-size:1.3em; font-weight:800; color:' + scoreColor(p.match) + ';">' + p.match + '%</div>'
                + '<div style="font-size:0.6em; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Match</div></div>'
                + '</div>';
        });
        html += '</div></div>';
        
        html += '</div>';
        el.innerHTML = html;
        return;
    }
    
    // ══════════════════════════════════════════════════════
    // LOGGED-IN: Live reports dashboard
    // ══════════════════════════════════════════════════════
    
    // Build saved reports with real pipeline indices for click-through
    var allSavedJobs = userData.savedJobs || [];
    var pipelineJobs = [];
    allSavedJobs.forEach(function(j, realIdx) {
        if (j && j.title && j.matchData) {
            var score = (j.matchData && j.matchData.score) || 0;
            var matchedCount = (j.matchData && j.matchData.matched) ? j.matchData.matched.length : 0;
            var gapCount = (j.matchData && j.matchData.gaps) ? j.matchData.gaps.length : 0;
            var addedDate = j.addedAt ? new Date(j.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            pipelineJobs.push({ title: j.title, company: j.company || 'Unknown', match: score, matched: matchedCount, gaps: gapCount, date: addedDate, idx: realIdx });
        }
    });
    // Sort by match score descending
    pipelineJobs.sort(function(a, b) { return b.match - a.match; });
    
    var html = '<div class="blueprint-container">';
    
    // ── My Reports (primary section) ────────────────────
    html += '<div class="rpt-card" style="margin-bottom:20px;">'
        + '<div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; flex-wrap:wrap;">'
        + '<div>'
        + '<div class="rpt-card-h">' + bpIcon('file-text', 16) + ' My Reports</div>'
        + '<div class="rpt-card-sub">Select a job to generate a targeted scouting report for recruiters and hiring managers.</div>'
        + '</div>'
        + '<button onclick="showScoutingReportPicker()" style="padding:8px 16px; border-radius:10px; border:none; background:var(--accent); color:#fff; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-size:0.85em; white-space:nowrap; flex-shrink:0;">'
        + bpIcon('plus', 14) + ' New Report</button>'
        + '</div>';
    
    if (pipelineJobs.length > 0) {
        html += '<div style="margin-top:14px; display:grid; gap:8px;">';
        pipelineJobs.forEach(function(r) {
            html += '<div onclick="showReportFormatPicker(' + r.idx + ')" style="padding:14px 16px; background:var(--c-surface-5, rgba(255,255,255,0.02)); border:1px solid var(--c-border-subtle); border-radius:10px; cursor:pointer; transition:border-color 0.2s; display:flex; align-items:center; justify-content:space-between; gap:12px;" '
                + 'onmouseover="this.style.borderColor=\'rgba(96,165,250,0.4)\'" onmouseout="this.style.borderColor=\'var(--c-border-subtle)\'">'
                + '<div style="flex:1; min-width:0;">'
                + '<div style="font-weight:600; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(r.title) + '</div>'
                + '<div style="font-size:0.82em; color:var(--text-secondary);">' + escapeHtml(r.company)
                + (r.date ? ' · ' + r.date : '')
                + ' · ' + r.matched + ' matched · ' + r.gaps + ' gap' + (r.gaps !== 1 ? 's' : '') + '</div></div>'
                + '<div style="display:flex; align-items:center; gap:10px;">'
                + '<div style="text-align:center; min-width:48px;">'
                + '<div style="font-size:1.3em; font-weight:800; color:' + scoreColor(r.match) + ';">' + r.match + '%</div>'
                + '<div style="font-size:0.6em; color:var(--text-muted); text-transform:uppercase;">Match</div></div>'
                + '<div style="color:var(--text-muted); opacity:0.5;">' + bpIcon('chevron-right', 16) + '</div>'
                + '</div></div>';
        });
        html += '</div>';
        
        // General PDF option below the list
        html += '<div style="margin-top:12px; text-align:center;">'
            + '<button onclick="exportBlueprint(\'pdf\')" style="padding:8px 16px; border:1px solid var(--c-border-mid); background:transparent; color:var(--text-secondary); border-radius:8px; cursor:pointer; font-size:0.82em;">'
            + bpIcon('pdf', 14) + ' Generate General Blueprint PDF (no job targeting)</button></div>';
    } else {
        html += '<div style="padding:40px 24px; text-align:center; color:var(--text-muted);">'
            + '<div style="font-size:2.4em; margin-bottom:14px; opacity:0.35;">' + bpIcon('target', 48) + '</div>'
            + '<div style="font-weight:600; margin-bottom:6px; font-size:1.05em; color:var(--text-secondary);">No jobs in your pipeline yet</div>'
            + '<div style="font-size:0.88em; line-height:1.6; margin-bottom:20px; max-width:380px; margin-left:auto; margin-right:auto;">'
            + 'Save a job from Find Jobs, paste a job description, or let Fit For Me find matches automatically. Then come back here to generate a targeted scouting report.</div>'
            + '<div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">'
            + '<button onclick="switchView(\'jobs\')" style="padding:10px 20px; border-radius:8px; border:none; background:var(--accent); color:#fff; font-weight:600; cursor:pointer;">' + bpIcon('search', 14) + ' Find Jobs</button>'
            + '<button onclick="exportBlueprint(\'pdf\')" style="padding:10px 20px; border-radius:8px; border:1px solid var(--c-border-mid); background:transparent; color:var(--text-secondary); font-weight:600; cursor:pointer;">' + bpIcon('pdf', 14) + ' General PDF</button>'
            + '</div></div>';
    }
    html += '</div>';
    
    // ── Profile Completeness ────────────────────────────
    var completeness = { skills: 0, outcomes: 0, values: 0, purpose: 0, workHistory: 0, credentials: 0 };
    var allSkills = (_bd().skills) || [];
    var visibleRoles = (typeof getVisibleRoles === 'function') ? getVisibleRoles() : [];
    completeness.skills = allSkills.length >= 5 ? 100 : allSkills.length > 0 ? 50 : 0;
    completeness.workHistory = visibleRoles.length > 0 ? 100 : 0;
    if (_bd().skills || _bd().values) {
        completeness.outcomes = (_bd().outcomes || []).filter(function(o) { return o.shared; }).length > 0 ? 100 : 0;
        completeness.values = (_bd().values || []).filter(function(v) { return v.selected; }).length > 0 ? 100 : 0;
        completeness.purpose = _bd().purpose ? 100 : 0;
    }
    var userCerts = (_bd().certifications) || [];
    var userEdu = (_bd().education) || [];
    completeness.credentials = (userCerts.length > 0 || userEdu.length > 0) ? 100 : 0;
    var compKeys = Object.keys(completeness);
    var totalPct = Math.round(compKeys.reduce(function(sum, k) { return sum + completeness[k]; }, 0) / compKeys.length);
    
    html += '<div class="rpt-card" style="margin-bottom:20px;">'
        + '<div class="rpt-card-h">' + bpIcon('target', 16) + ' Report Readiness</div>'
        + '<div class="rpt-card-sub">Stronger profiles produce more compelling scouting reports. Fill gaps to maximize recruiter impact.</div>'
        + '<div style="margin-top:14px; display:flex; align-items:center; gap:16px;">'
        + '<div style="width:64px; height:64px; border-radius:50%; border:4px solid ' + (totalPct >= 80 ? 'var(--c-success, #10b981)' : totalPct >= 40 ? 'var(--accent)' : 'var(--text-muted)') + '; display:flex; align-items:center; justify-content:center; font-size:1.2em; font-weight:800; flex-shrink:0;">' + totalPct + '%</div>'
        + '<div style="flex:1;">';
    var readinessSections = [
        { name: 'Skills (5+)', pct: completeness.skills, fix: 'blueprint' },
        { name: 'Work History', pct: completeness.workHistory, fix: 'blueprint' },
        { name: 'Outcomes', pct: completeness.outcomes, fix: 'blueprint' },
        { name: 'Values', pct: completeness.values, fix: 'blueprint' },
        { name: 'Purpose Statement', pct: completeness.purpose, fix: 'blueprint' },
        { name: 'Credentials', pct: completeness.credentials, fix: 'blueprint' }
    ];
    readinessSections.forEach(function(s) {
        var col = s.pct === 100 ? 'var(--c-success, #10b981)' : s.pct > 0 ? 'var(--c-warning, #f59e0b)' : 'var(--text-muted)';
        var icon = s.pct === 100 ? '✓' : s.pct > 0 ? '◐' : '—';
        html += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">'
            + '<div style="font-size:0.82em; width:120px; color:' + (s.pct === 100 ? 'var(--text-primary)' : 'var(--text-muted)') + ';">' + s.name + '</div>'
            + '<div style="flex:1; height:4px; background:var(--c-surface-5, rgba(255,255,255,0.06)); border-radius:2px; overflow:hidden;">'
            + '<div style="height:100%; width:' + s.pct + '%; background:' + col + '; border-radius:2px;"></div></div>'
            + '<div style="font-size:0.72em; color:' + col + '; min-width:28px; text-align:right;">' + icon + '</div></div>';
    });
    html += '</div></div>';
    if (totalPct < 100) {
        html += '<div style="margin-top:10px; text-align:center;">'
            + '<button onclick="switchView(\'blueprint\')" style="padding:6px 16px; border-radius:8px; border:1px solid var(--c-border-mid); background:transparent; color:var(--text-secondary); font-size:0.82em; cursor:pointer;">' + bpIcon('edit', 12) + ' Complete Your Profile</button></div>';
    }
    html += '</div>';
    
    // ── Sample Reports (collapsible) ────────────────────
    html += '<div class="rpt-card" style="margin-bottom:20px;">'
        + '<div onclick="var g=this.nextElementSibling; var c=this.querySelector(\'.rpt-demo-chevron\'); if(g.style.display===\'none\'){g.style.display=\'block\';c.style.transform=\'rotate(90deg)\';}else{g.style.display=\'none\';c.style.transform=\'rotate(0deg)\';}" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between;">'
        + '<div>'
        + '<div class="rpt-card-h">' + bpIcon('users', 16) + ' Sample Reports</div>'
        + '<div class="rpt-card-sub">Preview scouting reports built from TV character profiles.</div>'
        + '</div>'
        + '<div class="rpt-demo-chevron" style="color:var(--text-muted); transition:transform 0.2s; transform:rotate(0deg);">' + bpIcon('chevron-right', 18) + '</div>'
        + '</div>'
        + '<div style="display:none;">'
        + '<div class="rpt-demo-grid" style="margin-top:14px;">';
    demoProfiles.forEach(function(p) {
        html += '<div class="rpt-demo-card" onclick="event.stopPropagation(); openDemoScoutingReport(\'' + escapeHtml(p.file) + '\', \'' + escapeHtml(p.name).replace(/'/g, "\\'") + '\')">'
            + '<div class="rpt-demo-emoji">' + p.emoji + '</div>'
            + '<div style="flex:1; min-width:0;">'
            + '<div style="font-weight:700; margin-bottom:2px;">' + escapeHtml(p.name) + '</div>'
            + '<div style="font-size:0.78em; color:var(--text-muted); margin-bottom:4px;">' + escapeHtml(p.show) + '</div>'
            + '<div style="font-size:0.82em; color:var(--text-secondary);">' + escapeHtml(p.role) + '</div>'
            + '<div style="font-size:0.78em; color:var(--text-muted);">' + escapeHtml(p.company) + '</div></div>'
            + '<div style="text-align:center; min-width:48px;">'
            + '<div style="font-size:1.3em; font-weight:800; color:' + scoreColor(p.match) + ';">' + p.match + '%</div>'
            + '<div style="font-size:0.6em; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">Match</div></div>'
            + '</div>';
    });
    html += '</div></div></div>';
    
    // ── Credential Vault (Teaser) ───────────────────────
    html += '<div class="rpt-card" style="margin-bottom:32px;">'
        + '<div class="rpt-card-h">' + bpIcon('award', 16) + ' Credential Vault</div>'
        + '<div class="rpt-card-sub">Manage education, certifications, and verification documents.</div>'
        + '<div style="padding:28px; text-align:center;">'
        + '<div style="font-size:1.6em; margin-bottom:10px; opacity:0.35;">🔒</div>'
        + '<div style="font-weight:600; color:var(--text-secondary); margin-bottom:4px;">Coming Soon</div>'
        + '<div style="font-size:0.82em; color:var(--text-muted); line-height:1.5;">Upload and manage verified credentials that auto-populate across all scouting reports.</div>'
        + '</div></div>';
    
    html += '</div>'; // close blueprint-container
    
    el.innerHTML = html;
}
// Open any demo scouting report in iframe overlay
export function openDemoScoutingReport(filePath, name, isMismatch) {
    var existing = document.getElementById('scoutReportOverlay');
    if (existing) existing.remove();
    
    var overlay = document.createElement('div');
    overlay.id = 'scoutReportOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;';
    
    var container = document.createElement('div');
    container.style.cssText = 'width:100%;max-width:1200px;height:90vh;background:var(--bg);border:1px solid var(--border);border-radius:16px;overflow:hidden;position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.5);display:flex;flex-direction:column;';
    
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border);background:var(--elev-1);flex-shrink:0;';
    header.innerHTML = '<div style="display:flex;align-items:center;gap:10px;"><span style="color:var(--accent);">' + bpIcon('target',18) + '</span><span style="font-weight:600;font-size:0.92em;">' + escapeHtml(name || 'Scouting Report') + '</span><span style="font-size:0.72em;padding:2px 8px;border-radius:10px;background:rgba(245,158,11,0.1);color:#f59e0b;font-weight:600;">DEMO</span></div>'
        + '<button onclick="document.getElementById(\'scoutReportOverlay\').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.3em;cursor:pointer;padding:4px 8px;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text-muted)\'">✕</button>';
    
    // Context banner for mismatched or generic demo viewing
    var contextBanner = document.createElement('div');
    var currentProfileName = (userData.profile && userData.profile.name) || '';
    var reportCharName = (name || '').split(' \u2192')[0].trim();
    var showMismatch = isMismatch || (currentProfileName && reportCharName && currentProfileName !== reportCharName);
    
    if (showMismatch) {
        contextBanner.style.cssText = 'padding:10px 20px;background:rgba(245,158,11,0.06);border-bottom:1px solid rgba(245,158,11,0.15);flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;';
        contextBanner.innerHTML = '<div style="font-size:0.8em;color:#d4a017;line-height:1.5;">'
            + '<strong>Sample Report:</strong> You\u2019re viewing ' + reportCharName + '\u2019s scouting report. '
            + 'During the preview, sample reports are available for select characters. When you build your own Blueprint, reports are generated from your actual skills and job matches.'
            + '</div>'
            + '<button onclick="sendFeedback(\'report-viewer\')" style="white-space:nowrap;padding:5px 12px;border-radius:6px;border:1px solid rgba(245,158,11,0.2);background:rgba(245,158,11,0.08);color:#fbbf24;font-size:0.72em;font-weight:600;cursor:pointer;">Feedback</button>';
    } else {
        contextBanner.style.cssText = 'padding:10px 20px;background:rgba(96,165,250,0.05);border-bottom:1px solid rgba(96,165,250,0.12);flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;';
        contextBanner.innerHTML = '<div style="font-size:0.8em;color:#64748b;line-height:1.5;">'
            + 'This is a sample Scouting Report showing how Blueprint builds targeted career intelligence for a specific job. When you build your own Blueprint, these are generated from your actual data.'
            + '</div>'
            + '<button onclick="sendFeedback(\'report-viewer\')" style="white-space:nowrap;padding:5px 12px;border-radius:6px;border:1px solid rgba(96,165,250,0.2);background:rgba(96,165,250,0.06);color:#60a5fa;font-size:0.72em;font-weight:600;cursor:pointer;">Feedback</button>';
    }
    
    var iframe = document.createElement('iframe');
    iframe.src = filePath;
    iframe.style.cssText = 'flex:1;width:100%;border:none;background:var(--bg);';
    
    container.appendChild(header);
    container.appendChild(contextBanner);
    container.appendChild(iframe);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    var escHandler = function(e) { if (!overlay.isConnected) { document.removeEventListener('keydown', escHandler); return; } if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }};
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.remove(); document.removeEventListener('keydown', escHandler); } });
    document.addEventListener('keydown', escHandler);
}
// Demo sample report viewer — maps current profile to one of the 4 sample HTML reports
export function viewDemoSampleReport(format) {
    closeExportModal();
    
    // Map template IDs to available sample reports
    var sampleReports = {
        'game-of-thrones': { file: 'reports/demos/tyrion-lannister.html', name: 'Tyrion Lannister \u2192 UN Chief of Staff' },
        'breaking-bad': { file: 'reports/demos/walter-white.html', name: 'Walter White \u2192 Gray Matter CSO' },
        'stranger-things': { file: 'reports/demos/jim-hopper.html', name: 'Jim Hopper \u2192 DHS Crisis Response' },
        'succession': { file: 'reports/demos/kendall-roy.html', name: 'Kendall Roy \u2192 Waystar CEO' }
    };
    
    // Also map individual character IDs to their show's sample
    var characterToShow = {
        'tyrion-lannister': 'game-of-thrones', 'cersei-lannister': 'game-of-thrones',
        'tywin-lannister': 'game-of-thrones', 'petyr-baelish': 'game-of-thrones',
        'daenerys-targaryen': 'game-of-thrones', 'jon-snow': 'game-of-thrones',
        'walter-white': 'breaking-bad', 'jesse-pinkman': 'breaking-bad',
        'gus-fring': 'breaking-bad', 'hank-schrader': 'breaking-bad',
        'saul-goodman': 'breaking-bad', 'tuco-salamanca': 'breaking-bad',
        'jim-hopper': 'stranger-things', 'joyce-byers': 'stranger-things',
        'dustin-henderson': 'stranger-things', 'eleven': 'stranger-things',
        'steve-harrington': 'stranger-things', 'murray-bauman': 'stranger-things',
        'kendall-roy': 'succession', 'logan-roy': 'succession',
        'shiv-roy': 'succession', 'roman-roy': 'succession',
        'tom-wambsgans': 'succession', 'gerri-kellman': 'succession'
    };
    
    var tid = userData.templateId || '';
    var showKey = characterToShow[tid] || tid;
    var sample = sampleReports[showKey];
    var isMismatch = false;
    
    // If current profile doesn't have a matching sample, pick one at random
    if (!sample) {
        var keys = Object.keys(sampleReports);
        sample = sampleReports[keys[Math.floor(Math.random() * keys.length)]];
        isMismatch = true;
    }
    
    // Check if the sample character matches the current profile
    var sampleCharName = sample.name.split(' \u2192')[0].trim().toLowerCase();
    var currentName = ((userData.profile && userData.profile.name) || '').toLowerCase();
    if (currentName && sampleCharName && currentName !== sampleCharName) {
        isMismatch = true;
    }
    
    if (format === 'pdf') {
        showToast('PDF sample preview opening as interactive report. Full PDF generation available with your own profile.', 'info', 3000);
    }
    
    // Open in the existing iframe overlay with a demo explanation banner
    openDemoScoutingReport(sample.file, sample.name, isMismatch);
}

if (!window.initReports) window.initReports = initReports;
if (!window.openDemoScoutingReport) window.openDemoScoutingReport = openDemoScoutingReport;
if (!window.viewDemoSampleReport) window.viewDemoSampleReport = viewDemoSampleReport;
