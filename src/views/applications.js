// views/applications.js — Blueprint v4.46.21
// Phase 7d extraction — Applications tracker + skills management

import { bpIcon }                         from '../ui/icons.js';
import { escapeHtml, sanitizeImport }     from '../core/security.js';
import { showToast }                      from '../ui/toast.js';
import { _sd, _bd, waitForUserData }      from '../core/data-helpers.js';

// ===== APPLICATIONS TRACKER SYSTEM =====

export async function initApplications() {
    if (!window._userData || !window._userData.initialized) {
        await waitForUserData();
    }
    const view = document.getElementById('applicationsView');
    
    view.innerHTML = `
        <div class="applications-header">
            <h2 style="font-size: 2em; color: #60a5fa; margin-bottom: 10px;">Application Tracker</h2>
            <p style="color: #9ca3af; margin-bottom: 20px;">Track your job applications and follow-ups</p>
            <button class="export-btn-large" onclick="addApplicationModal()" style="display: inline-flex; align-items: center; gap: 8px;">
                ${bpIcon("plus",14)} Add Application
            </button>
        </div>
        
        <div id="applicationsContainer"></div>
    `;
    
    renderApplications();
}

export function renderApplications() {
    const container = document.getElementById('applicationsContainer');
    
    if (!window._userData.applications || window._userData.applications.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #9ca3af;">
                <div style="margin-bottom: 20px;">${bpIcon("clipboard",48)}</div>
                <h3 style="color: #d1d5db; margin-bottom: 10px;">No applications tracked yet</h3>
                <p>Click "Add Application" above to start tracking your job search</p>
                <div style="margin-top: 30px; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto;">
                    <strong style="color: #60a5fa;">Track from Opportunities:</strong>
                    <p style="font-size: 0.9em; margin-top: 8px;">When you generate a pitch for a job, you'll have the option to automatically add it to your application tracker.</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Group by status
    const grouped = {
        applied: window._userData.applications.filter(a => a.status === 'applied'),
        interviewing: window._userData.applications.filter(a => a.status === 'interviewing'),
        offer: window._userData.applications.filter(a => a.status === 'offer'),
        rejected: window._userData.applications.filter(a => a.status === 'rejected')
    };
    
    container.innerHTML = `
        <div style="margin-bottom: 30px; display: flex; gap: 15px; flex-wrap: wrap;">
            <div class="application-status status-applied">${grouped.applied.length} Applied</div>
            <div class="application-status status-interviewing">${grouped.interviewing.length} Interviewing</div>
            <div class="application-status status-offer">${grouped.offer.length} Offers</div>
            <div class="application-status status-rejected">${grouped.rejected.length} Closed</div>
        </div>
        
        <div class="applications-grid">
            ${window._userData.applications.map((app, idx) => renderApplicationCard(app, idx)).join('')}
        </div>
    `;
}

export function renderApplicationCard(app, idx) {
    const statusLabels = {
        applied: 'Applied',
        interviewing: 'Interviewing',
        offer: 'Offer Received',
        rejected: 'Closed'
    };
    
    return `
        <div class="application-card">
            <div class="application-status status-${app.status}">
                ${statusLabels[app.status]}
            </div>
            
            <div class="application-title">${app.title}</div>
            <div class="application-company">${app.company}</div>
            
            <div class="application-meta-grid">
                <div class="application-meta-item">
                    <div class="application-meta-label">Applied</div>
                    <div class="application-meta-value">${new Date(app.appliedDate).toLocaleDateString()}</div>
                </div>
                <div class="application-meta-item">
                    <div class="application-meta-label">Match</div>
                    <div class="application-meta-value">${app.matchScore || 'N/A'}%</div>
                </div>
                ${app.salary ? `
                    <div class="application-meta-item">
                        <div class="application-meta-label">Salary</div>
                        <div class="application-meta-value">${app.salary}</div>
                    </div>
                ` : ''}
                ${app.nextFollowUp ? `
                    <div class="application-meta-item">
                        <div class="application-meta-label">Follow Up</div>
                        <div class="application-meta-value">${new Date(app.nextFollowUp).toLocaleDateString()}</div>
                    </div>
                ` : ''}
            </div>
            
            ${app.notes ? `
                <div class="application-notes">
                    ${bpIcon("edit",12)} ${app.notes}
                </div>
            ` : ''}
            
            <div class="application-actions">
                <button class="application-btn" onclick="updateApplicationStatus(${idx})">
                    ${bpIcon("clock",12)} Update Status
                </button>
                <button class="application-btn" onclick="editApplication(${idx})">
                    ✏️ Edit
                </button>
                ${app.url ? `
                    <button class="application-btn" onclick="window.open('${sanitizeUrl(app.url)}', '_blank')">
                        ${bpIcon("external",12)} View Job
                    </button>
                ` : ''}
                <button class="application-btn delete" onclick="deleteApplication(${idx})">
                    ${bpIcon("trash",14)} Remove
                </button>
            </div>
        </div>
    `;
}

export function addApplicationModal(jobData = null) {
    if (readOnlyGuard()) return;
    const modal = document.getElementById('exportModal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-left">
                <h2 class="modal-title">Add Application</h2>
                <p style="color: #9ca3af; margin-top: 5px;">Track a job you've applied to</p>
            </div>
            <button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">×</button>
        </div>
        <div class="modal-body" style="padding: 30px;">
            <div style="display: grid; gap: 20px;">
                <div>
                    <label class="settings-label">Job Title *</label>
                    <input type="text" id="appTitle" value="${jobData?.title || ''}" class="settings-input" required>
                </div>
                
                <div>
                    <label class="settings-label">Company *</label>
                    <input type="text" id="appCompany" value="${jobData?.company || ''}" class="settings-input" required>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label class="settings-label">Applied Date *</label>
                        <input type="date" id="appDate" value="${new Date().toISOString().split('T')[0]}" class="settings-input" required>
                    </div>
                    <div>
                        <label class="settings-label">Status</label>
                        <select id="appStatus" class="settings-select">
                            <option value="applied">Applied</option>
                            <option value="interviewing">Interviewing</option>
                            <option value="offer">Offer Received</option>
                            <option value="rejected">Closed</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label class="settings-label">Salary Range</label>
                        <input type="text" id="appSalary" value="${jobData?.salary || ''}" placeholder="e.g., $150k-$200k" class="settings-input">
                    </div>
                    <div>
                        <label class="settings-label">Match Score</label>
                        <input type="number" id="appMatch" value="${jobData?.matchScore || ''}" min="0" max="100" class="settings-input">
                    </div>
                </div>
                
                <div>
                    <label class="settings-label">Job URL</label>
                    <input type="url" id="appUrl" value="${jobData?.url || ''}" placeholder="https://" class="settings-input">
                </div>
                
                <div>
                    <label class="settings-label">Follow-Up Date</label>
                    <input type="date" id="appFollowUp" class="settings-input">
                </div>
                
                <div>
                    <label class="settings-label">Notes</label>
                    <textarea id="appNotes" class="purpose-editor" style="min-height: 80px;" placeholder="Contact names, interview details, etc."></textarea>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 25px;">
                <button class="action-btn" onclick="closeExportModal()" style="padding: 10px 20px;">
                    Cancel
                </button>
                <button class="export-btn-large" onclick="saveApplication()" style="padding: 10px 20px;">
                    ${bpIcon("plus",14)} Add Application
                </button>
            </div>
        </div>
    `;
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

export function saveApplication() {
    if (readOnlyGuard()) return;
    const title = document.getElementById('appTitle').value.trim();
    const company = document.getElementById('appCompany').value.trim();
    
    if (!title || !company) {
        showToast('Please enter job title and company.', 'warning');
        return;
    }
    
    const newApp = {
        id: Date.now(),
        title: title,
        company: company,
        appliedDate: document.getElementById('appDate').value,
        status: document.getElementById('appStatus').value,
        salary: document.getElementById('appSalary').value.trim(),
        matchScore: document.getElementById('appMatch').value ? parseInt(document.getElementById('appMatch').value) : null,
        url: document.getElementById('appUrl').value.trim(),
        nextFollowUp: document.getElementById('appFollowUp').value || null,
        notes: document.getElementById('appNotes').value.trim()
    };
    
    if (!window._userData.applications) window._userData.applications = [];
    window._userData.applications.unshift(newApp);
    
    saveUserData();
    closeExportModal();
    renderApplications();
    
    showToast('Application added.', 'success');
}

export function updateApplicationStatus(idx) {
    const app = window._userData.applications[idx];
    const newStatus = prompt(`Update status for "${app.title}":\n\n1 = Applied\n2 = Interviewing\n3 = Offer\n4 = Closed\n\nEnter number:`, 
                             app.status === 'applied' ? '1' : app.status === 'interviewing' ? '2' : app.status === 'offer' ? '3' : '4');
    
    if (newStatus) {
        const statusMap = {'1': 'applied', '2': 'interviewing', '3': 'offer', '4': 'rejected'};
        window._userData.applications[idx].status = statusMap[newStatus] || app.status;
        saveUserData();
        renderApplications();
    }
}

export function editApplication(idx) {
    if (readOnlyGuard()) return;
    const app = window._userData.applications[idx];
    const modal = document.getElementById('exportModal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-left">
                <h2 class="modal-title">Edit Application</h2>
            </div>
            <button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">×</button>
        </div>
        <div class="modal-body" style="padding: 30px;">
            <div style="display: grid; gap: 20px;">
                <div>
                    <label class="settings-label">Job Title</label>
                    <input type="text" id="editAppTitle" value="${app.title}" class="settings-input">
                </div>
                
                <div>
                    <label class="settings-label">Company</label>
                    <input type="text" id="editAppCompany" value="${app.company}" class="settings-input">
                </div>
                
                <div>
                    <label class="settings-label">Status</label>
                    <select id="editAppStatus" class="settings-select">
                        <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>Applied</option>
                        <option value="interviewing" ${app.status === 'interviewing' ? 'selected' : ''}>Interviewing</option>
                        <option value="offer" ${app.status === 'offer' ? 'selected' : ''}>Offer Received</option>
                        <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Closed</option>
                    </select>
                </div>
                
                <div>
                    <label class="settings-label">Follow-Up Date</label>
                    <input type="date" id="editAppFollowUp" value="${app.nextFollowUp || ''}" class="settings-input">
                </div>
                
                <div>
                    <label class="settings-label">Notes</label>
                    <textarea id="editAppNotes" class="purpose-editor" style="min-height: 80px;">${escapeHtml(app.notes || '')}</textarea>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 25px;">
                <button class="action-btn" onclick="closeExportModal()">Cancel</button>
                <button class="export-btn-large" onclick="saveApplicationEdit(${idx})">${bpIcon("save",14)} Save Changes</button>
            </div>
        </div>
    `;
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

export function saveApplicationEdit(idx) {
    if (readOnlyGuard()) return;
    window._userData.applications[idx].title = document.getElementById('editAppTitle').value;
    window._userData.applications[idx].company = document.getElementById('editAppCompany').value;
    window._userData.applications[idx].status = document.getElementById('editAppStatus').value;
    window._userData.applications[idx].nextFollowUp = document.getElementById('editAppFollowUp').value || null;
    window._userData.applications[idx].notes = document.getElementById('editAppNotes').value.trim();
    
    saveUserData();
    closeExportModal();
    renderApplications();
}

export function deleteApplication(idx) {
    const app = window._userData.applications[idx];
    if (confirm(`Remove "${app.title}" at ${app.company} from tracker?`)) {
        window._userData.applications.splice(idx, 1);
        saveUserData();
        renderApplications();
    }
}

// ===== CONSENT & SHARING SYSTEM =====

let sharePresets = {
    'full': { name: 'Full Transparency', skills: 'all', outcomes: 'all', values: 'all', purpose: true },
    'executive': { name: 'Executive Brief', skills: 'top20', outcomes: 'all', values: 'all', purpose: true },
    'advisory': { name: 'Advisory Pitch', skills: 'strategic', outcomes: 'strategic', values: 'all', purpose: true },
    'board': { name: 'Board Candidate', skills: 'leadership', outcomes: 'business', values: 'selected', purpose: true },
    'custom': { name: 'Custom', skills: 'selected', outcomes: 'selected', values: 'selected', purpose: true }
};

let currentPreset = 'custom';

export function initConsent() {
    const view = document.getElementById('consentView');
    
    view.innerHTML = `
        <div class="blueprint-container">
            
            
            ${renderSharePresets()}
            ${renderSharingStatus()}
            ${renderLegalSection()}
        </div>
    `;
}

export function renderSharePresets() {
    return `
        <div class="blueprint-section">
            <div class="blueprint-section-header">
                <div class="blueprint-section-title">
                    <span class="section-icon">${bpIcon("preferences",18)}</span>
                    <span>Share Profile Presets</span>
                </div>
            </div>
            
            <div class="coaching-tip">
                <div class="coaching-tip-title">
                    ${bpIcon('lightbulb',14)} CHOOSE YOUR SHARING LEVEL
                </div>
                <div class="coaching-tip-content">
                    Select a preset that matches your audience, or use Custom to choose exactly what to share.
                    All presets respect your individual item toggles from the Blueprint.
                </div>
            </div>
            
            <div class="values-grid">
                ${Object.entries(sharePresets).map(([key, preset]) => renderPresetCard(key, preset)).join('')}
            </div>
            ${currentPreset === 'custom' ? '<div style="margin-top:12px; padding:10px 14px; background:rgba(96,165,250,0.08); border-left:3px solid #60a5fa; border-radius:4px; font-size:0.85em; color:var(--c-heading);">' + bpIcon('info',12) + ' Custom mode active. Manage individual share toggles for outcomes and values in the Blueprint tab. Skills are included based on your profile data.</div>' : ''}
        </div>
    `;
}

export function renderPresetCard(key, preset) {
    const selectedClass = currentPreset === key ? 'selected' : '';
    var skillCount = (_sd().skills || []).length;
    var keyCount = _sd().skills.filter(function(s) { return s.key; }).length;
    var boardCount = _sd().skills.filter(function(s) { return s.key || s.level === 'Mastery'; }).length;
    var outcomeCount = (_bd().outcomes || []).length;
    var valueCount = (_bd().values || []).filter(function(v) { return v.selected; }).length;
    
    function dataSummary(sCount, oCount, vCount) {
        var parts = [];
        parts.push(sCount + ' skill' + (sCount !== 1 ? 's' : ''));
        parts.push(oCount > 0 ? oCount + ' outcome' + (oCount !== 1 ? 's' : '') : 'no outcomes yet');
        parts.push(vCount > 0 ? vCount + ' value' + (vCount !== 1 ? 's' : '') : 'no values yet');
        return parts.join(', ');
    }
    
    const descriptions = {
        'full': dataSummary(skillCount, outcomeCount, valueCount) + ', and purpose',
        'executive': 'Top ' + Math.min(20, skillCount) + ' skills + ' + (outcomeCount > 0 ? 'all outcomes' : 'no outcomes yet') + ', ideal for executive search',
        'advisory': keyCount + ' strategic skill' + (keyCount !== 1 ? 's' : '') + ' + ' + (outcomeCount > 0 ? 'relevant outcomes' : 'no outcomes yet') + ', for advisory and consulting',
        'board': boardCount + ' leadership skill' + (boardCount !== 1 ? 's' : '') + ' + ' + (outcomeCount > 0 ? 'business outcomes' : 'no outcomes yet') + ', for board positions',
        'custom': 'Granular control. Toggle individual skills, outcomes, and values in the Blueprint tab.'
    };
    
    return `
        <div class="value-card ${selectedClass}" onclick="selectPreset('${key}')">
            <div class="value-title">${preset.name}</div>
            <div class="value-description">${descriptions[key]}</div>
        </div>
    `;
}

export function renderSharingStatus() {
    var skillCount = (_sd().skills || []).length;
    var sharedSkills = currentPreset === 'full' ? skillCount : 
                        currentPreset === 'executive' ? Math.min(20, skillCount) :
                        currentPreset === 'advisory' ? _sd().skills.filter(function(s) { return s.key; }).length :
                        currentPreset === 'board' ? _sd().skills.filter(function(s) { return s.key || s.level === 'Mastery'; }).length :
                        skillCount;
    var totalOutcomes = (_bd().outcomes || []).length;
    var sharedOutcomes = _bd().outcomes.filter(o => o.shared).length;
    var totalValues = (_bd().values || []).length;
    var sharedValues = _bd().values.filter(v => v.selected).length;
    
    var skillCtx = sharedSkills < skillCount ? '<div style="font-size:0.72em; color:#9ca3af; margin-top:4px;">of ' + skillCount + ' total</div>' : '';
    var outcomeCtx = totalOutcomes === 0 ? '<div style="font-size:0.72em; color:#f59e0b; margin-top:4px;">None added yet</div>' 
                   : sharedOutcomes < totalOutcomes ? '<div style="font-size:0.72em; color:#9ca3af; margin-top:4px;">of ' + totalOutcomes + ' total</div>' : '';
    var valueCtx = totalValues === 0 ? '<div style="font-size:0.72em; color:#f59e0b; margin-top:4px;">None added yet</div>'
                 : sharedValues < totalValues ? '<div style="font-size:0.72em; color:#9ca3af; margin-top:4px;">of ' + totalValues + ' total</div>' : '';
    
    return `
        <div class="blueprint-section">
            <div class="blueprint-section-header">
                <div class="blueprint-section-title">
                    <span class="section-icon">${bpIcon('bar-chart',18)}</span>
                    <span>What You're Sharing</span>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div style="background: rgba(96, 165, 250, 0.1); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 2em; color: #60a5fa; font-weight: bold;">${sharedSkills}</div>
                    <div style="color: #9ca3af; margin-top: 5px;">Skills</div>
                    ${skillCtx}
                </div>
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 2em; color: ${totalOutcomes === 0 ? '#64748b' : '#10b981'}; font-weight: bold;">${sharedOutcomes}</div>
                    <div style="color: #9ca3af; margin-top: 5px;">Outcomes</div>
                    ${outcomeCtx}
                </div>
                <div style="background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 2em; color: ${totalValues === 0 ? '#64748b' : '#fbbf24'}; font-weight: bold;">${sharedValues}</div>
                    <div style="color: #9ca3af; margin-top: 5px;">Values</div>
                    ${valueCtx}
                </div>
                <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 20px; text-align: center;">
                    <div style="font-size: 2em; color: #a78bfa; font-weight: bold;">✓</div>
                    <div style="color: #9ca3af; margin-top: 5px;">Purpose</div>
                </div>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; border-radius: 4px;">
                <strong style="color: #fbbf24;">Note:</strong> 
                <span style="color: #d1d5db;">Sensitive content (recovery, personal loss) is flagged in Blueprint. Review before sharing.</span>
            </div>
        </div>
    `;
}

export function renderLegalSection() {
    var tc = 'var(--c-heading)';
    var hc = 'var(--c-accent-deep)';
    var sc = 'var(--c-muted)';
    var bgCard = 'var(--c-surface-1)';
    var borderWarn = 'var(--c-amber-border-3)';
    
    return '<div id="disclaimerSection" class="blueprint-section">'
        + '<div class="blueprint-section-header">'
        + '<div class="blueprint-section-title">'
        + '<span class="section-icon">' + bpIcon('warning',20) + '</span>'
        + '<span>Disclaimer & Terms of Use</span>'
        + '</div>'
        + '</div>'
        
        // Prominent disclaimer banner
        + '<div style="padding:20px; background:var(--c-amber-bg-2c); '
        + 'border:1px solid ' + borderWarn + '; border-radius:10px; margin-bottom:24px;">'
        + '<p style="color:' + tc + '; line-height:1.7; margin:0; font-size:0.95em;">'
        + '<strong style="color:var(--c-warn);">Blueprint is a personal demonstration project provided as-is for educational and illustrative purposes only.</strong> '
        + 'It is not a commercial product and carries no warranty of any kind, express or implied.'
        + '</p>'
        + '</div>'
        
        + '<div style="color:' + tc + '; line-height:1.7; font-size:0.93em;">'

        // Data accuracy
        + '<div style="padding:16px; background:' + bgCard + '; border-radius:8px; margin-bottom:12px;">'
        + '<h4 style="color:' + hc + '; margin:0 0 8px 0;">Data Accuracy</h4>'
        + '<p style="margin:0;">Skill taxonomies, market valuations, compensation estimates, and any generated content may contain errors, omissions, or outdated information. '
        + 'ESCO, O*NET, and other referenced datasets are used under their respective licenses and may not reflect current labor market conditions. '
        + 'No figure produced by this tool should be treated as a verified market rate or guaranteed outcome.</p>'
        + '</div>'

        // Not professional advice
        + '<div style="padding:16px; background:' + bgCard + '; border-radius:8px; margin-bottom:12px;">'
        + '<h4 style="color:' + hc + '; margin:0 0 8px 0;">Not Professional Advice</h4>'
        + '<p style="margin:0;">Nothing in this application constitutes legal, financial, career, compensation, or employment advice. '
        + 'Users should consult qualified professionals before making decisions based on any information presented here.</p>'
        + '</div>'

        // No liability
        + '<div style="padding:16px; background:' + bgCard + '; border-radius:8px; margin-bottom:12px;">'
        + '<h4 style="color:' + hc + '; margin:0 0 8px 0;">No Liability</h4>'
        + '<p style="margin:0;">The creator of this tool accepts no responsibility for decisions made, opportunities pursued or declined, '
        + 'salary negotiations conducted, or any other action taken based on information generated by this application.</p>'
        + '</div>'

        // Local data only
        + '<div style="padding:16px; background:' + bgCard + '; border-radius:8px; margin-bottom:12px;">'
        + '<h4 style="color:' + hc + '; margin:0 0 8px 0;">Local Data Only</h4>'
        + '<p style="margin:0;">All user data is stored in your browser\u2019s local storage. No data is transmitted to or stored on any server. '
        + 'Clearing your browser data will permanently delete your profile. The creator has no access to your data.</p>'
        + '</div>'

        // Third-party AI
        + '<div style="padding:16px; background:' + bgCard + '; border-radius:8px; margin-bottom:12px;">'
        + '<h4 style="color:' + hc + '; margin:0 0 8px 0;">Third-Party AI</h4>'
        + '<p style="margin:0;">The onboarding wizard uses the Anthropic API to parse resumes and infer skills. '
        + 'Resume text submitted during onboarding is sent to Anthropic\u2019s servers and is subject to '
        + '<a href="https://www.anthropic.com/policies" target="_blank" rel="noopener" style="color:' + hc + '; text-decoration:underline;">Anthropic\u2019s usage policies</a>. '
        + 'No resume data is stored by this application after processing. '
        + 'The LinkedIn data import option parses your .zip archive entirely in-browser using JSZip and PapaParse. '
        + 'No LinkedIn data leaves your device during CSV parsing. A small Claude API call may be used to infer skill levels from your job titles.</p>'
        + '</div>'

        // Demo profiles
        + '<div style="padding:16px; background:' + bgCard + '; border-radius:8px; margin-bottom:12px;">'
        + '<h4 style="color:' + hc + '; margin:0 0 8px 0;">Demonstration Profiles</h4>'
        + '<p style="margin:0;">Pre-loaded demo profiles represent real professional histories and are included with the profile owner\u2019s consent. '
        + 'Do not redistribute demo profile data.</p>'
        + '</div>'

        // Use at your own risk
        + '<div style="padding:16px; background:var(--c-red-bg-1); '
        + 'border:1px solid var(--c-red-border-1); border-radius:8px; margin-bottom:12px;">'
        + '<h4 style="color:var(--c-danger-light); margin:0 0 8px 0;">Use at Your Own Risk</h4>'
        + '<p style="margin:0;">By using this tool, you acknowledge these limitations and accept full responsibility for how you apply its outputs.</p>'
        + '</div>'

        + '</div>'
        + '</div>'

        // Existing privacy section below disclaimer
        + '<div class="blueprint-section">'
        + '<div class="blueprint-section-header">'
        + '<div class="blueprint-section-title">'
        + '<span class="section-icon">' + bpIcon('scale',20) + '</span>'
        + '<span>Privacy & Data Rights</span>'
        + '</div>'
        + '</div>'
        + '<div style="color:' + tc + '; line-height:1.7;">'
        + '<p style="margin-bottom:20px;">When signed in, your Blueprint data is stored securely in Firebase (Google Cloud). When not signed in, data persists locally in your browser. You have complete control over what you share, '
        + 'when you share it, and with whom.</p>'

        + '<h4 style="color:' + hc + '; margin-bottom:10px;">Relevant Privacy Laws:</h4>'
        + '<div style="padding:10px; background:' + bgCard + '; margin-bottom:8px; border-radius:6px;">'
        + '<strong>\uD83C\uDDFA\uD83C\uDDF8 CCPA (California Consumer Privacy Act)</strong><br>'
        + '<span style="font-size:0.9em; color:' + sc + ';">Right to know what data is collected, right to delete, right to opt-out of sale</span><br>'
        + '<a href="https://oag.ca.gov/privacy/ccpa" target="_blank" rel="noopener noreferrer" style="color:' + hc + '; text-decoration:none; font-size:0.85em;">Learn more \u2192</a>'
        + '</div>'
        + '<div style="padding:10px; background:' + bgCard + '; margin-bottom:8px; border-radius:6px;">'
        + '<strong>\uD83C\uDDEA\uD83C\uDDFA GDPR (General Data Protection Regulation)</strong><br>'
        + '<span style="font-size:0.9em; color:' + sc + ';">Right to access, rectify, erase, and port your personal data</span><br>'
        + '<a href="https://gdpr.eu/" target="_blank" rel="noopener noreferrer" style="color:' + hc + '; text-decoration:none; font-size:0.85em;">Learn more \u2192</a>'
        + '</div>'
        + '<div style="padding:10px; background:' + bgCard + '; margin-bottom:8px; border-radius:6px;">'
        + '<strong>\uD83D\uDCCB Employment Data Rights (US)</strong><br>'
        + '<span style="font-size:0.9em; color:' + sc + ';">Employers must handle your data fairly and cannot discriminate based on protected characteristics</span><br>'
        + '<a href="https://www.eeoc.gov/" target="_blank" rel="noopener noreferrer" style="color:' + hc + '; text-decoration:none; font-size:0.85em;">EEOC Guidelines \u2192</a>'
        + '</div>'

        + '<h4 style="color:' + hc + '; margin:25px 0 10px 0;">Best Practices:</h4>'
        + '<div style="color:' + tc + '; line-height:2;">'
        + '\u2022 Never share sensitive personal information (SSN, financial details)<br>'
        + '\u2022 Review what you are sharing before exporting<br>'
        + '\u2022 Keep Blueprint data up to date but do not embellish<br>'
        + '\u2022 Consider context before sharing recovery or advocacy work'
        + '</div>'
        + '</div>'
        + '</div>'

        // GDPR Data Rights section
        + '<div class="blueprint-section">'
        + '<div class="blueprint-section-header">'
        + '<div class="blueprint-section-title">'
        + '<span class="section-icon">' + bpIcon('lock',20) + '</span>'
        + '<span>Your Data Rights</span>'
        + '</div>'
        + '</div>'
        + '<div style="color:var(--c-heading); line-height:1.7; font-size:0.93em;">'
        + '<p style="margin-bottom:16px;">Under GDPR and similar privacy regulations, you have the right to access, export, and delete your personal data at any time. '
        + 'Use the controls below to exercise these rights.</p>'
        + '<div style="display:flex; gap:12px; flex-wrap:wrap;">'
        + '<button onclick="viewMyData()" style="'
        + 'background:var(--c-accent-bg-5a); '
        + 'border:1px solid var(--c-accent-border-4); '
        + 'color:var(--c-accent-deep); padding:12px 20px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em;'
        + '">\uD83D\uDCC4 View My Stored Data</button>'
        + '<button onclick="exportMyData()" style="'
        + 'background:var(--c-green-bg-4b); '
        + 'border:1px solid var(--c-green-border-2b); '
        + 'color:var(--c-success); padding:12px 20px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em;'
        + '">\uD83D\uDCE5 Export My Data (JSON)</button>'
        + '<button onclick="requestDataDeletion()" style="'
        + 'background:var(--c-red-bg-2a); '
        + 'border:1px solid var(--c-red-border-2); '
        + 'color:var(--c-danger); padding:12px 20px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em;'
        + '">\uD83D\uDDD1 Delete All My Data</button>'
        + '</div>'
        + '<div style="margin-top:12px; font-size:0.82em; color:var(--c-faint);">'
        + 'You must be signed in to use these features. Data deletion is permanent and cannot be undone.'
        + '</div>'
        + '</div></div>';
}

export function handleProfilePhoto(input) {
    var file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image must be under 2MB.', 'warning'); return; }
    
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            // Resize to 128x128
            var canvas = document.createElement('canvas');
            canvas.width = 128; canvas.height = 128;
            var ctx = canvas.getContext('2d');
            var size = Math.min(img.width, img.height);
            var sx = (img.width - size) / 2;
            var sy = (img.height - size) / 2;
            ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
            var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            window._userData.profile.photo = dataUrl;
            // Update preview
            var preview = document.getElementById('settingPhotoPreview');
            safeSetAvatar(preview, dataUrl, false);
            // Update header chip
            var avatar = document.getElementById('profileAvatar');
            safeSetAvatar(avatar, dataUrl, true);
            saveUserData();
            showToast('Profile photo updated.', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
if (!window.handleProfilePhoto) window.handleProfilePhoto = handleProfilePhoto;

export function removeProfilePhoto() {
    delete window._userData.profile.photo;
    var avatar = document.getElementById('profileAvatar');
    if (avatar) avatar.textContent = (window._userData.profile.name || 'U').split(' ').map(function(w){ return w[0]; }).join('').slice(0,2).toUpperCase();
    saveUserData();
    // Re-render settings
    window.settingsInitialized = false;
    initSettings();
    window.settingsInitialized = true;
}
if (!window.removeProfilePhoto) window.removeProfilePhoto = removeProfilePhoto;

export function saveSettings() {
    if (readOnlyGuard()) return;
    // Get values from form
    window._userData.profile.name = (document.getElementById('settingName') || {}).value || window._userData.profile.name;
    window._userData.profile.email = (document.getElementById('settingEmail') || {}).value || window._userData.profile.email || '';
    window._userData.profile.phone = (document.getElementById('settingPhone') || {}).value || window._userData.profile.phone || '';
    window._userData.profile.linkedinUrl = (document.getElementById('settingLinkedIn') || {}).value || window._userData.profile.linkedinUrl || '';
    var locEl = document.getElementById('settingLocation');
    if (locEl) window._userData.profile.location = locEl.value;
    
    // Parse and save reported compensation
    var compInput = document.getElementById('settingComp');
    if (compInput) {
        var compVal = parseInt((compInput.value || '').replace(/[^0-9]/g, ''), 10);
        window._userData.profile.reportedComp = compVal > 0 ? compVal : null;
    }
    
    var seniorityEl = document.getElementById('settingSeniority');
    var newSeniority = seniorityEl ? seniorityEl.value : window._userData.preferences.seniorityLevel;
    window._userData.preferences.seniorityLevel = newSeniority;
    var minSalaryEl = document.getElementById('settingMinSalary');
    if (minSalaryEl) {
        var minSalaryInput = minSalaryEl.value;
        window._userData.preferences.minSalary = minSalaryInput ? parseInt(minSalaryInput) : null;
    }
    
    // Update seniority keywords based on level
    if (newSeniority === 'Entry') {
        window._userData.preferences.seniorityKeywords = ['junior', 'associate', 'entry', 'coordinator'];
        window._userData.preferences.excludeRoles = ['senior', 'lead', 'manager', 'director', 'vp', 'chief', 'principal'];
    } else if (newSeniority === 'Mid') {
        window._userData.preferences.seniorityKeywords = ['senior', 'lead', 'manager', 'specialist'];
        window._userData.preferences.excludeRoles = ['junior', 'entry', 'associate', 'intern'];
    } else if (newSeniority === 'Senior') {
        window._userData.preferences.seniorityKeywords = ['senior manager', 'director', 'senior director', 'principal'];
        window._userData.preferences.excludeRoles = ['junior', 'entry', 'mid-level', 'associate'];
    } else { // Executive
        window._userData.preferences.seniorityKeywords = ['vp', 'vice president', 'chief', 'head of', 'director', 'principal', 'senior director'];
        window._userData.preferences.excludeRoles = ['engineer', 'developer', 'designer', 'analyst', 'coordinator', 'specialist', 
                                            'junior', 'mid-level', 'associate', 'intern', 'entry'];
    }
    
    // Update profile chip with new name
    if (window._userData.profile.name) {
        updateProfileChip(window._userData.profile.name);
    }
    
    // Save to localStorage
    saveUserData();
    
    showToast('Settings saved. Go to Opportunities and click Find Matching Jobs to see updated results.', 'success', 5000);
}
if (!window.saveSettings) window.saveSettings = saveSettings;

export function selectPreset(key) {
    currentPreset = key;
    
    // Persist to Firestore
    if (!window._userData.preferences) window._userData.preferences = {};
    window._userData.preferences.sharingPreset = key;
    
    // Apply preset logic to outcomes and values sharing flags
    if (key === 'full') {
        _bd().outcomes.forEach(function(o) { o.shared = true; });
        _bd().values.forEach(function(v) { v.selected = true; });
    } else if (key === 'executive') {
        _bd().outcomes.forEach(function(o) { o.shared = true; });
        _bd().values.forEach(function(v) { v.selected = true; });
    } else if (key === 'advisory') {
        _bd().outcomes.forEach(function(o) {
            o.shared = (o.category === 'Strategic Foresight' || o.category === 'Thought Leadership' || o.category === 'Business Impact');
        });
        _bd().values.forEach(function(v) { v.selected = true; });
    } else if (key === 'board') {
        _bd().outcomes.forEach(function(o) {
            o.shared = (o.category === 'Business Impact' || o.category === 'Crisis Leadership' || o.category === 'Entrepreneurial');
        });
        _bd().values.forEach(function(v) { v.selected = true; });
    }
    // 'custom' leaves everything as-is
    
    saveUserData();
    // Re-render whichever view is active
    if (window.currentSettingsTab === 'privacy') {
        var stc = document.getElementById('settingsTabContent');
        if (stc) stc.innerHTML = renderSettingsTabContent();
    } else {
        initConsent();
    }
}
if (!window.selectPreset) window.selectPreset = selectPreset;

export function filterSkillsView(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (currentSkillsView === 'network') {
        // Filter network nodes
        const svg = d3.select("#networkView");
        const nodes = svg.selectAll(".node");
        
        nodes.style("opacity", function(d) {
            if (d.type !== "skill") return 1;  // Keep center and roles visible
            if (!term) return 1;  // No search, show all
            return d.name.toLowerCase().includes(term) ? 1 : 0.1;
        });
        
        // Also filter text labels
        const labels = svg.selectAll(".node-label");
        labels.style("opacity", function(d) {
            if (d.type !== "skill") return 1;
            if (!term) return 1;
            return d.name.toLowerCase().includes(term) ? 1 : 0.1;
        });
        
    } else {
        // Filter card view - skill items within domain cards
        var domainCards = document.querySelectorAll('.domain-card');
        domainCards.forEach(function(card) {
            var items = card.querySelectorAll('.skill-item');
            var anyVisible = false;
            items.forEach(function(item) {
                var nameEl = item.querySelector('.skill-name');
                var name = nameEl ? nameEl.textContent.toLowerCase() : '';
                if (!term || name.includes(term)) {
                    item.style.display = '';
                    anyVisible = true;
                } else {
                    item.style.display = 'none';
                }
            });
            // Hide entire domain card if no skills match
            card.style.display = anyVisible || !term ? '' : 'none';
        });
    }
}

export function showValuationBreakdown() {
    const totalValue = calculateTotalMarketValue();
    const modal = document.getElementById('exportModal');
    const modalContent = modal.querySelector('.modal-content');
    
    // Get all skills with their impact ratings
    const allSkillsWithImpact = _sd().skills.map(skill => {
        const impact = getSkillImpact(skill);
        return {
            name: skill.name,
            level: skill.level,
            category: skill.category,
            impact: impact,
            impactLevel: impact.level
        };
    });
    
    // Sort by impact level then alphabetically
    const impactOrder = { 'critical': 1, 'high': 2, 'moderate': 3, 'standard': 4, 'supplementary': 5 };
    allSkillsWithImpact.sort((a, b) => {
        const orderDiff = impactOrder[a.impactLevel] - impactOrder[b.impactLevel];
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
    });
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-left">
                <h2 class="modal-title">All ${_sd().skills.length} Skills</h2>
                <p style="color: #9ca3af; margin-top: 5px;">Complete list with impact ratings</p>
            </div>
            <button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">×</button>
        </div>
        <div class="modal-body" style="padding: 30px; max-height: 70vh; overflow-y: auto;">
            <div style="background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; text-align: center;">
                    <div>
                        <div style="color: #ef4444; font-size: 1.8em; font-weight: 700;">
                            ${allSkillsWithImpact.filter(s => s.impactLevel === 'critical').length}
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9em;">${bpIcon('flame',14)} Critical</div>
                    </div>
                    <div>
                        <div style="color: #f59e0b; font-size: 1.8em; font-weight: 700;">
                            ${allSkillsWithImpact.filter(s => s.impactLevel === 'high').length}
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9em;">${bpIcon('star',14)} High</div>
                    </div>
                    <div>
                        <div style="color: #3b82f6; font-size: 1.8em; font-weight: 700;">
                            ${allSkillsWithImpact.filter(s => s.impactLevel === 'moderate').length}
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9em;">${bpIcon('diamond',14)} Moderate</div>
                    </div>
                    <div>
                        <div style="color: #6b7280; font-size: 1.8em; font-weight: 700;">
                            ${allSkillsWithImpact.filter(s => s.impactLevel === 'standard').length}
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9em;">${bpIcon('check',14)} Standard</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #60a5fa; margin-bottom: 15px;">All Skills (Sorted by Impact)</h3>
                <div style="display: grid; gap: 8px; max-height: 500px; overflow-y: auto; padding-right: 10px;">
                    ${allSkillsWithImpact.map((skill, idx) => {
                        const impactColor = getImpactColor(skill.impactLevel);
                        const categoryBadge = skill.category === 'skill' ? 'SKILL' : 
                                             skill.category === 'ability' ? 'ABILITY' : 
                                             skill.category === 'workstyle' ? 'WORK STYLE' : 'UNIQUE';
                        return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border-left: 3px solid ${impactColor};">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="color: #e0e0e0; font-weight: 500;">${escapeHtml(skill.name)}</span>
                                    <span style="color: #6b7280; font-size: 0.75em; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 3px;">${categoryBadge}</span>
                                </div>
                                <div style="color: #9ca3af; font-size: 0.85em;">
                                    ${escapeHtml(skill.level)} • ${escapeHtml(skill.impact.label)}
                                </div>
                            </div>
                            <div style="color: ${impactColor}; font-weight: 600; font-size: 1.2em; min-width: 40px; text-align: right;">
                                ${skill.impact.icon}
                            </div>
                        </div>
                    `}).join('')}
                </div>
            </div>
            
            <div style="background: rgba(96, 165, 250, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #60a5fa; margin-bottom: 15px;">Your Market Value</h3>
                <div style="color: #d1d5db; line-height: 1.8;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span>Base Market Rate (${totalValue.percentile} percentile):</span>
                        <strong>$${totalValue.marketRate.toLocaleString()}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span>Critical Skills Premium (${totalValue.criticalSkills.length} skills):</span>
                        <strong style="color: #10b981;">+$${totalValue.criticalBonus.toLocaleString()}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span>High Impact Skills (${totalValue.highSkills.length} skills):</span>
                        <strong style="color: #10b981;">+$${totalValue.highBonus.toLocaleString()}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span>Rare Combinations:</span>
                        <strong style="color: #10b981;">+$${totalValue.rarityBonus.toLocaleString()}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 1.2em; margin-top: 10px;">
                        <strong>Total Market Value:</strong>
                        <strong style="color: #10b981;">$${totalValue.total.toLocaleString()}</strong>
                    </div>
                </div>
            </div>
            
            <button class="export-btn-large" onclick="closeExportModal()" style="width: 100%; background: rgba(96, 165, 250, 0.2); border-color: #60a5fa; color: #60a5fa;">
                Close
            </button>
        </div>
    `;
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

// Inline negotiation guide content (rendered in dashboard, not modal)
export function renderInlineNegotiation(tv) {
    if (!tv || !tv.total) return '';
    var html = '';
    
    // Offer ranges
    html += '<div style="display:grid; gap:6px; margin-bottom:14px;">';
    var offers = [
        { label: 'Conservative (75%)', val: tv.conservativeOffer, desc: 'Budget-constrained', color: '#9ca3af' },
        { label: 'Standard (85%)', val: tv.standardOffer, desc: 'Most common initial', color: '#60a5fa' },
        { label: 'Competitive (95%)', val: tv.competitiveOffer, desc: 'Strong employers', color: '#10b981' }
    ];
    offers.forEach(function(o) {
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:6px; border-left:3px solid ' + o.color + ';">'
            + '<div><div style="color:' + o.color + '; font-weight:600; font-size:0.82em;">' + o.label + '</div>'
            + '<div style="color:var(--c-muted); font-size:0.72em;">' + o.desc + '</div></div>'
            + '<div style="font-weight:700; color:var(--c-text);">$' + o.val.toLocaleString() + '</div></div>';
    });
    html += '</div>';
    
    // Negotiation gap
    var gap = tv.yourWorth - tv.standardOffer;
    html += '<div style="padding:10px 12px; background:rgba(251,191,36,0.06); border-radius:8px; margin-bottom:14px;">'
        + '<div style="color:#fbbf24; font-weight:600; font-size:0.82em; margin-bottom:4px;">' + bpIcon('lightbulb',12) + ' Negotiation Gap: $' + gap.toLocaleString() + '</div>'
        + '<div style="font-size:0.78em; color:var(--c-muted); line-height:1.5;">'
        + 'Start at $' + tv.yourWorth.toLocaleString() + ', negotiate to $' + tv.competitiveOffer.toLocaleString() + '+.</div></div>';
    
    // Talking points
    html += '<div style="font-size:0.78em; font-weight:700; color:#fbbf24; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em;">Talking Points</div>'
        + '<div style="display:grid; gap:6px; margin-bottom:14px;">';
    
    var allSkills = (skillsData && _sd().skills) || (userData && window._userData.skills) || [];
    var masterySkills = allSkills.filter(function(s) { return (s.level || '').toLowerCase() === 'mastery'; });
    var expertSkills = allSkills.filter(function(s) { return (s.level || '').toLowerCase() === 'expert'; });
    var masteryNames = masterySkills.slice(0, 4).map(function(s) { return s.name; }).join(', ');
    var premPct = tv.marketRate > 0 ? Math.round(((tv.yourWorth - tv.marketRate) / tv.marketRate) * 100) : 0;
    
    var skillsPremiumText = masterySkills.length > 0
        ? masterySkills.length + ' mastery-level skill' + (masterySkills.length !== 1 ? 's' : '') + ' (' + masteryNames + ')' + (expertSkills.length > 0 ? ' plus ' + expertSkills.length + ' at expert level' : '') + ' command market premiums.'
        : expertSkills.length + ' expert-level skills command market premiums.';
    
    var points = [
        { title: 'Lead with Worth', text: '"My value is $' + Math.round(tv.yourWorth * 0.95 / 1000) * 1000 + '\u2013$' + Math.round(tv.yourWorth * 1.05 / 1000) * 1000 + ' for ' + (tv.roleLevel || '') + ' roles."' },
        { title: 'Skills Premium', text: skillsPremiumText },
        { title: 'Market Data', text: 'Market rate: $' + tv.marketRate.toLocaleString() + '. My skills justify a ' + premPct + '% premium.' }
    ];
    points.forEach(function(p) {
        html += '<div style="padding:8px 12px; background:rgba(255,255,255,0.02); border-radius:6px; font-size:0.82em; color:var(--c-muted); line-height:1.5;">'
            + '<strong style="color:var(--c-text);">' + p.title + ':</strong> ' + p.text + '</div>';
    });
    html += '</div>';
    
    // Script for salary expectations
    html += '<div style="font-size:0.78em; font-weight:700; color:#60a5fa; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em;">When Asked for Expectations</div>'
        + '<div style="padding:10px 12px; background:rgba(255,255,255,0.02); border-radius:8px; font-size:0.82em; color:var(--c-muted); font-style:italic; line-height:1.6; margin-bottom:10px;">'
        + '"Based on my skill profile and market analysis, I\'m targeting $' + Math.round(tv.competitiveOffer / 1000) * 1000 + '\u2013$' + Math.round(tv.yourWorth / 1000) * 1000 + '. Flexible on total package structure."</div>';
    
    // Best practices
    html += '<div style="font-size:0.78em; font-weight:700; color:#60a5fa; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.04em;">Best Practices</div>'
        + '<div style="font-size:0.78em; color:var(--c-muted); line-height:1.6;">'
        + 'Never share salary history. Name your range first (anchoring). Get the full offer in writing before negotiating. Ask about equity, signing bonus, PTO separately. Express enthusiasm before countering.'
        + '</div>';
    
    return html;
}
if (!window.renderInlineNegotiation) window.renderInlineNegotiation = renderInlineNegotiation;

export function showNegotiationGuide() {
    if (window.isReadOnlyProfile) { demoGate('use the negotiation guide'); return; }
    logAnalyticsEvent('negotiation_guide', {});
    const totalValue = getEffectiveComp();
    const negotiationGap = totalValue.yourWorth - totalValue.standardOffer;
    const displayFormatted = formatCompValue(totalValue.displayComp);
    
    const modal = document.getElementById('exportModal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-left">
                <h2 class="modal-title">${bpIcon("briefcase",18)} Salary Negotiation Strategy</h2>
                <p style="color: #9ca3af; margin-top: 5px;">Compa-ratio based negotiation guidance</p>
            </div>
            <button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">×</button>
        </div>
        <div class="modal-body" style="padding: 30px; max-height: 70vh; overflow-y: auto;">
            <div style="background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <div style="color: #10b981; font-weight: 600; margin-bottom: 10px;">${totalValue.compLabel}</div>
                <div style="font-size: 2em; font-weight: 700; color: #e0e0e0;">
                    ${displayFormatted}/yr
                </div>
                <div style="color: #9ca3af; margin-top: 8px;">
                    ${totalValue.roleLevel} • ${totalValue.compSource === 'algorithm' ? totalValue.compaRatio + '% compa-ratio • ' : ''}${window._userData.profile.location || ''}
                </div>
            </div>
            
            <div style="background: rgba(96, 165, 250, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #60a5fa; margin-bottom: 15px;">${bpIcon("bar-chart",14)} Understanding Compa-Ratios</h3>
                <div style="color: #d1d5db; font-size: 0.95em; line-height: 1.7;">
                    <strong>Compa-ratio</strong> = Your salary ÷ Market median × 100%
                    <br><br>
                    <strong>How Companies Use This:</strong>
                    <br>• <strong>80-120%</strong> = Acceptable range
                    <br>• <strong>100%</strong> = Exactly at market median
                    <br>• <strong>&lt;80%</strong> = Underpaid (flight risk)
                    <br>• <strong>&gt;120%</strong> = Overpaid for role
                    <br><br>
                    <strong>Market Rate (50th percentile):</strong> $${totalValue.marketRate.toLocaleString()}
                    <br><strong>Your Worth (with premiums):</strong> $${totalValue.yourWorth.toLocaleString()} (${totalValue.compaRatio}%)
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
                <h3 style="color: #fbbf24; margin-bottom: 15px;">${bpIcon("dollar",14)} Expected Offer Ranges</h3>
                <div style="color: #9ca3af; font-size: 0.9em; margin-bottom: 15px;">
                    Companies typically offer <strong>75-95%</strong> of your market worth. Here's what to expect:
                </div>
                
                <div style="background: rgba(107, 114, 128, 0.2); padding: 15px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #9ca3af;">
                    <div style="color: #9ca3af; font-weight: 600; margin-bottom: 5px;">Conservative Offer (75%)</div>
                    <div style="font-size: 1.3em; color: #e0e0e0; font-weight: 600;">
                        $${totalValue.conservativeOffer.toLocaleString()}
                    </div>
                    <div style="color: #9ca3af; font-size: 0.9em; margin-top: 5px;">
                        Budget-constrained companies • Startups • Non-profits
                    </div>
                </div>
                
                <div style="background: rgba(96, 165, 250, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #60a5fa;">
                    <div style="color: #60a5fa; font-weight: 600; margin-bottom: 5px;">Standard Offer (85%) ← Most Common</div>
                    <div style="font-size: 1.3em; color: #e0e0e0; font-weight: 600;">
                        $${totalValue.standardOffer.toLocaleString()}
                    </div>
                    <div style="color: #9ca3af; font-size: 0.9em; margin-top: 5px;">
                        Typical initial offers • Room to negotiate up
                    </div>
                </div>
                
                <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #10b981;">
                    <div style="color: #10b981; font-weight: 600; margin-bottom: 5px;">Competitive Offer (95%)</div>
                    <div style="font-size: 1.3em; color: #e0e0e0; font-weight: 600;">
                        $${totalValue.competitiveOffer.toLocaleString()}
                    </div>
                    <div style="color: #9ca3af; font-size: 0.9em; margin-top: 5px;">
                        High-demand roles • Top-tier companies • Multiple offers
                    </div>
                </div>
                
                <div style="margin-top: 15px; padding: 15px; background: rgba(251, 191, 36, 0.2); border-radius: 8px;">
                    <div style="color: #fbbf24; font-weight: 600; margin-bottom: 5px;">${bpIcon('lightbulb',14)} Your Negotiation Gap</div>
                    <div style="color: #d1d5db; font-size: 0.95em;">
                        <strong>$${negotiationGap.toLocaleString()}</strong> between standard offer and your worth
                        <br>This is your leverage. Start at your worth ($${totalValue.yourWorth.toLocaleString()}) and negotiate down to competitive range ($${totalValue.competitiveOffer.toLocaleString()}+).
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(251, 191, 36, 0.1); padding: 20px; border-radius: 8px; border-left: 3px solid #fbbf24; margin-bottom: 25px;">
                <h3 style="color: #fbbf24; margin-bottom: 15px;">${bpIcon('target',16)} Your Talking Points</h3>
                <div style="color: #d1d5db; line-height: 1.8;">
                    <p style="margin-bottom: 15px;">
                        <strong style="color: #fbbf24;">1. Lead with Your Worth:</strong><br>
                        "Based on my skill profile and market analysis, my value is in the $${Math.round(totalValue.yourWorth * 0.95 / 1000) * 1000}-$${Math.round(totalValue.yourWorth * 1.05 / 1000) * 1000} range for ${totalValue.roleLevel} roles in ${window._userData.profile.location}."
                    </p>
                    <p style="margin-bottom: 15px;">
                        <strong style="color: #fbbf24;">2. Reference Your Top 10 Skills:</strong><br>
                        "I bring ${totalValue.top10Skills.filter(s => s.level === 'Mastery').length} mastery-level skills including ${totalValue.top10Skills.slice(0, 3).map(s => s.skill).join(', ')}. These command premiums in the current market."
                    </p>
                    <p style="margin-bottom: 15px;">
                        <strong style="color: #fbbf24;">3. Show the Data:</strong><br>
                        "The market rate for ${totalValue.roleLevel} is $${totalValue.marketRate.toLocaleString()}. My critical and high-impact skills justify a ${Math.round(((totalValue.yourWorth - totalValue.marketRate) / totalValue.marketRate) * 100)}% premium."
                    </p>
                    <p style="margin-bottom: 15px;">
                        <strong style="color: #fbbf24;">4. Use Your Outcomes:</strong><br>
                        "I've consistently delivered [cite 2-3 quantified outcomes from your Blueprint]. This track record supports my valuation."
                    </p>
                </div>
            </div>
            
            <div style="background: rgba(96, 165, 250, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #60a5fa; margin-bottom: 15px;">${bpIcon("clipboard",14)} Negotiation Script</h3>
                <div style="color: #d1d5db; line-height: 1.8; font-size: 0.95em;">
                    <strong>When they ask for salary expectations:</strong>
                    <br><br>
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 6px; margin: 10px 0; font-style: italic;">
                    "I appreciate you asking. Based on my research and skill profile, I'm looking at the $${Math.round(totalValue.competitiveOffer / 1000) * 1000}-$${Math.round(totalValue.yourWorth / 1000) * 1000} range. But I'm flexible depending on the total compensation package, including equity and benefits. What range were you considering?"
                    </div>
                    <br>
                    <strong>When they give a low offer ($${totalValue.conservativeOffer.toLocaleString()}):</strong>
                    <br><br>
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 6px; margin: 10px 0; font-style: italic;">
                    "I appreciate the offer. Based on market data for ${totalValue.roleLevel} roles with my skill set${totalValue.top10Skills.length > 0 ? '—particularly my ' + totalValue.top10Skills[0].skill + ' expertise' : ''}—the range is typically closer to $${totalValue.standardOffer.toLocaleString()}-$${totalValue.competitiveOffer.toLocaleString()}. Can we explore options in that range?"
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(96, 165, 250, 0.1); padding: 20px; border-radius: 8px;">
                <h3 style="color: #60a5fa; margin-bottom: 15px;">✓ Best Practices</h3>
                <div style="color: #d1d5db; line-height: 1.8;">
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #10b981;">DO:</strong>
                        <ul style="margin-left: 20px; margin-top: 8px;">
                            <li>Start at your worth ($${totalValue.yourWorth.toLocaleString()})</li>
                            <li>Reference the $${negotiationGap.toLocaleString()} gap as your leverage</li>
                            <li>Cite your top 10 skills as justification</li>
                            <li>Ask about total comp (equity, bonus, benefits)</li>
                            <li>Get offers in writing before negotiating</li>
                        </ul>
                    </div>
                    <div>
                        <strong style="color: #ef4444;">DON'T:</strong>
                        <ul style="margin-left: 20px; margin-top: 8px;">
                            <li>Accept the first offer—they expect negotiation</li>
                            <li>Give a range first—make them lead</li>
                            <li>Focus only on base salary</li>
                            <li>Negotiate without data</li>
                            <li>Accept below $${totalValue.conservativeOffer.toLocaleString()} (75%)</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <button class="export-btn-large" onclick="closeExportModal()" style="width: 100%; margin-top: 25px;">
                Close Guide
            </button>
        </div>
    `;
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

// ===== IMPACT RATING ENGINE =====

let impactRatings = null;

async function loadImpactRatings() {
    try {
        const response = await fetch('onet-impact-ratings.json?v=4.48.36');
        impactRatings = await response.json();
        console.log('✓ Impact ratings loaded');
    } catch (e) {
        console.warn('Impact ratings not available (non-critical):', e.message);
    }
}

// Load impact ratings on startup
loadImpactRatings();

var _onetNameIndex = null;
export function _buildOnetNameIndex() {
    if (_onetNameIndex || !impactRatings) return;
    _onetNameIndex = {};
    ['skills', 'abilities', 'workstyles'].forEach(function(cat) {
        var data = impactRatings[cat];
        if (!data) return;
        Object.keys(data).forEach(function(id) {
            var readable = id.replace(/-/g, ' ').toLowerCase();
            _onetNameIndex[readable] = { category: cat, id: id, data: data[id] };
            readable.split(' and ').forEach(function(part) {
                var t = part.trim();
                if (t.length > 3) _onetNameIndex[t] = { category: cat, id: id, data: data[id] };
            });
        });
    });
}

export function _matchOnetByName(skillName) {
    _buildOnetNameIndex();
    if (!_onetNameIndex) return null;
    var name = (skillName || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (_onetNameIndex[name]) return _onetNameIndex[name];
    var bestMatch = null;
    var bestLen = 0;
    Object.keys(_onetNameIndex).forEach(function(key) {
        if (key.length > bestLen && (name.indexOf(key) !== -1 || key.indexOf(name) !== -1)) {
            bestMatch = _onetNameIndex[key];
            bestLen = key.length;
        }
    });
    return bestMatch;
}

export function getSkillImpact(skill) {
    if (!impactRatings) {
        return { level: 'moderate', label: 'Moderate Impact', icon: bpIcon('diamond',14), rationale: 'Loading ratings...' };
    }
    
    if (skill.category === 'unique') {
        return getUniqueSkillImpact(skill);
    }
    
    var category = skill.category;
    var categoryData = impactRatings[category + 's'];
    var skillRating = null;

    if (categoryData && skill.onetId) {
        skillRating = categoryData[skill.onetId];
    }

    if (!skillRating) {
        var nameMatch = _matchOnetByName(skill.name);
        if (nameMatch) {
            skillRating = nameMatch.data;
        }
    }

    if (!skillRating) {
        var lvl = skill.level || 'Proficient';
        var fallback = lvl === 'Mastery' ? 'high' : lvl === 'Expert' ? 'moderate' : 'standard';
        return { level: fallback, label: getImpactLabel(fallback), icon: getImpactIcon(fallback), rationale: 'Estimated from proficiency level' };
    }
    
    var impactLevel = skillRating.proficiencyMultiplier[skill.level] || skillRating.baseImpact;
    
    return {
        level: impactLevel,
        label: getImpactLabel(impactLevel),
        icon: getImpactIcon(impactLevel),
        rationale: skillRating.rationale,
        executiveImportance: skillRating.executiveImportance,
        marketScarcity: skillRating.marketScarcity
    };
}

export function getUniqueSkillImpact(skill) {
    // Check if user has assessed this skill
    if (skill.userAssessment) {
        return calculateUniqueSkillImpact(skill.userAssessment);
    }
    
    // Try to find comparable O*NET skill
    const comparable = findComparableSkill(skill.name);
    if (comparable) {
        return {
            ...comparable,
            rationale: `Estimated based on similar skills. Consider providing custom assessment for more accuracy.`,
            needsAssessment: true
        };
    }
    
    // Default for unique skills without assessment
    return {
        level: 'high',
        label: 'High Impact',
        icon: '⭐',
        rationale: 'Unique differentiator. Provide assessment for accurate rating.',
        needsAssessment: true
    };
}

export function findComparableSkill(skillName) {
    if (!impactRatings) return null;
    
    const name = skillName.toLowerCase();
    
    // Simple keyword matching to find comparable
    if (name.includes('ai') || name.includes('artificial intelligence')) {
        return getSkillImpact({ category: 'skill', onetId: 'systems-analysis', level: 'Mastery' });
    }
    if (name.includes('strategy')) {
        return getSkillImpact({ category: 'skill', onetId: 'complex-problem-solving', level: 'Mastery' });
    }
    if (name.includes('leadership')) {
        return getSkillImpact({ category: 'workstyle', onetId: 'leadership', level: 'Mastery' });
    }
    
    return null;
}

export function calculateUniqueSkillImpact(assessment) {
    let score = 0;
    
    // Years experience (mastery indicator)
    if (assessment.years >= 10) score += 3;
    else if (assessment.years >= 5) score += 2;
    else score += 1;
    
    // Business impact
    if (assessment.impact === 'major') score += 3;
    else if (assessment.impact === 'significant') score += 2;
    else score += 1;
    
    // Scarcity
    if (assessment.rarity === 'rare') score += 3;
    else if (assessment.rarity === 'uncommon') score += 2;
    else score += 1;
    
    // Salary band
    if (assessment.salaryBand === '>$250k') score += 3;
    else if (assessment.salaryBand === '$150-250k') score += 2;
    else score += 1;
    
    // Total: 4-12
    let impactLevel;
    if (score >= 10) impactLevel = 'critical';
    else if (score >= 8) impactLevel = 'high';
    else if (score >= 6) impactLevel = 'moderate';
    else impactLevel = 'standard';
    
    return {
        level: impactLevel,
        label: getImpactLabel(impactLevel),
        icon: getImpactIcon(impactLevel),
        rationale: 'Based on your assessment',
        userAssessed: true
    };
}

export function getImpactLabel(level) {
    const labels = {
        'critical': 'Critical Impact',
        'high': 'High Impact',
        'moderate': 'Moderate Impact',
        'standard': 'Standard',
        'supplementary': 'Supplementary'
    };
    return labels[level] || 'Moderate Impact';
}

export function getImpactIcon(level) {
    var icons = {
        'critical': bpIcon('flame', 14),
        'high': bpIcon('star', 14),
        'moderate': bpIcon('diamond', 14),
        'standard': bpIcon('check', 14),
        'supplementary': bpIcon('check', 14)
    };
    return icons[level] || bpIcon('diamond', 14);
}

export function getImpactColor(level) {
    const colors = {
        'critical': '#ef4444',
        'high': '#f59e0b',
        'moderate': '#3b82f6',
        'standard': '#6b7280',
        'supplementary': '#9ca3af'
    };
    return colors[level] || '#3b82f6';
}

// ===== SKILL MANAGEMENT FUNCTIONS =====

let onetSelectedSkills = [];
let currentONETTab = 'skills';
let currentEditingSkill = null;


export function closeONETPicker() {
    const modal = document.getElementById('onetPickerModal');
    modal.classList.remove('active');
    onetSelectedSkills = [];
}

window.switchONETTab = function switchONETTab(tab) {
    currentONETTab = tab;
    
    // Update tab styling
    document.querySelectorAll('.onet-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('onetTab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    
    // Load content
    renderONETLibrary();
}

export function renderONETLibrary() {
    const container = document.getElementById('onetLibraryContent');
    const searchQuery = document.getElementById('onetSearchInput').value.toLowerCase();
    
    let html = '';
    let library, categoryKey;
    
    if (currentONETTab === 'skills') {
        library = window.onetSkillsLibrary;
        categoryKey = 'skill';
    } else if (currentONETTab === 'abilities') {
        library = window.onetAbilitiesLibrary;
        categoryKey = 'ability';
    } else if (currentONETTab === 'knowledge') {
        library = window.onetKnowledgeLibrary;
        categoryKey = 'knowledge';
    } else if (currentONETTab === 'activities') {
        library = window.onetWorkActivitiesLibrary;
        categoryKey = 'workactivity';
    } else {
        library = window.onetWorkStylesLibrary;
        categoryKey = 'workstyle';
    }
    
    if (!library) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;">
            Library not loaded.<br><small style="opacity:0.6">Make sure the JSON file is deployed to GitHub.</small>
        </div>`;
        return;
    }
    
    // Get user's existing skills of this category
    const existingSkillNames = window._userData.skills
        .filter(s => s.category === categoryKey)
        .map(s => s.name);
    
    // Knowledge and Work Activities: flat arrays grouped by onetGroup
    if (currentONETTab === 'knowledge' || currentONETTab === 'activities') {
        const items = currentONETTab === 'knowledge' ? library.knowledge : library.activities;
        const grouped = {};
        items.forEach(item => {
            const grp = item.group || 'Other';
            if (!grouped[grp]) grouped[grp] = [];
            grouped[grp].push(item);
        });
        Object.entries(grouped).forEach(([groupName, groupItems]) => {
            let groupHtml = '';
            let hasResults = false;
            groupItems.forEach(item => {
                const isAdded = existingSkillNames.includes(item.name);
                const isSelected = onetSelectedSkills.some(s => s.id === item.onetCode);
                const matchesSearch = !searchQuery ||
                    item.name.toLowerCase().includes(searchQuery) ||
                    (item.description || '').toLowerCase().includes(searchQuery);
                if (!matchesSearch) return;
                hasResults = true;
                // Normalize to expected shape
                const normalized = {
                    id: item.onetCode,
                    name: item.name,
                    definition: item.description || '',
                    category: categoryKey
                };
                groupHtml += renderONETSkillItem(normalized, categoryKey, isAdded, isSelected);
            });
            if (hasResults) {
                html += `<div class="onet-category">
                    <div class="onet-category-title">▼ ${groupName}</div>
                    ${groupHtml}
                </div>`;
            }
        });
    } else if (currentONETTab === 'workstyles') {
        // Work styles are a flat array
        const wsItems = library.workStyles || [];
        // Group by onetGroup if available
        const grouped = {};
        wsItems.forEach(item => {
            const grp = item.group || item.onetGroup || 'Work Styles';
            if (!grouped[grp]) grouped[grp] = [];
            grouped[grp].push(item);
        });
        const isGrouped = Object.keys(grouped).length > 1;
        wsItems.forEach(item => {
            const isAdded = existingSkillNames.includes(item.name);
            const isSelected = onetSelectedSkills.some(s => s.id === (item.id || item.onetCode));
            const matchesSearch = !searchQuery || 
                item.name.toLowerCase().includes(searchQuery) ||
                (item.definition || item.description || '').toLowerCase().includes(searchQuery);
            
            if (!matchesSearch) return;
            
            // Normalize
            const normalized = {
                id: item.id || item.onetCode,
                name: item.name,
                definition: item.definition || item.description || '',
                category: categoryKey
            };
            html += renderONETSkillItem(normalized, categoryKey, isAdded, isSelected);
        });
    } else {
        // Skills and abilities have category/subcategory structure
        const categories = currentONETTab === 'skills' ? library.categories : library.categories;
        
        Object.entries(categories).forEach(([catId, category]) => {
            let categoryHtml = '';
            let categoryHasResults = false;
            
            if (category.subcategories) {
                Object.entries(category.subcategories).forEach(([subId, subcategory]) => {
                    let subcategoryHtml = '';
                    let subcategoryHasResults = false;
                    
                    const items = currentONETTab === 'skills' ? subcategory.skills : subcategory.abilities;
                    if (!items) return;
                    
                    items.forEach(item => {
                        const isAdded = existingSkillNames.includes(item.name);
                        const isSelected = onetSelectedSkills.some(s => s.id === item.id);
                        const matchesSearch = !searchQuery || 
                            item.name.toLowerCase().includes(searchQuery) ||
                            item.definition.toLowerCase().includes(searchQuery);
                        
                        if (!matchesSearch) return;
                        
                        subcategoryHtml += renderONETSkillItem(item, categoryKey, isAdded, isSelected);
                        subcategoryHasResults = true;
                        categoryHasResults = true;
                    });
                    
                    if (subcategoryHasResults) {
                        categoryHtml += `
                            <div class="onet-subcategory">
                                <div class="onet-subcategory-title">${subcategory.name}</div>
                                ${subcategoryHtml}
                            </div>
                        `;
                    }
                });
            }
            
            if (categoryHasResults) {
                html += `
                    <div class="onet-category">
                        <div class="onet-category-title">▼ ${category.name}</div>
                        ${categoryHtml}
                    </div>
                `;
            }
        });
    }
    
    if (!html) {
        html = '<div style="text-align: center; padding: 40px; color: #9ca3af;">No results found</div>';
    }
    
    container.innerHTML = html;
    updateONETSelectedCount();
}

export function renderONETSkillItem(item, category, isAdded, isSelected) {
    const disabled = isAdded ? 'disabled' : '';
    const selectedClass = isSelected ? 'selected' : '';
    
    return `
        <div class="onet-skill-item ${disabled} ${selectedClass}" 
             onclick="${isAdded ? '' : `toggleONETSkillSelection('${item.id}', '${item.name}', '${category}')`}">
            <input type="checkbox" 
                   class="onet-skill-checkbox" 
                   ${isSelected ? 'checked' : ''}
                   ${isAdded ? 'disabled' : ''}
                   onclick="event.stopPropagation();">
            <div class="onet-skill-content">
                <div class="onet-skill-name">
                    ${item.name}
                    ${isAdded ? '<span class="onet-skill-added">✓ Added</span>' : ''}
                </div>
                <div class="onet-skill-definition">${item.definition}</div>
            </div>
        </div>
    `;
}

export function toggleONETSkillSelection(id, name, category) {
    const index = onetSelectedSkills.findIndex(s => s.id === id);
    
    if (index === -1) {
        onetSelectedSkills.push({ id, name, category });
    } else {
        onetSelectedSkills.splice(index, 1);
    }
    
    renderONETLibrary();
    updateONETSelectedCount(); // FIX: Update count display
}

export function updateONETSelectedCount() {
    const count = onetSelectedSkills.length;
    const countEl = document.getElementById('onetSelectedCount');
    const buttonEl = document.getElementById('onetAddButton');
    
    if (count === 0) {
        countEl.textContent = 'Select skills to add';
        buttonEl.disabled = true;
        buttonEl.style.opacity = '0.5';
    } else {
        countEl.textContent = `${count} skill${count > 1 ? 's' : ''} selected`;
        buttonEl.disabled = false;
        buttonEl.style.opacity = '1';
    }
}

export function filterONETLibrary() {
    renderONETLibrary();
}

export function addSelectedONETSkills() {
    if (onetSelectedSkills.length === 0) return;
    
    var existingNames = new Set((window._userData.skills || []).map(function(s) { return s.name.toLowerCase(); }));
    var added = 0, skipped = 0;
    
    onetSelectedSkills.forEach(selectedSkill => {
        if (existingNames.has(selectedSkill.name.toLowerCase())) { skipped++; return; }
        if ((window._userData.skills || []).length >= PROFILE_SKILL_CAP) { skipped++; return; }
        existingNames.add(selectedSkill.name.toLowerCase());
        
        // Create skill object
        const newSkill = {
            name: selectedSkill.name,
            category: selectedSkill.category,
            onetId: selectedSkill.id,
            level: 'Advanced', // Default
            roles: [window._userData.roles[0].id], // Default to first role
            key: false
        };
        
        // Add to userData
        window._userData.skills.push(newSkill);
        _sd().skills.push(newSkill);
        added++;
    });
    
    // Save and refresh
    saveUserData();
    rescoreAllJobs();
    refreshAllViews();
    
    closeONETPicker();
    
    // Show success message
    var msg = 'Added ' + added + ' skill' + (added !== 1 ? 's' : '') + '.';
    if (skipped > 0) msg += ' ' + skipped + ' skipped (duplicates or cap reached).';
    if ((window._userData.skills || []).length >= PROFILE_SKILL_CAP) msg += ' Profile skill cap (' + PROFILE_SKILL_CAP + ') reached.';
    showToast(msg, added > 0 ? 'success' : 'warning');
}


export function closeCustomSkillBuilder() {
    const modal = document.getElementById('customSkillModal');
    modal.classList.remove('active');
}

export function createCustomSkill() {
    if (readOnlyGuard()) return;
    const name = document.getElementById('customSkillName').value.trim();
    const levelEl = document.querySelector('input[name="customSkillLevel"]:checked');
    if (!levelEl) { showToast('Please select a proficiency level.', 'warning'); return; }
    const level = levelEl.value;
    const core = document.getElementById('customSkillCore').checked;
    let roles = Array.from(document.querySelectorAll('.custom-skill-role-checkbox:checked')).map(cb => cb.value);
    
    // Validate
    if (!name) {
        showToast('Please enter a skill name.', 'warning');
        return;
    }
    
    if (roles.length === 0) {
        roles = (window._userData.roles || []).map(function(r) { return r.id; });
    }
    
    // Check for duplicates (case-insensitive)
    if (window._userData.skills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        showToast('A skill with this name already exists.', 'warning');
        return;
    }
    
    // Skill cap check
    if (!canAddSkill()) return;
    
    // Create skill
    const newSkill = {
        name: name,
        category: 'unique',
        level: level,
        roles: roles,
        key: core
    };
    
    // Add to userData
    window._userData.skills.push(newSkill);
    _sd().skills.push(newSkill);
    
    // Register in skill library index so future job parses can match it
    registerInSkillLibrary(name, 'unique');
    
    // Save, re-score jobs, refresh
    saveUserData();
    rescoreAllJobs();
    refreshAllViews();
    
    closeCustomSkillBuilder();
    
    showToast(`Created "${name}".`, 'success');
}

// ===== BULK SKILL IMPORT =====
var _bulkParsedSkills = []; // Staged skills from parse step
var _bulkCsvData = null;    // Raw CSV text from file upload

export function openBulkImport() {
    // Block in sample mode
    var isSample = window.isReadOnlyProfile || (window.currentProfileType && window.currentProfileType !== 'user');
    if (!isSample && typeof skillsData !== 'undefined' && _sd().sample) isSample = true;
    if (isSample) { showToast('Bulk import is not available in sample/demo mode.', 'warning'); return; }

    var modal = document.getElementById('bulkImportModal');
    if (!modal) return;
    
    // Reset state
    _bulkParsedSkills = [];
    _bulkCsvData = null;
    document.getElementById('bulkSkillsText').value = '';
    document.getElementById('bulkCsvFile').value = '';
    document.getElementById('bulkCsvPreview').innerHTML = '';
    document.getElementById('bulkImportStep1').style.display = '';
    document.getElementById('bulkImportStep2').style.display = 'none';
    switchBulkTab('text');
    
    // Populate role checkboxes from current profile
    var rolesEl = document.getElementById('bulkImportRoles');
    rolesEl.innerHTML = (window._userData.roles || []).map(function(role) {
        return '<label style="display:flex; align-items:center; gap:8px; cursor:pointer;">'
            + '<input type="checkbox" value="' + escapeHtml(role.id) + '" class="bulk-role-checkbox">'
            + '<span style="font-size:0.9em;">' + escapeHtml(role.name) + '</span></label>';
    }).join('');
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}
if (!window.openBulkImport) window.openBulkImport = openBulkImport;

export function closeBulkImport() {
    var modal = document.getElementById('bulkImportModal');
    if (modal) modal.classList.remove('active');
}
if (!window.closeBulkImport) window.closeBulkImport = closeBulkImport;

export function switchBulkTab(tab) {
    document.getElementById('bulkTabText').className = 'onet-tab' + (tab === 'text' ? ' active' : '');
    document.getElementById('bulkTabCsv').className = 'onet-tab' + (tab === 'csv' ? ' active' : '');
    document.getElementById('bulkTextInput').style.display = tab === 'text' ? '' : 'none';
    document.getElementById('bulkCsvInput').style.display = tab === 'csv' ? '' : 'none';
}
if (!window.switchBulkTab) window.switchBulkTab = switchBulkTab;

export function handleBulkCsvFile(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        _bulkCsvData = e.target.result;
        var lines = _bulkCsvData.split('\n').filter(function(l) { return l.trim(); });
        document.getElementById('bulkCsvPreview').innerHTML = '✓ Loaded ' + escapeHtml(file.name) + ' (' + lines.length + ' lines, ' + Math.round(file.size / 1024) + ' KB)';
    };
    reader.readAsText(file);
}
if (!window.handleBulkCsvFile) window.handleBulkCsvFile = handleBulkCsvFile;

var VALID_LEVELS = ['Novice', 'Competent', 'Proficient', 'Advanced', 'Expert', 'Mastery'];
var LEVEL_LOOKUP = {};
VALID_LEVELS.forEach(function(l) { LEVEL_LOOKUP[l.toLowerCase()] = l; });

export function parseBulkSkills() {
    var defaultLevel = document.getElementById('bulkDefaultLevel').value;
    var roles = Array.from(document.querySelectorAll('.bulk-role-checkbox:checked')).map(function(cb) { return cb.value; });
    
    // If no roles checked, assign to all current roles
    if (roles.length === 0) {
        roles = (window._userData.roles || []).map(function(r) { return r.id; });
    }
    
    var rawItems = [];
    
    // Check which tab is active
    var csvActive = document.getElementById('bulkCsvInput').style.display !== 'none';
    
    if (csvActive && _bulkCsvData) {
        rawItems = parseCsvToItems(_bulkCsvData, defaultLevel);
    } else {
        var text = document.getElementById('bulkSkillsText').value.trim();
        if (!text) {
            showToast('Paste some skills first.', 'warning');
            return;
        }
        rawItems = parseTextToItems(text, defaultLevel);
    }
    
    if (rawItems.length === 0) {
        showToast('No valid skills found in input.', 'warning');
        return;
    }
    
    // Deduplicate within the import list itself
    var seen = {};
    var deduped = [];
    rawItems.forEach(function(item) {
        var key = item.name.toLowerCase();
        if (!seen[key]) {
            seen[key] = true;
            deduped.push(item);
        }
        // If dupe within import, keep higher level
        else {
            var existing = deduped.find(function(d) { return d.name.toLowerCase() === key; });
            if (existing && proficiencyValue(item.level) > proficiencyValue(existing.level)) {
                existing.level = item.level;
            }
        }
    });
    
    // Now compare against existing profile skills + synonyms
    var existingMap = {};
    (window._userData.skills || []).forEach(function(s) {
        existingMap[s.name.toLowerCase()] = s;
        var syns = getSkillSynonyms(s.name.toLowerCase());
        syns.forEach(function(syn) { existingMap[syn] = s; });
    });
    
    var mergeStrategy = document.getElementById('bulkMergeStrategy').value;
    
    _bulkParsedSkills = deduped.map(function(item) {
        var key = item.name.toLowerCase();
        var existingSkill = existingMap[key];
        
        // Also check synonyms of the import skill
        if (!existingSkill) {
            var importSyns = getSkillSynonyms(key);
            for (var i = 0; i < importSyns.length; i++) {
                if (existingMap[importSyns[i]]) {
                    existingSkill = existingMap[importSyns[i]];
                    break;
                }
            }
        }
        
        var action = 'add';
        var conflict = null;
        
        if (existingSkill) {
            conflict = existingSkill;
            if (mergeStrategy === 'skip') {
                action = 'skip';
            } else if (mergeStrategy === 'higher') {
                if (proficiencyValue(item.level) > proficiencyValue(existingSkill.level)) {
                    action = 'upgrade';
                } else {
                    action = 'skip';
                }
            } else {
                action = 'overwrite';
            }
        }
        
        return {
            name: item.name,
            level: item.level,
            category: item.category || 'unique',
            core: item.core || false,
            roles: roles,
            action: action,
            conflict: conflict
        };
    });
    
    renderBulkReview();
}
if (!window.parseBulkSkills) window.parseBulkSkills = parseBulkSkills;

export function parseTextToItems(text, defaultLevel) {
    var items = [];
    // Split by newlines first, then try commas if single line
    var lines = text.split(/\n/).map(function(l) { return l.trim(); }).filter(Boolean);
    
    // If only one line and it has commas but no level keywords, treat as comma-separated names
    if (lines.length === 1 && lines[0].indexOf(',') !== -1) {
        var parts = lines[0].split(',').map(function(p) { return p.trim(); }).filter(Boolean);
        // Check if any part looks like a level
        var hasLevels = parts.some(function(p) { return LEVEL_LOOKUP[p.toLowerCase()]; });
        if (!hasLevels) {
            // All names, no levels
            parts.forEach(function(name) {
                if (name.length > 1 && name.length < 100) items.push({ name: titleCase(name), level: defaultLevel });
            });
            return items;
        }
    }
    
    lines.forEach(function(line) {
        // Strip bullet points, dashes, numbers at start
        line = line.replace(/^[\s\-\u2022\u2023\u25E6\u2043\*\d\.)\]]+\s*/, '').trim();
        if (!line || line.length < 2) return;
        
        // Try "Name, Level" or "Name - Level" format
        var match = line.match(/^(.+?)\s*[,\-\|]\s*(Novice|Competent|Proficient|Advanced|Expert|Mastery)\s*$/i);
        if (match) {
            items.push({ name: titleCase(match[1].trim()), level: LEVEL_LOOKUP[match[2].toLowerCase()] || defaultLevel });
        } else {
            // Just a name
            items.push({ name: titleCase(line), level: defaultLevel });
        }
    });
    
    return items;
}

export function parseCsvToItems(csvText, defaultLevel) {
    var items = [];
    var lines = csvText.split(/\r?\n/).filter(function(l) { return l.trim(); });
    if (lines.length < 2) return items; // Need header + at least 1 data row
    
    // Parse header
    var sep = lines[0].indexOf('\t') !== -1 ? '\t' : ',';
    var headers = lines[0].split(sep).map(function(h) { return h.trim().toLowerCase().replace(/['"]/g, ''); });
    
    var nameCol = headers.indexOf('name');
    if (nameCol === -1) nameCol = headers.indexOf('skill');
    if (nameCol === -1) nameCol = headers.indexOf('skill name');
    if (nameCol === -1) nameCol = 0; // Fallback to first column
    
    var levelCol = headers.indexOf('level');
    if (levelCol === -1) levelCol = headers.indexOf('proficiency');
    
    var catCol = headers.indexOf('category');
    if (catCol === -1) catCol = headers.indexOf('type');
    
    var coreCol = headers.indexOf('core');
    if (coreCol === -1) coreCol = headers.indexOf('key');
    if (coreCol === -1) coreCol = headers.indexOf('differentiator');
    
    // Parse rows
    for (var i = 1; i < lines.length; i++) {
        var cols = parseCsvLine(lines[i], sep);
        var name = (cols[nameCol] || '').trim();
        if (!name || name.length < 2) continue;
        
        var level = defaultLevel;
        if (levelCol !== -1 && cols[levelCol]) {
            var parsed = LEVEL_LOOKUP[(cols[levelCol] || '').trim().toLowerCase()];
            if (parsed) level = parsed;
        }
        
        var category = 'unique';
        if (catCol !== -1 && cols[catCol]) category = cols[catCol].trim().toLowerCase() || 'unique';
        
        var core = false;
        if (coreCol !== -1 && cols[coreCol]) {
            var cv = cols[coreCol].trim().toLowerCase();
            core = cv === 'true' || cv === 'yes' || cv === '1' || cv === 'x';
        }
        
        items.push({ name: titleCase(name), level: level, category: category, core: core });
    }
    
    return items;
}

// Simple CSV line parser (handles quoted fields with commas)
export function parseCsvLine(line, sep) {
    var result = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
        var c = line[i];
        if (c === '"' || c === "'") {
            inQuotes = !inQuotes;
        } else if (c === sep && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += c;
        }
    }
    result.push(current.trim());
    return result;
}

export function titleCase(str) {
    // Capitalize first letter of each word, but keep acronyms uppercase
    return str.replace(/\b\w+/g, function(word) {
        if (word === word.toUpperCase() && word.length <= 5) return word; // Keep acronyms like ATS, CRM, SQL
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

export function renderBulkReview() {
    document.getElementById('bulkImportStep1').style.display = 'none';
    document.getElementById('bulkImportStep2').style.display = '';
    
    var adding = _bulkParsedSkills.filter(function(s) { return s.action === 'add'; });
    var upgrading = _bulkParsedSkills.filter(function(s) { return s.action === 'upgrade'; });
    var overwriting = _bulkParsedSkills.filter(function(s) { return s.action === 'overwrite'; });
    var skipping = _bulkParsedSkills.filter(function(s) { return s.action === 'skip'; });
    
    var actionCount = adding.length + upgrading.length + overwriting.length;
    
    var summaryHtml = '<div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:16px;">'
        + '<div style="text-align:center; padding:12px; border-radius:8px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2);">'
        + '<div style="font-size:1.4em; font-weight:700; color:#10b981;">' + adding.length + '</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted);">New</div></div>'
        + '<div style="text-align:center; padding:12px; border-radius:8px; background:rgba(96,165,250,0.08); border:1px solid rgba(96,165,250,0.2);">'
        + '<div style="font-size:1.4em; font-weight:700; color:#60a5fa;">' + upgrading.length + '</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted);">Upgrading</div></div>'
        + '<div style="text-align:center; padding:12px; border-radius:8px; background:rgba(251,191,36,0.08); border:1px solid rgba(251,191,36,0.2);">'
        + '<div style="font-size:1.4em; font-weight:700; color:#f59e0b;">' + overwriting.length + '</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted);">Overwriting</div></div>'
        + '<div style="text-align:center; padding:12px; border-radius:8px; background:rgba(107,114,128,0.06); border:1px solid rgba(107,114,128,0.15);">'
        + '<div style="font-size:1.4em; font-weight:700; color:#6b7280;">' + skipping.length + '</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted);">Skipped</div></div>'
        + '</div>';
    
    document.getElementById('bulkReviewSummary').innerHTML = summaryHtml;
    document.getElementById('bulkImportConfirmBtn').textContent = 'Import ' + actionCount + ' Skill' + (actionCount !== 1 ? 's' : '');
    document.getElementById('bulkImportConfirmBtn').disabled = actionCount === 0;
    document.getElementById('bulkImportConfirmBtn').style.opacity = actionCount === 0 ? '0.4' : '1';
    
    // Build review list
    var listHtml = '';
    
    _bulkParsedSkills.forEach(function(skill, idx) {
        var bg, icon, detail;
        if (skill.action === 'add') {
            bg = 'rgba(16,185,129,0.06)'; icon = '✚'; detail = '<span style="color:#10b981;">New at ' + skill.level + '</span>';
        } else if (skill.action === 'upgrade') {
            bg = 'rgba(96,165,250,0.06)'; icon = '⬆'; detail = '<span style="color:#60a5fa;">' + skill.conflict.level + ' → ' + skill.level + '</span>';
        } else if (skill.action === 'overwrite') {
            bg = 'rgba(251,191,36,0.06)'; icon = '↻'; detail = '<span style="color:#f59e0b;">Replace ' + skill.conflict.level + ' with ' + skill.level + '</span>';
        } else {
            bg = 'rgba(107,114,128,0.04)'; icon = '⊘';
            var reason = skill.conflict ? 'Already exists as "' + skill.conflict.name + '" (' + skill.conflict.level + ')' : 'Duplicate';
            detail = '<span style="color:#6b7280;">' + reason + '</span>';
        }
        
        listHtml += '<div style="display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:6px; background:' + bg + '; margin-bottom:4px;">'
            + '<span style="font-size:1.1em; width:20px; text-align:center;">' + icon + '</span>'
            + '<span style="flex:1; font-weight:500; font-size:0.9em; color:var(--text-primary);">' + skill.name + '</span>'
            + '<span style="font-size:0.82em;">' + detail + '</span>'
            + '<select data-bulk-idx="' + idx + '" onchange="updateBulkAction(this)" '
            + 'style="padding:4px 8px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; color:var(--text-primary); font-size:0.78em;">'
            + '<option value="add"' + (skill.action === 'add' ? ' selected' : '') + '>Add</option>'
            + (skill.conflict ? '<option value="upgrade"' + (skill.action === 'upgrade' ? ' selected' : '') + '>Upgrade</option>' : '')
            + (skill.conflict ? '<option value="overwrite"' + (skill.action === 'overwrite' ? ' selected' : '') + '>Overwrite</option>' : '')
            + '<option value="skip"' + (skill.action === 'skip' ? ' selected' : '') + '>Skip</option>'
            + '</select>'
            + '</div>';
    });
    
    document.getElementById('bulkReviewList').innerHTML = listHtml;
}

export function updateBulkAction(select) {
    var idx = parseInt(select.getAttribute('data-bulk-idx'));
    if (!isNaN(idx) && _bulkParsedSkills[idx]) {
        _bulkParsedSkills[idx].action = select.value;
        // Re-render summary counts
        var adding = _bulkParsedSkills.filter(function(s) { return s.action === 'add'; }).length;
        var upgrading = _bulkParsedSkills.filter(function(s) { return s.action === 'upgrade'; }).length;
        var overwriting = _bulkParsedSkills.filter(function(s) { return s.action === 'overwrite'; }).length;
        var actionCount = adding + upgrading + overwriting;
        document.getElementById('bulkImportConfirmBtn').textContent = 'Import ' + actionCount + ' Skill' + (actionCount !== 1 ? 's' : '');
        document.getElementById('bulkImportConfirmBtn').disabled = actionCount === 0;
        document.getElementById('bulkImportConfirmBtn').style.opacity = actionCount === 0 ? '0.4' : '1';
    }
}
if (!window.updateBulkAction) window.updateBulkAction = updateBulkAction;

export function bulkImportBack() {
    document.getElementById('bulkImportStep1').style.display = '';
    document.getElementById('bulkImportStep2').style.display = 'none';
}
if (!window.bulkImportBack) window.bulkImportBack = bulkImportBack;

export function toggleBulkProfileOptions() {
    var dest = document.querySelector('input[name="bulkDestination"]:checked');
    var opts = document.getElementById('bulkProfileOptions');
    if (dest && opts) {
        opts.style.display = dest.value === 'library' ? 'none' : '';
    }
}
if (!window.toggleBulkProfileOptions) window.toggleBulkProfileOptions = toggleBulkProfileOptions;

export function executeBulkImport() {
    var dest = document.querySelector('input[name="bulkDestination"]:checked');
    var libraryOnly = dest && dest.value === 'library';
    var added = 0, upgraded = 0, overwritten = 0, registered = 0;
    
    _bulkParsedSkills.forEach(function(item) {
        if (item.action === 'skip') return;
        
        // Always register in library
        registerInSkillLibrary(item.name, item.category || 'unique');
        registered++;
        
        if (libraryOnly) return; // Don't touch profile
        
        if (item.action === 'add') {
            var newSkill = { name: item.name, category: item.category, level: item.level, roles: item.roles, key: item.core };
            window._userData.skills.push(newSkill);
            _sd().skills.push(newSkill);
            added++;
        } else if (item.action === 'upgrade' || item.action === 'overwrite') {
            var existing = window._userData.skills.find(function(s) { return s.name.toLowerCase() === (item.conflict ? item.conflict.name.toLowerCase() : item.name.toLowerCase()); });
            if (existing) {
                existing.level = item.level;
                if (item.action === 'overwrite') {
                    existing.key = item.core;
                }
                var sdIdx = _sd().skills.findIndex(function(s) { return s.name === existing.name; });
                if (sdIdx !== -1) _sd().skills[sdIdx] = {...existing};
                if (item.action === 'upgrade') upgraded++;
                else overwritten++;
            }
        }
    });
    
    // Save, rescore, refresh
    saveUserData();
    if (fbUser) debouncedSave();
    rescoreAllJobs();
    refreshAllViews();
    
    closeBulkImport();
    
    var parts = [];
    if (libraryOnly) {
        parts.push(registered + ' added to library');
    } else {
        if (added) parts.push(added + ' added');
        if (upgraded) parts.push(upgraded + ' upgraded');
        if (overwritten) parts.push(overwritten + ' overwritten');
    }
    showToast('Bulk import: ' + parts.join(', ') + '.', 'success', 5000);
}
if (!window.executeBulkImport) window.executeBulkImport = executeBulkImport;

// ===== BULK SKILL MANAGER =====
export function openBulkManager() {
    // Block in sample mode
    var isSample = window.isReadOnlyProfile || (window.currentProfileType && window.currentProfileType !== 'user');
    if (!isSample && typeof skillsData !== 'undefined' && _sd().sample) isSample = true;
    if (isSample) { showToast('Bulk edit is not available in sample/demo mode.', 'warning'); return; }

    var modal = document.getElementById('bulkSkillManagerModal');
    if (!modal) return;
    document.getElementById('bulkManagerSearch').value = '';
    document.getElementById('bulkManagerSelectAll').checked = false;
    renderBulkManagerList();
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}
if (!window.openBulkManager) window.openBulkManager = openBulkManager;

export function closeBulkManager() {
    var modal = document.getElementById('bulkSkillManagerModal');
    if (modal) modal.classList.remove('active');
}
if (!window.closeBulkManager) window.closeBulkManager = closeBulkManager;

export function renderBulkManagerList() {
    var search = (document.getElementById('bulkManagerSearch').value || '').toLowerCase();
    var skills = (window._userData.skills || []).slice().sort(function(a, b) { return a.name.localeCompare(b.name); });
    
    if (search) {
        skills = skills.filter(function(s) { return s.name.toLowerCase().indexOf(search) !== -1; });
    }
    
    document.getElementById('bulkManagerCount').textContent = skills.length + ' skill' + (skills.length !== 1 ? 's' : '');
    
    var levelColors = { Novice: '#94a3b8', Competent: '#22d3ee', Proficient: '#60a5fa', Advanced: '#a78bfa', Expert: '#fb923c', Mastery: '#10b981' };
    
    var html = skills.map(function(skill) {
        var lc = levelColors[skill.level] || '#6b7280';
        var roleNames = (skill.roles || []).map(function(rid) {
            var r = (window._userData.roles || []).find(function(role) { return role.id === rid; });
            return r ? r.name : rid;
        }).join(', ') || 'All roles';
        
        return '<div class="bm-row" style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:6px; border-bottom:1px solid var(--border);">'
            + '<input type="checkbox" class="bm-checkbox" value="' + skill.name.replace(/"/g, '&quot;') + '" onchange="updateBulkManagerSelection()">'
            + '<span style="flex:1; font-size:0.9em; font-weight:500; color:var(--text-primary);">' + skill.name + '</span>'
            + '<span style="font-size:0.75em; padding:3px 8px; border-radius:4px; background:' + lc + '22; color:' + lc + '; font-weight:600;">' + skill.level + '</span>'
            + '<span style="font-size:0.75em; color:var(--text-muted); max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="' + roleNames + '">' + roleNames + '</span>'
            + '</div>';
    }).join('');
    
    if (!html) html = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No skills match your filter.</div>';
    
    document.getElementById('bulkManagerList').innerHTML = html;
    updateBulkManagerSelection();
}

export function filterBulkManager() {
    renderBulkManagerList();
}
if (!window.filterBulkManager) window.filterBulkManager = filterBulkManager;

export function toggleBulkManagerAll(checked) {
    var boxes = document.querySelectorAll('.bm-checkbox');
    boxes.forEach(function(cb) { cb.checked = checked; });
    updateBulkManagerSelection();
}
if (!window.toggleBulkManagerAll) window.toggleBulkManagerAll = toggleBulkManagerAll;

export function updateBulkManagerSelection() {
    var checked = document.querySelectorAll('.bm-checkbox:checked');
    var bar = document.getElementById('bulkManagerActions');
    var label = document.getElementById('bulkManagerSelected');
    if (checked.length > 0) {
        bar.style.display = 'flex';
        label.textContent = checked.length + ' selected';
    } else {
        bar.style.display = 'none';
    }
}
if (!window.updateBulkManagerSelection) window.updateBulkManagerSelection = updateBulkManagerSelection;

export function getSelectedBulkSkillNames() {
    return Array.from(document.querySelectorAll('.bm-checkbox:checked')).map(function(cb) { return cb.value; });
}

export function bulkManagerSetLevel() {
    var names = getSelectedBulkSkillNames();
    if (names.length === 0) return;
    
    // Build a small inline picker
    var bar = document.getElementById('bulkManagerActions');
    var levels = ['Novice', 'Competent', 'Proficient', 'Advanced', 'Expert', 'Mastery'];
    var html = '<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:8px;" id="bmLevelPicker">'
        + '<span style="font-size:0.82em; color:var(--text-muted);">Set ' + names.length + ' skill' + (names.length > 1 ? 's' : '') + ' to:</span>';
    levels.forEach(function(l) {
        html += '<button onclick="executeBulkSetLevel(\'' + l + '\')" style="padding:5px 12px; border-radius:5px; cursor:pointer; font-size:0.82em; font-weight:600; '
            + 'background:rgba(139,92,246,0.1); color:#a78bfa; border:1px solid rgba(139,92,246,0.25);">' + l + '</button>';
    });
    html += '<button onclick="document.getElementById(\'bmLevelPicker\').remove();" style="padding:5px 10px; border:none; background:none; cursor:pointer; color:var(--text-muted); font-size:0.82em;">Cancel</button>';
    html += '</div>';
    
    // Remove existing picker if any
    var existing = document.getElementById('bmLevelPicker');
    if (existing) existing.remove();
    
    bar.insertAdjacentHTML('beforeend', html);
}
if (!window.bulkManagerSetLevel) window.bulkManagerSetLevel = bulkManagerSetLevel;

export function executeBulkSetLevel(level) {
    var names = getSelectedBulkSkillNames();
    var count = 0;
    names.forEach(function(name) {
        var skill = window._userData.skills.find(function(s) { return s.name === name; });
        if (skill) {
            skill.level = level;
            var sdIdx = _sd().skills.findIndex(function(s) { return s.name === name; });
            if (sdIdx !== -1) _sd().skills[sdIdx].level = level;
            count++;
        }
    });
    
    saveUserData();
    if (fbUser) debouncedSave();
    rescoreAllJobs();
    refreshAllViews();
    renderBulkManagerList();
    showToast('Set ' + count + ' skill' + (count !== 1 ? 's' : '') + ' to ' + level + '.', 'success');
}
if (!window.executeBulkSetLevel) window.executeBulkSetLevel = executeBulkSetLevel;

export function bulkManagerRemove() {
    var names = getSelectedBulkSkillNames();
    if (names.length === 0) return;
    if (!confirm('Remove ' + names.length + ' skill' + (names.length > 1 ? 's' : '') + ' from this profile?\n\nThis cannot be undone.')) return;
    
    var count = 0;
    names.forEach(function(name) {
        var idx = window._userData.skills.findIndex(function(s) { return s.name === name; });
        if (idx !== -1) { window._userData.skills.splice(idx, 1); count++; }
        var sdIdx = _sd().skills.findIndex(function(s) { return s.name === name; });
        if (sdIdx !== -1) _sd().skills.splice(sdIdx, 1);
    });
    
    saveUserData();
    if (fbUser) debouncedSave();
    rescoreAllJobs();
    refreshAllViews();
    renderBulkManagerList();
    showToast('Removed ' + count + ' skill' + (count !== 1 ? 's' : '') + ' from profile.', 'info');
}
if (!window.bulkManagerRemove) window.bulkManagerRemove = bulkManagerRemove;

export function openEditSkillModal(skillName, category) {
    if (readOnlyGuard()) return;
    const skill = window._userData.skills.find(s => s.name === skillName);
    if (!skill) return;
    
    currentEditingSkill = skillName;
    const modal = document.getElementById('editSkillModal');
    
    // Populate form
    document.getElementById('editSkillName').value = skill.name;
    var levelRadio = document.querySelector('input[name="editSkillLevel"][value="' + skill.level + '"]');
    if (levelRadio) levelRadio.checked = true;
    else {
        // Fallback: try to find closest match
        var fb = document.querySelector('input[name="editSkillLevel"][value="Proficient"]');
        if (fb) fb.checked = true;
    }
    document.getElementById('editSkillCore').checked = skill.key || false;
    
    // Populate roles
    const rolesContainer = document.getElementById('editSkillRoles');
    rolesContainer.innerHTML = window._userData.roles.map(role => `
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" value="${escapeHtml(role.id)}" class="edit-skill-role-checkbox" ${skill.roles.includes(role.id) ? 'checked' : ''}>
            <span>${escapeHtml(role.name)}</span>
        </label>
    `).join('');
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
    
    // Populate evidence status (v4.16.1)
    var evStatus = document.getElementById('editSkillEvidenceStatus');
    if (evStatus && typeof getEvidenceSummary === 'function') {
        var evs = getEvidenceSummary(skill);
        var evColor = evs.hasGap ? 'var(--c-warn)' : 'var(--c-success)';
        var evBg = evs.hasGap ? 'var(--c-amber-bg-2b)' : 'var(--c-green-bg-2a)';
        evStatus.innerHTML = '<div style="padding:10px 14px; background:' + evBg + '; border-radius:8px; font-size:0.82em;">'
            + '<span style="color:' + evColor + '; font-weight:600;">' + evs.points + ' evidence pts \u2192 ' + evs.effectiveLevel + '</span>'
            + '<span style="color:var(--c-muted); margin-left:8px;">(' + evs.evidenceCount + ' outcome' + (evs.evidenceCount !== 1 ? 's' : '') + ')</span>'
            + (evs.verifiedCount > 0 ? ' <span style="color:#10b981;"> \u2713 ' + evs.verifiedCount + ' verified</span>' : '')
            + '<br><button onclick="closeEditSkillModal(); setTimeout(function(){ var sk = (_sd().skills||[]).find(function(s){return s.name===\'' + escapeHtml(skillName).replace(/'/g,"\\'") + '\';}); if(sk) openSkillModal(\'' + escapeHtml(skillName).replace(/'/g,"\\'") + '\', sk); }, 100);" '
            + 'style="margin-top:6px; padding:3px 10px; background:transparent; border:1px solid var(--c-green-border-2); color:#10b981; border-radius:4px; cursor:pointer; font-size:0.88em;">+ Add Evidence</button>'
            + '</div>';
    }
    updateEditSkillGapWarning();
}

export function closeEditSkillModal() {
    const modal = document.getElementById('editSkillModal');
    modal.classList.remove('active');
    currentEditingSkill = null;
}

export function updateEditSkillGapWarning() {
    var warning = document.getElementById('editSkillGapWarning');
    if (!warning || !currentEditingSkill) return;
    
    var skill = (_sd().skills || []).find(function(s) { return s.name === currentEditingSkill; });
    if (!skill) return;
    
    var selectedLevel = (document.querySelector('input[name="editSkillLevel"]:checked') || {}).value || 'Novice';
    var evs = getEvidenceSummary(skill);
    var selectedVal = proficiencyValue(selectedLevel);
    var effectiveVal = proficiencyValue(evs.effectiveLevel);
    
    if (selectedVal > effectiveVal) {
        warning.innerHTML = '<div style="padding:8px 12px; background:var(--c-amber-bg-2b); '
            + 'border:1px solid var(--c-amber-border-1b); border-radius:6px; font-size:0.82em; color:var(--c-warn);">'
            + '\u26A0 Claiming <strong>' + selectedLevel + '</strong> but evidence supports <strong>' + evs.effectiveLevel + '</strong>. '
            + 'Market valuation will use ' + evs.effectiveLevel + ' until more evidence is added.'
            + '</div>';
    } else {
        warning.innerHTML = '';
    }
}
if (!window.updateEditSkillGapWarning) window.updateEditSkillGapWarning = updateEditSkillGapWarning;

export function deleteSkillFromProfile(skillName) {
    if (readOnlyGuard()) return;
    var idx = window._userData.skills.findIndex(function(s) { return s.name === skillName; });
    if (idx === -1) return;
    window._userData.skills.splice(idx, 1);
    var sdIdx = _sd().skills.findIndex(function(s) { return s.name === skillName; });
    if (sdIdx !== -1) _sd().skills.splice(sdIdx, 1);
    saveUserData();
    rescoreAllJobs();
    refreshAllViews();
    showToast('Removed "' + skillName + '" from profile.', 'info');
}
if (!window.deleteSkillFromProfile) window.deleteSkillFromProfile = deleteSkillFromProfile;

// ===== UNIFIED SKILL EDITOR =====
// Single modal combining: level, roles, assess, evidence, core differentiator

export function openUnifiedSkillEditor(skillName) {
    if (readOnlyGuard()) return;
    var skill = (window._userData.skills || []).find(function(s) { return s.name === skillName; });
    if (!skill) { showToast('Skill not found.', 'error'); return; }
    
    currentEditingSkill = skillName;
    
    var levels = ['Novice','Competent','Proficient','Advanced','Expert','Mastery'];
    var levelColors = { 'Novice':'#94a3b8','Competent':'#22d3ee','Proficient':'#60a5fa','Advanced':'#a78bfa','Expert':'#fb923c','Mastery':'#10b981' };
    var evs = (typeof getEvidenceSummary === 'function') ? getEvidenceSummary(skill) : null;
    var roles = window._userData.roles || [];
    var skillRoles = skill.roles || [];
    var hasAssess = !!skill.userAssessment;
    var assessData = skill.userAssessment || { years: 5, impact: 'significant', rarity: 'uncommon', salaryBand: '$150-250k' };
    var isOnetSkill = !!(skill.onetId || skill.onetCode);
    
    var html = '';
    
    // ── HEADER ──
    html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">'
        + '<div>'
        + '<h2 style="margin:0; font-size:1.3em; color:var(--text-primary);">' + escapeHtml(skillName) + '</h2>'
        + '<div style="display:flex; align-items:center; gap:8px; margin-top:6px; flex-wrap:wrap;">'
        + '<span style="padding:3px 10px; border-radius:10px; font-size:0.75em; font-weight:600; background:' + (levelColors[skill.level] || '#6b7280') + '22; color:' + (levelColors[skill.level] || '#6b7280') + ';">' + (skill.level || 'Proficient') + '</span>'
        + (skill.key ? '<span style="padding:3px 8px; border-radius:10px; font-size:0.7em; background:rgba(245,158,11,0.15); color:#f59e0b; font-weight:600;">CORE</span>' : '')
        + (isOnetSkill ? '<span style="padding:3px 8px; border-radius:10px; font-size:0.7em; background:rgba(96,165,250,0.15); color:#60a5fa;">O*NET</span>' : '')
        + (function() { var vrs = getSkillVerifications(skillName); var conf = vrs.filter(function(v){return v.status==='confirmed';}); if (conf.length > 0) { var vn = conf[0].verifierName || 'verifier'; return '<span style="padding:3px 8px; border-radius:10px; font-size:0.7em; background:rgba(16,185,129,0.15); color:#10b981; font-weight:600;">\u2713 Verified by ' + escapeHtml(vn) + '</span>'; } return ''; })()
        + '</div></div>'
        + '<button onclick="closeUnifiedSkillEditor()" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.4em; padding:4px;">\u2715</button>'
        + '</div>';
    
    // ── PROFICIENCY LEVEL ──
    html += '<div style="margin-bottom:18px;">'
        + '<div style="font-weight:600; font-size:0.85em; color:var(--accent); margin-bottom:8px;">Proficiency Level</div>'
        + '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">';
    levels.forEach(function(lv) {
        var sel = (skill.level === lv);
        var c = levelColors[lv];
        html += '<label style="display:flex; align-items:center; gap:6px; padding:8px 10px; border-radius:8px; cursor:pointer;'
            + ' background:' + (sel ? c + '18' : 'var(--input-bg)') + '; border:1.5px solid ' + (sel ? c : 'var(--border)') + ';">'
            + '<input type="radio" name="uniLevel" value="' + lv + '"' + (sel ? ' checked' : '') + ' onchange="uniUpdateGapWarning()" style="accent-color:' + c + ';">'
            + '<span style="font-size:0.82em; font-weight:' + (sel ? '700' : '500') + '; color:' + (sel ? c : 'var(--text-secondary)') + ';">' + lv + '</span>'
            + '</label>';
    });
    html += '</div>';
    // Evidence gap warning
    html += '<div id="uniGapWarning" style="margin-top:6px;"></div>';
    // Evidence summary
    if (evs) {
        var evColor = evs.hasGap ? '#f59e0b' : '#10b981';
        html += '<div style="margin-top:6px; padding:6px 10px; border-radius:6px; font-size:0.78em; background:var(--bg-elevated); border:1px solid var(--border);">'
            + '<span style="color:' + evColor + '; font-weight:600;">' + evs.points + ' evidence pts \u2192 ' + evs.effectiveLevel + '</span>'
            + '<span style="color:var(--text-muted); margin-left:6px;">(' + evs.evidenceCount + ' outcome' + (evs.evidenceCount !== 1 ? 's' : '') + ')</span>'
            + (evs.verifiedCount > 0 ? ' <span style="color:#10b981;"> \u2713 ' + evs.verifiedCount + ' verified</span>' : '')
            + '</div>';
    }
    html += '</div>';
    
    // ── ROLE ASSIGNMENT ──
    if (roles.length > 0) {
        html += '<div style="margin-bottom:18px;">'
            + '<div style="font-weight:600; font-size:0.85em; color:var(--accent); margin-bottom:8px;">Used in Roles <span style="color:var(--text-muted); font-weight:400; font-size:0.9em;">(defaults to all)</span></div>'
            + '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:4px;">';
        roles.forEach(function(role) {
            var checked = skillRoles.includes(role.id) || skillRoles.includes(role.name);
            html += '<label style="display:flex; align-items:center; gap:6px; padding:6px 8px; border-radius:6px; cursor:pointer; font-size:0.82em; color:var(--text-secondary);">'
                + '<input type="checkbox" class="uni-role-cb" value="' + (role.id || role.name) + '"' + (checked ? ' checked' : '') + '>'
                + '<span>' + escapeHtml(role.name) + '</span></label>';
        });
        html += '</div></div>';
    }
    
    // ── IMPACT ASSESSMENT ──
    html += '<div style="margin-bottom:18px; border:1px solid var(--border); border-radius:10px; overflow:hidden;">'
        + '<div onclick="document.getElementById(\'uniAssessBody\').style.display = document.getElementById(\'uniAssessBody\').style.display === \'none\' ? \'block\' : \'none\';" '
        + 'style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; cursor:pointer; background:var(--bg-elevated);">'
        + '<div style="font-weight:600; font-size:0.85em; color:var(--accent);">\uD83D\uDCCA Impact Assessment'
        + (hasAssess ? ' <span style="color:#10b981; font-size:0.85em;">\u2713 Assessed</span>' : ' <span style="color:var(--text-muted); font-size:0.85em;">(optional)</span>')
        + '</div>'
        + '<span style="color:var(--text-muted);">\u25BC</span></div>'
        + '<div id="uniAssessBody" style="display:' + (isOnetSkill && !hasAssess ? 'none' : 'block') + '; padding:14px;">';
    
    if (!isOnetSkill) {
        html += '<div style="padding:8px 10px; background:rgba(245,158,11,0.1); border-left:3px solid #f59e0b; border-radius:4px; font-size:0.78em; color:var(--text-secondary); margin-bottom:12px;">'
            + '\uD83D\uDCA1 This skill doesn\'t have a direct O*NET match. Assess it to improve market impact accuracy.</div>';
    }
    
    html += '<div style="margin-bottom:12px;">'
        + '<label style="font-size:0.8em; color:var(--accent); font-weight:600;">Years of experience</label>'
        + '<input type="number" id="uniAssessYears" value="' + (assessData.years || 5) + '" min="0" max="40" '
        + 'style="display:block; width:80px; margin-top:4px; padding:6px 10px; background:var(--input-bg); border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-size:0.9em;">'
        + '</div>';
    
    var impacts = [
        ['minor', 'Minor', 'Supports work but doesn\'t directly drive outcomes'],
        ['significant', 'Significant', 'Directly contributes to key business results'],
        ['transformative', 'Transformative', 'Creates new capabilities or markets']
    ];
    html += '<div style="margin-bottom:12px;">'
        + '<label style="font-size:0.8em; color:var(--accent); font-weight:600;">Impact on business outcomes</label>';
    impacts.forEach(function(imp) {
        var sel = assessData.impact === imp[0];
        html += '<label style="display:flex; align-items:start; gap:8px; padding:6px 0; cursor:pointer; font-size:0.82em;">'
            + '<input type="radio" name="uniImpact" value="' + imp[0] + '"' + (sel ? ' checked' : '') + ' style="margin-top:2px;">'
            + '<div><strong style="color:var(--text-primary);">' + imp[1] + '</strong><div style="color:var(--text-muted); font-size:0.9em;">' + imp[2] + '</div></div></label>';
    });
    html += '</div>';
    
    var rarities = [
        ['common', 'Common', 'Many professionals have this'],
        ['uncommon', 'Uncommon', 'Requires specialized training'],
        ['rare', 'Rare', 'Few people have deep expertise']
    ];
    html += '<div style="margin-bottom:8px;">'
        + '<label style="font-size:0.8em; color:var(--accent); font-weight:600;">How rare is deep expertise?</label>';
    rarities.forEach(function(r) {
        var sel = assessData.rarity === r[0];
        html += '<label style="display:flex; align-items:start; gap:8px; padding:6px 0; cursor:pointer; font-size:0.82em;">'
            + '<input type="radio" name="uniRarity" value="' + r[0] + '"' + (sel ? ' checked' : '') + ' style="margin-top:2px;">'
            + '<div><strong style="color:var(--text-primary);">' + r[1] + '</strong><div style="color:var(--text-muted); font-size:0.9em;">' + r[2] + '</div></div></label>';
    });
    html += '</div></div></div>';
    
    // ── CORE DIFFERENTIATOR ──
    html += '<label style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; background:var(--bg-elevated); border:1px solid var(--border); cursor:pointer; margin-bottom:18px;">'
        + '<input type="checkbox" id="uniCore"' + (skill.key ? ' checked' : '') + '>'
        + '<div><span style="font-weight:600; font-size:0.85em; color:var(--accent);">Mark as Core Differentiator</span>'
        + '<div style="font-size:0.75em; color:var(--text-muted);">Core skills appear as key differentiators in scouting reports and job matching.</div>'
        + '</div></label>';
    
    // ── LINKED OUTCOMES ──
    var allOutcomes = (blueprintData && _bd().outcomes) || [];
    var linkedOutcomes = allOutcomes.filter(function(o) {
        return o.skills && o.skills.indexOf(skillName) !== -1;
    });
    html += '<div style="margin-bottom:18px;">'
        + '<div style="font-weight:600; font-size:0.85em; color:var(--accent); margin-bottom:8px;">Linked Outcomes <span style="font-weight:400; color:var(--text-muted);">(' + linkedOutcomes.length + ')</span></div>';
    if (linkedOutcomes.length > 0) {
        html += '<div style="display:flex; flex-direction:column; gap:4px;">';
        linkedOutcomes.forEach(function(o) {
            html += '<div style="padding:6px 10px; border-radius:6px; background:var(--bg-elevated); border:1px solid var(--border); font-size:0.8em;">'
                + '<span style="color:var(--text-primary); font-weight:500;">' + escapeHtml(o.title || o.name || 'Untitled') + '</span>'
                + '</div>';
        });
        html += '</div>';
    }
    html += '<button onclick="closeUnifiedSkillEditor(); switchBlueprintTab(\'outcomes\');" '
        + 'style="margin-top:8px; padding:6px 14px; border-radius:6px; font-size:0.78em; cursor:pointer; '
        + 'background:none; border:1px solid var(--border); color:var(--accent); display:inline-flex; align-items:center; gap:4px;">'
        + bpIcon('plus',12) + (linkedOutcomes.length > 0 ? ' Manage Outcomes' : ' Add an Outcome') + '</button>'
        + '</div>';
    
    // ── FOOTER ──
    html += '<div style="display:flex; gap:10px; align-items:center;">'
        + '<button onclick="saveUnifiedSkillEdit()" style="flex:1; padding:12px 20px; background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.92em;">Save Changes</button>'
        + '<button onclick="closeUnifiedSkillEditor()" style="padding:12px 20px; background:var(--input-bg); color:var(--text-secondary); border:1px solid var(--border); border-radius:8px; cursor:pointer; font-size:0.88em;">Cancel</button>'
        + '<button onclick="if(confirm(\'Remove ' + escapeHtml(skillName).replace(/'/g,"\\'") + '?\')) { deleteSkillFromProfile(\'' + escapeHtml(skillName).replace(/'/g,"\\'") + '\'); closeUnifiedSkillEditor(); }" '
        + 'style="margin-left:auto; padding:10px 14px; background:none; color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:8px; cursor:pointer; font-size:0.82em;">'
        + bpIcon('trash',14) + ' Remove</button>'
        + '</div>';
    
    // Build modal
    var modal = document.getElementById('unifiedSkillEditor');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'unifiedSkillEditor';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content" style="max-width:600px; max-height:85vh; overflow-y:auto; padding:28px 32px;"><div id="uniEditorContent"></div></div>';
        document.body.appendChild(modal);
        // Close on backdrop click
        modal.addEventListener('click', function(e) { if (e.target === modal) closeUnifiedSkillEditor(); });
    }
    document.getElementById('uniEditorContent').innerHTML = html;
    history.pushState({ modal: true }, '');
    modal.classList.add('active');
    
    // Initialize gap warning
    setTimeout(uniUpdateGapWarning, 50);
}
if (!window.openUnifiedSkillEditor) window.openUnifiedSkillEditor = openUnifiedSkillEditor;

export function closeUnifiedSkillEditor() {
    var modal = document.getElementById('unifiedSkillEditor');
    if (modal) modal.classList.remove('active');
    currentEditingSkill = null;
}
if (!window.closeUnifiedSkillEditor) window.closeUnifiedSkillEditor = closeUnifiedSkillEditor;

export function uniUpdateGapWarning() {
    var warning = document.getElementById('uniGapWarning');
    if (!warning || !currentEditingSkill) return;
    var skill = (_sd().skills || []).find(function(s) { return s.name === currentEditingSkill; });
    if (!skill) return;
    var selectedLevel = (document.querySelector('input[name="uniLevel"]:checked') || {}).value || 'Novice';
    var evs = (typeof getEvidenceSummary === 'function') ? getEvidenceSummary(skill) : null;
    if (!evs) { warning.innerHTML = ''; return; }
    var selectedVal = proficiencyValue(selectedLevel);
    var effectiveVal = proficiencyValue(evs.effectiveLevel);
    if (selectedVal > effectiveVal) {
        warning.innerHTML = '<div style="padding:6px 10px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:6px; font-size:0.78em; color:#f59e0b;">'
            + '\u26A0 Claiming <strong>' + selectedLevel + '</strong> but evidence supports <strong>' + evs.effectiveLevel + '</strong>. '
            + 'Market valuation uses ' + evs.effectiveLevel + ' until more evidence is added.</div>';
    } else { warning.innerHTML = ''; }
}
if (!window.uniUpdateGapWarning) window.uniUpdateGapWarning = uniUpdateGapWarning;

export function saveUnifiedSkillEdit() {
    if (readOnlyGuard()) return;
    if (!currentEditingSkill) return;
    var skill = window._userData.skills.find(function(s) { return s.name === currentEditingSkill; });
    if (!skill) return;
    
    // Level
    var levelEl = document.querySelector('input[name="uniLevel"]:checked');
    if (levelEl) skill.level = levelEl.value;
    
    // Core
    var coreEl = document.getElementById('uniCore');
    if (coreEl) skill.key = coreEl.checked;
    
    // Roles
    var roleCbs = document.querySelectorAll('.uni-role-cb:checked');
    var roleIds = Array.from(roleCbs).map(function(cb) { return cb.value; });
    if (roleIds.length === 0) {
        roleIds = (window._userData.roles || []).map(function(r) { return r.id; });
    }
    skill.roles = roleIds;
    
    // Assessment (if filled)
    var yearsEl = document.getElementById('uniAssessYears');
    var impactEl = document.querySelector('input[name="uniImpact"]:checked');
    var rarityEl = document.querySelector('input[name="uniRarity"]:checked');
    if (yearsEl && impactEl && rarityEl) {
        skill.userAssessment = {
            years: parseInt(yearsEl.value) || 0,
            impact: impactEl.value,
            rarity: rarityEl.value,
            salaryBand: (document.querySelector('input[name="uniSalary"]:checked') || {}).value || '$150-250k'
        };
        // Calculate impact rating
        if (typeof calculateUniqueSkillImpact === 'function') {
            var result = calculateUniqueSkillImpact(skill.userAssessment);
            skill.impactRating = result.level;
            skill.impactScore = result.score;
        }
    }
    
    // Sync to skillsData
    var sdIdx = _sd().skills.findIndex(function(s) { return s.name === currentEditingSkill; });
    if (sdIdx !== -1) _sd().skills[sdIdx] = Object.assign({}, skill);
    
    saveUserData();
    rescoreAllJobs();
    refreshAllViews();
    
    var name = currentEditingSkill;
    closeUnifiedSkillEditor();
    showToast('Updated "' + name + '".', 'success');
}
if (!window.saveUnifiedSkillEdit) window.saveUnifiedSkillEdit = saveUnifiedSkillEdit;

export function saveSkillEdit() {
    if (readOnlyGuard()) return;
    if (!currentEditingSkill) return;
    
    const skill = window._userData.skills.find(s => s.name === currentEditingSkill);
    if (!skill) return;
    
    const editLevelEl = document.querySelector('input[name="editSkillLevel"]:checked');
    if (!editLevelEl) { showToast('Please select a proficiency level.', 'warning'); return; }
    const level = editLevelEl.value;
    const core = document.getElementById('editSkillCore').checked;
    var roles = Array.from(document.querySelectorAll('.edit-skill-role-checkbox:checked')).map(cb => cb.value);
    
    // Default to all roles if none selected
    if (roles.length === 0) {
        roles = (window._userData.roles || []).map(function(r) { return r.id; });
    }
    
    // Update skill
    skill.level = level;
    skill.key = core;
    skill.roles = roles;
    
    // Update skillsData too
    const skillDataIndex = _sd().skills.findIndex(s => s.name === currentEditingSkill);
    if (skillDataIndex !== -1) {
        _sd().skills[skillDataIndex] = {...skill};
    }
    
    // Save, re-score jobs, refresh
    saveUserData();
    rescoreAllJobs();
    refreshAllViews();
    
    var updatedName = currentEditingSkill;
    closeEditSkillModal();
    
    showToast('Updated "' + updatedName + '".', 'success');
}

export function confirmDeleteSkill(skillName, category) {
    if (!confirm(`Delete "${skillName}"?\n\nThis cannot be undone.`)) {
        return;
    }
    
    deleteSkill(skillName);
}

export function deleteSkill(skillName) {
    // Remove from userData
    const userIndex = window._userData.skills.findIndex(s => s.name === skillName);
    if (userIndex !== -1) {
        window._userData.skills.splice(userIndex, 1);
    }
    
    // Remove from skillsData
    const skillsIndex = _sd().skills.findIndex(s => s.name === skillName);
    if (skillsIndex !== -1) {
        _sd().skills.splice(skillsIndex, 1);
    }
    
    // Save, re-score, refresh
    saveUserData();
    rescoreAllJobs();
    refreshAllViews();
}

// ===== SKILL ASSESSMENT FUNCTIONS =====

let currentAssessingSkill = null;

export function openAssessSkillModal(skillName) {
    const skill = window._userData.skills.find(s => s.name === skillName);
    if (!skill) return;
    
    currentAssessingSkill = skillName;
    const modal = document.getElementById('assessSkillModal');
    
    // Set skill name
    document.getElementById('assessSkillName').textContent = skill.name;
    
    // Pre-fill with existing assessment if available
    if (skill.userAssessment) {
        document.getElementById('assessYears').value = skill.userAssessment.years || 5;
        document.querySelector(`input[name="assessImpact"][value="${skill.userAssessment.impact}"]`).checked = true;
        document.querySelector(`input[name="assessRarity"][value="${skill.userAssessment.rarity}"]`).checked = true;
        document.querySelector(`input[name="assessSalary"][value="${skill.userAssessment.salaryBand}"]`).checked = true;
    } else {
        // Defaults
        document.getElementById('assessYears').value = 5;
        document.querySelector('input[name="assessImpact"][value="significant"]').checked = true;
        document.querySelector('input[name="assessRarity"][value="uncommon"]').checked = true;
        document.querySelector('input[name="assessSalary"][value="$150-250k"]').checked = true;
    }
    
    updateAssessmentPreview();
    history.pushState({ modal: true }, ''); modal.classList.add('active');
    
    // Add listeners for live preview
    document.getElementById('assessYears').addEventListener('input', updateAssessmentPreview);
    document.querySelectorAll('input[name="assessImpact"]').forEach(r => 
        r.addEventListener('change', updateAssessmentPreview));
    document.querySelectorAll('input[name="assessRarity"]').forEach(r => 
        r.addEventListener('change', updateAssessmentPreview));
    document.querySelectorAll('input[name="assessSalary"]').forEach(r => 
        r.addEventListener('change', updateAssessmentPreview));
}

export function closeAssessSkillModal() {
    const modal = document.getElementById('assessSkillModal');
    modal.classList.remove('active');
    currentAssessingSkill = null;
}

export function updateAssessmentPreview() {
    const years = parseInt(document.getElementById('assessYears').value) || 0;
    const impact = document.querySelector('input[name="assessImpact"]:checked')?.value || 'significant';
    const rarity = document.querySelector('input[name="assessRarity"]:checked')?.value || 'uncommon';
    const salaryBand = document.querySelector('input[name="assessSalary"]:checked')?.value || '$150-250k';
    
    const assessment = { years, impact, rarity, salaryBand };
    const result = calculateUniqueSkillImpact(assessment);
    
    const preview = document.getElementById('assessmentPreview');
    const icon = getImpactIcon(result.level);
    const label = getImpactLabel(result.level);
    const color = getImpactColor(result.level);
    
    preview.innerHTML = `Predicted rating: <span style="color: ${color}; font-weight: 600;">${icon} ${label}</span>`;
}

export function saveSkillAssessment() {
    if (readOnlyGuard()) return;
    if (!currentAssessingSkill) return;
    
    const skill = window._userData.skills.find(s => s.name === currentAssessingSkill);
    if (!skill) return;
    
    // Gather assessment data
    const years = parseInt(document.getElementById('assessYears').value) || 0;
    const impact = document.querySelector('input[name="assessImpact"]:checked')?.value || 'significant';
    const rarity = document.querySelector('input[name="assessRarity"]:checked')?.value || 'uncommon';
    const salaryBand = document.querySelector('input[name="assessSalary"]:checked')?.value || '$150-250k';
    
    // Save to skill object
    skill.userAssessment = {
        years: years,
        impact: impact,
        rarity: rarity,
        salaryBand: salaryBand,
        assessedDate: new Date().toISOString()
    };
    
    // Update skillsData too
    const skillDataIndex = _sd().skills.findIndex(s => s.name === currentAssessingSkill);
    if (skillDataIndex !== -1) {
        _sd().skills[skillDataIndex].userAssessment = skill.userAssessment;
    }
    
    // Save and refresh
    saveUserData();
    refreshAllViews();
    
    closeAssessSkillModal();
    
    const result = calculateUniqueSkillImpact(skill.userAssessment);
    showToast(`Assessment saved. "${currentAssessingSkill}" rated as ${result.label}.`, 'success');
}

export function refreshAllViews() {
    // Refresh settings skill list
    const skillsList = document.getElementById('skillsList');
    if (skillsList) {
        skillsList.innerHTML = renderSkillsList();
    }
    
    // Refresh Blueprint tab content if active
    if (currentView === 'blueprint') {
        var bpContent = document.getElementById('blueprintTabContent');
        if (bpContent) {
            try { bpContent.innerHTML = renderBlueprintTabContent(); } catch(e) { console.warn('Blueprint refresh error:', e); }
        }
    }
    
    // Refresh network graph
    if (currentView === 'network') {
        initNetwork();
    }
    
    // Refresh card view
    if (currentView === 'network' && currentSkillsView === 'cards') {
        renderCardView();
    }
    
    // Update stats bar
    updateStatsBar();
    
    // Re-render settings (to update counts)
    if (currentView === 'settings') {
        initSettings();
    }
}

// ===== SKILL SEARCH MODAL FUNCTIONS (v2.3.0) =====

// ===== UNIFIED SKILL MANAGEMENT SYSTEM (v2.4.0) =====



// Build category dropdown from actual skills in this profile — only show categories that exist
window.populateCategoryFilter = function populateCategoryFilter() {
    const select = document.getElementById('yourSkillsCategoryFilter');
    if (!select) return;
    const currentVal = select.value;
    
    const categoryMeta = {
        'skill':         { label: 'Skills',           icon: bpIcon('compass',14) },
        'ability':       { label: 'Abilities',        icon: bpIcon('zap',14) },
        'workstyle':     { label: 'Work Styles',      icon: bpIcon('flag',14) },
        'knowledge':     { label: 'Knowledge',        icon: bpIcon('book',14) },
        'workactivity':  { label: 'Work Activities',  icon: bpIcon('settings',14) },
        'trades':        { label: 'Trade Skills',     icon: bpIcon('tool',14) },
        'unique':        { label: 'Custom Skills',    icon: '⭐' },
    };
    
    // Count skills by category
    const counts = {};
    window._userData.skills.forEach(s => {
        const cat = s.category || 'skill';
        counts[cat] = (counts[cat] || 0) + 1;
    });
    
    // Build options — only include categories that have skills
    let html = `<option value="all">All Categories (${window._userData.skills.length})</option>`;
    // Use preferred order
    const order = ['skill','ability','workstyle','knowledge','workactivity','trades','unique'];
    order.forEach(cat => {
        const count = counts[cat];
        if (!count) return; // skip empty categories
        const meta = categoryMeta[cat] || { label: cat, icon: '•' };
        html += `<option value="${cat}">${meta.icon} ${meta.label} (${count})</option>`;
    });
    // Catch any unexpected categories in the data
    Object.keys(counts).forEach(cat => {
        if (!order.includes(cat)) {
            html += `<option value="${cat}">${cat} (${counts[cat]})</option>`;
        }
    });
    
    select.innerHTML = html;
    // Restore previous selection if still valid
    if (currentVal && select.querySelector(`option[value="${currentVal}"]`)) {
        select.value = currentVal;
    }
}

export function closeSkillManagement() {
    const modal = document.getElementById('skillManagementModal');
    modal.classList.remove('active');
}

export function switchSkillManagementTab(tab) {
    currentSkillManagementTab = tab;
    
    document.getElementById('yourSkillsTab').classList.toggle('active', tab === 'yours');
    document.getElementById('addSkillsTab').classList.toggle('active', tab === 'add');
    
    document.getElementById('yourSkillsContent').style.display = tab === 'yours' ? 'block' : 'none';
    document.getElementById('addSkillsContent').style.display = tab === 'add' ? 'block' : 'none';
    
    if (tab === 'yours') {
        renderYourSkills();
    } else {
        showAddSkillsEmpty();
    }
}

// Central count function — always call this after loading any library or adding skills
export function getTotalAvailableSkillCount() {
    let total = 0;
    // ESCO searchable library
    if (skillLibraryIndex?.totalSkills) total += skillLibraryIndex.totalSkills;
    else if (skillLibraryIndex?.index?.length) total += skillLibraryIndex.index.length;
    // O*NET libraries
    if (window.onetSkillsLibrary) total += 35; // nested categories structure
    if (window.onetAbilitiesLibrary?.abilities) total += window.onetAbilitiesLibrary.abilities.length;
    if (window.onetWorkStylesLibrary?.workStyles) total += window.onetWorkStylesLibrary.workStyles.length;
    if (window.onetKnowledgeLibrary?.knowledge) total += window.onetKnowledgeLibrary.knowledge.length;
    if (window.onetWorkActivitiesLibrary?.activities) total += window.onetWorkActivitiesLibrary.activities.length;
    // Trades & Creative
    if (window.tradesCreativeLibrary?.count) total += window.tradesCreativeLibrary.count;
    // Future: Lightcast, ESCO full, etc. add here
    return total > 0 ? total : 2384; // fallback if libraries not yet loaded
}

export function updateSkillManagementCounts() {
    const yourCount = window._userData.skills.length;
    const availableCount = getTotalAvailableSkillCount();
    
    document.getElementById('yourSkillsCount').textContent = yourCount;
    document.getElementById('availableSkillsCount').textContent = availableCount.toLocaleString();
    document.getElementById('skillManagementCount').textContent = 
        `${yourCount} selected • ${availableCount.toLocaleString()} available`;
}

export function renderYourSkills() {
    const container = document.getElementById('yourSkillsList');
    const searchQuery = document.getElementById('yourSkillsSearchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('yourSkillsCategoryFilter').value;
    const levelFilter = document.getElementById('yourSkillsLevelFilter').value;
    
    let skills = window._userData.skills.filter(skill => {
        const matchesSearch = !searchQuery || skill.name.toLowerCase().includes(searchQuery);
        const matchesCategory = categoryFilter === 'all' || skill.category === categoryFilter;
        const matchesLevel = levelFilter === 'all' || skill.level === levelFilter;
        return matchesSearch && matchesCategory && matchesLevel;
    });
    
    if (skills.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #9ca3af;">
                <div style="font-size: 3em; margin-bottom: 10px;">${bpIcon("clipboard",14)}</div>
                <div style="font-size: 1.1em;">No skills found</div>
                <div style="font-size: 0.9em; margin-top: 10px;">Try adjusting your filters</div>
            </div>
        `;
        return;
    }
    
    const grouped = {};
    skills.forEach(skill => {
        const cat = skill.category || 'unique';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(skill);
    });
    
    const categoryNames = {
        'skill': 'Technology',
        'ability': 'General Professional',
        'workstyle': 'Work Styles',
        'unique': 'Custom Skills'
    };
    
    container.innerHTML = Object.entries(grouped).map(([cat, catSkills]) => `
        <div style="margin-bottom: 25px;">
            <div style="color: #9ca3af; font-size: 0.85em; font-weight: 600; margin-bottom: 12px; text-transform: uppercase;">
                ${categoryNames[cat] || cat} (${catSkills.length})
            </div>
            ${catSkills.map(skill => `
                <div class="your-skill-item">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: 15px;">
                        <div style="flex: 1;">
                            <div style="color: #e0e0e0; font-weight: 600; margin-bottom: 6px; font-size: 1.05em;">
                                ${escapeHtml(skill.name)}
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                                <span style="color: #60a5fa; font-size: 0.8em; padding: 2px 8px; background: rgba(96, 165, 250, 0.2); border-radius: 3px;">
                                    ${escapeHtml(skill.level)}
                                </span>
                                ${skill.key ? '<span style="color: #fbbf24; font-size: 0.8em;">⭐ Core</span>' : ''}
                                ${skill.roles ? `<span style="color: #9ca3af; font-size: 0.8em;">${skill.roles.length} role${skill.roles.length > 1 ? 's' : ''}</span>` : ''}
                            </div>
                        </div>
                        <button onclick="removeSkillFromProfile('${escapeHtml(skill.name).replace(/'/g, "\\'")}', '${cat}')" 
                                style="padding: 8px 16px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #ef4444; border-radius: 6px; cursor: pointer; font-size: 0.9em; white-space: nowrap; font-weight: 600; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'"
                                onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'">
                            Remove
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

export function filterYourSkills() {
    renderYourSkills();
}

export function removeSkillFromProfile(skillName, category) {
    if (readOnlyGuard()) return;
    if (!confirm(`Remove "${skillName}" from your profile?`)) return;
    
    const skillIndex = window._userData.skills.findIndex(s => s.name === skillName && s.category === category);
    if (skillIndex !== -1) {
        window._userData.skills.splice(skillIndex, 1);
    }
    
    const dataIndex = _sd().skills.findIndex(s => s.name === skillName && s.category === category);
    if (dataIndex !== -1) {
        _sd().skills.splice(dataIndex, 1);
    }
    
    saveUserData();
    updateSkillManagementCounts();
    renderYourSkills();
    refreshAllViews();
}

export function showAddSkillsEmpty() {
    if (readOnlyGuard()) return;
    const container = document.getElementById('addSkillsResults');
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #9ca3af;">
            <div style="margin-bottom: 10px;">' + bpIcon('search',48) + '</div>
            <div style="font-size: 1.1em;">Start typing to search skills</div>
            <div style="font-size: 0.9em; margin-top: 10px;">Try: "python", "marketing", "leadership"</div>
        </div>
    `;
    document.getElementById('skillManagementStatus').textContent = '';
    document.getElementById('addSkillsCategories').style.display = 'block';
}

let addSkillsSearchTimeout;
export function handleAddSkillsSearch() {
    clearTimeout(addSkillsSearchTimeout);
    
    addSkillsSearchTimeout = setTimeout(() => {
        const inputEl = document.getElementById('addSkillsSearchInput');
        if (!inputEl) return;
        const query = inputEl.value;
        console.log('Search triggered for:', query);
        
        if (!skillLibraryIndex || !skillLibraryIndex.index) {
            console.error('Skill library not loaded!');
            showToast('Skill library is still loading. Please wait a moment.', 'info');
            const container = document.getElementById('addSkillsResults');
            if (!container) return;
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #f59e0b;">
                    <div style="font-size: 3em; margin-bottom: 10px;">⏳</div>
                    <div style="font-size: 1.1em;">Loading skill library...</div>
                    <div style="font-size: 0.9em; margin-top: 10px;">Please wait</div>
                </div>
            `;
            // Force reload
            _skillLibraryPromise = loadSkillLibraryIndex().then(() => {
                console.log('Library loaded, retrying search');
                handleAddSkillsSearch();
            });
            return;
        }
        
        console.log('Library loaded with', skillLibraryIndex.totalSkills, 'skills');
        
        if (!query || query.trim().length < 2) {
            console.log('Query too short, showing empty state');
            showAddSkillsEmpty();
            return;
        }
        
        console.log('Performing search for:', query);
        performAddSkillsSearch(query);
    }, 300);
}

// Search across ALL loaded libraries and return normalized results
export function searchAllLibraries(query) {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    const results = [];
    const seen = new Set();
    
    // 1. ESCO searchable index
    const escoResults = searchSkills(query);
    escoResults.forEach(s => {
        const key = (s.n || '').toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            results.push({ id: s.id, n: s.n, c: s.c, sc: s.sc || '', definition: '', source: 'esco', category: null, _raw: s });
        }
    });
    
    // 2. Trades & Creative library
    if (window.tradesCreativeLibrary && window.tradesCreativeLibrary.categories) {
        Object.entries(window.tradesCreativeLibrary.categories).forEach(function([catKey, cat]) {
            (cat.skills || []).forEach(function(skill) {
                const nameMatch = skill.name.toLowerCase().includes(q);
                const defMatch = (skill.definition || '').toLowerCase().includes(q);
                const adjMatch = (skill.adjacencies || []).some(function(a) { return a.toLowerCase().includes(q); });
                if (nameMatch || defMatch || adjMatch) {
                    const key = skill.name.toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        results.push({ id: skill.id, n: skill.name, c: cat.name, sc: 'Trades & Creative', definition: skill.definition || '', source: 'trades', category: 'trades', _raw: skill });
                    }
                }
            });
        });
    }
    
    // 3. O*NET Knowledge
    if (window.onetKnowledgeLibrary && window.onetKnowledgeLibrary.knowledge) {
        window.onetKnowledgeLibrary.knowledge.forEach(function(skill) {
            if (skill.name.toLowerCase().includes(q) || (skill.description || '').toLowerCase().includes(q)) {
                const key = skill.name.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ id: skill.onetCode, n: skill.name, c: 'Knowledge', sc: skill.group || '', definition: skill.description || '', source: 'onet-knowledge', category: 'knowledge', _raw: skill });
                }
            }
        });
    }
    
    // 4. O*NET Work Activities
    if (window.onetWorkActivitiesLibrary && window.onetWorkActivitiesLibrary.activities) {
        window.onetWorkActivitiesLibrary.activities.forEach(function(skill) {
            if (skill.name.toLowerCase().includes(q) || (skill.description || '').toLowerCase().includes(q)) {
                const key = skill.name.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ id: skill.onetCode, n: skill.name, c: 'Work Activities', sc: skill.group || '', definition: skill.description || '', source: 'onet-activities', category: 'workactivity', _raw: skill });
                }
            }
        });
    }
    
    // 5. O*NET Abilities
    if (window.onetAbilitiesLibrary && window.onetAbilitiesLibrary.abilities) {
        window.onetAbilitiesLibrary.abilities.forEach(function(skill) {
            const def = skill.definition || skill.description || '';
            if (skill.name.toLowerCase().includes(q) || def.toLowerCase().includes(q)) {
                const key = skill.name.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ id: skill.id || skill.onetCode, n: skill.name, c: 'Abilities', sc: skill.group || '', definition: def, source: 'onet-abilities', category: 'ability', _raw: skill });
                }
            }
        });
    }
    
    // 6. O*NET Work Styles
    if (window.onetWorkStylesLibrary && window.onetWorkStylesLibrary.workStyles) {
        window.onetWorkStylesLibrary.workStyles.forEach(function(skill) {
            const def = skill.definition || skill.description || '';
            if (skill.name.toLowerCase().includes(q) || def.toLowerCase().includes(q)) {
                const key = skill.name.toLowerCase();
                if (!seen.has(key)) {
                    seen.add(key);
                    results.push({ id: skill.id || skill.onetCode, n: skill.name, c: 'Work Styles', sc: skill.group || '', definition: def, source: 'onet-workstyles', category: 'workstyle', _raw: skill });
                }
            }
        });
    }
    
    return results.slice(0, 30);
}

export function performAddSkillsSearch(query) {
    try {
        const safeResults = searchAllLibraries(query);
        
        const container = document.getElementById('addSkillsResults');
        if (!container) {
            console.error('ERROR: addSkillsResults container not found!');
            return;
        }
        
        const categoriesDiv = document.getElementById('addSkillsCategories');
        if (categoriesDiv) {
            categoriesDiv.style.display = 'none';
        }
        
        if (safeResults.length === 0) {
            console.log('No results found, showing empty state');
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #9ca3af;">
                    <div style="font-size: 3em; margin-bottom: 10px;">❌</div>
                    <div style="font-size: 1.1em;">No skills found for "${escapeHtml(query)}"</div>
                    <div style="font-size: 0.9em; margin-top: 10px;">Try a different search term</div>
                </div>
            `;
            const statusEl = document.getElementById('skillManagementStatus');
            if (statusEl) statusEl.textContent = 'No results';
            return;
        }
        
        console.log('Rendering', safeResults.length, 'results');
        container.innerHTML = safeResults.map(skill => {
            try {
                const isAdded = isSkillAlreadyAdded(skill.n);
                const categoryColor = getCategoryColor(skill.c);
                
                return `
                    <div class="skill-search-result ${isAdded ? 'added' : ''}" 
                         style="padding: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; border-left: 3px solid ${categoryColor}; cursor: ${isAdded ? 'default' : 'pointer'}; transition: all 0.2s;"
                         ${isAdded ? '' : `onclick="addSkillFromLibrary('${escapeHtml(skill.id)}')"`}
                         onmouseover="if (!this.classList.contains('added')) this.style.background='rgba(255,255,255,0.06)'"
                         onmouseout="if (!this.classList.contains('added')) this.style.background='rgba(255,255,255,0.03)'">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <div style="color: #e0e0e0; font-weight: 600; margin-bottom: 4px;">
                                    ${escapeHtml(skill.n)}
                                    ${isAdded ? '<span style="color: #10b981; font-size: 0.85em; margin-left: 8px;">✓ Already have</span>' : ''}
                                </div>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <span style="color: ${categoryColor}; font-size: 0.75em; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 3px;">
                                        ${escapeHtml(skill.c)}
                                    </span>
                                    ${skill.sc ? `
                                        <span style="color: #9ca3af; font-size: 0.75em;">
                                            ${escapeHtml(skill.sc)}
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                            ${!isAdded ? `
                                <button style="padding: 6px 12px; background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); border: none; border-radius: 6px; color: white; font-size: 0.85em; font-weight: 600; cursor: pointer;"
                                        onclick="event.stopPropagation(); addSkillFromLibrary('${escapeHtml(skill.id)}')">
                                    + Add
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            } catch (skillError) {
                console.error('Error rendering skill:', skill, skillError);
                return '';
            }
        }).filter(Boolean).join('');
        
        const statusEl = document.getElementById('skillManagementStatus');
        if (statusEl) {
            statusEl.textContent = `Found ${safeResults.length} skill${safeResults.length > 1 ? 's' : ''}`;
        }
        
        
    } catch (error) {
        console.error('=== CRITICAL ERROR in performAddSkillsSearch ===');
        console.error('Error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        showToast('Skill search encountered an error. Please try again.', 'error');
        
        const container = document.getElementById('addSkillsResults');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #ef4444;">
                    <div style="margin-bottom: 10px;">${bpIcon("warning",48)}</div>
                    <div style="font-size: 1.1em; font-weight: bold;">Search Error</div>
                    <div style="font-size: 0.9em; margin-top: 10px; font-family: monospace;">
                        ${escapeHtml(error.message)}
                    </div>
                    <div style="font-size: 0.85em; margin-top: 10px; color: #9ca3af;">
                        Check browser console (F12) for details
                    </div>
                </div>
            `;
        }
        
        showToast('Search error: ' + error.message, 'error');
    }
}

export function searchAddSkillsByCategory(category) {
    if (category === 'Trades') {
        var categoriesDiv = document.getElementById('addSkillsCategories');
        if (categoriesDiv) categoriesDiv.style.display = 'none';
        var container = document.getElementById('addSkillsResults');
        if (!container) return;
        var tradeResults = [];
        if (window.tradesCreativeLibrary && window.tradesCreativeLibrary.categories) {
            Object.values(window.tradesCreativeLibrary.categories).forEach(function(cat) {
                (cat.skills || []).forEach(function(skill) {
                    tradeResults.push({ id: skill.id, n: skill.name, c: cat.name, sc: 'Trades & Creative', definition: skill.definition || '', source: 'trades', category: 'trades' });
                });
            });
        }
        if (tradeResults.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:#9ca3af;">Trades library not loaded yet.</div>';
            return;
        }
        var catColors = {'Woodworking & Construction':'#d97706','Electrical/Plumbing/Mechanical':'#0891b2','Painting & Finishing':'#7c3aed','Culinary Arts':'#f59e0b','Visual Arts':'#db2777','Fiber & Textile':'#059669','Performing Arts':'#ea580c','Outdoor & Agriculture':'#16a34a','Technology & Making':'#2563eb'};
        container.innerHTML = tradeResults.map(function(skill) {
            var isAdded = isSkillAlreadyAdded(skill.n);
            var color = catColors[skill.c] || '#d97706';
            return '<div style="padding:12px;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid '+color+';cursor:'+(isAdded?'default':'pointer')+';" '+(isAdded?'':'onclick="addSkillFromLibrary(\'' + escapeHtml(skill.id) + '\')"')+'>'
                +'<div style="display:flex;justify-content:space-between;align-items:start;">'
                +'<div style="flex:1;"><div style="color:#e0e0e0;font-weight:600;margin-bottom:4px;">'+escapeHtml(skill.n)+(isAdded?' <span style="color:#10b981;font-size:0.85em;">✓ Added</span>':'')+'</div>'
                +'<span style="color:'+color+';font-size:0.75em;padding:2px 6px;background:rgba(255,255,255,0.1);border-radius:3px;">'+escapeHtml(skill.c)+'</span></div>'
                +(!isAdded?'<button style="padding:6px 12px;background:linear-gradient(135deg,#60a5fa,#3b82f6);border:none;border-radius:6px;color:white;font-size:0.85em;font-weight:600;cursor:pointer;" onclick="event.stopPropagation();addSkillFromLibrary(\'' + escapeHtml(skill.id) + '\')">+ Add</button>':'')
                +'</div></div>';
        }).join('');
        var statusEl = document.getElementById('skillManagementStatus');
        if (statusEl) statusEl.textContent = 'Showing ' + tradeResults.length + ' Trade Skills';
        return;
    }
    document.getElementById('addSkillsSearchInput').value = category;
    handleAddSkillsSearch();
}

export function addSkillFromLibrary(skillId) {
    if (readOnlyGuard()) return;
    // Find the skill across all libraries
    let skillName = null, category = 'skill', definition = '';
    
    // Check ESCO index
    if (skillLibraryIndex && skillLibraryIndex.index) {
        const found = skillLibraryIndex.index.find(s => s.id === skillId);
        if (found) {
            skillName = found.n;
            const sc = (found.sc || '').toLowerCase();
            const cat = (found.c || '').toLowerCase();
            if (cat === 'work styles' || sc.includes('work style')) category = 'workstyle';
            else if (['transversal skills','language skills','cognitive abilities','sensory abilities','physical abilities','psychomotor abilities'].includes(cat)) category = 'ability';
            else category = 'skill';
        }
    }
    
    // Check trades library
    if (!skillName && window.tradesCreativeLibrary && window.tradesCreativeLibrary.categories) {
        outer: for (const cat of Object.values(window.tradesCreativeLibrary.categories)) {
            for (const skill of (cat.skills || [])) {
                if (skill.id === skillId) {
                    skillName = skill.name;
                    category = 'trades';
                    definition = skill.definition || '';
                    break outer;
                }
            }
        }
    }
    
    // Check O*NET libraries by code
    if (!skillName) {
        const onetSources = [
            { lib: window.onetKnowledgeLibrary?.knowledge, cat: 'knowledge', nameField: 'name', idField: 'onetCode' },
            { lib: window.onetWorkActivitiesLibrary?.activities, cat: 'workactivity', nameField: 'name', idField: 'onetCode' },
            { lib: window.onetAbilitiesLibrary?.abilities, cat: 'ability', nameField: 'name', idField: 'id' },
            { lib: window.onetWorkStylesLibrary?.workStyles, cat: 'workstyle', nameField: 'name', idField: 'id' },
        ];
        for (const src of onetSources) {
            if (!src.lib) continue;
            const found = src.lib.find(s => (s[src.idField] || s.id || s.onetCode) === skillId);
            if (found) {
                skillName = found.name;
                category = src.cat;
                definition = found.definition || found.description || '';
                break;
            }
        }
    }
    
    if (!skillName) { console.warn('Skill not found for id:', skillId); return; }
    if (isSkillAlreadyAdded(skillName)) return;
    if (!canAddSkill()) return;
    
    const newSkill = {
        name: skillName,
        category: category,
        level: 'Advanced',
        roles: [window._userData.roles[0]?.id || 'default'],
        key: false,
        evidence: [],
        source: 'library',
        libraryId: skillId
    };
    
    window._userData.skills.push(newSkill);
    _sd().skills.push(newSkill);
    
    saveUserData();
    populateCategoryFilter();
    updateSkillManagementCounts();
    refreshAllViews();
    
    const query = document.getElementById('addSkillsSearchInput').value;
    if (query) performAddSkillsSearch(query);
}

// ===== OVERFLOW MENU FUNCTIONS =====

// ===== THEME TOGGLE =====
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') !== 'light';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('themeToggleBtn').textContent = isDark ? '☀️' : '🌙';
    safeSet('wbTheme', isDark ? 'light' : 'dark');
    
    // Re-render current view so dynamic content picks up new theme
    if (typeof currentView !== 'undefined' && currentView) {
        if (currentView === 'network' || currentView === 'skills') {
            if (typeof initCardView === 'function' && currentSkillsView === 'card') {
                initCardView();
            }
            // Network SVG uses CSS variables, no re-render needed
        } else if (currentView === 'blueprint' && typeof renderBlueprint === 'function') {
            renderBlueprint();
        } else if (currentView === 'consent' && typeof initConsent === 'function') {
            initConsent();
        } else if (currentView === 'settings' && typeof initSettings === 'function') {
            initSettings();
        } else if (currentView === 'jobs' && typeof initOpportunities === 'function') {
            initOpportunities();
        } else if (currentView === 'applications' && typeof initApplications === 'function') {
            initApplications();
        }
    }
}

function initTheme() {
    const saved = safeGet('wbTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = saved === 'light' ? '☀️' : '🌙';
}

// ===== PROFILE DROPDOWN =====
if (!window.initApplications) window.initApplications = initApplications;
if (!window.renderApplications) window.renderApplications = renderApplications;
if (!window.renderApplicationCard) window.renderApplicationCard = renderApplicationCard;
if (!window.addApplicationModal) window.addApplicationModal = addApplicationModal;
if (!window.saveApplication) window.saveApplication = saveApplication;
if (!window.updateApplicationStatus) window.updateApplicationStatus = updateApplicationStatus;
if (!window.editApplication) window.editApplication = editApplication;
if (!window.saveApplicationEdit) window.saveApplicationEdit = saveApplicationEdit;
if (!window.deleteApplication) window.deleteApplication = deleteApplication;
if (!window.initConsent) window.initConsent = initConsent;
if (!window.renderSharePresets) window.renderSharePresets = renderSharePresets;
if (!window.renderPresetCard) window.renderPresetCard = renderPresetCard;
if (!window.renderSharingStatus) window.renderSharingStatus = renderSharingStatus;
if (!window.renderLegalSection) window.renderLegalSection = renderLegalSection;
if (!window.handleProfilePhoto) window.handleProfilePhoto = handleProfilePhoto;
if (!window.removeProfilePhoto) window.removeProfilePhoto = removeProfilePhoto;
if (!window.saveSettings) window.saveSettings = saveSettings;
if (!window.selectPreset) window.selectPreset = selectPreset;
if (!window.filterSkillsView) window.filterSkillsView = filterSkillsView;
if (!window.showValuationBreakdown) window.showValuationBreakdown = showValuationBreakdown;
if (!window.renderInlineNegotiation) window.renderInlineNegotiation = renderInlineNegotiation;
if (!window.showNegotiationGuide) window.showNegotiationGuide = showNegotiationGuide;
if (!window._buildOnetNameIndex) window._buildOnetNameIndex = _buildOnetNameIndex;
if (!window._matchOnetByName) window._matchOnetByName = _matchOnetByName;
if (!window.getSkillImpact) window.getSkillImpact = getSkillImpact;
if (!window.getUniqueSkillImpact) window.getUniqueSkillImpact = getUniqueSkillImpact;
if (!window.findComparableSkill) window.findComparableSkill = findComparableSkill;
if (!window.calculateUniqueSkillImpact) window.calculateUniqueSkillImpact = calculateUniqueSkillImpact;
if (!window.getImpactLabel) window.getImpactLabel = getImpactLabel;
if (!window.getImpactIcon) window.getImpactIcon = getImpactIcon;
if (!window.getImpactColor) window.getImpactColor = getImpactColor;
if (!window.closeONETPicker) window.closeONETPicker = closeONETPicker;
if (!window.renderONETLibrary) window.renderONETLibrary = renderONETLibrary;
if (!window.renderONETSkillItem) window.renderONETSkillItem = renderONETSkillItem;
if (!window.toggleONETSkillSelection) window.toggleONETSkillSelection = toggleONETSkillSelection;
if (!window.updateONETSelectedCount) window.updateONETSelectedCount = updateONETSelectedCount;
if (!window.filterONETLibrary) window.filterONETLibrary = filterONETLibrary;
if (!window.addSelectedONETSkills) window.addSelectedONETSkills = addSelectedONETSkills;
if (!window.closeCustomSkillBuilder) window.closeCustomSkillBuilder = closeCustomSkillBuilder;
if (!window.createCustomSkill) window.createCustomSkill = createCustomSkill;
if (!window.openBulkImport) window.openBulkImport = openBulkImport;
if (!window.closeBulkImport) window.closeBulkImport = closeBulkImport;
if (!window.switchBulkTab) window.switchBulkTab = switchBulkTab;
if (!window.handleBulkCsvFile) window.handleBulkCsvFile = handleBulkCsvFile;
if (!window.parseBulkSkills) window.parseBulkSkills = parseBulkSkills;
if (!window.parseTextToItems) window.parseTextToItems = parseTextToItems;
if (!window.parseCsvToItems) window.parseCsvToItems = parseCsvToItems;
if (!window.parseCsvLine) window.parseCsvLine = parseCsvLine;
if (!window.titleCase) window.titleCase = titleCase;
if (!window.renderBulkReview) window.renderBulkReview = renderBulkReview;
if (!window.updateBulkAction) window.updateBulkAction = updateBulkAction;
if (!window.bulkImportBack) window.bulkImportBack = bulkImportBack;
if (!window.toggleBulkProfileOptions) window.toggleBulkProfileOptions = toggleBulkProfileOptions;
if (!window.executeBulkImport) window.executeBulkImport = executeBulkImport;
if (!window.openBulkManager) window.openBulkManager = openBulkManager;
if (!window.closeBulkManager) window.closeBulkManager = closeBulkManager;
if (!window.renderBulkManagerList) window.renderBulkManagerList = renderBulkManagerList;
if (!window.filterBulkManager) window.filterBulkManager = filterBulkManager;
if (!window.toggleBulkManagerAll) window.toggleBulkManagerAll = toggleBulkManagerAll;
if (!window.updateBulkManagerSelection) window.updateBulkManagerSelection = updateBulkManagerSelection;
if (!window.getSelectedBulkSkillNames) window.getSelectedBulkSkillNames = getSelectedBulkSkillNames;
if (!window.bulkManagerSetLevel) window.bulkManagerSetLevel = bulkManagerSetLevel;
if (!window.executeBulkSetLevel) window.executeBulkSetLevel = executeBulkSetLevel;
if (!window.bulkManagerRemove) window.bulkManagerRemove = bulkManagerRemove;
if (!window.openEditSkillModal) window.openEditSkillModal = openEditSkillModal;
if (!window.closeEditSkillModal) window.closeEditSkillModal = closeEditSkillModal;
if (!window.updateEditSkillGapWarning) window.updateEditSkillGapWarning = updateEditSkillGapWarning;
if (!window.deleteSkillFromProfile) window.deleteSkillFromProfile = deleteSkillFromProfile;
if (!window.openUnifiedSkillEditor) window.openUnifiedSkillEditor = openUnifiedSkillEditor;
if (!window.closeUnifiedSkillEditor) window.closeUnifiedSkillEditor = closeUnifiedSkillEditor;
if (!window.uniUpdateGapWarning) window.uniUpdateGapWarning = uniUpdateGapWarning;
if (!window.saveUnifiedSkillEdit) window.saveUnifiedSkillEdit = saveUnifiedSkillEdit;
if (!window.saveSkillEdit) window.saveSkillEdit = saveSkillEdit;
if (!window.confirmDeleteSkill) window.confirmDeleteSkill = confirmDeleteSkill;
if (!window.deleteSkill) window.deleteSkill = deleteSkill;
if (!window.openAssessSkillModal) window.openAssessSkillModal = openAssessSkillModal;
if (!window.closeAssessSkillModal) window.closeAssessSkillModal = closeAssessSkillModal;
if (!window.updateAssessmentPreview) window.updateAssessmentPreview = updateAssessmentPreview;
if (!window.saveSkillAssessment) window.saveSkillAssessment = saveSkillAssessment;
if (!window.refreshAllViews) window.refreshAllViews = refreshAllViews;
if (!window.closeSkillManagement) window.closeSkillManagement = closeSkillManagement;
if (!window.switchSkillManagementTab) window.switchSkillManagementTab = switchSkillManagementTab;
if (!window.getTotalAvailableSkillCount) window.getTotalAvailableSkillCount = getTotalAvailableSkillCount;
if (!window.updateSkillManagementCounts) window.updateSkillManagementCounts = updateSkillManagementCounts;
if (!window.renderYourSkills) window.renderYourSkills = renderYourSkills;
if (!window.filterYourSkills) window.filterYourSkills = filterYourSkills;
if (!window.removeSkillFromProfile) window.removeSkillFromProfile = removeSkillFromProfile;
if (!window.showAddSkillsEmpty) window.showAddSkillsEmpty = showAddSkillsEmpty;
if (!window.handleAddSkillsSearch) window.handleAddSkillsSearch = handleAddSkillsSearch;
if (!window.searchAllLibraries) window.searchAllLibraries = searchAllLibraries;
if (!window.performAddSkillsSearch) window.performAddSkillsSearch = performAddSkillsSearch;
if (!window.searchAddSkillsByCategory) window.searchAddSkillsByCategory = searchAddSkillsByCategory;
if (!window.addSkillFromLibrary) window.addSkillFromLibrary = addSkillFromLibrary;
