// views/jobs.js — Blueprint v4.46.21
// Phase 7f extraction — Jobs pipeline, matching engine, Fit For Me

import { bpIcon }                          from '../ui/icons.js';
import { escapeHtml }                      from '../core/security.js';
import { showToast }                       from '../ui/toast.js';
import { _sd, _bd, waitForUserData }       from '../core/data-helpers.js';
import { BP_AI_MODEL, BP_AI_MODEL_FAST }   from '../core/constants.js';

var _fitForMeExpanded = {};
var _fitForMeSort = 'score-desc';

export function _fitBuildSearchTerms() {
    var terms = [];
    var roles = (window._userData.roles || []).map(function(r) { return r.name || r; });
    roles.forEach(function(r) { terms.push(r); });
    var keySkills = (_sd().skills || []).filter(function(s) { return s.key; }).map(function(s) { return s.name; });
    if (keySkills.length > 0 && roles.length > 0) {
        terms.push(roles[0] + ' ' + keySkills.slice(0, 2).join(' '));
    }
    if (terms.length === 0) {
        var topSkills = (_sd().skills || []).filter(function(s) { return s.level === 'Expert' || s.level === 'Advanced'; }).slice(0, 3).map(function(s) { return s.name; });
        if (topSkills.length > 0) terms.push(topSkills.join(' '));
    }
    if (terms.length === 0) terms.push('manager');
    return terms.slice(0, 5);
}

async function _fitFetchAndScore() {
    if (_fitForMeLoading) return;
    _fitForMeLoading = true;
    _fitForMeData = [];

    var terms = _fitBuildSearchTerms();
    var location = '';
    if (window._userData.profile && window._userData.profile.location) location = window._userData.profile.location;
    console.log('[FIT] Searching with terms:', terms.join(' | '), 'location:', location || '(any)');

    var allJobs = [];
    var seen = new Set();

    var fetches = terms.map(function(term) {
        var params = new URLSearchParams({ q: term });
        if (location) params.set('location', location);
        return fetch(JOBS_PROXY_URL + '?' + params.toString(), { signal: AbortSignal.timeout(20000) })
            .then(function(r) { return r.json(); })
            .then(function(data) { return data.jobs || []; })
            .catch(function(e) { console.warn('[FIT] Fetch error for "' + term + '":', e.message); return []; });
    });

    try {
        var results = await Promise.all(fetches);
        results.forEach(function(jobs) {
            jobs.forEach(function(job) {
                var key = ((job.title || '') + '|' + (job.company || '')).toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    allJobs.push(job);
                }
            });
        });
    } catch(e) {
        console.warn('[FIT] Fetch all failed:', e.message);
    }

    console.log('[FIT] Fetched ' + allJobs.length + ' unique jobs from ' + terms.length + ' queries');

    allJobs.forEach(function(job) {
        var jdText = (job.title || '') + '\n' + (job.description || '') + '\n' + (job.tags || []).join(' ');
        try {
            var parsed = parseJobLocally(jdText);
            var matchResult = matchJobToProfile(parsed);
            job._fitParsed = parsed;
            job._fitMatch = matchResult;
            job.matchScore = matchResult.score;
            job.matchedSkills = (matchResult.matched || []).map(function(m) { return m.userSkill || m.jobSkill; });
            job.gapSkills = (matchResult.gaps || []).map(function(g) { return g.name; });
            job._fitSkillsExtracted = (parsed.skills || []).length;
            job._fitParsedTitle = parsed.title;
            job._fitSeniority = parsed.seniority;
        } catch(e) {
            job.matchScore = 0;
            job.matchedSkills = [];
            job.gapSkills = [];
            job._fitSkillsExtracted = 0;
        }
    });

    allJobs.sort(function(a, b) { return (b.matchScore || 0) - (a.matchScore || 0); });
    _fitForMeData = allJobs.filter(function(j) { return j.matchScore > 0; });
    _fitForMeLastRun = Date.now();
    _fitForMeLoading = false;

    var pipelineIds = {};
    (window._userData.savedJobs || []).forEach(function(j) {
        pipelineIds[((j.title || '') + '-' + (j.company || '')).toLowerCase()] = true;
    });
    _fitForMeData.forEach(function(j) {
        j._inPipeline = !!pipelineIds[((j.title || '') + '-' + (j.company || '')).toLowerCase()];
    });

    console.log('[FIT] Scored ' + _fitForMeData.length + ' jobs with match > 0. Top score: ' + (_fitForMeData[0] ? _fitForMeData[0].matchScore : 0));
}

export function _fitSortData() {
    var d = _fitForMeData.slice();
    if (_fitForMeSort === 'score-asc') d.sort(function(a, b) { return a.matchScore - b.matchScore; });
    else if (_fitForMeSort === 'title-asc') d.sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
    else if (_fitForMeSort === 'company-asc') d.sort(function(a, b) { return (a.company || '').localeCompare(b.company || ''); });
    else d.sort(function(a, b) { return (b.matchScore || 0) - (a.matchScore || 0); });
    return d;
}

async function renderFitForMe(el) {
    if (!el) return;
    var userSkillCount = (_sd().skills || []).length;
    var roleCount = (window._userData.roles || []).length;

    if (userSkillCount === 0 && roleCount === 0) {
        el.innerHTML = '<div style="text-align:center; padding:60px 20px;">'
            + '<div style="margin-bottom:16px; opacity:0.3;">' + bpIcon('activity',48) + '</div>'
            + '<p style="font-size:1.1em; color:var(--c-heading); margin-bottom:8px;">Build Your Profile First</p>'
            + '<p style="font-size:0.88em; color:var(--text-muted); max-width:400px; margin:0 auto;">Add skills and target roles to your Blueprint profile. Fit For Me uses your profile to automatically find and rank matching jobs.</p></div>';
        return;
    }

    var staleMinutes = _fitForMeLastRun ? Math.round((Date.now() - _fitForMeLastRun) / 60000) : -1;

    if (_fitForMeData.length === 0 && !_fitForMeLoading && staleMinutes < 0) {
        el.innerHTML = '<div style="text-align:center; padding:48px 20px;">'
            + '<div class="loading-spinner" style="width:32px; height:32px; border-width:3px; margin:0 auto 16px;"></div>'
            + '<p style="font-size:1em; color:var(--text-secondary);">Analyzing your profile and finding matches...</p>'
            + '<p style="font-size:0.82em; color:var(--text-muted); margin-top:8px;">Running full matching engine across multiple job sources</p></div>';
        await _fitFetchAndScore();
        renderFitForMe(el);
        return;
    }

    if (_fitForMeLoading) {
        el.innerHTML = '<div style="text-align:center; padding:48px 20px;">'
            + '<div class="loading-spinner" style="width:32px; height:32px; border-width:3px; margin:0 auto 16px;"></div>'
            + '<p style="color:var(--text-secondary);">Matching in progress...</p></div>';
        return;
    }

    var sorted = _fitSortData();
    var totalFetched = _fitForMeData.length;

    var fitMinMatch = window._userData.preferences.minimumMatchScore || 35;
    var fitMinSkills = window._userData.preferences.minimumSkillMatches || 3;

    var html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:10px;">'
        + '<div>'
        + '<div style="font-size:0.95em; color:var(--text-secondary);"><strong>' + totalFetched + '</strong> jobs ranked by full matching engine</div>'
        + (staleMinutes >= 0 ? '<div style="font-size:0.75em; color:var(--text-muted); margin-top:2px;">Updated ' + (staleMinutes < 1 ? 'just now' : staleMinutes + ' min ago') + '</div>' : '')
        + '</div>'
        + '<div style="display:flex; gap:8px; align-items:center;">'
        + '<select onchange="_fitForMeSort=this.value; renderFitForMe(document.getElementById(\'jobsSubTabContent\'));" style="padding:5px 10px; border-radius:6px; border:1px solid var(--border); background:var(--c-input-bg-soft); color:var(--text-primary); font-size:0.82em;">'
        + '<option value="score-desc"' + (_fitForMeSort === 'score-desc' ? ' selected' : '') + '>Best Match First</option>'
        + '<option value="score-asc"' + (_fitForMeSort === 'score-asc' ? ' selected' : '') + '>Lowest Match First</option>'
        + '<option value="title-asc"' + (_fitForMeSort === 'title-asc' ? ' selected' : '') + '>Title A\u2013Z</option>'
        + '<option value="company-asc"' + (_fitForMeSort === 'company-asc' ? ' selected' : '') + '>Company A\u2013Z</option>'
        + '</select>'
        + '<button onclick="_fitForMeData=[]; _fitForMeLastRun=0; renderFitForMe(document.getElementById(\'jobsSubTabContent\'));" style="padding:6px 14px; background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.82em; display:flex; align-items:center; gap:5px;">' + bpIcon('refresh',12) + ' Refresh</button>'
        + '</div></div>';

    html += '<div style="display:flex; align-items:center; gap:16px; margin-bottom:14px; padding:10px 14px; background:var(--c-input-bg-soft); border-radius:8px; border:1px solid var(--border); flex-wrap:wrap;">'
        + '<div style="display:flex; align-items:center; gap:6px;">'
        + '<span style="font-size:0.82em; color:var(--text-muted); white-space:nowrap;">Min match:</span>'
        + '<input type="range" min="0" max="80" value="' + fitMinMatch + '" '
        + 'oninput="updateFitMinMatch(this.value)" style="width:120px; accent-color:var(--accent);" />'
        + '<span id="fitMatchValue" style="font-weight:600; color:var(--accent); font-size:0.85em; min-width:30px;">' + fitMinMatch + '%</span>'
        + '</div>'
        + '<div style="display:flex; align-items:center; gap:6px;">'
        + '<span style="font-size:0.82em; color:var(--text-muted); white-space:nowrap;">Min skills:</span>'
        + '<input type="number" id="fitMinSkillsInput" min="0" max="20" value="' + fitMinSkills + '" '
        + 'onchange="updateFitMinSkills(this.value)" '
        + 'style="width:48px; padding:4px 6px; background:var(--c-input-bg); border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.85em; text-align:center;" />'
        + '</div>'
        + '</div>';

    sorted = sorted.filter(function(j) {
        if ((j.matchScore || 0) < fitMinMatch) return false;
        if ((j.matchedSkills || []).length < fitMinSkills) return false;
        return true;
    });

    if (sorted.length === 0) {
        html += '<div style="text-align:center; padding:40px 20px;">'
            + '<div style="margin-bottom:12px; opacity:0.3;">' + bpIcon('search',48) + '</div>'
            + '<p style="color:var(--text-secondary);">No matching jobs found. Try refreshing or updating your profile.</p></div>';
        el.innerHTML = html;
        return;
    }

    html += '<div style="display:flex; flex-direction:column; gap:10px;">';
    sorted.slice(0, 50).forEach(function(job, idx) {
        var score = job.matchScore || 0;
        var matchColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#6b7280';
        var jobUrl = (job.url && /^https?:\/\//i.test(job.url)) ? escapeHtml(job.url) : '#';
        var isExpanded = _fitForMeExpanded[idx];
        var matchResult = job._fitMatch || {};
        var matched = matchResult.matched || [];
        var gaps = matchResult.gaps || [];

        html += '<div style="padding:16px 20px; border-radius:10px; border:1px solid ' + (score >= 70 ? 'rgba(16,185,129,0.3)' : 'var(--border)') + '; background:var(--c-input-bg-soft);">';

        html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:8px;">'
            + '<div style="flex:1; min-width:0;">'
            + '<a href="' + jobUrl + '" target="_blank" rel="noopener noreferrer" style="font-size:1.05em; font-weight:600; color:var(--text-primary); text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block;" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text-primary)\'">' + escapeHtml(job.title || 'Untitled') + '</a>'
            + '<div style="font-size:0.85em; color:var(--text-muted); margin-top:2px;">'
            + escapeHtml(job.company || 'Unknown') + (job.location ? ' \u00B7 ' + escapeHtml(job.location) : '')
            + (job.source ? ' \u00B7 <span style="color:var(--accent);">' + escapeHtml(job.source) + '</span>' : '') + '</div></div>'
            + '<div style="text-align:center; min-width:56px;">'
            + '<div style="font-size:1.4em; font-weight:700; color:' + matchColor + ';">' + score + '%</div>'
            + '<div style="font-size:0.68em; color:' + ((job._fitMatch && job._fitMatch.lowConfidence) ? '#f59e0b' : 'var(--text-muted)') + ';">' + ((job._fitMatch && job._fitMatch.lowConfidence) ? '\u26A0 limited' : 'match') + '</div></div></div>';

        html += '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">';
        (job.matchedSkills || []).slice(0, 8).forEach(function(s) {
            html += '<span style="padding:2px 8px; border-radius:10px; font-size:0.73em; background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2);">' + escapeHtml(s) + '</span>';
        });
        (job.gapSkills || []).slice(0, 4).forEach(function(s) {
            html += '<span style="padding:2px 8px; border-radius:10px; font-size:0.73em; background:rgba(239,68,68,0.06); color:#ef4444; border:1px solid rgba(239,68,68,0.15);">' + escapeHtml(s) + '</span>';
        });
        html += '</div>';

        html += '<div style="display:flex; gap:8px; align-items:center; font-size:0.8em;">'
            + '<span style="color:' + ((job._fitSkillsExtracted || 0) < 5 ? '#f59e0b' : 'var(--text-muted)') + ';">' + (job._fitSkillsExtracted || 0) + ' skills parsed' + ((job._fitSkillsExtracted || 0) < 5 ? ' \u26A0' : '') + ' \u00B7 ' + matched.length + ' matched \u00B7 ' + gaps.length + ' gaps</span>'
            + '<button onclick="_fitForMeExpanded[' + idx + ']=!' + (isExpanded ? 'true' : 'false') + '; renderFitForMe(document.getElementById(\'jobsSubTabContent\'));" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:0.9em; padding:2px 6px;">' + (isExpanded ? '\u25B2 Less' : '\u25BC Details') + '</button>';
        if (!job._inPipeline) {
            html += '<button onclick="_fitAddToPipeline(' + idx + ')" style="background:none; border:1px solid var(--accent); color:var(--accent); padding:3px 10px; border-radius:6px; cursor:pointer; font-size:0.85em; font-weight:600;">+ Pipeline</button>';
        } else {
            html += '<span style="color:#10b981; font-size:0.85em; font-weight:500;">\u2713 In Pipeline</span>';
        }
        html += '</div>';

        if (isExpanded) {
            html += '<div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--c-surface-3);">';

            if (matched.length > 0) {
                html += '<div style="font-size:0.72em; text-transform:uppercase; letter-spacing:0.06em; color:#10b981; font-weight:600; margin-bottom:6px;">Matched Skills (' + matched.length + ')</div>'
                    + '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:4px; margin-bottom:12px;">';
                matched.forEach(function(m) {
                    var quality = Math.round((m.nameMatch || 0) * (m.profMatch || 1) * 100);
                    var qColor = quality >= 80 ? '#10b981' : quality >= 50 ? '#f59e0b' : '#ef4444';
                    html += '<div style="padding:6px 10px; background:rgba(16,185,129,0.04); border-radius:6px; border-left:2px solid ' + qColor + '; font-size:0.82em;">'
                        + '<span style="font-weight:600; color:var(--c-heading);">' + escapeHtml(m.jobSkill) + '</span>'
                        + (m.userSkill !== m.jobSkill ? ' <span style="color:var(--text-muted);">\u2192 ' + escapeHtml(m.userSkill) + '</span>' : '')
                        + (m.userLevel ? ' <span style="color:' + qColor + '; font-size:0.9em;">(' + m.userLevel + ')</span>' : '')
                        + '</div>';
                });
                html += '</div>';
            }

            if (gaps.length > 0) {
                html += '<div style="font-size:0.72em; text-transform:uppercase; letter-spacing:0.06em; color:#ef4444; font-weight:600; margin-bottom:6px;">Gaps (' + gaps.length + ')</div>'
                    + '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:12px;">';
                gaps.forEach(function(g) {
                    html += '<span style="padding:3px 10px; border-radius:10px; font-size:0.78em; background:rgba(239,68,68,0.06); color:#ef4444; border:1px solid rgba(239,68,68,0.12);">'
                        + escapeHtml(g.name) + ' <span style="font-size:0.85em; color:var(--text-muted);">(' + (g.requirement || 'Required') + ')</span></span>';
                });
                html += '</div>';
            }

            var surplus = matchResult.surplus || [];
            if (surplus.length > 0) {
                html += '<div style="font-size:0.72em; text-transform:uppercase; letter-spacing:0.06em; color:#60a5fa; font-weight:600; margin-bottom:6px;">Your Additional Skills (' + surplus.length + ')</div>'
                    + '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">';
                surplus.slice(0, 10).forEach(function(s) {
                    html += '<span style="padding:2px 8px; border-radius:10px; font-size:0.73em; background:rgba(96,165,250,0.06); color:#60a5fa; border:1px solid rgba(96,165,250,0.12);">' + escapeHtml(s.name) + '</span>';
                });
                if (surplus.length > 10) html += '<span style="font-size:0.73em; color:var(--text-muted);">+' + (surplus.length - 10) + ' more</span>';
                html += '</div>';
            }

            html += '</div>';
        }

        html += '</div>';
    });
    html += '</div>';

    if (sorted.length > 50) {
        html += '<div style="text-align:center; padding:16px; font-size:0.85em; color:var(--text-muted);">Showing top 50 of ' + sorted.length + ' results</div>';
    }

    el.innerHTML = html;
}

export function _fitAddToPipeline(idx) {
    if (readOnlyGuard()) return;
    var job = _fitForMeData[idx];
    if (!job) return;
    var jdText = (job.title || '') + '\n' + (job.description || '') + '\n' + (job.tags || []).join(' ');
    var parsed = job._fitParsed || parseJobLocally(jdText);
    var matchResult = job._fitMatch || matchJobToProfile(parsed);
    var entry = {
        title: job.title || parsed.title,
        company: job.company || parsed.company,
        location: job.location || '',
        url: job.url || '',
        source: job.source || '',
        salary: job.salary || '',
        type: job.type || '',
        dateAdded: new Date().toISOString(),
        addedAt: new Date().toISOString(),
        matchData: matchResult,
        parsedSkills: parsed.skills || [],
        rawText: jdText,
        addedFrom: 'fit-for-me'
    };
    if (!window._userData.savedJobs) window._userData.savedJobs = [];
    window._userData.savedJobs.unshift(entry);
    saveUserData();
    job._inPipeline = true;
    showToast('Added to Pipeline: ' + (job.title || 'Job'), 'success');
    var el = document.getElementById('jobsSubTabContent');
    if (el) renderFitForMe(el);
}
if (!window._fitAddToPipeline) window._fitAddToPipeline = _fitAddToPipeline;

export async function initOpportunities() {
    if (!window._userData || !window._userData.initialized) {
        await waitForUserData();
    }
    const view = document.getElementById('opportunitiesView');
    var savedCount = (window._userData.savedJobs || []).length;
    var appCount = (window._userData.applications || []).length;
    
    view.innerHTML = '<div style="max-width:1200px; margin:0 auto; padding:24px;">'
        + '<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:16px;">'
        + '<div class="jobs-subtabs" style="margin-bottom:0;">'
        + '<button class="jobs-subtab ' + (jobsSubTab === 'your-jobs' ? 'active' : '') + '" onclick="switchJobsSubTab(\'your-jobs\')">' + bpIcon('target',14) + ' Pipeline' + (savedCount > 0 ? ' (' + savedCount + ')' : '') + '</button>'
        + '<button class="jobs-subtab ' + (jobsSubTab === 'find-jobs' ? 'active' : '') + '" onclick="switchJobsSubTab(\'find-jobs\')">' + bpIcon('search',14) + ' Find Jobs' + (opportunitiesData.length > 0 ? ' (' + opportunitiesData.length + ')' : '') + '</button>'
        + '<button class="jobs-subtab ' + (jobsSubTab === 'fit-for-me' ? 'active' : '') + '" onclick="switchJobsSubTab(\'fit-for-me\')">' + bpIcon('activity',14) + ' Fit For Me' + (_fitForMeData.length > 0 ? ' (' + _fitForMeData.length + ')' : '') + '</button>'
        + '<button class="jobs-subtab ' + (jobsSubTab === 'tracker' ? 'active' : '') + '" onclick="switchJobsSubTab(\'tracker\')">' + bpIcon('tracker',14) + ' Tracker' + (appCount > 0 ? ' (' + appCount + ')' : '') + '</button>'
        + '</div>'
        + '</div>'
        + '<div id="jobsSubTabContent"></div>'
        + '</div>';
    
    renderJobsSubTab();
}

export function switchJobsSubTab(tab) {
    jobsSubTab = tab;
    // Re-render the full jobs view to update subtab active states and counts
    window.opportunitiesInitialized = false;
    initOpportunities();
    window.opportunitiesInitialized = true;
}
if (!window.switchJobsSubTab) window.switchJobsSubTab = switchJobsSubTab;

export function renderJobsSubTab() {
    var el = document.getElementById('jobsSubTabContent');
    if (!el) return;
    if (jobsSubTab === 'your-jobs') {
        el.innerHTML = renderSavedJobs();
    } else if (jobsSubTab === 'fit-for-me') {
        renderFitForMe(el);
        return;
    } else if (jobsSubTab === 'tracker') {
        el.innerHTML = renderTrackerInJobs();
    } else {
        el.innerHTML = renderFindJobs();
        if (opportunitiesData && opportunitiesData.length > 0) {
            renderOpportunities();
        } else {
            var rd = document.getElementById('opportunitiesResults');
            if (rd) rd.innerHTML = '<div style="text-align:center; padding:48px 20px;">'
                + '<div style="margin-bottom:16px; opacity:0.3;">' + bpIcon('search',48) + '</div>'
                + '<p style="font-size:1.05em; color:var(--text-secondary); margin-bottom:6px;">Search for jobs across 7 sources</p>'
                + '<p style="font-size:0.85em; color:var(--text-muted);">Enter a keyword and hit Search to find matching roles.</p></div>';
        }
    }
}

// Render the Application Tracker inline within Jobs tab
export function renderTrackerInJobs() {
    var apps = window._userData.applications || [];
    var html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">'
        + '<div>'
        + '<p style="font-size:0.85em; color:var(--text-muted); margin:0;">Track your applications and follow-ups</p>'
        + '</div>'
        + '<button onclick="addApplicationModal()" style="'
        + 'background:var(--accent); color:#fff; border:none; padding:10px 20px; border-radius:8px; '
        + 'cursor:pointer; font-weight:600; font-size:0.9em;">+ Add Application</button>'
        + '</div>';
    
    if (apps.length === 0) {
        html += '<div style="text-align:center; padding:60px 20px;">'
            + '<div style="margin-bottom:16px; opacity:0.4;">' + bpIcon('tracker',48) + '</div>'
            + '<div style="font-size:1.1em; font-weight:600; color:var(--text-primary); margin-bottom:8px;">No applications tracked yet</div>'
            + '<div style="color:var(--text-muted); max-width:400px; margin:0 auto 24px; line-height:1.5;">'
            + 'When you add a job to your pipeline and generate a pitch, you can track the application here.</div>'
            + '<button onclick="addApplicationModal()" style="'
            + 'background:var(--accent); color:#fff; border:none; padding:12px 28px; border-radius:8px; '
            + 'cursor:pointer; font-weight:600; font-size:0.95em;">+ Track an Application</button>'
            + '</div>';
        return html;
    }
    
    // Status summary
    var grouped = {
        applied: apps.filter(function(a) { return a.status === 'applied'; }),
        interviewing: apps.filter(function(a) { return a.status === 'interviewing'; }),
        offer: apps.filter(function(a) { return a.status === 'offer'; }),
        rejected: apps.filter(function(a) { return a.status === 'rejected'; })
    };
    
    html += '<div style="margin-bottom:20px; display:flex; gap:15px; flex-wrap:wrap;">'
        + '<div class="application-status status-applied">' + grouped.applied.length + ' Applied</div>'
        + '<div class="application-status status-interviewing">' + grouped.interviewing.length + ' Interviewing</div>'
        + '<div class="application-status status-offer">' + grouped.offer.length + ' Offers</div>'
        + '<div class="application-status status-rejected">' + grouped.rejected.length + ' Closed</div>'
        + '</div>'
        + '<div class="applications-grid">'
        + apps.map(function(app, idx) { return renderApplicationCard(app, idx); }).join('')
        + '</div>';
    
    return html;
}
if (!window.renderTrackerInJobs) window.renderTrackerInJobs = renderTrackerInJobs;

export function renderSavedJobs() {
    var jobs = window._userData.savedJobs || [];
    jobs.forEach(function(job) {
        if (!job.matchData && job.matchResult) {
            job.matchData = job.matchResult;
            delete job.matchResult;
        }
        if (!job.parsedSkills && job.parsedData && job.parsedData.skills) {
            job.parsedSkills = job.parsedData.skills;
        }
        if (!job.addedAt && job.dateAdded) job.addedAt = job.dateAdded;
        if (!job.matchData) job.matchData = { score: 0, matched: [], gaps: [], surplus: [] };
    });
    var html = '';
    
    // Add Job button
    html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; gap:16px; flex-wrap:wrap;">'
        + '<div style="min-width:0;">'
        + '<h2 style="font-family:Outfit,sans-serif; font-size:1.3em; font-weight:700; color:var(--text-primary); margin:0; letter-spacing:0.08em; text-transform:uppercase;">Job Pipeline</h2>'
        + '<p style="font-size:0.85em; color:var(--text-muted); margin-top:4px;">Your saved jobs and skill match analysis</p>'
        + '</div>'
        + '<div style="display:flex; gap:8px; flex-shrink:0;">'
        + '<button onclick="rescoreAllJobs(); renderJobsSubTab();" style="'
        + 'background:none; border:1px solid var(--border); color:var(--text-muted); padding:10px 16px; border-radius:8px; '
        + 'cursor:pointer; font-size:0.85em;" title="Re-calculate match scores based on current skills">\u21BB Refresh Matches</button>'
        + '<button onclick="showAddJobModal()" style="'
        + 'background:var(--accent); color:#fff; border:none; padding:10px 20px; border-radius:8px; '
        + 'cursor:pointer; font-weight:600; font-size:0.9em;">+ Add a Job</button>'
        + '</div>'
        + '</div>';
    
    if (jobs.length === 0) {
        html += '<div style="text-align:center; padding:60px 20px;">'
            + '<div style="margin-bottom:16px; opacity:0.4;">' + bpIcon('target',48) + '</div>'
            + '<div style="font-size:1.1em; font-weight:600; color:var(--text-primary); margin-bottom:8px;">No jobs yet</div>'
            + '<div style="color:var(--text-muted); max-width:400px; margin:0 auto 24px; line-height:1.5;">'
            + 'Paste a job description and see exactly how your skills map to what they need. Not a percentage. A network.</div>'
            + '<button onclick="showAddJobModal()" style="'
            + 'background:var(--accent); color:#fff; border:none; padding:12px 28px; border-radius:8px; '
            + 'cursor:pointer; font-weight:600; font-size:0.95em;">+ Add Your First Job</button>'
            + '</div>';
        return html;
    }
    
    // Render job cards
    jobs.forEach(function(job, idx) {
        var match = job.matchData || {};
        var matchPct = match.score || 0;
        var matchColor = matchPct >= 70 ? '#10b981' : matchPct >= 45 ? '#f59e0b' : '#6b7280';
        var matchedCount = (match.matched || []).length;
        var gapCount = (match.gaps || []).length;
        var surplusCount = (match.surplus || []).length;
        var dateStr = job.addedAt ? new Date(job.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        
        html += '<div class="job-cart-card" onclick="showJobDetail(' + idx + ')">'
            + '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">'
            + '<div style="flex:1; min-width:0;">'
            + '<div style="font-size:1.1em; font-weight:600; color:var(--text-primary); margin-bottom:3px;">' + (job.title || 'Untitled Position') + '</div>'
            + '<div style="font-size:0.88em; color:var(--text-muted);">'
            + (job.company || '')
            + (job.company && dateStr ? ' \u00B7 ' : '') + dateStr
            + (job.sourceUrl ? ' \u00B7 <a href="' + sanitizeUrl(job.sourceUrl) + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="color:var(--accent); text-decoration:none;">Source \u2192</a>' : '')
            + (job.sourceNote ? ' \u00B7 ' + job.sourceNote : '')
            + '</div></div>'
            + '<div style="text-align:right; min-width:70px;">'
            + '<div style="font-size:1.5em; font-weight:700; color:' + matchColor + ';">' + matchPct + '%</div>'
            + '<div style="font-size:0.7em; color:var(--text-muted);">match</div>'
            + '</div></div>';
        
        // Match bar
        html += '<div class="job-cart-match" style="margin-top:12px;">'
            + '<div class="job-cart-match-bar">'
            + '<div class="job-cart-match-fill" style="width:' + matchPct + '%; background:' + matchColor + ';"></div>'
            + '</div></div>';
        
        // Skill summary chips
        html += '<div style="margin-top:10px; display:flex; gap:12px; font-size:0.78em; color:var(--text-muted);">'
            + '<span style="color:#10b981;">\u2713 ' + matchedCount + ' matched</span>'
            + '<span style="color:#ef4444;">\u25CB ' + gapCount + ' gaps</span>'
            + '<span style="color:#6b7280;">\u25CF ' + surplusCount + ' surplus</span>'
            + '</div>';
        
        // BLS salary range (if available)
        if (job.blsSalary && job.blsSalary.median) {
            var bls = job.blsSalary;
            var lo = bls.pct25 ? '$' + bls.pct25.toLocaleString() : '';
            var hi = bls.pct75 ? '$' + bls.pct75.toLocaleString() : '';
            var med = '$' + bls.median.toLocaleString();
            var rangeStr = lo && hi ? lo + ' \u2013 ' + hi : 'Median ' + med;
            html += '<div style="margin-top:8px; font-size:0.78em; color:var(--text-muted); display:flex; align-items:center; gap:6px;">'
                + '<span style="color:#a78bfa;">' + bpIcon('dollar', 12) + '</span> '
                + '<span style="color:#a78bfa;">' + rangeStr + '</span>'
                + '<span style="opacity:0.5;"> \u00B7 ' + bls.title + ' (BLS)</span>'
                + '</div>';
        }
        
        // Edit/remove — hidden for sample jobs unless admin
        var isSampleJob = job.sample === true;
        if (isSampleJob && !fbIsAdmin) {
            html += '<div style="margin-top:8px; font-size:0.72em; color:var(--text-muted); text-align:right; font-style:italic;">' + bpIcon('lock', 10) + ' Demo job</div>';
        } else {
            html += '<div style="margin-top:8px; display:flex; justify-content:flex-end; gap:8px;">'
                + (isSampleJob ? '<span style="font-size:0.72em; color:var(--text-muted); align-self:center; margin-right:auto; font-style:italic;">' + bpIcon('lock', 10) + ' Demo</span>' : '')
                + '<button onclick="event.stopPropagation(); editJobInfo(' + idx + ')" style="'
                + 'background:none; border:1px solid var(--border); color:var(--text-muted); font-size:0.75em; '
                + 'cursor:pointer; padding:4px 10px; border-radius:5px;" '
                + 'onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text-muted)\'">\u270E Edit</button>'
                + '<button onclick="event.stopPropagation(); removeJob(' + idx + ')" style="'
                + 'background:none; border:1px solid rgba(239,68,68,0.2); color:var(--text-muted); font-size:0.75em; '
                + 'cursor:pointer; padding:4px 10px; border-radius:5px;" '
                + 'onmouseover="this.style.color=\'#ef4444\';this.style.borderColor=\'rgba(239,68,68,0.5)\'" '
                + 'onmouseout="this.style.color=\'var(--text-muted)\';this.style.borderColor=\'rgba(239,68,68,0.2)\'">\u2715 Remove</button>'
                + '</div>';
        }
        
        // Scouting Report CTA
        html += '<div onclick="event.stopPropagation(); launchScoutingReport()" style="'
            + 'margin-top:10px; padding:8px 14px; border-radius:8px; '
            + 'background:linear-gradient(135deg, rgba(96,165,250,0.08), rgba(99,102,241,0.05)); '
            + 'border:1px solid rgba(96,165,250,0.15); cursor:pointer; display:flex; align-items:center; '
            + 'gap:8px; font-size:0.8em; font-weight:600; color:var(--accent); transition:all 0.2s;" '
            + 'onmouseover="this.style.borderColor=\'rgba(96,165,250,0.4)\';this.style.background=\'rgba(96,165,250,0.12)\'" '
            + 'onmouseout="this.style.borderColor=\'rgba(96,165,250,0.15)\';this.style.background=\'linear-gradient(135deg, rgba(96,165,250,0.08), rgba(99,102,241,0.05))\'">'
            + bpIcon('file-text',14) + ' Create Scouting Report'
            + '</div>';
        
        html += '</div>';
    });
    
    return html;
}

export function renderFindJobs() {
    // Build role suggestions from user's profile
    var roleSuggestions = '';
    if (window._userData.roles && window._userData.roles.length > 0) {
        roleSuggestions = window._userData.roles.map(function(r) {
            return '<button onclick="document.getElementById(\'findJobsKeyword\').value=\'' + r.name.replace(/'/g, "\\'") + '\'; searchOpportunities();" '
                + 'style="padding:4px 12px; border-radius:14px; border:1px solid var(--border); background:none; '
                + 'color:var(--text-secondary); cursor:pointer; font-size:0.82em; transition:all 0.15s;" '
                + 'onmouseover="this.style.borderColor=\'var(--accent)\'; this.style.color=\'var(--accent)\'" '
                + 'onmouseout="this.style.borderColor=\'var(--border)\'; this.style.color=\'var(--text-secondary)\'">'
                + r.name + '</button>';
        }).join('');
    }
    
    return ''
        
        + '<div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap;">'
        + '<input id="findJobsKeyword" type="text" placeholder="Job title, skill, or keyword..." '
        + 'value="' + escapeHtml(window._lastJobSearch || '') + '" '
        + 'onkeydown="if(event.key===\'Enter\') searchOpportunities();" '
        + 'style="flex:2; min-width:180px; padding:10px 14px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:8px; color:var(--text-primary); font-size:0.92em;" />'
        + '<input id="findJobsLocation" type="text" placeholder="City, state, or remote..." '
        + 'value="' + escapeHtml(window._lastJobLocation || '') + '" '
        + 'onkeydown="if(event.key===\'Enter\') searchOpportunities();" '
        + 'style="flex:1; min-width:140px; padding:10px 14px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:8px; color:var(--text-primary); font-size:0.92em;" />'
        + '<button onclick="searchOpportunities()" style="padding:10px 20px; background:var(--accent); '
        + 'color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em; '
        + 'display:flex; align-items:center; gap:6px; white-space:nowrap;">'
        + bpIcon('search',14) + ' Search</button>'
        + '</div>'
        + '<div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center;">'
        
        + '<select id="findJobsCategory" style="padding:10px 14px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:8px; color:var(--text-primary); font-size:0.88em; min-width:150px;">'
        + '<option value="">All Categories</option>'
        + '<option value="software-dev">Software Dev</option>'
        + '<option value="marketing">Marketing</option>'
        + '<option value="business">Business</option>'
        + '<option value="data">Data Science</option>'
        + '<option value="design">Design</option>'
        + '<option value="product">Product</option>'
        + '<option value="hr">Human Resources</option>'
        + '<option value="finance">Finance</option>'
        + '<option value="sales">Sales</option>'
        + '<option value="customer-support">Customer Support</option>'
        + '<option value="writing">Writing</option>'
        + '<option value="devops">DevOps / SysAdmin</option>'
        + '</select>'
        
        + '<label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.85em; color:var(--text-secondary);">'
        + '<input type="checkbox" id="findJobsRemote" ' + (window._lastJobRemote ? 'checked' : '') + ' style="accent-color:var(--accent);"> Remote only</label>'
        
        + '<button onclick="clearJobSearch();" '
        + 'style="padding:8px 12px; background:none; border:1px solid var(--border); border-radius:8px; '
        + 'color:var(--text-muted); cursor:pointer; font-size:0.78em;">Clear</button>'
        + '<div style="display:flex; align-items:center; gap:12px; margin-left:auto; flex-wrap:wrap;">'
        + '<div style="display:flex; align-items:center; gap:6px;">'
        + '<span style="font-size:0.82em; color:var(--text-muted); white-space:nowrap;">Min match:</span>'
        + '<input type="range" min="0" max="80" value="' + currentMatchThreshold + '" '
        + 'oninput="updateMatchThreshold(this.value)" style="width:100px; accent-color:var(--accent);" />'
        + '<span id="matchValue" style="font-weight:600; color:var(--accent); font-size:0.85em; min-width:30px;">' + currentMatchThreshold + '%</span>'
        + '</div>'
        + '<div style="display:flex; align-items:center; gap:6px;">'
        + '<span style="font-size:0.82em; color:var(--text-muted); white-space:nowrap;">Min skills:</span>'
        + '<input type="number" id="findJobsMinSkills" min="0" max="20" value="' + (window._userData.preferences.minimumSkillMatches || 3) + '" '
        + 'onchange="updateMinSkillMatches(this.value)" '
        + 'style="width:48px; padding:4px 6px; background:var(--c-input-bg); border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.85em; text-align:center;" />'
        + '</div>'
        + '</div>'
        + '</div>'
        
        + (roleSuggestions ? '<div style="display:flex; gap:6px; margin-bottom:16px; flex-wrap:wrap;">'
        + '<span style="font-size:0.78em; color:var(--text-muted); padding:4px 0;">Quick search:</span>'
        + roleSuggestions + '</div>' : '')
        
        + '<div id="opportunitiesResults"></div>';
}

export function clearJobSearch() {
    var kw = document.getElementById('findJobsKeyword'); if (kw) kw.value = '';
    var loc = document.getElementById('findJobsLocation'); if (loc) loc.value = '';
    var cat = document.getElementById('findJobsCategory'); if (cat) cat.selectedIndex = 0;
    var rem = document.getElementById('findJobsRemote'); if (rem) rem.checked = false;
    window._lastJobSearch = ''; window._lastJobLocation = ''; window._lastJobRemote = false;
    opportunitiesData = [];
    var r = document.getElementById('opportunitiesResults'); if (r) r.innerHTML = '';
}
if (!window.clearJobSearch) window.clearJobSearch = clearJobSearch;

// ===== ADD JOB MODAL =====

export function showAddJobModal() {
    if (readOnlyGuard()) return;
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    var savedKey = safeGet('wbAnthropicKey') || '';
    var hasProxy = !!(typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
    var hasAI = hasProxy || !!savedKey;
    
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">Add a Job</h2>'
        + '<p style="color:var(--text-muted); margin-top:5px;">Paste a URL or job description text</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px;">'
        
        // URL input (primary path)
        + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px;">Job Posting URL</label>'
        + '<div style="display:flex; gap:8px;">'
        + '<input id="jdUrlInput" type="url" placeholder="https://careers.example.com/job/12345" style="'
        + 'flex:1; padding:10px 12px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.9em;" />'
        + '<button id="fetchUrlBtn" onclick="fetchAndAnalyzeUrl()" style="'
        + 'background:var(--accent); color:#fff; border:none; padding:10px 18px; border-radius:6px; '
        + 'cursor:pointer; font-weight:600; font-size:0.88em; white-space:nowrap;">\uD83D\uDD0D Fetch & Analyze</button>'
        + '</div>'
        + '<div style="font-size:0.75em; color:var(--text-muted); margin-top:4px;">Works with most ATS pages (Greenhouse, Lever, Rippling, Workday, LinkedIn, etc.)</div>'
        
        // Divider
        + '<div style="display:flex; align-items:center; gap:12px; margin:18px 0;">'
        + '<div style="flex:1; height:1px; background:var(--border);"></div>'
        + '<span style="font-size:0.78em; color:var(--text-muted);">or paste text directly</span>'
        + '<div style="flex:1; height:1px; background:var(--border);"></div>'
        + '</div>'
        
        // JD paste area (fallback)
        + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px;">Job Description Text</label>'
        + '<textarea id="jdTextInput" placeholder="Paste the full job description here..." style="'
        + 'width:100%; min-height:140px; padding:14px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:8px; color:var(--text-primary); '
        + 'font-size:0.92em; line-height:1.6; font-family:inherit; resize:vertical;"></textarea>'
        
        // Source note
        + '<div style="margin-top:12px;">'
        + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px; font-size:0.88em;">Source Note (optional)</label>'
        + '<input id="jdSourceNote" placeholder="e.g., Recruiter email, LinkedIn" style="'
        + 'width:100%; padding:10px 12px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.9em;" />'
        + '</div>'
        
        // Hidden fields populated by URL fetch
        + '<input id="jdSourceUrl" type="hidden" />'
        
        // API key (collapsible, only shown if no proxy)
        + (hasProxy ? '' : '<details style="margin-top:16px;">'
        + '<summary style="cursor:pointer; font-size:0.82em; color:var(--text-muted);">'
        + '\u26A1 AI-powered analysis (optional, requires API key)</summary>'
        + '<div style="margin-top:8px; padding:12px; background:var(--c-surface-1); '
        + 'border:1px solid var(--border); border-radius:8px;">'
        + '<input id="jdApiKey" type="password" placeholder="sk-ant-..." value="' + escapeHtml(savedKey) + '" style="'
        + 'width:100%; padding:10px 12px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.88em; font-family:monospace;" />'
        + '<div style="font-size:0.75em; color:var(--text-muted); margin-top:6px; line-height:1.5;">'
        + 'Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style="color:var(--accent);">console.anthropic.com</a>.'
        + '</div></div></details>')
        
        + '<div id="jdParsingStatus" style="display:none; margin-top:16px; padding:16px; border-radius:8px; text-align:center;"></div>'
        
        // Actions
        + '<div style="display:flex; gap:12px; justify-content:flex-end; margin-top:20px;">'
        + '<button onclick="closeExportModal()" style="'
        + 'background:transparent; color:var(--text-muted); border:1px solid var(--border); '
        + 'padding:10px 20px; border-radius:8px; cursor:pointer; font-size:0.9em;">Cancel</button>'
        + '<button id="analyzeJobBtn" onclick="analyzeJob()" style="'
        + 'background:var(--accent); color:#fff; border:none; padding:10px 24px; border-radius:8px; '
        + 'cursor:pointer; font-weight:600; font-size:0.9em;">\uD83D\uDD0D Analyze Text</button>'
        + '</div></div>';
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
    setTimeout(function() { var el = document.getElementById('jdUrlInput'); if (el) el.focus(); }, 100);
}
if (!window.showAddJobModal) window.showAddJobModal = showAddJobModal;

// ===== URL FETCH & AUTO-ANALYZE =====

async function fetchAndAnalyzeUrl() {
    var urlInput = document.getElementById('jdUrlInput');
    var url = (urlInput ? urlInput.value : '').trim();
    if (!url || !url.match(/^https?:\/\/.+/)) {
        showToast('Enter a valid job posting URL.', 'warning');
        return;
    }
    
    var fetchBtn = document.getElementById('fetchUrlBtn');
    var statusEl = document.getElementById('jdParsingStatus');
    fetchBtn.disabled = true;
    fetchBtn.textContent = 'Fetching...';
    statusEl.style.display = 'block';
    statusEl.style.background = 'var(--c-accent-bg-3a)';
    statusEl.innerHTML = '<div class="loading-spinner" style="width:24px; height:24px; border-width:2px; margin:0 auto 8px;"></div>'
        + '<div style="color:var(--text-secondary); font-size:0.88em;">Fetching & rendering page... This may take 10-20 seconds.</div>';
    
    try {
        var pageText = await fetchJobPageText(url);
        if (!pageText || pageText.length < 100) {
            throw new Error('Could not extract enough text from that page. Try pasting the job description directly.');
        }
        
        // Populate the textarea and source URL
        var textarea = document.getElementById('jdTextInput');
        if (textarea) textarea.value = pageText;
        var srcUrl = document.getElementById('jdSourceUrl');
        if (srcUrl) srcUrl.value = url;
        
        statusEl.innerHTML = '<div style="color:#10b981; font-size:0.88em;">\u2713 Fetched ' + pageText.length + ' characters. Analyzing...</div>';
        
        // Auto-trigger analysis
        await analyzeJob();
        
    } catch (err) {
        console.error('URL fetch error:', err);
        statusEl.style.background = 'var(--c-red-bg-2b)';
        statusEl.innerHTML = '<div style="color:#ef4444; font-size:0.88em;">\u26A0 ' + escapeHtml(err.message || 'Fetch failed') + '</div>'
            + '<div style="color:var(--text-muted); font-size:0.78em; margin-top:6px;">Tip: Copy the job description text and paste it in the field below.</div>';
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.textContent = '\uD83D\uDD0D Fetch & Analyze';
    }
}
if (!window.fetchAndAnalyzeUrl) window.fetchAndAnalyzeUrl = fetchAndAnalyzeUrl;

async function fetchJobPageText(url) {
    // Strategy 1: Firebase Cloud Function with Puppeteer (handles JS-rendered ATS pages)
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        try {
            var token = await firebase.auth().currentUser.getIdToken();
            var fnUrl = 'https://fetchjobpage-oiewslfoua-uc.a.run.app';
            var fnRes = await fetch(fnUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ url: url }),
                signal: AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined
            });
            if (fnRes.ok) {
                var fnData = await fnRes.json();
                if (fnData.text && fnData.text.length > 100) {
                    console.log('\u2713 Fetched via Cloud Function: ' + fnData.text.length + ' chars from ' + (fnData.domain || url));
                    return fnData.text;
                }
                console.warn('Cloud Function returned OK but insufficient text (' + (fnData.text || '').length + ' chars)');
            } else {
                var errData = await fnRes.json().catch(function() { return {}; });
                console.warn('Cloud Function returned ' + fnRes.status + ':', errData.error || 'unknown');
                if (fnRes.status === 403) {
                    throw new Error(errData.error || 'Domain not supported for URL fetch.');
                }
            }
        } catch (e) {
            if (e.message && e.message.indexOf('Domain not') !== -1) throw e;
            console.warn('Cloud Function fetch failed, trying proxy:', e.message);
        }
    }

    // Strategy 2: Vercel API proxy (same-origin, no CSP/CORS issues)
    try {
        var proxyUrl = '/api/api-job-proxy?source=page&url=' + encodeURIComponent(url);
        var proxyRes = await fetch(proxyUrl, {
            signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
        });
        if (proxyRes.ok) {
            var proxyHtml = await proxyRes.text();
            if (proxyHtml && proxyHtml.length > 200) {
                console.log('\u2713 Fetched via Vercel proxy: ' + proxyHtml.length + ' chars');
                var extracted = extractTextFromHtml(proxyHtml);
                if (extracted && extracted.length > 100) {
                    return extracted;
                }
                var spaText = extractSPAJobData(proxyHtml);
                if (spaText && spaText.length > 100) {
                    console.log('\u2713 Extracted SPA job data: ' + spaText.length + ' chars');
                    return spaText;
                }
                console.warn('Proxy returned HTML but insufficient extractable text (' + extracted.length + ' chars) — likely JS-rendered SPA');
            }
        } else {
            console.warn('Vercel proxy returned ' + proxyRes.status);
        }
    } catch (e) {
        console.warn('Vercel proxy fetch failed:', e.message);
    }

    // Strategy 3: Direct fetch (works for sites with permissive CORS headers)
    try {
        var directRes = await fetch(url, { 
            mode: 'cors',
            headers: { 'Accept': 'text/html,application/xhtml+xml' },
            signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
        });
        if (directRes.ok) {
            var directHtml = await directRes.text();
            if (directHtml && directHtml.length > 200) {
                console.log('\u2713 Fetched via direct CORS: ' + directHtml.length + ' chars');
                var directText = extractTextFromHtml(directHtml);
                if (directText && directText.length > 100) return directText;
                var spaText2 = extractSPAJobData(directHtml);
                if (spaText2 && spaText2.length > 100) return spaText2;
            }
        }
    } catch (e) {
        console.warn('Direct fetch failed (expected):', e.message);
    }
    
    var signedIn = !!(typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
    if (!signedIn) {
        throw new Error('Sign in to fetch job posting URLs automatically, or paste the job description text below.');
    }
    throw new Error('Could not fetch that page. The site may require JavaScript rendering.\n\nTip: Open the job posting in your browser, select all text (Ctrl+A / Cmd+A), copy it (Ctrl+C / Cmd+C), and paste it in the text field below.');
}

export function extractSPAJobData(html) {
    var text = '';
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');

    // 1. JSON-LD structured data (many ATS platforms embed this even in SPAs)
    var ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    ldScripts.forEach(function(script) {
        try {
            var ld = JSON.parse(script.textContent);
            var items = Array.isArray(ld) ? ld : [ld];
            items.forEach(function(item) {
                var candidates = [item];
                if (item['@graph'] && Array.isArray(item['@graph'])) candidates = candidates.concat(item['@graph']);
                candidates.forEach(function(candidate) {
                if (candidate['@type'] === 'JobPosting') {
                    var jp = candidate;
                    if (jp) {
                        var parts = [];
                        if (jp.title) parts.push(jp.title);
                        if (jp.hiringOrganization) parts.push('Company: ' + (jp.hiringOrganization.name || jp.hiringOrganization));
                        if (jp.jobLocation) {
                            var loc = jp.jobLocation;
                            if (loc.address) parts.push('Location: ' + (loc.address.addressLocality || '') + (loc.address.addressRegion ? ', ' + loc.address.addressRegion : ''));
                        }
                        if (jp.description) {
                            var descHtml = jp.description;
                            var tmpDiv = document.createElement('div');
                            tmpDiv.innerHTML = descHtml;
                            parts.push(tmpDiv.textContent || tmpDiv.innerText || descHtml.replace(/<[^>]+>/g, ' '));
                        }
                        if (jp.qualifications) parts.push('Qualifications: ' + jp.qualifications);
                        if (jp.responsibilities) parts.push('Responsibilities: ' + jp.responsibilities);
                        if (jp.skills) parts.push('Skills: ' + jp.skills);
                        if (jp.employmentType) parts.push('Type: ' + jp.employmentType);
                        if (jp.baseSalary) {
                            var sal = jp.baseSalary;
                            if (sal.value) parts.push('Salary: ' + (sal.value.minValue || '') + '-' + (sal.value.maxValue || '') + ' ' + (sal.currency || 'USD'));
                        }
                        text += parts.join('\n\n');
                    }
                }
                });
            });
        } catch (e) { }
    });
    if (text.length > 100) return text.trim();

    // 2. __NEXT_DATA__ (Next.js SPAs like Greenhouse, Lever, Rippling)
    var nextScript = doc.querySelector('script#__NEXT_DATA__');
    if (nextScript) {
        try {
            var nextData = JSON.parse(nextScript.textContent);
            var pp = nextData.props && nextData.props.pageProps || {};

            // Rippling ATS: apiData.jobPost.description is {company: "<html>..."}
            var jobPost = pp.apiData && pp.apiData.jobPost;
            if (jobPost) {
                var parts = [];
                if (jobPost.name) parts.push(jobPost.name);
                if (jobPost.companyName) parts.push('Company: ' + jobPost.companyName);
                if (jobPost.department) parts.push('Department: ' + (jobPost.department.name || (typeof jobPost.department === 'string' ? jobPost.department : '')));
                if (jobPost.employmentType) parts.push('Type: ' + (jobPost.employmentType.id || jobPost.employmentType.label || jobPost.employmentType));
                if (jobPost.workLocations && jobPost.workLocations.length) {
                    parts.push('Location: ' + jobPost.workLocations.map(function(wl) { return wl.location || wl.name || ''; }).filter(Boolean).join(', '));
                }
                var descObj = jobPost.description;
                if (descObj) {
                    var descHtml = '';
                    if (typeof descObj === 'string') { descHtml = descObj; }
                    else if (typeof descObj === 'object') {
                        descHtml = Object.values(descObj).filter(function(v) { return typeof v === 'string' && v.length > 20; }).join('\n');
                    }
                    if (descHtml) {
                        var tmpDiv2 = document.createElement('div');
                        tmpDiv2.innerHTML = descHtml.replace(/<meta>/g, '');
                        parts.push(tmpDiv2.textContent || tmpDiv2.innerText || '');
                    }
                }
                if (jobPost.payRangeDetails && jobPost.payRangeDetails.length) {
                    jobPost.payRangeDetails.forEach(function(pr) {
                        if (pr.minimumAmount || pr.maximumAmount) parts.push('Pay: ' + (pr.minimumAmount || '') + ' - ' + (pr.maximumAmount || '') + ' ' + (pr.currency || 'USD'));
                    });
                }
                text = parts.join('\n\n');
            }

            // Greenhouse / Lever / generic: look for dehydratedState queries with description fields
            if (text.length < 100 && pp.dehydratedState && pp.dehydratedState.queries) {
                pp.dehydratedState.queries.forEach(function(q) {
                    if (text.length > 100) return;
                    var qd = q.state && q.state.data;
                    if (qd) {
                        var qText = _extractDeepJobText(qd, 0);
                        if (qText.length > text.length) text = qText;
                    }
                });
            }

            // Generic deep extraction fallback
            if (text.length < 100) {
                text = _extractDeepJobText(nextData, 0);
            }
        } catch (e) {
            console.warn('__NEXT_DATA__ parse error:', e.message);
        }
    }
    if (text.length > 100) return text.trim();

    // 3. Embedded JSON blobs in script tags (React SSR hydration)
    var scripts = doc.querySelectorAll('script:not([src])');
    scripts.forEach(function(s) {
        if (text.length > 100) return;
        var content = s.textContent || '';
        var jsonMatch = content.match(/(?:window\.__(?:DATA|STATE|PROPS|INITIAL)__|window\.pageData|var\s+(?:data|jobData|posting))\s*=\s*(\{[\s\S]+?\});?\s*(?:<\/script>|$)/);
        if (jsonMatch) {
            try {
                var obj = JSON.parse(jsonMatch[1]);
                text = _extractDeepJobText(obj, 0);
            } catch (e) { }
        }
    });
    if (text.length > 100) return text.trim();

    // 4. Meta tags fallback (og:title, og:description — often present even on SPAs)
    var metaParts = [];
    var ogTitle = doc.querySelector('meta[property="og:title"]');
    var ogDesc = doc.querySelector('meta[property="og:description"]');
    var metaDesc = doc.querySelector('meta[name="description"]');
    var pageTitle = doc.querySelector('title');
    if (ogTitle) metaParts.push(ogTitle.getAttribute('content'));
    else if (pageTitle) metaParts.push(pageTitle.textContent);
    if (ogDesc) metaParts.push(ogDesc.getAttribute('content'));
    else if (metaDesc) metaParts.push(metaDesc.getAttribute('content'));
    if (metaParts.join(' ').length > 80) return metaParts.join('\n\n').trim();

    return text.trim();
}

export function _extractDeepJobText(obj, depth) {
    if (depth > 8 || !obj) return '';
    if (typeof obj === 'string') {
        if (obj.length > 50 && obj.length < 20000) {
            if (/<[a-z][\s\S]*>/i.test(obj)) {
                var tmpDiv = document.createElement('div');
                tmpDiv.innerHTML = obj;
                return (tmpDiv.textContent || '').trim();
            }
            if (obj.length > 100) return obj.trim();
        }
        return '';
    }
    if (Array.isArray(obj)) {
        var results = obj.map(function(item) { return _extractDeepJobText(item, depth + 1); }).filter(Boolean);
        return results.join('\n');
    }
    if (typeof obj === 'object') {
        var jobKeys = ['description', 'content', 'body', 'jobDescription', 'job_description',
            'descriptionHtml', 'htmlContent', 'posting', 'details', 'requirements',
            'qualifications', 'responsibilities', 'aboutRole', 'roleDescription'];
        var titleKeys = ['title', 'name', 'jobTitle', 'job_title', 'position'];
        var parts = [];
        titleKeys.forEach(function(k) {
            if (obj[k] && typeof obj[k] === 'string' && obj[k].length > 3 && obj[k].length < 200) {
                parts.push(obj[k]);
            }
        });
        jobKeys.forEach(function(k) {
            if (obj[k]) {
                var extracted = _extractDeepJobText(obj[k], depth + 1);
                if (extracted.length > 50) parts.push(extracted);
                else if (typeof obj[k] === 'string' && obj[k].length > 50) parts.push(obj[k]);
            }
        });
        if (parts.join(' ').length > 100) return parts.join('\n\n');
        var subResults = Object.values(obj).map(function(v) { return _extractDeepJobText(v, depth + 1); }).filter(function(r) { return r.length > 50; });
        return subResults.sort(function(a, b) { return b.length - a.length; })[0] || '';
    }
    return '';
}

export function extractTextFromHtml(html) {
    // Create a temporary DOM to parse the HTML
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    
    // Remove scripts, styles, nav, footer, header elements
    var removeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'noscript', 'svg', 'iframe',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '.cookie-banner', '.footer'];
    removeSelectors.forEach(function(sel) {
        doc.querySelectorAll(sel).forEach(function(el) { el.remove(); });
    });
    
    // Try to find the main job content area
    var contentEl = doc.querySelector('[class*="job-description"]') 
        || doc.querySelector('[class*="job-detail"]')
        || doc.querySelector('[class*="posting"]')
        || doc.querySelector('[class*="jd-"]')
        || doc.querySelector('article')
        || doc.querySelector('main')
        || doc.querySelector('[role="main"]')
        || doc.body;
    
    if (!contentEl) contentEl = doc.body;
    
    // Get text content, preserving line breaks for structure
    var text = '';
    var walker = doc.createTreeWalker(contentEl, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);
    var node;
    var blockTags = new Set(['P','DIV','H1','H2','H3','H4','H5','H6','LI','TR','BR','HR','SECTION','ARTICLE','HEADER','FOOTER','BLOCKQUOTE','DT','DD']);
    
    while (node = walker.nextNode()) {
        if (node.nodeType === 3) { // Text node
            var t = node.textContent.replace(/\s+/g, ' ');
            if (t.trim()) text += t;
        } else if (node.nodeType === 1 && blockTags.has(node.tagName)) {
            text += '\n';
        }
    }
    
    // Clean up: collapse multiple newlines, trim
    text = text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
    
    // Cap to reasonable length for AI prompt
    if (text.length > 8000) text = text.substring(0, 8000);
    
    return text;
}

// ===== JOB ANALYSIS ENGINE =====

// ===== BLS OCCUPATION MATCHING =====
export function matchJobToBLS(titleText, descText) {
    if (!window.blsWages) return null;
    var bls = window.blsWages;
    var titleLower = (titleText || '').toLowerCase();
    var descLower = (descText || '').substring(0, 500).toLowerCase();
    var text = titleLower + ' ' + descLower;
    var scores = {};
    
    // Phase 1: Alias matching (strongest signal)
    // Title aliases get weight 8, description aliases get weight 4
    if (bls.aliases) {
        var sortedAliases = Object.keys(bls.aliases).sort(function(a, b) { return b.length - a.length; });
        for (var ai = 0; ai < sortedAliases.length; ai++) {
            var alias = sortedAliases[ai];
            var soc = bls.aliases[alias];
            if (titleLower.indexOf(alias) !== -1) {
                scores[soc] = (scores[soc] || 0) + 8;
            } else if (descLower.indexOf(alias) !== -1) {
                scores[soc] = (scores[soc] || 0) + 4;
            }
        }
    }
    
    // Phase 2: Keyword matching — title words weighted 3x, desc words weighted 1x
    var skip = {and:1,or:1,the:1,of:1,for:1,all:1,other:1,except:1,a:1,an:1,in:1,to:1,with:1,by:1,is:1,are:1,was:1,will:1,this:1,that:1,you:1,our:1,your:1,we:1};
    var titleWords = (titleLower.match(/[a-z]+/g) || []).filter(function(w) { return !skip[w] && w.length > 2; });
    var descWords = (descLower.match(/[a-z]+/g) || []).filter(function(w) { return !skip[w] && w.length > 2; });
    
    for (var oi = 0; oi < bls.occupations.length; oi++) {
        var occ = bls.occupations[oi];
        var occWords = (occ.keywords || []);
        var titleOverlap = 0, descOverlap = 0;
        for (var wi = 0; wi < titleWords.length; wi++) {
            if (occWords.indexOf(titleWords[wi]) !== -1) titleOverlap++;
        }
        for (var di = 0; di < descWords.length; di++) {
            if (occWords.indexOf(descWords[di]) !== -1) descOverlap++;
        }
        var occScore = (titleOverlap * 3) + descOverlap;
        if (occScore > 0) {
            scores[occ.soc] = (scores[occ.soc] || 0) + occScore;
        }
    }
    
    // Phase 3: Exact occupation title containment bonus
    for (var ei = 0; ei < bls.occupations.length; ei++) {
        var occTitle = (bls.occupations[ei].title || '').toLowerCase();
        if (occTitle.length > 5 && titleLower.indexOf(occTitle) !== -1) {
            scores[bls.occupations[ei].soc] = (scores[bls.occupations[ei].soc] || 0) + 10;
        }
        if (occTitle.length > 5 && titleLower.length > 3) {
            var titleCore = titleLower.replace(/\b(senior|junior|lead|principal|staff|chief|head|associate|intern|manager|director|vp|vice president|svp|evp)\b/g, '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
            if (titleCore.length > 4 && occTitle.indexOf(titleCore) !== -1) {
                scores[bls.occupations[ei].soc] = (scores[bls.occupations[ei].soc] || 0) + 6;
            }
        }
    }
    
    // Find best match with minimum confidence threshold
    var best = null;
    var bestScore = 0;
    for (var soc in scores) {
        if (scores[soc] > bestScore) {
            bestScore = scores[soc];
            best = soc;
        }
    }
    
    if (!best || bestScore < 3) return null;
    
    // Look up the occupation data
    var matched = null;
    for (var mi = 0; mi < bls.occupations.length; mi++) {
        if (bls.occupations[mi].soc === best) {
            matched = bls.occupations[mi];
            break;
        }
    }
    
    if (!matched) return null;
    
    return {
        soc: matched.soc,
        title: matched.title,
        median: matched.a_median,
        pct10: matched.a_pct10,
        pct25: matched.a_pct25,
        pct75: matched.a_pct75,
        pct90: matched.a_pct90,
        employment: matched.employment,
        confidence: bestScore,
        source: 'BLS OEWS ' + (bls.period || '2024')
    };
}
if (!window.matchJobToBLS) window.matchJobToBLS = matchJobToBLS;

async function analyzeJob() {
    var jdText = (document.getElementById('jdTextInput').value || '').trim();
    if (!jdText || jdText.length < 50) {
        showToast('Paste a job description (at least a few sentences).', 'warning');
        return;
    }
    
    var sourceUrlEl = document.getElementById('jdSourceUrl');
    var sourceUrl = sourceUrlEl ? (sourceUrlEl.value || '').trim() : '';
    // Also check URL input field
    if (!sourceUrl) {
        var urlInputEl = document.getElementById('jdUrlInput');
        if (urlInputEl) sourceUrl = (urlInputEl.value || '').trim();
    }
    var sourceNote = (document.getElementById('jdSourceNote') || {}).value || '';
    sourceNote = sourceNote.trim();
    var apiKeyEl = document.getElementById('jdApiKey');
    var apiKey = apiKeyEl ? (apiKeyEl.value || '').trim() : '';
    
    // Save API key for reuse
    if (apiKey) safeSet('wbAnthropicKey', apiKey);
    
    // Determine if AI is available: signed-in proxy OR explicit API key
    var hasProxy = !!(typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser);
    var useAI = hasProxy || !!apiKey;
    
    // Show progress
    var statusEl = document.getElementById('jdParsingStatus');
    var btn = document.getElementById('analyzeJobBtn');
    var fetchBtn = document.getElementById('fetchUrlBtn');
    statusEl.style.display = 'block';
    statusEl.style.background = 'var(--c-accent-bg-3a)';
    statusEl.innerHTML = '<div class="loading-spinner" style="width:24px; height:24px; border-width:2px; margin:0 auto 8px;"></div>'
        + '<div style="color:var(--text-secondary); font-size:0.88em;">'
        + (useAI ? 'Analyzing with AI...' : 'Matching against skill library...') + '</div>';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    if (fetchBtn) { fetchBtn.disabled = true; }
    
    try {
        // Ensure skill library is loaded before parsing
        var libReady = await ensureSkillLibrary();
        if (!libReady) console.warn('\u26A0 Skill library not available \u2014 parsing with user skills + dictionary only');
        
        var parsed;
        if (useAI) {
            parsed = await parseJobWithAPI(jdText, apiKey);
        } else {
            parsed = parseJobLocally(jdText);
        }
        
        // Calculate match against user's skills
        // Convert parsed skills to v2 format for matching
        var ingestMethod = useAI ? 'api' : 'local';
        var defaultConfidence = useAI ? 0.85 : 0.5;
        var v2Skills = (parsed.skills || []).map(function(s) {
            var name = typeof s === 'string' ? s : (s.name || '');
            if (!name) return null;
            var isObj = typeof s === 'object' && s !== null;
            // v2 API response includes tier/section/context/source directly
            var legacyReq = isObj ? (s.requirement || s.level || '') : '';
            var tier = (isObj && s.tier) ? s.tier : normalizeTier(legacyReq);
            var source = (isObj && s.source) || 'extracted';
            // Inferred skills get lower confidence
            var conf = source === 'inferred' ? Math.min(defaultConfidence, 0.7) : defaultConfidence;
            return {
                name: name,
                canonical: name.toLowerCase().replace(/\s+/g, ' ').trim(),
                abbreviation: null,
                tier: tier,
                proficiency: (isObj && s.proficiency) || 'Proficient',
                category: (isObj && s.category) ? s.category.toLowerCase() : 'technical',
                section: (isObj && s.section) || null,
                context: (isObj && s.context) || null,
                source: source,
                confidence: conf,
                frameworkRef: null
            };
        }).filter(Boolean).slice(0, JOB_SKILLS_CAP);
        
        var matchData = matchJobToProfile(v2Skills);
        
        // Build v2 job object
        var blsSalary = matchJobToBLS(parsed.title, jdText);
        var now = new Date().toISOString();
        
        // Extract qualifications and responsibilities from API response
        var qualifications = (parsed.qualifications || []).map(function(q) {
            if (typeof q === 'string') return { text: q, type: 'other', required: true };
            return { text: q.text || '', type: q.type || 'other', required: q.required !== false };
        });
        var responsibilities = (parsed.responsibilities || []).map(function(r) {
            return typeof r === 'string' ? r : (r.text || r.description || '');
        }).filter(Boolean);
        
        // Use enriched identity fields from API response when available
        var locationStr = parsed.location || '';
        var isRemote = parsed.remote;
        var empType = parsed.employmentType || null;
        var industry = parsed.industry || '';
        var department = parsed.department || '';
        
        // Sanitize title: reject section headings that slipped through
        var badTitles = /^(what you'?ll do|about the role|about us|qualifications|responsibilities|requirements|job description|overview|summary|working conditions|benefits|who we are|our team|the opportunity)$/i;
        var parsedTitle = (parsed.title || '').trim();
        if (!parsedTitle || badTitles.test(parsedTitle)) parsedTitle = 'Untitled Position';
        
        var job = {
            // v2 schema
            schemaVersion: JOB_SCHEMA_VERSION,
            id: 'job_' + Date.now(),
            title: parsedTitle,
            hiringOrganization: {
                name: parsed.company || '',
                sameAs: null,
                industry: industry,
                size: ''
            },
            titleRole: null,
            titleLevel: (parsed.seniority || '').toLowerCase() || null,
            occupationalCategory: null,
            jobLocation: {
                primary: locationStr,
                address: { locality: null, region: null, country: null },
                locationType: null,
                remote: isRemote,
                remoteDetail: ''
            },
            employmentType: empType,
            department: department,
            postingMeta: {
                sourceUrl: sourceUrl,
                sourceNote: sourceNote,
                datePosted: null,
                validThrough: null,
                externalId: '',
                ingestedAt: now,
                ingestMethod: ingestMethod,
                rawTextHash: null
            },
            requirements: {
                skills: v2Skills,
                qualifications: qualifications,
                responsibilities: responsibilities
            },
            compensation: {
                baseSalary: { currency: 'USD', value: { minValue: null, maxValue: null, unitText: 'YEAR' } },
                estimatedSalary: blsSalary ? blsSalary.median : null,
                incentiveCompensation: null,
                equity: null,
                jobBenefits: [],
                source: blsSalary ? 'estimated' : null
            },
            companyContext: {
                values: { primary: [], secondary: [], source: 'jd' },
                culture: [],
                employerOverview: null
            },
            raw: {
                text: jdText.substring(0, 8000),
                sections: []
            },
            pipeline: {
                status: 'active',
                addedAt: now,
                appliedAt: null,
                notes: '',
                tags: []
            },
            // Legacy fields preserved for backward compatibility
            company: parsed.company || '',
            sourceUrl: sourceUrl,
            sourceNote: sourceNote,
            rawText: jdText.substring(0, 5000),
            parsedSkills: parsed.skills || [],
            parsedRoles: parsed.roles || [],
            seniority: parsed.seniority || '',
            matchData: matchData,
            blsSalary: blsSalary,
            addedAt: now
        };
        
        // Save
        if (!window._userData.savedJobs) window._userData.savedJobs = [];
        if (window._userData.savedJobs.length >= 10) {
            showToast('Job pipeline is full (10 max). Remove one first.', 'warning');
            return;
        }
        window._userData.savedJobs.unshift(job);
        saveUserData();
        if (fbUser) debouncedSave();
        
        closeExportModal();
        
        // Refresh the jobs view
        window.opportunitiesInitialized = false;
        switchView('opportunities');
        
        showToast('Job analyzed: ' + matchData.score + '% match with ' + (matchData.matched || []).length + ' skills aligned.', 'success', 5000);
        
    } catch (err) {
        console.error('Job analysis error:', err);
        statusEl.style.background = 'var(--c-red-bg-2b)';
        statusEl.innerHTML = '<div style="color:#ef4444; font-size:0.88em;">\u26A0 ' + escapeHtml(err.message || 'Analysis failed.') + '</div>';
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}
if (!window.analyzeJob) window.analyzeJob = analyzeJob;

// ===== CLAUDE API PARSING =====

async function parseJobWithAPI(jdText, apiKey) {
    logAnalyticsEvent('job_analysis', {});
    var userSkillNames = (_sd().skills || []).map(function(s) { return s.name; });
    
    var systemPrompt = 'You are a precision job description parser. You extract structured, machine-readable data from job descriptions aligned with Schema.org JobPosting and JDX JobSchema+ standards. Respond ONLY with valid JSON. No markdown fences, no preamble, no commentary.';
    
    // Build vocabulary hint: user skills + canonical synonym keys
    var vocabSet = new Set();
    userSkillNames.slice(0, 60).forEach(function(n) { vocabSet.add(n); });
    Object.keys(SKILL_SYNONYMS).forEach(function(k) {
        vocabSet.add(k.replace(/\b\w/g, function(c) { return c.toUpperCase(); }));
    });
    var vocabHint = Array.from(vocabSet).slice(0, 120).join(', ');
    
    var userPrompt = 'Parse this job description into structured data.\n\n'
        + '--- JOB DESCRIPTION START ---\n'
        + jdText.substring(0, 6000) + '\n'
        + '--- JOB DESCRIPTION END ---\n\n'
        + 'Return JSON with this EXACT structure:\n'
        + '{\n'
        + '  "title": "Exact job title from posting (the role name, NEVER a section heading like What you\'ll do or Qualifications)",\n'
        + '  "company": "Company name or empty string",\n'
        + '  "industry": "Primary industry (e.g., Insurance, Technology, Healthcare)",\n'
        + '  "seniority": "Entry|Mid|Senior|Executive",\n'
        + '  "department": "Department or team if mentioned",\n'
        + '  "location": "Location string as written (e.g., Remote (United States), New York, NY)",\n'
        + '  "remote": true|false|null,\n'
        + '  "employmentType": "FULL_TIME|PART_TIME|CONTRACT|INTERN|null",\n'
        + '  "skills": [\n'
        + '    {\n'
        + '      "name": "Skill Name",\n'
        + '      "tier": "required|preferred|nice-to-have",\n'
        + '      "proficiency": "Novice|Competent|Proficient|Advanced|Expert|Mastery",\n'
        + '      "category": "technical|analytical|strategic|leadership|communication|domain|platform|tool|methodology|soft",\n'
        + '      "section": "JD section heading where found (e.g., Qualifications, What you\'ll do, Preferred)",\n'
        + '      "context": "Brief original text snippet showing this skill in context",\n'
        + '      "source": "extracted|inferred"\n'
        + '    }\n'
        + '  ],\n'
        + '  "qualifications": [\n'
        + '    {"text": "Full qualification statement", "type": "education|experience|certification|other", "required": true|false}\n'
        + '  ],\n'
        + '  "responsibilities": [\n'
        + '    "Key responsibility statement (condensed)"\n'
        + '  ]\n'
        + '}\n\n'
        + '=== EXTRACTION RULES ===\n\n'
        + 'SKILLS (target 15-35 distinct skills):\n'
        + '- Extract EVERY skill explicitly named in qualifications, requirements, and preferred sections\n'
        + '- Extract skills implied by specific responsibilities (source: "inferred")\n'
        + '- SPLIT compound lists into individual skills: "MS Word, Excel, PowerPoint" = 3 separate skills\n'
        + '- SPLIT enumerated tools: "Monday.com, Origami, JIRA" = 3 separate skills\n'
        + '- Include domain knowledge requirements (e.g., "insurance claims", "reinsurance", "policy servicing")\n'
        + '- Include soft skills when explicitly required (e.g., "communication skills", "self-motivation")\n'
        + '- Use professional canonical names (e.g., "Data Analysis" not "analyze data")\n'
        + '- Normalize names to match this vocabulary where possible: ' + vocabHint + '\n'
        + '- Use FULL form of common abbreviations (e.g., "Key Performance Indicators" not "KPIs", "Applicant Tracking System" not "ATS")\n'
        + '- For skills NOT in the above vocabulary, use standard industry terminology (O*NET, LinkedIn Skills)\n\n'
        + 'SKILL EXCLUSIONS (do NOT extract these as skills):\n'
        + '- Generic academic subjects used as qualification boilerplate: geometry, algebra, calculus, arithmetic, statistics coursework\n'
        + '- Generic ability phrases: "meet deadlines", "work independently", "attention to detail", "dependability", "self-motivation"\n'
        + '  → These are traits, not skills. Only include if the JD frames them as a named competency.\n'
        + '- Document/media types: journals, periodicals, manuals, reports (as nouns). "Report Writing" IS a skill, "journals" is not.\n'
        + '- Section headings or boilerplate: "What you\'ll do", "About the role", "Working conditions", "Equal opportunity"\n'
        + '- Physical requirements: typing, sitting, lifting, vision requirements\n'
        + '- Vague buzzwords with no operational meaning: "team player", "go-getter", "passionate"\n\n'
        + 'TIER ASSIGNMENT:\n'
        + '- Skills from "Required Qualifications", "What you\'ll do", "Qualifications" sections → "required"\n'
        + '- Skills from "Preferred", "Nice to have", "Bonus" sections → "preferred"\n'
        + '- Skills inferred from context but not explicitly listed → "nice-to-have"\n'
        + '- When a section uses language like "must have" or "required" → "required"\n'
        + '- When a section uses "preferred", "desired", "ideally" → "preferred"\n\n'
        + 'PROFICIENCY (infer MINIMUM the job demands based on seniority + language):\n'
        + '- "basic knowledge/familiarity/awareness" → Novice or Competent\n'
        + '- "working knowledge/experience with" → Proficient\n'
        + '- "strong/solid/demonstrated experience" → Advanced\n'
        + '- "deep expertise/mastery/authority" → Expert or Mastery\n'
        + '- Default by seniority: Entry→Competent, Mid→Proficient, Senior→Advanced, Executive→Expert\n\n'
        + 'CATEGORY:\n'
        + '- technical: programming, engineering, architecture, infrastructure\n'
        + '- analytical: data analysis, statistics, research, KPI tracking, financial analysis\n'
        + '- strategic: strategy, planning, market research, competitive analysis, business development\n'
        + '- leadership: team management, mentoring, cross-functional coordination, stakeholder management\n'
        + '- communication: writing, presentation, verbal communication, client relations\n'
        + '- domain: industry-specific knowledge (insurance, healthcare, finance concepts)\n'
        + '- platform: specific software platforms (Salesforce, SAP, Origami, Monday.com)\n'
        + '- tool: general productivity tools (Excel, PowerPoint, Word, JIRA)\n'
        + '- methodology: frameworks, methodologies (Agile, Six Sigma, ITIL)\n'
        + '- soft: interpersonal traits explicitly required (self-motivation, problem-solving, adaptability)\n\n'
        + 'QUALIFICATIONS: Extract every stated qualification (degrees, years of experience, certifications).\n'
        + 'RESPONSIBILITIES: Condense each bullet to 1 sentence. Keep the action verb.\n\n'
        + 'TITLE EXTRACTION:\n'
        + '- The title is the role/position name (e.g., "Manager, Program Success", "Senior Software Engineer")\n'
        + '- NEVER use a section heading (What you\'ll do, About the role, Qualifications, Responsibilities)\n'
        + '- If the title appears multiple times, use the first/most prominent occurrence\n'
        + '- If no clear title, use "Untitled Position"\n';
    
    var data = await callAnthropicAPI({
            model: BP_AI_MODEL,
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        }, apiKey, 'jd-analysis');
    
    var text = data.content.map(function(c) { return c.text || ''; }).join('');
    
    // Parse JSON, strip any fences
    text = text.replace(/```json|```/g, '').trim();
    var parsed = safeParse(text, null);
    if (!parsed) throw new Error('Failed to parse AI response as JSON');
    return parsed;
}

// ===== LOCAL FALLBACK PARSING =====

export function parseJobLocally(jdText) {
    var text = jdText.toLowerCase();
    var lines = jdText.split('\n');
    
    // ===== TITLE EXTRACTION =====
    // Skip meta lines, find first line that looks like a job title
    var title = '';
    var company = '';
    var skipPatterns = /^(about|we are|our |the |at |join|summary|generated|posted|apply|location|date|salary|benefits|equal|eeo|disclaimer|copyright|\d+\s*(day|hour|week|ago))/i;
    var sectionHeadingReject = /^(what you('ll| will)\s+(do|own|bring|need)|responsibilities|requirements?|qualifications?|preferred|nice to have|who you are|who we are|about (us|the|this)|key (duties|accountabilities)|your (impact|mission)|job (description|summary)|role (overview|summary|description)|in this role|must have|minimum qualifications?|basic qualifications?|essential (skills?|criteria)|benefits|perks|compensation|why (us|join|work here)|our (mission|team|company|culture|values)|company (overview|description)|how to apply|equal opportunity|additional information)\s*:?\s*$/i;
    var titlePatterns = /\b(manager|director|lead|head|chief|vp|vice|president|senior|junior|engineer|designer|developer|analyst|recruiter|coordinator|specialist|consultant|architect|strategist|officer|partner|associate|advisor|scientist)\b/i;
    
    for (var i = 0; i < Math.min(lines.length, 15); i++) {
        var line = lines[i].trim();
        if (line.length < 5 || line.length > 150) continue;
        if (skipPatterns.test(line)) continue;
        if (sectionHeadingReject.test(line)) continue;
        
        // Prefer lines that contain a role keyword
        if (!title && titlePatterns.test(line)) {
            title = line.replace(/^(job title|position|role|opening|title)[\s:\-]+/i, '').trim();
            if (sectionHeadingReject.test(title)) { title = ''; continue; }
            continue;
        }
        // Otherwise take the first substantial non-meta line
        if (!title && line.length > 8 && line.length < 120) {
            title = line;
        }
    }
    
    // Try to extract company from common patterns
    var companyMatch = jdText.match(/(?:company|employer|organization|at)\s*[:|\-]?\s*([A-Z][A-Za-z0-9\s&.,]+)/);
    if (companyMatch) company = companyMatch[1].trim().substring(0, 60);
    if (!company) {
        // Try "About [Company]" pattern
        var aboutMatch = jdText.match(/about\s+([A-Z][A-Za-z0-9\s&]+?)(?:\n|\.|\,)/);
        if (aboutMatch && aboutMatch[1].length < 50) company = aboutMatch[1].trim();
    }
    
    // ===== SENIORITY (detect early for proficiency inference) =====
    var seniority = 'Mid';
    if (/\b(vp|vice president|chief|c-suite|head of|svp|evp)\b/i.test(jdText)) seniority = 'Executive';
    else if (/\b(senior director|director|principal|senior manager)\b/i.test(jdText)) seniority = 'Senior';
    else if (/\b(junior|entry|associate|intern|coordinator)\b/i.test(jdText)) seniority = 'Entry';
    
    // ===== SECTION DETECTION (Phase 3) =====
    var SECTION_PATTERNS = {
        requirements: /^(?:requirements?|qualifications?|what\s+you(?:'ll)?\s+(?:need|bring)|must\s+have|minimum\s+qualifications?|basic\s+qualifications?|who\s+you\s+are|essential\s+(?:skills?|criteria))\s*[:.]?\s*$/i,
        preferred: /^(?:preferred|nice\s+to\s+have|bonus|desired|additional|strongly\s+preferred|preferred\s+qualifications?|ideal\s+(?:candidate|qualifications?)|what\s+sets\s+you\s+apart|it(?:'s| is)\s+a\s+(?:plus|bonus))\s*[:.]?\s*$/i,
        responsibilities: /^(?:responsibilities|what\s+you(?:'ll)?\s+(?:do|own|work\s+on)|key\s+(?:responsibilities|duties|accountabilities)|the\s+role|about\s+(?:the\s+)?(?:role|position|opportunity)|role\s+(?:overview|summary|description)|in\s+this\s+role|job\s+(?:description|summary)|your\s+(?:impact|mission))\s*[:.]?\s*$/i,
        about: /^(?:about\s+(?:us|the\s+company|the\s+team)|who\s+we\s+are|our\s+(?:mission|team|company|culture|values)|company\s+(?:overview|description))\s*[:.]?\s*$/i,
        benefits: /^(?:benefits|perks|what\s+we\s+offer|compensation|why\s+(?:us|join|work\s+here))\s*[:.]?\s*$/i
    };
    
    var sections = [];
    var currentSection = { type: 'preamble', lines: [], startIdx: 0 };
    
    lines.forEach(function(line, idx) {
        var trimmed = line.trim();
        if (trimmed.length < 3) return;
        
        var matched = false;
        Object.keys(SECTION_PATTERNS).forEach(function(sType) {
            if (matched) return;
            if (SECTION_PATTERNS[sType].test(trimmed)) {
                if (currentSection.lines.length > 0) sections.push(currentSection);
                currentSection = { type: sType, lines: [], startIdx: idx };
                matched = true;
            }
        });
        if (!matched) currentSection.lines.push({ text: line, idx: idx });
    });
    if (currentSection.lines.length > 0) sections.push(currentSection);
    
    function sectionTier(sType) {
        if (sType === 'preferred') return 'preferred';
        if (sType === 'requirements') return 'required';
        if (sType === 'responsibilities') return 'required';
        return 'required';
    }
    
    function isSkillSection(sType) {
        return sType === 'requirements' || sType === 'preferred' || sType === 'responsibilities';
    }
    
    var hasStructuredSections = sections.some(function(s) { return isSkillSection(s.type); });
    
    // ===== BULLET LINE EXTRACTION (Phase 3) =====
    var bulletPattern = /^\s*[\u2022\u2023\u25E6\u2043\u25AA\u25AB\u2013\u2014\-\*\u2713\u2714\u25CF\u25CB]\s+|^\s*\d+[\.\)]\s+|^\s*[a-z][\.\)]\s+/i;
    
    var bulletLines = [];
    sections.forEach(function(sec) {
        if (!isSkillSection(sec.type)) return;
        sec.lines.forEach(function(lineObj) {
            if (bulletPattern.test(lineObj.text)) {
                bulletLines.push({ text: lineObj.text.replace(bulletPattern, '').trim(), section: sec.type, tier: sectionTier(sec.type) });
            }
        });
    });
    
    if (!hasStructuredSections) {
        lines.forEach(function(line) {
            if (bulletPattern.test(line)) {
                bulletLines.push({ text: line.replace(bulletPattern, '').trim(), section: 'unknown', tier: 'required' });
            }
        });
    }
    
    // ===== COMPOUND TERM SPLITTING (Phase 3) =====
    function splitCompoundTerms(phrase) {
        var results = [];
        var compoundPatterns = [
            /^(.*?)\s*(?:such as|including|e\.?g\.?|i\.?e\.?)\s+(.+)$/i,
            /^(?:experience\s+(?:with|in)\s+)?(.+?)$/i
        ];
        
        var items = phrase.split(/\s*[,;\/]\s*/);
        items.forEach(function(item) {
            item = item.replace(/^\s*(?:and|or|&)\s+/i, '').trim();
            if (item.length < 2 || item.length > 60) return;
            
            var andParts = item.split(/\s+(?:and|&)\s+/i);
            andParts.forEach(function(part) {
                part = part.replace(/^\s*(?:a|an|the)\s+/i, '').trim();
                if (part.length >= 2 && part.length <= 60) results.push(part);
            });
        });
        return results.length > 0 ? results : [phrase];
    }
    
    // ===== SKILL EXTRACTION =====
    var skillMatches = [];
    var seen = new Set();
    var allSkills = _sd().skills || [];
    
    function findSkillInText(skillLower, searchText, searchTextNorm) {
        if (skillLower.length <= 5) {
            return searchTextNorm.indexOf(' ' + skillLower + ' ') !== -1
                 || searchTextNorm.indexOf(' ' + skillLower + ',') !== -1
                 || searchTextNorm.indexOf(' ' + skillLower + '.') !== -1
                 || searchTextNorm.indexOf(' ' + skillLower + '/') !== -1;
        }
        return searchText.indexOf(skillLower) !== -1;
    }
    
    function getSkillSection(skillLower) {
        if (!hasStructuredSections) return null;
        for (var si = 0; si < sections.length; si++) {
            var sec = sections[si];
            if (!isSkillSection(sec.type)) continue;
            for (var li = 0; li < sec.lines.length; li++) {
                if (sec.lines[li].text.toLowerCase().indexOf(skillLower) !== -1) {
                    return sec.type;
                }
            }
        }
        return null;
    }
    
    function classifyTierFromSection(skillLower) {
        var sec = getSkillSection(skillLower);
        if (sec) return sectionTier(sec);
        var req = classifyRequirementLevel(text, skillLower);
        return normalizeTier(req);
    }
    
    var searchTextNormUser = ' ' + text.replace(/[^a-z0-9\s\+\#\.]/g, ' ').replace(/\s+/g, ' ') + ' ';
    
    // First pass: match user's own skill names in JD text
    allSkills.forEach(function(skill) {
        var skillLower = skill.name.toLowerCase().trim();
        if (skillLower.length < 3 || seen.has(skillLower)) return;
        
        if (findSkillInText(skillLower, text, searchTextNormUser)) {
            seen.add(skillLower);
            var tier = classifyTierFromSection(skillLower);
            skillMatches.push({
                name: skill.name,
                canonical: skillLower.replace(/\s+/g, ' ').trim(),
                tier: tier,
                requirement: tier === 'required' ? 'Required' : tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                proficiency: inferJobProficiency(text, skillLower, seniority),
                category: skill.category || 'technical',
                section: getSkillSection(skillLower),
                source: 'extracted',
                confidence: 0.7
            });
        }
    });
    
    // Second pass: check the full skill library if loaded (43K+ skills)
    if (skillLibraryIndex && skillLibraryIndex.index) {
        var searchTextNorm = ' ' + text.replace(/[^a-z0-9\s\+\#\.]/g, ' ').replace(/\s+/g, ' ') + ' ';
        
        skillLibraryIndex.index.forEach(function(libSkill) {
            var n = (libSkill.n || libSkill.name || '').toLowerCase().trim();
            if (n.length < 2 || seen.has(n)) return;
            
            if (findSkillInText(n, text, searchTextNorm)) {
                seen.add(n);
                var tier = classifyTierFromSection(n);
                skillMatches.push({
                    name: libSkill.n || libSkill.name,
                    canonical: n.replace(/\s+/g, ' ').trim(),
                    tier: tier,
                    requirement: tier === 'required' ? 'Required' : tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                    proficiency: inferJobProficiency(text, n, seniority),
                    category: libSkill.c || libSkill.category || 'technical',
                    section: getSkillSection(n),
                    source: 'extracted',
                    confidence: 0.6
                });
            }
        });
    }
    
    // Pass 2b: stem-aware library matching — builds stem index of library, extracts JD n-grams, matches via stems
    function _miniStem(word) {
        if (word.length < 5) return word;
        if (word.endsWith('ization') && word.length > 9) return word.slice(0,-7);
        if (word.endsWith('isation') && word.length > 9) return word.slice(0,-7);
        if (word.endsWith('ation') && word.length > 7) return word.slice(0,-5);
        if (word.endsWith('ement') && word.length > 7) return word.slice(0,-5);
        if (word.endsWith('ment') && word.length > 6) return word.slice(0,-4);
        if (word.endsWith('ness') && word.length > 6) return word.slice(0,-4);
        if (word.endsWith('ance') && word.length > 6) return word.slice(0,-4);
        if (word.endsWith('ence') && word.length > 6) return word.slice(0,-4);
        if (word.endsWith('tion') && word.length > 6) return word.slice(0,-4);
        if (word.endsWith('sion') && word.length > 6) return word.slice(0,-4);
        if (word.endsWith('ible') && word.length > 6) return word.slice(0,-4);
        if (word.endsWith('able') && word.length > 6) return word.slice(0,-4);
        if (word.endsWith('ies')) return word.slice(0,-3) + 'y';
        if (word.endsWith('ity') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ive') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ous') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ful') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ing') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ate') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ize') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ise') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ify') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ant') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ent') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('egy') && word.length > 5) return word.slice(0,-3);
        if (word.endsWith('ic') && word.length > 4) return word.slice(0,-2);
        if (word.endsWith('al') && word.length > 5) return word.slice(0,-2);
        if (word.endsWith('ed') && word.length > 5) return word.slice(0,-2);
        if (word.endsWith('er') && word.length > 5) return word.slice(0,-2);
        if (word.endsWith('ly') && word.length > 5) return word.slice(0,-2);
        if (word.endsWith('or') && word.length > 5) return word.slice(0,-2);
        if (word.endsWith('gy') && word.length > 5) return word.slice(0,-2);
        if (word.endsWith('s') && !word.endsWith('ss') && word.length > 4) return word.slice(0,-1);
        return word;
    }
    if (skillLibraryIndex && skillLibraryIndex.index && !window._libStemIndex) {
        window._libStemIndex = new Map();
        skillLibraryIndex.index.forEach(function(libSkill) {
            var n = (libSkill.n || libSkill.name || '').toLowerCase().trim();
            var wc = n.split(/\s+/).length;
            if (wc < 1 || wc > 4 || n.length < 4) return;
            var stemKey = n.split(/\s+/).map(function(w) { return _miniStem(w); }).join(' ');
            if (stemKey !== n && stemKey.length >= 4 && !window._libStemIndex.has(stemKey)) {
                window._libStemIndex.set(stemKey, libSkill);
            }
        });
    }
    if (window._libStemIndex && window._libStemIndex.size > 0) {
        var textWords = text.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
        for (var wi = 0; wi < textWords.length; wi++) {
            for (var span = 1; span <= Math.min(4, textWords.length - wi); span++) {
                var ngram = textWords.slice(wi, wi + span).join(' ');
                var stemmed = ngram.split(' ').map(function(w) { return _miniStem(w); }).join(' ');
                var libMatch = window._libStemIndex.get(stemmed);
                if (libMatch) {
                    var cn = (libMatch.n || libMatch.name || '').toLowerCase().trim();
                    if (!seen.has(cn)) {
                        seen.add(cn);
                        var tier = classifyTierFromSection(ngram);
                        skillMatches.push({
                            name: libMatch.n || libMatch.name,
                            canonical: cn,
                            tier: tier,
                            requirement: tier === 'required' ? 'Required' : tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                            proficiency: inferJobProficiency(text, ngram, seniority),
                            category: libMatch.c || libMatch.category || 'technical',
                            section: getSkillSection(ngram),
                            source: 'extracted',
                            confidence: 0.55
                        });
                    }
                }
            }
        }
    }
    
    // Synonym pass: check runtime synonym lookup for additional matches
    if (typeof _synonymLookup === 'object') {
        Object.keys(_synonymLookup).forEach(function(canonical) {
            if (seen.has(canonical)) return;
            var syns = _synonymLookup[canonical];
            for (var si = 0; si < syns.length; si++) {
                if (syns[si].length > 3 && text.indexOf(syns[si]) !== -1) {
                    seen.add(canonical);
                    var tier = classifyTierFromSection(syns[si]);
                    skillMatches.push({
                        name: canonical.replace(/\b\w/g, function(c) { return c.toUpperCase(); }),
                        canonical: canonical,
                        tier: tier,
                        requirement: tier === 'required' ? 'Required' : tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                        proficiency: inferJobProficiency(text, syns[si], seniority),
                        category: 'technical',
                        section: getSkillSection(syns[si]),
                        source: 'extracted',
                        confidence: 0.55
                    });
                    break;
                }
            }
        });
    }
    
    // Third pass: comprehensive skill keyword dictionary
    var skillDictionary = [
        'Talent Acquisition', 'Full-Cycle Recruiting', 'Sourcing', 'Boolean Search', 'Candidate Experience',
        'Employer Branding', 'Applicant Tracking System', 'ATS', 'Onboarding', 'Workforce Planning',
        'Diversity Recruiting', 'Campus Recruiting', 'Executive Search', 'Headhunting', 'Interviewing',
        'Offer Negotiation', 'Recruitment Marketing', 'Talent Pipeline', 'Screening', 'Reference Checking',
        'Human Resources', 'Employee Relations', 'Performance Management', 'Compensation', 'Benefits Administration',
        'HRIS', 'Succession Planning', 'Organizational Development', 'Compliance', 'Labor Relations',
        'Employee Engagement', 'Retention', 'Training and Development', 'Learning and Development',
        'Project Management', 'Program Management', 'Strategic Planning', 'Roadmap', 'Risk Management',
        'Agile', 'Scrum', 'Kanban', 'Waterfall', 'Sprint Planning', 'JIRA', 'Confluence',
        'Stakeholder Management', 'Change Management', 'Process Improvement', 'Continuous Improvement',
        'Team Leadership', 'People Management', 'Cross-Functional Collaboration', 'Mentoring',
        'Coaching', 'Executive Presence', 'Decision Making', 'Conflict Resolution', 'Delegation',
        'Communication', 'Presentation', 'Public Speaking', 'Technical Writing', 'Copywriting',
        'Storytelling', 'Negotiation', 'Persuasion', 'Active Listening', 'Relationship Building',
        'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'NoSQL',
        'AWS', 'Azure', 'GCP', 'Cloud Computing', 'DevOps', 'CI/CD', 'Docker', 'Kubernetes',
        'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Data Engineering',
        'API Design', 'Microservices', 'System Design', 'Architecture',
        'Data Analysis', 'Business Intelligence', 'Tableau', 'Power BI', 'Excel',
        'SQL', 'Reporting', 'Dashboards', 'KPI', 'Metrics', 'Forecasting', 'Modeling',
        'Business Development', 'Sales Strategy', 'Account Management', 'Pipeline Management',
        'Revenue Growth', 'Client Relations', 'Customer Success', 'Market Research',
        'Product Management', 'UX Design', 'User Research', 'A/B Testing', 'Go-to-Market',
        'Budgeting', 'Financial Analysis', 'P&L Management', 'Vendor Management',
        'Strategy', 'Innovation', 'Transformation', 'Digital Transformation', 'Thought Leadership',
        'Competitive Analysis', 'Market Analysis', 'Business Strategy', 'GTM Strategy',
        'Content Marketing', 'SEO', 'SEM', 'Social Media', 'Email Marketing', 'Brand Strategy',
        'Demand Generation', 'Lead Generation', 'Marketing Automation', 'CRM',
        'Problem Solving', 'Critical Thinking', 'Analytical Thinking', 'Attention to Detail',
        'Time Management', 'Adaptability', 'Creativity', 'Emotional Intelligence',
        'Collaboration', 'Teamwork', 'Self-Motivation', 'Results-Oriented',

        'Underwriting', 'Insurance', 'Claims Management', 'Policy Administration', 'Loss Control',
        'Actuarial Analysis', 'Reinsurance', 'Risk Assessment', 'Risk Mitigation', 'Risk Analysis',
        'Portfolio Management', 'Portfolio Strategy', 'Portfolio Optimization',
        'Pricing', 'Pricing Strategy', 'Rate Analysis', 'Premium Analysis',
        'Regulatory Compliance', 'Regulatory Affairs', 'Regulatory Strategy',
        'Insurance Products', 'Commercial Lines', 'General Liability', 'Excess Liability',
        'Casualty Insurance', 'Property Insurance', 'Workers Compensation', 'Professional Liability',
        'Product Development', 'Product Strategy', 'Product Lifecycle', 'Product Launch',
        'Profitability Analysis', 'Profit and Loss', 'Revenue Management', 'Cost Management',
        'Talent Development', 'Capability Development', 'Team Development', 'Leadership Development',
        'Resource Allocation', 'Resource Planning', 'Capacity Planning',
        'Governance', 'Corporate Governance', 'Policy Development', 'Procedures Development',
        'Strategic Partnerships', 'Partner Management', 'Alliance Management',
        'Market Intelligence', 'Market Trends', 'Market Strategy',
        'Cross-Functional Leadership', 'Organizational Leadership', 'Executive Leadership',
        'Operational Excellence', 'Operational Strategy', 'Business Operations',
        'Contract Negotiation', 'Contract Management', 'Deal Structuring',
        'Due Diligence', 'Audit', 'Internal Controls',

        'Financial Planning', 'Financial Modeling', 'Financial Reporting', 'Treasury',
        'Investment Management', 'Investment Analysis', 'Asset Management',
        'Mergers and Acquisitions', 'Corporate Finance', 'Capital Markets',
        'Credit Analysis', 'Credit Risk', 'Lending', 'Loan Origination',
        'Banking', 'Commercial Banking', 'Retail Banking', 'Private Banking',
        'Wealth Management', 'Portfolio Analysis', 'Fund Management',
        'Tax Planning', 'Tax Compliance', 'Tax Strategy',
        'Accounting', 'General Ledger', 'Accounts Payable', 'Accounts Receivable',
        'Cost Accounting', 'Management Accounting', 'GAAP', 'IFRS',
        'Financial Controls', 'SOX Compliance', 'Internal Audit',

        'Supply Chain Management', 'Procurement', 'Sourcing Strategy', 'Vendor Selection',
        'Inventory Management', 'Warehouse Management', 'Distribution', 'Logistics',
        'Demand Planning', 'Supply Planning', 'S&OP', 'Lean Manufacturing',
        'Six Sigma', 'Quality Management', 'Quality Assurance', 'Quality Control',
        'Manufacturing', 'Production Planning', 'Process Engineering',
        'Facilities Management', 'Fleet Management', 'Safety Management',

        'Legal Research', 'Legal Writing', 'Litigation', 'Corporate Law',
        'Intellectual Property', 'Patent Law', 'Contract Law',
        'Employment Law', 'Labor Law', 'Regulatory Law',
        'Data Privacy', 'GDPR', 'CCPA', 'Information Security',
        'Cybersecurity', 'Network Security', 'Incident Response',
        'Enterprise Architecture', 'IT Strategy', 'IT Governance',
        'ERP', 'SAP', 'Oracle', 'Salesforce',
        'Business Process Reengineering', 'Process Automation',
        'Robotic Process Automation', 'Workflow Optimization',

        'Patient Care', 'Clinical Operations', 'Healthcare Management',
        'Medical Devices', 'Pharmaceuticals', 'Drug Development',
        'Clinical Trials', 'FDA Compliance', 'HIPAA',
        'Healthcare IT', 'Electronic Health Records',
        'Revenue Cycle Management', 'Population Health',
        'Care Coordination', 'Case Management',

        'Real Estate', 'Property Management', 'Lease Administration',
        'Construction Management', 'Building Codes', 'Zoning',
        'Environmental Compliance', 'Sustainability Strategy',
        'Energy Management', 'Renewable Energy',

        'Curriculum Development', 'Instructional Design', 'E-Learning',
        'Program Evaluation', 'Accreditation', 'Student Affairs',
        'Academic Administration', 'Enrollment Management',

        'Media Planning', 'Media Buying', 'Digital Marketing',
        'Public Relations', 'Crisis Management', 'Reputation Management',
        'Event Management', 'Sponsorship', 'Fundraising',
        'Stakeholder Engagement', 'Community Relations', 'Government Relations',
        'Lobbying', 'Policy Analysis', 'Public Policy',

        'Consulting', 'Management Consulting', 'Strategy Consulting',
        'Business Transformation', 'Organizational Design', 'Operating Model',
        'Customer Experience', 'Customer Journey Mapping', 'Voice of Customer',
        'Service Design', 'Design Thinking', 'Innovation Management',
        'Portfolio Governance', 'PMO', 'Benefits Realization',
        'Workforce Development', 'Organizational Change', 'Culture Transformation',
        'Strategic Thinking', 'Systems Thinking', 'Analytical Skills',
        'Communication Skills', 'Written Communication', 'Verbal Communication',
        'Interpersonal Skills', 'Influence', 'Executive Communication',
        'Board Reporting', 'Investor Relations', 'Annual Planning',
        'OKR', 'Balanced Scorecard', 'Performance Metrics',
        'Benchmarking', 'Best Practices', 'Industry Analysis',
        'Scenario Planning', 'Contingency Planning', 'Business Continuity',
        'Crisis Response', 'Disaster Recovery', 'Incident Management',
        'Knowledge Management', 'Documentation', 'Standard Operating Procedures',
        'Training Delivery', 'Facilitation', 'Workshop Design',
        'Capability Assessment', 'Skills Gap Analysis', 'Competency Modeling',
        'High-Performance Culture', 'Employee Development', 'Talent Strategy'
    ];
    
    skillDictionary.forEach(function(skill) {
        var lower = skill.toLowerCase();
        if (text.indexOf(lower) !== -1 && !seen.has(lower)) {
            seen.add(lower);
            var tier = classifyTierFromSection(lower);
            skillMatches.push({
                name: skill,
                canonical: lower,
                tier: tier,
                requirement: tier === 'required' ? 'Required' : tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                proficiency: inferJobProficiency(text, lower, seniority),
                category: 'technical',
                section: getSkillSection(lower),
                source: 'extracted',
                confidence: 0.5
            });
        }
    });
    
    // Pass 3b: stem-variant matching — catches inflected forms (negotiate→negotiation, etc.)
    var _stemVariants = {
        'negotiation': ['negotiate', 'negotiating', 'negotiated', 'negotiations'],
        'pricing': ['price', 'priced', 'prices'],
        'compliance': ['comply', 'compliant', 'complying'],
        'governance': ['govern', 'governing', 'governed'],
        'underwriting': ['underwrite', 'underwriter', 'underwritten', 'underwriters'],
        'leadership': ['leading', 'leaders'],
        'management': ['managing', 'managed', 'managers'],
        'planning': ['planned', 'planner', 'planners'],
        'assessment': ['assess', 'assessing', 'assessed', 'assessments'],
        'development': ['developing', 'developed', 'developer'],
        'optimization': ['optimize', 'optimizing', 'optimized'],
        'implementation': ['implement', 'implementing', 'implemented', 'implements'],
        'coordination': ['coordinate', 'coordinating', 'coordinated', 'coordinator'],
        'facilitation': ['facilitate', 'facilitating', 'facilitated', 'facilitator'],
        'acquisition': ['acquire', 'acquiring', 'acquired'],
        'allocation': ['allocate', 'allocating', 'allocated'],
        'evaluation': ['evaluate', 'evaluating', 'evaluated', 'evaluations'],
        'mitigation': ['mitigate', 'mitigating', 'mitigated'],
        'automation': ['automate', 'automating', 'automated'],
        'transformation': ['transform', 'transforming', 'transformed'],
        'standardization': ['standardize', 'standardizing', 'standardized'],
        'modernization': ['modernize', 'modernizing', 'modernized'],
        'simplification': ['simplify', 'simplifying', 'simplified'],
        'engagement': ['engage', 'engaging', 'engaged'],
        'alignment': ['align', 'aligning', 'aligned'],
        'profitability': ['profitable', 'profitably'],
        'accountability': ['accountable'],
        'scalability': ['scalable', 'scaling'],
        'sustainability': ['sustainable'],
        'innovation': ['innovate', 'innovating', 'innovated', 'innovative'],
        'collaboration': ['collaborate', 'collaborating', 'collaborated', 'collaborative'],
        'communication': ['communicate', 'communicating', 'communicated'],
        'presentation': ['present', 'presenting', 'presented'],
        'investigation': ['investigate', 'investigating', 'investigated'],
        'documentation': ['document', 'documenting', 'documented'],
        'visualization': ['visualize', 'visualizing', 'visualized'],
        'administration': ['administer', 'administering', 'administered', 'administrative'],
        'forecasting': ['forecast', 'forecasted', 'forecasts'],
        'budgeting': ['budget', 'budgets', 'budgeted'],
        'mentoring': ['mentor', 'mentored', 'mentors'],
        'coaching': ['coach', 'coached', 'coaches'],
        'consulting': ['consult', 'consulted', 'consultant', 'consultants'],
        'reporting': ['report', 'reported', 'reports'],
        'monitoring': ['monitor', 'monitored', 'monitors'],
        'auditing': ['audited', 'auditor', 'auditors'],
        'recruiting': ['recruit', 'recruited', 'recruiter', 'recruiters'],
        'sourcing': ['source', 'sourced', 'sources'],
        'onboarding': ['onboard', 'onboarded'],
        'training': ['trained', 'trainer', 'trainers'],
        'analysis': ['analyze', 'analyzing', 'analyzed', 'analyses', 'analyst'],
        'modeling': ['modeled', 'modeler', 'modelers'],
        'strategy': ['strategic', 'strategize', 'strategizing', 'strategies', 'strategist'],
        'insurance': ['insurer', 'insurers', 'insured', 'insuring']
    };

    skillDictionary.forEach(function(skill) {
        var lower = skill.toLowerCase();
        if (seen.has(lower) || text.indexOf(lower) !== -1) return;
        var words = lower.split(/\s+/);
        var lastWord = words[words.length - 1];
        var variants = _stemVariants[lastWord];
        if (!variants) return;
        var isMultiWord = words.length > 1;
        for (var vi = 0; vi < variants.length; vi++) {
            var variantPhrase = lower.replace(new RegExp(lastWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), variants[vi]);
            if (isMultiWord) {
                if (text.indexOf(variantPhrase) === -1) continue;
            } else {
                if (!findSkillInText(variants[vi], text, searchTextNormUser)) continue;
            }
            seen.add(lower);
            var tier = classifyTierFromSection(variantPhrase);
            skillMatches.push({
                name: skill,
                canonical: lower,
                tier: tier,
                requirement: tier === 'required' ? 'Required' : tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                proficiency: inferJobProficiency(text, variantPhrase, seniority),
                category: 'technical',
                section: getSkillSection(variantPhrase),
                source: 'extracted',
                confidence: 0.45
            });
            break;
        }
    });

    // Pass 3c: contextual noun-phrase extraction from sentences (not just bullets)
    var _contextPhrasePatterns = [
        /\b(?:lead|drive|manage|oversee|direct|guide|shape|define|develop|build|establish|implement|deliver|support|ensure|champion|optimize|evaluate|assess|monitor|coordinate)\s+(?:the\s+)?([a-z][\w\s\-&\/]{3,35}?)(?:\s+(?:to|for|across|within|that|which|in order|by|through|and|while|ensuring)|\.|,|;|$)/gi,
        /\b(?:responsible for|accountable for|focused on|tasked with|charged with)\s+(?:the\s+)?([a-z][\w\s\-&\/]{3,40}?)(?:\s+(?:to|for|across|within|that|which|in order|by|through)|\.|,|;|$)/gi,
        /\b(?:expertise in|experience (?:in|with)|background in|knowledge of|proficiency in|skilled in|competence in)\s+([a-z][\w\s\-&\/]{3,40}?)(?:\.|,|;|$)/gi
    ];

    var _nounPhraseBlocklist = new Set([
        'a team', 'the team', 'this role', 'the role', 'our team', 'the company',
        'the organization', 'the business', 'all aspects', 'the delivery',
        'the development', 'the implementation', 'the design', 'area of responsibility',
        'their area', 'business unit', 'the framework', 'this position',
        'higher management', 'potential issues', 'current and future needs',
        'the individual', 'our customers', 'our clients', 'the future',
        'business objectives', 'financial objectives', 'business unit needs',
        'key role', 'key areas', 'senior level', 'best practices',
        'day to day', 'end to end', 'cross functional', 'long term',
        'short term', 'high level', 'full time', 'part time',
        'business unit support', 'area of expertise', 'areas of responsibility',
        'operating standards', 'business unit goals', 'north america',
        'united states', 'all stakeholders', 'external market shifts',
        'current and future', 'lines of business', 'north american portfolios',
        'relevant experience', 'related experience', 'years of experience',
        'strong background', 'demonstrated ability', 'proven ability',
        'ability to work', 'ability to manage', 'ability to lead',
        'successful candidate', 'ideal candidate', 'qualified candidate'
    ]);

    lines.forEach(function(line) {
        _contextPhrasePatterns.forEach(function(pat) {
            var m; pat.lastIndex = 0;
            while ((m = pat.exec(line)) !== null) {
                var phrase = (m[1] || '').trim().toLowerCase();
                phrase = phrase.replace(/\s+/g, ' ').replace(/^(?:a|an|the|our|their|its|his|her)\s+/i, '').trim();
                if (phrase.length < 5 || phrase.length > 40) continue;
                if (_nounPhraseBlocklist.has(phrase)) continue;
                if (seen.has(phrase)) continue;
                if (/\b(issues?|needs?|objectives?|goals?|aspects?|areas?|things?|ways?|results?|efforts?|activities?|matters?|items?|factors?)\b/i.test(phrase)) continue;
                var wordCount = phrase.split(/\s+/).length;
                if (wordCount < 2 || wordCount > 4) continue;
                var isInLibrary = window._skillNameSet ? window._skillNameSet.has(phrase) :
                    (skillLibraryIndex && skillLibraryIndex.index && skillLibraryIndex.index.some(function(e) { return (e.n || '').toLowerCase() === phrase; }));
                var inDict = skillDictionary.some(function(d) { return d.toLowerCase() === phrase; });
                if (isInLibrary || inDict) {
                    seen.add(phrase);
                    var clean = phrase.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                    var tier = classifyTierFromSection(phrase);
                    skillMatches.push({
                        name: clean,
                        canonical: phrase,
                        tier: tier,
                        requirement: tier === 'required' ? 'Required' : tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                        proficiency: inferJobProficiency(text, phrase, seniority),
                        category: 'technical',
                        section: getSkillSection(phrase),
                        source: 'extracted',
                        confidence: 0.45
                    });
                }
            }
        });
    });

    // Fourth pass: bullet-aware phrase extraction with compound splitting (Phase 3)
    var phrasePatterns = [
        /(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience\s+(?:in|with)\s+)?(.+?)(?:\.|,|;|$)/gi,
        /(?:proficien|experienc|knowledge|expertise|skill|familiar)\w*\s+(?:in|with|of)\s+(.+?)(?:\.|,|;|$)/gi,
        /(?:strong|excellent|proven|demonstrated)\s+(.+?)(?:\s+(?:skills?|abilities?|experience))(?:\.|,|;|$)/gi,
        /(?:ability|able)\s+to\s+(.+?)(?:\.|,|;|$)/gi,
        /(?:understanding|background)\s+(?:of|in)\s+(.+?)(?:\.|,|;|$)/gi,
        /(?:certified|certification)\s+(?:in|as)\s+(.+?)(?:\.|,|;|$)/gi
    ];
    
    bulletLines.forEach(function(bl) {
        phrasePatterns.forEach(function(pat) {
            var m;
            pat.lastIndex = 0;
            while ((m = pat.exec(bl.text)) !== null) {
                var extracted = (m[2] || m[1] || '').trim();
                var compounds = splitCompoundTerms(extracted);
                compounds.forEach(function(phrase) {
                    phrase = phrase.replace(/^\s*(?:a|an|the)\s+/i, '').trim();
                    if (phrase.length > 2 && phrase.length < 50 && !seen.has(phrase.toLowerCase())) {
                        seen.add(phrase.toLowerCase());
                        var clean = phrase.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                        skillMatches.push({
                            name: clean,
                            canonical: phrase.toLowerCase().replace(/\s+/g, ' ').trim(),
                            tier: bl.tier,
                            requirement: bl.tier === 'required' ? 'Required' : bl.tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                            proficiency: inferJobProficiency(text, phrase.toLowerCase(), seniority),
                            category: 'extracted',
                            section: bl.section !== 'unknown' ? bl.section : null,
                            source: 'inferred',
                            confidence: 0.4
                        });
                    }
                });
            }
        });
    });
    
    // Fifth pass: compound list splitting within bullet lines
    // Catches patterns like "MS Word, Excel, PowerPoint" or "Python/R/SQL"
    bulletLines.forEach(function(bl) {
        var listMatch = bl.text.match(/(?:including|such as|e\.?g\.?|tools?:?|technologies?:?|platforms?:?|software:?|languages?:?)\s+(.+?)(?:\.|$)/i);
        if (listMatch) {
            var compounds = splitCompoundTerms(listMatch[1]);
            compounds.forEach(function(term) {
                term = term.trim();
                if (term.length >= 2 && term.length <= 40 && !seen.has(term.toLowerCase())) {
                    seen.add(term.toLowerCase());
                    var clean = term.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                    skillMatches.push({
                        name: clean,
                        canonical: term.toLowerCase().replace(/\s+/g, ' ').trim(),
                        tier: bl.tier,
                        requirement: bl.tier === 'required' ? 'Required' : bl.tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                        proficiency: inferJobProficiency(text, term.toLowerCase(), seniority),
                        category: 'tool',
                        section: bl.section !== 'unknown' ? bl.section : null,
                        source: 'inferred',
                        confidence: 0.45
                    });
                }
            });
        }
        
        var slashTerms = bl.text.match(/\b([A-Za-z\+\#]+(?:\s*\/\s*[A-Za-z\+\#]+){1,5})\b/);
        if (slashTerms) {
            slashTerms[1].split(/\s*\/\s*/).forEach(function(term) {
                term = term.trim();
                if (term.length >= 2 && term.length <= 30 && !seen.has(term.toLowerCase())) {
                    seen.add(term.toLowerCase());
                    skillMatches.push({
                        name: term,
                        canonical: term.toLowerCase(),
                        tier: bl.tier,
                        requirement: bl.tier === 'required' ? 'Required' : bl.tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
                        proficiency: inferJobProficiency(text, term.toLowerCase(), seniority),
                        category: 'technical',
                        section: bl.section !== 'unknown' ? bl.section : null,
                        source: 'inferred',
                        confidence: 0.4
                    });
                }
            });
        }
    });
    
    // ===== SKILL VALIDATION & CLEANING =====
    // Filter out garbage: fragments, common words, values, duplicates
    
    // Blocklist: common English words and fragments that aren't real skills
    var SKILL_BLOCKLIST = new Set([
        'sing', 'plan', 'lead', 'test', 'design', 'build', 'drive', 'track',
        'focus', 'scale', 'model', 'train', 'support', 'process', 'review',
        'manage', 'create', 'develop', 'deliver', 'ensure', 'maintain',
        'pregnancy', 'eviews', 'executable', 'tooling', 'improvise', 'localization',
        'initiative', 'investments', 'market trend', 'external marketing',
        'history', 'experience', 'ability', 'knowledge', 'understanding',
        'passion', 'commitment', 'desire', 'willingness', 'enthusiasm',
        'environment', 'organization', 'industry', 'company', 'team',
        'candidate', 'role', 'position', 'opportunity', 'benefit',
        'salary', 'compensation', 'bonus', 'equity', 'package',
        'location', 'remote', 'hybrid', 'onsite', 'office',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
        'january', 'february', 'march', 'april', 'june', 'july',
        'august', 'september', 'october', 'november', 'december',
        'years', 'months', 'days', 'hours', 'weeks',
        'bachelor', 'master', 'degree', 'mba', 'phd',
        'minimum', 'maximum', 'required', 'preferred', 'plus',
        'strong', 'excellent', 'proven', 'demonstrated',
        'economy', 'agriculture', 'manufacturing', 'retail',
        'monit', 'tform', 'staf', 'less', 'tic', 'hypot', 'analy',
        'tic', 'forma', 'techni', 'specif', 'improv', 'effici',
        'ashing', 'composure', 'patience', 'resilience', 'grit',
        'tenacity', 'passion', 'enthusiasm', 'diligence',
        'able', 'well', 'high', 'best', 'good', 'great', 'fast',
        'also', 'must', 'will', 'work', 'time', 'make', 'take',
        'come', 'give', 'find', 'help', 'show', 'tell', 'keep',
        'long', 'term', 'full', 'part', 'base', 'core', 'open',
        'across', 'including', 'related', 'based', 'level',
        'equal', 'other', 'various', 'multiple', 'several',
        'geometry', 'algebra', 'calculus', 'trigonometry', 'arithmetic',
        'journals', 'publications', 'articles', 'papers', 'manuscripts',
        'dependability', 'punctuality', 'attendance', 'timeliness',
        'standing', 'sitting', 'lifting', 'walking', 'bending', 'reaching',
        'travel', 'overtime', 'shifts', 'weekends', 'holidays',
        'clearance', 'citizenship', 'authorization', 'eligibility',
        'valid', 'current', 'active', 'existing', 'prior',
        'meet', 'deadlines', 'goals', 'targets', 'objectives',
        'reading', 'hearing', 'vision',
        'proficient', 'fluent', 'native', 'bilingual'
    ]);
    
    // Values that aren't skills
    var VALUES_BLOCKLIST = new Set([
        'curiosity', 'integrity', 'honesty', 'respect', 'trust',
        'accountability', 'transparency', 'empathy', 'humility',
        'courage', 'excellence', 'reliability', 'loyalty',
        'fairness', 'diversity', 'inclusion', 'belonging',
        'sustainability', 'responsibility', 'stewardship',
        'customer obsession', 'ownership', 'bias for action',
        'earn trust', 'think big', 'insist on the highest standards'
    ]);
    
    var cleanedSkills = [];
    var seenNorm = new Set();
    
    skillMatches.forEach(function(skill) {
        var name = (skill.name || '').trim();
        var lower = name.toLowerCase();
        
        // Skip empty or too short
        if (name.length < 3) return;
        
        // Skip single common words (< 2 words and in blocklist)
        var wordCount = name.split(/\s+/).length;
        if (SKILL_BLOCKLIST.has(lower)) return;
        
        // Skip values
        if (VALUES_BLOCKLIST.has(lower)) return;
        
        // Skip financial metrics / KPIs (not skills)
        if (/^(gross margin|net margin|ebitda|revenue target|profit margin|burn rate|run rate|headcount|turnover rate|attrition rate|quota attainment|market share|cagr|arpu|arr|mrr|nps score|csat|ltv|cac)$/i.test(name)) return;
        
        // Skip qualification/prerequisite phrases (not skills)
        if (/^(meet deadlines|work independently|work under pressure|fast[- ]paced|detail[- ]oriented|self[- ]starter|team player|results[- ]driven|goal[- ]oriented|highly motivated|multi[- ]?task|work ethic|can[- ]do attitude|goes? above and beyond|hit the ground running|wear many hats|roll up.+sleeves|hands[- ]on|big[- ]picture|out of the box|think outside|paradigm|synerg|leverage|utilize|passion for|must be able|able to travel|willing to|expected to|responsible for|tasked with|charged with|accountable for)$/i.test(name)) return;
        
        // Skip academic subjects that appear in prerequisite sections (not technical skills)
        if (/^(geometry|algebra|trigonometry|liberal arts|social sciences|natural sciences|humanities)$/i.test(name)) return;
        
        // Skip if looks like a word fragment (no vowels, or all caps < 4 chars that aren't known acronyms)
        var knownAcronyms = new Set(['sql', 'crm', 'erp', 'sap', 'aws', 'gcp', 'api', 'css', 'html', 'xml', 'json', 'rest', 'saas', 'paas', 'iot', 'etl', 'rpa', 'nlp', 'llm', 'gpu', 'vpc', 'cdn', 'dns', 'tcp', 'udp', 'ssh', 'ssl', 'tls', 'vpn', 'seo', 'sem', 'ppc', 'roi', 'kpi', 'okr', 'cad', 'bim', 'plc', 'hmi']);
        if (name.length <= 4 && !/[aeiou]/i.test(name) && !knownAcronyms.has(lower)) return;
        
        // Single words ≤ 6 chars that aren't known acronyms: verify against skill library
        if (wordCount === 1 && name.length <= 6 && !knownAcronyms.has(lower)) {
            var inLibrary = window._skillNameSet ? window._skillNameSet.has(lower) :
                (skillLibraryIndex && skillLibraryIndex.index && skillLibraryIndex.index.some(function(e) { return (e.n || '').toLowerCase() === lower; }));
            if (!inLibrary) return;
        }
        
        // Deduplicate by normalized key (strip parentheticals, lowercase, collapse spaces)
        var normKey = lower.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        if (seenNorm.has(normKey)) return;
        
        // Also check without "and" / "&" differences
        var altKey = normKey.replace(/\s*&\s*/g, ' and ').replace(/\s+/g, ' ');
        var altKey2 = normKey.replace(/\s+and\s+/g, ' & ');
        if (seenNorm.has(altKey) || seenNorm.has(altKey2)) return;
        
        seenNorm.add(normKey);
        seenNorm.add(altKey);
        seenNorm.add(altKey2);
        cleanedSkills.push(skill);
    });
    
    skillMatches = cleanedSkills;
    
    // Admin approved skills pass — inject manually approved terms (word-boundary match)
    if (_adminApprovedSkills && _adminApprovedSkills.size > 0) {
        var existingLower = {};
        skillMatches.forEach(function(s) { existingLower[s.name.toLowerCase()] = true; });
        _adminApprovedSkills.forEach(function(approved) {
            if (existingLower[approved]) return;
            try {
                var wbRe = new RegExp('\\b' + approved.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
                if (wbRe.test(jdText)) {
                    var displayName = approved.replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                    skillMatches.push({ name: displayName, requirement: 'Required', proficiency: inferJobProficiency(approved, seniority, jdText), category: 'approved', source: 'admin-approved' });
                }
            } catch(e) {}
        });
    }

    // Admin blocklist filter
    if (_adminSkillBlocklist.size > 0) {
        skillMatches = skillMatches.filter(function(s) {
            return !isSkillBlocklisted(s.name);
        });
    }
    
    // Extract roles/departments
    var roles = [];
    var rolePatterns = { 'Engineering': /engineer|develop|software|technical/i, 'Product': /product|ux|design/i,
        'Marketing': /marketing|brand|content|growth/i, 'Sales': /sales|revenue|account|business development/i,
        'Data': /data|analy|science|ml|ai/i, 'Operations': /operations|supply|logistics/i,
        'Finance': /finance|accounting|budget|treasury/i, 'HR': /human resources|talent|recruiting|people/i,
        'Strategy': /strategy|strateg|transformation|innovation/i, 'Leadership': /leader|executive|management/i
    };
    Object.keys(rolePatterns).forEach(function(role) { if (rolePatterns[role].test(jdText)) roles.push(role); });
    if (roles.length === 0) roles.push('General');
    
    // ===== BUILD V2 SKILL OBJECTS (Phase 3) =====
    var v2Skills = skillMatches.slice(0, JOB_SKILLS_CAP).map(function(s) {
        var tier = s.tier || normalizeTier(s.requirement || 'required');
        return {
            name: s.name,
            canonical: s.canonical || s.name.toLowerCase().replace(/\s+/g, ' ').trim(),
            abbreviation: null,
            tier: tier,
            requirement: tier === 'required' ? 'Required' : tier === 'preferred' ? 'Preferred' : 'Nice-to-have',
            proficiency: s.proficiency || 'Proficient',
            category: s.category || 'technical',
            section: s.section || null,
            context: null,
            source: s.source || 'extracted',
            confidence: s.confidence || 0.5,
            frameworkRef: null
        };
    });
    
    return {
        title: title || 'Untitled Position',
        company: company,
        seniority: seniority,
        roles: roles,
        skills: v2Skills,
        _sectionCount: sections.filter(function(s) { return isSkillSection(s.type); }).length,
        _bulletCount: bulletLines.length
    };
}

export function classifyRequirementLevel(text, skillLower) {
    // Look for context around the skill mention
    var idx = text.indexOf(skillLower);
    if (idx === -1) return 'Required';
    var context = text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 100));
    if (/nice.to.have|bonus|plus|preferred|ideal/i.test(context)) return 'Nice-to-have';
    if (/prefer|desired|strongly prefer/i.test(context)) return 'Preferred';
    return 'Required';
}

export function inferJobProficiency(text, skillLower, seniority) {
    // Infer minimum proficiency from context and seniority
    var idx = text.indexOf(skillLower);
    var context = idx >= 0 ? text.substring(Math.max(0, idx - 150), Math.min(text.length, idx + 150)) : '';
    
    // Context clues for specific proficiency
    // "master" requires word boundary to avoid matching "master's degree"
    if (/\bmastery\b|authority|world.class|industry.leading|thought leader|deep expertise/i.test(context)) return 'Mastery';
    // Removed "senior", "strong", "deep" — too common in JD boilerplate; inflated requirements
    if (/\bexpert\b|extensive experience|proven track record/i.test(context)) return 'Expert';
    if (/proficien|solid|experienced|demonstrated|working knowledge/i.test(context)) return 'Proficient';
    if (/familiar|basic|exposure|awareness|entry|junior/i.test(context)) return 'Competent';
    
    // Years context
    var yearsMatch = context.match(/(\d+)\+?\s*years/);
    if (yearsMatch) {
        var yrs = parseInt(yearsMatch[1]);
        if (yrs >= 10) return 'Mastery';
        if (yrs >= 7) return 'Expert';
        if (yrs >= 4) return 'Proficient';
        if (yrs >= 2) return 'Competent';
        return 'Novice';
    }
    
    // Fall back to seniority-based default
    if (seniority === 'Executive') return 'Expert';
    if (seniority === 'Senior') return 'Proficient';
    if (seniority === 'Entry') return 'Competent';
    return 'Proficient'; // Mid default
}

// ===== PROFICIENCY SCALE =====
var PROFICIENCY_SCALE = { 'Novice': 1, 'Competent': 2, 'Proficient': 3, 'Advanced': 3.5, 'Expert': 4, 'Mastery': 5 };

export function proficiencyValue(level) {
    return PROFICIENCY_SCALE[level] || PROFICIENCY_SCALE['Proficient'];
}

// ===== O*NET CROSSWALK RUNTIME =====
// Title resolution, skill enrichment, and multi-source merge
// Powered by onet-crosswalk.json

/**
 * Normalize a job title for alias lookup.
 * Mirrors the pipeline's normalizeTitle() logic client-side.
 */
export function crosswalkNormalizeTitle(title) {
    if (!title) return '';
    var t = title.toLowerCase().trim();
    // Remove parentheticals
    t = t.replace(/\([^)]*\)/g, '');
    // Strip common prefixes
    var prefixes = ['senior ', 'sr ', 'sr. ', 'junior ', 'jr ', 'jr. ', 'lead ', 'principal ', 'staff ', 'associate ', 'assistant ', 'deputy ', 'interim '];
    for (var i = 0; i < prefixes.length; i++) {
        if (t.indexOf(prefixes[i]) === 0) { t = t.substring(prefixes[i].length); break; }
    }
    // Strip level suffixes
    var suffixes = [' i', ' ii', ' iii', ' iv', ' v', ' 1', ' 2', ' 3', ' level 1', ' level 2', ' level 3'];
    for (var i = 0; i < suffixes.length; i++) {
        if (t.length > suffixes[i].length && t.substring(t.length - suffixes[i].length) === suffixes[i]) {
            t = t.substring(0, t.length - suffixes[i].length); break;
        }
    }
    // Normalize punctuation and whitespace
    t = t.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return t;
}

/**
 * Compute Dice coefficient (bigram overlap) for fuzzy matching.
 * Returns 0-1, where 1 = identical.
 */
export function crosswalkDice(a, b) {
    var sa = a.toLowerCase().replace(/\s+/g, ' ').trim();
    var sb = b.toLowerCase().replace(/\s+/g, ' ').trim();
    if (sa === sb) return 1;
    if (sa.length < 2 || sb.length < 2) return 0;
    var gramsA = {}, gramsB = {}, countA = 0, countB = 0;
    for (var i = 0; i < sa.length - 1; i++) { var g = sa.substring(i, i+2); if (!gramsA[g]) { gramsA[g] = true; countA++; } }
    for (var i = 0; i < sb.length - 1; i++) { var g = sb.substring(i, i+2); if (!gramsB[g]) { gramsB[g] = true; countB++; } }
    var intersection = 0;
    for (var g in gramsA) { if (gramsB[g]) intersection++; }
    return (2 * intersection) / (countA + countB);
}

/**
 * Resolve a raw job title to O*NET occupation(s).
 * Returns: { soc, title, family, confidence, alternatives[] } or null
 *
 * Strategy:
 *   1. Exact normalized alias match (confidence: 1.0)
 *   2. Stripped qualifiers retry (confidence: 0.95)
 *   3. Partial substring match (confidence: 0.85)
 *   4. Word-overlap scoring — best match by shared meaningful words (confidence: 0.6-0.8)
 *   5. Fuzzy bigram match via Dice coefficient (confidence: 0.5-0.7)
 */
export function resolveTitle(rawTitle) {
    if (!window.onetCrosswalk || !rawTitle) return null;
    var cw = window.onetCrosswalk;
    var norm = crosswalkNormalizeTitle(rawTitle);
    if (!norm) return null;

    function buildResult(soc, confidence, alts) {
        var primary = cw.occupations[soc];
        if (!primary) return null;
        return {
            soc: soc,
            title: primary.title,
            family: primary.family,
            confidence: confidence,
            alternatives: (alts || []).slice(0, 4).map(function(s) {
                var o = cw.occupations[s];
                return o ? { soc: s, title: o.title, family: o.family } : null;
            }).filter(Boolean)
        };
    }

    // Step 1: Exact alias match
    if (cw.aliases[norm]) {
        var socs = cw.aliases[norm];
        var r = buildResult(socs[0], 1.0, socs.slice(1));
        if (r) return r;
    }

    // Step 2: Strip common qualifiers and retry
    // Words like "global", "digital", "corporate", "regional" modify scope but not occupation
    var qualifiers = ['global', 'digital', 'corporate', 'regional', 'national', 'international', 'enterprise', 'strategic', 'commercial', 'general', 'group', 'divisional', 'worldwide', 'north america', 'emea', 'apac', 'americas'];
    var stripped = norm;
    qualifiers.forEach(function(q) {
        stripped = stripped.replace(new RegExp('\\b' + q + '\\b', 'g'), '');
    });
    // Also strip "of", "and", "the" that might be left dangling
    stripped = stripped.replace(/\b(of|and|the|for|in)\b/g, '').replace(/\s+/g, ' ').trim();
    if (stripped !== norm && stripped.length >= 3 && cw.aliases[stripped]) {
        var socs = cw.aliases[stripped];
        var r = buildResult(socs[0], 0.95, socs.slice(1));
        if (r) return r;
    }

    // Also try with "of" preserved (e.g., "vp of strategy" vs "vp strategy")
    var strippedKeepOf = norm;
    qualifiers.forEach(function(q) {
        strippedKeepOf = strippedKeepOf.replace(new RegExp('\\b' + q + '\\b', 'g'), '');
    });
    strippedKeepOf = strippedKeepOf.replace(/\s+/g, ' ').trim();
    if (strippedKeepOf !== norm && strippedKeepOf !== stripped && strippedKeepOf.length >= 3 && cw.aliases[strippedKeepOf]) {
        var socs = cw.aliases[strippedKeepOf];
        var r = buildResult(socs[0], 0.95, socs.slice(1));
        if (r) return r;
    }

    // Step 3: Partial substring match
    var partialMatches = [];
    for (var alias in cw.aliases) {
        if (alias.length < 4) continue;
        if (norm.indexOf(alias) !== -1 || alias.indexOf(norm) !== -1) {
            var socs = cw.aliases[alias];
            for (var i = 0; i < socs.length; i++) {
                if (cw.occupations[socs[i]]) {
                    partialMatches.push({ soc: socs[i], alias: alias, len: alias.length });
                }
            }
        }
    }
    // Also try stripped version for partial matching
    if (stripped !== norm) {
        for (var alias in cw.aliases) {
            if (alias.length < 4) continue;
            if (stripped.indexOf(alias) !== -1 || alias.indexOf(stripped) !== -1) {
                var socs = cw.aliases[alias];
                for (var i = 0; i < socs.length; i++) {
                    if (cw.occupations[socs[i]]) {
                        partialMatches.push({ soc: socs[i], alias: alias, len: alias.length });
                    }
                }
            }
        }
    }
    if (partialMatches.length > 0) {
        // Prefer longest alias match (more specific)
        partialMatches.sort(function(a, b) { return b.len - a.len; });
        var seen = {};
        var unique = partialMatches.filter(function(m) {
            if (seen[m.soc]) return false;
            seen[m.soc] = true;
            return true;
        });
        var r = buildResult(unique[0].soc, 0.85, unique.slice(1).map(function(m) { return m.soc; }));
        if (r) return r;
    }

    // Step 4: Word-overlap scoring
    // Tokenize the input and compare word sets against each alias
    var normWords = norm.split(' ').filter(function(w) { return w.length > 2; });
    var strippedWords = stripped.split(' ').filter(function(w) { return w.length > 2; });
    var stopWords = { 'the': 1, 'and': 1, 'for': 1, 'all': 1, 'other': 1 };
    var meaningfulWords = (strippedWords.length > 0 ? strippedWords : normWords).filter(function(w) { return !stopWords[w]; });

    if (meaningfulWords.length > 0) {
        var bestWordScore = 0;
        var bestWordSocs = null;
        for (var alias in cw.aliases) {
            if (alias.length < 4) continue;
            var aliasWords = alias.split(' ').filter(function(w) { return w.length > 2 && !stopWords[w]; });
            if (aliasWords.length === 0) continue;

            // Count shared meaningful words
            var shared = 0;
            meaningfulWords.forEach(function(w) {
                if (aliasWords.indexOf(w) !== -1) shared++;
            });

            // Score: proportion of input words found in alias, weighted by proportion of alias covered
            if (shared > 0) {
                var inputCoverage = shared / meaningfulWords.length;
                var aliasCoverage = shared / aliasWords.length;
                var wordScore = (inputCoverage * 0.6) + (aliasCoverage * 0.4);

                if (wordScore > bestWordScore) {
                    bestWordScore = wordScore;
                    bestWordSocs = cw.aliases[alias];
                }
            }
        }
        if (bestWordScore >= 0.5 && bestWordSocs && bestWordSocs.length > 0) {
            var confidence = Math.round((0.6 + bestWordScore * 0.2) * 100) / 100;
            var r = buildResult(bestWordSocs[0], Math.min(confidence, 0.8), bestWordSocs.slice(1));
            if (r) return r;
        }
    }

    // Step 5: Fuzzy bigram match via Dice coefficient
    var bestDice = 0;
    var bestDiceSocs = null;
    for (var alias in cw.aliases) {
        if (alias.length < 4) continue;
        var score = crosswalkDice(norm, alias);
        if (score > bestDice && score >= 0.55) {
            bestDice = score;
            bestDiceSocs = cw.aliases[alias];
        }
    }
    if (bestDiceSocs && bestDiceSocs.length > 0 && cw.occupations[bestDiceSocs[0]]) {
        var r = buildResult(bestDiceSocs[0], Math.round(bestDice * 80) / 100, bestDiceSocs.slice(1));
        if (r) return r;
    }

    // Step 6: Last resort — scan occupation primary titles
    var bestOccDice = 0;
    var bestOccSoc = null;
    for (var soc in cw.occupations) {
        var occTitle = cw.occupations[soc].title.toLowerCase();
        var score = crosswalkDice(stripped || norm, occTitle);
        if (score > bestOccDice && score >= 0.5) {
            bestOccDice = score;
            bestOccSoc = soc;
        }
    }
    if (bestOccSoc) {
        var r = buildResult(bestOccSoc, Math.round(bestOccDice * 70) / 100, []);
        if (r) return r;
    }

    return null;
}

/**
 * Get the full skill profile for an occupation.
 * Returns: { skills[], abilities[], knowledge[], workStyles[] } or null
 */
export function getOccupationProfile(socCode) {
    if (!window.onetCrosswalk || !socCode) return null;
    var occ = window.onetCrosswalk.occupations[socCode];
    if (!occ) return null;
    return {
        soc: occ.soc,
        title: occ.title,
        family: occ.family,
        skills: occ.skills || [],
        abilities: occ.abilities || [],
        knowledge: occ.knowledge || [],
        workStyles: occ.workStyles || []
    };
}

/**
 * Compare user's skills against an occupation profile.
 * Returns: { matched[], gaps[], belowLevel[], surplus[] }
 *
 * matched:    user has skill at or above occupation level
 * gaps:       occupation expects skill, user doesn't have it
 * belowLevel: user has skill but below occupation's typical level
 * surplus:    user has skills not in the occupation profile
 */
// ===== DETERMINISTIC SKILL INFERENCE ENGINE =====
// Replaces Claude AI skill inference. Uses O*NET crosswalk data + heuristics.
// Zero API cost. Deterministic. Works offline.

export function detectSeniority(title) {
    if (!title) return 1;
    var t = title.toLowerCase();
    if (/\b(chief|ceo|cfo|cto|coo|cio|cmo|president|founder|owner)\b/.test(t)) return 5;
    if (/\b(svp|evp|senior vice president|executive vice president)\b/.test(t)) return 4.5;
    if (/\b(vp|vice president|partner|principal|gm|general manager)\b/.test(t)) return 4;
    if (/\b(director|head of|senior director)\b/.test(t)) return 3.5;
    if (/\b(senior manager|sr manager|senior lead)\b/.test(t)) return 3;
    if (/\b(manager|lead|supervisor|team lead)\b/.test(t)) return 2.5;
    if (/\b(senior|sr|staff|principal)\b/.test(t)) return 2;
    if (/\b(specialist|analyst|engineer|consultant|developer|designer)\b/.test(t)) return 1.5;
    if (/\b(associate|coordinator|assistant|junior|jr|intern|entry)\b/.test(t)) return 1;
    return 1.5;
}

export function adjustLevel(baseLevel, yearsInRole, seniority) {
    // Level hierarchy: Mastery > Expert > Advanced > Proficient > Novice
    var levels = ['Novice', 'Proficient', 'Advanced', 'Expert', 'Mastery'];
    var idx = levels.indexOf(baseLevel);
    if (idx === -1) idx = 1; // default Proficient
    
    // Boost for seniority (VP+ gets +1, Director +0.5)
    if (seniority >= 4) idx = Math.min(idx + 1, 4);
    else if (seniority >= 3) idx = Math.min(idx + 0.5, 4);
    
    // Boost for years (10+ years: +1, 5-9: +0.5)
    if (yearsInRole >= 10) idx = Math.min(idx + 1, 4);
    else if (yearsInRole >= 5) idx = Math.min(idx + 0.5, 4);
    
    // Reduce for very junior or short tenure
    if (seniority <= 1 && yearsInRole < 2) idx = Math.max(idx - 1, 0);
    
    return levels[Math.round(Math.min(idx, 4))];
}

export function inferSkillsDeterministic(rawSkills, workHistory, parsedRoles, skillCap) {
    var cw = window.onetCrosswalk;
    if (!cw || !rawSkills || rawSkills.length === 0) {
        // No crosswalk: return skills as Proficient with no enrichment
        return rawSkills.slice(0, skillCap || 30).map(function(name) {
            return { name: name, level: 'Proficient', category: 'skill', roles: parsedRoles.length > 0 ? [parsedRoles[0].id] : [], key: false, evidence: [] };
        });
    }
    
    // 1. Resolve all position titles to SOC codes
    var matchedOccupations = [];
    (workHistory || []).forEach(function(w) {
        var result = resolveTitle(w.title);
        if (result) {
            var startYear = parseInt((w.startDate || '').replace(/[^0-9]/g, '').slice(0,4)) || new Date().getFullYear();
            var endStr = w.endDate === 'Present' || !w.endDate ? '' + new Date().getFullYear() : w.endDate;
            var endYear = parseInt((endStr || '').replace(/[^0-9]/g, '').slice(0,4)) || new Date().getFullYear();
            var yearsInRole = Math.max(1, endYear - startYear);
            
            matchedOccupations.push({
                soc: result.soc,
                title: w.title,
                yearsInRole: yearsInRole,
                isCurrent: w.endDate === 'Present' || !w.endDate,
                seniority: detectSeniority(w.title),
                roleId: null // will map below
            });
            
            // Map to parsedRole ID
            var roleKey = w.title.toLowerCase().trim();
            parsedRoles.forEach(function(r) {
                if (r.name.toLowerCase().trim() === roleKey) matchedOccupations[matchedOccupations.length - 1].roleId = r.id;
            });
        }
    });
    
    console.log('Skill inference: resolved ' + matchedOccupations.length + ' of ' + (workHistory || []).length + ' positions to O*NET occupations');
    
    // 2. Build O*NET skill pool from all matched occupations
    var onetPool = {}; // key: normalized name → merged skill data
    matchedOccupations.forEach(function(occ) {
        var occData = cw.occupations[occ.soc];
        if (!occData) return;
        
        ['skills', 'abilities', 'knowledge'].forEach(function(type) {
            (occData[type] || []).forEach(function(s) {
                var key = s.name.toLowerCase().trim();
                if (!onetPool[key]) {
                    onetPool[key] = {
                        name: s.name,
                        importance: s.importance,
                        level: s.level,
                        blueprintLevel: s.blueprintLevel,
                        category: s.category || type,
                        sources: [occ.soc],
                        roleIds: occ.roleId ? [occ.roleId] : [],
                        maxYears: occ.yearsInRole,
                        maxSeniority: occ.seniority,
                        occCount: 1
                    };
                } else {
                    // Merge: take highest importance, track multiple sources
                    if (s.importance > onetPool[key].importance) {
                        onetPool[key].importance = s.importance;
                        onetPool[key].level = s.level;
                        onetPool[key].blueprintLevel = s.blueprintLevel;
                    }
                    if (onetPool[key].sources.indexOf(occ.soc) === -1) onetPool[key].sources.push(occ.soc);
                    if (occ.roleId && onetPool[key].roleIds.indexOf(occ.roleId) === -1) onetPool[key].roleIds.push(occ.roleId);
                    onetPool[key].maxYears = Math.max(onetPool[key].maxYears, occ.yearsInRole);
                    onetPool[key].maxSeniority = Math.max(onetPool[key].maxSeniority, occ.seniority);
                    onetPool[key].occCount++;
                }
            });
        });
    });
    
    console.log('Skill inference: O*NET pool has ' + Object.keys(onetPool).length + ' unique skills/abilities/knowledge');
    
    // 3. Match LinkedIn skills against O*NET pool
    var matched = [];
    var unmatched = [];
    var usedOnetKeys = {};
    
    rawSkills.forEach(function(skillName) {
        var key = skillName.toLowerCase().trim();
        var onetMatch = onetPool[key];
        
        // Fuzzy: check containment both ways
        if (!onetMatch) {
            var bestKey = null, bestLen = 0;
            Object.keys(onetPool).forEach(function(oKey) {
                if (oKey.indexOf(key) >= 0 || key.indexOf(oKey) >= 0) {
                    // Prefer longer match (more specific)
                    var matchLen = Math.min(oKey.length, key.length);
                    if (matchLen > bestLen) { bestLen = matchLen; bestKey = oKey; }
                }
            });
            if (bestKey) onetMatch = onetPool[bestKey];
        }
        
        if (onetMatch) {
            usedOnetKeys[onetMatch.name.toLowerCase().trim()] = true;
            matched.push({
                name: skillName,
                level: adjustLevel(onetMatch.blueprintLevel, onetMatch.maxYears, onetMatch.maxSeniority),
                category: onetMatch.category,
                importance: onetMatch.importance,
                onetName: onetMatch.name,
                roles: onetMatch.roleIds.length > 0 ? onetMatch.roleIds : (parsedRoles.length > 0 ? [parsedRoles[0].id] : []),
                occCount: onetMatch.occCount
            });
        } else {
            unmatched.push(skillName);
        }
    });
    
    // 4. Sort matched by importance (highest first), then by occCount (breadth)
    matched.sort(function(a, b) {
        if (b.importance !== a.importance) return b.importance - a.importance;
        return b.occCount - a.occCount;
    });
    
    console.log('Skill inference: ' + matched.length + ' matched to O*NET, ' + unmatched.length + ' unmatched');
    
    // 5. Build final skill array with key/supporting tier
    var results = [];
    
    matched.forEach(function(m, i) {
        results.push({
            name: m.name,
            level: m.level,
            category: m.category,
            roles: m.roles,
            key: i < 10,
            evidence: [{
                description: 'O*NET: ' + m.onetName,
                outcome: 'Importance ' + m.importance + '/100, spans ' + m.occCount + ' role' + (m.occCount > 1 ? 's' : '')
            }]
        });
    });
    
    // Add unmatched LinkedIn skills as Proficient (capped)
    unmatched.forEach(function(name) {
        results.push({
            name: name,
            level: 'Proficient',
            category: 'skill',
            roles: parsedRoles.length > 0 ? [parsedRoles[0].id] : [],
            key: false,
            evidence: [{ description: 'From LinkedIn profile', outcome: 'No O*NET match' }]
        });
    });
    
    // Cap
    var cap = skillCap || 30;
    if (results.length > cap) {
        console.log('Skill inference: capped from ' + results.length + ' to ' + cap + ' skills');
    }
    results = results.slice(0, cap);
    
    return results;
}

export function suggestMissingSkills(userSkills, socCode) {
    var profile = getOccupationProfile(socCode);
    if (!profile) return null;

    // Combine all occupation elements into one list
    var occElements = [].concat(
        profile.skills.map(function(s) { return Object.assign({}, s, { _type: 'skill' }); }),
        profile.abilities.map(function(s) { return Object.assign({}, s, { _type: 'ability' }); }),
        profile.knowledge.map(function(s) { return Object.assign({}, s, { _type: 'knowledge' }); }),
        profile.workStyles.map(function(s) { return Object.assign({}, s, { _type: 'workstyle' }); })
    );

    // Blueprint proficiency → numeric score for comparison
    var levelScores = { 'Mastery': 95, 'Expert': 80, 'Advanced': 65, 'Proficient': 50, 'Novice': 25 };

    // Build lookup of user skills by normalized name
    var userSkillMap = {};
    (userSkills || []).forEach(function(s) {
        userSkillMap[s.name.toLowerCase()] = s;
        // Also index by onetId/blueprintSlug if available
        if (s.onetId) userSkillMap[s.onetId.toLowerCase()] = s;
    });

    var matched = [];
    var gaps = [];
    var belowLevel = [];
    var matchedNames = {};

    occElements.forEach(function(el) {
        var nameLower = el.name.toLowerCase();
        var slugLower = (el.blueprintSlug || '').toLowerCase();

        // Try to find matching user skill
        var userSkill = userSkillMap[nameLower] || userSkillMap[slugLower];

        // Fuzzy fallback: check if any user skill name is very similar
        if (!userSkill) {
            for (var key in userSkillMap) {
                if (crosswalkDice(nameLower, key) >= 0.8) {
                    userSkill = userSkillMap[key];
                    break;
                }
            }
        }

        if (userSkill) {
            var userScore = levelScores[userSkill.level] || 50;
            var occScore = el.level || 50;
            matchedNames[userSkill.name.toLowerCase()] = true;

            if (userScore >= occScore - 10) {
                matched.push({
                    name: el.name,
                    userLevel: userSkill.level,
                    occupationLevel: el.blueprintLevel,
                    category: el.category || el._type,
                    importance: el.importance
                });
            } else {
                belowLevel.push({
                    name: el.name,
                    userLevel: userSkill.level,
                    occupationLevel: el.blueprintLevel,
                    category: el.category || el._type,
                    importance: el.importance
                });
            }
        } else {
            gaps.push({
                name: el.name,
                blueprintSlug: el.blueprintSlug,
                occupationLevel: el.blueprintLevel,
                category: el.category || el._type,
                importance: el.importance,
                elementId: el.elementId
            });
        }
    });

    // Surplus: user skills not in the occupation profile
    var surplus = (userSkills || []).filter(function(s) {
        return !matchedNames[s.name.toLowerCase()];
    }).map(function(s) {
        return { name: s.name, level: s.level, category: s.category };
    });

    // Sort gaps by importance (highest first)
    gaps.sort(function(a, b) { return (b.importance || 0) - (a.importance || 0); });

    return {
        occupation: profile.title,
        soc: socCode,
        matched: matched,
        gaps: gaps,
        belowLevel: belowLevel,
        surplus: surplus,
        matchPercent: Math.round((matched.length / Math.max(occElements.length, 1)) * 100)
    };
}

/**
 * Merge skills from a new source into existing skills.
 * Deduplicates by name (fuzzy), keeps higher level, unions evidence and roles.
 *
 * Each skill gains a `sources` array tracking provenance:
 *   e.g., ["json-import:2026-02-23", "linkedin-csv:2026-02-23"]
 *
 * Returns: { merged[], added[], upgraded[], unchanged[] }
 */
export function mergeSkillSources(existingSkills, newSkills, sourceName) {
    var dateStr = new Date().toISOString().substring(0, 10);
    var sourceTag = (sourceName || 'unknown') + ':' + dateStr;

    var levelRank = { 'Mastery': 5, 'Expert': 4, 'Advanced': 3, 'Proficient': 2, 'Novice': 1 };

    // Build index of existing skills by normalized name
    var existingIndex = {};
    var mergedSkills = (existingSkills || []).map(function(s) {
        var copy = Object.assign({}, s);
        if (!copy.sources) copy.sources = [];
        existingIndex[s.name.toLowerCase()] = copy;
        return copy;
    });

    var added = [];
    var upgraded = [];
    var unchanged = [];

    (newSkills || []).forEach(function(newSkill) {
        var nameLower = newSkill.name.toLowerCase();

        // Try exact name match first
        var existing = existingIndex[nameLower];

        // Fuzzy fallback
        if (!existing) {
            for (var key in existingIndex) {
                if (crosswalkDice(nameLower, key) >= 0.85) {
                    existing = existingIndex[key];
                    break;
                }
            }
        }

        if (existing) {
            var existRank = levelRank[existing.level] || 2;
            var newRank = levelRank[newSkill.level] || 2;

            // Add source provenance
            if (existing.sources.indexOf(sourceTag) === -1) {
                existing.sources.push(sourceTag);
            }

            // Upgrade level if new source reports higher
            if (newRank > existRank) {
                existing.level = newSkill.level;
                upgraded.push({ name: existing.name, from: existing.level, to: newSkill.level });
            } else {
                unchanged.push({ name: existing.name });
            }

            // Union roles
            if (newSkill.roles && newSkill.roles.length > 0) {
                if (!existing.roles) existing.roles = [];
                newSkill.roles.forEach(function(r) {
                    if (existing.roles.indexOf(r) === -1) existing.roles.push(r);
                });
            }

            // Union evidence
            if (newSkill.evidence && newSkill.evidence.length > 0) {
                if (!existing.evidence) existing.evidence = [];
                newSkill.evidence.forEach(function(e) {
                    var desc = (e.description || '').toLowerCase();
                    var alreadyHas = existing.evidence.some(function(ex) {
                        return (ex.description || '').toLowerCase() === desc;
                    });
                    if (!alreadyHas) existing.evidence.push(e);
                });
            }
        } else {
            // New skill — add with provenance
            var copy = Object.assign({}, newSkill);
            copy.sources = [sourceTag];
            mergedSkills.push(copy);
            existingIndex[nameLower] = copy;
            added.push({ name: newSkill.name, level: newSkill.level });
        }
    });

    return {
        merged: mergedSkills,
        added: added,
        upgraded: upgraded,
        unchanged: unchanged,
        summary: added.length + ' added, ' + upgraded.length + ' upgraded, ' + unchanged.length + ' unchanged'
    };
}

// Expose crosswalk functions globally
if (!window.resolveTitle) window.resolveTitle = resolveTitle;
if (!window.getOccupationProfile) window.getOccupationProfile = getOccupationProfile;
if (!window.suggestMissingSkills) window.suggestMissingSkills = suggestMissingSkills;
if (!window.mergeSkillSources) window.mergeSkillSources = mergeSkillSources;
if (!window.crosswalkNormalizeTitle) window.crosswalkNormalizeTitle = crosswalkNormalizeTitle;

// ===== SKILL REGISTRY UTILITIES =====

// Register a skill in the searchable library index (deduped by name)
export function registerInSkillLibrary(skillName, category) {
    if (!skillLibraryIndex) return;
    if (!skillLibraryIndex.index) skillLibraryIndex.index = [];
    var lower = skillName.toLowerCase();
    var exists = window._skillNameSet ? window._skillNameSet.has(lower) :
        skillLibraryIndex.index.some(function(s) { return (s.n || s.name || '').toLowerCase() === lower; });
    if (!exists) {
        skillLibraryIndex.index.push({ n: skillName, c: category || 'Custom', source: 'custom' });
        if (window._skillNameSet) window._skillNameSet.add(lower);
        if (window._skillLibNameMap) window._skillLibNameMap.set(lower, { n: skillName, c: category || 'Custom', source: 'custom' });
        if (skillLibraryIndex.totalSkills) skillLibraryIndex.totalSkills++;
        console.log('📚 Registered in skill library:', skillName);
    }
}
if (!window.registerInSkillLibrary) window.registerInSkillLibrary = registerInSkillLibrary;

// ===== COMPREHENSIVE SKILL SYNONYMS =====
// Bidirectional: abbreviation ↔ full name, plus common variants
var SKILL_SYNONYMS = {
    // ═══════════════════════════════════════════
    // ABBREVIATIONS & ACRONYMS
    // ═══════════════════════════════════════════
    'ats': ['applicant tracking system', 'applicant tracking systems', 'applicant tracking'],
    'hris': ['human resources information system', 'hr information system', 'hcm', 'workday', 'successfactors'],
    'hcm': ['human capital management', 'hris', 'hr technology'],
    'crm': ['customer relationship management', 'salesforce crm', 'hubspot crm'],
    'erp': ['enterprise resource planning', 'sap', 'oracle erp', 'netsuite'],
    'kpi': ['key performance indicator', 'key performance indicators', 'metrics', 'kpis'],
    'roi': ['return on investment', 'investment return'],
    'p&l': ['profit and loss', 'p&l management', 'income statement', 'financial performance'],
    'gtm': ['go-to-market', 'go to market', 'gtm strategy', 'market entry'],
    'okr': ['objectives and key results', 'okrs', 'goal setting framework'],
    'b2b': ['business-to-business', 'business to business', 'enterprise sales'],
    'b2c': ['business-to-consumer', 'business to consumer', 'consumer sales'],
    'saas': ['software as a service', 'cloud software', 'subscription software'],
    'deib': ['diversity equity inclusion belonging', 'dei', 'diversity recruiting', 'inclusion'],
    'dei': ['diversity equity inclusion', 'deib', 'diversity and inclusion', 'd&i'],
    'ml': ['machine learning', 'statistical learning', 'deep learning'],
    'ai': ['artificial intelligence', 'machine intelligence', 'applied ai'],
    'nlp': ['natural language processing', 'text analytics', 'computational linguistics', 'large language models'],
    'llm': ['large language model', 'large language models', 'foundation model', 'generative ai', 'genai', 'gpt', 'language model'],
    'genai': ['generative ai', 'generative artificial intelligence', 'gen ai', 'large language models', 'llm', 'foundation model', 'applied ai'],
    'generative ai': ['genai', 'gen ai', 'large language models', 'llm', 'generative artificial intelligence', 'foundation model', 'applied ai'],
    'large language models': ['llm', 'generative ai', 'genai', 'foundation model', 'language model', 'gpt'],
    'applied ai': ['artificial intelligence', 'ai', 'machine learning', 'genai', 'generative ai'],
    'artificial intelligence (ai)': ['ai', 'artificial intelligence', 'machine learning', 'applied ai', 'genai'],
    'prompt engineering': ['ai prompting', 'llm prompting', 'prompt design', 'genai'],
    'rag': ['retrieval augmented generation', 'retrieval-augmented generation', 'llm'],
    'rpa': ['robotic process automation', 'intelligent automation', 'process automation'],
    'ci/cd': ['continuous integration', 'continuous deployment', 'cicd', 'build pipeline'],
    'devops': ['development operations', 'dev ops', 'site reliability'],
    'seo': ['search engine optimization', 'organic search', 'search optimization'],
    'sem': ['search engine marketing', 'paid search', 'ppc', 'pay per click'],
    'ux': ['user experience', 'ux design', 'experience design'],
    'ui': ['user interface', 'ui design', 'interface design'],
    'qa': ['quality assurance', 'testing', 'test engineering'],
    'api': ['application programming interface', 'api design', 'api development', 'web services'],
    'sql': ['structured query language', 'database querying', 'relational databases'],
    'aws': ['amazon web services', 'cloud infrastructure'],
    'gcp': ['google cloud platform', 'google cloud'],
    'pmp': ['project management professional', 'project management certification'],
    'cpa': ['certified public accountant', 'public accounting'],
    'cfa': ['chartered financial analyst', 'investment analysis'],
    'phr': ['professional in human resources', 'hr certification'],
    'shrm': ['shrm-cp', 'shrm-scp', 'hr certification'],
    'sdk': ['software development kit', 'development toolkit'],
    'etl': ['extract transform load', 'data pipeline', 'data integration'],
    'bi': ['business intelligence', 'reporting', 'dashboards'],

    // ═══════════════════════════════════════════
    // STRATEGY & BUSINESS
    // ═══════════════════════════════════════════
    'strategic planning': ['strategy development', 'strategic thinking', 'business strategy', 'corporate strategy', 'strategy', 'strategic direction', 'long-range planning', 'strategic management'],
    'business strategy': ['corporate strategy', 'strategic planning', 'strategy', 'business planning', 'strategic direction'],
    'strategy': ['strategic planning', 'business strategy', 'strategic thinking', 'strategic direction'],
    'strategic thinking': ['strategic mindset', 'strategic vision', 'strategic planning', 'systems thinking'],
    'business planning': ['business strategy', 'strategic planning', 'corporate planning', 'annual planning', 'business plan development'],
    'long-range planning': ['strategic planning', 'long-term planning', 'multi-year planning', 'corporate planning'],
    'business acumen': ['commercial acumen', 'business savvy', 'business insight', 'commercial awareness', 'business judgment'],
    'commercial acumen': ['business acumen', 'commercial awareness', 'market awareness'],
    'competitive analysis': ['competitive intelligence', 'competitor analysis', 'market intelligence', 'competitive landscape'],
    'market analysis': ['market research', 'market assessment', 'market intelligence', 'market sizing'],
    'market research': ['market analysis', 'competitive intelligence', 'market intelligence', 'consumer research'],
    'business development': ['biz dev', 'business growth', 'partnership development', 'revenue development', 'new business'],
    'revenue growth': ['revenue generation', 'top-line growth', 'revenue expansion', 'revenue acceleration'],
    'revenue operations': ['revops', 'revenue management', 'go-to-market operations'],
    'go-to-market': ['gtm', 'gtm strategy', 'market entry', 'product launch strategy'],
    'pricing strategy': ['pricing', 'pricing optimization', 'monetization strategy', 'pricing models'],
    'monetization': ['revenue model', 'pricing strategy', 'business model'],
    'business model': ['business model innovation', 'revenue model', 'operating model'],
    'operating model': ['business model', 'organizational design', 'operating structure'],
    'mergers and acquisitions': ['m&a', 'corporate development', 'acquisitions', 'deal making'],
    'm&a': ['mergers and acquisitions', 'corporate development', 'acquisitions'],
    'due diligence': ['investment analysis', 'deal evaluation', 'risk assessment'],
    'corporate development': ['m&a', 'mergers and acquisitions', 'strategic partnerships'],
    'partnership development': ['strategic partnerships', 'alliances', 'business development', 'partner management'],
    'strategic partnerships': ['partnership development', 'alliances', 'joint ventures', 'ecosystem partnerships'],
    'innovation': ['innovation management', 'product innovation', 'business innovation', 'disruptive innovation'],
    'innovation management': ['innovation', 'r&d management', 'new product development'],
    'thought leadership': ['industry expertise', 'subject matter expertise', 'domain expertise', 'industry influence'],
    'industry expertise': ['domain knowledge', 'domain expertise', 'subject matter expertise', 'thought leadership'],

    // ═══════════════════════════════════════════
    // FINANCE & ACCOUNTING
    // ═══════════════════════════════════════════
    'financial analysis': ['financial modeling', 'financial planning', 'fp&a', 'finance', 'financial assessment'],
    'financial modeling': ['financial analysis', 'financial models', 'forecasting models', 'scenario modeling', 'financial projections'],
    'financial planning': ['fp&a', 'financial planning and analysis', 'budget planning', 'financial strategy'],
    'fp&a': ['financial planning and analysis', 'financial analysis', 'financial planning'],
    'finance': ['financial management', 'financial analysis', 'corporate finance'],
    'budgeting': ['budget management', 'budget planning', 'financial planning', 'cost management'],
    'budget management': ['budgeting', 'financial management', 'cost control', 'expense management'],
    'forecasting': ['financial forecasting', 'demand forecasting', 'business forecasting', 'predictive analytics'],
    'financial forecasting': ['forecasting', 'revenue forecasting', 'financial projections'],
    'accounting': ['financial accounting', 'management accounting', 'bookkeeping', 'general ledger'],
    'auditing': ['internal audit', 'financial audit', 'compliance audit', 'audit management'],
    'tax': ['tax planning', 'tax strategy', 'tax compliance', 'taxation'],
    'treasury': ['treasury management', 'cash management', 'liquidity management'],
    'revenue management': ['revenue optimization', 'yield management', 'pricing optimization'],
    'cost optimization': ['cost reduction', 'cost management', 'expense optimization', 'efficiency'],
    'financial reporting': ['financial statements', 'sec reporting', 'regulatory reporting', 'management reporting'],
    'investor relations': ['shareholder relations', 'capital markets', 'ir'],
    'capital allocation': ['investment strategy', 'portfolio management', 'resource allocation'],
    'risk management': ['enterprise risk', 'risk assessment', 'risk mitigation', 'risk analysis'],
    'compliance': ['regulatory compliance', 'legal compliance', 'governance', 'risk and compliance'],
    'governance': ['corporate governance', 'compliance', 'risk governance', 'policy management'],

    // ═══════════════════════════════════════════
    // LEADERSHIP & MANAGEMENT
    // ═══════════════════════════════════════════
    'leadership': ['team leadership', 'people leadership', 'management', 'organizational leadership'],
    'team leadership': ['team management', 'people management', 'people leadership', 'staff management'],
    'people management': ['team management', 'team leadership', 'direct reports management', 'staff management', 'personnel management'],
    'executive leadership': ['c-suite leadership', 'senior leadership', 'organizational leadership', 'enterprise leadership'],
    'executive presence': ['leadership presence', 'gravitas', 'senior stakeholder management'],
    'change management': ['organizational change', 'change leadership', 'transformation management', 'transition management'],
    'organizational development': ['org development', 'od', 'organizational design', 'organizational effectiveness'],
    'organizational design': ['org design', 'organizational structure', 'operating model'],
    'coaching': ['executive coaching', 'leadership coaching', 'performance coaching', 'mentoring'],
    'mentoring': ['coaching', 'talent development', 'career development support'],
    'conflict resolution': ['mediation', 'dispute resolution', 'negotiation'],
    'decision making': ['decision-making', 'judgment', 'critical judgment', 'executive decision making'],
    'problem solving': ['problem-solving', 'troubleshooting', 'analytical thinking', 'root cause analysis'],
    'critical thinking': ['analytical thinking', 'analytical reasoning', 'logical reasoning', 'critical analysis', 'critical reasoning'],
    'analytical thinking': ['critical thinking', 'analysis', 'analytical reasoning', 'analytical skills'],
    'systems thinking': ['systems analysis', 'holistic thinking', 'complexity management', 'strategic thinking'],
    'delegation': ['task delegation', 'workload management', 'team empowerment'],
    'influence': ['influencing', 'persuasion', 'stakeholder influence', 'organizational influence'],
    'negotiation': ['deal negotiation', 'contract negotiation', 'business negotiation'],
    'cross-functional collaboration': ['cross functional collaboration', 'cross-team collaboration', 'interdepartmental collaboration', 'matrixed collaboration'],
    'cross-functional leadership': ['matrixed leadership', 'cross-team leadership', 'enterprise leadership'],
    'stakeholder management': ['stakeholder engagement', 'stakeholder relations', 'stakeholder communication'],
    'stakeholder engagement': ['stakeholder management', 'stakeholder relations', 'partner engagement'],
    'program management': ['program leadership', 'portfolio management', 'multi-project management'],
    'project management': ['project leadership', 'project execution', 'program management'],
    'board management': ['board relations', 'board reporting', 'board governance'],

    // ═══════════════════════════════════════════
    // COMMUNICATION & PRESENTATION
    // ═══════════════════════════════════════════
    'communication': ['communications', 'written communication', 'verbal communication', 'business communication'],
    'written communication': ['business writing', 'technical writing', 'copywriting', 'writing'],
    'verbal communication': ['oral communication', 'public speaking', 'presentation skills'],
    'presentation skills': ['public speaking', 'storytelling', 'executive presentations', 'pitching'],
    'storytelling': ['narrative', 'business storytelling', 'data storytelling', 'strategic storytelling'],
    'public speaking': ['keynote speaking', 'conference speaking', 'presentation skills', 'verbal communication'],
    'technical writing': ['documentation', 'written communication', 'content development'],
    'copywriting': ['content writing', 'marketing copy', 'creative writing'],
    'editing': ['proofreading', 'content editing', 'copy editing'],
    'facilitation': ['meeting facilitation', 'workshop facilitation', 'group facilitation'],

    // ═══════════════════════════════════════════
    // RECRUITING & TALENT ACQUISITION
    // ═══════════════════════════════════════════
    'talent acquisition': ['recruiting', 'recruitment', 'hiring', 'talent management'],
    'recruiting': ['recruitment', 'talent acquisition', 'hiring', 'staffing'],
    'full-cycle recruiting': ['full cycle recruiting', 'full lifecycle recruiting', 'end-to-end recruiting'],
    'boolean search': ['boolean sourcing', 'advanced sourcing', 'sourcing techniques', 'x-ray search'],
    'sourcing': ['talent sourcing', 'candidate sourcing', 'passive candidate sourcing'],
    'candidate experience': ['candidate engagement', 'candidate journey', 'hiring experience'],
    'offer negotiation': ['compensation negotiation', 'salary negotiation', 'offer management'],
    'employer branding': ['employer brand', 'employment branding', 'talent branding', 'evp'],
    'workforce planning': ['headcount planning', 'capacity planning', 'workforce strategy', 'talent planning'],
    'succession planning': ['talent pipeline planning', 'leadership pipeline', 'leadership succession'],
    'talent management': ['talent development', 'talent strategy', 'talent optimization'],
    'talent development': ['learning and development', 'employee development', 'professional development'],
    'onboarding': ['new hire onboarding', 'employee onboarding', 'orientation'],
    'screening': ['candidate screening', 'resume screening', 'background check'],
    'interviewing': ['behavioral interviewing', 'structured interviewing', 'interview techniques'],
    'campus recruiting': ['university recruiting', 'college recruiting', 'early career'],
    'executive search': ['headhunting', 'retained search', 'executive recruiting'],
    'diversity recruiting': ['inclusive hiring', 'dei recruiting', 'equitable hiring'],
    'recruitment marketing': ['talent marketing', 'employer marketing', 'job advertising'],

    // ═══════════════════════════════════════════
    // HR & PEOPLE OPERATIONS
    // ═══════════════════════════════════════════
    'human resources': ['hr', 'people operations', 'people ops', 'hr management'],
    'employee relations': ['labor relations', 'er', 'workplace relations', 'employee advocacy'],
    'performance management': ['performance review', 'performance evaluation', 'performance coaching', 'performance appraisal'],
    'compensation': ['compensation and benefits', 'total rewards', 'comp and ben', 'pay', 'salary administration'],
    'benefits administration': ['benefits management', 'employee benefits', 'health benefits'],
    'employee engagement': ['engagement strategy', 'employee experience', 'employee satisfaction', 'culture'],
    'retention': ['employee retention', 'talent retention', 'attrition management'],
    'learning and development': ['l&d', 'training and development', 'talent development', 'corporate training'],
    'training': ['training and development', 'learning and development', 'corporate training', 'skills training'],
    'labor relations': ['employee relations', 'union relations', 'collective bargaining'],
    'hr analytics': ['people analytics', 'workforce analytics', 'hr data analysis'],
    'people analytics': ['hr analytics', 'workforce analytics', 'talent analytics'],
    'organizational culture': ['culture', 'company culture', 'cultural transformation'],

    // ═══════════════════════════════════════════
    // DATA & ANALYTICS
    // ═══════════════════════════════════════════
    'data analysis': ['data analytics', 'analytics', 'data-driven decision making', 'data examination'],
    'data analytics': ['data analysis', 'analytics', 'business analytics', 'data science'],
    'analytics': ['data analytics', 'data analysis', 'business analytics', 'reporting'],
    'data science': ['data analytics', 'machine learning', 'predictive analytics', 'statistical analysis'],
    'statistical analysis': ['statistics', 'statistical modeling', 'quantitative analysis', 'data science'],
    'predictive analytics': ['forecasting', 'predictive modeling', 'machine learning', 'data science'],
    'business intelligence': ['bi', 'reporting', 'dashboards', 'data visualization'],
    'data visualization': ['data viz', 'dashboard design', 'visual analytics', 'tableau', 'power bi'],
    'tableau': ['data visualization', 'visual analytics', 'bi tool'],
    'power bi': ['data visualization', 'microsoft bi', 'bi tool', 'business intelligence'],
    'excel': ['microsoft excel', 'spreadsheets', 'advanced excel', 'data manipulation'],
    'data engineering': ['data pipeline', 'etl', 'data infrastructure', 'data architecture'],
    'data architecture': ['data modeling', 'database design', 'data engineering'],
    'data governance': ['data management', 'data quality', 'master data management', 'data stewardship'],
    'data management': ['data governance', 'data operations', 'data quality'],
    'reporting': ['business reporting', 'management reporting', 'analytics', 'dashboards'],

    // ═══════════════════════════════════════════
    // MARKETING
    // ═══════════════════════════════════════════
    'marketing': ['marketing management', 'marketing strategy', 'brand marketing'],
    'marketing strategy': ['marketing planning', 'marketing management', 'strategic marketing'],
    'digital marketing': ['online marketing', 'internet marketing', 'digital advertising'],
    'content marketing': ['content strategy', 'content creation', 'content management'],
    'content strategy': ['content marketing', 'content planning', 'editorial strategy'],
    'brand management': ['brand strategy', 'branding', 'brand development', 'brand marketing'],
    'branding': ['brand management', 'brand strategy', 'brand identity', 'brand development'],
    'demand generation': ['demand gen', 'lead generation', 'pipeline generation', 'inbound marketing'],
    'lead generation': ['demand generation', 'pipeline generation', 'prospecting', 'lead management'],
    'marketing automation': ['martech', 'marketing technology', 'marketing ops'],
    'email marketing': ['email campaigns', 'email automation', 'crm marketing'],
    'social media marketing': ['social media', 'social media management', 'social strategy'],
    'social media': ['social media marketing', 'social media management', 'social platforms'],
    'product marketing': ['product positioning', 'product messaging', 'go-to-market'],
    'market segmentation': ['customer segmentation', 'audience segmentation', 'targeting'],
    'customer acquisition': ['customer growth', 'new customer acquisition', 'growth marketing'],
    'growth marketing': ['growth hacking', 'customer acquisition', 'performance marketing'],
    'performance marketing': ['paid media', 'digital advertising', 'paid acquisition'],
    'public relations': ['pr', 'media relations', 'communications', 'press relations'],
    'event management': ['event planning', 'conference management', 'event marketing'],
    'market positioning': ['competitive positioning', 'brand positioning', 'product positioning'],

    // ═══════════════════════════════════════════
    // SALES
    // ═══════════════════════════════════════════
    'sales': ['selling', 'sales management', 'revenue generation'],
    'sales strategy': ['sales planning', 'revenue strategy', 'go-to-market strategy'],
    'account management': ['client management', 'key account management', 'customer management'],
    'account executive': ['sales representative', 'sales professional', 'account manager'],
    'customer success': ['client success', 'customer retention', 'customer satisfaction'],
    'customer relationship': ['client relationship', 'customer management', 'relationship management'],
    'relationship management': ['client management', 'customer relationship', 'partner management'],
    'pipeline management': ['sales pipeline', 'opportunity management', 'deal management'],
    'sales forecasting': ['revenue forecasting', 'pipeline forecasting', 'quota planning'],
    'contract negotiation': ['deal negotiation', 'commercial negotiation', 'pricing negotiation'],
    'enterprise sales': ['b2b sales', 'complex sales', 'solution selling'],
    'solution selling': ['consultative selling', 'value selling', 'enterprise sales'],
    'consultative selling': ['solution selling', 'advisory selling', 'value-based selling'],
    'sales operations': ['sales ops', 'revenue operations', 'sales enablement'],
    'sales enablement': ['sales training', 'sales readiness', 'sales operations'],
    'territory management': ['territory planning', 'geographic management'],
    'quota attainment': ['quota management', 'target achievement', 'sales performance'],
    'customer retention': ['retention management', 'churn reduction', 'customer loyalty'],
    'upselling': ['cross-selling', 'expansion revenue', 'account expansion'],

    // ═══════════════════════════════════════════
    // TECHNOLOGY & ENGINEERING
    // ═══════════════════════════════════════════
    'software development': ['software engineering', 'programming', 'coding', 'application development'],
    'software engineering': ['software development', 'engineering', 'application development'],
    'programming': ['coding', 'software development', 'application development'],
    'system design': ['systems architecture', 'software architecture', 'technical design'],
    'software architecture': ['system design', 'solution architecture', 'technical architecture'],
    'cloud computing': ['cloud infrastructure', 'cloud services', 'cloud architecture', 'aws', 'azure', 'gcp'],
    'cloud architecture': ['cloud infrastructure', 'cloud design', 'cloud engineering'],
    'cybersecurity': ['information security', 'infosec', 'security', 'cyber security'],
    'information security': ['cybersecurity', 'data security', 'it security'],
    'machine learning': ['ml', 'statistical learning', 'deep learning', 'ai'],
    'deep learning': ['neural networks', 'machine learning', 'ai'],
    'agentic ai': ['ai agents', 'autonomous ai', 'agent-based ai', 'ai automation'],
    'ai strategy': ['ai adoption', 'ai transformation', 'ai implementation', 'ai roadmap'],
    'ai governance': ['responsible ai', 'ai ethics', 'ai compliance', 'ai risk'],
    'ai fluency': ['ai literacy', 'ai proficiency', 'ai competency'],
    'prompt engineering': ['prompt design', 'prompt crafting', 'prompt optimization'],
    'mlops': ['ml operations', 'machine learning operations', 'model deployment'],
    'generative ai': ['genai', 'gen ai', 'generative artificial intelligence'],
    'full-stack development': ['full stack', 'full-stack engineering', 'frontend and backend'],
    'frontend development': ['front-end', 'ui development', 'client-side development', 'react', 'angular', 'vue'],
    'backend development': ['back-end', 'server-side', 'api development', 'microservices'],
    'microservices': ['microservice architecture', 'distributed systems', 'service-oriented'],
    'agile': ['agile methodology', 'agile development', 'scrum', 'kanban'],
    'scrum': ['scrum methodology', 'agile scrum', 'sprint planning'],
    'kanban': ['kanban methodology', 'lean development', 'workflow management'],
    'git': ['version control', 'github', 'gitlab', 'source control'],
    'code review': ['peer review', 'code quality', 'pull request review'],
    'testing': ['software testing', 'quality assurance', 'test automation', 'qa'],
    'test automation': ['automated testing', 'selenium', 'cypress', 'test engineering'],
    'database management': ['dba', 'database administration', 'data management'],
    'networking': ['network engineering', 'network administration', 'tcp/ip'],
    'infrastructure': ['it infrastructure', 'systems administration', 'platform engineering'],
    'site reliability': ['sre', 'site reliability engineering', 'devops', 'platform engineering'],
    'technical leadership': ['tech lead', 'engineering leadership', 'technical management'],
    'solution architecture': ['solutions architect', 'enterprise architecture', 'technical architecture'],

    // ═══════════════════════════════════════════
    // OPERATIONS & SUPPLY CHAIN
    // ═══════════════════════════════════════════
    'operations': ['operations management', 'business operations', 'operational excellence'],
    'operations management': ['operations', 'operational leadership', 'business operations'],
    'process improvement': ['continuous improvement', 'lean', 'six sigma', 'process optimization', 'kaizen'],
    'lean': ['lean manufacturing', 'lean management', 'lean methodology', 'process improvement'],
    'six sigma': ['lean six sigma', 'process improvement', 'quality management'],
    'supply chain': ['supply chain management', 'scm', 'logistics', 'procurement'],
    'logistics': ['supply chain', 'distribution', 'transportation', 'warehousing'],
    'procurement': ['purchasing', 'sourcing', 'vendor management', 'supply chain'],
    'vendor management': ['vendor relations', 'supplier management', 'third-party management', 'procurement'],
    'quality management': ['quality control', 'quality assurance', 'tqm', 'quality improvement'],
    'inventory management': ['inventory control', 'stock management', 'warehouse management'],
    'manufacturing': ['production', 'manufacturing operations', 'production management'],
    'digital transformation': ['digital strategy', 'digitalization', 'technology transformation'],
    'automation': ['process automation', 'workflow automation', 'intelligent automation'],

    // ═══════════════════════════════════════════
    // PRODUCT MANAGEMENT
    // ═══════════════════════════════════════════
    'product management': ['product strategy', 'product development', 'product ownership', 'product leadership'],
    'product strategy': ['product vision', 'product roadmap', 'product management'],
    'product development': ['new product development', 'product management', 'product innovation'],
    'roadmap': ['product roadmap', 'technology roadmap', 'strategic roadmap'],
    'user research': ['ux research', 'customer research', 'user testing', 'usability research'],
    'user experience': ['ux', 'ux design', 'experience design', 'usability'],
    'product design': ['ux design', 'product ux', 'design thinking'],
    'design thinking': ['human-centered design', 'product design', 'innovation methodology'],
    'a/b testing': ['experimentation', 'split testing', 'conversion optimization'],
    'feature prioritization': ['backlog management', 'product prioritization', 'requirements management'],
    'customer discovery': ['market validation', 'user research', 'customer development'],
    'product analytics': ['product metrics', 'usage analytics', 'product intelligence'],
    'product-market fit': ['pmf', 'market fit', 'product validation'],

    // ═══════════════════════════════════════════
    // CUSTOMER & SERVICE
    // ═══════════════════════════════════════════
    'customer service': ['customer support', 'client service', 'customer care'],
    'customer experience': ['cx', 'customer journey', 'customer satisfaction'],
    'client management': ['account management', 'client relations', 'relationship management'],
    'customer insights': ['voice of customer', 'customer feedback', 'customer analytics'],
    'service delivery': ['service management', 'service operations', 'itil'],

    // ═══════════════════════════════════════════
    // LEGAL & REGULATORY
    // ═══════════════════════════════════════════
    'legal': ['legal affairs', 'legal management', 'general counsel'],
    'contracts': ['contract management', 'contract negotiation', 'contract law'],
    'intellectual property': ['ip', 'patent', 'trademark', 'ip management'],
    'regulatory affairs': ['regulatory compliance', 'government relations', 'policy'],
    'privacy': ['data privacy', 'gdpr', 'privacy compliance', 'information privacy'],
    'litigation': ['dispute resolution', 'legal proceedings', 'trial advocacy'],

    // ═══════════════════════════════════════════
    // HEALTHCARE & LIFE SCIENCES
    // ═══════════════════════════════════════════
    'clinical research': ['clinical trials', 'clinical studies', 'clinical development'],
    'patient care': ['clinical care', 'patient management', 'healthcare delivery'],
    'healthcare management': ['health administration', 'hospital management', 'health systems'],
    'pharmacy': ['pharmaceutical', 'pharmacology', 'drug development'],
    'medical devices': ['medtech', 'medical technology', 'biomedical engineering'],
    'public health': ['population health', 'epidemiology', 'health policy'],
    'hipaa': ['hipaa compliance', 'health data privacy', 'healthcare compliance'],

    // ═══════════════════════════════════════════
    // EDUCATION & TRAINING
    // ═══════════════════════════════════════════
    'curriculum development': ['instructional design', 'course development', 'program design'],
    'instructional design': ['curriculum development', 'learning design', 'e-learning design'],
    'teaching': ['instruction', 'education', 'pedagogy', 'classroom instruction'],
    'e-learning': ['online learning', 'digital learning', 'lms', 'virtual training'],
    'assessment': ['evaluation', 'testing', 'student assessment', 'competency assessment'],

    // ═══════════════════════════════════════════
    // GENERAL PROFESSIONAL SKILLS
    // ═══════════════════════════════════════════
    'communication': ['communications', 'written communication', 'verbal communication', 'business communication'],
    'collaboration': ['teamwork', 'team collaboration', 'cooperative work'],
    'teamwork': ['collaboration', 'team collaboration', 'cooperative work', 'team player'],
    'time management': ['time management skills', 'prioritization', 'scheduling', 'productivity'],
    'prioritization': ['time management', 'task prioritization', 'workload management'],
    'adaptability': ['flexibility', 'agility', 'resilience', 'change readiness'],
    'resilience': ['adaptability', 'stress management', 'perseverance'],
    'attention to detail': ['detail-oriented', 'meticulousness', 'quality focus', 'precision'],
    'multitasking': ['multi-tasking', 'task management', 'workload management'],
    'emotional intelligence': ['eq', 'empathy', 'interpersonal skills', 'self-awareness'],
    'interpersonal skills': ['people skills', 'relationship building', 'social skills'],
    'research': ['research and analysis', 'research skills', 'investigation'],
    'writing': ['written communication', 'business writing', 'content writing'],
    'presentation': ['presentation skills', 'public speaking', 'pitching'],
    'organization': ['organizational skills', 'planning', 'coordination'],
    'creativity': ['creative thinking', 'innovation', 'ideation'],
    'initiative': ['self-starter', 'proactive', 'self-directed'],
    'accountability': ['ownership', 'responsibility', 'results orientation'],
    // ═══════════════════════════════════════════
    // O*NET FORMAL ELEMENT NAMES → COMMON NAMES
    // These map O*NET's official taxonomy names to what humans actually write on profiles
    // ═══════════════════════════════════════════
    'management of personnel resources': ['people management', 'team management', 'staff management', 'human resources management', 'workforce management', 'team leadership'],
    'management of financial resources': ['financial management', 'budget management', 'budgeting', 'financial planning', 'fiscal management', 'finance'],
    'management of material resources': ['resource management', 'asset management', 'inventory management', 'supply management'],
    'persuasion': ['influence', 'influencing', 'stakeholder influence', 'sales', 'advocacy', 'negotiation'],
    'service orientation': ['customer focus', 'client service', 'customer service', 'customer experience', 'client orientation'],
    'systems evaluation': ['systems analysis', 'evaluation', 'assessment', 'system assessment', 'performance evaluation'],
    'systems analysis': ['systems evaluation', 'system design', 'requirements analysis', 'business analysis'],
    'complex problem solving': ['problem solving', 'problem-solving', 'troubleshooting', 'analytical thinking'],
    'judgment and decision making': ['decision making', 'decision-making', 'critical judgment', 'business judgment'],
    'operations analysis': ['operations management', 'process analysis', 'operational analysis', 'business analysis'],
    'technology design': ['system design', 'technical design', 'solution design', 'architecture'],
    'equipment selection': ['tool selection', 'technology selection', 'platform selection'],
    'installation': ['implementation', 'deployment', 'system installation', 'setup'],
    'operation monitoring': ['monitoring', 'performance monitoring', 'system monitoring', 'operations monitoring'],
    'operation and control': ['operations', 'system operation', 'process control'],
    'equipment maintenance': ['maintenance', 'system maintenance', 'preventive maintenance'],
    'troubleshooting': ['problem solving', 'debugging', 'root cause analysis', 'issue resolution'],
    'repairing': ['repair', 'maintenance', 'troubleshooting', 'fixing'],
    'quality control analysis': ['quality assurance', 'quality management', 'quality control', 'qa'],
    'science': ['scientific research', 'research methodology', 'scientific analysis'],
    'instructing': ['teaching', 'training', 'coaching', 'education', 'instruction'],
    'programming': ['coding', 'software development', 'software engineering', 'application development'],
    'mathematics': ['mathematical analysis', 'quantitative analysis', 'statistical analysis', 'math'],
    'active listening': ['listening', 'communication', 'empathy'],
    'speaking': ['verbal communication', 'oral communication', 'public speaking', 'presentation skills'],
    'reading comprehension': ['reading', 'comprehension', 'literacy', 'written comprehension'],
    'social perceptiveness': ['emotional intelligence', 'empathy', 'interpersonal skills', 'social awareness'],
    'coordination': ['collaboration', 'teamwork', 'cross-functional coordination', 'project coordination'],
    'time management': ['prioritization', 'task management', 'scheduling', 'workload management', 'productivity'],
    'learning strategies': ['learning agility', 'continuous learning', 'self-development'],
    'monitoring': ['oversight', 'supervision', 'performance monitoring', 'tracking'],
    'writing': ['written communication', 'business writing', 'technical writing', 'content writing'],
    // O*NET Knowledge domains → common names
    'administration and management': ['business administration', 'management', 'organizational management', 'business management'],
    'economics and accounting': ['economics', 'accounting', 'finance', 'fiscal management'],
    'sales and marketing': ['sales', 'marketing', 'business development', 'commercial strategy'],
    'customer and personal service': ['customer service', 'customer support', 'client management', 'customer experience'],
    'personnel and human resources': ['human resources', 'hr', 'talent management', 'people operations'],
    'production and processing': ['manufacturing', 'production management', 'operations', 'process management'],
    'computers and electronics': ['technology', 'it', 'computer science', 'information technology'],
    'engineering and technology': ['engineering', 'technology', 'technical systems'],
    'communications and media': ['communications', 'media', 'public relations', 'corporate communications'],
    'education and training': ['education', 'training', 'learning and development', 'instructional design'],
    'english language': ['english', 'language arts', 'communication', 'writing'],
    'law and government': ['legal', 'regulatory', 'compliance', 'government relations', 'policy'],
    'clerical': ['administrative', 'office management', 'administrative support'],
    'telecommunications': ['telecom', 'networking', 'communications technology'],
    'psychology': ['behavioral science', 'organizational psychology', 'behavioral analytics'],
    'sociology and anthropology': ['social science', 'cultural analysis', 'organizational behavior'],
    'therapy and counseling': ['counseling', 'coaching', 'mental health', 'employee assistance'],
    'biology': ['biological sciences', 'life sciences', 'biotechnology'],
    'chemistry': ['chemical science', 'materials science', 'laboratory science'],
    'food production': ['food science', 'culinary', 'food safety', 'food manufacturing'],
    'building and construction': ['construction', 'construction management', 'building trades'],
    'mechanical': ['mechanical engineering', 'mechanical systems', 'machinery'],
    'design': ['design thinking', 'visual design', 'creative design', 'product design'],
    'geography': ['geographic information systems', 'gis', 'spatial analysis'],
    'public safety and security': ['security', 'safety management', 'risk management', 'emergency management'],
    'transportation': ['logistics', 'supply chain', 'fleet management', 'transportation management']
};

// Build a fast lookup: lowercased name → array of synonym lowercased names
var _synonymLookup = {};
Object.keys(SKILL_SYNONYMS).forEach(function(key) {
    var lower = key.toLowerCase();
    if (!_synonymLookup[lower]) _synonymLookup[lower] = [];
    SKILL_SYNONYMS[key].forEach(function(syn) {
        var synLower = syn.toLowerCase();
        _synonymLookup[lower].push(synLower);
        // Bidirectional: also map synonym back to key
        if (!_synonymLookup[synLower]) _synonymLookup[synLower] = [];
        if (_synonymLookup[synLower].indexOf(lower) === -1) _synonymLookup[synLower].push(lower);
    });
});

// Get all known synonyms for a skill name (lowercased) — now includes stem matching
export function getSkillSynonyms(skillNameLower) {
    return getSkillSynonymsExpanded(skillNameLower);
}

// ── Stem matching utility ──
// Maps common suffixes to stems so "planning" matches "plan", "strategic" matches "strategy", etc.
var _stemPairs = [
    [/ing$/, ''], [/tion$/, 'te'], [/ment$/, ''], [/ness$/, ''],
    [/ity$/, ''], [/ive$/, ''], [/ous$/, ''], [/al$/, ''],
    [/ful$/, ''], [/ance$/, ''], [/ence$/, ''], [/ical$/, 'ic'],
    [/ies$/, 'y'], [/ying$/, 'y'], [/ating$/, 'ate'],
    [/izing$/, 'ize'], [/ising$/, 'ise']
];
// Explicit stem equivalences for common business/strategy terms
var _stemEquiv = {
    'planning': 'plan', 'plan': 'planning',
    'strategic': 'strategy', 'strategy': 'strategic',
    'management': 'manage', 'manage': 'management', 'managing': 'management',
    'development': 'develop', 'develop': 'development', 'developing': 'development',
    'analysis': 'analyze', 'analyze': 'analysis', 'analyzing': 'analysis', 'analytical': 'analysis',
    'leadership': 'lead', 'lead': 'leadership', 'leading': 'leadership',
    'communication': 'communicate', 'communicate': 'communication',
    'implementation': 'implement', 'implement': 'implementation', 'implementing': 'implementation',
    'optimization': 'optimize', 'optimize': 'optimization', 'optimizing': 'optimization',
    'transformation': 'transform', 'transform': 'transformation',
    'operations': 'operate', 'operate': 'operations', 'operational': 'operations',
    'consulting': 'consultant', 'consultant': 'consulting', 'consultative': 'consulting',
    'negotiation': 'negotiate', 'negotiate': 'negotiation', 'negotiating': 'negotiation',
    'presentation': 'present', 'presenting': 'presentation',
    'collaboration': 'collaborate', 'collaborate': 'collaboration', 'collaborative': 'collaboration',
    'administration': 'administer', 'administrative': 'administration',
    'engineering': 'engineer', 'engineer': 'engineering',
    'acquisition': 'acquire', 'acquiring': 'acquisition',
    'execution': 'execute', 'executing': 'execution',
    'innovation': 'innovate', 'innovating': 'innovation', 'innovative': 'innovation',
    'automation': 'automate', 'automating': 'automation',
    'integration': 'integrate', 'integrating': 'integration',
    'architecture': 'architect', 'architecting': 'architecture',
    'forecasting': 'forecast', 'forecast': 'forecasting',
    'budgeting': 'budget', 'budget': 'budgeting',
    'modeling': 'model', 'model': 'modeling',
    'reporting': 'report', 'report': 'reporting',
    'recruiting': 'recruit', 'recruitment': 'recruiting', 'recruiter': 'recruiting',
    'sourcing': 'source', 'source': 'sourcing',
    'coaching': 'coach', 'coach': 'coaching',
    'mentoring': 'mentor', 'mentor': 'mentoring',
    'auditing': 'audit', 'audit': 'auditing',
    'training': 'train', 'train': 'training',
    'designing': 'design', 'design': 'designing',
    'testing': 'test', 'test': 'testing',
    'selling': 'sales', 'sales': 'selling',
    'marketing': 'market', 'market': 'marketing',
    'compliance': 'comply', 'regulatory': 'regulation',
    'governance': 'govern', 'governing': 'governance',
    'advisory': 'advise', 'advising': 'advisory'
};

// Enhanced synonym lookup: checks synonym map + stem equivalences + ESCO category siblings
export function getSkillSynonymsExpanded(skillNameLower) {
    var results = (_synonymLookup[skillNameLower] || []).slice();
    // Add stem equivalences: for each word, check if stem form exists in synonym map
    var words = skillNameLower.split(/[\s\-\/&]+/);
    words.forEach(function(w) {
        var stem = _stemEquiv[w];
        if (stem) {
            // Try replacing the word with its stem equivalent in the full skill name
            var variant = skillNameLower.replace(w, stem);
            if (variant !== skillNameLower && results.indexOf(variant) === -1) {
                results.push(variant);
            }
            // Also check if the stem variant has synonyms
            var stemSyns = _synonymLookup[variant] || [];
            stemSyns.forEach(function(ss) {
                if (results.indexOf(ss) === -1) results.push(ss);
            });
        }
    });
    // Add ESCO category siblings (skills in the same ESCO subcategory)
    var siblings = getEscoCategorySiblings(skillNameLower);
    siblings.forEach(function(sib) {
        if (results.indexOf(sib) === -1) results.push(sib);
    });
    return results;
}

// ===== ROLE-TO-SKILL MAPPING =====
// Expected skills for common roles with typical proficiency levels
var ROLE_SKILL_MAP = {
    'recruiter': [
        { name: 'Applicant Tracking System', level: 'Proficient' }, { name: 'Full-Cycle Recruiting', level: 'Proficient' },
        { name: 'Boolean Search', level: 'Proficient' }, { name: 'Sourcing', level: 'Expert' },
        { name: 'Candidate Experience', level: 'Proficient' }, { name: 'Interviewing', level: 'Expert' },
        { name: 'Offer Negotiation', level: 'Proficient' }, { name: 'Employer Branding', level: 'Competent' },
        { name: 'Diversity Recruiting', level: 'Competent' }, { name: 'Talent Pipeline', level: 'Proficient' },
        { name: 'Screening', level: 'Expert' }, { name: 'Stakeholder Management', level: 'Proficient' },
        { name: 'Recruitment Marketing', level: 'Competent' }, { name: 'Workforce Planning', level: 'Competent' }
    ],
    'talent acquisition': [
        { name: 'Applicant Tracking System', level: 'Expert' }, { name: 'Full-Cycle Recruiting', level: 'Expert' },
        { name: 'Sourcing', level: 'Expert' }, { name: 'Boolean Search', level: 'Proficient' },
        { name: 'Employer Branding', level: 'Proficient' }, { name: 'Workforce Planning', level: 'Proficient' },
        { name: 'Diversity Recruiting', level: 'Proficient' }, { name: 'Talent Pipeline', level: 'Expert' },
        { name: 'Stakeholder Management', level: 'Expert' }, { name: 'Data Analysis', level: 'Competent' },
        { name: 'Recruitment Marketing', level: 'Proficient' }, { name: 'Vendor Management', level: 'Competent' }
    ],
    'product manager': [
        { name: 'Product Management', level: 'Expert' }, { name: 'Roadmap', level: 'Expert' },
        { name: 'A/B Testing', level: 'Proficient' }, { name: 'User Research', level: 'Proficient' },
        { name: 'Data Analysis', level: 'Proficient' }, { name: 'Stakeholder Management', level: 'Expert' },
        { name: 'Go-to-Market', level: 'Proficient' }, { name: 'Agile', level: 'Expert' },
        { name: 'Strategic Planning', level: 'Proficient' }, { name: 'Cross-Functional Collaboration', level: 'Expert' },
        { name: 'JIRA', level: 'Proficient' }, { name: 'SQL', level: 'Competent' }
    ],
    'software engineer': [
        { name: 'System Design', level: 'Proficient' }, { name: 'API Design', level: 'Proficient' },
        { name: 'CI/CD', level: 'Proficient' }, { name: 'Git', level: 'Expert' },
        { name: 'Code Review', level: 'Proficient' }, { name: 'Testing', level: 'Proficient' },
        { name: 'Agile', level: 'Proficient' }, { name: 'Problem Solving', level: 'Expert' },
        { name: 'Technical Writing', level: 'Competent' }, { name: 'Cloud Computing', level: 'Competent' }
    ],
    'data analyst': [
        { name: 'SQL', level: 'Expert' }, { name: 'Excel', level: 'Expert' },
        { name: 'Data Analysis', level: 'Expert' }, { name: 'Tableau', level: 'Proficient' },
        { name: 'Python', level: 'Competent' }, { name: 'Reporting', level: 'Expert' },
        { name: 'Business Intelligence', level: 'Proficient' }, { name: 'Dashboards', level: 'Proficient' },
        { name: 'Forecasting', level: 'Competent' }, { name: 'Presentation', level: 'Proficient' }
    ],
    'marketing manager': [
        { name: 'Content Marketing', level: 'Expert' }, { name: 'SEO', level: 'Proficient' },
        { name: 'Social Media', level: 'Expert' }, { name: 'Email Marketing', level: 'Proficient' },
        { name: 'Brand Strategy', level: 'Expert' }, { name: 'Marketing Automation', level: 'Proficient' },
        { name: 'Data Analysis', level: 'Competent' }, { name: 'CRM', level: 'Proficient' },
        { name: 'Demand Generation', level: 'Proficient' }, { name: 'Budgeting', level: 'Proficient' }
    ],
    'hr': [
        { name: 'Human Resources', level: 'Expert' }, { name: 'Employee Relations', level: 'Proficient' },
        { name: 'Performance Management', level: 'Proficient' }, { name: 'Compensation', level: 'Proficient' },
        { name: 'HRIS', level: 'Proficient' }, { name: 'Compliance', level: 'Proficient' },
        { name: 'Succession Planning', level: 'Competent' }, { name: 'Employee Engagement', level: 'Proficient' },
        { name: 'Training and Development', level: 'Competent' }, { name: 'Change Management', level: 'Competent' }
    ],
    'strategy': [
        { name: 'Strategic Planning', level: 'Expert' }, { name: 'Business Strategy', level: 'Expert' },
        { name: 'Competitive Analysis', level: 'Expert' }, { name: 'Market Analysis', level: 'Expert' },
        { name: 'Financial Analysis', level: 'Proficient' }, { name: 'Stakeholder Management', level: 'Expert' },
        { name: 'Change Management', level: 'Proficient' }, { name: 'Presentation', level: 'Expert' },
        { name: 'Data Analysis', level: 'Proficient' }, { name: 'Innovation', level: 'Expert' }
    ],
    'sales': [
        { name: 'Sales Strategy', level: 'Expert' }, { name: 'Pipeline Management', level: 'Expert' },
        { name: 'CRM', level: 'Expert' }, { name: 'Negotiation', level: 'Expert' },
        { name: 'Account Management', level: 'Proficient' }, { name: 'Client Relations', level: 'Expert' },
        { name: 'Revenue Growth', level: 'Proficient' }, { name: 'Presentation', level: 'Proficient' },
        { name: 'Forecasting', level: 'Proficient' }, { name: 'Business Development', level: 'Proficient' }
    ],
    'project manager': [
        { name: 'Project Management', level: 'Expert' }, { name: 'Agile', level: 'Expert' },
        { name: 'Stakeholder Management', level: 'Expert' }, { name: 'Risk Management', level: 'Proficient' },
        { name: 'Budgeting', level: 'Proficient' }, { name: 'JIRA', level: 'Expert' },
        { name: 'Change Management', level: 'Proficient' }, { name: 'Process Improvement', level: 'Proficient' },
        { name: 'Cross-Functional Collaboration', level: 'Expert' }, { name: 'Communication', level: 'Expert' }
    ],
    'ux designer': [
        { name: 'UX Design', level: 'Expert' }, { name: 'User Research', level: 'Expert' },
        { name: 'Wireframing', level: 'Expert' }, { name: 'Prototyping', level: 'Expert' },
        { name: 'Usability Testing', level: 'Proficient' }, { name: 'Design Systems', level: 'Proficient' },
        { name: 'Figma', level: 'Expert' }, { name: 'Accessibility', level: 'Proficient' },
        { name: 'Information Architecture', level: 'Proficient' }, { name: 'Interaction Design', level: 'Expert' }
    ],
    'customer success': [
        { name: 'Customer Success', level: 'Expert' }, { name: 'Account Management', level: 'Expert' },
        { name: 'CRM', level: 'Proficient' }, { name: 'Client Relations', level: 'Expert' },
        { name: 'Onboarding', level: 'Proficient' }, { name: 'Data Analysis', level: 'Competent' },
        { name: 'Presentation', level: 'Proficient' }, { name: 'Negotiation', level: 'Proficient' },
        { name: 'Process Improvement', level: 'Competent' }, { name: 'Cross-Functional Collaboration', level: 'Proficient' }
    ],
    'operations': [
        { name: 'Process Improvement', level: 'Expert' }, { name: 'Project Management', level: 'Proficient' },
        { name: 'Data Analysis', level: 'Proficient' }, { name: 'Budgeting', level: 'Proficient' },
        { name: 'Vendor Management', level: 'Expert' }, { name: 'Risk Management', level: 'Proficient' },
        { name: 'Compliance', level: 'Proficient' }, { name: 'Strategic Planning', level: 'Proficient' },
        { name: 'Change Management', level: 'Proficient' }, { name: 'Reporting', level: 'Expert' }
    ],
    'executive': [
        { name: 'Strategic Planning', level: 'Mastery' }, { name: 'Executive Presence', level: 'Expert' },
        { name: 'Stakeholder Management', level: 'Mastery' }, { name: 'Change Management', level: 'Expert' },
        { name: 'P&L Management', level: 'Expert' }, { name: 'Board Relations', level: 'Proficient' },
        { name: 'Cross-Functional Collaboration', level: 'Expert' }, { name: 'Innovation', level: 'Expert' },
        { name: 'Talent Development', level: 'Expert' }, { name: 'Business Strategy', level: 'Mastery' }
    ],
    'futurist': [
        { name: 'Strategic Planning', level: 'Mastery' }, { name: 'Innovation', level: 'Mastery' },
        { name: 'Thought Leadership', level: 'Expert' }, { name: 'Market Research', level: 'Expert' },
        { name: 'Data Analysis', level: 'Proficient' }, { name: 'Public Speaking', level: 'Expert' },
        { name: 'Storytelling', level: 'Expert' }, { name: 'Digital Transformation', level: 'Expert' },
        { name: 'Competitive Analysis', level: 'Expert' }, { name: 'Presentation', level: 'Expert' }
    ],
    'content': [
        { name: 'Content Marketing', level: 'Expert' }, { name: 'Copywriting', level: 'Expert' },
        { name: 'SEO', level: 'Proficient' }, { name: 'Storytelling', level: 'Expert' },
        { name: 'Social Media', level: 'Proficient' }, { name: 'Brand Strategy', level: 'Proficient' },
        { name: 'Data Analysis', level: 'Competent' }, { name: 'Email Marketing', level: 'Proficient' },
        { name: 'Content Marketing', level: 'Expert' }, { name: 'Technical Writing', level: 'Competent' }
    ],
    'general manager': [
        { name: 'P&L Management', level: 'Expert' }, { name: 'Strategic Planning', level: 'Expert' },
        { name: 'Team Leadership', level: 'Expert' }, { name: 'Budgeting', level: 'Expert' },
        { name: 'Stakeholder Management', level: 'Expert' }, { name: 'Cross-Functional Collaboration', level: 'Expert' },
        { name: 'Business Development', level: 'Proficient' }, { name: 'Change Management', level: 'Proficient' },
        { name: 'Data Analysis', level: 'Proficient' }, { name: 'Vendor Management', level: 'Proficient' }
    ]
};

// Get suggested skills for a user based on their roles
export function getRoleSuggestions() {
    var userRoles = window._userData.roles || [];
    var userSkillNames = new Set((_sd().skills || []).map(function(s) { return s.name.toLowerCase(); }));
    // Also build synonym-aware set
    var userSkillSynonyms = new Set();
    userSkillNames.forEach(function(n) {
        userSkillSynonyms.add(n);
        getSkillSynonyms(n).forEach(function(syn) { userSkillSynonyms.add(syn); });
    });
    
    var suggestions = [];
    var seen = new Set();
    
    // Role-name-to-map-key matching with keyword fallbacks
    var ROLE_KEYWORDS = {
        'recruiter': ['recruit', 'sourcing', 'talent acquisition'],
        'talent acquisition': ['talent acquisition', 'ta ', 'recruiting lead', 'head of recruiting'],
        'product manager': ['product', 'pm'],
        'software engineer': ['engineer', 'developer', 'programmer', 'coder'],
        'data analyst': ['data analyst', 'analytics', 'business analyst'],
        'marketing manager': ['marketing', 'growth', 'demand gen'],
        'hr': ['human resource', 'people operations', 'people ops', 'hrbp'],
        'strategy': ['strateg', 'futur', 'advisory', 'consulting'],
        'sales': ['sales', 'revenue', 'business development', 'account executive'],
        'project manager': ['project manager', 'program manager', 'delivery manager'],
        'ux designer': ['ux', 'design', 'user experience'],
        'customer success': ['customer success', 'client success', 'csm'],
        'operations': ['operations', 'ops', 'supply chain'],
        'executive': ['executive', 'vp ', 'vice president', 'chief', 'c-suite', 'general manager', 'gm'],
        'futurist': ['futurist', 'thought leader', 'evangelist'],
        'content': ['content', 'copywrite', 'editorial'],
        'general manager': ['general manager', 'gm', 'country manager', 'regional manager']
    };
    
    userRoles.forEach(function(role) {
        var roleName = role.name.toLowerCase();
        
        // Try exact/partial match first
        var mapKey = Object.keys(ROLE_SKILL_MAP).find(function(k) {
            return roleName.indexOf(k) !== -1 || k.indexOf(roleName) !== -1;
        });
        
        // Try keyword fallback
        if (!mapKey) {
            mapKey = Object.keys(ROLE_KEYWORDS).find(function(k) {
                return ROLE_KEYWORDS[k].some(function(kw) { return roleName.indexOf(kw) !== -1; });
            });
        }
        
        if (!mapKey || !ROLE_SKILL_MAP[mapKey]) return;
        
        ROLE_SKILL_MAP[mapKey].forEach(function(suggested) {
            var lower = suggested.name.toLowerCase();
            // Check both direct name AND synonyms to avoid suggesting skills the user already has under a different name
            if (!userSkillSynonyms.has(lower) && !seen.has(lower)) {
                seen.add(lower);
                suggestions.push({
                    name: suggested.name,
                    level: suggested.level,
                    reason: role.name,
                    roleId: role.id
                });
            }
        });
    });
    
    return suggestions;
}

// ===== JOB SCHEMA v2.0 — MIGRATION & VALIDATION =====
// Standards-aligned: Schema.org JobPosting + JDX JobSchema+ + O*NET-SOC

export function isJobV2(job) {
    return job && job.schemaVersion === JOB_SCHEMA_VERSION && job.requirements && Array.isArray(job.requirements.skills);
}

// Get the matchable skills array from any job format (v2 or legacy)
export function getJobSkills(job) {
    if (isJobV2(job)) return job.requirements.skills;
    return job.parsedSkills || [];
}

// Get roles from any job format
export function getJobRoles(job) {
    if (isJobV2(job)) return []; // v2 uses titleRole/occupationalCategory instead
    return job.parsedRoles || [];
}

// Normalize tier values from various legacy formats to v2 canonical
export function normalizeTier(val) {
    if (!val) return 'required';
    var v = val.toLowerCase().trim();
    if (v === 'required' || v === 'must have' || v === 'essential' || v === 'mandatory') return 'required';
    if (v === 'preferred' || v === 'desired' || v === 'recommended' || v === 'strongly preferred') return 'preferred';
    if (v === 'nice-to-have' || v === 'nice to have' || v === 'plus' || v === 'bonus') return 'nice-to-have';
    return 'required'; // default
}

// Map v2 tier to matcher weight
export function tierWeight(tier) {
    if (tier === 'required' || tier === 'Required') return 3;
    if (tier === 'preferred' || tier === 'Preferred') return 2;
    return 1; // nice-to-have, Nice-to-have, or fallback
}

// Migrate a legacy job to v2 schema. Non-destructive: preserves old fields.
export function migrateJobToV2(oldJob) {
    if (isJobV2(oldJob)) return oldJob; // Already v2
    
    // Build v2 skill objects from legacy parsedSkills
    var v2Skills = (oldJob.parsedSkills || []).map(function(s) {
        var name = typeof s === 'string' ? s : (s.name || s.skill || '');
        if (!name) return null;
        var isObj = typeof s === 'object' && s !== null;
        
        // Map legacy requirement/level → v2 tier
        var legacyReq = isObj ? (s.requirement || s.level || '') : '';
        var tier = normalizeTier(legacyReq);
        
        return {
            name: name,
            canonical: name.toLowerCase().replace(/\s+/g, ' ').trim(),
            abbreviation: null,
            tier: tier,
            proficiency: (isObj && s.proficiency) || 'Proficient',
            category: (isObj && s.category) || 'technical',
            section: null,
            context: null,
            source: 'extracted',
            confidence: 0.4,  // Legacy local parse = low confidence
            frameworkRef: null
        };
    }).filter(Boolean);
    
    // Build compensation from BLS data
    var comp = {
        baseSalary: { currency: 'USD', value: { minValue: null, maxValue: null, unitText: 'YEAR' } },
        estimatedSalary: null,
        incentiveCompensation: null,
        equity: null,
        jobBenefits: [],
        source: null
    };
    if (oldJob.blsSalary && oldJob.blsSalary.median) {
        comp.baseSalary.value.minValue = oldJob.blsSalary.pct25 || oldJob.blsSalary.pct10 || null;
        comp.baseSalary.value.maxValue = oldJob.blsSalary.pct75 || oldJob.blsSalary.pct90 || null;
        comp.estimatedSalary = oldJob.blsSalary.median;
        comp.source = 'estimated';
    }
    
    // Merge v2 structure onto the existing job object (preserves legacy fields for safety)
    oldJob.schemaVersion = JOB_SCHEMA_VERSION;
    oldJob.hiringOrganization = oldJob.hiringOrganization || {
        name: oldJob.company || '',
        sameAs: null,
        industry: '',
        size: ''
    };
    oldJob.titleRole = null;
    oldJob.titleLevel = oldJob.seniority ? oldJob.seniority.toLowerCase() : null;
    oldJob.occupationalCategory = null;
    oldJob.jobLocation = oldJob.jobLocation || {
        primary: oldJob.location || '',
        address: { locality: null, region: null, country: null },
        locationType: null,
        remote: oldJob.remote || null,
        remoteDetail: ''
    };
    oldJob.employmentType = oldJob.employmentType || null;
    oldJob.department = null;
    if (!oldJob.postingMeta) {
        oldJob.postingMeta = {
            sourceUrl: oldJob.sourceUrl || oldJob.url || '',
            sourceNote: oldJob.sourceNote || '',
            datePosted: null,
            validThrough: null,
            externalId: '',
            ingestedAt: oldJob.addedAt || oldJob.savedAt || new Date().toISOString(),
            ingestMethod: 'local',
            rawTextHash: null
        };
    }
    oldJob.requirements = oldJob.requirements || {
        skills: v2Skills,
        qualifications: [],
        responsibilities: []
    };
    oldJob.compensation = oldJob.compensation || comp;
    oldJob.companyContext = oldJob.companyContext || {
        values: { primary: [], secondary: [], source: 'jd' },
        culture: [],
        employerOverview: null
    };
    oldJob.raw = oldJob.raw || {
        text: (oldJob.rawText || '').substring(0, 8000),
        sections: []
    };
    if (!oldJob.pipeline) {
        oldJob.pipeline = {
            status: oldJob.status || 'active',
            addedAt: oldJob.addedAt || oldJob.savedAt || new Date().toISOString(),
            appliedAt: null,
            notes: oldJob.notes || '',
            tags: oldJob.tags || []
        };
    }
    
    return oldJob;
}

// Migrate all saved jobs on load. Returns count of jobs migrated.
export function migrateAllJobsToV2() {
    var jobs = window._userData.savedJobs || [];
    var migrated = 0;
    for (var i = 0; i < jobs.length; i++) {
        if (!isJobV2(jobs[i])) {
            jobs[i] = migrateJobToV2(jobs[i]);
            migrated++;
        }
    }
    if (migrated > 0) {
        console.log('[JOB SCHEMA] Migrated ' + migrated + ' job(s) to v2.0');
    }
    return migrated;
}

// Validate v2 job schema (runtime shape check, not strict validation)
export function validateJobSchema(job) {
    var issues = [];
    if (!job) { issues.push('Job is null/undefined'); return issues; }
    if (job.schemaVersion !== JOB_SCHEMA_VERSION) issues.push('schemaVersion mismatch: ' + (job.schemaVersion || 'missing'));
    if (!job.title) issues.push('Missing title');
    if (!job.requirements) issues.push('Missing requirements section');
    if (job.requirements && !Array.isArray(job.requirements.skills)) issues.push('requirements.skills is not an array');
    if (job.requirements && job.requirements.skills) {
        job.requirements.skills.forEach(function(s, i) {
            if (!s.name) issues.push('Skill [' + i + '] missing name');
            if (!s.canonical) issues.push('Skill [' + i + '] missing canonical');
            if (!s.tier) issues.push('Skill [' + i + '] missing tier');
        });
    }
    return issues;
}

// ===== MATCH CALCULATION =====

export function matchJobToProfile(parsed) {
    // v2 support: accept either { skills: [...] } or a raw skills array
    var rawSkills = Array.isArray(parsed) ? parsed : (parsed.skills || []);
    // Normalize: support string arrays, legacy objects, and v2 objects
    var jobSkills = rawSkills.map(function(s) {
        if (typeof s === 'string') return { name: s, requirement: 'Required', tier: 'required' };
        // Ensure both .requirement (legacy renderer) and .tier (v2) exist
        if (s.tier && !s.requirement) s.requirement = s.tier === 'required' ? 'Required' : s.tier === 'preferred' ? 'Preferred' : 'Nice-to-have';
        if (s.requirement && !s.tier) s.tier = normalizeTier(s.requirement);
        if (!s.tier) s.tier = 'required';
        if (!s.requirement) s.requirement = 'Required';
        return s;
    }).filter(function(s) { return s && s.name; });
    var userSkills = _sd().skills || [];
    
    // Build lookup of user's skills (lowercase → skill object)
    // Include synonym variants for fuzzy matching
    var userMap = {};
    var userNameIndex = []; // for word-overlap search
    userSkills.forEach(function(s) {
        var lower = s.name.toLowerCase();
        userMap[lower] = s;
        userNameIndex.push({ lower: lower, skill: s, words: lower.split(/[\s\-\/&]+/).filter(function(w) { return w.length > 2; }) });
        // Also add simplified versions (strip extra spaces, ampersands)
        var simplified = lower.replace(/\s*&\s*/g, ' ').replace(/\s+/g, ' ').trim();
        if (simplified !== lower) userMap[simplified] = s;
        // Register all known synonyms
        var synonyms = getSkillSynonyms(lower);
        synonyms.forEach(function(syn) {
            if (!userMap[syn]) userMap[syn] = s;
        });
    });
    
    var matched = [];
    var gaps = [];
    var matchedUserSkills = new Set();
    var totalWeight = 0;
    var earnedWeight = 0;
    
    jobSkills.forEach(function(jobSkill) {
        // v2: use tier for weight; legacy: use requirement/level
        var requirement = jobSkill.requirement || jobSkill.level || 'Required';
        var reqWeight = tierWeight(jobSkill.tier || requirement);
        totalWeight += reqWeight;
        
        // Job's demanded proficiency (default Proficient if not specified)
        var jobProf = proficiencyValue(jobSkill.proficiency || 'Proficient');
        
        var jLower = jobSkill.name.toLowerCase();
        var jWords = jLower.split(/[\s\-\/&]+/).filter(function(w) { return w.length > 2; });
        var found = null;
        var nameMatchQuality = 0;
        var matchType = 'exact';
        
        // 1. Exact match
        if (userMap[jLower]) {
            found = userMap[jLower];
            nameMatchQuality = 1.0;
        }
        
        // 1b. Synonym match: check all synonyms of the job skill
        if (!found) {
            var jobSynonyms = getSkillSynonyms(jLower);
            for (var si = 0; si < jobSynonyms.length; si++) {
                if (userMap[jobSynonyms[si]]) {
                    found = userMap[jobSynonyms[si]];
                    nameMatchQuality = 0.95; // near-exact via synonym
                    break;
                }
            }
        }
        
        // 2. Substring containment (one contains the other)
        if (!found) {
            for (var key in userMap) {
                if (key.length > 3 && (jLower.indexOf(key) !== -1 || key.indexOf(jLower) !== -1)) {
                    found = userMap[key];
                    nameMatchQuality = 0.92;
                    break;
                }
            }
        }
        
        // 3. Word overlap: 50%+ of words match
        if (!found && jWords.length > 0) {
            var bestOverlap = 0;
            var bestSkill = null;
            userNameIndex.forEach(function(entry) {
                var overlap = 0;
                jWords.forEach(function(jw) {
                    if (entry.words.some(function(uw) {
                        if (uw === jw) return true;
                        if (uw.length > 4 && (uw.indexOf(jw) !== -1 || jw.indexOf(uw) !== -1)) return true;
                        var jwStem = _stemEquiv[jw];
                        var uwStem = _stemEquiv[uw];
                        if (jwStem && (jwStem === uw || jwStem === uwStem)) return true;
                        if (uwStem && uwStem === jw) return true;
                        return false;
                    })) overlap++;
                });
                var score = overlap / Math.max(jWords.length, 1);
                if (score > bestOverlap && score >= 0.5) {
                    bestOverlap = score;
                    bestSkill = entry.skill;
                }
            });
            if (bestSkill) {
                found = bestSkill;
                nameMatchQuality = Math.max(0.82, bestOverlap * 0.88);
            }
        }
        
        // 4. ESCO category sibling: user has a related skill at Advanced+ in same subcategory
        if (!found && typeof getEscoCategorySiblings === 'function') {
            var siblings = getEscoCategorySiblings(jLower);
            
            // If exact name not in bridge, try fuzzy subcategory resolution
            if (siblings.length === 0 && _escoSkillToSubcategory) {
                var keys = Object.keys(_escoSkillToSubcategory);
                for (var ki = 0; ki < keys.length; ki++) {
                    if (keys[ki].length > 5 && (jLower.indexOf(keys[ki]) !== -1 || keys[ki].indexOf(jLower) !== -1)) {
                        siblings = getEscoCategorySiblings(keys[ki]);
                        if (siblings.length > 0) break;
                    }
                }
            }
            if (siblings.length > 0) {
                var siblingSet = new Set(siblings);
                var bestSibling = null;
                var bestSibLevel = 0;
                userSkills.forEach(function(us) {
                    var usLower = us.name.toLowerCase();
                    if (siblingSet.has(usLower) || siblings.some(function(sib) {
                        return usLower.indexOf(sib) !== -1 || sib.indexOf(usLower) !== -1;
                    })) {
                        var usProf = proficiencyValue(us.level);
                        // Only count Advanced+ as a sibling coverage
                        if (usProf >= 3 && usProf > bestSibLevel) {
                            bestSibling = us;
                            bestSibLevel = usProf;
                        }
                    }
                });
                if (bestSibling) {
                    found = bestSibling;
                    nameMatchQuality = 0.78; // Related skill in same ESCO subcategory
                    matchType = 'sibling';
                }
            }
        }
        
        // 5. Concept-root matching: decompose gap skill into stems, find user skills sharing roots
        if (!found && jWords.length > 0) {
            // Get stem roots for the job skill words
            var jRoots = jWords.map(function(w) { return _stemEquiv[w] || w; });
            // Also add the raw words as roots
            jWords.forEach(function(w) { if (jRoots.indexOf(w) === -1) jRoots.push(w); });
            
            var bestRootMatch = null;
            var bestRootScore = 0;
            
            userSkills.forEach(function(us) {
                var usProf = proficiencyValue(us.level);
                if (usProf < 3) return; // Only Advanced+ can cover via concept roots
                
                var usLower = us.name.toLowerCase();
                var usWords = usLower.split(/[\s\-\/&]+/).filter(function(w) { return w.length > 2; });
                var usRoots = usWords.map(function(w) { return _stemEquiv[w] || w; });
                usWords.forEach(function(w) { if (usRoots.indexOf(w) === -1) usRoots.push(w); });
                
                // Count how many job skill roots appear in user skill roots
                var rootHits = 0;
                jRoots.forEach(function(jr) {
                    if (usRoots.some(function(ur) {
                        if (ur === jr) return true;
                        // Partial stem overlap for longer words (e.g., "analyt" in "analysis")
                        if (ur.length >= 5 && jr.length >= 5) {
                            var shorter = ur.length < jr.length ? ur : jr;
                            var longer = ur.length >= jr.length ? ur : jr;
                            if (shorter.length >= 5 && longer.indexOf(shorter.substring(0, 5)) === 0) return true;
                        }
                        return false;
                    })) rootHits++;
                });
                
                var rootScore = jRoots.length > 0 ? rootHits / jRoots.length : 0;
                // Need at least one significant root match, and score > 0.4 for multi-word
                var threshold = jRoots.length === 1 ? 1.0 : 0.4;
                if (rootHits > 0 && rootScore >= threshold && rootScore > bestRootScore) {
                    // Prefer higher proficiency user skills
                    if (!bestRootMatch || usProf > proficiencyValue(bestRootMatch.level)) {
                        bestRootMatch = us;
                        bestRootScore = rootScore;
                    }
                }
            });
            
            if (bestRootMatch) {
                found = bestRootMatch;
                nameMatchQuality = Math.max(0.70, 0.75 * bestRootScore); // Concept-root: moderate credit
                matchType = 'concept';
            }
        }
        
        // 6. Seniority implication: Executive/Senior with domain expertise implies operational skills
        if (!found) {
            var userSeniority = '';
            var userRoles = (window._userData.roles || []);
            if (userRoles.some(function(r) { return /vp|vice|chief|president|executive|director|founder|ceo|cto|cfo|coo|gm|general manager/i.test(r.name); })) {
                userSeniority = 'Executive';
            } else if (userRoles.some(function(r) { return /senior|principal|lead|head/i.test(r.name); })) {
                userSeniority = 'Senior';
            }
            
            if (userSeniority === 'Executive' || userSeniority === 'Senior') {
                // Infer broad domain of gap skill from ESCO bridge or keywords
                var gapDomain = '';
                if (_escoSkillToSubcategory && _escoSkillToSubcategory[jLower]) {
                    gapDomain = (_escoSkillToSubcategory[jLower] || '').split(/[\/\-:]/)[0].trim().toLowerCase();
                }
                
                // Keyword-based domain inference when bridge doesn't have it
                if (!gapDomain) {
                    var domainKeywords = {
                        'business': /\b(business|commercial|market|revenue|growth|profit|acumen|awareness|development|venture)\b/i,
                        'finance': /\b(financ|budget|cost|pricing|revenue|p&l|accounting|treasury|audit|due diligence|valuation)\b/i,
                        'analytics': /\b(analy|report|metric|data|benchmark|dashboard|insight|forecast|model|statistic)\b/i,
                        'strategy': /\b(strateg|planning|roadmap|vision|transformation|innovation|consulting)\b/i,
                        'management': /\b(manag|leadership|coordination|administration|governance|operations|oversight)\b/i,
                        'hr': /\b(talent|recruit|career|workforce|employee|personnel|succession|retention|onboard)\b/i,
                        'technology': /\b(software|engineer|architect|devops|cloud|infrastructure|security|system)\b/i,
                        'marketing': /\b(marketing|brand|content|campaign|digital|seo|social media|advertising|creative)\b/i
                    };
                    var skillText = jobSkill.name;
                    Object.keys(domainKeywords).forEach(function(domain) {
                        if (!gapDomain && domainKeywords[domain].test(skillText)) {
                            gapDomain = domain;
                        }
                    });
                }
                
                if (gapDomain) {
                    var bestImplied = null;
                    var bestImpliedProf = 0;
                    var minProf = userSeniority === 'Executive' ? 4 : 5; // Expert for Exec, Mastery for Senior
                    
                    userSkills.forEach(function(us) {
                        var usProf = proficiencyValue(us.level);
                        if (usProf < minProf) return;
                        
                        var usLower = us.name.toLowerCase();
                        
                        // Check if user skill is in same domain via ESCO bridge
                        var usDomain = '';
                        if (_escoSkillToSubcategory && _escoSkillToSubcategory[usLower]) {
                            usDomain = (_escoSkillToSubcategory[usLower] || '').split(/[\/\-:]/)[0].trim().toLowerCase();
                        }
                        // Also check via keyword inference on user skill name
                        if (!usDomain) {
                            var domainKeywords2 = {
                                'business': /\b(business|commercial|market|revenue|growth|profit|strategy|competitive)\b/i,
                                'finance': /\b(financ|budget|cost|pricing|p&l|accounting|treasury|audit)\b/i,
                                'analytics': /\b(analy|report|metric|data|benchmark|evaluat|assessment|research)\b/i,
                                'strategy': /\b(strateg|planning|roadmap|vision|go.to.market|transformation|innovation)\b/i,
                                'management': /\b(manag|leadership|coordination|administration|governance|operations)\b/i,
                                'hr': /\b(talent|recruit|career|workforce|employee|personnel|training|human)\b/i,
                                'technology': /\b(software|engineer|architect|devops|cloud|infrastructure|security)\b/i,
                                'marketing': /\b(marketing|brand|content|campaign|digital|seo|creative|design)\b/i
                            };
                            Object.keys(domainKeywords2).forEach(function(domain) {
                                if (!usDomain && domainKeywords2[domain].test(us.name)) {
                                    usDomain = domain;
                                }
                            });
                        }
                        
                        if (usDomain && usDomain === gapDomain && usProf > bestImpliedProf) {
                            bestImplied = us;
                            bestImpliedProf = usProf;
                        }
                    });
                    
                    if (bestImplied) {
                        found = bestImplied;
                        nameMatchQuality = 0.62; // Seniority-implied: moderate credit
                        matchType = 'implied';
                    }
                }
            }
        }
        
        if (found) {
            // Proficiency comparison
            var userProf = proficiencyValue(found.level);
            var profMatch;
            if (userProf >= jobProf) {
                profMatch = 1.0; // Meets or exceeds requirement
            } else {
                profMatch = userProf / jobProf; // Partial credit (e.g., Competent/Expert = 0.5)
            }
            
            // Credit = weight * name quality * proficiency quality
            // Floor: any confirmed match gets at least 65% of its max possible credit
            var rawCredit = reqWeight * nameMatchQuality * profMatch;
            var minCredit = reqWeight * 0.65;
            var skillCredit = Math.max(minCredit, rawCredit);
            earnedWeight += skillCredit;
            
            var profGap = userProf < jobProf;
            matched.push({
                jobSkill: jobSkill.name,
                userSkill: found.name,
                userLevel: found.level,
                jobProficiency: jobSkill.proficiency || 'Proficient',
                requirement: requirement,
                tier: jobSkill.tier || normalizeTier(requirement),
                category: jobSkill.category,
                section: jobSkill.section || null,
                source: jobSkill.source || null,
                nameMatch: nameMatchQuality,
                profMatch: profMatch,
                profGap: profGap,
                matchType: matchType,
                _credit: reqWeight * nameMatchQuality * profMatch
            });
            matchedUserSkills.add(found.name.toLowerCase());
        } else {
            gaps.push({
                name: jobSkill.name,
                requirement: requirement,
                tier: jobSkill.tier || normalizeTier(requirement),
                proficiency: jobSkill.proficiency || 'Proficient',
                category: jobSkill.category,
                section: jobSkill.section || null,
                source: jobSkill.source || null
            });
        }
    });
    
    // Deduplicate matched: if same user skill matched multiple JD skills, keep best
    var matchByUser = {};
    matched.forEach(function(m) {
        var key = m.userSkill.toLowerCase();
        if (!matchByUser[key] || m._credit > matchByUser[key]._credit) {
            matchByUser[key] = m;
        }
    });
    matched = Object.values(matchByUser);
    
    // Recalculate earnedWeight AND totalWeight from deduped matches + gaps
    // Before dedup, totalWeight included weight for EVERY job skill.
    // After dedup, dropped duplicates inflate the denominator unfairly.
    // Fix: totalWeight = weight of (deduped matches + gaps) only.
    earnedWeight = 0;
    totalWeight = 0;
    matched.forEach(function(m) { 
        earnedWeight += m._credit;
        totalWeight += tierWeight(m.tier || m.requirement);
    });
    
    // Deduplicate gaps by normalized name
    // CRITICAL FIX (v4.45.77): blocklisted gaps still count in totalWeight.
    // Removing them from BOTH display AND denominator caused score inflation
    // (e.g., 2 matched / 2 total = 100% when 3 gaps were blocklisted).
    var gapSeen = new Set();
    var blocklistedCount = 0;
    var blocklistedWeight = 0;
    var totalParsedGaps = gaps.length;
    gaps = gaps.filter(function(g) {
        var gw = tierWeight(g.tier || g.requirement);
        // Admin blocklist: remove from display but KEEP weight in denominator
        if (isSkillBlocklisted(g.name)) { 
            blocklistedCount++; 
            blocklistedWeight += gw;
            return false; 
        }
        var norm = g.name.toLowerCase().replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
        if (gapSeen.has(norm)) return false;
        gapSeen.add(norm);
        return true;
    });
    
    // Add ALL gap weights to totalWeight: visible gaps + blocklisted gaps
    gaps.forEach(function(g) {
        totalWeight += tierWeight(g.tier || g.requirement);
    });
    totalWeight += blocklistedWeight; // Blocklisted gaps stay in denominator
    
    // Surplus: user skills not needed by job
    var surplus = [];
    userSkills.forEach(function(s) {
        if (!matchedUserSkills.has(s.name.toLowerCase())) {
            surplus.push({ name: s.name, level: s.level, category: s.category });
        }
    });
    
    var score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
      
      var confidencePenalty = 0;
      var totalSkillsConsidered = matched.length + gaps.length + blocklistedCount;
      if (totalSkillsConsidered < 5) {
          var confidenceMultiplier = 0.4 + (totalSkillsConsidered * 0.12);
          confidencePenalty = score - Math.round(score * confidenceMultiplier);
          score = Math.round(score * confidenceMultiplier);
      }
      
      return {
          score: Math.min(score, 100),
          matched: matched,
          gaps: gaps,
          surplus: surplus,
          totalJobSkills: jobSkills.length,
          totalUserSkills: userSkills.length,
          blocklistedCount: blocklistedCount,
          totalParsedGaps: totalParsedGaps,
          confidencePenalty: confidencePenalty,
          lowConfidence: totalSkillsConsidered < 5,
          libraryAvailable: !!(skillLibraryIndex && skillLibraryIndex.index && skillLibraryIndex.index.length > 100)
      };
  }
  
  // ===== RE-SCORE ALL SAVED JOBS =====
// Called whenever profile skills change (add, edit, remove, proficiency change)
export function rescoreAllJobs() {
    if (!window._userData.savedJobs || window._userData.savedJobs.length === 0) {
        showToast('No jobs in pipeline to rescore.', 'info', 2000);
        return;
    }
    
    var updated = 0;
    window._userData.savedJobs.forEach(function(job) {
        if (!job.matchData && job.matchResult) {
            job.matchData = job.matchResult;
            delete job.matchResult;
        }
        if (!job.parsedSkills && job.parsedData && job.parsedData.skills) {
            job.parsedSkills = job.parsedData.skills;
        }
        if (!job.addedAt && job.dateAdded) job.addedAt = job.dateAdded;

        var oldScore = job.matchData ? job.matchData.score : 0;
        var skills = getJobSkills(job);

        if (skills.length === 0) {
            var textToParse = job.rawText || (job.raw && job.raw.text) || job.description || '';
            if (textToParse.length > 20) {
                try {
                    var reParsed = parseJobLocally((job.title || '') + '\n' + textToParse);
                    if (reParsed.skills && reParsed.skills.length > 0) {
                        job.parsedSkills = reParsed.skills;
                        skills = reParsed.skills;
                    }
                } catch(e) { console.warn('rescore re-parse failed:', e.message); }
            }
        }

        if (skills.length > 0) {
            job.matchData = matchJobToProfile(skills);
        } else {
            var quick = quickScoreJob(job.title || '', job.rawText || (job.raw && job.raw.text) || job.description || '', []);
            job.matchData = { score: quick.score, matched: quick.matched, gaps: quick.gaps, surplus: [] };
        }
        var companyName = (job.hiringOrganization && job.hiringOrganization.name) || job.company || '';
        var rawText = (job.raw && job.raw.text) || job.rawText || job.description || '';
        if (!job.companyValues) job.companyValues = getCompanyValues(companyName, rawText);
        if (job.matchData.score !== oldScore) updated++;
    });
    
    saveUserData();
    if (fbUser) debouncedSave();
    if (updated > 0) {
        showToast(updated + ' job score' + (updated > 1 ? 's' : '') + ' updated.', 'success', 3000);
    } else {
        showToast('All ' + window._userData.savedJobs.length + ' job scores are current.', 'info', 2000);
    }
}
if (!window.rescoreAllJobs) window.rescoreAllJobs = rescoreAllJobs;

export function rescoreOneJob(idx) {
    var job = (window._userData.savedJobs || [])[idx];
    if (!job) {
        showToast('Job not found.', 'warning');
        return;
    }
    var oldScore = job.matchData ? job.matchData.score : 0;
    var skills = getJobSkills(job);
    if (skills.length > 0) {
        job.matchData = matchJobToProfile(skills);
    } else {
        var quick = quickScoreJob(job.title, job.rawText || (job.raw && job.raw.text) || '', []);
        job.matchData = { score: quick.score, matched: quick.matched, gaps: quick.gaps, surplus: [] };
    }
    var companyName = (job.hiringOrganization && job.hiringOrganization.name) || job.company || '';
    var rawText = (job.raw && job.raw.text) || job.rawText || job.description || '';
    if (!job.companyValues) job.companyValues = getCompanyValues(companyName, rawText);
    saveUserData();
    if (fbUser) debouncedSave();
    showJobDetail(idx);
    var delta = job.matchData.score - oldScore;
    var deltaStr = delta > 0 ? ' (+' + delta + ')' : delta < 0 ? ' (' + delta + ')' : '';
    showToast('Match rescored: ' + job.matchData.score + '%' + deltaStr, 'success', 3000);
}
if (!window.rescoreOneJob) window.rescoreOneJob = rescoreOneJob;

// ===== QUICK-ADD GAP SKILL FROM JOB DETAIL =====
export function quickAddGapSkill(skillName, suggestedLevel, jobIdx) {
    if (readOnlyGuard()) return;
    
    // Check if already in profile
    if (window._userData.skills.some(function(s) { return s.name.toLowerCase() === skillName.toLowerCase(); })) {
        showToast('"' + skillName + '" is already in your profile.', 'info');
        // Still rescore in case something changed
        rescoreAllJobs();
        showJobDetail(jobIdx);
        return;
    }
    
    // Show inline proficiency picker
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    var levels = ['Novice', 'Competent', 'Proficient', 'Expert', 'Mastery'];
    var sugIdx = levels.indexOf(suggestedLevel);
    if (sugIdx === -1) sugIdx = 2;
    
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left"><h2 class="modal-title">Add Skill: ' + skillName + '</h2></div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button></div>'
        + '<div class="modal-body" style="padding:24px;">'
        + '<p style="color:var(--text-secondary); margin-bottom:16px;">This job expects <strong>' + suggestedLevel + '</strong> proficiency. What\'s your actual level?</p>'
        + '<div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">'
        + levels.map(function(lvl, i) {
            var isSelected = i === sugIdx;
            var barWidth = ((i + 1) / 5 * 100);
            var barColor = i < sugIdx ? '#f59e0b' : i === sugIdx ? '#10b981' : '#60a5fa';
            return '<label style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:8px; cursor:pointer; '
                + 'border:1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)') + '; '
                + 'background:' + (isSelected ? 'var(--accent-glow)' : 'transparent') + ';">'
                + '<input type="radio" name="gapSkillLevel" value="' + lvl + '"' + (isSelected ? ' checked' : '') + ' style="margin:0;">'
                + '<div style="flex:1;">'
                + '<div style="font-weight:600; font-size:0.92em;">' + lvl + '</div>'
                + '<div style="height:4px; width:100%; background:var(--border); border-radius:2px; margin-top:4px;">'
                + '<div style="height:100%; width:' + barWidth + '%; background:' + barColor + '; border-radius:2px;"></div></div>'
                + '</div></label>';
        }).join('')
        + '</div>'
        + '<p style="font-size:0.82em; color:var(--text-muted); margin-bottom:16px;">The skill will be added to your profile and all job matches will be rescored automatically.</p>'
        + '<div style="display:flex; gap:10px; justify-content:flex-end;">'
        + '<button onclick="closeExportModal()" style="padding:10px 20px; background:rgba(255,255,255,0.1); border:1px solid var(--border); border-radius:6px; cursor:pointer; color:var(--text-primary);">Cancel</button>'
        + '<button onclick="confirmQuickAddGapSkill(\'' + escapeHtml(skillName).replace(/'/g, "\\'") + '\', ' + jobIdx + ')" style="'
        + 'padding:10px 20px; background:var(--accent); color:#fff; border:none; border-radius:6px; cursor:pointer; font-weight:600;">Add to Profile</button>'
        + '</div></div>';
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}
if (!window.quickAddGapSkill) window.quickAddGapSkill = quickAddGapSkill;

export function confirmQuickAddGapSkill(skillName, jobIdx) {
    if (readOnlyGuard()) return;
    
    // Dedup check
    if (window._userData.skills.some(function(s) { return s.name.toLowerCase() === skillName.toLowerCase(); })) {
        showToast('"' + skillName + '" is already in your profile.', 'info');
        closeExportModal();
        rescoreAllJobs();
        showJobDetail(jobIdx);
        return;
    }
    
    // Skill cap check
    if (!canAddSkill()) { closeExportModal(); return; }
    
    var level = 'Proficient';
    var checked = document.querySelector('input[name="gapSkillLevel"]:checked');
    if (checked) level = checked.value;
    
    // Add to profile
    var firstRole = (window._userData.roles && window._userData.roles[0]) ? window._userData.roles[0].id : 'general';
    var newSkill = {
        name: skillName,
        category: 'unique',
        level: level,
        roles: [firstRole],
        key: false,
        addedFrom: 'job-gap'
    };
    window._userData.skills.push(newSkill);
    _sd().skills.push(newSkill);
    
    // Register in library
    registerInSkillLibrary(skillName, 'unique');
    
    saveUserData();
    if (fbUser) debouncedSave();
    rescoreAllJobs();
    
    closeExportModal();
    showJobDetail(jobIdx);
    showToast('Added "' + skillName + '" at ' + level + '. Match scores updated.', 'success', 4000);
}
if (!window.confirmQuickAddGapSkill) window.confirmQuickAddGapSkill = confirmQuickAddGapSkill;

// ===== QUICK-ADD ROLE SUGGESTION =====
export function quickAddSuggested(skillName, level, roleId) {
    if (readOnlyGuard()) return;
    if (window._userData.skills.some(function(s) { return s.name.toLowerCase() === skillName.toLowerCase(); })) {
        showToast('"' + skillName + '" is already in your profile.', 'info');
        return;
    }
    if (!canAddSkill()) return;
    var newSkill = { name: skillName, category: 'unique', level: level, roles: [roleId], key: false, addedFrom: 'role-suggestion' };
    window._userData.skills.push(newSkill);
    _sd().skills.push(newSkill);
    registerInSkillLibrary(skillName, 'unique');
    saveUserData();
    rescoreAllJobs();
    // Re-render card view to update suggestions
    window.cardViewInitialized = false;
    initCardView();
    window.cardViewInitialized = true;
    showToast('Added "' + skillName + '" at ' + level + '.', 'success', 3000);
}
if (!window.quickAddSuggested) window.quickAddSuggested = quickAddSuggested;

// ===== JOB DETAIL VIEW =====

export function showJobDetail(idx) {
    var job = (window._userData.savedJobs || [])[idx];
    if (!job) return;
    
    var match = job.matchData || {};
    var matchPct = match.score || 0;
    var matchColor = matchPct >= 70 ? '#10b981' : matchPct >= 45 ? '#f59e0b' : '#6b7280';
    var matched = match.matched || [];
    var gaps = match.gaps || [];
    var surplus = match.surplus || [];
    
    var el = document.getElementById('jobsSubTabContent');
    if (!el) return;
    
    var html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">'
        + '<button onclick="renderJobsSubTab()" style="background:none; border:none; color:var(--accent); '
        + 'cursor:pointer; font-size:0.88em; padding:0;">\u2190 Back to Pipeline</button>'
        + '<div style="display:flex; gap:8px; align-items:center;">';
    
    var isSampleJob = job.sample === true;
    if (isSampleJob && !fbIsAdmin) {
        html += '<span style="font-size:0.78em; color:var(--text-muted); font-style:italic;">\uD83D\uDD12 Demo job (read-only)</span>';
    } else {
        if (isSampleJob) html += '<span style="font-size:0.72em; color:var(--text-muted); font-style:italic; margin-right:4px;">\uD83D\uDD12 Demo</span>';
        html += '<button onclick="editJobInfo(' + idx + ')" style="background:none; border:1px solid var(--border); '
            + 'color:var(--text-muted); padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.78em;">\u270E Edit Info</button>'
            + '<button onclick="rescoreOneJob(' + idx + ')" style="background:none; border:1px solid var(--border); '
            + 'color:var(--text-muted); padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.78em;">\u21BB Refresh Match</button>'
            + '<button onclick="reanalyzeJob(' + idx + ')" style="background:none; border:1px solid var(--border); '
            + 'color:var(--text-muted); padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.78em;">\u21BB Re-analyze</button>'
            + '<button onclick="removeJob(' + idx + ')" style="background:none; border:1px solid rgba(239,68,68,0.3); '
            + 'color:#ef4444; padding:5px 12px; border-radius:6px; cursor:pointer; font-size:0.78em;">\u2715 Delete</button>';
    }
    html += '</div></div>';
    
    // Header
    var companyName = (job.hiringOrganization && job.hiringOrganization.name) || job.company || '';
    var jobSourceUrl = (job.postingMeta && job.postingMeta.sourceUrl) || job.sourceUrl || '';
    html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; flex-wrap:wrap; gap:16px;">'
        + '<div>'
        + '<h2 style="font-size:1.5em; font-weight:700; color:var(--text-primary); margin:0;">' + (job.title || 'Untitled') + '</h2>'
        + '<div style="color:var(--text-muted); margin-top:4px;">' + escapeHtml(companyName) 
        + (jobSourceUrl ? ' \u00B7 <a href="' + sanitizeUrl(jobSourceUrl) + '" target="_blank" rel="noopener noreferrer" style="color:var(--accent);">View original</a>' : '') + '</div>';
    
    // v2 metadata badges (location, remote, industry, employment type)
    var metaBadges = [];
    var loc = (job.jobLocation && job.jobLocation.primary) || '';
    if (loc) metaBadges.push(bpIcon('map-pin',12) + ' ' + escapeHtml(loc));
    if (job.jobLocation && job.jobLocation.remote === true) metaBadges.push('\uD83C\uDFE0 Remote');
    var ind = (job.hiringOrganization && job.hiringOrganization.industry) || '';
    if (ind) metaBadges.push(escapeHtml(ind));
    if (job.employmentType) {
        var etMap = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERN: 'Intern' };
        metaBadges.push(etMap[job.employmentType] || job.employmentType);
    }
    if (job.department) metaBadges.push(escapeHtml(job.department));
    var ingestLabel = (job.postingMeta && job.postingMeta.ingestMethod) || '';
    if (ingestLabel === 'api') metaBadges.push('\u2728 AI-analyzed');
    if (metaBadges.length > 0) {
        html += '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">';
        metaBadges.forEach(function(b) {
            html += '<span style="display:inline-flex; align-items:center; gap:3px; padding:2px 8px; border-radius:10px; '
                + 'font-size:0.72em; background:rgba(96,165,250,0.08); color:var(--text-muted); border:1px solid rgba(96,165,250,0.12);">'
                + b + '</span>';
        });
        html += '</div>';
    }
    html += '</div>'
        + '<div style="text-align:center; padding:12px 24px; border-radius:12px; '
        + 'background:' + matchColor + '15; border:2px solid ' + matchColor + '40;">'
        + '<div style="font-size:2em; font-weight:700; color:' + matchColor + ';">' + matchPct + '%</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted);">Overall Match</div>'
        + '</div></div>';
    
    // Network Overlay CTA (prominent, above the fold)
    html += '<div class="jd-cta-box">'
        + '<div class="jd-cta-buttons">'
        + '<button onclick="activateJobOverlay(' + idx + ')" style="'
        + 'background:var(--accent); color:#fff; border:none; padding:10px 20px; border-radius:8px; '
        + 'cursor:pointer; font-weight:600; font-size:0.9em; display:flex; align-items:center; gap:8px; white-space:nowrap;">'
        + bpIcon('network',16) + ' Compare Skills</button>'
        + '<button onclick="activateValuesOverlay(' + idx + ')" style="'
        + 'background:transparent; color:#f59e0b; border:1px solid rgba(245,158,11,0.4); padding:10px 20px; border-radius:8px; '
        + 'cursor:pointer; font-weight:600; font-size:0.9em; display:flex; align-items:center; gap:8px; white-space:nowrap;">'
        + bpIcon('values',16) + ' Values Fit</button>'
        + '<button onclick="launchScoutingReport()" style="'
        + 'background:linear-gradient(135deg, rgba(96,165,250,0.15), rgba(99,102,241,0.1)); color:var(--accent); border:1px solid rgba(96,165,250,0.3); padding:10px 20px; border-radius:8px; '
        + 'cursor:pointer; font-weight:600; font-size:0.9em; display:flex; align-items:center; gap:8px; white-space:nowrap;">'
        + bpIcon('file-text',16) + ' Scouting Report</button>'
        + '</div>'
        + '<div class="jd-cta-desc">Compare your skills and values against this role and company culture.</div>'
        + '</div>';
    
    // Summary stats
    var profGapCount = matched.filter(function(m) { return m.profGap; }).length;
    html += '<div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:24px;">'
        + '<div style="text-align:center; padding:16px; border-radius:10px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2);">'
        + '<div style="font-size:1.6em; font-weight:700; color:#10b981;">' + matched.length + '</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted);">Skills Matched</div></div>'
        + '<div style="text-align:center; padding:16px; border-radius:10px; background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.15);">'
        + '<div style="font-size:1.6em; font-weight:700; color:#f59e0b;">' + profGapCount + '</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted);">Proficiency Gaps</div></div>'
        + '<div style="text-align:center; padding:16px; border-radius:10px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2);">'
        + '<div style="font-size:1.6em; font-weight:700; color:#ef4444;">' + gaps.length + '</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted);">Missing Skills</div></div>'
        + '<div style="text-align:center; padding:16px; border-radius:10px; background:rgba(107,114,128,0.06); border:1px solid rgba(107,114,128,0.15);">'
        + '<div style="font-size:1.6em; font-weight:700; color:#6b7280;">' + surplus.length + '</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted);">Your Surplus</div></div>'
        + '</div>';
    
    // v2 extraction summary (subtle line showing extraction quality)
    var jobSkillsArr = getJobSkills(job);
    var extractedCount = jobSkillsArr.filter(function(s) { return s.source !== 'inferred'; }).length;
    var inferredCount = jobSkillsArr.filter(function(s) { return s.source === 'inferred'; }).length;
    var ingestMethod = (job.postingMeta && job.postingMeta.ingestMethod) || '';
    if (jobSkillsArr.length > 0 && (jobSkillsArr[0].section || jobSkillsArr[0].source)) {
        var sections = {};
        jobSkillsArr.forEach(function(s) { if (s.section) sections[s.section] = (sections[s.section] || 0) + 1; });
        var sectionSummary = Object.keys(sections).map(function(k) { return k + ' (' + sections[k] + ')'; }).join(', ');
        html += '<div style="margin-bottom:12px; padding:8px 14px; border-radius:8px; '
            + 'background:rgba(96,165,250,0.04); border:1px solid rgba(96,165,250,0.1); '
            + 'font-size:0.75em; color:var(--text-muted); display:flex; flex-wrap:wrap; gap:8px; align-items:center;">'
            + '<span>' + jobSkillsArr.length + ' skills extracted</span>'
            + (inferredCount > 0 ? '<span>\u00B7 ' + extractedCount + ' explicit, ' + inferredCount + ' inferred</span>' : '')
            + (sectionSummary ? '<span>\u00B7 Sections: ' + escapeHtml(sectionSummary) + '</span>' : '')
            + '</div>';
    }
    
    // Diagnostic warnings: blocklist impact and library status (admin only or always subtle)
    var diagnosticWarnings = [];
    if (match.blocklistedCount > 0) {
        diagnosticWarnings.push(bpIcon('alert-triangle',14) + ' ' + match.blocklistedCount + ' gap skill' + (match.blocklistedCount !== 1 ? 's' : '') + ' filtered by admin blocklist'
            + ' <button onclick="showAdminBlocklistInContext(' + idx + ')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.82em;text-decoration:underline;padding:0;">Review</button>');
    }
    if (match.libraryAvailable === false) {
        diagnosticWarnings.push(bpIcon('alert-triangle',14) + ' Skill library was not loaded during analysis. <button onclick="reanalyzeJob(' + idx + ')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.82em;text-decoration:underline;padding:0;">Re-analyze now</button> for better results.');
    }
    var parsedSkillCount = getJobSkills(job).length;
    if (parsedSkillCount > 0 && parsedSkillCount < 8) {
        diagnosticWarnings.push(bpIcon('info',14) + ' Only ' + parsedSkillCount + ' skill' + (parsedSkillCount !== 1 ? 's' : '') + ' extracted from JD. <button onclick="reanalyzeJob(' + idx + ')" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:0.82em;text-decoration:underline;padding:0;">Re-analyze</button> may find more.');
    }
    if (diagnosticWarnings.length > 0) {
        html += '<div style="margin-bottom:16px; display:flex; flex-direction:column; gap:6px;">';
        diagnosticWarnings.forEach(function(w) {
            html += '<div style="display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:8px; '
                + 'background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.15); font-size:0.82em; color:#f59e0b;">'
                + w + '</div>';
        });
        html += '</div>';
    }
    var jobCV = job.companyValues || getCompanyValues(job.company, job.rawText || job.description || "");
    var userVals = (blueprintData && _bd().values) || [];
    var valAlign = jobCV ? computeValuesAlignment(userVals, jobCV) : null;
    if (valAlign) {
        var vaColor = valAlign.score >= 65 ? '#10b981' : valAlign.score >= 40 ? '#f59e0b' : '#ef4444';
        var vaBg = valAlign.score >= 65 ? 'rgba(16,185,129,0.06)' : valAlign.score >= 40 ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)';
        var vaBorder = valAlign.score >= 65 ? 'rgba(16,185,129,0.2)' : valAlign.score >= 40 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.2)';
        html += '<div style="display:flex; align-items:center; gap:16px; padding:14px 20px; margin-bottom:20px; '
            + 'border-radius:10px; background:' + vaBg + '; border:1px solid ' + vaBorder + ';">'
            + '<div style="text-align:center; min-width:60px;">'
            + '<div style="font-size:1.6em; font-weight:700; color:' + vaColor + ';">' + valAlign.score + '%</div>'
            + '<div style="font-size:0.72em; color:var(--text-muted);">Values Fit</div></div>'
            + '<div style="flex:1;">'
            + '<div style="display:flex; gap:12px; font-size:0.82em; margin-bottom:6px;">'
            + '<span style="color:#10b981;">' + valAlign.aligned.length + ' aligned</span>'
            + (valAlign.tensionRisk.length > 0 ? '<span style="color:#ef4444;">' + valAlign.tensionRisk.length + ' friction</span>' : '')
            + '<span style="color:var(--text-muted);">' + valAlign.yourPriority.length + ' unmatched</span>'
            + '</div>';
        if (jobCV.story) {
            html += '<div style="font-size:0.78em; color:var(--text-muted); line-height:1.4;">' + jobCV.story + '</div>';
        }
        html += '</div></div>';
    }
    
    // BLS Salary Range (if available)
    if (job.blsSalary && job.blsSalary.median) {
        var bls = job.blsSalary;
        html += '<div style="margin-bottom:24px; padding:16px 20px; border-radius:10px; '
            + 'background:rgba(167,139,250,0.06); border:1px solid rgba(167,139,250,0.2);">'
            + '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">'
            + '<div>'
            + '<div style="font-size:0.82em; font-weight:600; color:#a78bfa; margin-bottom:4px;">\uD83D\uDCB0 Market Salary Range</div>'
            + '<div style="font-size:0.78em; color:var(--text-muted);">BLS Match: ' + bls.title + ' (SOC ' + bls.soc + ')</div>'
            + '</div>'
            + '<div style="text-align:right;">'
            + '<div style="font-size:1.3em; font-weight:700; color:#a78bfa;">$' + bls.median.toLocaleString() + '</div>'
            + '<div style="font-size:0.72em; color:var(--text-muted);">median annual</div>'
            + '</div></div>';
        
        // Percentile bar
        if (bls.pct10 && bls.pct90) {
            var range = bls.pct90 - bls.pct10;
            var p25Pos = bls.pct25 ? ((bls.pct25 - bls.pct10) / range * 100) : 15;
            var medPos = ((bls.median - bls.pct10) / range * 100);
            var p75Pos = bls.pct75 ? ((bls.pct75 - bls.pct10) / range * 100) : 85;
            
            html += '<div style="margin-top:12px;">'
                + '<div style="position:relative; height:8px; background:rgba(167,139,250,0.15); border-radius:4px; margin:8px 0;">'
                + '<div style="position:absolute; left:' + p25Pos + '%; right:' + (100 - p75Pos) + '%; height:100%; background:rgba(167,139,250,0.4); border-radius:4px;"></div>'
                + '<div style="position:absolute; left:' + medPos + '%; width:3px; height:14px; top:-3px; background:#a78bfa; border-radius:2px;"></div>'
                + '</div>'
                + '<div style="display:flex; justify-content:space-between; font-size:0.72em; color:var(--text-muted);">'
                + '<span>$' + bls.pct10.toLocaleString() + ' (10th)</span>'
                + '<span>$' + (bls.pct90 || 0).toLocaleString() + ' (90th)</span>'
                + '</div></div>';
        }
        
        html += '<div style="margin-top:8px; font-size:0.7em; color:var(--text-muted); opacity:0.6;">Source: ' + bls.source + ' \u00B7 National cross-industry</div>'
            + '</div>';
    }
    
    // Matched skills (with proficiency comparison)
    if (matched.length > 0) {
        html += '<div style="margin-bottom:20px;">'
            + '<h3 style="font-size:0.95em; font-weight:700; color:#10b981; margin-bottom:10px;">\u2713 Matched Skills</h3>'
            + '<div style="display:flex; flex-wrap:wrap; gap:6px;">';
        matched.forEach(function(m) {
            var profColor = m.profGap ? '#f59e0b' : '#10b981';
            var profLabel = m.userLevel || '';
            var tierBadge = (m.tier === 'required' || m.requirement === 'Required') ? ' \u2605' : '';
            var profTip = m.profGap ? ' (job wants ' + (m.jobProficiency || '?') + ')' : '';
            var sectionTip = m.section ? ' | From: ' + m.section : '';
            var typeTip = m.matchType && m.matchType !== 'exact' ? ' | Via: ' + m.matchType : '';
            html += '<span class="jd-skill-chip jd-chip-matched" style="border-color:' + profColor + '40;" '
                + 'title="Your level: ' + profLabel + profTip + sectionTip + typeTip + '">'
                + escapeHtml(m.userSkill) + ' <span style="font-size:0.75em; opacity:0.7;">' + profLabel + '</span>' + tierBadge + '</span>';
        });
        html += '</div></div>';
    }
    
    // Gaps (clickable to quick-add)
    if (gaps.length > 0) {
        html += '<div style="margin-bottom:20px;">'
            + '<h3 style="font-size:0.95em; font-weight:700; color:#ef4444; margin-bottom:10px;">\u25CB Gaps (Job Needs, You Don\u2019t Have)</h3>'
            + '<p style="font-size:0.75em; color:var(--text-muted); margin-bottom:8px;">Click a skill to add it to your profile</p>'
            + '<div style="display:flex; flex-wrap:wrap; gap:6px;">';
        gaps.forEach(function(g, gi) {
            var tierBadge = (g.tier === 'required' || g.requirement === 'Required') ? ' \u2605' : '';
            var profLabel = g.proficiency ? ' (' + g.proficiency + ')' : '';
            var sectionTip = g.section ? 'From: ' + g.section : 'Click to add to your profile';
            var inferBadge = g.source === 'inferred' ? '<span style="font-size:0.68em; opacity:0.5; margin-left:2px;" title="Inferred from responsibilities">\u2248</span>' : '';
            html += '<span class="jd-skill-chip jd-chip-gap" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px;" '
                + 'onclick="quickAddGapSkill(\'' + escapeHtml(g.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(g.proficiency || 'Proficient') + '\', ' + idx + ')" '
                + 'title="' + escapeHtml(sectionTip) + '">'
                + escapeHtml(g.name) + '<span style="font-size:0.72em; opacity:0.6;">' + escapeHtml(profLabel) + '</span>' + tierBadge + inferBadge;
            if (fbIsAdmin) {
                html += '<span onclick="event.stopPropagation(); adminBlockSkill(\'' + escapeHtml(g.name).replace(/'/g, "\\'") + '\', ' + idx + ');" '
                    + 'style="margin-left:2px; opacity:0.4; font-size:0.9em; cursor:pointer;" title="Block this skill (admin)">\u2715</span>';
            }
            html += '</span>';
        });
        html += '</div>'
            + '<div style="margin-top:8px; font-size:0.75em; color:var(--text-muted);">\u2605 = Required by employer' 
            + (gaps.some(function(g) { return g.source === 'inferred'; }) ? ' \u00B7 \u2248 = Inferred from responsibilities' : '') 
            + '</div></div>';
    }
    
    // Proficiency gaps (matched skills where you're below the required level)
    var profGaps = matched.filter(function(m) { return m.profGap; });
    if (profGaps.length > 0) {
        html += '<div style="margin-bottom:20px; padding:16px; border-radius:10px; '
            + 'background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.15);">'
            + '<h3 style="font-size:0.95em; font-weight:700; color:#f59e0b; margin-bottom:10px;">\u26A0 Proficiency Gaps (You Have It, But Need to Level Up)</h3>'
            + '<div style="display:flex; flex-direction:column; gap:6px;">';
        profGaps.forEach(function(m) {
            var userVal = proficiencyValue(m.userLevel);
            var jobVal = proficiencyValue(m.jobProficiency);
            var pct = Math.round((userVal / jobVal) * 100);
            html += '<div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; padding:8px 10px; '
                + 'background:rgba(251,191,36,0.04); border-radius:6px; font-size:0.85em;">'
                + '<span style="font-weight:600; color:var(--text-primary); flex:1 1 120px;">' + m.userSkill + '</span>'
                + '<span style="color:#f59e0b;">You: ' + m.userLevel + '</span>'
                + '<span style="color:var(--text-muted);">\u2192</span>'
                + '<span style="color:#ef4444;">Need: ' + m.jobProficiency + '</span>'
                + '</div>';
        });
        html += '</div></div>';
    }
    
    // Role-based skill suggestions (skills expected for your roles but not in profile)
    var roleSuggestions = getRoleSuggestions();
    // Filter to suggestions that are ALSO in the job gaps (most actionable)
    var gapNames = new Set(gaps.map(function(g) { return g.name.toLowerCase(); }));
    var roleGapOverlap = roleSuggestions.filter(function(s) { return gapNames.has(s.name.toLowerCase()); });
    var roleOther = roleSuggestions.filter(function(s) { return !gapNames.has(s.name.toLowerCase()); });
    
    if (roleGapOverlap.length > 0 || roleOther.length > 0) {
        html += '<div style="margin-bottom:20px; padding:16px; border-radius:10px; '
            + 'background:linear-gradient(135deg, rgba(96,165,250,0.06), rgba(139,92,246,0.04)); '
            + 'border:1px solid rgba(96,165,250,0.15);">'
            + '<h3 style="font-size:0.95em; font-weight:700; color:var(--accent); margin-bottom:4px;">'
            + '\uD83D\uDCA1 Suggested for Your Roles</h3>'
            + '<p style="font-size:0.75em; color:var(--text-muted); margin-bottom:10px;">Industry-standard skills for your roles. Click to add.</p>';
        if (roleGapOverlap.length > 0) {
            html += '<p style="font-size:0.78em; font-weight:600; color:#f59e0b; margin-bottom:6px;">Also needed by this job:</p>'
                + '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">';
            roleGapOverlap.forEach(function(s) {
                html += '<span style="display:inline-flex; align-items:center; gap:4px; padding:5px 12px; border-radius:16px; '
                    + 'font-size:0.82em; cursor:pointer; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.25); color:var(--text-secondary);" '
                    + 'onclick="quickAddSuggested(\'' + escapeHtml(s.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(s.level) + '\', \'' + escapeHtml(s.roleId) + '\'); showJobDetail(' + idx + ');" '
                    + 'title="Expected for ' + escapeHtml(s.reason) + ' at ' + escapeHtml(s.level) + '">+ ' + escapeHtml(s.name) + '</span>';
            });
            html += '</div>';
        }
        if (roleOther.length > 0) {
            html += '<div style="display:flex; flex-wrap:wrap; gap:6px;">';
            roleOther.slice(0, 12).forEach(function(s) {
                html += '<span style="display:inline-flex; align-items:center; gap:4px; padding:5px 12px; border-radius:16px; '
                    + 'font-size:0.82em; cursor:pointer; background:rgba(96,165,250,0.08); border:1px solid rgba(96,165,250,0.2); color:var(--text-secondary);" '
                    + 'onclick="quickAddSuggested(\'' + escapeHtml(s.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(s.level) + '\', \'' + escapeHtml(s.roleId) + '\'); showJobDetail(' + idx + ');" '
                    + 'title="Expected for ' + escapeHtml(s.reason) + ' at ' + escapeHtml(s.level) + '">+ ' + escapeHtml(s.name) + '</span>';
            });
            html += '</div>';
        }
        html += '</div>';
    }
    
    // Top surplus (capped at 15 to avoid wall of chips)
    if (surplus.length > 0) {
        var showSurplus = surplus.filter(function(s) { return s.level === 'Mastery' || s.level === 'Expert' || s.level === 'Advanced'; }).slice(0, 15);
        if (showSurplus.length === 0) showSurplus = surplus.slice(0, 10);
        html += '<div style="margin-bottom:20px;">'
            + '<h3 style="font-size:0.95em; font-weight:700; color:#6b7280; margin-bottom:10px;">\u25CF Your Surplus (Not Listed in JD)</h3>'
            + '<div style="display:flex; flex-wrap:wrap; gap:6px;">';
        showSurplus.forEach(function(s) {
            html += '<span class="jd-skill-chip jd-chip-surplus">' + escapeHtml(s.name) + '</span>';
        });
        if (surplus.length > showSurplus.length) {
            html += '<span style="font-size:0.75em; color:var(--text-muted); padding:4px 8px;">+' + (surplus.length - showSurplus.length) + ' more</span>';
        }
        html += '</div></div>';
    }
    
    // [v4.20.1] Overlay CTA moved to top of job detail
    
    el.innerHTML = html;
}
if (!window.showJobDetail) window.showJobDetail = showJobDetail;

export function removeJob(idx) {
    if (readOnlyGuard()) return;
    var job = (window._userData.savedJobs || [])[idx];
    if (job && job.sample && !fbIsAdmin) { showToast('Demo jobs cannot be removed.', 'warning'); return; }
    if (!confirm('Remove this job from your pipeline?')) return;
    window._userData.savedJobs.splice(idx, 1);
    saveUserData();
    if (fbUser) debouncedSave();
    // Clear overlay if this was the active job
    if (activeJobForNetwork && activeJobForNetwork.id === (window._userData.savedJobs[idx] || {}).id) {
        clearJobOverlay();
    }
    window.opportunitiesInitialized = false;
    switchView('opportunities');
}
if (!window.removeJob) window.removeJob = removeJob;

export function editJobInfo(idx) {
    var job = (window._userData.savedJobs || [])[idx];
    if (!job) return;
    if (job.sample && !fbIsAdmin) { showToast('Demo jobs cannot be edited.', 'warning'); return; }
    
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">Edit Job Info</h2>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px;">'
        + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">'
        + '<div>'
        + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px; font-size:0.88em;">Job Title</label>'
        + '<input id="editJobTitle" value="' + escapeHtml(job.title || '') + '" style="'
        + 'width:100%; padding:10px 12px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.9em;" />'
        + '</div>'
        + '<div>'
        + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px; font-size:0.88em;">Company</label>'
        + '<input id="editJobCompany" value="' + escapeHtml(job.company || '') + '" style="'
        + 'width:100%; padding:10px 12px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.9em;" />'
        + '</div></div>'
        + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">'
        + '<div>'
        + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px; font-size:0.88em;">Source URL</label>'
        + '<input id="editJobUrl" value="' + escapeHtml(job.sourceUrl || '') + '" style="'
        + 'width:100%; padding:10px 12px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.9em;" />'
        + '</div>'
        + '<div>'
        + '<label style="font-weight:600; color:var(--text-secondary); display:block; margin-bottom:6px; font-size:0.88em;">Source Note</label>'
        + '<input id="editJobNote" value="' + escapeHtml(job.sourceNote || '') + '" style="'
        + 'width:100%; padding:10px 12px; background:var(--c-input-bg); '
        + 'border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.9em;" />'
        + '</div></div>'
        + '<div style="display:flex; gap:12px; justify-content:flex-end; margin-top:20px;">'
        + '<button onclick="closeExportModal()" style="'
        + 'background:transparent; color:var(--text-muted); border:1px solid var(--border); '
        + 'padding:10px 20px; border-radius:8px; cursor:pointer; font-size:0.9em;">Cancel</button>'
        + '<button onclick="saveJobEdit(' + idx + ')" style="'
        + 'background:var(--accent); color:#fff; border:none; padding:10px 24px; border-radius:8px; '
        + 'cursor:pointer; font-weight:600; font-size:0.9em;">Save Changes</button>'
        + '</div></div>';
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}
if (!window.editJobInfo) window.editJobInfo = editJobInfo;

export function saveJobEdit(idx) {
    if (readOnlyGuard()) return;
    var job = (window._userData.savedJobs || [])[idx];
    if (!job) return;
    
    job.title = (document.getElementById('editJobTitle').value || '').trim() || job.title;
    job.company = (document.getElementById('editJobCompany').value || '').trim();
    job.sourceUrl = (document.getElementById('editJobUrl').value || '').trim();
    job.sourceNote = (document.getElementById('editJobNote').value || '').trim();
    
    saveUserData();
    if (fbUser) debouncedSave();
    closeExportModal();
    showJobDetail(idx);
    showToast('Job info updated.', 'success');
}
if (!window.saveJobEdit) window.saveJobEdit = saveJobEdit;

export function reanalyzeJob(idx) {
    var job = (window._userData.savedJobs || [])[idx];
    if (job && job.sample && !fbIsAdmin) { showToast('Demo jobs cannot be re-analyzed.', 'warning'); return; }
    if (!job || (!job.rawText && !(job.raw && job.raw.text))) {
        showToast('No raw JD text saved for this job.', 'warning');
        return;
    }
    
    var jobRawText = job.rawText || (job.raw && job.raw.text) || '';
    var apiKey = safeGet('wbAnthropicKey') || '';
    
    // Re-parse
    var statusEl = document.getElementById('jobsSubTabContent');
    var origHtml = statusEl.innerHTML;
    statusEl.innerHTML = '<div style="text-align:center; padding:60px 20px;">'
        + '<div class="loading-spinner" style="width:30px; height:30px; border-width:2px; margin:0 auto 12px;"></div>'
        + '<div style="color:var(--text-muted);">Re-analyzing job description...</div></div>';
    
    (async function() {
        try {
            await ensureSkillLibrary();
            var parsed;
            if (apiKey) {
                parsed = await parseJobWithAPI(jobRawText, apiKey);
            } else {
                parsed = parseJobLocally(jobRawText);
            }
            
            // Convert parsed skills to v2 format
            var reIngestMethod = apiKey ? 'api' : 'local';
            var reConfidence = apiKey ? 0.85 : 0.5;
            var v2Skills = (parsed.skills || []).map(function(s) {
                var name = typeof s === 'string' ? s : (s.name || '');
                if (!name) return null;
                var isObj = typeof s === 'object' && s !== null;
                var legacyReq = isObj ? (s.requirement || s.level || '') : '';
                var tier = (isObj && s.tier) ? s.tier : normalizeTier(legacyReq);
                var source = (isObj && s.source) || 'extracted';
                var conf = source === 'inferred' ? Math.min(reConfidence, 0.7) : reConfidence;
                return {
                    name: name,
                    canonical: name.toLowerCase().replace(/\s+/g, ' ').trim(),
                    abbreviation: null,
                    tier: tier,
                    proficiency: (isObj && s.proficiency) || 'Proficient',
                    category: (isObj && s.category) ? s.category.toLowerCase() : 'technical',
                    section: (isObj && s.section) || null,
                    context: (isObj && s.context) || null,
                    source: source,
                    confidence: conf,
                    frameworkRef: null
                };
            }).filter(Boolean).slice(0, JOB_SKILLS_CAP);
            
            var matchData = matchJobToProfile(v2Skills);
            
            // Update v2 structure
            if (!job.requirements) job.requirements = { skills: [], qualifications: [], responsibilities: [] };
            job.requirements.skills = v2Skills;
            job.schemaVersion = JOB_SCHEMA_VERSION;
            if (job.postingMeta) job.postingMeta.ingestMethod = reIngestMethod;
            
            // Update qualifications and responsibilities from API response
            if (parsed.qualifications && Array.isArray(parsed.qualifications)) {
                job.requirements.qualifications = parsed.qualifications.map(function(q) {
                    if (typeof q === 'string') return { text: q, type: 'other', required: true };
                    return { text: q.text || '', type: q.type || 'other', required: q.required !== false };
                });
            }
            if (parsed.responsibilities && Array.isArray(parsed.responsibilities)) {
                job.requirements.responsibilities = parsed.responsibilities.map(function(r) {
                    return typeof r === 'string' ? r : (r.text || r.description || '');
                }).filter(Boolean);
            }
            
            // Update identity metadata from API response
            if (parsed.location && job.jobLocation) job.jobLocation.primary = parsed.location;
            if (parsed.remote != null && job.jobLocation) job.jobLocation.remote = parsed.remote;
            if (parsed.employmentType) job.employmentType = parsed.employmentType;
            if (parsed.department) job.department = parsed.department;
            if (parsed.industry && job.hiringOrganization) job.hiringOrganization.industry = parsed.industry;
            
            // Update legacy fields for backward compat
            job.parsedSkills = parsed.skills || [];
            job.parsedRoles = parsed.roles || [];
            job.matchData = matchData;
            job.blsSalary = matchJobToBLS(job.title, job.rawText || (job.raw && job.raw.text) || '');
            if (parsed.title && parsed.title !== 'Untitled Position') job.title = parsed.title;
            if (parsed.company) {
                job.company = parsed.company;
                if (job.hiringOrganization) job.hiringOrganization.name = parsed.company;
            }
            
            saveUserData();
            if (fbUser) debouncedSave();
            
            showJobDetail(idx);
            showToast('Re-analyzed: ' + matchData.score + '% match with ' + (matchData.matched || []).length + ' skills.', 'success', 5000);
        } catch (err) {
            statusEl.innerHTML = origHtml;
            showToast('Re-analysis failed: ' + (err.message || 'Unknown error'), 'error');
        }
    })();
}
if (!window.reanalyzeJob) window.reanalyzeJob = reanalyzeJob;

export function updateMatchThreshold(value) {
    currentMatchThreshold = parseInt(value);
    window._userData.preferences.minimumMatchScore = currentMatchThreshold;
    var matchEl = document.getElementById('matchValue');
    if (matchEl) matchEl.textContent = value + '%';
    window._jobsPageSize = 100;
    filterOpportunities();
    _debouncedSavePrefs();
}

export function updateMinSkillMatches(value) {
    window._userData.preferences.minimumSkillMatches = parseInt(value) || 0;
    window._jobsPageSize = 100;
    filterOpportunities();
    _debouncedSavePrefs();
}

export function updateFitMinMatch(value) {
    window._userData.preferences.minimumMatchScore = parseInt(value);
    var el = document.getElementById('fitMatchValue');
    if (el) el.textContent = value + '%';
    currentMatchThreshold = parseInt(value);
    renderFitForMe(document.getElementById('jobsSubTabContent'));
    _debouncedSavePrefs();
}

export function updateFitMinSkills(value) {
    window._userData.preferences.minimumSkillMatches = parseInt(value) || 0;
    renderFitForMe(document.getElementById('jobsSubTabContent'));
    _debouncedSavePrefs();
}

var _prefsSaveTimer = null;
export function _debouncedSavePrefs() {
    if (_prefsSaveTimer) clearTimeout(_prefsSaveTimer);
    _prefsSaveTimer = setTimeout(function() {
        saveUserData();
        if (fbUser && fbDb) debouncedSave(500);
    }, 1500);
}
if (!window.updateMatchThreshold) window.updateMatchThreshold = updateMatchThreshold;
if (!window.updateMinSkillMatches) window.updateMinSkillMatches = updateMinSkillMatches;
if (!window.updateFitMinMatch) window.updateFitMinMatch = updateFitMinMatch;
if (!window.updateFitMinSkills) window.updateFitMinSkills = updateFitMinSkills;

// [removed] extractSkillsFromJobEnhanced — dead code cleanup v4.22.0
// [removed] loadSampleData — dead code cleanup v4.22.0
// [removed] extractSkillsFromJob — dead code cleanup v4.22.0

export function filterOpportunities() {
    renderOpportunities();
}

var jobsSortOrder = 'match-desc';

export function setJobsSort(val) {
    jobsSortOrder = val;
    renderOpportunities();
}
if (!window.setJobsSort) window.setJobsSort = setJobsSort;

export function sortJobResults(jobs) {
    var sorted = jobs.slice();
    switch (jobsSortOrder) {
        case 'match-desc':
            sorted.sort(function(a, b) { return b.matchScore - a.matchScore; });
            break;
        case 'match-asc':
            sorted.sort(function(a, b) { return a.matchScore - b.matchScore; });
            break;
        case 'title-asc':
            sorted.sort(function(a, b) { return (a.title || '').localeCompare(b.title || ''); });
            break;
        case 'location-asc':
            sorted.sort(function(a, b) { return (a.location || '').localeCompare(b.location || ''); });
            break;
        case 'company-asc':
            sorted.sort(function(a, b) { return (a.company || '').localeCompare(b.company || ''); });
            break;
        default:
            sorted.sort(function(a, b) { return b.matchScore - a.matchScore; });
    }
    return sorted;
}

export function renderOpportunities() {
    if (window._jobSearchTimeout) { clearTimeout(window._jobSearchTimeout); window._jobSearchTimeout = null; }
    var minSkills = window._userData.preferences.minimumSkillMatches || 0;
    var filtered = opportunitiesData.filter(function(job) {
        if (job.matchScore < currentMatchThreshold) return false;
        if (minSkills > 0 && (job.matchedSkills || []).length < minSkills) return false;
        return true;
    });
    var resultsDiv = document.getElementById('opportunitiesResults');
    if (!resultsDiv) return;
    
    if (filtered.length === 0) {
        resultsDiv.innerHTML = '<div style="text-align:center; padding:40px;">'
            + '<p style="color:var(--text-primary);">No jobs above ' + currentMatchThreshold + '% match threshold</p>'
            + '<p style="color:var(--text-muted); font-size:0.88em; margin-top:6px;">' + opportunitiesData.length + ' total results. Try lowering the slider.</p></div>';
        return;
    }
    
    var pipelineIds = {};
    (window._userData.savedJobs || []).forEach(function(j) {
        var key = (j.title + '-' + (j.company || '')).toLowerCase();
        pipelineIds[key] = true;
    });
    
    filtered = sortJobResults(filtered);
    
    var pageSize = window._jobsPageSize || 100;
    var showing = filtered.slice(0, pageSize);
    var hasMore = filtered.length > pageSize;
    window._displayedJobs = showing;
    
    var html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding:8px 0; flex-wrap:wrap; gap:8px;">'
        + '<span style="font-size:0.88em; color:var(--text-secondary);">'
        + '<strong>' + filtered.length + '</strong> jobs'
        + (filtered.length < opportunitiesData.length ? ' (of ' + opportunitiesData.length + ' total)' : '')
        + (currentMatchThreshold > 0 ? ' above ' + currentMatchThreshold + '% match' : '')
        + '</span>'
        + '<select onchange="setJobsSort(this.value)" style="padding:4px 8px; border-radius:6px; border:1px solid var(--border); background:var(--c-input-bg-soft); color:var(--text-primary); font-size:0.82em; cursor:pointer;">'
        + '<option value="match-desc"' + (jobsSortOrder === 'match-desc' ? ' selected' : '') + '>Match % (high first)</option>'
        + '<option value="match-asc"' + (jobsSortOrder === 'match-asc' ? ' selected' : '') + '>Match % (low first)</option>'
        + '<option value="title-asc"' + (jobsSortOrder === 'title-asc' ? ' selected' : '') + '>Title A\u2013Z</option>'
        + '<option value="company-asc"' + (jobsSortOrder === 'company-asc' ? ' selected' : '') + '>Company A\u2013Z</option>'
        + '<option value="location-asc"' + (jobsSortOrder === 'location-asc' ? ' selected' : '') + '>Location A\u2013Z</option>'
        + '</select>'
        + '</div>';
    
    html += '<div style="display:flex; flex-direction:column; gap:12px;">';
    
    showing.forEach(function(job, idx) {
        var pipelineKey = (job.title + '-' + (job.company || '')).toLowerCase();
        var alreadyInPipeline = pipelineIds[pipelineKey];
        var displayScore = job.matchScore;
        var matchColor = displayScore >= 70 ? '#10b981' : displayScore >= 45 ? '#f59e0b' : '#6b7280';
        var jobUrl = (job.url && /^https?:\/\//i.test(job.url)) ? escapeHtml(job.url) : '#';
        var salary = job.salary || '';
        
        html += '<div style="padding:16px 20px; border-radius:10px; border:1px solid ' + (displayScore >= 70 ? 'rgba(16,185,129,0.3)' : 'var(--border)') + '; '
            + 'background:var(--c-input-bg-soft); transition:border-color 0.2s;">'
            
            // Header row
            + '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:10px;">'
            + '<div style="flex:1; min-width:0;">'
            + '<a href="' + jobUrl + '" target="_blank" rel="noopener noreferrer" style="font-size:1.05em; font-weight:600; color:var(--text-primary); text-decoration:none; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"'
            + ' onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text-primary)\'">' + escapeHtml(job.title) + '</a>'
            + '<div style="font-size:0.88em; color:var(--text-muted); margin-top:2px;">'
            + escapeHtml(job.company || 'Unknown') + (job.location ? ' \u00B7 ' + escapeHtml(job.location) : '') + '</div>'
            + '</div>'
            + '<div style="text-align:center; min-width:56px;">'
            + '<div style="font-size:1.4em; font-weight:700; color:' + matchColor + ';">' + displayScore + '%</div>'
            + '<div style="font-size:0.68em; color:var(--text-muted);">match</div>'
            + '</div></div>'
            
            // Meta row
            + '<div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:10px; font-size:0.82em; color:var(--text-muted);">'
            + (job.type ? '<span>' + bpIcon('briefcase',12) + ' ' + job.type + '</span>' : '')
            + (salary ? '<span>' + bpIcon('dollar',12) + ' ' + salary + '</span>' : '')
            + '<span style="color:' + ({JSearch:'#60a5fa', Remotive:'#10b981', USAJobs:'#8b5cf6', Himalayas:'#f59e0b', Jobicy:'#ec4899', Adzuna:'#fb923c', 'The Muse':'#06b6d4'}[job.source] || '#3b82f6') + ';">'
            + bpIcon('external',12) + ' ' + (job.source || 'Remote') + '</span>'
            + '</div>'
            
            // Matched skills chips
            + (job.matchedSkills.length > 0 ? '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">'
            + job.matchedSkills.slice(0, 6).map(function(s) {
                return '<span style="padding:2px 8px; border-radius:10px; font-size:0.75em; '
                    + 'background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2);">' + s + '</span>';
            }).join('')
            + (job.matchedSkills.length > 6 ? '<span style="font-size:0.75em; color:var(--text-muted); padding:2px 6px;">+' + (job.matchedSkills.length - 6) + ' more</span>' : '')
            + '</div>' : '')
            
            // Gap skills
            + (job.gapSkills && job.gapSkills.length > 0 ? '<div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;">'
            + job.gapSkills.slice(0, 4).map(function(s) {
                return '<span style="padding:2px 8px; border-radius:10px; font-size:0.72em; '
                    + 'background:rgba(239,68,68,0.06); color:#ef4444; border:1px solid rgba(239,68,68,0.15);">' + s + '</span>';
            }).join('')
            + '</div>' : '')
            
            // Actions
            + '<div style="display:flex; gap:8px; align-items:center;">'
            + '<a href="' + jobUrl + '" target="_blank" rel="noopener noreferrer" style="padding:5px 12px; border-radius:6px; font-size:0.82em; '
            + 'background:none; border:1px solid var(--border); color:var(--accent); text-decoration:none; cursor:pointer; '
            + 'display:inline-flex; align-items:center; gap:4px;">' + bpIcon('external',12) + ' View</a>'
            + (alreadyInPipeline
                ? '<span style="font-size:0.78em; color:#10b981; display:inline-flex; align-items:center; gap:4px;">' + bpIcon('check',12) + ' In Pipeline</span>'
                : '<button onclick="addRemoteJobToPipeline(' + idx + ')" style="padding:5px 12px; border-radius:6px; font-size:0.82em; '
                + 'background:var(--accent); border:none; color:#fff; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">'
                + bpIcon('plus',12) + ' Add to Pipeline</button>')
            + '</div>'
            
            + '</div>';
    });
    
    html += '</div>';
    
    // "Show More" button if there are more results
    if (hasMore) {
        html += '<div style="text-align:center; padding:20px;">'
            + '<button onclick="window._jobsPageSize=' + (pageSize + 100) + ';renderOpportunities();" '
            + 'style="padding:10px 28px; background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.88em;">'
            + 'Show More (' + (filtered.length - pageSize) + ' remaining)</button></div>';
    }
    
    resultsDiv.innerHTML = html;
}

var JOBS_PROXY_URL = '/api/job-search';
var JOBS_PROXY_AVAILABLE = null;
var jobsDbCount = parseInt(safeGet('bpJobsDbCount') || '0');
var jobsSourceCounts = safeParse(safeGet('bpJobsSourceCounts'), {});
var jobsSeenIds = safeParse(safeGet('bpJobsSeenIds'), []);

export function formatJobsCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k+';
    return n > 0 ? String(n) : '';
}

export function updateJobsDbCount(data) {
    if (!data || !data.sources) return;
    var updated = false;
    
    // Track per-source counts (highest seen)
    Object.keys(data.sources).forEach(function(src) {
        var s = data.sources[src];
        if (s.count && s.count > 0 && !s.error) {
            jobsSourceCounts[src] = Math.max(jobsSourceCounts[src] || 0, s.count);
            updated = true;
        }
    });
    
    // Track unique job IDs seen across all searches
    (data.jobs || []).forEach(function(j) {
        if (j.id && jobsSeenIds.indexOf(j.id) === -1) {
            jobsSeenIds.push(j.id);
            updated = true;
        }
    });
    
    // Cap stored IDs to prevent localStorage bloat (keep last 15000)
    if (jobsSeenIds.length > 15000) {
        jobsSeenIds = jobsSeenIds.slice(-15000);
    }
    
    jobsDbCount = jobsSeenIds.length;
    
    if (updated) {
        safeSet('bpJobsDbCount', String(jobsDbCount));
        safeSet('bpJobsSourceCounts', JSON.stringify(jobsSourceCounts));
        safeSet('bpJobsSeenIds', JSON.stringify(jobsSeenIds));
    }
}

export function getJobsSourceBreakdown() {
    var labels = { jsearch: 'JSearch', remotive: 'Remotive', usajobs: 'USAJobs', himalayas: 'Himalayas', jobicy: 'Jobicy', adzuna: 'Adzuna', themuse: 'The Muse' };
    return Object.keys(jobsSourceCounts).map(function(src) {
        return (labels[src] || src) + ': ' + (jobsSourceCounts[src] || 0).toLocaleString();
    }).join(' \u00B7 ');
}

// ===== JOBS CACHE (Firestore-first architecture) =====
var jobsCacheLoaded = false;
var jobsCacheData = [];
var jobsSyncMeta = null;

export function loadJobsFromCache() {
    if (!fbDb) return;
    
    var resultsDiv = document.getElementById('opportunitiesResults');
    if (resultsDiv && opportunitiesData.length === 0) {
        resultsDiv.innerHTML = '<div style="text-align:center; padding:40px;">'
            + '<div class="loading-spinner" style="width:32px; height:32px; border-width:3px; margin:0 auto 12px;"></div>'
            + '<p style="font-size:0.88em; color:var(--text-muted);">Loading jobs from database...</p></div>';
    }
    
    // Load sync metadata
    fbDb.collection('meta').doc('jobsSync').get().then(function(doc) {
        if (doc.exists) {
            jobsSyncMeta = doc.data();
            updateSyncStatusDisplay();
            // Update admin Data Libraries tile if visible
            var jt = document.getElementById('adminJobsTile');
            if (jt) {
                var count = jobsSyncMeta.totalJobs || 0;
                jt.querySelector('div[style*="font-size:1.5em"]').textContent = count.toLocaleString();
                jt.querySelector('div[style*="top:8px"]').textContent = '\u25CF';
                jt.querySelector('div[style*="top:8px"]').style.color = '#10b981';
                jt.style.borderColor = 'var(--c-border-faint)';
                var lc = document.getElementById('adminLibsLoadedCount');
                if (lc) lc.textContent = '14/14 libraries loaded';
            }
        }
    }).catch(function(e) { console.warn('Sync meta load failed:', e.message); });
    
    // Load cached jobs
    fbDb.collection('jobs')
        .orderBy('syncedAt', 'desc')
        .limit(10000)
        .get()
        .then(function(snapshot) {
            jobsCacheData = [];
            snapshot.forEach(function(doc) {
                var d = doc.data();
                d._docId = doc.id;
                jobsCacheData.push(d);
            });
            jobsCacheLoaded = true;
            
            // Content-based dedup: remove duplicates with same title+company
            var seen = {};
            var beforeCount = jobsCacheData.length;
            jobsCacheData = jobsCacheData.filter(function(j) {
                var key = ((j.title || '') + '|' + (j.company || '')).toLowerCase().trim();
                if (seen[key]) return false;
                seen[key] = true;
                return true;
            });
            if (jobsCacheData.length < beforeCount) {
                console.log('Jobs dedup: removed ' + (beforeCount - jobsCacheData.length) + ' duplicates (' + beforeCount + ' → ' + jobsCacheData.length + ')');
            }
            
            console.log('Jobs cache loaded: ' + jobsCacheData.length + ' jobs from Firestore');
            updateJobsBadge();
            
            if (jobsCacheData.length > 0) {
                scoreAndDisplayCachedJobs();
            } else if (resultsDiv) {
                resultsDiv.innerHTML = '<div style="text-align:center; padding:40px;">'
                    + '<div style="margin-bottom:16px; opacity:0.35;">' + bpIcon('search', 48) + '</div>'
                    + '<p style="font-size:1em; color:var(--text-secondary);">No cached jobs yet.</p>'
                    + '<p style="font-size:0.85em; color:var(--text-muted); margin-top:6px;">First sync will run automatically. Use Search Live to query APIs directly.</p></div>';
            }
        })
        .catch(function(e) {
            console.warn('Jobs cache load failed:', e.message);
            jobsCacheLoaded = true;
            if (resultsDiv) {
                resultsDiv.innerHTML = '<div style="text-align:center; padding:40px;">'
                    + '<p style="font-size:0.88em; color:var(--text-muted);">Cache unavailable. Use Search Live to query APIs directly.</p></div>';
            }
        });
}

export function scoreAndDisplayCachedJobs(filterKw, filterLoc, filterRemote) {
    var kw = (filterKw || '').toLowerCase();
    var loc = (filterLoc || '').toLowerCase();
    
    var filtered = jobsCacheData;
    if (kw || loc || filterRemote) {
        filtered = jobsCacheData.filter(function(job) {
            if (kw && !((job.title || '').toLowerCase().indexOf(kw) !== -1
                || (job.description || '').toLowerCase().indexOf(kw) !== -1
                || (job.company || '').toLowerCase().indexOf(kw) !== -1
                || (job.tags || []).some(function(t) { return (t || '').toLowerCase().indexOf(kw) !== -1; }))) {
                return false;
            }
            if (loc && !((job.location || '').toLowerCase().indexOf(loc) !== -1)) return false;
            if (filterRemote && !job.remote) return false;
            return true;
        });
    }
    
    opportunitiesData = filtered.map(function(job) {
        var match = quickScoreJob(job.title, job.description, job.tags);
        job.matchScore = match.score;
        job.matchedSkills = match.matched;
        job.gapSkills = match.gaps;
        return job;
    });
    
    var seen = {};
    opportunitiesData = opportunitiesData.filter(function(job) {
        if (job.title) job.title = decodeHtmlEntities(job.title);
        if (job.company) job.company = decodeHtmlEntities(job.company);
        var key = (job.title + '-' + job.company).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seen[key]) return false;
        seen[key] = true;
        return true;
    });
    
    opportunitiesData.sort(function(a, b) { return b.matchScore - a.matchScore; });
    
    var cacheLabel = kw || loc || filterRemote
        ? filtered.length + ' matched from ' + jobsCacheData.length + ' cached'
        : jobsCacheData.length + ' cached jobs';
    window._findJobsSources = cacheLabel;
    
    jobsDbCount = jobsCacheData.length;
    
    renderOpportunities();
}

export function formatTimeAgo(ts) {
    if (!ts) return '';
    var date = ts.toDate ? ts.toDate() : new Date(ts);
    var diff = Date.now() - date.getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
    return Math.floor(mins / 1440) + 'd ago';
}

export function updateSyncStatusDisplay() {
    var el = document.getElementById('jobsSyncStatus');
    if (!el) return;
    if (!jobsSyncMeta) { el.innerHTML = ''; return; }
    
    var ago = formatTimeAgo(jobsSyncMeta.lastSync);
    var total = (jobsSyncMeta.totalJobs || 0).toLocaleString();
    var src = jobsSyncMeta.sourceCounts || {};
    var srcParts = Object.keys(src).filter(function(k) { return src[k] > 0 && k !== 'jooble'; }).map(function(k) {
        return k + ': ' + src[k];
    });
    var groupLabel = jobsSyncMeta.syncGroup ? ' (group ' + jobsSyncMeta.syncGroup + ')' : '';
    
    el.innerHTML = '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">'
        + '<span style="font-size:0.75em; color:var(--text-muted);">\uD83D\uDD04 Synced ' + ago + groupLabel + '</span>'
        + '<span style="font-size:0.75em; color:var(--accent); font-weight:600;">' + total + ' jobs in database</span>'
        + (srcParts.length > 0 ? '<span style="font-size:0.68em; color:var(--text-muted);">' + srcParts.join(' \u00B7 ') + '</span>' : '')
        + '</div>';
    
    updateJobsBadge();
}

export function updateJobsBadge() {
    var el = document.getElementById('jobsDbBadge');
    if (!el) return;
    var count = jobsSyncMeta ? (jobsSyncMeta.totalJobs || 0) : jobsCacheData.length;
    if (count < 1) { el.innerHTML = ''; return; }
    el.innerHTML = '<div title="' + escapeHtml(getJobsSourceBreakdown() || 'From Firestore cache') + '" style="text-align:right; padding:10px 18px; background:linear-gradient(135deg, var(--accent), #8b5cf6); border-radius:10px; min-width:120px; cursor:help;">'
        + '<div style="font-size:1.6em; font-weight:800; color:#fff; line-height:1;">' + count.toLocaleString() + '</div>'
        + '<div style="font-size:0.68em; color:rgba(255,255,255,0.8); text-transform:uppercase; letter-spacing:0.08em;">jobs in database</div></div>';
}

export function searchOpportunities() {
    if (demoGate('Find Jobs')) return;
    var keyword = (document.getElementById('findJobsKeyword') || {}).value || '';
    keyword = keyword.trim();
    if (!keyword) { showToast('Enter a keyword to search.', 'info'); return; }
    window._lastJobSearch = keyword;
    
    var location = (document.getElementById('findJobsLocation') || {}).value || '';
    location = location.trim();
    window._lastJobLocation = location;
    
    var remoteOnly = (document.getElementById('findJobsRemote') || {}).checked || false;
    window._lastJobRemote = remoteOnly;
    
    searchLiveFromAPIs();
}

export function searchLiveFromAPIs() {
    if (demoGate('Find Jobs')) return;
    var keyword = (document.getElementById('findJobsKeyword') || {}).value || '';
    keyword = keyword.trim();
    if (!keyword) { showToast('Enter a keyword to search live.', 'info'); return; }
    window._lastJobSearch = keyword;
    
    var location = (document.getElementById('findJobsLocation') || {}).value || '';
    location = location.trim();
    window._lastJobLocation = location;
    
    var category = (document.getElementById('findJobsCategory') || {}).value || '';
    var remoteOnly = (document.getElementById('findJobsRemote') || {}).checked || false;
    window._lastJobRemote = remoteOnly;
    
    var resultsDiv = document.getElementById('opportunitiesResults');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = '<div style="text-align:center; padding:40px;">'
        + '<div class="loading-spinner" style="width:32px; height:32px; border-width:3px; margin:0 auto 12px;"></div>'
        + '<p style="font-size:1em; color:var(--text-secondary);">Searching job sources...</p>'
        + '<p style="font-size:0.82em; color:var(--text-muted); margin-top:6px;">Aggregating results from multiple job boards</p>'
        + '</div>';
    
    var searchId = Date.now();
    window._currentJobSearchId = searchId;
    window._jobSearchTimeout = setTimeout(function() {
        if (window._currentJobSearchId !== searchId) return;
        if (resultsDiv && resultsDiv.querySelector('.loading-spinner')) {
            if (opportunitiesData && opportunitiesData.length > 0) {
                renderOpportunities();
                showToast('Some job sources timed out. Showing partial results.', 'info', 4000);
            } else {
                resultsDiv.innerHTML = '<div style="text-align:center; padding:40px 20px;">'
                    + '<div style="margin-bottom:16px; opacity:0.35;">' + bpIcon('search',48) + '</div>'
                    + '<p style="font-size:1.05em; color:var(--text-primary); margin-bottom:8px;">Search timed out</p>'
                    + '<p style="color:var(--text-muted); font-size:0.88em;">Job sources took too long to respond. Please try again.</p></div>';
            }
        }
    }, 30000);
    
    if (JOBS_PROXY_AVAILABLE !== false) {
        searchViaProxy(keyword, location, category, remoteOnly, resultsDiv);
    } else {
        searchDirect(keyword, category, resultsDiv);
    }
}
if (!window.searchLiveFromAPIs) window.searchLiveFromAPIs = searchLiveFromAPIs;

async function searchViaProxy(keyword, location, category, remoteOnly, resultsDiv) {
    try {
        // HYBRID MODE: Proxy handles JSearch/Remotive/USAJobs/Himalayas/Jobicy
        // Browser directly calls Adzuna/Muse with user-entered keys in parallel
        var proxyPromise = (async function() {
            var params = new URLSearchParams({ q: keyword });
            if (location) params.set('location', location);
            if (category) params.set('category', category);
            if (remoteOnly) params.set('remote', 'true');
            
            var res = await fetch(JOBS_PROXY_URL + '?' + params.toString(), { signal: AbortSignal.timeout(25000) });
            if (!res.ok) throw new Error('Proxy returned ' + res.status);
            return res.json();
        })().catch(function(e) { console.warn('Proxy:', e.message); return { jobs: [], sources: {} }; });
        
        // Direct keyed API calls (only fire if keys are configured)
        var adzunaPromise = fetchAdzunaJobs(keyword, location)
            .then(function(r) { trackAPICall('adzuna'); if (r.length > 0) recordApiHealth('adzuna', 'ok', r.length + ' results'); return { jobs: r, source: 'adzuna', count: r.length }; })
            .catch(function(e) { console.warn('Adzuna direct:', e.message); recordApiHealth('adzuna', 'down', e.message); return { jobs: [], source: 'adzuna', error: e.message }; });
        
        var musePromise = fetchMuseJobs(keyword, category, location)
            .then(function(r) { trackAPICall('themuse'); if (r.length > 0) recordApiHealth('themuse', 'ok', r.length + ' results'); return { jobs: r, source: 'themuse', count: r.length }; })
            .catch(function(e) { console.warn('Muse direct:', e.message); recordApiHealth('themuse', 'down', e.message); return { jobs: [], source: 'themuse', error: e.message }; });
        
        
        var results = await Promise.all([proxyPromise, adzunaPromise, musePromise]);
        var proxyData = results[0];
        var directResults = [results[1], results[2]];
        
        JOBS_PROXY_AVAILABLE = !!(proxyData.jobs && proxyData.jobs.length > 0) || JOBS_PROXY_AVAILABLE;
        updateJobsDbCount(proxyData);
        
        // Track proxy source API calls + record health
        if (proxyData.sources) {
            Object.keys(proxyData.sources).forEach(function(src) {
                if (!proxyData.sources[src].error) {
                    trackAPICall(src);
                    recordApiHealth(src, 'ok', (proxyData.sources[src].count || 0) + ' results');
                } else {
                    recordApiHealth(src, 'down', proxyData.sources[src].error);
                }
            });
        }
        
        // Merge proxy jobs + direct keyed API jobs
        var proxyJobs = (proxyData.jobs || []).map(function(job) {
            var match = quickScoreJob(job.title, job.description, job.tags);
            job.matchScore = match.score;
            job.matchedSkills = match.matched;
            job.gapSkills = match.gaps;
            return job;
        });
        
        var directJobs = [];
        directResults.forEach(function(r) { directJobs = directJobs.concat(r.jobs || []); });
        
        var allJobs = proxyJobs.concat(directJobs);
        
        // Deduplicate + decode HTML entities from APIs
        var seen = {};
        opportunitiesData = allJobs.filter(function(job) {
            if (job.title) job.title = decodeHtmlEntities(job.title);
            if (job.company) job.company = decodeHtmlEntities(job.company);
            var key = (job.title + '-' + job.company).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
        
        opportunitiesData.sort(function(a, b) { return b.matchScore - a.matchScore; });
        
        // Build source status line
        var sources = [];
        if (proxyData.sources) {
            Object.keys(proxyData.sources).forEach(function(src) {
                var s = proxyData.sources[src];
                if (s.error) sources.push(src + ': \u2717');
                else sources.push(src + ': ' + (s.count || 0));
            });
        }
        directResults.forEach(function(r) {
            if (r.error) sources.push(r.source + ': \u2717');
            else if (r.count > 0) sources.push(r.source + ': ' + r.count);
            else if (r.source === 'adzuna' && !ADZUNA_APP_ID) sources.push('adzuna: no key');
            else sources.push(r.source + ': 0');
        });
        window._findJobsSources = sources.join(' \u00B7 ');
        
        // Log any source errors for debugging
        if (proxyData.sources) {
            Object.keys(proxyData.sources).forEach(function(src) {
                var s = proxyData.sources[src];
                if (s.error) console.warn('Job source ' + src + ' error:', s.error, s.detail || '');
            });
        }
        
        console.log('Find Jobs (hybrid): ' + opportunitiesData.length + ' results (' + proxyJobs.length + ' proxy + ' + directJobs.length + ' direct). Sources:', window._findJobsSources);
        
        if (opportunitiesData.length === 0) {
            resultsDiv.innerHTML = '<div style="text-align:center; padding:40px 20px;">'
                + '<div style="margin-bottom:16px; opacity:0.35;">' + bpIcon('search',48) + '</div>'
                + '<p style="font-size:1.05em; color:var(--text-primary); margin-bottom:8px;">No matching jobs found</p>'
                + '<p style="color:var(--text-muted); font-size:0.88em;">Try different keywords, adjust location, or lower the match threshold.</p></div>';
            return;
        }
        
        renderOpportunities();
        
    } catch(e) {
        console.warn('Jobs hybrid failed:', e.message);
        JOBS_PROXY_AVAILABLE = false;
        searchDirect(keyword, (document.getElementById('findJobsCategory') || {}).value || '', resultsDiv);
    }
}

// Fallback: direct browser calls (CORS may block some)
export function searchDirect(keyword, category, resultsDiv) {
    var _apiFailCount = 0;
    var _apiStatus = {};
    
    Promise.all([
        fetchRemotiveJobs2(keyword, category).then(function(r) { _apiStatus.remotive = r.length; recordApiHealth('remotive', 'ok', r.length + ' results'); return r; }).catch(function(e) { _apiFailCount++; _apiStatus.remotive = 'failed'; recordApiHealth('remotive', 'down', e.message); console.warn('Remotive:', e.message); return []; }),
        fetchHimalayasJobs(keyword).then(function(r) { _apiStatus.himalayas = r.length; recordApiHealth('himalayas', 'ok', r.length + ' results'); return r; }).catch(function(e) { _apiFailCount++; _apiStatus.himalayas = 'failed'; recordApiHealth('himalayas', 'down', e.message); console.warn('Himalayas:', e.message); return []; }),
        fetchJobicyJobs(keyword, category).then(function(r) { _apiStatus.jobicy = r.length; recordApiHealth('jobicy', 'ok', r.length + ' results'); return r; }).catch(function(e) { _apiFailCount++; _apiStatus.jobicy = 'failed'; recordApiHealth('jobicy', 'down', e.message); console.warn('Jobicy:', e.message); return []; }),
        fetchAdzunaJobs(keyword, window._lastJobLocation || '').then(function(r) { _apiStatus.adzuna = r.length; if (r.length > 0) recordApiHealth('adzuna', 'ok', r.length + ' results'); return r; }).catch(function(e) { _apiStatus.adzuna = ADZUNA_APP_ID ? 'failed' : 'no key'; if (ADZUNA_APP_ID) recordApiHealth('adzuna', 'down', e.message); console.warn('Adzuna:', e.message); return []; }),
        fetchMuseJobs(keyword, category, window._lastJobLocation || '').then(function(r) { _apiStatus.themuse = r.length; if (r.length > 0) recordApiHealth('themuse', 'ok', r.length + ' results'); return r; }).catch(function(e) { _apiFailCount++; _apiStatus.themuse = 'failed'; recordApiHealth('themuse', 'down', e.message); console.warn('TheMuse:', e.message); return []; }),
    ]).then(function(results) {
        var allJobs = results[0].concat(results[1]).concat(results[2]).concat(results[3]).concat(results[4]).concat(results[5]);
        
        var seen = {};
        opportunitiesData = allJobs.filter(function(job) {
            if (job.title) job.title = decodeHtmlEntities(job.title);
            if (job.company) job.company = decodeHtmlEntities(job.company);
            var key = (job.title + '-' + job.company).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });
        
        opportunitiesData.sort(function(a, b) { return b.matchScore - a.matchScore; });
        
        console.log('Find Jobs (direct): ' + opportunitiesData.length + ' results. API status:', _apiStatus);
        
        if (opportunitiesData.length === 0) {
            var isCors = _apiFailCount >= 2;
            resultsDiv.innerHTML = '<div style="text-align:center; padding:40px 20px;">'
                + '<div style="margin-bottom:16px; opacity:0.35;">' + bpIcon('search',48) + '</div>'
                + (isCors
                    ? '<p style="font-size:1.05em; color:var(--text-primary); margin-bottom:8px;">Job APIs blocked by CORS</p>'
                      + '<p style="color:var(--text-muted); font-size:0.88em; line-height:1.6; max-width:480px; margin:0 auto 20px;">'
                      + 'Deploy the /api/job-search proxy to unlock all 7 sources including JSearch, USAJobs, and Adzuna.</p>'
                    : '<p style="font-size:1.05em; color:var(--text-primary); margin-bottom:8px;">No matching jobs found</p>'
                      + '<p style="color:var(--text-muted); font-size:0.88em;">Try different keywords or lower the match threshold.</p>')
                + '</div>';
            return;
        }
        
        var sources = [];
        Object.keys(_apiStatus).forEach(function(k) {
            sources.push(k + ': ' + (_apiStatus[k] === 'failed' ? '\u2717' : _apiStatus[k]));
        });
        window._findJobsSources = sources.join(' \u00B7 ') + ' (direct mode, deploy proxy for JSearch + USAJobs)';
        
        // Track unique jobs seen
        opportunitiesData.forEach(function(j) {
            if (j.id && jobsSeenIds.indexOf(j.id) === -1) jobsSeenIds.push(j.id);
        });
        if (jobsSeenIds.length > 15000) jobsSeenIds = jobsSeenIds.slice(-15000);
        jobsDbCount = jobsSeenIds.length;
        safeSet('bpJobsDbCount', String(jobsDbCount));
        safeSet('bpJobsSeenIds', JSON.stringify(jobsSeenIds));
        
        renderOpportunities();
    });
}

// ===== JOB BOARD API FETCH FUNCTIONS (v4.21.0) =====
// Three free, no-auth APIs: Remotive, Himalayas, Jobicy
// Uses CORS proxy as fallback for browser restrictions

var CORS_PROXIES = [
    function(url) { return url; } // Direct fetch only — third-party CORS proxies removed for security (data leakage risk)
    // TODO: Add Vercel serverless proxy at /api/cors-proxy for job boards that block browser requests
];

async function fetchWithCorsRetry(url) {
    for (var i = 0; i < CORS_PROXIES.length; i++) {
        try {
            var proxiedUrl = CORS_PROXIES[i](url);
            var response = await fetch(proxiedUrl, { signal: AbortSignal.timeout(8000) });
            if (response.ok) return await response.json();
        } catch (e) {
            if (i === CORS_PROXIES.length - 1) throw e;
        }
    }
    throw new Error('All fetch methods failed for ' + url);
}

export function quickScoreJob(title, description, tags) {
    var searchText = ((title || '') + ' ' + (description || '') + ' ' + (tags || []).join(' ')).toLowerCase();
    // Strip HTML
    searchText = searchText.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ');
    // Normalize whitespace for word boundary checks
    searchText = ' ' + searchText.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    
    var userSkills = _sd().skills || [];
    var matchedSkills = [];
    var matchWeight = 0;
    var seen = {};
    
    // Level weights: higher-level skills count more toward match quality
    var levelWeight = { 'Mastery': 3, 'Expert': 2.5, 'Advanced': 2, 'Proficient': 1.5, 'Novice': 1 };
    
    userSkills.forEach(function(skill) {
        var lower = skill.name.toLowerCase().trim();
        if (lower.length < 3) return;
        if (seen[lower]) return;
        
        // Word-boundary matching for short terms (prevents "design" matching "designated")
        var found = false;
        if (lower.length <= 6) {
            // Short terms: require word boundaries
            found = searchText.indexOf(' ' + lower + ' ') !== -1
                 || searchText.indexOf(' ' + lower + ',') !== -1
                 || searchText.indexOf(' ' + lower + '.') !== -1;
        } else {
            // Longer terms: substring is fine (e.g. "project management")
            found = searchText.indexOf(lower) !== -1;
        }
        
        if (found) {
            seen[lower] = true;
            matchedSkills.push(skill.name);
            var w = levelWeight[skill.level] || 1;
            if (skill.key) w += 0.5; // bonus for key skills
            matchWeight += w;
        }
    });
    
    // Also check synonyms
    Object.keys(SKILL_SYNONYMS).forEach(function(canonical) {
        if (seen[canonical]) return;
        var syns = SKILL_SYNONYMS[canonical];
        for (var i = 0; i < syns.length; i++) {
            if (searchText.indexOf(syns[i]) !== -1) {
                var userSkill = userSkills.find(function(s) { return s.name.toLowerCase() === canonical; });
                if (userSkill && !seen[canonical]) {
                    seen[canonical] = true;
                    matchedSkills.push(userSkill.name);
                    matchWeight += levelWeight[userSkill.level] || 1;
                }
                break;
            }
        }
    });
    
    // Extract gap skills via parseJobLocally pipeline (43K library + all blocklists)
    var gapSkills = [];
    try {
        var jdText = (title || '') + '\n' + (description || '') + '\n' + (tags || []).join(' ');
        var parsed = parseJobLocally(jdText);
        var parsedSkills = parsed.skills || [];
        parsedSkills.forEach(function(ps) {
            var psLower = ps.name.toLowerCase().trim();
            if (!seen[psLower]) {
                gapSkills.push(ps.name);
            }
        });
    } catch(e) {
        console.warn('quickScoreJob: parseJobLocally fallback', e.message);
    }
    
    // Scoring: weighted approach
    // Total possible weight = userSkills count * avg weight (~2) - we approximate expected JD requirements
    var totalPossible = matchWeight + (gapSkills.length * 1.5);
    // Most JDs require 10-15 weighted skills worth of capability
    var expectedTotal = Math.max(totalPossible, 12);
    var score = expectedTotal > 0 ? Math.round((matchWeight / expectedTotal) * 100) : 0;
    
    // Cap at 90% (quick score should never exceed pipeline's proper analysis)
    score = Math.min(90, score);
    
    return { score: score, matched: matchedSkills, gaps: gapSkills.slice(0, 8) };
}

// === REMOTIVE ===
async function fetchRemotiveJobs2(keyword, category) {
    var catMap = {
        'software-dev': 'software-dev', 'marketing': 'marketing', 'business': 'business',
        'data': 'data', 'design': 'design', 'product': 'product', 'hr': 'hr',
        'finance': 'finance-legal', 'sales': 'sales', 'customer-support': 'customer-support',
        'writing': 'writing', 'devops': 'devops-sysadmin'
    };
        var data;
        if (JOB_PROXY_AVAILABLE !== false) {
            try {
                var params = new URLSearchParams({ source: 'remotive' });
                if (keyword) params.set('q', keyword);
                if (category && catMap[category]) params.set('category', catMap[category]);
                var proxyRes = await fetch(JOB_PROXY_URL + '?' + params.toString(), { signal: AbortSignal.timeout(12000) });
                if (proxyRes.ok) {
                    data = await proxyRes.json();
                    JOB_PROXY_AVAILABLE = true;
                    console.log('Remotive: via proxy, ' + ((data.jobs || []).length) + ' results');
                } else throw new Error('Proxy ' + proxyRes.status);
            } catch(proxyErr) {
                console.warn('Remotive proxy failed, trying direct:', proxyErr.message);
                JOB_PROXY_AVAILABLE = false;
                var url = 'https://remotive.com/api/remote-jobs?limit=50';
                if (category && catMap[category]) url += '&category=' + catMap[category];
                if (keyword) url += '&search=' + encodeURIComponent(keyword);
                var res = await fetch(url, { signal: AbortSignal.timeout(12000) });
                if (!res.ok) throw new Error('Remotive direct ' + res.status);
                data = await res.json();
                console.log('Remotive: direct, ' + ((data.jobs || []).length) + ' results');
            }
        } else {
            var url2 = 'https://remotive.com/api/remote-jobs?limit=50';
            if (category && catMap[category]) url2 += '&category=' + catMap[category];
            if (keyword) url2 += '&search=' + encodeURIComponent(keyword);
            var res2 = await fetch(url2, { signal: AbortSignal.timeout(12000) });
            if (!res2.ok) throw new Error('Remotive direct ' + res2.status);
            data = await res2.json();
        }
        if (!data || !data.jobs) return [];
    
        return data.jobs.slice(0, 40).map(function(job) {
            var match = quickScoreJob(job.title, job.description, job.tags);
            return {
                id: 'remotive-' + job.id,
                title: job.title || 'Untitled',
                company: job.company_name || '',
                location: job.candidate_required_location || 'Worldwide',
                type: (job.job_type || 'full_time').replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }),
                url: job.url || '',
                salary: job.salary || '',
                description: (job.description || '').substring(0, 2000),
                tags: job.tags || [],
                matchScore: match.score,
                matchedSkills: match.matched,
                gapSkills: match.gaps,
                source: 'Remotive',
                pubDate: job.publication_date || ''
            };
        });
}

// === HIMALAYAS ===
async function fetchHimalayasJobs(keyword) {
        var data;
        if (JOB_PROXY_AVAILABLE !== false) {
            try {
                var params = new URLSearchParams({ source: 'himalayas' });
                var proxyRes = await fetch(JOB_PROXY_URL + '?' + params.toString(), { signal: AbortSignal.timeout(12000) });
                if (proxyRes.ok) {
                    data = await proxyRes.json();
                    JOB_PROXY_AVAILABLE = true;
                    console.log('Himalayas: via proxy, ' + (Array.isArray(data) ? data.length : 0) + ' results');
                } else throw new Error('Proxy ' + proxyRes.status);
            } catch(proxyErr) {
                console.warn('Himalayas proxy failed, trying direct:', proxyErr.message);
                JOB_PROXY_AVAILABLE = false;
                var res = await fetch('https://himalayas.app/jobs/api?limit=50', { signal: AbortSignal.timeout(12000) });
                if (!res.ok) throw new Error('Himalayas direct ' + res.status);
                data = await res.json();
                console.log('Himalayas: direct, ' + (Array.isArray(data) ? data.length : 0) + ' results');
            }
        } else {
            var res2 = await fetch('https://himalayas.app/jobs/api?limit=50', { signal: AbortSignal.timeout(12000) });
            if (!res2.ok) throw new Error('Himalayas direct ' + res2.status);
            data = await res2.json();
        }
        if (!data || !Array.isArray(data)) return [];
    
        var jobs = data;
        // Client-side keyword filter (Himalayas API doesn't support search)
        if (keyword) {
            var kw = keyword.toLowerCase();
            jobs = jobs.filter(function(job) {
                return ((job.title || '') + ' ' + (job.companyName || '') + ' ' + ((job.categories || []).join(' '))).toLowerCase().indexOf(kw) !== -1;
            });
        }
    
    return jobs.slice(0, 40).map(function(job) {
        var match = quickScoreJob(job.title, job.description, job.categories);
        var salary = '';
        if (job.minSalary && job.maxSalary) {
            salary = '$' + (job.minSalary / 1000).toFixed(0) + 'k - $' + (job.maxSalary / 1000).toFixed(0) + 'k' + (job.currency && job.currency !== 'USD' ? ' ' + job.currency : '');
        }
        return {
            id: 'himalayas-' + (job.id || Date.now()),
            title: job.title || 'Untitled',
            company: job.companyName || '',
            location: (job.locationRestrictions || []).join(', ') || 'Worldwide',
            type: job.employmentType || 'Full Time',
            url: job.applicationUrl || job.url || '',
            salary: salary,
            description: (job.description || '').substring(0, 2000),
            tags: job.categories || [],
            matchScore: match.score,
            matchedSkills: match.matched,
            gapSkills: match.gaps,
            source: 'Himalayas',
            pubDate: job.pubDate || ''
        };
    });
}

// === JOBICY ===
async function fetchJobicyJobs(keyword, category) {
    var catMap = {
        'software-dev': 'dev', 'marketing': 'marketing', 'business': 'business',
        'data': 'data-science', 'design': 'design-multimedia', 'hr': 'hr',
        'finance': 'accounting-finance', 'sales': 'seller', 'customer-support': 'supporting',
        'writing': 'copywriting', 'devops': 'dev'
    };
        var data;
        if (JOB_PROXY_AVAILABLE !== false) {
            try {
                var params = new URLSearchParams({ source: 'jobicy' });
                if (keyword) params.set('q', keyword);
                if (category && catMap[category]) params.set('industry', catMap[category]);
                var proxyRes = await fetch(JOB_PROXY_URL + '?' + params.toString(), { signal: AbortSignal.timeout(12000) });
                if (proxyRes.ok) {
                    data = await proxyRes.json();
                    JOB_PROXY_AVAILABLE = true;
                    console.log('Jobicy: via proxy, ' + ((data.jobs || []).length) + ' results');
                } else throw new Error('Proxy ' + proxyRes.status);
            } catch(proxyErr) {
                console.warn('Jobicy proxy failed, trying direct:', proxyErr.message);
                JOB_PROXY_AVAILABLE = false;
                var url = 'https://jobicy.com/api/v2/remote-jobs?count=30';
                if (keyword) url += '&tag=' + encodeURIComponent(keyword);
                if (category && catMap[category]) url += '&job_categories=' + catMap[category];
                var res = await fetch(url, { signal: AbortSignal.timeout(12000) });
                if (!res.ok) throw new Error('Jobicy direct ' + res.status);
                data = await res.json();
                console.log('Jobicy: direct, ' + ((data.jobs || []).length) + ' results');
            }
        } else {
            var url2 = 'https://jobicy.com/api/v2/remote-jobs?count=30';
            if (keyword) url2 += '&tag=' + encodeURIComponent(keyword);
            if (category && catMap[category]) url2 += '&job_categories=' + catMap[category];
            var res2 = await fetch(url2, { signal: AbortSignal.timeout(12000) });
            if (!res2.ok) throw new Error('Jobicy direct ' + res2.status);
            data = await res2.json();
        }
        if (!data || !data.jobs) return [];
    
        return data.jobs.slice(0, 30).map(function(job) {
            var match = quickScoreJob(job.jobTitle, job.jobDescription, [job.jobIndustry]);
            var salary = '';
            if (job.annualSalaryMin && job.annualSalaryMax) {
                salary = '$' + (job.annualSalaryMin / 1000).toFixed(0) + 'k - $' + (job.annualSalaryMax / 1000).toFixed(0) + 'k';
            } else if (job.salaryMin && job.salaryMax) {
                salary = '$' + (job.salaryMin / 1000).toFixed(0) + 'k - $' + (job.salaryMax / 1000).toFixed(0) + 'k';
            }
            return {
                id: 'jobicy-' + (job.id || Date.now()),
                title: job.jobTitle || 'Untitled',
                company: job.companyName || '',
                location: job.jobGeo || 'Anywhere',
                type: Array.isArray(job.jobType) ? job.jobType.join(', ') : String(job.jobType || 'Full Time'),
                url: job.url || '',
                salary: salary,
                description: (job.jobDescription || '').substring(0, 2000),
                tags: [job.jobIndustry || ''],
                matchScore: match.score,
                matchedSkills: match.matched,
                gapSkills: match.gaps,
                source: 'Jobicy',
                pubDate: job.pubDate || ''
            };
        });
}

// === ADZUNA (US market — ~3-4M jobs) ===
var ADZUNA_APP_ID = safeGet('bpAdzunaAppId') || '';
var ADZUNA_APP_KEY = safeGet('bpAdzunaAppKey') || '';
var JOB_PROXY_URL = '/api/api-job-proxy';
var JOB_PROXY_AVAILABLE = null; // null=unknown, true/false after first attempt

async function fetchAdzunaJobs(keyword, location) {
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
    
    try {
        var data;
        // Try serverless proxy first (avoids CORS), then direct
        if (JOB_PROXY_AVAILABLE !== false) {
            try {
                var params = new URLSearchParams({ source: 'adzuna', app_id: ADZUNA_APP_ID, app_key: ADZUNA_APP_KEY });
                if (keyword) params.set('q', keyword);
                if (location) params.set('location', location);
                var proxyRes = await fetch(JOB_PROXY_URL + '?' + params.toString(), { signal: AbortSignal.timeout(12000) });
                if (proxyRes.ok) {
                    data = await proxyRes.json();
                    JOB_PROXY_AVAILABLE = true;
                    console.log('Adzuna: via proxy, ' + (data.results || []).length + ' results');
                } else throw new Error('Proxy ' + proxyRes.status);
            } catch(proxyErr) {
                console.warn('Adzuna proxy failed, trying direct:', proxyErr.message);
                JOB_PROXY_AVAILABLE = false;
                // Direct fallback
                var url = 'https://api.adzuna.com/v1/api/jobs/us/search/1'
                    + '?app_id=' + encodeURIComponent(ADZUNA_APP_ID)
                    + '&app_key=' + encodeURIComponent(ADZUNA_APP_KEY)
                    + '&results_per_page=50&content-type=application/json&sort_by=date&max_days_old=30';
                if (keyword) url += '&what=' + encodeURIComponent(keyword);
                if (location) url += '&where=' + encodeURIComponent(location);
                var res = await fetch(url, { signal: AbortSignal.timeout(12000) });
                if (!res.ok) throw new Error('Adzuna direct ' + res.status);
                data = await res.json();
                console.log('Adzuna: direct, ' + (data.results || []).length + ' results');
            }
        } else {
            // Direct only (proxy known unavailable)
            var url2 = 'https://api.adzuna.com/v1/api/jobs/us/search/1'
                + '?app_id=' + encodeURIComponent(ADZUNA_APP_ID)
                + '&app_key=' + encodeURIComponent(ADZUNA_APP_KEY)
                + '&results_per_page=50&content-type=application/json&sort_by=date&max_days_old=30';
            if (keyword) url2 += '&what=' + encodeURIComponent(keyword);
            if (location) url2 += '&where=' + encodeURIComponent(location);
            var res2 = await fetch(url2, { signal: AbortSignal.timeout(12000) });
            if (!res2.ok) throw new Error('Adzuna direct ' + res2.status);
            data = await res2.json();
            console.log('Adzuna: direct, ' + (data.results || []).length + ' results');
        }
        if (!data || !data.results) return [];
        
        return data.results.map(function(job) {
            var desc = (job.description || '').substring(0, 2000);
            var match = quickScoreJob(job.title, desc, []);
            var salary = '';
            if (job.salary_min && job.salary_max) {
                salary = '$' + (job.salary_min / 1000).toFixed(0) + 'k - $' + (job.salary_max / 1000).toFixed(0) + 'k';
            } else if (job.salary_is_predicted === 0 && job.salary_min) {
                salary = '$' + (job.salary_min / 1000).toFixed(0) + 'k+';
            }
            var loc = job.location ? job.location.display_name : '';
            return {
                id: 'adzuna-' + (job.id || Date.now() + Math.random()),
                title: job.title || 'Untitled',
                company: (job.company && job.company.display_name) ? job.company.display_name : '',
                location: loc,
                type: (job.contract_time === 'full_time' ? 'Full Time' : job.contract_time === 'part_time' ? 'Part Time' : job.contract_type || 'Full Time'),
                url: job.redirect_url || '',
                salary: salary,
                description: desc,
                tags: job.category ? [job.category.label || ''] : [],
                matchScore: match.score,
                matchedSkills: match.matched,
                gapSkills: match.gaps,
                source: 'Adzuna',
                pubDate: job.created || ''
            };
        });
    } catch(e) {
        console.error('Adzuna fetch failed:', e.message);
        throw e;
    }
}

// === THE MUSE (quality professional jobs, ~10-20K listings) ===
async function fetchMuseJobs(keyword, category, location) {
    try {
        var data;
        if (JOB_PROXY_AVAILABLE !== false) {
            try {
                var params = new URLSearchParams({ source: 'muse' });
                if (category) {
                    var catMap = {
                        'software-dev': 'Engineering', 'data': 'Data Science', 'design': 'Design',
                        'marketing': 'Marketing', 'product': 'Product', 'hr': 'HR',
                        'finance': 'Finance', 'sales': 'Sales', 'business': 'Business Operations',
                        'customer-support': 'Customer Service', 'writing': 'Editorial'
                    };
                    if (catMap[category]) params.set('category', catMap[category]);
                }
                if (location) params.set('location', location);
                var museKey = safeGet('bpMuseApiKey') || '';
                if (museKey) params.set('api_key', museKey);
                var proxyRes = await fetch(JOB_PROXY_URL + '?' + params.toString(), { signal: AbortSignal.timeout(12000) });
                if (proxyRes.ok) {
                    data = await proxyRes.json();
                    JOB_PROXY_AVAILABLE = true;
                    console.log('Muse: via proxy, ' + (data.results || []).length + ' results');
                } else throw new Error('Proxy ' + proxyRes.status);
            } catch(proxyErr) {
                console.warn('Muse proxy failed, trying direct:', proxyErr.message);
                // Direct fallback
                var url = 'https://www.themuse.com/api/public/jobs?page=0';
                if (category) {
                    var catMap2 = {
                        'software-dev': 'Engineering', 'data': 'Data Science', 'design': 'Design',
                        'marketing': 'Marketing', 'product': 'Product', 'hr': 'HR',
                        'finance': 'Finance', 'sales': 'Sales', 'business': 'Business Operations',
                        'customer-support': 'Customer Service', 'writing': 'Editorial'
                    };
                    if (catMap2[category]) url += '&category=' + encodeURIComponent(catMap2[category]);
                }
                if (location) url += '&location=' + encodeURIComponent(location);
                var res = await fetch(url, { signal: AbortSignal.timeout(12000) });
                if (!res.ok) throw new Error('Muse direct ' + res.status);
                data = await res.json();
                console.log('Muse: direct, ' + (data.results || []).length + ' results');
            }
        } else {
            var url3 = 'https://www.themuse.com/api/public/jobs?page=0';
            var res3 = await fetch(url3, { signal: AbortSignal.timeout(12000) });
            if (!res3.ok) throw new Error('Muse direct ' + res3.status);
            data = await res3.json();
            console.log('Muse: direct, ' + (data.results || []).length + ' results');
        }
        if (!data || !data.results) return [];
        
        var jobs = data.results;
        if (keyword) {
            var kw = keyword.toLowerCase();
            jobs = jobs.filter(function(job) {
                return ((job.name || '') + ' ' + (job.company && job.company.name || '') + ' ' + (job.contents || '')).toLowerCase().indexOf(kw) !== -1;
            });
        }
        
        return jobs.slice(0, 20).map(function(job) {
            var desc = (job.contents || '').replace(/<[^>]+>/g, '').substring(0, 2000);
            var match = quickScoreJob(job.name, desc, (job.categories || []).map(function(c) { return c.name; }));
            var locs = (job.locations || []).map(function(l) { return l.name; }).join(', ');
            return {
                id: 'muse-' + (job.id || Date.now()),
                title: job.name || 'Untitled',
                company: (job.company && job.company.name) ? job.company.name : '',
                location: locs || 'Various',
                type: (job.type || 'Full Time'),
                url: job.refs && job.refs.landing_page ? job.refs.landing_page : '',
                salary: '',
                description: desc,
                tags: (job.categories || []).map(function(c) { return c.name; }),
                matchScore: match.score,
                matchedSkills: match.matched,
                gapSkills: match.gaps,
                source: 'The Muse',
                pubDate: job.publication_date || ''
            };
        });
    } catch(e) {
        console.error('Muse fetch failed:', e.message);
        throw e;
    }
}

// === ADD REMOTE JOB TO PIPELINE ===
async function addRemoteJobToPipeline(idx) {
    var job = (window._displayedJobs || opportunitiesData)[idx];
    if (!job) { showToast('Job not found.', 'warning'); return; }
    
    if (!window._userData.savedJobs) window._userData.savedJobs = [];
    if (window._userData.savedJobs.length >= 10) {
        showToast('Pipeline is full (10 max). Remove one first.', 'warning');
        return;
    }
    
    // Check dupe
    var key = (job.title + '-' + job.company).toLowerCase();
    var exists = window._userData.savedJobs.some(function(j) {
        return (j.title + '-' + (j.company || '')).toLowerCase() === key;
    });
    if (exists) { showToast('Already in your pipeline.', 'warning'); return; }
    
    await ensureSkillLibrary();
    var parsed = parseJobLocally(job.description || job.title);
    parsed.title = job.title;
    parsed.company = job.company;
    
    // Convert to v2 skills
    var v2Skills = (parsed.skills || []).map(function(s) {
        var name = typeof s === 'string' ? s : (s.name || '');
        if (!name) return null;
        var isObj = typeof s === 'object' && s !== null;
        return {
            name: name,
            canonical: name.toLowerCase().replace(/\s+/g, ' ').trim(),
            abbreviation: null,
            tier: normalizeTier(isObj ? (s.requirement || s.level || '') : ''),
            proficiency: (isObj && s.proficiency) || 'Proficient',
            category: (isObj && s.category) || 'technical',
            section: null,
            context: null,
            source: 'extracted',
            confidence: 0.5,
            frameworkRef: null
        };
    }).filter(Boolean).slice(0, JOB_SKILLS_CAP);
    
    var matchData = matchJobToProfile(v2Skills);
    matchData.score = job.matchScore || matchData.score;
    var blsSalary = matchJobToBLS(job.title, job.description || '');
    var now = new Date().toISOString();
    
    var pipelineJob = {
        // v2 schema
        schemaVersion: JOB_SCHEMA_VERSION,
        id: 'job_' + Date.now(),
        title: job.title,
        hiringOrganization: { name: job.company || '', sameAs: null, industry: '', size: '' },
        titleRole: null,
        titleLevel: (parsed.seniority || '').toLowerCase() || null,
        occupationalCategory: null,
        jobLocation: { primary: '', address: { locality: null, region: null, country: null }, locationType: null, remote: null, remoteDetail: '' },
        employmentType: null,
        department: null,
        postingMeta: {
            sourceUrl: job.url || '',
            sourceNote: 'Found via ' + job.source,
            datePosted: null,
            validThrough: null,
            externalId: '',
            ingestedAt: now,
            ingestMethod: 'local',
            rawTextHash: null
        },
        requirements: { skills: v2Skills, qualifications: [], responsibilities: [] },
        compensation: {
            baseSalary: { currency: 'USD', value: { minValue: null, maxValue: null, unitText: 'YEAR' } },
            estimatedSalary: blsSalary ? blsSalary.median : null,
            incentiveCompensation: null, equity: null, jobBenefits: [],
            source: blsSalary ? 'estimated' : null
        },
        companyContext: { values: { primary: [], secondary: [], source: 'jd' }, culture: [], employerOverview: null },
        raw: { text: (job.description || '').substring(0, 8000), sections: [] },
        pipeline: { status: 'active', addedAt: now, appliedAt: null, notes: '', tags: [] },
        // Legacy compat
        company: job.company,
        sourceUrl: job.url,
        sourceNote: 'Found via ' + job.source,
        rawText: (job.description || '').substring(0, 5000),
        parsedSkills: parsed.skills || [],
        parsedRoles: parsed.roles || [],
        seniority: parsed.seniority || '',
        matchData: matchData,
        blsSalary: blsSalary,
        addedAt: now
    };
    
    window._userData.savedJobs.unshift(pipelineJob);
    saveUserData();
    if (fbUser) debouncedSave();
    
    showToast(decodeHtmlEntities(job.title) + ' added to pipeline.', 'success', 4000);
    if (typeof bpTracker !== 'undefined' && bpTracker.sid) bpTracker.trackFunnel('first_job');
    
    // Re-render to update the "In Pipeline" badge
    renderOpportunities();
}
if (!window.addRemoteJobToPipeline) window.addRemoteJobToPipeline = addRemoteJobToPipeline;
// [removed] generatePitch — dead code cleanup v4.22.0




// [removed] viewOnNetwork — dead code cleanup v4.22.0



// ===== SETTINGS SYSTEM =====
if (!window._fitBuildSearchTerms) window._fitBuildSearchTerms = _fitBuildSearchTerms;
if (!window._fitSortData) window._fitSortData = _fitSortData;
if (!window._fitAddToPipeline) window._fitAddToPipeline = _fitAddToPipeline;
if (!window.initOpportunities) window.initOpportunities = initOpportunities;
if (!window.switchJobsSubTab) window.switchJobsSubTab = switchJobsSubTab;
if (!window.renderJobsSubTab) window.renderJobsSubTab = renderJobsSubTab;
if (!window.renderTrackerInJobs) window.renderTrackerInJobs = renderTrackerInJobs;
if (!window.renderSavedJobs) window.renderSavedJobs = renderSavedJobs;
if (!window.renderFindJobs) window.renderFindJobs = renderFindJobs;
if (!window.clearJobSearch) window.clearJobSearch = clearJobSearch;
if (!window.showAddJobModal) window.showAddJobModal = showAddJobModal;
if (!window.extractSPAJobData) window.extractSPAJobData = extractSPAJobData;
if (!window._extractDeepJobText) window._extractDeepJobText = _extractDeepJobText;
if (!window.extractTextFromHtml) window.extractTextFromHtml = extractTextFromHtml;
if (!window.matchJobToBLS) window.matchJobToBLS = matchJobToBLS;
if (!window.parseJobLocally) window.parseJobLocally = parseJobLocally;
if (!window.classifyRequirementLevel) window.classifyRequirementLevel = classifyRequirementLevel;
if (!window.inferJobProficiency) window.inferJobProficiency = inferJobProficiency;
if (!window.proficiencyValue) window.proficiencyValue = proficiencyValue;
if (!window.crosswalkNormalizeTitle) window.crosswalkNormalizeTitle = crosswalkNormalizeTitle;
if (!window.crosswalkDice) window.crosswalkDice = crosswalkDice;
if (!window.resolveTitle) window.resolveTitle = resolveTitle;
if (!window.getOccupationProfile) window.getOccupationProfile = getOccupationProfile;
if (!window.detectSeniority) window.detectSeniority = detectSeniority;
if (!window.adjustLevel) window.adjustLevel = adjustLevel;
if (!window.inferSkillsDeterministic) window.inferSkillsDeterministic = inferSkillsDeterministic;
if (!window.suggestMissingSkills) window.suggestMissingSkills = suggestMissingSkills;
if (!window.mergeSkillSources) window.mergeSkillSources = mergeSkillSources;
if (!window.registerInSkillLibrary) window.registerInSkillLibrary = registerInSkillLibrary;
if (!window.getSkillSynonyms) window.getSkillSynonyms = getSkillSynonyms;
if (!window.getSkillSynonymsExpanded) window.getSkillSynonymsExpanded = getSkillSynonymsExpanded;
if (!window.getRoleSuggestions) window.getRoleSuggestions = getRoleSuggestions;
if (!window.isJobV2) window.isJobV2 = isJobV2;
if (!window.getJobSkills) window.getJobSkills = getJobSkills;
if (!window.getJobRoles) window.getJobRoles = getJobRoles;
if (!window.normalizeTier) window.normalizeTier = normalizeTier;
if (!window.tierWeight) window.tierWeight = tierWeight;
if (!window.migrateJobToV2) window.migrateJobToV2 = migrateJobToV2;
if (!window.migrateAllJobsToV2) window.migrateAllJobsToV2 = migrateAllJobsToV2;
if (!window.validateJobSchema) window.validateJobSchema = validateJobSchema;
if (!window.matchJobToProfile) window.matchJobToProfile = matchJobToProfile;
if (!window.rescoreAllJobs) window.rescoreAllJobs = rescoreAllJobs;
if (!window.rescoreOneJob) window.rescoreOneJob = rescoreOneJob;
if (!window.quickAddGapSkill) window.quickAddGapSkill = quickAddGapSkill;
if (!window.confirmQuickAddGapSkill) window.confirmQuickAddGapSkill = confirmQuickAddGapSkill;
if (!window.quickAddSuggested) window.quickAddSuggested = quickAddSuggested;
if (!window.showJobDetail) window.showJobDetail = showJobDetail;
if (!window.removeJob) window.removeJob = removeJob;
if (!window.editJobInfo) window.editJobInfo = editJobInfo;
if (!window.saveJobEdit) window.saveJobEdit = saveJobEdit;
if (!window.reanalyzeJob) window.reanalyzeJob = reanalyzeJob;
if (!window.updateMatchThreshold) window.updateMatchThreshold = updateMatchThreshold;
if (!window.updateMinSkillMatches) window.updateMinSkillMatches = updateMinSkillMatches;
if (!window.updateFitMinMatch) window.updateFitMinMatch = updateFitMinMatch;
if (!window.updateFitMinSkills) window.updateFitMinSkills = updateFitMinSkills;
if (!window._debouncedSavePrefs) window._debouncedSavePrefs = _debouncedSavePrefs;
if (!window.filterOpportunities) window.filterOpportunities = filterOpportunities;
if (!window.setJobsSort) window.setJobsSort = setJobsSort;
if (!window.sortJobResults) window.sortJobResults = sortJobResults;
if (!window.renderOpportunities) window.renderOpportunities = renderOpportunities;
if (!window.formatJobsCount) window.formatJobsCount = formatJobsCount;
if (!window.updateJobsDbCount) window.updateJobsDbCount = updateJobsDbCount;
if (!window.getJobsSourceBreakdown) window.getJobsSourceBreakdown = getJobsSourceBreakdown;
if (!window.loadJobsFromCache) window.loadJobsFromCache = loadJobsFromCache;
if (!window.scoreAndDisplayCachedJobs) window.scoreAndDisplayCachedJobs = scoreAndDisplayCachedJobs;
if (!window.formatTimeAgo) window.formatTimeAgo = formatTimeAgo;
if (!window.updateSyncStatusDisplay) window.updateSyncStatusDisplay = updateSyncStatusDisplay;
if (!window.updateJobsBadge) window.updateJobsBadge = updateJobsBadge;
if (!window.searchOpportunities) window.searchOpportunities = searchOpportunities;
if (!window.searchLiveFromAPIs) window.searchLiveFromAPIs = searchLiveFromAPIs;
if (!window.searchDirect) window.searchDirect = searchDirect;
if (!window.quickScoreJob) window.quickScoreJob = quickScoreJob;
