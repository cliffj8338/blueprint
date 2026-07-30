/**
 * src/core/constants.js — Phase 1
 * MONOLITH LINES: 1723–2066
 */

export var BP_VERSION = 'v4.48.36';
export var BP_BUILD   = '20260406-design-polish';
export var JOB_SCHEMA_VERSION = '2.0';
export var JOB_SKILLS_CAP     = 50;
export var PROFILE_SKILL_CAP  = 50;
export var WB_SKILL_CAP       = 20;
export var SKILL_CAP_WARN     = 45;
export var INCIDENT_MAX       = 50;
export var AI_INPUT_COST_PER_M  = 3.0;
export var AI_OUTPUT_COST_PER_M = 15.0;
export var AI_PROXY_URL       = '/api/ai';

// ===== AI MODEL IDS (single source of truth) =====
// Change these two lines when migrating models; keep api/ai.js allowlist in sync.
export var BP_AI_MODEL      = 'claude-sonnet-4-6';            // default (Sonnet)
export var BP_AI_MODEL_FAST = 'claude-haiku-4-5-20251001';    // fast/cheap (Haiku)
window.BP_AI_MODEL      = BP_AI_MODEL;
window.BP_AI_MODEL_FAST = BP_AI_MODEL_FAST;

export var devStats = {
    firstCommit: '2025-12-28', lineCount: 44041, sessionsAI: 49,
    avgSessionHrs: 3.5, aiSubscriptionMonthly: 200, hostingMonthly: 25
};
window._blueprintDevStats = devStats;

export var API_HEALTH_SERVICES = {
    'anthropic-proxy':  { name: 'Anthropic AI Proxy',    icon: 'zap',        category: 'ai',    manageUrl: 'https://console.anthropic.com/settings/billing',           critical: true  },
    'anthropic-direct': { name: 'Anthropic Direct API',  icon: 'lock',       category: 'ai',    manageUrl: 'https://console.anthropic.com/settings/api-keys',          critical: false },
    'firebase-auth':    { name: 'Firebase Auth',         icon: 'shield',     category: 'infra', manageUrl: 'https://console.firebase.google.com',                      critical: true  },
    'firebase-db':      { name: 'Firestore Database',    icon: 'database',   category: 'infra', manageUrl: 'https://console.firebase.google.com',                      critical: true  },
    'jsearch':          { name: 'JSearch (RapidAPI)',     icon: 'search',     category: 'jobs',  manageUrl: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch',   critical: false },
    'remotive':         { name: 'Remotive',              icon: 'briefcase',  category: 'jobs',  manageUrl: 'https://remotive.com/api/remote-jobs',                     critical: false },
    'usajobs':          { name: 'USAJobs',               icon: 'award',      category: 'jobs',  manageUrl: 'https://developer.usajobs.gov',                            critical: false },
    'himalayas':        { name: 'Himalayas',             icon: 'trending-up',category: 'jobs',  manageUrl: 'https://himalayas.app/jobs/api',                           critical: false },
    'jobicy':           { name: 'Jobicy',                icon: 'clipboard',  category: 'jobs',  manageUrl: 'https://jobicy.com/api/v2/remote-jobs',                    critical: false },
    'adzuna':           { name: 'Adzuna',                icon: 'compass',    category: 'jobs',  manageUrl: 'https://developer.adzuna.com',                             critical: false },
    'themuse':          { name: 'The Muse',              icon: 'star',       category: 'jobs',  manageUrl: 'https://www.themuse.com/developers/api/v2',                critical: false },
    'onet-crosswalk':   { name: 'O*NET Crosswalk',       icon: 'target',     category: 'data',  manageUrl: null,                                                       critical: false },
};

export var AI_FEATURES = {
    'resume-parse':          { name: 'Resume Parse',           inputTokens: 2200, outputTokens: 3500, desc: 'One-time per user' },
    'jd-analysis':           { name: 'JD Analysis',            inputTokens: 1800, outputTokens: 1800, desc: 'Per job added' },
    'cover-letter':          { name: 'Cover Letter',           inputTokens: 1200, outputTokens: 1200, desc: 'Per application' },
    'interview-prep':        { name: 'Interview Prep',         inputTokens: 1800, outputTokens: 2500, desc: 'Per application' },
    'linkedin-profile':      { name: 'LinkedIn Profile',       inputTokens: 1200, outputTokens: 1200, desc: 'Occasional' },
    'linkedin-skill-infer':  { name: 'LinkedIn Skill Inference',inputTokens: 3000, outputTokens: 3000, desc: 'Per LinkedIn import' },
    'purpose-regen':         { name: 'Purpose Statement',      inputTokens: 600,  outputTokens: 250,  desc: 'Regenerations' },
    'wb-company-research':   { name: 'WB Company Research',    inputTokens: 1500, outputTokens: 2000, desc: 'Per wizard run' },
    'company-values-lookup': { name: 'Company Values Lookup',  inputTokens: 300,  outputTokens: 512,  desc: 'Per unknown company in Compare' },
    'wb-value-desc':         { name: 'WB Value Description',   inputTokens: 400,  outputTokens: 200,  desc: 'Per value AI fill' },
    'wb-value-desc-bulk':    { name: 'WB Value Desc Bulk',     inputTokens: 800,  outputTokens: 1500, desc: 'Bulk value fill' },
    'wb-skill-outcome':      { name: 'WB Skill Outcome',       inputTokens: 600,  outputTokens: 50,   desc: 'Per skill outcome fill' },
    'wb-skill-outcome-bulk': { name: 'WB Skill Outcomes Bulk', inputTokens: 900,  outputTokens: 1200, desc: 'Bulk skill outcome fill' },
    'wb-demonstrated':       { name: 'WB Demonstrated Exp',    inputTokens: 800,  outputTokens: 900,  desc: 'AI demonstrated experience' },
};

export var API_FEATURES = {
    'jsearch':   { name: 'JSearch (RapidAPI)', costPer: 0.0025, desc: 'Google Jobs aggregator',  unit: 'request', monthlyLimit: 10000, monthlyCost: 25.00, plan: 'Pro',           manageUrl: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch/pricing' },
    'remotive':  { name: 'Remotive',           costPer: 0,      desc: 'Free remote jobs API',    unit: 'request', monthlyLimit: null,  monthlyCost: 0,     plan: 'Free',          manageUrl: 'https://remotive.com/api/remote-jobs' },
    'usajobs':   { name: 'USAJobs',            costPer: 0,      desc: 'Free govt jobs API',      unit: 'request', monthlyLimit: null,  monthlyCost: 0,     plan: 'Free',          manageUrl: 'https://developer.usajobs.gov/apirequest/index' },
    'himalayas': { name: 'Himalayas',          costPer: 0,      desc: 'Free remote jobs API',    unit: 'request', monthlyLimit: null,  monthlyCost: 0,     plan: 'Free',          manageUrl: 'https://himalayas.app/jobs/api' },
    'jobicy':    { name: 'Jobicy',             costPer: 0,      desc: 'Free remote jobs API',    unit: 'request', monthlyLimit: null,  monthlyCost: 0,     plan: 'Free',          manageUrl: 'https://jobicy.com/api/v2/remote-jobs' },
    'adzuna':    { name: 'Adzuna',             costPer: 0,      desc: 'Free job aggregator API', unit: 'request', monthlyLimit: null,  monthlyCost: 0,     plan: 'Free',          manageUrl: 'https://developer.adzuna.com' },
    'themuse':   { name: 'The Muse',           costPer: 0,      desc: 'Free jobs + company API', unit: 'request', monthlyLimit: 3600, monthlyCost: 0,     plan: 'Free (3600/hr)',manageUrl: 'https://www.themuse.com/developers/api/v2' },
};

export var WB_INDUSTRIES = [
    'Accounting & Tax Services','Advertising & Marketing','Aerospace & Defense',
    'Agriculture, Forestry, Fishing & Hunting','Architectural & Engineering Services',
    'Arts, Entertainment & Recreation','Automotive','Aviation',
    'Biotechnology & Life Sciences','Business Consulting','Construction',
    'Consumer Electronics','Consumer Goods & Services','Education',
    'Energy, Utilities & Renewables','Finance & Insurance',
    'Government & Public Administration','Healthcare & Social Assistance',
    'Hospitality & Food Services','Human Resources & Recruiting',
    'Information Technology & Software','Legal Services','Logistics & Supply Chain',
    'Manufacturing','Media & Broadcasting','Non-Profit & Religious Organizations',
    'Pharmaceuticals','Professional, Scientific & Technical Services',
    'Real Estate, Rental & Leasing','Retail Trade','Staffing & Recruiting',
    'Telecommunications','Transportation & Warehousing','Wholesale Trade','Other'
];
export var WB_TRAVEL_OPTIONS = [
    'None','Up to 5%','Up to 10%','Up to 15%','Up to 20%','Up to 25%',
    'Up to 30%','Up to 40%','Up to 50%','Up to 75%','100% / Full Travel'
];
export var WB_SCHEDULE_OPTIONS = [
    'Monday \u2013 Friday','Monday \u2013 Saturday','Rotating Shifts',
    'Flexible / Hybrid','Weekends','Nights','On-Call','Compressed (4\u00D710)','Other'
];
export var WB_EMPLOYMENT_TYPES = ['Full-time','Part-time','Contract','Freelance','Internship'];

// Incident log helpers (depend on security.js during transition — use fallbacks)
function _sg(k)    { return typeof safeGet    === 'function' ? safeGet(k)         : localStorage.getItem(k); }
function _ss(k, v) { return typeof safeSet    === 'function' ? safeSet(k, v)      : localStorage.setItem(k, v); }
function _sr(k)    { return typeof safeRemove === 'function' ? safeRemove(k)      : localStorage.removeItem(k); }
function _sp(s, f) { return typeof safeParse  === 'function' ? safeParse(s, f)    : (s ? JSON.parse(s) : f); }

export function getIncidentLog()       { return _sp(_sg('bpIncidentLog'), []) || []; }
export function saveIncidentLog(log)   { _ss('bpIncidentLog', JSON.stringify(log)); }
export function logIncident(sev, feat, msg, details) {
    var log = getIncidentLog();
    log.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
        severity: sev, feature: feat, message: msg, details: details||null,
        timestamp: new Date().toISOString(), resolved: false });
    if (log.length > INCIDENT_MAX) log = log.slice(0, INCIDENT_MAX);
    saveIncidentLog(log);
    var pre = sev==='critical'?'\u274C':sev==='warning'?'\u26A0\uFE0F':'\u2139\uFE0F';
    console.log(pre+' Incident ['+sev+'] '+feat+': '+msg);
}
export function resolveIncidents(feat) {
    var log = getIncidentLog(), changed = false;
    log.forEach(function(i){ if(i.feature===feat&&!i.resolved){i.resolved=true;i.resolvedAt=new Date().toISOString();changed=true;} });
    if (changed) saveIncidentLog(log);
}
export function clearIncidentLog()     { _sr('bpIncidentLog'); }
window.clearIncidentLog = clearIncidentLog;

export function getApiHealth()         { return _sp(_sg('bpApiHealth'), {}) || {}; }
export function saveApiHealth(h)       { _ss('bpApiHealth', JSON.stringify(h)); }
export function recordApiHealth(id, status, msg, details) {
    var h = getApiHealth();
    h[id] = { status, message: msg||'', details: details||null,
              timestamp: new Date().toISOString(), ttl: status==='ok'?3600000:300000 };
    saveApiHealth(h);
}
export function getServiceStatus(id) {
    var h = getApiHealth(), e = h[id];
    if (!e) return { status:'unknown', message:'No data yet', stale:false };
    return { status:e.status, message:e.message, details:e.details,
             timestamp:e.timestamp, stale: Date.now()-new Date(e.timestamp).getTime() > (e.ttl||3600000) };
}

export function getAIUsageLog()        { return _sp(_sg('bpAIUsageLog'), {}) || {}; }
export function saveAIUsageLog(l)      { _ss('bpAIUsageLog', JSON.stringify(l)); }
export function trackAICall(tag) {
    if (!tag) return;
    var l = getAIUsageLog(), d = new Date().toISOString().slice(0,10);
    if (!l[d]) l[d]={};  l[d][tag]=(l[d][tag]||0)+1;  saveAIUsageLog(l);
}
export function getAPIUsageLog()       { return _sp(_sg('bpAPIUsageLog'), {}) || {}; }
export function saveAPIUsageLog(l)     { _ss('bpAPIUsageLog', JSON.stringify(l)); }
export function trackAPICall(tag) {
    if (!tag) return;
    var l = getAPIUsageLog(), d = new Date().toISOString().slice(0,10);
    if (!l[d]) l[d]={};  l[d][tag]=(l[d][tag]||0)+1;  saveAPIUsageLog(l);
}
export function getMonthlyAPIUsage(tag) {
    var l = getAPIUsageLog(), now = new Date(),
        pre = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'), total=0;
    Object.keys(l).forEach(function(d){ if(d.startsWith(pre)&&l[d][tag]) total+=l[d][tag]; });
    return total;
}
