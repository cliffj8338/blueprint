/**
 * src/engine/skill-library.js — Phase 3
 * Skill library loader, ESCO categorization, search, dedup, cap enforcement,
 * and admin blocklist/approved-skills management.
 * MONOLITH LINES: 17756–18475 + 18060–18485 (admin + search helpers)
 *
 * DEPENDENCIES (transition globals from legacy.js):
 *   skillsData, userData, fbDb, fbUser
 *   PROFICIENCY_SCALE, PROFILE_SKILL_CAP, SKILL_CAP_WARN
 *   showToast, bpIcon, escapeHtml, logIncident
 *   saveUserData, debouncedSave, rescoreAllJobs, refreshAllViews, closeExportModal
 *   getEscoCategorySiblings  ← from engine/synonyms.js (Phase 3, loaded after)
 */

import { PROFILE_SKILL_CAP, SKILL_CAP_WARN, logIncident } from '../core/constants.js';

// ─── Module state ─────────────────────────────────────────────────────────────

export var skillLibraryIndex = null;
var _skillLibraryPromise   = null;
var _escoSubcategoryIndex  = {};  // subcat_lower → [skill_name_lower, ...]
var _escoSkillToSubcategory = {}; // skill_name_lower → subcat_lower
var _adminSkillBlocklist    = new Set();
var _adminSkillBlocklistLoaded = false;
var _adminApprovedSkills    = new Set();

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loadSkillLibraryIndex() {
    var cacheBuster = '?v=20260227-v4';
    var candidates  = ['skills/index-v4.json', 'skills/index-v3.json'];

    for (var i = 0; i < candidates.length; i++) {
        var path = candidates[i];
        try {
            var response = await fetch(path + cacheBuster);
            if (!response.ok) continue;
            var data = await response.json();
            skillLibraryIndex = data;
            window._skillNameSet   = new Set();
            window._skillLibNameMap = new Map();
            if (data.index) {
                data.index.forEach(function(e) {
                    var ln = (e.name || e.n || '').toLowerCase();
                    if (ln) { window._skillNameSet.add(ln); window._skillLibNameMap.set(ln, e); }
                });
            }
            recategorizeLightcastSkills();
            buildEscoCategoryIndex();
            var count = data.count || data.totalSkills || (data.index && data.index.length) || '?';
            console.log('\u2705 Skill library loaded: ' + Number(count).toLocaleString() + ' skills (' + path + ')');
            if (data.sources) {
                Object.entries(data.sources).forEach(function(e) {
                    console.log('  ' + e[0] + ': ' + e[1].count + ' skills (v' + e[1].version + ')');
                });
            }
            var badge = document.getElementById('availableSkillsCount');
            if (badge && count !== '?') badge.textContent = Number(count).toLocaleString();
            return;
        } catch(e) { /* try next */ }
    }
    // Mark failure distinctly from a successfully loaded empty index and
    // clear the shared promise so a later attempt can retry (task #33).
    skillLibraryIndex = { totalSkills: 0, index: [], loadFailed: true };
    _skillLibraryPromise = null;
    console.warn('\u26A0 Skill library not found \u2014 Add Skills search will be empty.');
}

export function initSkillLibrary() {
    _skillLibraryPromise = loadSkillLibraryIndex();
    return _skillLibraryPromise;
}

export async function ensureSkillLibrary() {
    if (skillLibraryIndex && skillLibraryIndex.index && skillLibraryIndex.index.length > 0) return true;
    if (_skillLibraryPromise) {
        try {
            await Promise.race([
                _skillLibraryPromise,
                new Promise(function(_, rej) { setTimeout(function() { rej('timeout'); }, 8000); })
            ]);
        } catch(e) { console.warn('ensureSkillLibrary: ' + e); }
    }
    return !!(skillLibraryIndex && skillLibraryIndex.index && skillLibraryIndex.index.length > 0);
}
window.ensureSkillLibrary = ensureSkillLibrary;

export async function loadExternalSynonyms() {
    try {
        var response = await fetch('skills/synonyms.json?v=20260227');
        if (!response.ok) return;
        var data = await response.json();
        var map  = data.map || {};
        var synonymLookup = window._synonymLookup || {};
        var added = 0;
        Object.keys(map).forEach(function(key) {
            var lower = key.toLowerCase();
            if (!synonymLookup[lower]) synonymLookup[lower] = [];
            map[key].forEach(function(syn) {
                var synLower = syn.toLowerCase();
                if (synonymLookup[lower].indexOf(synLower) === -1) { synonymLookup[lower].push(synLower); added++; }
                if (!synonymLookup[synLower]) synonymLookup[synLower] = [];
                if (synonymLookup[synLower].indexOf(lower) === -1) synonymLookup[synLower].push(lower);
            });
        });
        window._synonymLookup = synonymLookup;
        console.log('\u2705 Extended synonyms loaded: ' + added + ' new mappings from ' + Object.keys(map).length + ' entries');
    } catch(e) { /* optional */ }
}

// ─── ESCO categorization ──────────────────────────────────────────────────────

function recategorizeLightcastSkills() {
    if (!skillLibraryIndex || !skillLibraryIndex.index) return;
    var rules = [
        [/\b(java(?:script)?|python|ruby|php|c\+\+|c#|swift|kotlin|golang|rust|scala|perl|typescript|\.net|vb\.net|objective.c|dart|lua|haskell|erlang|clojure|fortran|cobol|assembly|bash|shell|powershell)\b/i,'Technology','Programming Languages'],
        [/\b(react|angular|vue|svelte|next\.?js|nuxt|ember|backbone|jquery|bootstrap|tailwind|sass|less|webpack|vite|node\.?js|express|django|flask|spring|laravel|rails|asp\.net|fastapi)\b/i,'Technology','Web Frameworks'],
        [/\b(html|css|dom|web develop|front.?end|back.?end|full.?stack|responsive design|web design|rest api|graphql|websocket|microservice)\b/i,'Technology','Web Development'],
        [/\b(sql|mysql|postgresql|oracle|mongodb|redis|elasticsearch|cassandra|dynamodb|firebase|neo4j|sqlite|mariadb|database|data model|data warehouse|etl|data pipeline|data lake|snowflake|bigquery|redshift)\b/i,'Technology','Data & Databases'],
        [/\b(aws|amazon web|azure|google cloud|gcp|cloud comput|cloud architect|cloud engineer|docker|kubernetes|k8s|terraform|ansible|puppet|chef|jenkins|ci.?cd|devops|infrastructure as code|serverless|lambda|cloudformation)\b/i,'Technology','Cloud & DevOps'],
        [/\b(machine learn|deep learn|neural network|nlp|natural language|computer vision|tensorflow|pytorch|keras|scikit|reinforcement learn|generative ai|llm|large language|gpt|transformer|bert|diffusion|embedding|fine.?tun|prompt engineer|rag|retrieval augment)\b/i,'Technology','AI & Machine Learning'],
        [/\b(data analy|data scien|data visual|tableau|power bi|looker|qlik|sas|spss|r programming|stata|pandas|numpy|matplotlib|statistical|regression|hypothesis|a.b test|analytics)\b/i,'Technology','Data Science & Analytics'],
        [/\b(cyber.?secur|information secur|network secur|penetration test|ethical hack|firewall|encryption|soc analyst|incident response|vulnerability|malware|threat|siem|compliance.*security|iam|identity.*access)\b/i,'Technology','Cybersecurity'],
        [/\b(ios|android|mobile develop|react native|flutter|xamarin|swiftui|app develop|mobile app)\b/i,'Technology','Mobile Development'],
        [/\b(git|github|gitlab|bitbucket|version control|agile|scrum|kanban|jira|confluence|trello|product manag|sprint|backlog|user stor)\b/i,'Technology','Software Development Practices'],
        [/\b(linux|unix|windows server|vmware|virtualization|active directory|system admin|network admin|tcp.?ip|dns|dhcp|load balanc|nginx|apache|it support|help desk|troubleshoot|hardware)\b/i,'Technology','IT & Systems Administration'],
        [/\b(project manag|program manag|pmp|prince2|pmbok|waterfall|stakeholder manag|change manag|risk manag|portfolio manag)\b/i,'Business & Management','Project Management'],
        [/\b(strategic plan|business strateg|corporate strateg|competitive analysis|swot|market analysis|business develop|growth strateg)\b/i,'Business & Management','Strategy'],
        [/\b(leadership|team lead|people manag|team manag|executive|c.?suite|director|vp of|chief.*officer|management develop|succession plan)\b/i,'Business & Management','Leadership & Management'],
        [/\b(operations manag|supply chain|logistics|procurement|inventory|lean|six sigma|process improve|kaizen|quality manag|iso 9001)\b/i,'Business & Management','Operations & Supply Chain'],
        [/\b(account|bookkeep|gaap|ifrs|general ledger|accounts payable|accounts receivable|journal entr|trial balance|chart of account|cpa|audit)\b/i,'Finance & Accounting','Accounting'],
        [/\b(financial analy|financial model|valuation|dcf|discounted cash|investment bank|equity research|m&a|merger|acquisition|ipo|due diligence)\b/i,'Finance & Accounting','Financial Analysis & Investment'],
        [/\b(budget|forecast|financial plan|treasury|cash flow|capital|portfolio manag.*financ|asset manag|wealth manag|cfp|cfa)\b/i,'Finance & Accounting','Financial Planning'],
        [/\b(digital market|seo|sem|ppc|google ads|facebook ads|social media market|content market|email market|marketing automat|hubspot|marketo|mailchimp)\b/i,'Marketing & Sales','Digital Marketing'],
        [/\b(brand|branding|brand strateg|brand manag|brand identity|positioning|messaging|go.?to.?market)\b/i,'Marketing & Sales','Brand Management'],
        [/\b(sales|selling|cold call|prospecting|business develop|account execut|quota|pipeline|crm|salesforce|lead generat|revenue|closing|upsell|cross.?sell)\b/i,'Marketing & Sales','Sales'],
        [/\b(recruiting|talent acquis|sourcing|ats|applicant track|hiring|interview|onboard|job post|employer brand|recruiter|headhunt)\b/i,'Human Resources','Talent Acquisition'],
        [/\b(hris|human resource|hr manag|people operation|workforce plan|org design|organizational develop|culture|employee engag|employee relat)\b/i,'Human Resources','HR Management'],
        [/\b(training|learning.*develop|l&d|instructional design|lms|elearning|curriculum|professional develop|coaching|mentoring)\b/i,'Human Resources','Learning & Development'],
        [/\b(nursing|rn |lpn|nurse practition|clinical|patient care|hospital|medical|physician|diagnos|treatment|emr|ehr|epic|cerner|hipaa|healthcare)\b/i,'Healthcare & Medical','Clinical & Patient Care'],
        [/\b(pharma|drug|fda|clinical trial|gmp|regulatory.*pharma|biotech|biolog|molecular|genomic|dna|rna|crispr|stem cell|lab tech|patholog)\b/i,'Healthcare & Medical','Pharmaceutical & Biotech'],
    ];
    var changed = 0;
    skillLibraryIndex.index.forEach(function(entry) {
        if ((entry.c || '') !== 'General Professional') return;
        var name = (entry.n || '').toLowerCase();
        for (var i = 0; i < rules.length; i++) {
            if (rules[i][0].test(name)) { entry.c = rules[i][1]; entry.sc = rules[i][2]; changed++; break; }
        }
    });
    if (changed > 0) console.log('\u2713 Recategorized ' + changed + ' Lightcast skills from General Professional');
}

function buildEscoCategoryIndex() {
    if (!skillLibraryIndex || !skillLibraryIndex.index) return;
    _escoSubcategoryIndex  = {};
    _escoSkillToSubcategory = {};
    var count = 0;
    skillLibraryIndex.index.forEach(function(entry) {
        var name   = (entry.n || '').toLowerCase().trim();
        var subcat = (entry.sc || entry.c || '').toLowerCase().trim();
        if (!name || !subcat || name.length < 3) return;
        _escoSkillToSubcategory[name] = subcat;
        if (!_escoSubcategoryIndex[subcat]) _escoSubcategoryIndex[subcat] = [];
        _escoSubcategoryIndex[subcat].push(name);
        count++;
    });
    if (typeof skillsData !== 'undefined' && skillsData.skills) {
        skillsData.skills.forEach(function(s) {
            var name = (s.name || '').toLowerCase().trim();
            if (!name || name.length < 3 || _escoSkillToSubcategory[name]) return;
            var libMatch = window._skillLibNameMap ? window._skillLibNameMap.get(name) : null;
            if (libMatch) {
                var subcat = (libMatch.sc || libMatch.c || '').toLowerCase().trim();
                if (subcat) {
                    _escoSkillToSubcategory[name] = subcat;
                    if (_escoSubcategoryIndex[subcat]) _escoSubcategoryIndex[subcat].push(name);
                }
            }
        });
    }
    console.log('\u2713 ESCO category bridge: ' + count + ' skills across ' + Object.keys(_escoSubcategoryIndex).length + ' subcategories');
}

export function getEscoCategorySiblings(skillNameLower) {
    var subcat = _escoSkillToSubcategory[skillNameLower];
    if (!subcat) return [];
    var siblings = _escoSubcategoryIndex[subcat] || [];
    if (siblings.length > 25) return [];
    return siblings.filter(function(s) { return s !== skillNameLower; });
}
window.getEscoCategorySiblings = getEscoCategorySiblings;

// ─── Search ───────────────────────────────────────────────────────────────────

export function searchSkills(query) {
    try {
        if (!skillLibraryIndex || !skillLibraryIndex.index || !query) return [];
        var q = query.toLowerCase().trim();
        if (q.length < 2) return [];
        return skillLibraryIndex.index
            .filter(function(skill) {
                var name = (skill.n || '').toLowerCase();
                var cat  = (skill.c || '').toLowerCase();
                var sub  = (skill.sc || '').toLowerCase();
                return name.includes(q) || cat.includes(q) || sub.includes(q);
            })
            .sort(function(a, b) {
                var an = (a.n || '').toLowerCase(), bn = (b.n || '').toLowerCase();
                if (an === q) return -1; if (bn === q) return 1;
                if (an.startsWith(q) && !bn.startsWith(q)) return -1;
                if (!an.startsWith(q) && bn.startsWith(q)) return 1;
                return (b.p || 0) - (a.p || 0);
            })
            .slice(0, 20);
    } catch(e) {
        logIncident('warning', 'skill-search', 'Skill search failed: ' + e.message);
        if (typeof showToast === 'function') showToast('Skill search failed. Please try again.', 'error');
        return [];
    }
}
window.searchSkills = searchSkills;

export function getCategoryColor(category) {
    var colors = {
        'Technology': '#3b82f6', 'Business & Management': '#8b5cf6',
        'Finance & Accounting': '#10b981', 'Marketing & Sales': '#f59e0b',
        'Human Resources': '#ec4899', 'Healthcare & Medical': '#14b8a6',
        'Engineering & Manufacturing': '#6366f1', 'Legal & Compliance': '#78716c',
        'Creative & Design': '#f97316', 'General Professional': '#64748b'
    };
    return colors[category] || '#9ca3af';
}
window.getCategoryColor = getCategoryColor;

export function isSkillAlreadyAdded(skillName) {
    if (typeof userData === 'undefined') return false;
    return (userData.skills || []).some(function(s) {
        return s.name.toLowerCase() === skillName.toLowerCase();
    });
}
window.isSkillAlreadyAdded = isSkillAlreadyAdded;

// ─── Dedup ────────────────────────────────────────────────────────────────────

export function deduplicateSkills() {
    if (typeof userData === 'undefined' || !userData.skills || userData.skills.length === 0) return 0;
    var PROF = (typeof PROFICIENCY_SCALE !== 'undefined') ? PROFICIENCY_SCALE : { Mastery:5, Expert:4, Advanced:3, Proficient:2, Competent:1, Novice:0 };
    var seen = new Map(), dupeIndices = new Set();
    userData.skills.forEach(function(skill, idx) {
        var key = skill.name.toLowerCase().trim();
        if (seen.has(key)) {
            var ki = seen.get(key), keeper = userData.skills[ki];
            var ks = (keeper.verified?100:0) + ((keeper.evidence||[]).length*10) + (PROF[keeper.level]||0);
            var ds = (skill.verified?100:0)  + ((skill.evidence||[]).length*10)  + (PROF[skill.level]||0);
            if (ds > ks) { dupeIndices.add(ki); seen.set(key, idx); } else { dupeIndices.add(idx); }
        } else { seen.set(key, idx); }
    });
    if (dupeIndices.size === 0) return 0;
    var removed = dupeIndices.size;
    userData.skills = userData.skills.filter(function(_, i) { return !dupeIndices.has(i); });
    if (typeof skillsData !== 'undefined') skillsData.skills = userData.skills;
    console.log('\u2713 Deduplicated: removed ' + removed + ' duplicate' + (removed !== 1 ? 's' : '') + ' (' + userData.skills.length + ' remaining)');
    return removed;
}
window.deduplicateSkills = deduplicateSkills;

// ─── Cap enforcement ──────────────────────────────────────────────────────────

export function canAddSkill(showWarning) {
    var count = (typeof userData !== 'undefined' ? (userData.skills || []) : []).length;
    if (count >= PROFILE_SKILL_CAP) {
        if (showWarning !== false && typeof showToast === 'function')
            showToast('Profile skill cap reached (' + PROFILE_SKILL_CAP + '). Remove a skill before adding new ones.', 'warning', 5000);
        return false;
    }
    if (count >= SKILL_CAP_WARN && showWarning !== false && typeof showToast === 'function') {
        var rem = PROFILE_SKILL_CAP - count;
        showToast(rem + ' skill slot' + (rem !== 1 ? 's' : '') + ' remaining (cap: ' + PROFILE_SKILL_CAP + ').', 'info', 3000);
    }
    return true;
}
window.canAddSkill = canAddSkill;

// ─── Admin blocklist ──────────────────────────────────────────────────────────

export function loadAdminSkillBlocklist() {
    var db = window.fbDb, user = window.fbUser;
    if (!db) return;
    var fallback = function() {
        if (!user) return;
        db.collection('users').doc(user.uid).collection('work_blueprints').doc('__skill_blocklist').get()
            .then(function(d) { if (d.exists) { _adminSkillBlocklist = new Set((d.data().skills||[]).map(function(s){return s.toLowerCase().trim();})); } })
            .catch(function(){});
    };
    db.collection('meta').doc('skillBlocklist').get()
        .then(function(doc) {
            if (doc.exists) _adminSkillBlocklist = new Set((doc.data().skills||[]).map(function(s){return s.toLowerCase().trim();}));
            else fallback();
            _adminSkillBlocklistLoaded = true;
        })
        .catch(function() { _adminSkillBlocklistLoaded = true; fallback(); });
}
window.loadAdminSkillBlocklist = loadAdminSkillBlocklist;

export function saveAdminSkillBlocklist() {
    var db = window.fbDb, user = window.fbUser;
    if (!db) return;
    var arr = Array.from(_adminSkillBlocklist).sort();
    var payload = { skills: arr, updatedAt: new Date().toISOString() };
    db.collection('meta').doc('skillBlocklist').set(payload).catch(function() {
        if (user) db.collection('users').doc(user.uid).collection('work_blueprints').doc('__skill_blocklist').set(payload, { merge: true }).catch(function(){});
    });
}

export function isSkillBlocklisted(name) {
    return _adminSkillBlocklist.has((name || '').toLowerCase().trim());
}
window.isSkillBlocklisted = isSkillBlocklisted;

export function adminBlockSkill(name, jobIdx) {
    if (typeof readOnlyGuard === 'function' && readOnlyGuard()) return;
    var lower = (name || '').toLowerCase().trim();
    if (!lower) return;
    _adminSkillBlocklist.add(lower);
    saveAdminSkillBlocklist();
    if (typeof showToast === 'function') showToast('Blocked: "' + name + '" \u2014 filtered from future parses.', 'info', 3000);
    if (typeof jobIdx === 'number' && jobIdx >= 0) {
        var jobs = (typeof userData !== 'undefined' ? userData.savedJobs : null) || [];
        if (jobs[jobIdx] && jobs[jobIdx].matchData) {
            jobs[jobIdx].matchData.gaps = (jobs[jobIdx].matchData.gaps || []).filter(function(g) { return !isSkillBlocklisted(g.name); });
            if (typeof showJobDetail === 'function') showJobDetail(jobIdx);
        }
    }
}
window.adminBlockSkill = adminBlockSkill;

export function adminUnblockSkill(name) {
    _adminSkillBlocklist.delete((name || '').toLowerCase().trim());
    saveAdminSkillBlocklist();
    if (typeof showToast === 'function') showToast('Unblocked: "' + name + '"', 'info', 2000);
}
window.adminUnblockSkill = adminUnblockSkill;

// ─── Admin approved skills ────────────────────────────────────────────────────

export function loadAdminApprovedSkills() {
    var db = window.fbDb, user = window.fbUser;
    if (!db) return;
    var fallback = function() {
        if (!user) return;
        db.collection('users').doc(user.uid).collection('work_blueprints').doc('__approved_skills').get()
            .then(function(d) { if (d.exists) { _adminApprovedSkills = new Set((d.data().skills||[]).map(function(s){return s.toLowerCase().trim();})); } })
            .catch(function(){});
    };
    db.collection('meta').doc('parserApprovedSkills').get()
        .then(function(doc) {
            if (doc.exists) _adminApprovedSkills = new Set((doc.data().skills||[]).map(function(s){return s.toLowerCase().trim();}));
            else fallback();
        })
        .catch(function() { fallback(); });
}
window.loadAdminApprovedSkills = loadAdminApprovedSkills;

export function isSkillApproved(name) {
    return _adminApprovedSkills.has((name || '').toLowerCase().trim());
}
window.isSkillApproved = isSkillApproved;

export function adminApproveSkill(name) {
    if (typeof readOnlyGuard === 'function' && readOnlyGuard()) return;
    var lower = (name || '').toLowerCase().trim();
    if (!lower) return;
    _adminApprovedSkills.add(lower);
    _adminSkillBlocklist.delete(lower);
    saveAdminApprovedSkills();
    saveAdminSkillBlocklist();
    if (typeof showToast === 'function') showToast('Approved: \u201C' + lower + '\u201D \u2014 added to parser dictionary.', 'success', 3000);
}
window.adminApproveSkill = adminApproveSkill;

export function adminBlockFromAudit(name) {
    if (typeof readOnlyGuard === 'function' && readOnlyGuard()) return;
    var lower = (name || '').toLowerCase().trim();
    if (!lower) return;
    _adminSkillBlocklist.add(lower);
    _adminApprovedSkills.delete(lower);
    saveAdminSkillBlocklist();
    saveAdminApprovedSkills();
    if (typeof showToast === 'function') showToast('Blocked: \u201C' + lower + '\u201D \u2014 excluded from parsing.', 'info', 3000);
}
window.adminBlockFromAudit = adminBlockFromAudit;

function saveAdminApprovedSkills() {
    var db = window.fbDb, user = window.fbUser;
    if (!db) return;
    var arr = Array.from(_adminApprovedSkills).sort();
    var payload = { skills: arr, updatedAt: new Date().toISOString() };
    db.collection('meta').doc('parserApprovedSkills').set(payload).catch(function() {
        if (user) db.collection('users').doc(user.uid).collection('work_blueprints').doc('__approved_skills').set(payload, { merge: true }).catch(function(){});
    });
}
function adminBlockSkillFromInput() {
    var inp = document.getElementById('blocklistAddInput');
    if (!inp || !inp.value.trim()) return;
    adminBlockSkill(inp.value.trim(), -1);
    inp.value = '';
    var container = document.getElementById('adminBlocklistContainer');
    if (container && typeof renderAdminBlocklistPanel === 'function') container.innerHTML = renderAdminBlocklistPanel();
}
window.adminBlockSkillFromInput = adminBlockSkillFromInput;
