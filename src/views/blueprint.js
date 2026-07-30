// views/blueprint.js — Blueprint v4.46.21
// Phase 7g extraction — Blueprint view, values, outcomes, scouting reports

import { bpIcon }                          from '../ui/icons.js';
import { escapeHtml, sanitizeImport }      from '../core/security.js';
import { showToast }                       from '../ui/toast.js';
import { _sd, _bd, waitForUserData }       from '../core/data-helpers.js';
import { BP_AI_MODEL, BP_AI_MODEL_FAST }   from '../core/constants.js';

export async function initBlueprint() {
    if (!window._userData || !window._userData.initialized) {
        await waitForUserData();
    }
    extractOutcomesFromEvidence();
    inferValues();
    renderBlueprint();
}

export function extractOutcomesFromEvidence() {
    const outcomes = [];

    // Evidence now lives in window._userData.skills[].evidence as {description, outcome} objects.
    // We pull from there first, then fall back to the legacy skillDetails strings.
    const skills = window._userData.skills || _sd().skills || [];

    skills.forEach(skill => {
        (skill.evidence || []).forEach(ev => {
            // ev is {description, outcome} — use the outcome field for display
            const outcomeText = (ev.outcome || '').trim();
            const descText   = (ev.description || '').trim();
            if (!outcomeText && !descText) return;

            // Score the outcome — anything with a real metric qualifies
            const combined = outcomeText + ' ' + descText;
            const hasMetric = /\$[\d,]+[MBK]?|\d+%|\d+x|\d+ times|million|billion/i.test(combined);
            const hasResult = /retained|increased|reduced|improved|delivered|generated|achieved|enabled|saved|prevented|launched|built|founded|established|designed|developed|created|published|advised|managed|led|maintained|predicted|grew|expanded|scaled|transformed|implemented|coordinated|negotiated|secured|trained|recognized|served|produced|completed|resolved|translated|tracked|identified|advocated|guided|proposed|calculated|commanded|influenced|shaped|architected|recruited|mentored|applied|aligned|evaluated|made|openly|reached|channeled|spent/i.test(combined);

            if (hasMetric || hasResult) {
                // Build a combined display text: outcome is the headline, description adds context
                const displayText = outcomeText
                    ? (descText ? `${outcomeText} (${descText.slice(0, 100)}${descText.length > 100 ? '…' : ''})` : outcomeText)
                    : descText;

                outcomes.push({
                    text: displayText,
                    outcome: outcomeText,
                    description: descText,
                    skill: skill.name,
                    level: skill.level,
                    category: categorizeOutcome(skill.name, combined),
                    shared: !isSensitiveContent(combined), // sensitive items default to unshared
                    sensitive: isSensitiveContent(combined),
                    coachingSuggestion: generateCoachingFor(outcomeText || descText)
                });
            }
        });
    });

    // Also check legacy skillDetails (skill_evidence.json strings) — only if no skill-based outcomes found
    if (outcomes.length === 0) {
        const quantifiedPattern = /\$[\d,]+[MBK]?|\d+%|\d+ years?/gi;
        Object.entries(_sd().skillDetails || {}).forEach(([skillName, details]) => {
            if (!details.evidence) return;
            details.evidence.forEach(evidenceItem => {
                if (typeof evidenceItem !== 'string') return;
                const hasQuantity = quantifiedPattern.test(evidenceItem);
                if (hasQuantity) {
                    outcomes.push({
                        text: evidenceItem,
                        skill: skillName,
                        category: categorizeOutcome(skillName, evidenceItem),
                        shared: true,
                        sensitive: isSensitiveContent(evidenceItem),
                        coachingSuggestion: generateCoachingFor(evidenceItem)
                    });
                }
            });
        });
    }

    // Sort: unshared (sensitive) last, then by metric strength
    outcomes.sort((a, b) => {
        if (a.sensitive && !b.sensitive) return 1;
        if (!a.sensitive && b.sensitive) return -1;
        const scoreA = /\$[\d,]+[MBK]?/i.test(a.outcome||a.text) ? 2 : /\d+%/i.test(a.outcome||a.text) ? 1 : 0;
        const scoreB = /\$[\d,]+[MBK]?/i.test(b.outcome||b.text) ? 2 : /\d+%/i.test(b.outcome||b.text) ? 1 : 0;
        return scoreB - scoreA;
    });

    _bd().outcomes = outcomes;
}

export function categorizeOutcome(skillName, evidence) {
    if (evidence.includes('$') || evidence.includes('revenue') || evidence.includes('sales')) return 'Business Impact';
    if (evidence.includes('predict') || evidence.includes('accuracy') || evidence.includes('%')) return 'Strategic Foresight';
    if (evidence.includes('emergency') || evidence.includes('crisis') || evidence.includes('zero')) return 'Crisis Leadership';
    if (evidence.includes('founded') || evidence.includes('built') || evidence.includes('created')) return 'Entrepreneurial';
    if (evidence.includes('published') || evidence.includes('speaker') || evidence.includes('featured')) return 'Thought Leadership';
    if (evidence.includes('recovery') || evidence.includes('sobriety') || evidence.includes('advocacy')) return 'Advocacy Impact';
    return 'Professional Achievement';
}

export function isSensitiveContent(text) {
    const sensitiveKeywords = ['recovery', 'sobriety', 'addiction', 'Kyle', 'son', 'death', 'overdose', 'mental health'];
    return sensitiveKeywords.some(keyword => text.toLowerCase().includes(keyword));
}

export function generateCoachingFor(outcome) {
    if (!outcome.includes('$') && !outcome.includes('%')) {
        return "Consider adding quantification: What was the measurable impact?";
    }
    if (!outcome.includes('client') && !outcome.includes('company') && !outcome.includes('people')) {
        return "Strengthen by adding: Who benefited from this outcome?";
    }
    if (outcome.length < 50) {
        return "Add context: What decision did this enable or what changed as a result?";
    }
    return null;
}

// ===== VALUES SYSTEM =====
var VALUES_CATALOG = [
    { group: 'How I Think', values: [
        { name: 'Intellectual Honesty', keywords: ['integrity', 'honest', 'evidence', 'data', 'analy', 'research', 'rigor'], description: 'Following evidence wherever it leads, even when it challenges your own position.' },
        { name: 'Strategic Thinking', keywords: ['strateg', 'vision', 'foresight', 'roadmap', 'long-term', 'planning', 'framework'], description: 'Connecting present decisions to long-term outcomes others have not yet considered.' },
        { name: 'Curiosity', keywords: ['learn', 'curiosit', 'explor', 'research', 'discover', 'question', 'experiment'], description: 'Pursuing understanding for its own sake, not just when the job requires it.' },
        { name: 'Evidence-Based Decision Making', keywords: ['evidence', 'data', 'measur', 'metric', 'analy', 'research', 'validated'], description: 'Letting data settle debates that opinions cannot.' },
        { name: 'Systems Thinking', keywords: ['system', 'architect', 'integrat', 'complex', 'interdepend', 'holistic', 'scale'], description: 'Seeing how components interact across an entire system, not just the part in front of you.' }
    ]},
    { group: 'How I Lead', values: [
        { name: 'Accountability', keywords: ['account', 'responsib', 'own', 'deliver', 'commit', 'reliable', 'dependab'], description: 'Owning outcomes, not just tasks. Especially the ones that went wrong.' },
        { name: 'Servant Leadership', keywords: ['servant', 'mentor', 'coach', 'develop', 'empower', 'support', 'grow'], description: 'Measuring your success by the growth and readiness of the people around you.' },
        { name: 'Empowerment', keywords: ['empower', 'delegat', 'trust', 'autonom', 'enable', 'develop', 'grow'], description: 'Giving people the authority and resources to act, then getting out of their way.' },
        { name: 'Transparency', keywords: ['transparen', 'open', 'honest', 'candid', 'communicat', 'visible', 'share'], description: 'Sharing context freely so others can make informed decisions without you.' },
        { name: 'Courage', keywords: ['courag', 'bold', 'risk', 'challeng', 'spoke', 'stand', 'confront', 'difficult'], description: 'Saying the hard thing in the room when staying silent would be easier.' }
    ]},
    { group: 'How I Work', values: [
        { name: 'Excellence', keywords: ['excel', 'quality', 'precision', 'standard', 'best', 'outperform', 'world-class'], description: 'Setting a standard that makes good enough feel insufficient.' },
        { name: 'Resourcefulness', keywords: ['resourceful', 'creative', 'scrappy', 'bootstrap', 'efficien', 'lean', 'solve'], description: 'Finding a path forward when the obvious one is blocked.' },
        { name: 'Bias Toward Action', keywords: ['action', 'launch', 'ship', 'built', 'execut', 'deliver', 'implement', 'deploy'], description: 'Shipping something real rather than perfecting something theoretical.' },
        { name: 'Continuous Improvement', keywords: ['improv', 'optimi', 'iterat', 'refine', 'evolv', 'better', 'enhance'], description: 'Treating every process as a draft that can be rewritten.' },
        { name: 'Craftsmanship', keywords: ['craft', 'precision', 'detail', 'quality', 'artis', 'master', 'skill', 'technique'], description: 'Caring about the quality of work even when nobody is watching.' }
    ]},
    { group: 'How I Connect', values: [
        { name: 'Empathy', keywords: ['empathy', 'empathetic', 'understand', 'compassion', 'listen', 'perspective', 'human'], description: 'Understanding what someone needs before they have to explain it twice.' },
        { name: 'Collaboration', keywords: ['collaborat', 'partner', 'cross-functional', 'stakeholder', 'team', 'together', 'align'], description: 'Building shared ownership across boundaries that usually divide teams.' },
        { name: 'Trust', keywords: ['trust', 'reliab', 'credib', 'consistent', 'depend', 'faith', 'relationship'], description: 'Being the person others confide in because your word has always held.' },
        { name: 'Candor', keywords: ['candor', 'candid', 'direct', 'honest', 'feedback', 'frank', 'straightforward'], description: 'Delivering honest feedback as a form of respect, not confrontation.' },
        { name: 'Inclusion', keywords: ['inclusi', 'divers', 'equit', 'belong', 'access', 'representation', 'voice'], description: 'Making sure the quietest voice in the room is heard, not just the loudest.' }
    ]},
    { group: 'What I Protect', values: [
        { name: 'Integrity', keywords: ['integrity', 'ethical', 'principle', 'moral', 'honest', 'right', 'trust'], description: 'Doing the right thing when there is a personal cost to doing so.' },
        { name: 'Resilience', keywords: ['resilien', 'crisis', 'recover', 'adapt', 'persever', 'overcome', 'surviv', 'endur'], description: 'Converting setbacks into capabilities that did not exist before.' },
        { name: 'Authenticity', keywords: ['authentic', 'genuine', 'vulnerab', 'self-aware', 'real', 'true', 'honest'], description: 'Presenting yourself as you are, not as the audience expects.' },
        { name: 'Work-Life Boundaries', keywords: ['balance', 'boundar', 'sustain', 'wellbeing', 'health', 'burnout', 'life'], description: 'Protecting the conditions that let you sustain high performance over years, not weeks.' },
        { name: 'Purpose Over Profit', keywords: ['purpose', 'mission', 'impact', 'meaning', 'community', 'service', 'cause', 'foundation'], description: 'Choosing work that matters to people, not just to a balance sheet.' }
    ]}
];

// ===== COMPANY VALUES DATA =====
// Company cultural profiles loaded from companies.json at startup.
// Accessed via window.companyDataLoaded (set by init loader, index 8).
// Fallback: inferCompanyValuesFromJD() for companies not in the catalog.

// ===== COMPANY VALUES INFERENCE ENGINE =====
// Scans JD text against VALUES_CATALOG keywords for non-demo jobs
export function inferCompanyValuesFromJD(rawText) {
    if (!rawText || rawText.length < 20) return null;
    var text = rawText.toLowerCase();
    var scored = [];
    
    VALUES_CATALOG.forEach(function(group) {
        group.values.forEach(function(val) {
            var hits = 0;
            val.keywords.forEach(function(kw) {
                var idx = 0;
                while ((idx = text.indexOf(kw, idx)) !== -1) {
                    hits++;
                    idx += kw.length;
                }
            });
            if (hits > 0) {
                scored.push({ name: val.name, score: hits, group: group.group });
            }
        });
    });
    
    scored.sort(function(a, b) { return b.score - a.score; });
    
    // Fallback: if keyword matching found nothing but JD has substance, return generic values
    if (scored.length === 0) {
        if (rawText.length >= 100) {
            return {
                primary: ['Excellence', 'Collaboration', 'Accountability'],
                secondary: ['Continuous Improvement'],
                tensions: [],
                story: '',
                inferred: true
            };
        }
        return null;
    }
    
    return {
        primary: scored.slice(0, 3).map(function(s) { return s.name; }),
        secondary: scored.slice(3, 5).map(function(s) { return s.name; }),
        tensions: [],
        story: '',
        inferred: true
    };
}

// Get company values \u2014 curated first, JD inference fallback
// Known company values — fallback for major companies if not in companies.json
var KNOWN_COMPANY_VALUES = {
    'salesforce': { primary: ['Trust', 'Customer Success', 'Innovation', 'Equality', 'Sustainability'], secondary: ['Ohana', 'Giving Back'], tensions: [], story: 'Salesforce\'s Ohana culture emphasizes family spirit, with five core values guiding all business decisions and a 1-1-1 philanthropic model.' },
    'google': { primary: ['Focus on the User', 'Innovation', 'Speed', 'Openness'], secondary: ['Don\'t Be Evil', 'Data-Driven'], tensions: [], story: '' },
    'alphabet': { primary: ['Focus on the User', 'Innovation', 'Speed', 'Openness'], secondary: ['Data-Driven'], tensions: [], story: '' },
    'microsoft': { primary: ['Innovation', 'Inclusion', 'Corporate Responsibility', 'Trustworthy Computing'], secondary: ['Growth Mindset', 'Customer Obsession'], tensions: [], story: '' },
    'amazon': { primary: ['Customer Obsession', 'Ownership', 'Invent and Simplify', 'Bias for Action'], secondary: ['Earn Trust', 'Deliver Results', 'Frugality'], tensions: ['Work-Life Balance'], story: '' },
    'apple': { primary: ['Innovation', 'Quality', 'Simplicity', 'Privacy'], secondary: ['Accessibility', 'Education', 'Environment'], tensions: [], story: '' },
    'meta': { primary: ['Move Fast', 'Focus on Impact', 'Build Awesome Things', 'Be Open'], secondary: ['Live in the Future'], tensions: ['Privacy'], story: '' },
    'netflix': { primary: ['Freedom and Responsibility', 'Innovation', 'Inclusion', 'Courage'], secondary: ['Impact', 'Curiosity'], tensions: [], story: '' },
    'anthropic': { primary: ['Safety', 'Responsibility', 'Research Excellence', 'Honesty'], secondary: ['Collaboration', 'Impact'], tensions: [], story: '' }
};

// ── Intelligent Company Values Resolver ──
// 1. Check companyDataLoaded (58-company JSON DB)
// 2. Check KNOWN_COMPANY_VALUES (hardcoded fallback for major companies)
// 3. If not found → Claude API call → cache result in companyDataLoaded
// 4. Save newly discovered companies to Firestore for persistence
var _companyValuesCache = {}; // session cache for API-resolved companies
var _companyValuesInFlight = {}; // prevent duplicate API calls

async function ensureCompanyValues(companyName) {
    if (!companyName) return null;
    var searchName = companyName.trim();
    var searchLower = searchName.toLowerCase();
    
    // Step 1: Check existing companyDataLoaded (JSON DB)
    var existing = getCompanyValues(searchName, '');
    if (existing && !existing.inferred && existing.primary && existing.primary.length > 0) {
        console.log('[VALUES] DB hit: ' + searchName + ' → ' + existing.primary.join(', '));
        return existing;
    }
    
    // Step 2: Check session cache (already resolved via API this session)
    if (_companyValuesCache[searchLower]) {
        console.log('[VALUES] Cache hit: ' + searchName);
        return _companyValuesCache[searchLower];
    }
    
    // Step 3: Deduplicate in-flight requests
    if (_companyValuesInFlight[searchLower]) {
        console.log('[VALUES] Waiting for in-flight request: ' + searchName);
        return _companyValuesInFlight[searchLower];
    }
    
    // Step 4: Call Claude API to discover company values
    console.log('[VALUES] API lookup: ' + searchName + ' (not in DB or known list)');
    var promise = _fetchCompanyValuesFromAI(searchName);
    _companyValuesInFlight[searchLower] = promise;
    
    try {
        var result = await promise;
        delete _companyValuesInFlight[searchLower];
        
        if (result && result.primary && result.primary.length > 0) {
            // Cache in session
            _companyValuesCache[searchLower] = result;
            
            // Merge into companyDataLoaded so getCompanyValues() finds it next time
            if (!window.companyDataLoaded) window.companyDataLoaded = {};
            window.companyDataLoaded[searchName] = { values: result, industry: result._industry || '', source: 'ai-discovered' };
            
            // Persist to Firestore if available
            _persistCompanyValues(searchName, result);
            
            console.log('[VALUES] API resolved: ' + searchName + ' → ' + result.primary.join(', '));
            return result;
        }
    } catch (err) {
        delete _companyValuesInFlight[searchLower];
        console.warn('[VALUES] API lookup failed for ' + searchName + ':', err.message);
    }
    
    // Step 5: Final fallback — infer from JD text
    return null;
}

async function _fetchCompanyValuesFromAI(companyName) {
    var prompt = 'You are a company culture research specialist. Provide the core values and culture information for this company.\n\n'
        + 'Company: ' + companyName + '\n\n'
        + 'Return ONLY a JSON object (no markdown, no backticks, just raw JSON) with these fields:\n'
        + '{\n'
        + '  "primary": ["value1", "value2", "value3", "value4", "value5"],\n'
        + '  "secondary": ["value6", "value7"],\n'
        + '  "tensions": ["any known cultural tensions or challenges"],\n'
        + '  "story": "2-3 sentence description of the company\'s culture and how these values manifest",\n'
        + '  "industry": "Primary industry"\n'
        + '}\n\n'
        + 'Rules:\n'
        + '- primary: The company\'s 3-5 officially stated or widely recognized core values\n'
        + '- secondary: 1-3 additional cultural themes that define the company\n'
        + '- tensions: Any known cultural tensions or areas where values conflict with practice (empty array if none)\n'
        + '- Use the company\'s actual stated values where possible, not generic ones\n'
        + '- If you don\'t know the company, return primary: ["Innovation", "Integrity", "Collaboration", "Excellence", "Customer Focus"] as reasonable defaults and note in story that values are estimated';
    
    var aiRes = await callAnthropicAPI({
        model: BP_AI_MODEL_FAST,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
    }, null, 'company-values-lookup');
    
    var text = aiRes.content[0].text;
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');
    var parsed = JSON.parse(jsonMatch[0]);
    
    var result = {
        primary: parsed.primary || [],
        secondary: parsed.secondary || [],
        tensions: parsed.tensions || [],
        story: parsed.story || '',
        inferred: false,
        _industry: parsed.industry || '',
        _source: 'ai-discovered',
        _discoveredAt: new Date().toISOString()
    };
    
    return result;
}

export function _persistCompanyValues(companyName, values) {
    // Save to localStorage immediately (always works)
    try {
        var localCache = safeParse(safeGet('bpCompanyValuesCache'), {});
        var cacheKey = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        localCache[cacheKey] = {
            name: companyName,
            primary: values.primary || [],
            secondary: values.secondary || [],
            tensions: values.tensions || [],
            story: values.story || '',
            industry: values._industry || '',
            source: 'ai-discovered',
            cachedAt: new Date().toISOString()
        };
        safeSet('bpCompanyValuesCache', JSON.stringify(localCache));
    } catch (e) { /* localStorage full or unavailable */ }
    
    // Save to Firestore under user path (avoids top-level permission issues)
    if (typeof firebase === 'undefined' || !firebase.firestore || !fbUser) return;
    try {
        var db = firebase.firestore();
        var docId = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        // Use user-scoped path: users/{uid}/companyValues/{docId}
        db.collection('users').doc(fbUser.uid).collection('companyValues').doc(docId).set({
            name: companyName,
            values: {
                primary: values.primary || [],
                secondary: values.secondary || [],
                tensions: values.tensions || [],
                story: values.story || ''
            },
            industry: values._industry || '',
            source: 'ai-discovered',
            discoveredAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function() {
            console.log('[VALUES] Persisted to Firestore: ' + companyName);
        }).catch(function(err) {
            console.log('[VALUES] Firestore unavailable, using localStorage cache: ' + companyName);
        });
    } catch (e) {
        console.log('[VALUES] Using localStorage cache for: ' + companyName);
    }
}

export function getCompanyValues(companyName, rawText) {
    var source = window.companyDataLoaded || {};
    if (companyName) {
        var searchName = companyName.trim().toLowerCase();
        // Check companies.json first (exact)
        if (source[companyName]) {
            var cv = source[companyName].values || source[companyName];
            if (cv.primary && cv.primary.length > 0) return { primary: cv.primary, secondary: cv.secondary, tensions: cv.tensions, story: cv.story, inferred: false };
        }
        // Case-insensitive
        var keys = Object.keys(source);
        for (var k = 0; k < keys.length; k++) {
            if (keys[k].toLowerCase() === searchName) {
                var cv2 = source[keys[k]].values || source[keys[k]];
                if (cv2.primary && cv2.primary.length > 0) return { primary: cv2.primary, secondary: cv2.secondary, tensions: cv2.tensions, story: cv2.story, inferred: false };
            }
        }
        // Partial match
        for (var k2 = 0; k2 < keys.length; k2++) {
            if (searchName.indexOf(keys[k2].toLowerCase()) === 0 || keys[k2].toLowerCase().indexOf(searchName) === 0) {
                var cv3 = source[keys[k2]].values || source[keys[k2]];
                if (cv3.primary && cv3.primary.length > 0) return { primary: cv3.primary, secondary: cv3.secondary, tensions: cv3.tensions, story: cv3.story, inferred: false };
            }
        }
        // Known company fallback
        if (KNOWN_COMPANY_VALUES[searchName]) {
            var kv = KNOWN_COMPANY_VALUES[searchName];
            return { primary: kv.primary, secondary: kv.secondary, tensions: kv.tensions || [], story: kv.story || '', inferred: false };
        }
        // Partial known match
        for (var knownKey in KNOWN_COMPANY_VALUES) {
            if (searchName.indexOf(knownKey) !== -1 || knownKey.indexOf(searchName) !== -1) {
                var kv2 = KNOWN_COMPANY_VALUES[knownKey];
                return { primary: kv2.primary, secondary: kv2.secondary, tensions: kv2.tensions || [], story: kv2.story || '', inferred: false };
            }
        }
        // Check localStorage cache (AI-discovered values from previous sessions)
        try {
            var localCache = safeParse(safeGet('bpCompanyValuesCache'), {});
            var cacheKey = searchName.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            if (localCache[cacheKey] && localCache[cacheKey].primary && localCache[cacheKey].primary.length > 0) {
                var cached = localCache[cacheKey];
                return { primary: cached.primary, secondary: cached.secondary || [], tensions: cached.tensions || [], story: cached.story || '', inferred: false, _source: 'cached' };
            }
        } catch (e) { /* localStorage unavailable */ }
    }
    return inferCompanyValuesFromJD(rawText || '');
}

// ===== VALUES ALIGNMENT SCORING =====
export function computeValuesAlignment(userValues, companyValues) {
    if (!companyValues || !userValues || userValues.length === 0) return null;
    
    var userSelected = userValues.filter(function(v) { return v && v.selected; }).map(function(v) { return v.name; });
    if (userSelected.length === 0) return null;
    var companyAll = (companyValues.primary || []).concat(companyValues.secondary || []);
    var companyPrimary = new Set(companyValues.primary || []);
    var companySecondary = new Set(companyValues.secondary || []);
    var companyTensions = new Set(companyValues.tensions || []);
    var userSet = new Set(userSelected);
    var companySet = new Set(companyAll);
    
    var aligned = [];
    var yourPriority = [];
    var theirPriority = [];
    var tensionRisk = [];
    
    userSelected.forEach(function(val) {
        if (companySet.has(val)) {
            aligned.push({ name: val, strength: companyPrimary.has(val) ? 'primary' : 'secondary' });
        } else if (companyTensions.has(val)) {
            tensionRisk.push({ name: val });
        } else {
            yourPriority.push({ name: val });
        }
    });
    
    companyAll.forEach(function(val) {
        if (!userSet.has(val)) {
            theirPriority.push({ name: val, strength: companyPrimary.has(val) ? 'primary' : 'secondary' });
        }
    });
    
    // Score: aligned primary=20, secondary=10, tension=-15
    var maxScore = userSelected.length * 20;
    var rawScore = 0;
    aligned.forEach(function(a) { rawScore += a.strength === 'primary' ? 20 : 10; });
    tensionRisk.forEach(function() { rawScore -= 15; });
    var score = maxScore > 0 ? Math.max(0, Math.min(100, Math.round((rawScore / maxScore) * 100))) : 0;
    
    return {
        score: score,
        aligned: aligned,
        yourPriority: yourPriority,
        theirPriority: theirPriority,
        tensionRisk: tensionRisk,
        companyStory: companyValues.story || '',
        isInferred: companyValues.inferred || false
    };
}

export function saveValues() {
    if (readOnlyGuard()) return;
    try {
        safeSet('wbValues', JSON.stringify(_bd().values));
        safeSet('wbPurpose', _bd().purpose || '');
    } catch (e) { /* quota exceeded or private mode */ }
}

export function loadSavedValues() {
    try {
        var stored = safeGet('wbValues');
        if (stored) return JSON.parse(stored);
    } catch (e) { /* parse error */ }
    return null;
}

export function getEvidenceForValue(valueName) {
    var keywords = getKeywordsForValue(valueName);
    if (!keywords || keywords.length === 0) return [];
    var matches = [];
    var skills = (skillsData && _sd().skills) || [];
    skills.forEach(function(skill) {
        (skill.evidence || []).forEach(function(ev) {
            var text = ((ev.outcome || '') + ' ' + (ev.description || '')).toLowerCase();
            var matched = keywords.some(function(kw) { return text.indexOf(kw) !== -1; });
            if (matched) {
                matches.push({ skill: skill.name, text: ev.outcome || ev.description || '' });
            }
        });
    });
    return matches.slice(0, 3);
}

export function getKeywordsForValue(name) {
    var n = name.toLowerCase();
    for (var g = 0; g < VALUES_CATALOG.length; g++) {
        for (var v = 0; v < VALUES_CATALOG[g].values.length; v++) {
            if (VALUES_CATALOG[g].values[v].name.toLowerCase() === n) {
                return VALUES_CATALOG[g].values[v].keywords;
            }
        }
    }
    // Custom value: split name into keyword stems
    var result = [];
    n.split(/[\s\-]+/).forEach(function(w) {
        if (w.length > 3) result.push(w.substring(0, 6));
    });
    return result;
}

export function scoreValueByEvidence(valueDef) {
    var skills = (skillsData && _sd().skills) || [];
    var score = 0;
    skills.forEach(function(skill) {
        (skill.evidence || []).forEach(function(ev) {
            var text = ((ev.outcome || '') + ' ' + (ev.description || '')).toLowerCase();
            valueDef.keywords.forEach(function(kw) {
                if (text.indexOf(kw) !== -1) score++;
            });
        });
    });
    return score;
}

export function getCatalogDescription(name) {
    var n = name.toLowerCase();
    for (var g = 0; g < VALUES_CATALOG.length; g++) {
        for (var v = 0; v < VALUES_CATALOG[g].values.length; v++) {
            if (VALUES_CATALOG[g].values[v].name.toLowerCase() === n) {
                return VALUES_CATALOG[g].values[v].description || '';
            }
        }
    }
    return '';
}

export function editValueNote(idx) {
    if (readOnlyGuard()) return;
    var value = _bd().values[idx];
    var currentNote = value.note || '';
    var modal = document.getElementById('exportModal');
    var modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">Personal Note: ' + escapeHtml(value.name) + '</h2>'
        + '<p style="color:var(--c-muted); margin-top:5px;">Why does this value matter to you?</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px;">'
        + '<textarea id="valueNoteInput" placeholder="e.g., This shaped how I lead after watching top-down decisions fail repeatedly..." style="'
        + 'width:100%; min-height:100px; padding:14px; background:var(--c-surface-3w); '
        + 'border:1px solid var(--c-accent-border-solid); border-radius:8px; '
        + 'color:var(--c-text-alt); font-size:0.95em; line-height:1.6; font-family:inherit; resize:vertical;'
        + '">' + escapeHtml(currentNote) + '</textarea>'
        + '<div style="margin-top:8px; font-size:0.78em; color:var(--c-faint);">'
        + 'This note appears on your value card and in exported blueprints. Keep it concise.</div>'
        + '<div style="display:flex; gap:12px; justify-content:flex-end; margin-top:18px;">'
        + '<button onclick="closeExportModal()" style="'
        + 'background:transparent; color:var(--c-muted); border:1px solid var(--c-border-strong); '
        + 'padding:10px 20px; border-radius:8px; cursor:pointer; font-size:0.9em;">Cancel</button>'
        + '<button onclick="saveValueNote(' + idx + ')" style="'
        + 'background:var(--c-accent-inv); color:#fff; border:none; '
        + 'padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em;">'
        + bpIcon('save',14) + ' Save Note</button>'
        + '</div></div>';
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
    setTimeout(function() { var el = document.getElementById('valueNoteInput'); if (el) el.focus(); }, 100);
}
if (!window.editValueNote) window.editValueNote = editValueNote;

export function saveValueNote(idx) {
    if (readOnlyGuard()) return;
    var noteEl = document.getElementById('valueNoteInput');
    if (!noteEl) return;
    _bd().values[idx].note = noteEl.value.trim();
    saveUserData();
    saveValues();
    closeExportModal();
    var contentEl = document.getElementById('blueprintTabContent');
    if (contentEl) contentEl.innerHTML = renderBlueprintTabContent();
}
if (!window.saveValueNote) window.saveValueNote = saveValueNote;

export function inferValues() {
    // STEP 1: Check localStorage for saved edits
    var saved = loadSavedValues();
    if (saved && saved.length > 0) {
        _bd().values = saved;
    } else {
        // STEP 2: Use profile values if they exist
        var profileValues = window._userData.values || [];
        if (profileValues.length > 0) {
            _bd().values = profileValues.map(function(v) {
                return {
                    name: v.name,
                    selected: v.selected !== undefined ? v.selected : true,
                    inferred: v.inferred || false,
                    custom: false
                };
            });
        } else {
            // STEP 3: Auto-select top 5 by evidence score
            var scored = [];
            VALUES_CATALOG.forEach(function(group) {
                group.values.forEach(function(val) {
                    scored.push({ name: val.name, score: scoreValueByEvidence(val) });
                });
            });
            scored.sort(function(a, b) { return b.score - a.score; });
            var topNames = scored.slice(0, 5).filter(function(s) { return s.score > 0; }).map(function(s) { return s.name; });
            
            // If no evidence at all, select sensible defaults
            if (topNames.length === 0) {
                topNames = ['Intellectual Honesty', 'Accountability', 'Excellence', 'Collaboration', 'Integrity'];
            }
            
            _bd().values = topNames.map(function(n) {
                return { name: n, selected: true, inferred: true, custom: false };
            });
        }
    }
    
    // Purpose
    var savedPurpose = null;
    try { savedPurpose = safeGet('wbPurpose'); } catch(e) {}
    if (savedPurpose !== null && savedPurpose.trim().length > 0) {
        _bd().purpose = savedPurpose;
    } else if (window._userData.purpose && window._userData.purpose.trim().length > 0) {
        _bd().purpose = window._userData.purpose;
    } else {
        _bd().purpose = "";
    }
    
    // Enforce max 7 values
    if (_bd().values.length > 7) {
        _bd().values = _bd().values.slice(0, 7);
    }
}

var showingValuesPicker = false;

let blueprintTab = 'dashboard';

export function renderBlueprint() {
    const view = document.getElementById('blueprintView');
    const outcomesCount = _bd().outcomes.length;
    const valuesCount = _bd().values.filter(v => v.selected).length;
    const skillCount = (_sd().skills || []).length;
    
    view.innerHTML = `
        <div class="blueprint-container">
            
            <div class="blueprint-subnav" id="blueprintSubnav">
                <button class="bp-tab ${blueprintTab === 'dashboard' ? 'active' : ''}" onclick="switchBlueprintTab('dashboard')">
                    <span class="bp-tab-icon">${bpIcon('blueprint',16)}</span>
                    <span class="bp-tab-label">Dashboard</span>
                </button>
                <button class="bp-tab ${blueprintTab === 'experience' ? 'active' : ''}" onclick="switchBlueprintTab('experience')">
                    <span class="bp-tab-icon">${bpIcon('experience',16)}</span>
                    <span class="bp-tab-label">Experience</span>
                </button>
                <button class="bp-tab ${blueprintTab === 'skills' ? 'active' : ''}" onclick="switchBlueprintTab('skills')">
                    <span class="bp-tab-icon">${bpIcon('skills',16)}</span>
                    <span class="bp-tab-label">Skills</span>
                    <span class="bp-tab-count">${skillCount}</span>
                </button>
                <button class="bp-tab ${blueprintTab === 'outcomes' ? 'active' : ''}" onclick="switchBlueprintTab('outcomes')">
                    <span class="bp-tab-icon">${bpIcon('outcomes',16)}</span>
                    <span class="bp-tab-label">Outcomes</span>
                    <span class="bp-tab-count">${outcomesCount}</span>
                </button>
                <button class="bp-tab ${blueprintTab === 'verifications' ? 'active' : ''}" onclick="switchBlueprintTab('verifications')">
                    <span class="bp-tab-icon">${bpIcon('shield',16)}</span>
                    <span class="bp-tab-label">Verify</span>
                    <span class="bp-tab-count">${(window._userData.verifications || []).filter(v => v.status === 'confirmed').length}</span>
                </button>
                <button class="bp-tab ${blueprintTab === 'values' ? 'active' : ''}" onclick="switchBlueprintTab('values')">
                    <span class="bp-tab-icon">${bpIcon('values',16)}</span>
                    <span class="bp-tab-label">Values</span>
                    <span class="bp-tab-count">${valuesCount}</span>
                </button>
                <button class="bp-tab ${blueprintTab === 'content' ? 'active' : ''}" onclick="switchBlueprintTab('content')">
                    <span class="bp-tab-icon">${bpIcon('clipboard',16)}</span>
                    <span class="bp-tab-label">Content</span>
                    <span class="bp-tab-count">${_countContentItems()}</span>
                </button>
                <button class="bp-tab ${blueprintTab === 'export' ? 'active' : ''}" onclick="switchBlueprintTab('export')">
                    <span class="bp-tab-icon">${bpIcon('export',16)}</span>
                    <span class="bp-tab-label">Export</span>
                </button>
            </div>
            
            <div id="blueprintTabContent" style="margin-top:16px;">
                ${renderBlueprintTabContent()}
            </div>
        </div>
    `;
}

export function switchBlueprintTab(tab) {
    blueprintTab = tab;
    document.querySelectorAll('.bp-tab').forEach(function(btn) {
        var onclickStr = btn.getAttribute('onclick') || '';
        btn.classList.toggle('active', onclickStr.indexOf("'" + tab + "'") !== -1);
    });
    var contentEl = document.getElementById('blueprintTabContent');
    if (contentEl) {
        try {
            contentEl.innerHTML = renderBlueprintTabContent();
        } catch(e) {
            console.error('Blueprint tab render error (' + tab + '):', e);
            showToast('Blueprint view failed to render.', 'error');
            contentEl.innerHTML = '<div style="padding:40px; text-align:center; color:#ef4444;">'
                + '<div style="font-size:1.2em; margin-bottom:8px;">' + bpIcon('warning',18) + ' Rendering Error</div>'
                + '<div style="font-size:0.85em; color:var(--c-muted);">' + (e.message || e) + '</div></div>';
        }
    }
}
if (!window.switchBlueprintTab) window.switchBlueprintTab = switchBlueprintTab;

export function renderBlueprintTabContent() {
    if (blueprintTab === 'dashboard') return renderDashboardTab();
    if (blueprintTab === 'skills')    return renderSkillsManagementTab();
    if (blueprintTab === 'experience') return renderExperienceTab();
    if (blueprintTab === 'outcomes') return renderOutcomesSection();
    if (blueprintTab === 'values')   return renderValuesSection();
    if (blueprintTab === 'purpose')  return renderDashboardTab(); // redirect legacy
    if (blueprintTab === 'export')   return renderExportSection();
    if (blueprintTab === 'verifications') return renderVerificationsTab();
    if (blueprintTab === 'content') return renderContentEvidenceTab();
    return renderDashboardTab();
}

export function renderDashboardTab() {
    var skills = _sd().skills || [];
    var roles = _sd().roles || [];
    var visRoles = typeof getVisibleRoles === 'function' ? getVisibleRoles() : roles;
    
    // Empty state for signed-in users with no profile data
    if (skills.length === 0 && roles.length === 0 && fbUser && !window.isReadOnlyProfile) {
        return '<div style="text-align:center; padding:80px 30px;">'
            + '<div style="font-size:3.5em; margin-bottom:20px; opacity:0.25;">🎯</div>'
            + '<div style="font-family:Outfit,sans-serif; font-size:1.6em; font-weight:700; color:var(--text-primary); margin-bottom:12px; letter-spacing:0.04em;">Build Your Blueprint</div>'
            + '<div style="font-size:1em; color:var(--text-muted); max-width:480px; margin:0 auto 32px; line-height:1.7;">'
            + 'Your career intelligence profile is empty. Map your skills, define your roles, and track your outcomes to unlock salary estimates, job matching, and scouting reports.'
            + '</div>'
            + '<div style="display:flex; gap:16px; flex-wrap:wrap; justify-content:center; margin-bottom:40px;">'
            + '<button onclick="showOnboardingWizard();" '
            + 'style="padding:14px 28px; background:var(--accent); color:#fff; border:none; border-radius:10px; cursor:pointer; font-weight:700; font-size:1em;">'
            + '\u26A1 Start Building</button>'
            + '</div>'
            + '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px; max-width:600px; margin:0 auto; text-align:left;">'
            + '<div style="padding:16px; background:var(--c-surface-2); border:1px solid var(--c-surface-5); border-radius:10px;">'
            + '<div style="font-weight:700; color:var(--text-primary); margin-bottom:4px;">1. Add Skills</div>'
            + '<div style="font-size:0.82em; color:var(--text-muted);">Map your professional capabilities and expertise levels</div></div>'
            + '<div style="padding:16px; background:var(--c-surface-2); border:1px solid var(--c-surface-5); border-radius:10px;">'
            + '<div style="font-weight:700; color:var(--text-primary); margin-bottom:4px;">2. Define Roles</div>'
            + '<div style="font-size:0.82em; color:var(--text-muted);">Group skills into the roles you perform professionally</div></div>'
            + '<div style="padding:16px; background:var(--c-surface-2); border:1px solid var(--c-surface-5); border-radius:10px;">'
            + '<div style="font-weight:700; color:var(--text-primary); margin-bottom:4px;">3. Track Outcomes</div>'
            + '<div style="font-size:0.82em; color:var(--text-muted);">Document achievements and measurable impact</div></div>'
            + '</div>'
            + '</div>';
    }
    
    var outcomes = _bd().outcomes || [];
    var sharedOutcomes = outcomes.filter(function(o) { return o.shared; }).length;
    var values = (_bd().values || []).filter(function(v) { return v.selected; });
    var purpose = _bd().purpose || '';
    var totalValue = getEffectiveComp();
    var hasValuation = totalValue && totalValue.total > 0;
    var hasCuratedComp = totalValue.compSource === 'curated' || totalValue.compSource === 'reported';
    // Calculate both modes for dual cards
    var evidenceValue = hasValuation ? calculateTotalMarketValue('evidence') : null;
    var potentialValue = hasValuation ? calculateTotalMarketValue('potential') : null;
    
    var masteryCount = skills.filter(function(s) { return s.level === 'Mastery'; }).length;
    var advancedCount = skills.filter(function(s) { return s.level === 'Advanced'; }).length;
    var expertLevelCount = skills.filter(function(s) { return s.level === 'Expert'; }).length;
    var savedJobs = (window._userData.savedJobs || []).filter(function(j) { return j && j.title; });
    var topMatch = savedJobs.length > 0 ? savedJobs.reduce(function(best, j) { return (j.matchData && j.matchData.score || 0) > (best.matchData && best.matchData.score || 0) ? j : best; }, savedJobs[0]) : null;
    var topMatchScore = topMatch && topMatch.matchData ? topMatch.matchData.score : 0;
    
    // Calculate readiness score early (used in multiple places)
    var completeness = [];
    if (skills.length > 0) completeness.push({ label: 'Skills mapped', done: true, action: "switchView('skills')" });
    else completeness.push({ label: 'Map your skills', done: false, action: "switchView('skills')" });
    if (outcomes.length > 0) completeness.push({ label: 'Outcomes documented', done: true, action: "switchBlueprintTab('outcomes')" });
    else completeness.push({ label: 'Add outcomes', done: false, action: "switchBlueprintTab('outcomes')" });
    if (values.length >= 3) completeness.push({ label: 'Values selected', done: true, action: "switchBlueprintTab('values')" });
    else completeness.push({ label: 'Select values (3\u20137)', done: false, action: "switchBlueprintTab('values')" });
    if (purpose && purpose.length > 10) completeness.push({ label: 'Purpose defined', done: true, action: '' });
    else completeness.push({ label: 'Write purpose statement', done: false, action: '' });
    if (savedJobs.length > 0) completeness.push({ label: 'Jobs tracked', done: true, action: "switchView('jobs')" });
    else completeness.push({ label: 'Add target jobs', done: false, action: "switchView('jobs')" });
    var workHistory = window._userData.workHistory || [];
    if (workHistory.length > 0) completeness.push({ label: 'Work history added', done: true, action: "switchBlueprintTab('experience')" });
    else completeness.push({ label: 'Add work history', done: false, action: "switchBlueprintTab('experience')" });
    var education = window._userData.education || [];
    if (education.length > 0) completeness.push({ label: 'Education added', done: true, action: "switchBlueprintTab('experience')" });
    else completeness.push({ label: 'Add education', done: false, action: "switchBlueprintTab('experience')" });
    var doneCount = completeness.filter(function(c) { return c.done; }).length;
    var readinessPct = Math.round((doneCount / completeness.length) * 100);
    
    var html = '';
    
    // ── LINKEDIN UPDATE CTA (signed-in users with profile data) ──
    if (fbUser && !window.isReadOnlyProfile && skills.length > 0) {
        var lastMerge = (window._userData.importStats || {}).lastMerge;
        var mergeStr = lastMerge ? 'Last updated ' + new Date(lastMerge).toLocaleDateString() : 'Keep your Blueprint current';
        html += '<div style="padding:12px 16px; margin-bottom:14px; background:linear-gradient(135deg, rgba(10,102,194,0.06), rgba(10,102,194,0.02)); '
            + 'border:1px solid rgba(10,102,194,0.18); border-radius:10px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">'
            + '<div style="display:flex; align-items:center; gap:10px;">'
            + '<svg width="18" height="18" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
            + '<div>'
            + '<div style="font-weight:600; color:var(--text-primary); font-size:0.85em;">Update from LinkedIn</div>'
            + '<div style="font-size:0.72em; color:var(--c-muted);">' + mergeStr + '</div>'
            + '</div></div>'
            + '<label style="padding:6px 14px; background:#0a66c2; color:#fff; border-radius:7px; cursor:pointer; font-weight:600; font-size:0.78em; display:inline-flex; align-items:center; gap:5px;">'
            + bpIcon('network', 12) + ' Upload .zip'
            + '<input type="file" accept=".zip" onchange="handleLinkedInMerge(this)" style="display:none;">'
            + '</label></div>';
    }
    
    // ── CURATED/REPORTED COMP BANNER (prominent, above stat cards) ──
    if (hasCuratedComp) {
        var dispFormatted = formatCompValue(totalValue.displayComp);
        var algoFormatted = formatCompValue(totalValue.algorithmEstimate);
        var delta = totalValue.displayComp - totalValue.algorithmEstimate;
        var deltaPct = totalValue.algorithmEstimate > 0 ? Math.round((delta / totalValue.algorithmEstimate) * 100) : 0;
        var deltaColor = delta >= 0 ? '#10b981' : '#f59e0b';
        var deltaSign = delta >= 0 ? '+' : '';
        
        html += '<div style="background:linear-gradient(135deg, rgba(16,185,129,0.12), rgba(96,165,250,0.08)); border:2px solid rgba(16,185,129,0.3); border-radius:14px; padding:22px 24px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">'
            + '<div>'
            + '<div style="font-size:0.78em; color:var(--c-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">'
            + bpIcon('money',12) + ' ' + totalValue.compLabel + '</div>'
            + '<div style="font-size:2.4em; font-weight:800; color:#10b981; line-height:1;">' + dispFormatted + '</div>'
            + '<div style="font-size:0.78em; color:var(--c-faint); margin-top:6px;">/year</div>'
            + '</div>'
            + '<div style="text-align:right;">';
        if (totalValue.algorithmEstimate > 0 && totalValue.displayComp < 50000000 && Math.abs(deltaPct) <= 200) {
            html += '<div style="font-size:0.72em; color:var(--c-muted);">vs. BLS Benchmark</div>'
                + '<div style="font-size:1.4em; font-weight:700; color:' + deltaColor + ';">' + deltaSign + deltaPct + '%</div>'
                + '<div style="font-size:0.72em; color:var(--c-faint);">' + algoFormatted + '/yr</div>';
        } else if (totalValue.algorithmEstimate > 0) {
            html += '<div style="font-size:0.72em; color:var(--c-muted);">BLS Benchmark</div>'
                + '<div style="font-size:1.1em; font-weight:600; color:var(--c-faint);">' + algoFormatted + '/yr</div>';
        }
        html += '</div></div>';
    }
    
    // ── STAT CARDS ROW ──
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-bottom:20px;">';
    
    // Evidence-Based Value card (BLS algorithm)
    if (hasValuation && evidenceValue) {
        var evActive = valuationMode === 'evidence';
        var evLabel = hasCuratedComp ? 'BLS Evidence' : 'Evidence-Based';
        
        html += '<div style="background:' + (evActive ? 'var(--c-green-bg-2a)' : 'var(--c-surface-2)') + '; border:' + (evActive ? '2px' : '1px') + ' solid ' + (evActive ? 'var(--c-green-border-3)' : 'var(--c-surface-5)') + '; border-radius:12px; padding:18px; cursor:pointer;" onclick="setValuationMode(\'evidence\'); switchBlueprintTab(\'dashboard\');">'
            + '<div style="display:flex; align-items:center; gap:5px; font-size:0.78em; color:var(--c-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">'
            + bpIcon('lock',11) + ' ' + evLabel + '</div>'
            + '<div style="font-size:1.8em; font-weight:800; color:#10b981;">$' + evidenceValue.yourWorth.toLocaleString() + '</div>'
            + '<div style="font-size:0.75em; color:var(--c-faint); margin-top:4px;">' + evidenceValue.compaRatio + '% of median</div>'
            + '</div>';
    }
    
    // Potential Value card — always show when data exists
    if (hasValuation && potentialValue) {
        var potActive = valuationMode === 'potential';
        var potLabel = hasCuratedComp ? 'BLS Potential' : 'Potential';
        html += '<div style="background:' + (potActive ? 'var(--c-orange-bg-1)' : 'var(--c-surface-2)') + '; border:' + (potActive ? '2px' : '1px') + ' solid ' + (potActive ? 'var(--c-orange-border)' : 'var(--c-surface-5)') + '; border-radius:12px; padding:18px; cursor:pointer;" onclick="setValuationMode(\'potential\'); switchBlueprintTab(\'dashboard\');">'
            + '<div style="display:flex; align-items:center; gap:5px; font-size:0.78em; color:var(--c-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">'
            + bpIcon('star',11) + ' ' + potLabel + '</div>'
            + '<div style="font-size:1.8em; font-weight:800; color:#f59e0b;">$' + potentialValue.yourWorth.toLocaleString() + '</div>'
            + '<div style="font-size:0.75em; color:var(--c-faint); margin-top:4px;">' + potentialValue.compaRatio + '% of median</div>'
            + '</div>';
    }
    
    // Skills card
    html += '<div style="background:var(--c-surface-2); border:1px solid var(--c-surface-5); border-radius:12px; padding:18px; cursor:pointer;" onclick="switchView(\'skills\')">'
        + '<div style="font-size:0.78em; color:var(--c-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Skills</div>'
        + '<div style="font-size:1.8em; font-weight:800; color:#60a5fa;">' + skills.length + '</div>'
        + '<div style="font-size:0.75em; color:var(--c-faint); margin-top:4px;">' + visRoles.length + ' domains \u00B7 ' + (masteryCount + expertLevelCount) + ' expert+</div>'
        + '</div>';
    
    // Outcomes card
    html += '<div style="background:var(--c-surface-2); border:1px solid var(--c-surface-5); border-radius:12px; padding:18px; cursor:pointer;" onclick="switchBlueprintTab(\'outcomes\')">'
        + '<div style="font-size:0.78em; color:var(--c-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Outcomes</div>'
        + '<div style="font-size:1.8em; font-weight:800; color:#f59e0b;">' + outcomes.length + '</div>'
        + '<div style="font-size:0.75em; color:var(--c-faint); margin-top:4px;">' + sharedOutcomes + ' shared \u00B7 ' + (outcomes.length - sharedOutcomes) + ' private</div>'
        + '</div>';
    
    // Values card
    html += '<div style="background:var(--c-surface-2); border:1px solid var(--c-surface-5); border-radius:12px; padding:18px; cursor:pointer;" onclick="switchBlueprintTab(\'values\')">'
        + '<div style="font-size:0.78em; color:var(--c-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Values</div>'
        + '<div style="font-size:1.8em; font-weight:800; color:#818cf8;">' + values.length + '</div>'
        + '<div style="font-size:0.75em; color:var(--c-faint); margin-top:4px;">' + (values.length >= 3 ? '\u2713 Selected' : 'Pick 3\u20137') + '</div>'
        + '</div>';
    
    html += '</div>'; // end stats grid

    // ── MARKET POSITION ──
    if (hasValuation || hasCuratedComp) {
        var displayCompFormatted = formatCompValue(totalValue.displayComp);
        
        html += '<div style="border:1px solid var(--c-green-border-1); border-radius:12px; overflow:hidden; margin-bottom:20px;">'
            
            // Header — always shows the effective comp
            + '<div style="padding:18px 20px; background:var(--c-gradient-success); display:flex; justify-content:space-between; align-items:center;">'
            + '<div style="display:flex; align-items:center; gap:14px;">'
            + '<span style="color:#10b981;">' + bpIcon('money',20) + '</span>'
            + '<div>'
            + '<div style="font-weight:700; color:var(--c-text);">' + totalValue.compLabel + '</div>';
        
        if (hasCuratedComp && totalValue.algorithmEstimate > 0) {
            // Show algorithm benchmark below for context
            var fnLabelHeader = BLS_FUNCTION_LABELS[totalValue.detectedFunction] || totalValue.detectedFunction;
            html += '<div style="font-size:0.82em; color:var(--c-muted);">BLS Benchmark: ' + formatCompValue(totalValue.algorithmEstimate) + '/yr (' + escapeHtml(fnLabelHeader) + ')</div>';
        } else {
            html += '<div style="font-size:0.82em; color:var(--c-muted);">Offers: $' + totalValue.conservativeOffer.toLocaleString() + ' \u2013 $' + totalValue.competitiveOffer.toLocaleString() + '</div>';
        }
        
        html += '</div></div>'
            + '<div style="text-align:right;">'
            + '<div style="font-weight:800; color:#10b981; font-size:1.4em;">' + displayCompFormatted + '</div>'
            + '<div style="font-size:0.68em; color:var(--c-muted); text-transform:uppercase;">/year</div>'
            + '</div></div>';
        
        if (hasCuratedComp) {
            // Curated/reported: simplified display — skip algorithm breakdown
            var delta = totalValue.displayComp - totalValue.algorithmEstimate;
            var deltaPct = totalValue.algorithmEstimate > 0 ? Math.round((delta / totalValue.algorithmEstimate) * 100) : 0;
            var deltaColor = delta >= 0 ? '#10b981' : '#f59e0b';
            var deltaSign = delta >= 0 ? '+' : '';
            
            html += '<div style="padding:20px;">';
            
            // Comparison bar
            if (totalValue.algorithmEstimate > 0 && totalValue.displayComp < 50000000 && Math.abs(deltaPct) <= 200) {
                html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">'
                    + '<div style="text-align:center; padding:14px; background:var(--c-surface-1); border-radius:8px;">'
                    + '<div style="font-size:0.72em; color:var(--c-muted);">' + totalValue.compLabel + '</div>'
                    + '<div style="font-weight:700; color:#10b981; font-size:1.1em;">' + displayCompFormatted + '</div></div>'
                    + '<div style="text-align:center; padding:14px; background:var(--c-surface-1); border-radius:8px;">'
                    + '<div style="font-size:0.72em; color:var(--c-muted);">vs. BLS Benchmark</div>'
                    + '<div style="font-weight:700; color:' + deltaColor + '; font-size:1.1em;">' + deltaSign + deltaPct + '%</div></div>'
                    + '</div>';
            }
            
            // Top skills still valuable context
            var fnLabel = BLS_FUNCTION_LABELS[totalValue.detectedFunction] || totalValue.detectedFunction;
            var isOverride = (window._userData.preferences || {}).blsFunctionOverride ? true : false;
            html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--c-surface-1); border-radius:6px; margin-bottom:14px; font-size:0.8em;">'
                + '<div style="color:var(--c-muted);">'
                + bpIcon('target',12) + ' BLS Category: <span style="color:var(--c-text); font-weight:600;">' + escapeHtml(fnLabel) + '</span>'
                + ' \u00B7 ' + escapeHtml(totalValue.roleLevel)
                + (isOverride ? ' <span style="color:#fbbf24; font-size:0.85em;">(manual)</span>' : '')
                + '</div>'
                + '<a href="#" onclick="showBlsCategoryEditor(); return false;" style="color:var(--accent); text-decoration:none; font-weight:600;">Change</a>'
                + '</div>';
            
            html += '<div style="font-size:0.82em; font-weight:600; color:#60a5fa; margin-bottom:8px;">' + bpIcon('flame',12) + ' Top Skills Driving Value</div>'
                + '<div style="display:grid; gap:4px; margin-bottom:14px;">';
            (totalValue.top10Skills || []).slice(0, 5).forEach(function(skill, idx) {
                var isCritical = skill.impact === 'Critical';
                html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:' + (isCritical ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)') + '; border-radius:5px; font-size:0.85em;">'
                    + '<span style="color:var(--c-text);"><span style="color:var(--c-faint);">' + (idx + 1) + '.</span> ' + skill.skill + ' <span style="color:var(--c-faint); font-size:0.85em;">(' + skill.level + ')</span></span>'
                    + '<span style="color:' + (isCritical ? '#ef4444' : '#fbbf24') + '; font-size:0.78em; font-weight:600;">' + skill.impactLabel + '</span>'
                    + '</div>';
            });
            html += '</div>';
            
            html += '<div style="margin-top:14px; border-top:1px solid rgba(251,191,36,0.12); padding-top:14px;">'
                + '<div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">'
                + '<span style="color:#fbbf24;">' + bpIcon('dollar',16) + '</span>'
                + '<span style="font-weight:700; color:#fbbf24; font-size:0.92em;">Negotiation Guide</span></div>'
                + renderInlineNegotiation(totalValue)
                + '</div>';
            
            html += '</div></div>'; // close detail + container
            
        } else {
            // Algorithm-only: full breakdown
            var negotiationGap = totalValue.yourWorth - totalValue.standardOffer;
        
        // Offer ranges
        html += '<div style="display:grid; gap:10px; margin-bottom:16px;">';
        var offerData = [
            { label: 'Conservative (75%)', value: totalValue.conservativeOffer, desc: 'Budget-constrained', color: '#9ca3af', bg: 'var(--c-gray-tint)' },
            { label: 'Standard (85%)', value: totalValue.standardOffer, desc: 'Most common', color: '#60a5fa', bg: 'var(--c-accent-bg-6a)' },
            { label: 'Competitive (95%)', value: totalValue.competitiveOffer, desc: 'Top employers', color: '#10b981', bg: 'var(--c-green-bg-5c)' }
        ];
        offerData.forEach(function(o) {
            html += '<div style="background:' + o.bg + '; padding:12px 16px; border-radius:8px; border-left:3px solid ' + o.color + '; display:flex; justify-content:space-between; align-items:center;">'
                + '<div><div style="color:' + o.color + '; font-weight:600; font-size:0.88em;">' + o.label + '</div>'
                + '<div style="color:var(--c-muted); font-size:0.78em;">' + o.desc + '</div></div>'
                + '<div style="font-weight:700; font-size:1.15em; color:var(--c-text);">$' + o.value.toLocaleString() + '</div>'
                + '</div>';
        });
        html += '</div>';
        
        // Static mode indicator
        var modeLabel = valuationMode === 'potential' ? 'Potential Value' : 'Evidence-Based Value';
        var modeColor = valuationMode === 'potential' ? '#f59e0b' : '#10b981';
        var modeIcon = valuationMode === 'potential' ? bpIcon('star',12) : bpIcon('lock',12);
        html += '<div style="display:flex; align-items:center; gap:6px; margin-bottom:14px; padding:8px 12px; background:var(--c-surface-1); border-radius:8px; border-left:3px solid ' + modeColor + ';">'
            + '<span style="color:' + modeColor + ';">' + modeIcon + '</span>'
            + '<span style="font-size:0.82em; font-weight:600; color:' + modeColor + ';">Showing: ' + modeLabel + '</span>'
            + '<span style="font-size:0.72em; color:var(--c-faint); margin-left:auto;">Switch using cards above</span>'
            + '</div>';
        
        // Compact stats row
        html += '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:14px;">'
            + '<div style="text-align:center; padding:10px; background:var(--c-surface-1); border-radius:8px;">'
            + '<div style="font-size:0.72em; color:var(--c-muted);">Market Rate</div>'
            + '<div style="font-weight:700; color:#60a5fa;">$' + totalValue.marketRate.toLocaleString() + '</div></div>'
            + '<div style="text-align:center; padding:10px; background:var(--c-surface-1); border-radius:8px;">'
            + '<div style="font-size:0.72em; color:var(--c-muted);">Premium</div>'
            + '<div style="font-weight:700; color:#10b981;">+$' + totalValue.premiumAmount.toLocaleString() + '</div></div>'
            + '<div style="text-align:center; padding:10px; background:var(--c-surface-1); border-radius:8px;">'
            + '<div style="font-size:0.72em; color:var(--c-muted);">Compa-Ratio</div>'
            + '<div style="font-weight:700; color:var(--c-text);">' + totalValue.compaRatio + '%</div></div>'
            + '</div>';
        
        // Top skills (compact)
        var fnLabel2 = BLS_FUNCTION_LABELS[totalValue.detectedFunction] || totalValue.detectedFunction;
        var isOverride2 = (window._userData.preferences || {}).blsFunctionOverride ? true : false;
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--c-surface-1); border-radius:6px; margin-bottom:14px; font-size:0.8em;">'
            + '<div style="color:var(--c-muted);">'
            + bpIcon('target',12) + ' BLS Category: <span style="color:var(--c-text); font-weight:600;">' + escapeHtml(fnLabel2) + '</span>'
            + ' \u00B7 ' + escapeHtml(totalValue.roleLevel)
            + (isOverride2 ? ' <span style="color:#fbbf24; font-size:0.85em;">(manual)</span>' : '')
            + '</div>'
            + '<a href="#" onclick="showBlsCategoryEditor(); return false;" style="color:var(--accent); text-decoration:none; font-weight:600;">Change</a>'
            + '</div>';
        
        html += '<div style="font-size:0.82em; font-weight:600; color:#60a5fa; margin-bottom:8px;">' + bpIcon('flame',12) + ' Top Skills Driving Value</div>'
            + '<div style="display:grid; gap:4px; margin-bottom:14px;">';
        (totalValue.top10Skills || []).slice(0, 5).forEach(function(skill, idx) {
            var isCritical = skill.impact === 'Critical';
            html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 10px; background:' + (isCritical ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)') + '; border-radius:5px; font-size:0.85em;">'
                + '<span style="color:var(--c-text);"><span style="color:var(--c-faint);">' + (idx + 1) + '.</span> ' + skill.skill + ' <span style="color:var(--c-faint); font-size:0.85em;">(' + skill.level + ')</span></span>'
                + '<span style="color:' + (isCritical ? '#ef4444' : '#fbbf24') + '; font-size:0.78em; font-weight:600;">' + skill.impactLabel + '</span>'
                + '</div>';
        });
        html += '</div>';
        
        // View all + methodology link
        html += '<div style="display:flex; gap:8px; margin-bottom:10px;">'
            + '<button onclick="showValuationBreakdown()" style="flex:1; padding:8px 14px; background:transparent; border:1px solid var(--c-border-subtle); border-radius:6px; color:var(--c-label); cursor:pointer; font-size:0.82em;">'
            + bpIcon('bar-chart',12) + ' View All ' + skills.length + ' Skills</button>'
            + '</div>';
        
        // Inline Negotiation Guide (always visible)
        html += '<div style="margin-top:14px; border-top:1px solid rgba(251,191,36,0.12); padding-top:14px;">'
            + '<div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">'
            + '<span style="color:#fbbf24;">' + bpIcon('dollar',16) + '</span>'
            + '<span style="font-weight:700; color:#fbbf24; font-size:0.92em;">Negotiation Guide</span></div>'
            + renderInlineNegotiation(totalValue)
            + '</div>';
        
        html += '</div></div>'; // close detail + container
        } // end algorithm-only else block
    }
    

    // ── CAREER READINESS SCORE ──
    (function() {
        var ringSize = 64;
        var strokeWidth = 5;
        var radius = (ringSize - strokeWidth) / 2;
        var circumference = 2 * Math.PI * radius;
        var offset = circumference - (readinessPct / 100) * circumference;
        var ringColor = readinessPct >= 100 ? '#10b981' : readinessPct >= 60 ? '#3b82f6' : '#f59e0b';
        var readinessLabel = readinessPct >= 100 ? 'Profile Complete' : readinessPct >= 80 ? 'Almost There' : readinessPct >= 60 ? 'Good Progress' : 'Getting Started';
        
        if (readinessPct < 100) {
            html += '<div style="background:var(--c-surface-1); border:1px solid var(--c-surface-5); border-radius:12px; padding:16px 18px; margin-bottom:16px; display:flex; align-items:center; gap:18px;">';
            
            // SVG score ring
            html += '<div style="flex-shrink:0;">'
                + '<svg width="' + ringSize + '" height="' + ringSize + '" viewBox="0 0 ' + ringSize + ' ' + ringSize + '" style="transform:rotate(-90deg);">'
                + '<circle cx="' + (ringSize/2) + '" cy="' + (ringSize/2) + '" r="' + radius + '" fill="none" stroke="var(--c-surface-4)" stroke-width="' + strokeWidth + '"/>'
                + '<circle cx="' + (ringSize/2) + '" cy="' + (ringSize/2) + '" r="' + radius + '" fill="none" stroke="' + ringColor + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" style="transition:stroke-dashoffset 0.5s ease;"/>'
                + '</svg>'
                + '<div style="position:relative; top:-' + (ringSize * 0.72) + 'px; text-align:center; font-weight:800; font-size:0.95em; color:' + ringColor + '; line-height:1;">' + readinessPct + '%</div>'
                + '</div>';
            
            // Label + incomplete items
            html += '<div style="flex:1; min-width:0;">'
                + '<div style="font-size:0.82em; font-weight:700; color:var(--c-heading-bold); margin-bottom:2px;">' + readinessLabel + '</div>'
                + '<div style="font-size:0.75em; color:var(--c-faint); margin-bottom:8px;">Complete all steps to unlock your full career intelligence profile.</div>'
                + '<div style="display:flex; gap:6px; flex-wrap:wrap;">';
            completeness.forEach(function(c) {
                if (!c.done) {
                    html += '<button onclick="' + c.action + '" style="font-size:0.72em; padding:3px 10px; border-radius:12px; border:1px solid var(--c-accent-border-3b); background:var(--c-accent-bg-3b); color:#60a5fa; cursor:pointer; white-space:nowrap;">' + bpIcon('plus',10) + ' ' + c.label + '</button>';
                }
            });
            html += '</div></div></div>';
        } else {
            // Compact complete badge
            html += '<div style="display:flex; align-items:center; gap:8px; padding:10px 16px; margin-bottom:16px; background:var(--c-green-bg-1b); border:1px solid var(--c-green-bg-6); border-radius:10px;">'
                + '<span style="color:#10b981;">' + bpIcon('check',16) + '</span>'
                + '<span style="font-size:0.82em; font-weight:600; color:#10b981;">Blueprint Complete</span>'
                + '<span style="font-size:0.72em; color:var(--c-faint); margin-left:auto;">' + skills.length + ' skills \u00B7 ' + outcomes.length + ' outcomes \u00B7 ' + values.length + ' values</span>'
                + '</div>';
        }
    })();
    
    // ── TOP JOB MATCH (if jobs saved) ──
    if (topMatch && topMatchScore > 0) {
        var tmColor = topMatchScore >= 70 ? '#10b981' : topMatchScore >= 50 ? '#f59e0b' : '#ef4444';
        html += '<div style="background:var(--c-surface-2); border:1px solid var(--c-surface-5); border-radius:12px; padding:18px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="switchView(\'jobs\')">'
            + '<div>'
            + '<div style="font-size:0.75em; color:var(--c-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Best Job Match</div>'
            + '<div style="font-weight:600; color:var(--c-text);">' + topMatch.title + '</div>'
            + '<div style="font-size:0.82em; color:var(--c-muted);">' + (topMatch.company || '') + ' \u00B7 ' + savedJobs.length + ' jobs tracked</div>'
            + '</div>'
            + '<div style="text-align:center;">'
            + '<div style="font-size:1.6em; font-weight:800; color:' + tmColor + ';">' + topMatchScore + '%</div>'
            + '<div style="font-size:0.65em; color:var(--c-muted); text-transform:uppercase;">Match</div>'
            + '</div></div>';
    }
    
    // ── SKILL DISTRIBUTION BAR ──
    if (skills.length > 0) {
        var profLevels = [
            { key: 'Mastery', color: '#10b981', label: 'Mastery' },
            { key: 'Expert', color: '#fb923c', label: 'Expert' },
            { key: 'Advanced', color: '#a78bfa', label: 'Advanced' },
            { key: 'Proficient', color: '#60a5fa', label: 'Proficient' },
            { key: 'Novice', color: '#94a3b8', label: 'Novice' }
        ];
        var profCounts = {};
        profLevels.forEach(function(p) { profCounts[p.key] = 0; });
        skills.forEach(function(s) {
            var lv = s.level || 'Novice';
            if (profCounts[lv] !== undefined) profCounts[lv]++;
            else profCounts['Novice']++;
        });
        var total = skills.length;
        
        html += '<div style="background:var(--c-surface-1); border:1px solid var(--c-surface-4c); border-radius:10px; padding:14px 16px; margin-bottom:16px;">'
            + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">'
            + '<div style="font-size:0.75em; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--c-faint);">Skill Distribution</div>'
            + '<div style="display:flex; align-items:center; gap:12px;">'
            + '<span style="font-size:0.72em; color:var(--c-faint);">' + roles.length + ' domains</span>'
            + '<button onclick="switchBlueprintTab(\'skills\')" style="font-size:0.72em; color:#60a5fa; background:none; border:none; cursor:pointer; font-weight:600;">Manage Skills \u2192</button>'
            + '</div></div>';
        
        // Stacked bar
        html += '<div style="display:flex; height:10px; border-radius:5px; overflow:hidden; background:var(--c-surface-2b); margin-bottom:10px;">';
        profLevels.forEach(function(p) {
            var pct = total > 0 ? (profCounts[p.key] / total * 100) : 0;
            if (pct > 0) {
                html += '<div title="' + p.label + ': ' + profCounts[p.key] + '" style="width:' + pct + '%; background:' + p.color + '; transition:width 0.3s;"></div>';
            }
        });
        html += '</div>';
        
        // Legend row
        html += '<div style="display:flex; gap:14px; flex-wrap:wrap;">';
        profLevels.forEach(function(p) {
            if (profCounts[p.key] > 0) {
                html += '<div style="display:flex; align-items:center; gap:5px; font-size:0.75em;">'
                    + '<div style="width:8px; height:8px; border-radius:2px; background:' + p.color + ';"></div>'
                    + '<span style="color:var(--c-muted);">' + p.label + '</span>'
                    + '<span style="font-weight:700; color:var(--c-heading);">' + profCounts[p.key] + '</span>'
                    + '</div>';
            }
        });
        html += '</div></div>';
    }
    
    // ── QUICK ACTIONS ──
    html += '<div style="margin-bottom:20px;">'
        + '<div style="font-size:0.78em; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--c-faint); margin-bottom:10px;">Quick Actions</div>'
        + '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">';
    
    // Manage Skills
    html += '<button onclick="switchBlueprintTab(\'skills\')" style="display:flex; align-items:center; gap:10px; padding:14px 16px; background:var(--c-green-bg-2b); border:1px solid var(--c-green-border-1); border-radius:10px; cursor:pointer; text-align:left; width:100%;">'
        + '<span style="color:#10b981;">' + bpIcon('skills',18) + '</span>'
        + '<div><div style="font-weight:600; color:var(--c-text); font-size:0.9em;">Manage Skills</div>'
        + '<div style="font-size:0.75em; color:var(--c-muted);">Add, edit, organize</div></div>'
        + '</button>';
    
    // Scouting Report
    html += '<button onclick="showScoutingReportPicker()" style="display:flex; align-items:center; gap:10px; padding:14px 16px; background:var(--c-accent-bg-3c); border:1px solid var(--c-accent-border-3c); border-radius:10px; cursor:pointer; text-align:left; width:100%;">'
        + '<span style="color:#60a5fa;">' + bpIcon('target',18) + '</span>'
        + '<div><div style="font-weight:600; color:var(--c-text); font-size:0.9em;">\u25C8 Scouting Report</div>'
        + '<div style="font-size:0.75em; color:var(--c-muted);">Targeted job analysis</div></div>'
        + '</button>';
    
    // PDF Summary
    if (!window.isReadOnlyProfile) {
    html += '<button onclick="exportBlueprint(\'pdf\')" style="display:flex; align-items:center; gap:10px; padding:14px 16px; background:var(--c-surface-2); border:1px solid var(--c-border-subtle); border-radius:10px; cursor:pointer; text-align:left; width:100%;">'
        + '<span style="color:var(--c-label);">' + bpIcon('pdf',18) + '</span>'
        + '<div><div style="font-weight:600; color:var(--c-text); font-size:0.9em;">PDF Summary</div>'
        + '<div style="font-size:0.75em; color:var(--c-muted);">Full career report</div></div>'
        + '</button>';
    
    // Executive Blueprint
    html += '<button onclick="exportBlueprint(\'html\')" style="display:flex; align-items:center; gap:10px; padding:14px 16px; background:var(--c-surface-2); border:1px solid var(--c-border-subtle); border-radius:10px; cursor:pointer; text-align:left; width:100%;">'
        + '<span style="color:var(--c-label);">' + bpIcon('export',18) + '</span>'
        + '<div><div style="font-weight:600; color:var(--c-text); font-size:0.9em;">Executive Blueprint</div>'
        + '<div style="font-size:0.75em; color:var(--c-muted);">HTML for email</div></div>'
        + '</button>';
    }
    
    html += '</div></div>'; // end quick actions
    

    return html;
}

// ===== SKILLS MANAGEMENT TAB =====
export function renderSkillsManagementTab() {
    var skills = _sd().skills || [];
    var roles = typeof getVisibleRoles === 'function' ? getVisibleRoles() : (_sd().roles || []);
    var html = '';
    
    // Action bar
    html += '<div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px;">';
    if (!window.isReadOnlyProfile) {
    html += '<button onclick="showAddSkillsEmpty()" style="display:flex; align-items:center; gap:7px; padding:10px 18px; background:linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.08)); border:1px solid var(--c-accent-border-4b); border-radius:8px; color:#60a5fa; cursor:pointer; font-weight:600; font-size:0.88em;">'
        + bpIcon('plus',14) + ' Add Skill</button>';
    html += '<button onclick="openBulkImport()" style="display:flex; align-items:center; gap:7px; padding:10px 18px; background:var(--c-surface-2); border:1px solid var(--c-border-subtle); border-radius:8px; color:var(--c-label); cursor:pointer; font-weight:600; font-size:0.88em;">'
        + bpIcon('upload',14) + ' Bulk Import</button>';
    }
    html += '<button onclick="switchView(\'skills\')" style="display:flex; align-items:center; gap:7px; padding:10px 18px; background:var(--c-surface-2); border:1px solid var(--c-border-subtle); border-radius:8px; color:var(--c-label); cursor:pointer; font-weight:600; font-size:0.88em; margin-left:auto;">'
        + bpIcon('skills',14) + ' Network View</button>';
    html += '</div>';
    
    if (skills.length === 0) {
        html += '<div style="text-align:center; padding:60px 20px; color:var(--c-faint);">'
            + '<div style="font-size:2em; margin-bottom:12px; opacity:0.5;">' + bpIcon('skills',48) + '</div>'
            + '<div style="font-size:1.1em; font-weight:600; color:var(--c-heading); margin-bottom:6px;">No skills mapped yet</div>'
            + '<div style="font-size:0.9em; max-width:400px; margin:0 auto; line-height:1.5;">Start by adding skills from the library, importing a resume, or using bulk import to build your professional profile.</div>'
            + '</div>';
        return html;
    }
    
    // Stats summary
    var levelCounts = { 'Mastery': 0, 'Expert': 0, 'Advanced': 0, 'Proficient': 0, 'Novice': 0 };
    var levelColors = { 'Mastery': '#10b981', 'Expert': '#fb923c', 'Advanced': '#a78bfa', 'Proficient': '#60a5fa', 'Novice': '#94a3b8' };
    skills.forEach(function(s) { var lv = s.level || 'Novice'; if (levelCounts[lv] !== undefined) levelCounts[lv]++; else levelCounts['Novice']++; });
    
    html += '<div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:20px;">';
    ['Mastery','Expert','Advanced','Proficient','Novice'].forEach(function(lv) {
        if (levelCounts[lv] > 0) {
            html += '<div style="display:flex; align-items:center; gap:6px; font-size:0.85em;">'
                + '<div style="width:10px; height:10px; border-radius:3px; background:' + levelColors[lv] + ';"></div>'
                + '<span style="color:var(--c-muted);">' + lv + '</span>'
                + '<span style="font-weight:700; color:var(--c-heading);">' + levelCounts[lv] + '</span>'
                + '</div>';
        }
    });
    html += '<div style="font-size:0.85em; color:var(--c-faint); margin-left:auto;">' + skills.length + '/' + PROFILE_SKILL_CAP + ' skills \u00B7 ' + roles.length + ' domains</div>';
    html += '</div>';
    
    // Over-cap warning
    if (skills.length > PROFILE_SKILL_CAP && !window.isReadOnlyProfile) {
        var excess = skills.length - PROFILE_SKILL_CAP;
        html += '<div style="padding:12px 16px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:10px; margin-bottom:16px; display:flex; align-items:center; gap:10px;">'
            + '<span style="color:#ef4444; font-size:1.1em;">\u26A0</span>'
            + '<div style="flex:1;"><div style="font-weight:700; font-size:0.88em; color:#ef4444;">Over skill cap by ' + excess + '</div>'
            + '<div style="font-size:0.78em; color:var(--text-muted); line-height:1.4;">Remove ' + excess + ' skill' + (excess !== 1 ? 's' : '') + ' to unlock adding new ones. System will not allow new skills until at or below ' + PROFILE_SKILL_CAP + '.</div>'
            + '</div>'
            + '<button onclick="showSkillCapTriage()" style="padding:8px 16px; background:#ef4444; color:#fff; border:none; border-radius:8px; font-weight:600; font-size:0.82em; cursor:pointer; white-space:nowrap;">Manage \u2192</button>'
            + '</div>';
    } else if (skills.length >= SKILL_CAP_WARN && !window.isReadOnlyProfile) {
        var remaining = PROFILE_SKILL_CAP - skills.length;
        html += '<div style="padding:10px 16px; background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.2); border-radius:10px; margin-bottom:16px; display:flex; align-items:center; gap:10px;">'
            + '<span style="color:#f59e0b; font-size:0.95em;">\u25CF</span>'
            + '<div style="font-size:0.82em; color:var(--text-muted);">' + remaining + ' skill slot' + (remaining !== 1 ? 's' : '') + ' remaining (cap: ' + PROFILE_SKILL_CAP + ')</div>'
            + '</div>';
    }
    
    // Group skills by impact-based rarity
    var impactToRarity = { critical: 'rare', high: 'rare', moderate: 'uncommon', standard: 'common', supplementary: 'common' };
    var tierMeta = {
        rare: { label: 'Rare', desc: 'Market differentiators', icon: 'flame', bg: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))', border: 'rgba(245,158,11,0.3)', accent: '#f59e0b', pillBg: 'rgba(245,158,11,0.2)' },
        uncommon: { label: 'Uncommon', desc: 'Competitive advantages', icon: 'diamond', bg: 'linear-gradient(135deg, rgba(96,165,250,0.06), rgba(139,92,246,0.04))', border: 'rgba(96,165,250,0.25)', accent: '#60a5fa', pillBg: 'rgba(96,165,250,0.2)' },
        common: { label: 'Common', desc: 'Foundational capabilities', icon: 'check', bg: 'var(--c-surface-1)', border: 'var(--c-surface-4)', accent: '#6b7280', pillBg: 'rgba(107,114,128,0.2)' }
    };
    var tierSkills = { rare: [], uncommon: [], common: [] };
    var levelPriority = { Mastery: 5, Expert: 4, Advanced: 3, Proficient: 2, Novice: 1 };

    skills.forEach(function(s) {
        var impact = typeof getSkillImpact === 'function' ? getSkillImpact(s) : null;
        var rarity;
        if (s.category === 'unique') {
            rarity = (s.userAssessment && s.userAssessment.rarity) || 'uncommon';
        } else {
            rarity = impactToRarity[(impact && impact.level) || 'moderate'] || 'common';
        }
        tierSkills[rarity].push(s);
    });

    ['rare', 'uncommon', 'common'].forEach(function(tierKey) {
        var tSkills = tierSkills[tierKey];
        if (tSkills.length === 0) return;
        var meta = tierMeta[tierKey];

        tSkills.sort(function(a, b) {
            if (a.core && !b.core) return -1;
            if (!a.core && b.core) return 1;
            var lvl = (levelPriority[b.level] || 0) - (levelPriority[a.level] || 0);
            if (lvl !== 0) return lvl;
            return (a.name || '').localeCompare(b.name || '');
        });

        var tierLevelCounts = {};
        var tierEvidenceCount = 0;
        var tierVerifiedCount = 0;
        tSkills.forEach(function(sk) {
            var lv = sk.level || 'Novice';
            tierLevelCounts[lv] = (tierLevelCounts[lv] || 0) + 1;
            if (typeof getEvidenceSummary === 'function') {
                var ev = getEvidenceSummary(sk);
                if (ev.evidenceCount > 0) tierEvidenceCount++;
                if (ev.verifiedCount > 0) tierVerifiedCount++;
            }
        });

        html += '<div style="margin-bottom:16px; border:1px solid ' + meta.border + '; border-radius:10px; overflow:hidden;">';

        html += '<div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:' + meta.bg + '; border-bottom:1px solid ' + meta.border + ';">'
            + '<div style="display:flex; align-items:center; gap:8px;">'
            + '<span style="color:' + meta.accent + ';">' + bpIcon(meta.icon, 16) + '</span>'
            + '<span style="font-weight:700; font-size:0.92em; color:var(--c-heading);">' + meta.label + '</span>'
            + '<span style="font-size:0.78em; color:var(--c-muted); font-weight:400;">' + meta.desc + '</span>'
            + '</div>'
            + '<span style="font-size:0.75em; color:' + meta.accent + '; font-weight:600;">' + tSkills.length + ' skills</span>'
            + '</div>';

        var statsItems = [];
        ['Mastery','Expert','Advanced','Proficient','Novice'].forEach(function(lv) {
            if (tierLevelCounts[lv]) statsItems.push('<span style="color:' + (levelColors[lv] || '#6b7280') + ';">' + tierLevelCounts[lv] + ' ' + lv + '</span>');
        });
        if (tierEvidenceCount > 0) statsItems.push('<span style="color:#10b981;">' + tierEvidenceCount + '/' + tSkills.length + ' evidence</span>');
        if (tierVerifiedCount > 0) statsItems.push('<span style="color:#10b981;">' + tierVerifiedCount + ' verified</span>');
        html += '<div style="font-size:0.72em; padding:6px 16px; color:var(--c-muted); border-bottom:1px solid var(--c-surface-1b);">' + statsItems.join(' <span style="opacity:0.3;">\u00B7</span> ') + '</div>';

        html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px; padding:12px;">';

        tSkills.forEach(function(s) {
            var lv = s.level || 'Novice';
            var lvColor = levelColors[lv] || '#6b7280';
            var escapedName = s.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            var rolesArr = s.roles || (s.role ? [s.role] : []);
            var roleNames = rolesArr.map(function(roleId) {
                var role = (roles || []).find(function(r) { return r.id === roleId || r.name === roleId; });
                return role ? role.name : '';
            }).filter(Boolean);

            var skillImpact = typeof calculateSkillValue === 'function' ? calculateSkillValue(s) : null;
            var impactLabel = skillImpact ? skillImpact.label : '';
            var impactColor = skillImpact ? getImpactColor(skillImpact.level) : '#6b7280';

            var skillVerifs = getSkillVerifications(s.name);
            var hasConfirmed = skillVerifs.some(function(v) { return v.status === 'confirmed'; });

            var catLabels = { skill: 'Skill', ability: 'Ability', workstyle: 'Work Style', unique: 'Unique' };

            var details = _sd().skillDetails && _sd().skillDetails[s.name];
            var years = details && details.years ? details.years : 0;

            html += '<div style="background:var(--c-surface-1); border:1px solid var(--c-surface-4); border-radius:10px; padding:14px; cursor:pointer; transition:border-color 0.15s, box-shadow 0.15s; position:relative;" '
                + 'onclick="openUnifiedSkillEditor(\'' + escapedName + '\')" '
                + 'onmouseover="this.style.borderColor=\'' + meta.accent + '\';this.style.boxShadow=\'0 2px 12px rgba(0,0,0,0.15)\'" '
                + 'onmouseout="this.style.borderColor=\'var(--c-surface-4)\';this.style.boxShadow=\'none\'">';

            html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">'
                + '<div style="display:flex; align-items:center; gap:6px; flex:1; min-width:0;">'
                + '<div style="width:8px; height:8px; border-radius:2px; background:' + lvColor + '; flex-shrink:0;"></div>'
                + '<span style="font-size:0.92em; font-weight:600; color:var(--c-heading); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(s.name) + '</span>'
                + '</div>'
                + '<div style="display:flex; gap:4px; flex-shrink:0;" onclick="event.stopPropagation();">'
                + (window.isReadOnlyProfile ? '' : '<button onclick="if(confirm(\'Remove ' + escapedName + '?\')) { removeSkillFromProfile(\'' + escapedName + '\', \'' + (s.category || 'skill') + '\'); switchBlueprintTab(\'skills\'); }" title="Remove" style="background:none; border:none; cursor:pointer; color:var(--c-faint); padding:2px; opacity:0.4;" onmouseover="this.style.opacity=\'1\';this.style.color=\'#ef4444\'" onmouseout="this.style.opacity=\'0.4\';this.style.color=\'var(--c-faint)\'">' + bpIcon('trash',12) + '</button>')
                + '</div></div>';

            var smCatIcons = { skill: bpIcon('tool',11), ability: bpIcon('zap',11), workstyle: bpIcon('heart',11), unique: bpIcon('star',11) };
            var smCatColors = { skill: '#60a5fa', ability: '#a78bfa', workstyle: '#10b981', unique: '#fbbf24' };
            var smCatTitles = { skill: 'Skill', ability: 'Ability', workstyle: 'Work Style', unique: 'Unique Skill' };

            html += '<div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">'
                + '<span style="font-size:0.72em; padding:2px 10px; border-radius:10px; background:' + lvColor + '22; color:' + lvColor + '; font-weight:600;">' + escapeHtml(lv) + '</span>'
                + (s.core ? '<span title="Core Skill" style="color:#f59e0b; font-size:0.85em; line-height:1;">&#9733;</span>' : '')
                + (hasConfirmed ? '<span title="Verified" style="color:#10b981; font-size:0.8em; line-height:1;">' + bpIcon('shield',13) + '</span>' : '')
                + (skillImpact ? '<span title="' + (skillImpact.label || '') + '" style="color:' + impactColor + '; font-size:0.75em; line-height:1;">' + (skillImpact.icon || '') + '</span>' : '')
                + '<span title="' + (smCatTitles[s.category] || 'Skill') + '" style="color:' + (smCatColors[s.category] || '#60a5fa') + '; font-size:0.75em; line-height:1;">' + (smCatIcons[s.category] || bpIcon('tool',11)) + '</span>'
                + (years ? '<span style="font-size:0.68em; color:var(--c-muted);">' + years + 'y</span>' : '')
                + '</div>';

            if (roleNames.length > 0) {
                html += '<div style="font-size:0.68em; color:var(--c-faint); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + roleNames.join(' \u00B7 ') + '</div>';
            }

            html += '</div>';
        });

        html += '</div></div>';
    });
    
    return html;
}

// ===== EXPERIENCE TAB (wraps Settings Experience content) =====
export function renderExperienceTab() {
    return renderExperienceSettings();
}


export function renderOutcomesSection() {
    const outcomes = _bd().outcomes;
    
    return `
        <div class="blueprint-section">
            <div class="blueprint-section-header">
                <div class="blueprint-section-title">
                    <span class="section-icon">${bpIcon("outcomes",20)}</span>
                    <span>Outcomes I Drive</span>
                    <span class="section-count">${outcomes.length}</span>
                </div>
            </div>
            
            <div class="coaching-tip">
                <div class="coaching-tip-title">
                    ${bpIcon("lightbulb",14)} COACHING TIP
                </div>
                <div class="coaching-tip-content">
                    Top performers quantify impact. Notice the pattern:
                    <ul>
                        <li><strong>Numbers:</strong> $200M, 85%, 5 years, zero injuries</li>
                        <li><strong>Comparisons:</strong> "5 years early", "before market consensus"</li>
                        <li><strong>Consequences:</strong> What changed because of this?</li>
                    </ul>
                </div>
            </div>
            
            <div id="outcomesContainer">
                ${outcomes.map((outcome, idx) => renderOutcomeItem(outcome, idx)).join('')}
            </div>
            
            <button class="add-outcome-btn" onclick="addCustomOutcome()">
                <span>${bpIcon("plus",14)}</span>
                <span>Add Custom Outcome</span>
            </button>
            
            <div class="reflection-prompts">
                <div class="reflection-title">${bpIcon("message",14)} REFLECTION PROMPTS</div>
                <ul>
                    <li>What problem did you solve that others couldn't?</li>
                    <li>What changed because of your work?</li>
                    <li>What would have happened without you?</li>
                    <li>How do you know this worked? (proof/evidence)</li>
                </ul>
            </div>
        </div>
    `;
}

export function renderOutcomeItem(outcome, idx) {
    const shareChecked = outcome.shared ? 'checked' : '';
    const sensitiveWarning = outcome.sensitive ? 
        '<span class="meta-tag sensitive">${bpIcon("warning",12)} SENSITIVE: Consider context before sharing</span>' : '';
    const coachingNote = outcome.coachingSuggestion ? 
        `<div class="outcome-coaching">${bpIcon('lightbulb',12)} ${outcome.coachingSuggestion}</div>` : '';
    
    return `
        <div class="outcome-item" data-idx="${idx}">
            <div class="outcome-header">
                <div class="outcome-text">${outcome.text}</div>
                <div class="outcome-controls">
                    <label class="share-toggle">
                        <input type="checkbox" ${shareChecked} onchange="toggleOutcomeShare(${idx})">
                        <span class="share-toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="outcome-meta">
                <span class="meta-tag category">${bpIcon("layers",12)} ${outcome.category}</span>
                <span class="meta-tag evidence">${bpIcon("check",12)} From: ${outcome.skill}</span>
                ${sensitiveWarning}
            </div>
            
            ${coachingNote}
            
            <div class="outcome-actions">
                <button class="outcome-btn" onclick="editOutcome(${idx})">${bpIcon("edit",12)} Edit</button>
                <button class="outcome-btn" onclick="viewOutcomeEvidence(${idx})">${bpIcon("search",12)} View Evidence</button>
                <button class="outcome-btn" onclick="deleteBlueprintOutcome(${idx})" style="color:#ef4444;">${bpIcon("trash",12)} Delete</button>
            </div>
        </div>
    `;
}

export function renderValuesSection() {
    var values = _bd().values || [];
    if (!Array.isArray(values)) values = [];
    var selectedCount = values.filter(function(v) { return v && v.selected; }).length;
    
    var html = '<div class="blueprint-section">'
        + '<div class="blueprint-section-header">'
        + '<div class="blueprint-section-title">'
        + '<span class="section-icon">' + bpIcon('values',20) + '</span>'
        + '<span>Values & Principles</span>'
        + '<span class="section-count">' + selectedCount + ' selected</span>'
        + '</div>'
        + '</div>';
    
    if (showingValuesPicker) {
        html += renderValuesPicker();
    } else {
        html += renderSelectedValues();
    }
    
    html += '</div>';
    return html;
}

export function renderSelectedValues() {
    var values = _bd().values || [];
    if (!Array.isArray(values)) values = [];
    var selectedCount = values.filter(function(v) { return v && v.selected; }).length;
    
    var html = '<div class="coaching-tip">'
        + '<div class="coaching-tip-title">' + bpIcon('lightbulb',14) + ' YOUR CORE VALUES</div>'
        + '<div class="coaching-tip-content">'
        + (selectedCount === 0
            ? 'You haven\u2019t selected any values yet. Use the picker below to choose 3-7 that represent how you operate.'
            : 'These are the values you operate by. Add a personal note to explain why each matters to you.')
        + '</div>'
        + '</div>';
    
    // Selected values as compact cards
    if (values.length > 0) {
        html += '<div class="values-grid">';
        values.forEach(function(value, idx) {
            if (!value || !value.name) return;
            var evidence = getEvidenceForValue(value.name);
            var evCount = evidence.length;
            var catalogDesc = getCatalogDescription(value.name);
            
            html += '<div class="value-card selected" style="position:relative;">';
            
            // Controls
            html += '<div style="position:absolute; top:8px; right:8px; display:flex; gap:3px; opacity:0.45;" '
                + 'onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.45">';
            if (idx > 0) {
                html += '<button onclick="event.stopPropagation(); moveValue(' + idx + ',-1)" title="Move up" style="'
                    + 'background:none; border:none; cursor:pointer; font-size:0.75em; color:var(--c-muted); padding:2px 4px;">\u25B2</button>';
            }
            if (idx < values.length - 1) {
                html += '<button onclick="event.stopPropagation(); moveValue(' + idx + ',1)" title="Move down" style="'
                    + 'background:none; border:none; cursor:pointer; font-size:0.75em; color:var(--c-muted); padding:2px 4px;">\u25BC</button>';
            }
            html += '<button onclick="event.stopPropagation(); removeSelectedValue(' + idx + ')" title="Remove" style="'
                + 'background:none; border:none; cursor:pointer; font-size:0.9em; color:var(--c-muted); padding:2px 4px;">\u00D7</button>';
            html += '</div>';
            
            html += '<div class="value-title">' + escapeHtml(value.name) + '</div>';
            
            // Description from catalog
            if (catalogDesc) {
                html += '<div style="font-size:0.82em; color:var(--c-muted); line-height:1.45; margin-top:4px;">'
                    + escapeHtml(catalogDesc) + '</div>';
            }
            
            // Badges
            html += '<div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:6px;">';
            if (value.inferred) {
                html += '<span style="font-size:0.7em; padding:2px 7px; border-radius:10px; '
                    + 'background:var(--c-green-bg-4a); '
                    + 'color:#10b981;">Evidence-matched</span>';
            }
            if (value.custom) {
                html += '<span style="font-size:0.7em; padding:2px 7px; border-radius:10px; '
                    + 'background:var(--c-purple-bg-1); '
                    + 'color:#a78bfa;">Custom</span>';
            }
            if (evCount > 0) {
                html += '<span style="font-size:0.7em; padding:2px 7px; border-radius:10px; '
                    + 'background:var(--c-amber-bg-4); '
                    + 'color:#f59e0b;">' + evCount + ' evidence</span>';
            }
            html += '</div>';
            
            // Personal note (editable)
            if (value.note) {
                html += '<div style="margin-top:8px; padding:8px 10px; border-radius:6px; '
                    + 'background:var(--c-accent-bg-2a); '
                    + 'border-left:2px solid var(--c-accent-border-4);">'
                    + '<div style="font-size:0.76em; color:var(--c-label); line-height:1.45; font-style:italic;">'
                    + '\u201C' + value.note + '\u201D</div>'
                    + '<button onclick="event.stopPropagation(); editValueNote(' + idx + ')" style="'
                    + 'background:none; border:none; font-size:0.7em; color:var(--c-accent); cursor:pointer; margin-top:4px; padding:0;">Edit note</button>'
                    + '</div>';
            } else {
                html += '<button onclick="event.stopPropagation(); editValueNote(' + idx + ')" style="'
                    + 'background:none; border:1px dashed var(--c-accent-border-3a); '
                    + 'color:var(--c-faint); font-size:0.73em; padding:5px 10px; border-radius:5px; '
                    + 'cursor:pointer; margin-top:8px; width:100%; text-align:left;">+ Add a personal note</button>';
            }
            
            // Evidence preview
            if (evCount > 0) {
                html += '<div style="margin-top:8px; padding-top:7px; border-top:1px solid '
                    + 'var(--c-surface-4)' + ';">'
                    + '<div style="font-size:0.76em; color:var(--c-faint); font-style:italic; line-height:1.4;">'
                    + '\u201C' + evidence[0].text.substring(0, 90) + (evidence[0].text.length > 90 ? '\u2026' : '') + '\u201D'
                    + '<span style="color:var(--c-accent); font-style:normal; margin-left:5px;">\u2014 ' + evidence[0].skill + '</span>'
                    + '</div></div>';
            }
            
            html += '</div>';
        });
        html += '</div>';
    }
    
    // Action buttons
    html += '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:18px;">'
        + '<button onclick="toggleValuesPicker()" style="'
        + 'background:var(--c-accent-bg-5a); '
        + 'border:1px solid var(--c-accent-border-4); '
        + 'color:var(--c-accent-deep); '
        + 'padding:10px 20px; border-radius:8px; cursor:pointer; font-size:0.9em; font-weight:600;'
        + '">' + (values.length === 0 ? '\u2B50 Choose Your Values' : '+ Add / Change Values') + '</button>'
        + '<button onclick="showAddCustomValueForm()" style="'
        + 'background:transparent; '
        + 'border:1px dashed var(--c-purple-border-2); '
        + 'color:var(--c-purple-light); '
        + 'padding:10px 20px; border-radius:8px; cursor:pointer; font-size:0.9em;'
        + '">+ Custom Value</button>'
        + '</div>';
    
    // Inline custom value form (hidden)
    html += '<div id="addValueForm" style="display:none; margin-top:16px; padding:20px; '
        + 'background:var(--c-surface-2); '
        + 'border:1px solid var(--c-purple-border-1); border-radius:10px;">'
        + '<input id="newValueName" placeholder="Value name (e.g., Radical Transparency)" style="'
        + 'width:100%; padding:10px 14px; margin-bottom:12px; background:var(--c-input-bg); '
        + 'border:1px solid var(--c-border-strong); border-radius:6px; '
        + 'color:var(--c-text-alt); font-size:0.95em;" />'
        + '<div style="display:flex; gap:8px;">'
        + '<button onclick="addCustomValue()" style="'
        + 'background:var(--c-purple); color:#fff; border:none; padding:8px 18px; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.88em;">'
        + 'Add</button>'
        + '<button onclick="hideAddValueForm()" style="'
        + 'background:transparent; color:var(--c-muted); border:1px solid var(--c-border-solid); '
        + 'padding:8px 18px; border-radius:6px; cursor:pointer; font-size:0.88em;">'
        + 'Cancel</button>'
        + '</div></div>';
    
    return html;
}

export function renderValuesPicker() {
    var selectedNames = {};
    _bd().values.forEach(function(v) { selectedNames[v.name] = true; });
    
    var html = '<div class="coaching-tip">'
        + '<div class="coaching-tip-title">' + bpIcon('lightbulb',14) + ' PICK 3-7 VALUES</div>'
        + '<div class="coaching-tip-content">'
        + 'Tap values that resonate with how you actually work. Values with evidence in your profile are highlighted.'
        + '</div>'
        + '</div>';
    
    VALUES_CATALOG.forEach(function(group) {
        html += '<div style="margin-bottom:20px;">'
            + '<div style="font-size:0.82em; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; '
            + 'color:var(--c-faint); margin-bottom:10px; padding-left:2px;">'
            + group.group + '</div>'
            + '<div style="display:flex; flex-wrap:wrap; gap:8px;">';
        
        group.values.forEach(function(val) {
            var isSelected = selectedNames[val.name] || false;
            var evScore = scoreValueByEvidence(val);
            var hasEvidence = evScore > 0;
            
            var bg, border, color;
            if (isSelected) {
                bg = 'var(--c-accent-border-1)';
                border = 'var(--c-accent-border-6)';
                color = 'var(--c-accent-light)';
            } else if (hasEvidence) {
                bg = 'var(--c-green-bg-2a)';
                border = 'var(--c-green-border-1)';
                color = 'var(--c-heading)';
            } else {
                bg = 'var(--c-surface-2)';
                border = 'var(--c-border-subtle)';
                color = 'var(--c-muted)';
            }
            
            html += '<button onclick="pickValue(\'' + escapeHtml(val.name).replace(/'/g, "\\'") + '\')" title="' + escapeHtml(val.description || '') + '" style="'
                + 'background:' + bg + '; border:1.5px solid ' + border + '; color:' + color + '; '
                + 'padding:8px 16px; border-radius:20px; cursor:pointer; font-size:0.88em; '
                + 'font-weight:' + (isSelected ? '700' : '500') + '; transition:all 0.15s ease;">'
                + (isSelected ? '\u2713 ' : '')
                + escapeHtml(val.name)
                + (hasEvidence && !isSelected ? ' \u2022' : '')
                + '</button>';
        });
        
        html += '</div></div>';
    });
    
    // Done button
    var count = _bd().values.filter(function(v) { return v.selected; }).length;
    var countColor = count > 7 ? '#ef4444' : count >= 3 ? '#10b981' : '#f59e0b';
    html += '<div style="margin-top:16px; display:flex; gap:10px; align-items:center;">'
        + '<button onclick="toggleValuesPicker()" style="'
        + 'background:var(--c-accent-inv); color:#fff; border:none; '
        + 'padding:10px 24px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.92em;">'
        + 'Done (' + count + '/7)</button>'
        + '<span style="font-size:0.82em; color:var(--c-faint);">'
        + '\u2022 = evidence in your profile'
        + (count >= 7 ? ' &nbsp;\u2022&nbsp; <span style="color:#f59e0b;">Maximum reached</span>' : '')
        + '</span>'
        + '</div>';
    
    return html;
}

// ═══════════════════════════════════════════════════════════
// CONTENT & EVIDENCE TAB
// ═══════════════════════════════════════════════════════════

export function _countContentItems() {
    var lc = window._userData.linkedinContent || {};
    return (lc.recommendations || []).length
        + (lc.articles || []).length
        + (lc.posts || []).length
        + (lc.volunteering || []).length
        + (lc.honors || []).length
        + (lc.causes || []).length
        + (lc.organizations || []).length
        + Object.keys(lc.endorsements || {}).length;
}

export function _getContentVis(section, idx) {
    var cv = window._userData.contentVisibility || {};
    var key = section + ':' + idx;
    return cv[key] !== false; // default on
}

export function toggleContentVis(section, idx) {
    if (readOnlyGuard()) return;
    if (!window._userData.contentVisibility) window._userData.contentVisibility = {};
    var key = section + ':' + idx;
    window._userData.contentVisibility[key] = !_getContentVis(section, idx);
    saveAll();
    if (fbUser) debouncedSave();
    // Update just the toggle UI
    var toggle = document.getElementById('cv-' + section + '-' + idx);
    var on = _getContentVis(section, idx);
    if (toggle) {
        toggle.style.background = on ? 'var(--accent)' : 'var(--c-surface-5)';
        toggle.querySelector('span').style.transform = on ? 'translateX(16px)' : 'translateX(1px)';
    }
    var card = document.getElementById('cc-' + section + '-' + idx);
    if (card) card.style.opacity = on ? '1' : '0.5';
}
if (!window.toggleContentVis) window.toggleContentVis = toggleContentVis;

export function contentToggleAllSection(section, count, onOff) {
    if (readOnlyGuard()) return;
    if (!window._userData.contentVisibility) window._userData.contentVisibility = {};
    for (var i = 0; i < count; i++) {
        window._userData.contentVisibility[section + ':' + i] = onOff;
        var toggle = document.getElementById('cv-' + section + '-' + i);
        if (toggle) {
            toggle.style.background = onOff ? 'var(--accent)' : 'var(--c-surface-5)';
            var dot = toggle.querySelector('span');
            if (dot) dot.style.transform = onOff ? 'translateX(16px)' : 'translateX(1px)';
        }
        var card = document.getElementById('cc-' + section + '-' + i);
        if (card) card.style.opacity = onOff ? '1' : '0.5';
    }
    saveAll();
    if (fbUser) debouncedSave();
}
if (!window.contentToggleAllSection) window.contentToggleAllSection = contentToggleAllSection;

export function _toggleSwitch(section, idx) {
    var on = _getContentVis(section, idx);
    return '<div id="cv-' + section + '-' + idx + '" onclick="toggleContentVis(\'' + section + '\',' + idx + ')" '
        + 'style="width:36px; height:20px; border-radius:10px; cursor:pointer; position:relative; flex-shrink:0; transition:background 0.2s; '
        + 'background:' + (on ? 'var(--accent)' : 'var(--c-surface-5)') + ';">'
        + '<span style="position:absolute; top:2px; width:16px; height:16px; border-radius:50%; background:#fff; transition:transform 0.2s; '
        + 'transform:' + (on ? 'translateX(16px)' : 'translateX(1px)') + '; box-shadow:0 1px 3px rgba(0,0,0,0.2);"></span></div>';
}

export function _contentCard(section, idx, icon, title, subtitle, body, extra) {
    var on = _getContentVis(section, idx);
    return '<div id="cc-' + section + '-' + idx + '" style="padding:12px 14px; background:var(--c-surface-1); '
        + 'border:1px solid var(--c-surface-5b); border-radius:8px; margin-bottom:8px; opacity:' + (on ? '1' : '0.5') + '; transition:opacity 0.2s;">'
        + '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">'
        + '<div style="flex:1; min-width:0;">'
        + '<div style="display:flex; align-items:center; gap:6px;">'
        + '<span style="display:inline-flex; align-items:center; color:var(--c-muted); flex-shrink:0;">' + icon + '</span>'
        + '<span style="font-weight:600; color:var(--c-text-alt); font-size:0.88em;">' + escapeHtml(title) + '</span>'
        + '</div>'
        + (subtitle ? '<div style="font-size:0.78em; color:var(--c-muted); margin-top:2px;">' + escapeHtml(subtitle) + '</div>' : '')
        + (body ? '<div style="font-size:0.8em; color:var(--text-secondary); margin-top:6px; line-height:1.5;">' + body + '</div>' : '')
        + (extra || '')
        + '</div>'
        + _toggleSwitch(section, idx)
        + '</div></div>';
}

export function _sectionHeader(icon, title, count, desc) {
    return '<div style="margin-top:24px; margin-bottom:10px;">'
        + '<div style="display:flex; align-items:center; gap:8px;">'
        + '<span style="display:inline-flex; align-items:center; color:var(--accent); flex-shrink:0;">' + icon + '</span>'
        + '<span style="font-weight:700; color:var(--text-primary); font-size:0.92em;">' + title + '</span>'
        + '<span style="font-size:0.72em; padding:2px 8px; border-radius:10px; background:var(--c-surface-4a); color:var(--c-muted); font-weight:600;">' + count + '</span>'
        + '</div>'
        + (desc ? '<div style="font-size:0.78em; color:var(--c-muted); margin-top:4px; margin-left:28px;">' + desc + '</div>' : '')
        + '</div>';
}

export function renderContentEvidenceTab() {
    var lc = window._userData.linkedinContent || {};
    var stats = window._userData.importStats || {};
    var html = '';
    
    // Header
    html += '<div class="blueprint-section">'
        + '<div class="blueprint-section-header">'
        + '<div class="blueprint-section-title">'
        + '<span class="section-icon">' + bpIcon('clipboard', 20) + '</span>'
        + '<span>Content & Evidence</span>'
        + '</div></div>'
        + '<p style="color:var(--text-muted); font-size:0.85em; margin-bottom:4px; line-height:1.5;">'
        + 'Everything extracted from your LinkedIn data export. Toggle items on or off to control what appears in scouting reports and exports. '
        + 'Your core profile data (positions, skills, education) lives in Experience and Skills.'
        + '</p>';
    
    // Purpose Statement (moved from dashboard for better context with content)
    var purpose = _bd().purpose || '';
    html += '<div style="background:var(--c-accent-bg-2b); border:1px solid var(--c-accent-bg-6b); border-radius:12px; padding:18px; margin-bottom:20px;">'
        + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">'
        + '<div style="font-size:0.78em; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--c-accent); display:flex; align-items:center; gap:6px;">'
        + bpIcon('purpose',14) + ' Purpose Statement</div>';
    if (!window.isReadOnlyProfile) {
        html += '<div style="display:flex; gap:6px; align-items:center;">'
            + '<button onclick="generatePurposeAI()" id="purposeAIBtn" '
            + 'style="font-size:0.78em; padding:4px 12px; border-radius:6px; border:1px solid rgba(139,92,246,0.3); background:rgba(139,92,246,0.08); color:#a78bfa; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">'
            + bpIcon('zap',12) + ' Generate</button>'
            + '<button onclick="var ta=document.getElementById(\'contentPurposeEdit\'); if(ta.readOnly){ta.readOnly=false; ta.focus(); ta.style.background=\'var(--c-input-bg)\'; this.textContent=\'Save\';} else {ta.readOnly=true; ta.style.background=\'transparent\'; updatePurpose(ta.value); this.textContent=\'Edit\';}" '
            + 'style="font-size:0.78em; padding:4px 12px; border-radius:6px; border:1px solid var(--c-accent-border-2); background:transparent; color:#60a5fa; cursor:pointer;">'
            + 'Edit</button>'
            + '</div>';
    }
    html += '</div>'
        + '<textarea id="contentPurposeEdit" readonly style="'
        + 'width:100%; min-height:48px; background:transparent; border:none; color:var(--c-heading); '
        + 'font-size:0.92em; line-height:1.6; resize:vertical; outline:none; font-style:italic;">'
        + escapeHtml(purpose || 'No purpose statement yet. Switch to the Content tab and click Edit to add yours.')
        + '</textarea></div>';
    
    // Import status bar
    if (stats.lastMerge) {
        var totalItems = _countContentItems();
        var activeItems = 0;
        var cv = window._userData.contentVisibility || {};
        Object.keys(cv).forEach(function(k) { if (cv[k] !== false) activeItems++; });
        // If no visibility set yet, all items are active
        if (Object.keys(cv).length === 0) activeItems = totalItems;
        
        html += '<div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px; padding:12px 14px; '
            + 'background:linear-gradient(135deg, rgba(96,165,250,0.05), rgba(139,92,246,0.05)); border:1px solid var(--border); border-radius:8px;">';
        
        var statPills = [
            { label: 'Last Import', value: new Date(stats.lastMerge).toLocaleDateString(), color: 'var(--accent)' },
            { label: 'Endorsements', value: (stats.endorsements || 0).toLocaleString(), color: '#f59e0b' },
            { label: 'Network', value: (stats.network || 0).toLocaleString(), color: '#8b5cf6' },
            { label: 'Courses', value: (stats.learningCompleted || 0) + '/' + (stats.learning || 0), color: '#06b6d4' }
        ];
        statPills.forEach(function(p) {
            html += '<div style="text-align:center; min-width:80px;">'
                + '<div style="font-size:1.1em; font-weight:800; color:' + p.color + ';">' + p.value + '</div>'
                + '<div style="font-size:0.65em; color:var(--c-muted); text-transform:uppercase; letter-spacing:0.05em;">' + p.label + '</div></div>';
        });
        html += '</div>';
    }
    
    // Empty state
    if (_countContentItems() === 0) {
        html += '<div style="text-align:center; padding:60px 20px;">'
            + '<div style="font-size:2em; margin-bottom:12px; opacity:0.3;">' + bpIcon('clipboard', 48) + '</div>'
            + '<div style="font-weight:600; color:var(--text-primary); margin-bottom:8px;">No content imported yet</div>'
            + '<div style="color:var(--text-muted); max-width:400px; margin:0 auto 20px; line-height:1.6; font-size:0.9em;">'
            + 'Upload your LinkedIn data export in the Experience tab to populate endorsements, recommendations, articles, volunteering, and more.</div>'
            + '<button onclick="switchBlueprintTab(\'experience\')" style="padding:10px 24px; background:var(--accent); color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600;">'
            + bpIcon('experience', 14) + ' Go to Experience</button>'
            + '</div></div>';
        return html;
    }
    
    // ── RECOMMENDATIONS ──
    var recs = lc.recommendations || [];
    if (recs.length > 0) {
        html += _sectionHeader(bpIcon('users', 16), 'Recommendations', recs.length, 'Peer testimonials. High-impact evidence for scouting reports.');
        html += '<div style="display:flex; gap:8px; margin-bottom:8px;">'
            + '<button onclick="contentToggleAllSection(\'rec\',' + recs.length + ',true)" style="padding:3px 10px; border-radius:6px; font-size:0.72em; font-weight:600; background:rgba(16,185,129,0.08); color:#10b981; border:1px solid rgba(16,185,129,0.15); cursor:pointer;">Select All</button>'
            + '<button onclick="contentToggleAllSection(\'rec\',' + recs.length + ',false)" style="padding:3px 10px; border-radius:6px; font-size:0.72em; font-weight:600; background:var(--c-surface-4a); color:var(--c-muted); border:1px solid var(--border); cursor:pointer;">Deselect All</button>'
            + '</div>';
        html += '<div style="max-height:280px; overflow-y:auto; border:1px solid var(--c-surface-5b); border-radius:8px; padding:4px;">';
        recs.forEach(function(rec, i) {
            var preview = (rec.text || '').substring(0, 200) + (rec.text.length > 200 ? '...' : '');
            html += _contentCard('rec', i, bpIcon('message', 14),
                rec.from || 'Anonymous',
                (rec.title ? rec.title : '') + (rec.company ? ' at ' + rec.company : '') + (rec.date ? ' \u00B7 ' + rec.date : ''),
                '<div style="font-style:italic; color:var(--text-secondary);">\u201C' + escapeHtml(preview) + '\u201D</div>'
            );
        });
        html += '</div>';
    }
    
    // ── ARTICLES ──
    var articles = lc.articles || [];
    if (articles.length > 0) {
        html += _sectionHeader(bpIcon('file-text', 16), 'Articles', articles.length, 'Published thought leadership. Signals expertise and communication ability.');
        html += '<div style="display:flex; gap:8px; margin-bottom:8px;">'
            + '<button onclick="contentToggleAllSection(\'art\',' + articles.length + ',true)" style="padding:3px 10px; border-radius:6px; font-size:0.72em; font-weight:600; background:rgba(16,185,129,0.08); color:#10b981; border:1px solid rgba(16,185,129,0.15); cursor:pointer;">Select All</button>'
            + '<button onclick="contentToggleAllSection(\'art\',' + articles.length + ',false)" style="padding:3px 10px; border-radius:6px; font-size:0.72em; font-weight:600; background:var(--c-surface-4a); color:var(--c-muted); border:1px solid var(--border); cursor:pointer;">Deselect All</button>'
            + '</div>';
        html += '<div style="max-height:280px; overflow-y:auto; border:1px solid var(--c-surface-5b); border-radius:8px; padding:4px;">';
        articles.forEach(function(art, i) {
            var preview = (art.text || '').substring(0, 180) + (art.text && art.text.length > 180 ? '...' : '');
            html += _contentCard('art', i, bpIcon('edit', 14),
                art.title || 'Untitled',
                (art.created || '') + (art.wordCount ? ' \u00B7 ' + art.wordCount.toLocaleString() + ' words' : ''),
                preview ? '<div style="color:var(--text-muted);">' + escapeHtml(preview) + '</div>' : ''
            );
        });
        html += '</div>';
    }
    
    // ── POSTS ──
    var posts = lc.posts || [];
    if (posts.length > 0) {
        html += _sectionHeader(bpIcon('message', 16), 'Posts', posts.length, 'Substantial LinkedIn posts (100+ characters). Thought leadership evidence.');
        html += '<div style="display:flex; gap:8px; margin-bottom:8px;">'
            + '<button onclick="contentToggleAllSection(\'post\',' + posts.length + ',true)" style="padding:3px 10px; border-radius:6px; font-size:0.72em; font-weight:600; background:rgba(16,185,129,0.08); color:#10b981; border:1px solid rgba(16,185,129,0.15); cursor:pointer;">Select All</button>'
            + '<button onclick="contentToggleAllSection(\'post\',' + posts.length + ',false)" style="padding:3px 10px; border-radius:6px; font-size:0.72em; font-weight:600; background:var(--c-surface-4a); color:var(--c-muted); border:1px solid var(--border); cursor:pointer;">Deselect All</button>'
            + '</div>';
        html += '<div style="max-height:280px; overflow-y:auto; border:1px solid var(--c-surface-5b); border-radius:8px; padding:4px;">';
        posts.forEach(function(post, i) {
            var preview = (post.content || '').substring(0, 200) + (post.content.length > 200 ? '...' : '');
            html += _contentCard('post', i, bpIcon('send', 14),
                post.date || 'Post',
                '',
                '<div style="color:var(--text-muted);">' + escapeHtml(preview) + '</div>'
            );
        });
        html += '</div>';
    }
    
    // ── ENDORSEMENTS (summary view, not individual toggles) ──
    var endorsements = lc.endorsements || {};
    var endorseKeys = Object.keys(endorsements).sort(function(a,b) { return endorsements[b] - endorsements[a]; });
    if (endorseKeys.length > 0) {
        var totalEndorsements = endorseKeys.reduce(function(s, k) { return s + endorsements[k]; }, 0);
        html += _sectionHeader(bpIcon('trending-up', 16), 'Endorsements', totalEndorsements + ' across ' + endorseKeys.length + ' skills',
            'Peer validation counts. Skills with 10+ endorsements get a level boost, 25+ get two.');
        
        html += '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px;">';
        endorseKeys.forEach(function(skill) {
            var count = endorsements[skill];
            var isHigh = count >= 25;
            var isMed = count >= 10;
            var bg = isHigh ? 'rgba(245,158,11,0.12)' : isMed ? 'rgba(96,165,250,0.1)' : 'var(--c-surface-4a)';
            var color = isHigh ? '#f59e0b' : isMed ? '#60a5fa' : 'var(--c-muted)';
            var boost = isHigh ? ' (+2)' : isMed ? ' (+1)' : '';
            html += '<span style="padding:4px 10px; border-radius:12px; font-size:0.78em; font-weight:600; '
                + 'background:' + bg + '; color:' + color + ';">'
                + escapeHtml(skill) + ' <span style="opacity:0.7;">' + count + '</span>'
                + (boost ? '<span style="font-size:0.85em;">' + boost + '</span>' : '')
                + '</span>';
        });
        html += '</div>';
    }
    
    // ── VOLUNTEERING ──
    var vol = lc.volunteering || [];
    if (vol.length > 0) {
        html += _sectionHeader(bpIcon('heart', 16), 'Volunteering', vol.length, 'Community involvement. Character evidence for scouting reports.');
        vol.forEach(function(v, i) {
            html += _contentCard('vol', i, bpIcon('heart', 14),
                v.role || v.company || 'Volunteer',
                (v.company && v.role ? v.company : '') + (v.cause ? ' \u00B7 ' + v.cause : '')
                    + (v.startDate ? ' \u00B7 ' + v.startDate + (v.endDate ? ' \u2013 ' + v.endDate : '') : ''),
                v.description ? '<div style="color:var(--text-muted);">' + escapeHtml(v.description.substring(0, 200)) + '</div>' : ''
            );
        });
    }
    
    // ── HONORS ──
    var honors = lc.honors || [];
    if (honors.length > 0) {
        html += _sectionHeader(bpIcon('award', 16), 'Honors & Awards', honors.length, 'Recognition and achievements.');
        honors.forEach(function(h, i) {
            html += _contentCard('honor', i, bpIcon('star', 14),
                h.title,
                h.date || '',
                h.description ? '<div style="color:var(--text-muted);">' + escapeHtml(h.description.substring(0, 200)) + '</div>' : ''
            );
        });
    }
    
    // ── CAUSES ──
    var causes = lc.causes || [];
    if (causes.length > 0) {
        html += _sectionHeader(bpIcon('compass', 16), 'Causes', causes.length, 'Values alignment signal. Maps to culture fit in job matching.');
        html += '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px;">';
        causes.forEach(function(c) {
            html += '<span style="padding:5px 12px; border-radius:14px; font-size:0.82em; font-weight:600; '
                + 'background:rgba(16,185,129,0.08); color:#10b981; border:1px solid rgba(16,185,129,0.15); display:inline-flex; align-items:center; gap:4px;">'
                + bpIcon('compass', 12) + ' ' + escapeHtml(c) + '</span>';
        });
        html += '</div>';
    }
    
    // ── ORGANIZATIONS ──
    var orgs = lc.organizations || [];
    if (orgs.length > 0) {
        html += _sectionHeader(bpIcon('briefcase', 16), 'Organizations', orgs.length, 'Professional affiliations and memberships.');
        orgs.forEach(function(o, i) {
            html += _contentCard('org', i, bpIcon('briefcase', 14),
                o.name,
                o.position || '',
                o.description ? '<div style="color:var(--text-muted);">' + escapeHtml(o.description.substring(0, 200)) + '</div>' : ''
            );
        });
    }
    
    // ── LEARNING (summary, not individual items) ──
    var learning = lc.learning || [];
    if (learning.length > 0) {
        html += _sectionHeader(bpIcon('book', 16), 'Learning', learning.length + ' completed', 'LinkedIn Learning courses. Growth signal, not individually weighted.');
        
        // Group by type
        var byType = {};
        learning.forEach(function(l) {
            var t = l.type || 'Course';
            if (!byType[t]) byType[t] = [];
            byType[t].push(l);
        });
        
        html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:8px; margin-bottom:16px;">';
        Object.keys(byType).forEach(function(type) {
            var items = byType[type];
            html += '<div style="padding:10px 14px; background:var(--c-surface-1); border:1px solid var(--c-surface-5b); border-radius:8px;">'
                + '<div style="font-weight:700; color:var(--accent); font-size:1.1em;">' + items.length + '</div>'
                + '<div style="font-size:0.78em; color:var(--c-muted); font-weight:600;">' + escapeHtml(type) + 's completed</div>'
                + '<div style="font-size:0.72em; color:var(--text-muted); margin-top:4px;">'
                + items.slice(0, 3).map(function(l) { return escapeHtml(l.title); }).join(', ')
                + (items.length > 3 ? ', +' + (items.length - 3) + ' more' : '')
                + '</div></div>';
        });
        html += '</div>';
    }
    
    // ── NETWORK ──
    var netSize = lc.networkSize || 0;
    if (netSize > 0) {
        html += '<div style="margin-top:20px; padding:14px; background:var(--c-surface-1); border:1px solid var(--c-surface-5b); border-radius:8px; '
            + 'display:flex; align-items:center; gap:12px;">'
            + '<div style="width:40px; height:40px; border-radius:10px; background:rgba(139,92,246,0.1); display:flex; align-items:center; justify-content:center;">'
            + bpIcon('users', 20) + '</div>'
            + '<div><div style="font-weight:700; color:var(--text-primary); font-size:1em;">' + netSize.toLocaleString() + ' connections</div>'
            + '<div style="font-size:0.78em; color:var(--c-muted);">Professional network size. Context signal for scouting reports.</div></div></div>';
    }
    
    html += '</div>';
    return html;
}

export function renderExportSection() {
    const sharedOutcomes = _bd().outcomes.filter(o => o.shared).length;
    const sharedValues = _bd().values.filter(v => v.selected).length;
    const skillCount = (_sd().skills || []).length;
    var hasJobs = (window._userData.savedJobs || []).filter(function(j) { return j && j.title; }).length > 0;
    
    // Section header helper
    function sectionHead(icon, label) {
        return '<div style="margin-top:28px; margin-bottom:14px; display:flex; align-items:center; gap:8px;">'
            + '<span style="color:var(--c-faint);">' + bpIcon(icon,14) + '</span>'
            + '<div style="font-size:0.78em; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--c-faint);">' + label + '</div>'
            + '<div style="flex:1; height:1px; background:var(--c-surface-4);"></div>'
            + '</div>';
    }
    
    // Export card helper
    function exportCard(opts) {
        var bg = opts.bg || 'var(--c-surface-1)';
        var border = opts.border || 'var(--c-border-mid)';
        var h = '<div style="background:' + bg + '; border:1px solid ' + border + '; border-radius:12px; padding:20px; cursor:pointer;' + (opts.span ? ' grid-column:1/-1;' : '') + '" onclick="' + opts.action + '">'
            + '<div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">'
            + '<span style="color:' + (opts.iconColor || 'var(--c-label)') + ';">' + bpIcon(opts.icon, 22) + '</span>'
            + '<div style="font-weight:600; color:' + (opts.titleColor || 'var(--c-text-alt)') + ';">' + opts.title + '</div>'
            + (opts.badge ? '<span style="font-size:0.7em; padding:2px 8px; border-radius:10px; background:' + opts.badge.bg + '; color:' + opts.badge.color + '; font-weight:600;">' + opts.badge.text + '</span>' : '')
            + '</div>'
            + '<div style="color:var(--c-muted); font-size:0.88em; line-height:1.5;">' + opts.desc + '</div>';
        if (opts.tags) {
            h += '<div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">';
            opts.tags.forEach(function(t) {
                h += '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:' + t.bg + '; color:' + t.color + ';">' + t.text + '</span>';
            });
            h += '</div>';
        }
        h += '</div>';
        return h;
    }
    
    var html = '<div class="blueprint-section">'
        + '<div class="blueprint-section-header">'
        + '<div class="blueprint-section-title">'
        + '<span class="section-icon">' + bpIcon('export',20) + '</span>'
        + '<span>Export Your Blueprint</span>'
        + '</div>'
        + '</div>';
    
    // ── DEMO LOCKDOWN: Only Scouting Report PDF on sample profiles ──
    if (window.isReadOnlyProfile) {
        html += '<div class="coaching-tip">'
            + '<div class="coaching-tip-title">' + bpIcon('lock',14) + ' SAMPLE PROFILE</div>'
            + '<div class="coaching-tip-content">'
            + 'Export options are limited on sample profiles. Generate a Scouting Report PDF to see Blueprint in action. '
            + '<a href="#" onclick="event.preventDefault(); showWaitlist();" style="color:var(--accent); text-decoration:underline;">Sign up</a> to unlock all export formats.'
            + '</div></div>';
        
        html += sectionHead('compass', 'Career Intelligence');
        html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:16px;">';
        html += exportCard({
            icon: 'target', iconColor: '#60a5fa', title: '\u25C8 Scouting Report',
            titleColor: 'var(--c-text-alt)',
            badge: { text: 'PDF', bg: 'rgba(96,165,250,0.2)', color: '#60a5fa' },
            bg: 'var(--c-accent-bg-2c)',
            border: 'var(--c-accent-border-3c)',
            desc: 'Career intelligence report targeted to a specific job. Match analysis, gaps, talking points, and market positioning.',
            action: 'showScoutingReportPicker()',
            tags: [
                { text: 'PDF', bg: 'var(--c-accent-bg-6c)', color: '#60a5fa' },
                { text: 'Match Analysis', bg: 'var(--c-green-bg-5b)', color: '#10b981' }
            ]
        });
        html += '</div>';
        html += '</div>';
        return html;
    }
    
    html += '<div class="coaching-tip">'
        + '<div class="coaching-tip-title">' + bpIcon('lightbulb',14) + ' SHARING SUMMARY</div>'
        + '<div class="coaching-tip-content">'
        + 'Currently sharing <strong>' + sharedOutcomes + ' outcomes</strong>, '
        + '<strong>' + sharedValues + ' values</strong>, and '
        + '<strong>' + skillCount + ' skills</strong>. '
        + 'Adjust selections in the Outcomes and Values tabs.'
        + '</div></div>';
    
    // ── CAREER INTELLIGENCE ──
    html += sectionHead('compass', 'Career Intelligence');
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:16px;">';
    
    // Executive Blueprint (hero)
    html += '<div style="grid-column:1/-1; background:linear-gradient(135deg, rgba(30,64,175,0.15), rgba(96,165,250,0.1)); border:2px solid var(--c-accent-border-5); border-radius:12px; padding:24px; cursor:pointer;" onclick="generateWorkBlueprint()">'
        + '<div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">'
        + '<span style="color:var(--accent);">' + bpIcon('compass',28) + '</span>'
        + '<div>'
        + '<div style="font-size:1.15em; font-weight:700; color:var(--c-accent-deep);">Executive Blueprint</div>'
        + '<div style="font-size:0.85em; color:var(--c-muted);">Recommended for recruiters and hiring managers</div>'
        + '</div></div>'
        + '<div style="color:var(--c-heading); font-size:0.92em; line-height:1.55;">'
        + 'Standalone HTML document with editorial design. Includes executive summary, top competencies, strategic outcomes, values, compensation framework, and career narrative.'
        + '</div>'
        + '<div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">'
        + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:var(--c-green-bg-5b); color:#10b981;">HTML</span>'
        + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:var(--c-accent-bg-6c); color:#60a5fa;">Print to PDF</span>'
        + '<span style="font-size:0.75em; padding:3px 10px; border-radius:20px; background:var(--c-amber-bg-5b); color:#f59e0b;">Email Attachment</span>'
        + '</div></div>';
    
    // Scouting Report
    html += exportCard({
        icon: 'target', iconColor: '#60a5fa', title: '\u25C8 Scouting Report',
        titleColor: 'var(--c-text-alt)',
        badge: { text: 'NEW', bg: 'rgba(96,165,250,0.2)', color: '#60a5fa' },
        bg: 'var(--c-accent-bg-2c)',
        border: 'var(--c-accent-border-3c)',
        desc: 'Career intelligence report targeted to a specific job. Match analysis, gaps, talking points, and market positioning. Choose HTML or PDF.',
        action: 'showScoutingReportPicker()',
        tags: [
            { text: 'HTML', bg: 'var(--c-accent-bg-6c)', color: '#60a5fa' },
            { text: 'PDF', bg: 'var(--c-accent-bg-6c)', color: '#60a5fa' },
            { text: 'Match Analysis', bg: 'var(--c-green-bg-5b)', color: '#10b981' }
        ]
    });
    
    // PDF Summary
    html += exportCard({
        icon: 'pdf', title: 'PDF Summary',
        desc: 'Compact one-to-two page PDF. Outcomes, values, purpose, skills summary, and market context.',
        action: "exportBlueprint('pdf')"
    });
    
    html += '</div>'; // end Career Intelligence grid
    
    // ── JOB-SPECIFIC TOOLS ──
    html += sectionHead('briefcase', 'Job-Specific Tools');
    if (!hasJobs) {
        html += '<div style="padding:14px 18px; background:var(--c-surface-0); border:1px dashed var(--c-border-subtle); border-radius:10px; margin-bottom:16px;">'
            + '<div style="font-size:0.85em; color:var(--c-faint);">'
            + bpIcon('info',14) + ' Save jobs in the Jobs tab to unlock cover letters, interview prep, and resume targeting.'
            + '</div></div>';
    }
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:16px;">';
    
    html += exportCard({
        icon: 'file-text', title: 'Professional Resume',
        desc: 'Traditional resume format with skills, experience, and achievements. HTML file, print to PDF.',
        action: 'generateResume()'
    });
    
    html += exportCard({
        icon: 'send', iconColor: '#10b981', title: 'Cover Letter',
        titleColor: '#10b981',
        bg: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
        border: 'rgba(16,185,129,0.25)',
        desc: 'Cover letter tailored to a saved job. Uses your matched skills, outcomes, and values.',
        action: 'generateCoverLetter()'
    });
    
    html += exportCard({
        icon: 'interview', iconColor: '#fbbf24', title: 'Interview Prep',
        titleColor: '#fbbf24',
        bg: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04))',
        border: 'rgba(251,191,36,0.25)',
        desc: 'STAR stories for matched skills, bridging language for gaps, and talking points for your strengths.',
        action: 'generateInterviewPrep()'
    });
    
    html += '</div>'; // end Job-Specific grid
    
    // ── NETWORKING & PROFILE ──
    html += sectionHead('linkedin', 'Networking & Profile');
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:16px;">';
    
    html += exportCard({
        icon: 'linkedin', iconColor: '#0a66c2', title: 'LinkedIn Profile',
        titleColor: '#0a66c2',
        bg: 'linear-gradient(135deg, rgba(10,102,194,0.12), rgba(10,102,194,0.04))',
        border: 'rgba(10,102,194,0.25)',
        desc: 'Optimized headline, About section, and skills list formatted for LinkedIn. Copy and paste directly.',
        action: 'generateLinkedInProfile()'
    });
    
    html += exportCard({
        icon: 'copy', title: 'Copy to Clipboard',
        desc: 'Plain text summary for pasting into emails, messages, or cover letters.',
        action: 'copyBlueprintText()'
    });
    
    html += '</div>'; // end Networking grid
    
    // ── DATA & BACKUP ── (hidden for sample profiles)
    if (!window.isReadOnlyProfile) {
    html += sectionHead('json', 'Data & Backup');
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:16px;">';
    
    html += exportCard({
        icon: 'json', title: 'JSON Data Export',
        desc: 'Structured data export. Use for backups, imports, or integration with other tools.',
        action: "exportBlueprint('json')"
    });
    
    html += '</div>'; // end Data grid
    }
    
    html += '</div>'; // close blueprint-section
    return html;
}

// ===== VERIFICATIONS TAB (v4.44.35) =====
export function renderVerificationsTab() {
    var verifications = window._userData.verifications || [];
    var skills = _sd().skills || [];
    var html = '';
    
    // ── STATS SUMMARY ──
    var confirmed = verifications.filter(function(v) { return v.status === 'confirmed'; });
    var pending = verifications.filter(function(v) { return v.status === 'pending'; });
    var expired = verifications.filter(function(v) { return v.status === 'expired'; });
    var declined = verifications.filter(function(v) { return v.status === 'declined'; });
    var unverifiedSkills = skills.filter(function(s) {
        return !verifications.some(function(v) { return v.skillName === s.name && v.status === 'confirmed'; });
    });
    
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:12px; margin-bottom:24px;">';
    var statBoxes = [
        { label: 'Verified', count: confirmed.length, color: '#10b981', icon: 'check' },
        { label: 'Pending', count: pending.length, color: '#f59e0b', icon: 'clock' },
        { label: 'Expired', count: expired.length, color: '#6b7280', icon: 'warning' },
        { label: 'Declined', count: declined.length, color: '#ef4444', icon: 'warning' },
        { label: 'Unverified', count: unverifiedSkills.length, color: '#64748b', icon: 'shield' }
    ];
    statBoxes.forEach(function(sb) {
        html += '<div style="padding:14px; background:var(--c-surface-1); border:1px solid var(--c-surface-4); border-radius:10px; text-align:center;">'
            + '<div style="font-size:1.6em; font-weight:700; color:' + sb.color + ';">' + sb.count + '</div>'
            + '<div style="font-size:0.75em; color:var(--c-muted); margin-top:2px;">' + sb.label + '</div>'
            + '</div>';
    });
    html += '</div>';
    
    // ── CREDIBILITY SCALE ──
    html += '<div style="padding:14px; background:var(--c-surface-1); border:1px solid var(--c-surface-4); border-radius:10px; margin-bottom:24px;">'
        + '<div style="font-weight:600; font-size:0.85em; color:var(--c-heading); margin-bottom:10px;">' + bpIcon('scale',15) + ' Credibility Weights</div>'
        + '<div style="display:flex; flex-wrap:wrap; gap:8px;">';
    var weights = [
        { rel: 'Manager / Executive', weight: '2.0x', label: 'Highest', color: '#10b981' },
        { rel: 'Client / Board / Co-founder', weight: '1.8x', label: 'High', color: '#60a5fa' },
        { rel: 'Peer / Industry Peer', weight: '1.5x', label: 'Standard', color: '#a78bfa' },
        { rel: 'Direct Report', weight: '1.3x', label: 'Basic', color: '#9ca3af' }
    ];
    weights.forEach(function(w) {
        html += '<div style="padding:4px 10px; border-radius:8px; font-size:0.75em; background:' + w.color + '15; color:' + w.color + '; border:1px solid ' + w.color + '30;">'
            + '<strong>' + w.weight + '</strong> ' + w.rel + '</div>';
    });
    html += '</div></div>';
    
    // ── ACTION BAR ──
    if (!window.isReadOnlyProfile) {
        html += '<div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px;">';
        if (unverifiedSkills.length > 0) {
            html += '<button onclick="verifyTabRequestNew()" style="display:flex; align-items:center; gap:7px; padding:10px 18px; background:linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08)); border:1px solid rgba(16,185,129,0.3); border-radius:8px; color:#10b981; cursor:pointer; font-weight:600; font-size:0.88em;">'
                + bpIcon('plus',14) + ' Request Verification (' + unverifiedSkills.length + ' unverified)</button>';
        }
        if (expired.length > 0) {
            html += '<button onclick="verifyTabClearExpired()" style="display:flex; align-items:center; gap:7px; padding:10px 18px; background:var(--c-surface-2); border:1px solid var(--c-border-subtle); border-radius:8px; color:var(--c-label); cursor:pointer; font-weight:600; font-size:0.88em;">'
                + bpIcon('trash',14) + ' Clear Expired (' + expired.length + ')</button>';
        }
        html += '</div>';
    }
    
    // ── VERIFIED SKILLS LIST (grouped by rarity) ──
    if (confirmed.length > 0) {
        var vImpactToRarity = { critical: 'rare', high: 'rare', moderate: 'uncommon', standard: 'common', supplementary: 'common' };
        var vTierMeta = {
            rare: { label: 'Rare', icon: 'flame', accent: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04))', border: 'rgba(245,158,11,0.3)' },
            uncommon: { label: 'Uncommon', icon: 'diamond', accent: '#60a5fa', bg: 'linear-gradient(135deg, rgba(96,165,250,0.06), rgba(139,92,246,0.04))', border: 'rgba(96,165,250,0.25)' },
            common: { label: 'Common', icon: 'check', accent: '#6b7280', bg: 'var(--c-surface-1)', border: 'var(--c-surface-4)' }
        };
        var vTierGroups = { rare: [], uncommon: [], common: [] };
        
        confirmed.forEach(function(v) {
            var skill = skills.find(function(s) { return s.name === v.skillName; });
            var impact = skill && typeof getSkillImpact === 'function' ? getSkillImpact(skill) : null;
            var rarity;
            if (skill && skill.category === 'unique') {
                rarity = (skill.userAssessment && skill.userAssessment.rarity) || 'uncommon';
            } else {
                rarity = vImpactToRarity[(impact && impact.level) || 'moderate'] || 'common';
            }
            v._skill = skill;
            v._rarity = rarity;
            vTierGroups[rarity].push(v);
        });

        html += '<div style="margin-bottom:20px;">'
            + '<div style="font-weight:700; font-size:0.92em; color:var(--c-heading); margin-bottom:12px;">' + bpIcon('check',16) + ' Verified Skills (' + confirmed.length + ')</div>';

        ['rare', 'uncommon', 'common'].forEach(function(tKey) {
            var tGroup = vTierGroups[tKey];
            if (tGroup.length === 0) return;
            var tm = vTierMeta[tKey];
            tGroup.sort(function(a,b) { return (a.skillName || '').localeCompare(b.skillName || ''); });

            html += '<div style="margin-bottom:12px; border:1px solid ' + tm.border + '; border-radius:10px; overflow:hidden;">'
                + '<div style="display:flex; align-items:center; gap:8px; padding:10px 16px; background:' + tm.bg + '; border-bottom:1px solid ' + tm.border + ';">'
                + '<span style="color:' + tm.accent + ';">' + bpIcon(tm.icon, 14) + '</span>'
                + '<span style="font-weight:600; font-size:0.82em; color:var(--c-heading);">' + tm.label + '</span>'
                + '<span style="font-size:0.72em; color:var(--c-muted);">' + tGroup.length + ' verified</span>'
                + '</div>';

            html += '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px; padding:12px;">';
            tGroup.forEach(function(v) {
                var skill = v._skill;
                var levelColors = { 'Mastery':'#10b981','Expert':'#fb923c','Advanced':'#a78bfa','Proficient':'#60a5fa','Novice':'#94a3b8' };
                var lv = skill ? skill.level : v.claimedLevel || '?';
                var lvColor = levelColors[lv] || '#6b7280';
                var cred = getCredibilityLabel(v.relationship || 'Other');
                var respondedDate = v.respondedAt ? new Date(v.respondedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

                var suggestedBadge = '';
                if (v.confirmedLevel && v.confirmedLevel !== lv) {
                    var sugColor = levelColors[v.confirmedLevel] || '#6b7280';
                    var sugVal = proficiencyValue(v.confirmedLevel);
                    var claimedVal = proficiencyValue(lv);
                    var arrow = sugVal > claimedVal ? '\u2191' : '\u2193';
                    suggestedBadge = '<span style="font-size:0.68em; padding:2px 7px; border-radius:8px; background:' + sugColor + '18; color:' + sugColor + '; font-weight:600;">' + arrow + ' ' + escapeHtml(v.confirmedLevel) + '</span>';
                }

                html += '<div style="background:var(--c-surface-1); border:1px solid var(--c-surface-4); border-radius:10px; padding:14px; cursor:pointer; transition:all 0.15s; position:relative;" '
                    + 'onclick="openUnifiedSkillEditor(\'' + (v.skillName || '').replace(/'/g, "\\'") + '\')" '
                    + 'onmouseover="this.style.borderColor=\'' + tm.accent + '40\';this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 4px 16px rgba(0,0,0,0.2)\'" '
                    + 'onmouseout="this.style.borderColor=\'var(--c-surface-4)\';this.style.transform=\'none\';this.style.boxShadow=\'none\'">';

                html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">'
                    + '<div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">'
                    + '<div style="width:10px; height:10px; border-radius:3px; background:' + lvColor + '; flex-shrink:0;"></div>'
                    + '<span style="font-size:0.92em; font-weight:600; color:var(--c-heading); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(v.skillName) + '</span>'
                    + '</div>'
                    + (!window.isReadOnlyProfile ? '<button onclick="event.stopPropagation(); verifyTabRevoke(\'' + (v.id || '').replace(/'/g, "\\'") + '\')" title="Revoke" style="background:none; border:none; cursor:pointer; color:var(--c-faint); padding:2px; opacity:0.4; flex-shrink:0;" onmouseover="this.style.opacity=\'1\';this.style.color=\'#ef4444\'" onmouseout="this.style.opacity=\'0.4\';this.style.color=\'var(--c-faint)\'">' + bpIcon('trash',12) + '</button>' : '')
                    + '</div>';

                html += '<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:10px;">'
                    + '<span style="font-size:0.72em; padding:2px 10px; border-radius:10px; background:' + lvColor + '22; color:' + lvColor + '; font-weight:600;">' + escapeHtml(lv) + '</span>'
                    + suggestedBadge
                    + '<span style="font-size:0.68em; padding:2px 8px; border-radius:10px; background:' + cred.color + '15; color:' + cred.color + '; font-weight:600;">' + cred.weight + 'x ' + cred.label + '</span>'
                    + '</div>';

                html += '<div style="display:flex; align-items:center; gap:8px; padding-top:8px; border-top:1px solid var(--c-surface-4);">'
                    + '<div style="width:24px; height:24px; border-radius:50%; background:rgba(16,185,129,0.15); display:flex; align-items:center; justify-content:center; flex-shrink:0;">'
                    + '<span style="font-size:0.65em; color:#10b981; font-weight:700;">' + (escapeHtml(v.verifierName || 'U').charAt(0).toUpperCase()) + '</span></div>'
                    + '<div style="flex:1; min-width:0;">'
                    + '<div style="font-size:0.8em; font-weight:600; color:var(--c-label);">' + escapeHtml(v.verifierName || 'Unknown') + '</div>'
                    + '<div style="font-size:0.7em; color:var(--c-muted);">' + escapeHtml(v.relationship || 'Peer') + (respondedDate ? ' \u00B7 ' + respondedDate : '') + '</div>'
                    + '</div></div>';

                html += '</div>';
            });
            html += '</div></div>';
        });

        html += '</div>';
    }
    
    // ── PENDING REQUESTS ──
    if (pending.length > 0) {
        html += '<div style="margin-bottom:20px;">'
            + '<div style="font-weight:700; font-size:0.92em; color:#f59e0b; margin-bottom:12px;">' + bpIcon('clock',16) + ' Pending Requests (' + pending.length + ')</div>'
            + '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px;">';
        
        pending.forEach(function(v) {
            var requestedDate = v.requestedAt ? new Date(v.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            var daysPending = v.requestedAt ? Math.floor((Date.now() - new Date(v.requestedAt).getTime()) / 86400000) : 0;
            var urgencyColor = daysPending > 21 ? '#ef4444' : daysPending > 14 ? '#f59e0b' : '#6b7280';
            
            html += '<div style="background:var(--c-surface-1); border:1px solid rgba(245,158,11,0.2); border-radius:10px; padding:14px;">';
            html += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">'
                + '<div style="width:10px; height:10px; border-radius:3px; background:#f59e0b; flex-shrink:0;"></div>'
                + '<span style="font-size:0.92em; font-weight:600; color:var(--c-heading); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(v.skillName) + '</span>'
                + '<span style="font-size:0.68em; padding:2px 8px; border-radius:10px; background:rgba(245,158,11,0.12); color:#f59e0b; font-weight:600;">Pending</span>'
                + '</div>';
            html += '<div style="display:flex; align-items:center; gap:8px; padding-top:8px; border-top:1px solid var(--c-surface-4);">'
                + '<div style="width:24px; height:24px; border-radius:50%; background:rgba(245,158,11,0.12); display:flex; align-items:center; justify-content:center; flex-shrink:0;">'
                + '<span style="font-size:0.65em; color:#f59e0b; font-weight:700;">' + (escapeHtml(v.verifierName || 'U').charAt(0).toUpperCase()) + '</span></div>'
                + '<div style="flex:1; min-width:0;">'
                + '<div style="font-size:0.8em; font-weight:600; color:var(--c-label);">' + escapeHtml(v.verifierName || 'Unknown') + '</div>'
                + '<div style="font-size:0.7em; color:var(--c-muted);">' + (showcaseMode ? '••••@redacted' : escapeHtml(v.verifierEmail || '')) + '</div>'
                + '</div>'
                + '<div style="text-align:right; flex-shrink:0;">'
                + '<div style="font-size:0.7em; color:' + urgencyColor + ';">' + daysPending + 'd ago</div>'
                + (!window.isReadOnlyProfile ? '<button onclick="verifyTabResend(\'' + (v.skillName || '').replace(/'/g, "\\'") + '\')" style="background:none; border:none; cursor:pointer; color:#60a5fa; padding:2px; font-size:0.7em; font-weight:600;">Resend</button>' : '')
                + '</div></div>';
            html += '</div>';
        });
        
        html += '</div></div>';
    }
    
    // ── EXPIRED / DECLINED ──
    if (expired.length > 0 || declined.length > 0) {
        var inactive = expired.concat(declined);
        html += '<div style="margin-bottom:20px;">'
            + '<div style="font-weight:700; font-size:0.92em; color:var(--c-faint); margin-bottom:12px;">' + bpIcon('warning',16) + ' Expired & Declined (' + inactive.length + ')</div>'
            + '<div style="border:1px solid var(--c-surface-4); border-radius:10px; overflow:hidden; opacity:0.65;">';
        
        inactive.forEach(function(v) {
            var statusColor = v.status === 'expired' ? '#6b7280' : '#ef4444';
            var statusLabel = v.status === 'expired' ? 'Expired' : 'Declined';
            
            html += '<div style="display:flex; align-items:center; gap:10px; padding:8px 16px; border-bottom:1px solid var(--c-surface-1b);">'
                + '<div style="flex:1; font-size:0.85em; color:var(--c-muted);">' + escapeHtml(v.skillName) + '</div>'
                + '<div style="font-size:0.8em; color:var(--c-faint);">' + escapeHtml(v.verifierName || '') + '</div>'
                + '<span style="font-size:0.7em; padding:2px 6px; border-radius:8px; background:' + statusColor + '18; color:' + statusColor + ';">' + statusLabel + '</span>'
                + '</div>';
        });
        
        html += '</div></div>';
    }
    
    // ── UNVERIFIED SKILLS (grouped by rarity) ──
    if (unverifiedSkills.length > 0) {
        var uvImpactToRarity = { critical: 'rare', high: 'rare', moderate: 'uncommon', standard: 'common', supplementary: 'common' };
        var uvTierMeta = {
            rare: { label: 'Rare — verify these first', accent: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.25)' },
            uncommon: { label: 'Uncommon', accent: '#60a5fa', bg: 'rgba(96,165,250,0.04)', border: 'rgba(96,165,250,0.2)' },
            common: { label: 'Common', accent: '#6b7280', bg: 'transparent', border: 'var(--c-border-subtle)' }
        };
        var uvTiers = { rare: [], uncommon: [], common: [] };
        var levelColors2 = { 'Mastery':'#10b981','Expert':'#fb923c','Advanced':'#a78bfa','Proficient':'#60a5fa','Novice':'#94a3b8' };

        unverifiedSkills.forEach(function(s) {
            var impact = typeof getSkillImpact === 'function' ? getSkillImpact(s) : null;
            var rarity;
            if (s.category === 'unique') {
                rarity = (s.userAssessment && s.userAssessment.rarity) || 'uncommon';
            } else {
                rarity = uvImpactToRarity[(impact && impact.level) || 'moderate'] || 'common';
            }
            uvTiers[rarity].push(s);
        });

        html += '<div style="background:var(--c-surface-2a, var(--c-surface-1)); border:1px solid var(--c-border-subtle); border-radius:14px; padding:20px 24px; margin-bottom:20px;">'
            + '<div style="font-weight:700; font-size:0.92em; color:var(--c-faint); margin-bottom:6px;">' + bpIcon('shield',16) + ' Unverified Skills (' + unverifiedSkills.length + ')</div>'
            + '<div style="font-size:0.82em; color:var(--c-muted); line-height:1.5; margin-bottom:16px;">'
            + 'These skills lack third-party verification. They are ranked by market rarity so you can prioritize which to verify first. Rare skills carry the most differentiation value.'
            + '</div>';

        ['rare', 'uncommon', 'common'].forEach(function(tKey) {
            var tSkills = uvTiers[tKey];
            if (tSkills.length === 0) return;
            var tm = uvTierMeta[tKey];
            html += '<div style="margin-bottom:12px;">'
                + '<div style="font-size:0.78em; font-weight:600; color:' + tm.accent + '; margin-bottom:8px;">' + tm.label + ' (' + tSkills.length + ')</div>'
                + '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">';
            tSkills.forEach(function(s) {
                var c = levelColors2[s.level] || '#6b7280';
                var escapedName = (s.name || '').replace(/'/g, "\\'");
                html += '<div style="background:var(--c-surface-1); border:1px solid ' + tm.border + '; border-radius:8px; padding:10px 12px; cursor:pointer; transition:all 0.15s;" '
                    + 'onclick="requestVerification([\'' + escapedName + '\'])" '
                    + 'onmouseover="this.style.borderColor=\'' + tm.accent + '\';this.style.transform=\'translateY(-1px)\'" '
                    + 'onmouseout="this.style.borderColor=\'' + tm.border + '\';this.style.transform=\'none\'">'
                    + '<div style="display:flex; align-items:center; gap:8px;">'
                    + '<div style="width:8px; height:8px; border-radius:2px; background:' + c + '; flex-shrink:0;"></div>'
                    + '<span style="font-size:0.85em; font-weight:500; color:var(--c-label); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(s.name) + '</span>'
                    + '<span style="font-size:0.68em; padding:1px 7px; border-radius:8px; background:' + c + '22; color:' + c + '; font-weight:600;">' + escapeHtml(s.level || 'Novice') + '</span>'
                    + '</div>'
                    + '<div style="margin-top:5px; font-size:0.68em; color:' + tm.accent + '; padding-left:16px;">Click to request verification</div>'
                    + '</div>';
            });
            html += '</div></div>';
        });

        html += '</div>';
    }
    
    // ── EMPTY STATE ──
    if (verifications.length === 0 && skills.length > 0) {
        html += '<div style="text-align:center; padding:60px 20px; color:var(--c-faint);">'
            + '<div style="font-size:3em; margin-bottom:16px; opacity:0.3;">' + bpIcon('shield',64) + '</div>'
            + '<div style="font-size:1.1em; font-weight:600; color:var(--c-heading); margin-bottom:8px;">No Verifications Yet</div>'
            + '<div style="font-size:0.9em; max-width:440px; margin:0 auto; line-height:1.5; margin-bottom:20px;">'
            + 'Skill verifications strengthen your profile by having colleagues, managers, and clients confirm your expertise. '
            + 'Higher-credibility verifiers (managers, executives) multiply your evidence scores more than peers.</div>'
            + (!window.isReadOnlyProfile ? '<button onclick="verifyTabRequestNew()" style="padding:12px 24px; background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.92em;">'
            + bpIcon('plus',14) + ' Request Your First Verification</button>' : '')
            + '</div>';
    }
    
    return html;
}

// Verification tab actions
export function verifyTabRequestNew() {
    // Get all unverified skill names
    var verifications = window._userData.verifications || [];
    var skills = _sd().skills || [];
    var unverified = skills.filter(function(s) {
        return !verifications.some(function(v) { return v.skillName === s.name && v.status === 'confirmed'; });
    }).map(function(s) { return s.name; });
    
    if (unverified.length === 0) {
        showToast('All skills are verified!', 'success');
        return;
    }
    // Open the existing request verification modal with unverified skills
    requestVerification(unverified.slice(0, 10)); // Batch max 10 at a time
}
if (!window.verifyTabRequestNew) window.verifyTabRequestNew = verifyTabRequestNew;

export function verifyTabRevoke(verificationId) {
    if (readOnlyGuard()) return;
    if (!confirm('Revoke this verification? The verifier would need to re-verify.')) return;
    var idx = (window._userData.verifications || []).findIndex(function(v) { return v.id === verificationId; });
    if (idx >= 0) {
        window._userData.verifications.splice(idx, 1);
        saveAll();
        switchBlueprintTab('verifications');
        showToast('Verification revoked.', 'info');
    }
}
if (!window.verifyTabRevoke) window.verifyTabRevoke = verifyTabRevoke;

export function verifyTabClearExpired() {
    if (readOnlyGuard()) return;
    window._userData.verifications = (window._userData.verifications || []).filter(function(v) { return v.status !== 'expired'; });
    saveAll();
    switchBlueprintTab('verifications');
    showToast('Expired verifications cleared.', 'info');
}
if (!window.verifyTabClearExpired) window.verifyTabClearExpired = verifyTabClearExpired;

export function verifyTabResend(skillName) {
    requestVerification([skillName]);
}
if (!window.verifyTabResend) window.verifyTabResend = verifyTabResend;

// Blueprint interaction functions
export function toggleOutcomeShare(idx) {
    _bd().outcomes[idx].shared = !_bd().outcomes[idx].shared;
    saveUserData();  // Auto-save
}

export function deleteBlueprintOutcome(idx) {
    if (readOnlyGuard()) return;
    var outcome = _bd().outcomes[idx];
    if (!outcome) return;
    var preview = outcome.text.length > 60 ? outcome.text.substring(0, 60) + '...' : outcome.text;
    if (!confirm('Delete this outcome?\n\n"' + preview + '"')) return;
    _bd().outcomes.splice(idx, 1);
    saveUserData();
    switchBlueprintTab('outcomes');
    showToast('Outcome deleted.', 'info');
}
if (!window.deleteBlueprintOutcome) window.deleteBlueprintOutcome = deleteBlueprintOutcome;

export function editOutcome(idx) {
    if (readOnlyGuard()) return;
    const outcome = _bd().outcomes[idx];
    const modal = document.getElementById('exportModal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-left">
                <h2 class="modal-title">Edit Outcome</h2>
                <p style="color: #9ca3af; margin-top: 5px;">Refine how you describe this achievement</p>
            </div>
            <button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">×</button>
        </div>
        <div class="modal-body" style="padding: 30px;">
            <div style="margin-bottom: 20px;">
                <label class="settings-label">
                    Outcome Text
                </label>
                <textarea id="editOutcomeText" style="
                    width: 100%;
                    min-height: 120px;
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(96, 165, 250, 0.3);
                    border-radius: 8px;
                    color: #e0e0e0;
                    font-size: 1em;
                    line-height: 1.6;
                    font-family: inherit;
                    resize: vertical;
                ">${escapeHtml(outcome.text)}</textarea>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label class="settings-label">
                    Category
                </label>
                <select id="editOutcomeCategory" style="
                    width: 100%;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(96, 165, 250, 0.3);
                    border-radius: 8px;
                    color: #e0e0e0;
                    font-size: 1em;
                ">
                    <option value="Business Impact" ${outcome.category === 'Business Impact' ? 'selected' : ''}>Business Impact</option>
                    <option value="Strategic Foresight" ${outcome.category === 'Strategic Foresight' ? 'selected' : ''}>Strategic Foresight</option>
                    <option value="Crisis Leadership" ${outcome.category === 'Crisis Leadership' ? 'selected' : ''}>Crisis Leadership</option>
                    <option value="Entrepreneurial" ${outcome.category === 'Entrepreneurial' ? 'selected' : ''}>Entrepreneurial</option>
                    <option value="Thought Leadership" ${outcome.category === 'Thought Leadership' ? 'selected' : ''}>Thought Leadership</option>
                    <option value="Advocacy Impact" ${outcome.category === 'Advocacy Impact' ? 'selected' : ''}>Advocacy Impact</option>
                    <option value="Professional Achievement" ${outcome.category === 'Professional Achievement' ? 'selected' : ''}>Professional Achievement</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="editOutcomeSensitive" ${outcome.sensitive ? 'checked' : ''} style="
                        width: 20px;
                        height: 20px;
                        cursor: pointer;
                    ">
                    <span style="color: #ef4444; font-weight: 600;">Mark as Sensitive Content</span>
                </label>
                <p style="color: #9ca3af; font-size: 0.85em; margin-top: 5px; margin-left: 30px;">
                    Flag personal stories (recovery, loss, etc.) that require context before sharing
                </p>
            </div>
            
            <div style="background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <strong style="color: #fbbf24;">${bpIcon('lightbulb',12)} COACHING TIP:</strong>
                <p style="color: #d1d5db; margin-top: 8px; font-size: 0.9em;">
                    Strong outcomes include:
                    <br>• Quantification (numbers, percentages, time saved)
                    <br>• Who benefited (clients, company, team)
                    <br>• What changed as a result
                    <br>• Comparison or context (vs industry average, timeline)
                </p>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end;">
                <button class="action-btn" onclick="closeExportModal()" style="padding: 10px 20px;">
                    Cancel
                </button>
                <button class="export-btn-large" onclick="saveOutcomeEdit(${idx})" style="padding: 10px 20px;">
                    ${bpIcon("save",14)} Save Changes
                </button>
            </div>
        </div>
    `;
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

export function saveOutcomeEdit(idx) {
    if (readOnlyGuard()) return;
    const newText = document.getElementById('editOutcomeText').value;
    const newCategory = document.getElementById('editOutcomeCategory').value;
    const newSensitive = document.getElementById('editOutcomeSensitive').checked;
    
    // Update outcome
    _bd().outcomes[idx].text = newText;
    _bd().outcomes[idx].category = newCategory;
    _bd().outcomes[idx].sensitive = newSensitive;
    
    // Regenerate coaching suggestion
    _bd().outcomes[idx].coachingSuggestion = generateCoachingFor(newText);
    
    // Save to localStorage
    saveUserData();
    
    // Close modal and refresh
    closeExportModal();
    renderBlueprint();
    
    showToast('Outcome updated.', 'success');
}

export function viewOutcomeEvidence(idx) {
    const outcome = _bd().outcomes[idx];
    const skill = _sd().skills.find(s => s.name === outcome.skill);
    if (skill) {
        openSkillModal(outcome.skill, skill);
    }
}

export function addCustomOutcome() {
    if (readOnlyGuard()) return;
    const modal = document.getElementById('exportModal');
    const modalContent = modal.querySelector('.modal-content');
    
    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-header-left">
                <h2 class="modal-title">Add Custom Outcome</h2>
                <p style="color: #9ca3af; margin-top: 5px;">Describe an achievement or impact you've made</p>
            </div>
            <button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">×</button>
        </div>
        <div class="modal-body" style="padding: 30px;">
            <div style="margin-bottom: 20px;">
                <label class="settings-label">
                    Outcome Template
                </label>
                <select id="outcomeTemplate" onchange="fillOutcomeTemplate(this.value)" style="
                    width: 100%;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(96, 165, 250, 0.3);
                    border-radius: 8px;
                    color: #e0e0e0;
                    font-size: 1em;
                    margin-bottom: 15px;
                ">
                    <option value="">-- Choose a template (optional) --</option>
                    <option value="revenue">Revenue/Financial Impact</option>
                    <option value="team">Team Building/Leadership</option>
                    <option value="innovation">Innovation/New Capability</option>
                    <option value="efficiency">Efficiency/Process Improvement</option>
                    <option value="crisis">Crisis Management</option>
                    <option value="strategic">Strategic Initiative</option>
                    <option value="thought">Thought Leadership</option>
                </select>
                
                <textarea id="customOutcomeText" placeholder="Example: Led strategic initiative that increased revenue by 40% year-over-year through new market expansion" style="
                    width: 100%;
                    min-height: 120px;
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(96, 165, 250, 0.3);
                    border-radius: 8px;
                    color: #e0e0e0;
                    font-size: 1em;
                    line-height: 1.6;
                    font-family: inherit;
                    resize: vertical;
                "></textarea>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label class="settings-label">
                    Category
                </label>
                <select id="customOutcomeCategory" style="
                    width: 100%;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(96, 165, 250, 0.3);
                    border-radius: 8px;
                    color: #e0e0e0;
                    font-size: 1em;
                ">
                    <option value="Business Impact">Business Impact</option>
                    <option value="Strategic Foresight">Strategic Foresight</option>
                    <option value="Crisis Leadership">Crisis Leadership</option>
                    <option value="Entrepreneurial">Entrepreneurial</option>
                    <option value="Thought Leadership">Thought Leadership</option>
                    <option value="Advocacy Impact">Advocacy Impact</option>
                    <option value="Professional Achievement">Professional Achievement</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label class="settings-label">
                    Related Skill (Optional)
                </label>
                <select id="customOutcomeSkill" style="
                    width: 100%;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(96, 165, 250, 0.3);
                    border-radius: 8px;
                    color: #e0e0e0;
                    font-size: 1em;
                ">
                    <option value="">-- None --</option>
                    ${_sd().skills.slice().sort((a,b) => a.name.localeCompare(b.name)).map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('')}
                </select>
            </div>
            
            <div style="background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <strong style="color: #fbbf24;">${bpIcon('lightbulb',12)} REFLECTION PROMPTS:</strong>
                <ul style="color: #d1d5db; margin-top: 8px; font-size: 0.9em; margin-left: 20px;">
                    <li>What problem did you solve that others couldn't?</li>
                    <li>What measurable change resulted from your work?</li>
                    <li>Who benefited and how do you know?</li>
                    <li>What would have happened without your contribution?</li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: flex-end;">
                <button class="action-btn" onclick="closeExportModal()" style="padding: 10px 20px;">
                    Cancel
                </button>
                <button class="export-btn-large" onclick="saveCustomOutcome()" style="padding: 10px 20px;">
                    ${bpIcon("plus",14)} Add Outcome
                </button>
            </div>
        </div>
    `;
    
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

export function fillOutcomeTemplate(type) {
    const textarea = document.getElementById('customOutcomeText');
    const templates = {
        revenue: 'Led [initiative] that increased revenue by [X%/amount] through [approach/method]. Resulted in [specific outcome/benefit].',
        team: 'Built and scaled [team/function] from [starting point] to [end state]. Team delivered [key achievements] within [timeframe].',
        innovation: 'Created [new capability/system] that enabled [organization/team] to [achieve what]. Adopted by [number/scope] with [measurable impact].',
        efficiency: 'Redesigned [process/system] reducing [time/cost/effort] by [X%]. Eliminated [waste/bottleneck] affecting [scope/scale].',
        crisis: 'Managed [crisis/incident] under [constraints]. Achieved [outcome] with [metric: zero injuries/minimal impact/rapid resolution].',
        strategic: 'Developed [strategy/framework] for [challenge/opportunity]. Predicted [outcome] [timeframe] ahead of market, enabling [advantage/benefit].',
        thought: 'Published [content type] reaching [audience size]. [Recognition/adoption]: [specific examples of influence/impact].'
    };
    
    if (templates[type]) {
        textarea.value = templates[type];
        if (textarea) textarea.focus();
    }
}

export function saveCustomOutcome() {
    if (readOnlyGuard()) return;
    const text = document.getElementById('customOutcomeText').value.trim();
    if (!text) {
        showToast('Please enter an outcome description.', 'warning');
        return;
    }
    
    const category = document.getElementById('customOutcomeCategory').value;
    const skill = document.getElementById('customOutcomeSkill').value;
    
    // Create new outcome
    const newOutcome = {
        text: text,
        skill: skill || 'Custom',
        category: category,
        shared: true,
        sensitive: false,
        coachingSuggestion: generateCoachingFor(text)
    };
    
    // Add to beginning of outcomes array
    _bd().outcomes.unshift(newOutcome);
    
    // Save
    saveUserData();
    
    // Close and refresh
    closeExportModal();
    renderBlueprint();
    
    showToast('Custom outcome added.', 'success');
}

export function toggleValue(idx) {
    if (readOnlyGuard()) return;
    _bd().values[idx].selected = !_bd().values[idx].selected;
    saveValues();
    refreshValuesUI();
}

export function refreshValuesUI() {
    var contentEl = document.getElementById('blueprintTabContent');
    if (contentEl) contentEl.innerHTML = renderBlueprintTabContent();
    updateValuesBadge();
}

export function updateValuesBadge() {
    var count = _bd().values.filter(function(v) { return v.selected; }).length;
    var tabs = document.querySelectorAll('.bp-tab');
    if (tabs.length > 1) {
        var badge = tabs[1].querySelector('.bp-tab-count');
        if (badge) badge.textContent = count;
    }
}

export function toggleValuesPicker() {
    showingValuesPicker = !showingValuesPicker;
    refreshValuesUI();
}
if (!window.toggleValuesPicker) window.toggleValuesPicker = toggleValuesPicker;

export function pickValue(name) {
    // Toggle: if already selected, remove; otherwise add
    var idx = -1;
    _bd().values.forEach(function(v, i) {
        if (v.name === name) idx = i;
    });
    
    if (idx >= 0) {
        // Remove it
        _bd().values.splice(idx, 1);
    } else {
        // Enforce max 7
        if (_bd().values.length >= 7) {
            showToast('Maximum 7 values. Remove one before adding another.', 'warning');
            return;
        }
        // Add it
        _bd().values.push({
            name: name,
            selected: true,
            inferred: false,
            custom: false
        });
    }
    saveValues();
    refreshValuesUI();
}
if (!window.pickValue) window.pickValue = pickValue;

export function removeSelectedValue(idx) {
    if (readOnlyGuard()) return;
    var value = _bd().values[idx];
    if (!value) return;
    _bd().values.splice(idx, 1);
    saveValues();
    refreshValuesUI();
    showToast('Removed "' + value.name + '".', 'info');
}
if (!window.removeSelectedValue) window.removeSelectedValue = removeSelectedValue;

export function showAddCustomValueForm() {
    // Re-render first to make sure form element exists
    showingValuesPicker = false;
    refreshValuesUI();
    setTimeout(function() {
        var form = document.getElementById('addValueForm');
        if (form) { form.style.display = 'block'; }
        var nameEl = document.getElementById('newValueName');
        if (nameEl) nameEl.focus();
    }, 50);
}
if (!window.showAddCustomValueForm) window.showAddCustomValueForm = showAddCustomValueForm;

export function showAddValueForm() { showAddCustomValueForm(); }
if (!window.showAddValueForm) window.showAddValueForm = showAddValueForm;

export function hideAddValueForm() {
    var form = document.getElementById('addValueForm');
    if (form) form.style.display = 'none';
    var nameEl = document.getElementById('newValueName');
    if (nameEl) nameEl.value = '';
}
if (!window.hideAddValueForm) window.hideAddValueForm = hideAddValueForm;

export function addCustomValue() {
    if (readOnlyGuard()) return;
    var nameEl = document.getElementById('newValueName');
    var name = (nameEl ? nameEl.value : '').trim();
    
    if (!name) {
        showToast('Please enter a value name.', 'warning');
        return;
    }
    
    if (_bd().values.length >= 7) {
        showToast('Maximum 7 values. Remove one before adding another.', 'warning');
        return;
    }
    
    var exists = _bd().values.some(function(v) {
        return v.name.toLowerCase() === name.toLowerCase();
    });
    if (exists) {
        showToast('That value is already in your list.', 'warning');
        return;
    }
    
    _bd().values.push({
        name: name,
        selected: true,
        inferred: false,
        custom: true
    });
    
    saveValues();
    hideAddValueForm();
    refreshValuesUI();
    showToast('Added "' + name + '".', 'success');
}
if (!window.addCustomValue) window.addCustomValue = addCustomValue;

export function moveValue(idx, direction) {
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= _bd().values.length) return;
    var temp = _bd().values[idx];
    _bd().values[idx] = _bd().values[newIdx];
    _bd().values[newIdx] = temp;
    saveValues();
    refreshValuesUI();
}
if (!window.moveValue) window.moveValue = moveValue;
if (!window.toggleValue) window.toggleValue = toggleValue;
if (!window.updatePurpose) window.updatePurpose = updatePurpose;

export function updatePurpose(newPurpose) {
    if (readOnlyGuard()) return;
    _bd().purpose = newPurpose;
    saveValues();
    saveToFirestore();
}

async function generatePurposeAI() {
    if (readOnlyGuard()) return;
    var btn = document.getElementById('purposeAIBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = bpIcon('zap',12) + ' Thinking...'; btn.style.opacity = '0.6'; }

    var profile = window._userData.profile || {};
    var name = profile.name || 'this person';
    var title = profile.currentTitle || '';
    var skills = (skillsData && _sd().skills || []).slice(0, 15).map(function(s) { return s.name; });
    var values = (_bd().values || []).filter(function(v) { return v.selected; }).map(function(v) { return v.name; });
    var roles = (window._userData.workHistory || []).slice(0, 5).map(function(r) { return (r.title || '') + (r.company ? ' at ' + r.company : ''); }).filter(Boolean);
    var recs = ((window._userData.linkedinContent || {}).recommendations || []).slice(0, 3).map(function(r) { return r.text || ''; }).filter(Boolean);

    var context = 'Name: ' + name;
    if (title) context += '\nCurrent role: ' + title;
    if (roles.length) context += '\nCareer history: ' + roles.join('; ');
    if (skills.length) context += '\nTop skills: ' + skills.join(', ');
    if (values.length) context += '\nCore values: ' + values.join(', ');
    if (recs.length) context += '\nWhat colleagues say: ' + recs.map(function(r) { return '"' + r.substring(0, 200) + '"'; }).join(' | ');

    var prompt = 'You are writing a personal purpose statement for a professional. '
        + 'Read everything about this person below, then distill their purpose into 1-2 sentences. '
        + 'Write it as if you are explaining what this person does and why it matters to a classroom of 10-year-old kids. '
        + 'Use simple, vivid language. No jargon. No buzzwords. Make it human and real. '
        + 'Write in first person ("I..."). Just output the purpose statement, nothing else.\n\n'
        + context;

    try {
        var resp = await callAnthropicAPI({
            model: BP_AI_MODEL_FAST,
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }]
        }, null, 'purpose-regen');

        var text = '';
        if (resp.content && resp.content[0]) text = resp.content[0].text || '';
        text = text.replace(/^["']|["']$/g, '').trim();

        if (text) {
            var ta = document.getElementById('contentPurposeEdit');
            if (ta) {
                ta.value = text;
                ta.readOnly = false;
                ta.style.background = 'var(--c-input-bg)';
                ta.style.minHeight = '80px';
            }
            showToast('Purpose generated! Review and click Edit → Save to keep it.', 'success', 4000);
        } else {
            showToast('AI returned an empty response. Try again.', 'error');
        }
    } catch (e) {
        console.error('Purpose AI error:', e);
        showToast('Could not generate purpose: ' + e.message, 'error');
    }

    if (btn) { btn.disabled = false; btn.innerHTML = bpIcon('zap',12) + ' Generate'; btn.style.opacity = '1'; }
}
if (!window.generatePurposeAI) window.generatePurposeAI = generatePurposeAI;

// ═══════════════════════════════════════════════════════════
// BLIND MODE DEFAULTS + PRIVACY AUDIT LOG
// ═══════════════════════════════════════════════════════════

var BLIND_FIELDS = [
    { key: 'identity',     label: 'Identity (name, photo)',  desc: 'Replace name with "Candidate" and hide photo' },
    { key: 'location',     label: 'Location',                desc: 'Hide geographic details' },
    { key: 'employer',     label: 'Employer names',          desc: 'Replace company names with "[Company]"' },
    { key: 'institution',  label: 'Institution names',       desc: 'Replace school and org names with "[Institution]"' },
    { key: 'outcomes',     label: 'Outcome details',         desc: 'Swap to abstracted outcome text' },
    { key: 'compensation', label: 'Compensation data',       desc: 'Hide salary and compensation analysis' }
];

export function getBlindDefaults() {
    var d = window._userData.blindDefaults || {};
    var out = {};
    BLIND_FIELDS.forEach(function(f) { out[f.key] = !!d[f.key]; });
    return out;
}

export function setBlindDefault(key, value) {
    if (!window._userData.blindDefaults) window._userData.blindDefaults = {};
    window._userData.blindDefaults[key] = !!value;
    saveToFirestore();
}

// Temporary per-instance overrides (reset after each report generation)
var _blindOverrides = null;

export function getActiveBlindSettings() {
    var defaults = getBlindDefaults();
    if (_blindOverrides) {
        var merged = {};
        BLIND_FIELDS.forEach(function(f) {
            merged[f.key] = (_blindOverrides[f.key] !== undefined) ? !!_blindOverrides[f.key] : defaults[f.key];
        });
        return merged;
    }
    return defaults;
}

export function hasAnyBlinding(settings) {
    return BLIND_FIELDS.some(function(f) { return settings[f.key]; });
}

export function hasOverrides() {
    if (!_blindOverrides) return false;
    var defaults = getBlindDefaults();
    return BLIND_FIELDS.some(function(f) {
        return _blindOverrides[f.key] !== undefined && !!_blindOverrides[f.key] !== defaults[f.key];
    });
}

// Apply blinding transformations to report data object
export function applyBlindSettings(reportData, blindSettings) {
    if (!blindSettings || !reportData) return reportData;
    var R = reportData;
    
    if (blindSettings.identity) {
        R.candidate.name = 'Anonymous Candidate';
        R.candidate.photo = '?';
        R.candidate.contact = 'Available upon request';
        R.candidate.phone = '';
        R.candidate.linkedin = '';
    }
    if (blindSettings.location) {
        R.candidate.location = 'Location undisclosed';
    }
    if (blindSettings.employer) {
        R.candidate.title = (R.candidate.title || '').replace(/\b[A-Z][\w&'.]+(?:\s+(?:Inc|Corp|LLC|Ltd|Co|Group|Holdings|Technologies|Solutions|Partners|Capital|Consulting|Services|Labs|Systems|Media|Digital|Global|International)\.?)*\b/g, '[Company]');
        if (R.candidate.blindTitle) R.candidate.title = R.candidate.blindTitle;
        (R.workHistory || []).forEach(function(w) { w.company = '[Company]'; });
        R.job.company = R.job.company; // keep target company visible
    }
    if (blindSettings.institution) {
        (R.education || []).forEach(function(e) { e.name = '[Institution]'; });
        (R.certifications || []).forEach(function(c) { if (c.vfLabel) c.vfLabel = '[Issuer]'; });
    }
    if (blindSettings.outcomes) {
        (R.outcomes || []).forEach(function(o) {
            if (o.blind) o.text = o.blind;
            else o.text = (o.text || '').replace(/\b[A-Z][\w&'.]+(?:\s+(?:Inc|Corp|LLC|Ltd|Co)\.?)*\b/g, '[Company]');
        });
    }
    if (blindSettings.compensation) {
        R._hideCompensation = true;
    }
    
    R.blindSettings = blindSettings;
    R._blindedAt = new Date().toISOString();
    return R;
}

// Write privacy audit log entry
export function logPrivacyEvent(type, jobTitle, company, blindSettings, wasOverridden) {
    if (!window._userData.privacyLog) window._userData.privacyLog = [];
    var activePresetKey = (typeof currentPreset !== 'undefined') ? currentPreset : 'custom';
    var entry = {
        ts: new Date().toISOString(),
        type: type, // 'html', 'pdf', 'share'
        job: (jobTitle || '').substring(0, 80),
        company: (company || '').substring(0, 60),
        preset: activePresetKey,
        blind: {},
        overridden: !!wasOverridden
    };
    BLIND_FIELDS.forEach(function(f) {
        if (blindSettings && blindSettings[f.key]) entry.blind[f.key] = true;
    });
    window._userData.privacyLog.push(entry);
    // Cap at 100
    if (window._userData.privacyLog.length > 100) window._userData.privacyLog = window._userData.privacyLog.slice(-100);
    // Debounced save (don't block report generation)
    clearTimeout(window._privLogSaveTimer);
    window._privLogSaveTimer = setTimeout(function() { saveToFirestore(); }, 3000);
}
if (!window.getBlindDefaults) window.getBlindDefaults = getBlindDefaults;
if (!window.setBlindDefault) window.setBlindDefault = setBlindDefault;
if (!window.getActiveBlindSettings) window.getActiveBlindSettings = getActiveBlindSettings;
if (!window.applyBlindSettings) window.applyBlindSettings = applyBlindSettings;
if (!window.logPrivacyEvent) window.logPrivacyEvent = logPrivacyEvent;
if (!window.BLIND_FIELDS) window.BLIND_FIELDS = BLIND_FIELDS;

// ===== SCOUTING REPORT JOB PICKER =====
export function showScoutingReportPicker() {
    var savedJobs = (window._userData.savedJobs || []).filter(function(j) { return j && j.title && j.matchData; });
    
    var modal = document.getElementById('exportModal');
    var modalContent = modal.querySelector('.modal-content');
    
    if (savedJobs.length === 0) {
        modalContent.innerHTML = '<div class="modal-header">'
            + '<div class="modal-header-left"><h2 class="modal-title">\u25C8 Scouting Report</h2></div>'
            + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
            + '</div>'
            + '<div class="modal-body" style="padding:40px 32px; text-align:center;">'
            + '<div style="font-size:2.4em; margin-bottom:16px; opacity:0.5;">' + bpIcon('target',48) + '</div>'
            + '<div style="font-size:1.1em; font-weight:600; color:var(--text-primary); margin-bottom:10px;">No jobs in your pipeline yet</div>'
            + '<div style="font-size:0.9em; color:var(--text-secondary); line-height:1.6; margin-bottom:24px;">'
            + 'Save a job from Find Jobs, or paste a job description in the Jobs tab. Blueprint will score the match and you can generate a targeted scouting report.</div>'
            + '<button onclick="closeExportModal(); switchView(\'jobs\');" style="padding:10px 24px; border-radius:8px; border:none; background:var(--accent); color:#fff; font-weight:600; cursor:pointer;">Go to Jobs</button>'
            + '</div>';
        history.pushState({ modal: true }, '');
        modal.classList.add('active');
        return;
    }
    
    // Sort by match score descending
    savedJobs.sort(function(a, b) { return (b.matchData.score || 0) - (a.matchData.score || 0); });
    
    var jobCardsHTML = savedJobs.map(function(job, idx) {
        var score = (job.matchData && job.matchData.score) || 0;
        var matchedCount = (job.matchData && job.matchData.matched) ? job.matchData.matched.length : 0;
        var gapCount = (job.matchData && job.matchData.gaps) ? job.matchData.gaps.length : 0;
        var scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
        var realIdx = window._userData.savedJobs.indexOf(job);
        
        return '<div onclick="showReportFormatPicker(' + realIdx + ')" style="padding:16px; background:var(--c-surface-2a); '
            + 'border:1px solid var(--c-border-subtle); border-radius:10px; cursor:pointer; transition:border-color 0.2s; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box; overflow:hidden;" '
            + 'onmouseover="this.style.borderColor=\'rgba(96,165,250,0.4)\'" onmouseout="this.style.borderColor=\'var(--c-border-subtle)\'">'
            + '<div style="flex:1; min-width:0;">'
            + '<div style="font-weight:600; color:var(--c-text); margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(job.title) + '</div>'
            + '<div style="font-size:0.82em; color:var(--c-muted);">' + escapeHtml(job.company || 'Unknown company')
            + ' \u00B7 ' + matchedCount + ' matched \u00B7 ' + gapCount + ' gap' + (gapCount !== 1 ? 's' : '') + '</div>'
            + '</div>'
            + '<div style="text-align:center; min-width:56px; margin-left:12px;">'
            + '<div style="font-size:1.5em; font-weight:800; color:' + scoreColor + ';">' + score + '%</div>'
            + '<div style="font-size:0.65em; color:var(--c-muted); text-transform:uppercase; letter-spacing:0.5px;">Match</div>'
            + '</div>'
            + '</div>';
    }).join('');
    
    modalContent.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left"><h2 class="modal-title">\u25C8 Scouting Report</h2></div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px; overflow:hidden; box-sizing:border-box;">'
        + '<div style="font-size:0.88em; color:var(--text-secondary); margin-bottom:16px; line-height:1.5;">'
        + 'Select a job to generate a targeted career intelligence report. This is your scouting report \u2014 built to send to recruiters and hiring managers.</div>'
        + '<div style="display:grid; gap:10px; overflow:hidden; box-sizing:border-box; max-width:100%;">' + jobCardsHTML + '</div>'
        + (window.isReadOnlyProfile ? '' : '<div style="margin-top:16px; padding-top:14px; border-top:1px solid var(--c-surface-5);">'
        + '<button onclick="closeExportModal(); exportBlueprint(\'pdf\')" style="width:100%; padding:10px; border:1px solid var(--c-border-mid); background:transparent; color:var(--text-secondary); border-radius:8px; cursor:pointer; font-size:0.88em;">'
        + 'Or generate a general Blueprint PDF (no job targeting)</button>'
        + '</div>')
        + '</div>';
    
    history.pushState({ modal: true }, '');
    modal.classList.add('active');
}
if (!window.showScoutingReportPicker) window.showScoutingReportPicker = showScoutingReportPicker;

// Shortcut used by match legend, job cards, and job detail CTAs
export function launchScoutingReport() {
    showScoutingReportPicker();
}
if (!window.launchScoutingReport) window.launchScoutingReport = launchScoutingReport;

// Format picker — shown after user selects a job
export function showReportFormatPicker(jobIdx) {
    var job = (window._userData.savedJobs || [])[jobIdx];
    if (!job) { showToast('Job not found.', 'error'); return; }
    
    // Demo mode: show picker but redirect both options to sample report viewer
    if (window.isReadOnlyProfile) {
        var modal = document.getElementById('exportModal');
        var modalContent = modal.querySelector('.modal-content');
        var score = (job.matchData && job.matchData.score) || 0;
        var scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
        
        modalContent.innerHTML = '<div class="modal-header">'
            + '<div class="modal-header-left"><h2 class="modal-title">\u25C8 Scouting Report</h2></div>'
            + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
            + '</div>'
            + '<div class="modal-body" style="padding:24px;">'
            + '<div style="padding:14px 16px; background:var(--c-surface-2a); border:1px solid var(--c-border-subtle); border-radius:10px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">'
            + '<div><div style="font-weight:600;">' + escapeHtml(job.title || 'Untitled') + '</div>'
            + '<div style="font-size:0.82em; color:var(--c-muted);">' + escapeHtml(job.company || 'Unknown company') + '</div></div>'
            + '<div style="font-size:1.3em; font-weight:800; color:' + scoreColor + ';">' + score + '%</div></div>'
            + '<div style="font-size:0.88em; color:var(--text-secondary); margin-bottom:16px;">Choose a format to preview a sample scouting report:</div>'
            + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">'
            // HTML option
            + '<div onclick="viewDemoSampleReport(\'html\')" style="padding:20px; background:var(--c-surface-2a); border:1px solid var(--c-accent-border-3c); border-radius:12px; cursor:pointer; transition:all 0.2s; text-align:center;" '
            + 'onmouseover="this.style.borderColor=\'rgba(96,165,250,0.6)\';this.style.background=\'var(--c-accent-bg-3c)\'" '
            + 'onmouseout="this.style.borderColor=\'var(--c-accent-border-3c)\';this.style.background=\'var(--c-surface-2a)\'">'
            + '<div style="font-size:1.6em; margin-bottom:8px;">' + bpIcon('external', 28) + '</div>'
            + '<div style="font-weight:700; margin-bottom:4px;">Interactive HTML</div>'
            + '<div style="font-size:0.78em; color:var(--text-muted); line-height:1.4;">Shareable web page with D3 networks, blind mode toggles, and full interactivity.</div>'
            + '<div style="margin-top:10px;"><span style="font-size:0.7em; padding:2px 8px; border-radius:10px; background:var(--c-accent-bg-6c); color:#60a5fa; font-weight:600;">HTML</span>'
            + ' <span style="font-size:0.7em; padding:2px 8px; border-radius:10px; background:var(--c-green-bg-5b, rgba(16,185,129,0.15)); color:#10b981; font-weight:600;">Shareable Link</span></div>'
            + '</div>'
            // PDF option
            + '<div onclick="viewDemoSampleReport(\'pdf\')" style="padding:20px; background:var(--c-surface-2a); border:1px solid var(--c-border-subtle); border-radius:12px; cursor:pointer; transition:all 0.2s; text-align:center;" '
            + 'onmouseover="this.style.borderColor=\'rgba(96,165,250,0.6)\';this.style.background=\'var(--c-accent-bg-3c)\'" '
            + 'onmouseout="this.style.borderColor=\'var(--c-border-subtle)\';this.style.background=\'var(--c-surface-2a)\'">'
            + '<div style="font-size:1.6em; margin-bottom:8px;">' + bpIcon('pdf', 28) + '</div>'
            + '<div style="font-weight:700; margin-bottom:4px;">PDF Document</div>'
            + '<div style="font-size:0.78em; color:var(--text-muted); line-height:1.4;">Downloadable PDF for email attachments, ATS uploads, and offline sharing.</div>'
            + '<div style="margin-top:10px;"><span style="font-size:0.7em; padding:2px 8px; border-radius:10px; background:var(--c-accent-bg-6c); color:#60a5fa; font-weight:600;">PDF</span>'
            + ' <span style="font-size:0.7em; padding:2px 8px; border-radius:10px; background:var(--c-amber-bg-5b, rgba(245,158,11,0.15)); color:#f59e0b; font-weight:600;">Attachment</span></div>'
            + '</div>'
            + '</div>'
            + '<div style="margin-top:14px; padding:12px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:8px; text-align:center;">'
            + '<div style="font-size:0.82em; color:#f59e0b; font-weight:600; margin-bottom:4px;">Demo Mode</div>'
            + '<div style="font-size:0.78em; color:var(--text-muted); line-height:1.5;">Sample profiles include pre-built scouting reports you can preview. Sign up to generate your own with your real skills and career data.</div>'
            + '</div>'
            + '<div style="margin-top:10px; text-align:center;">'
            + '<button onclick="showScoutingReportPicker()" style="background:none; border:none; color:var(--text-muted); font-size:0.82em; cursor:pointer; text-decoration:underline;">\u2190 Back to job list</button>'
            + '</div>'
            + '</div>';
        return;
    }
    
    var modal = document.getElementById('exportModal');
    var modalContent = modal.querySelector('.modal-content');
    var score = (job.matchData && job.matchData.score) || 0;
    var scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    
    // Reset per-instance overrides
    _blindOverrides = null;
    
    // Build blind override toggles
    var blindDefaults = getBlindDefaults();
    var anyBlind = hasAnyBlinding(blindDefaults);
    var blindHTML = '<div style="margin-top:16px; border-top:1px solid var(--c-border-subtle); padding-top:14px;">'
        + '<div onclick="var p=this.nextElementSibling; var c=this.querySelector(\'.bp-chev\'); if(p.style.display===\'none\'){p.style.display=\'block\';c.style.transform=\'rotate(90deg)\';}else{p.style.display=\'none\';c.style.transform=\'rotate(0deg)\';}" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between;">'
        + '<div style="display:flex; align-items:center; gap:6px;">'
        + bpIcon('privacy', 14) + '<span style="font-size:0.85em; font-weight:600;">Privacy for this report</span>'
        + (anyBlind ? '<span style="font-size:0.68em; padding:1px 6px; border-radius:6px; background:rgba(16,185,129,0.12); color:#10b981; font-weight:600;">ON</span>' : '')
        + '</div>'
        + '<div class="bp-chev" style="color:var(--text-muted); transition:transform 0.2s; transform:rotate(0deg);">' + bpIcon('chevron-right', 14) + '</div>'
        + '</div>'
        + '<div style="display:none; margin-top:10px;">';
    
    BLIND_FIELDS.forEach(function(f) {
        var isOn = blindDefaults[f.key];
        blindHTML += '<div style="display:flex; align-items:center; justify-content:space-between; padding:7px 0; border-bottom:1px solid var(--c-border-subtle);">'
            + '<div style="flex:1; min-width:0;"><div style="font-size:0.82em; font-weight:500;">' + f.label + '</div>'
            + '<div style="font-size:0.68em; color:var(--text-muted);">' + f.desc + '</div></div>'
            + '<div class="rpt-toggle' + (isOn ? ' on' : '') + '" id="fmtBlind_' + f.key + '" onclick="this.classList.toggle(\'on\'); if(!window._blindOverrides)window._blindOverrides={}; window._blindOverrides[\'' + f.key + '\']=this.classList.contains(\'on\');" style="flex-shrink:0;"></div>'
            + '</div>';
    });
    
    blindHTML += '<div style="margin-top:8px; padding:8px 10px; background:rgba(245,158,11,0.07); border:1px solid rgba(245,158,11,0.18); border-radius:6px;">'
        + '<div style="font-size:0.72em; color:#f59e0b; line-height:1.5;">'
        + bpIcon('warning', 10) + ' Overrides apply to this report only. Defaults are managed in <a onclick="closeExportModal(); switchView(\'settings\'); setTimeout(function(){ window.currentSettingsTab=\'privacy\'; initSettings(); },100);" style="color:#60a5fa; cursor:pointer; text-decoration:underline;">Settings &gt; Privacy</a>.</div></div>'
        + '</div></div>';
    
    modalContent.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left"><h2 class="modal-title">\u25C8 Scouting Report</h2></div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00D7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px;">'
        + '<div style="padding:14px 16px; background:var(--c-surface-2a); border:1px solid var(--c-border-subtle); border-radius:10px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">'
        + '<div><div style="font-weight:600;">' + escapeHtml(job.title || 'Untitled') + '</div>'
        + '<div style="font-size:0.82em; color:var(--c-muted);">' + escapeHtml(job.company || 'Unknown company') + '</div></div>'
        + '<div style="font-size:1.3em; font-weight:800; color:' + scoreColor + ';">' + score + '%</div></div>'
        + '<div style="font-size:0.88em; color:var(--text-secondary); margin-bottom:16px;">Choose a format for your scouting report:</div>'
        + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">'
        // HTML option
        + '<div onclick="generateHTMLScoutingReport(' + jobIdx + ')" style="padding:20px; background:var(--c-surface-2a); border:1px solid var(--c-accent-border-3c); border-radius:12px; cursor:pointer; transition:all 0.2s; text-align:center;" '
        + 'onmouseover="this.style.borderColor=\'rgba(96,165,250,0.6)\';this.style.background=\'var(--c-accent-bg-3c)\'" '
        + 'onmouseout="this.style.borderColor=\'var(--c-accent-border-3c)\';this.style.background=\'var(--c-surface-2a)\'">'
        + '<div style="font-size:1.6em; margin-bottom:8px;">' + bpIcon('external', 28) + '</div>'
        + '<div style="font-weight:700; margin-bottom:4px;">Interactive HTML</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted); line-height:1.4;">Shareable web page with D3 networks, blind mode toggles, and full interactivity.</div>'
        + '<div style="margin-top:10px;"><span style="font-size:0.7em; padding:2px 8px; border-radius:10px; background:var(--c-accent-bg-6c); color:#60a5fa; font-weight:600;">HTML</span>'
        + ' <span style="font-size:0.7em; padding:2px 8px; border-radius:10px; background:var(--c-green-bg-5b, rgba(16,185,129,0.15)); color:#10b981; font-weight:600;">Shareable Link</span></div>'
        + '</div>'
        // PDF option
        + '<div onclick="generateScoutingReport(' + jobIdx + ')" style="padding:20px; background:var(--c-surface-2a); border:1px solid var(--c-border-subtle); border-radius:12px; cursor:pointer; transition:all 0.2s; text-align:center;" '
        + 'onmouseover="this.style.borderColor=\'rgba(96,165,250,0.6)\';this.style.background=\'var(--c-accent-bg-3c)\'" '
        + 'onmouseout="this.style.borderColor=\'var(--c-border-subtle)\';this.style.background=\'var(--c-surface-2a)\'">'
        + '<div style="font-size:1.6em; margin-bottom:8px;">' + bpIcon('pdf', 28) + '</div>'
        + '<div style="font-weight:700; margin-bottom:4px;">PDF Document</div>'
        + '<div style="font-size:0.78em; color:var(--text-muted); line-height:1.4;">Downloadable PDF for email attachments, ATS uploads, and offline sharing.</div>'
        + '<div style="margin-top:10px;"><span style="font-size:0.7em; padding:2px 8px; border-radius:10px; background:var(--c-accent-bg-6c); color:#60a5fa; font-weight:600;">PDF</span>'
        + ' <span style="font-size:0.7em; padding:2px 8px; border-radius:10px; background:var(--c-amber-bg-5b, rgba(245,158,11,0.15)); color:#f59e0b; font-weight:600;">Attachment</span></div>'
        + '</div>'
        + '</div>'
        + blindHTML
        + '<div style="margin-top:14px; text-align:center;">'
        + '<button onclick="showScoutingReportPicker()" style="background:none; border:none; color:var(--text-muted); font-size:0.82em; cursor:pointer; text-decoration:underline;">← Back to job list</button>'
        + '</div>'
        + '</div>';
}
if (!window.showReportFormatPicker) window.showReportFormatPicker = showReportFormatPicker;

// HTML scouting report generator (placeholder — generator bridge coming)
export function generateHTMLScoutingReport(jobIdx) {
    // Demo lockdown: redirect to sample report viewer
    if (window.isReadOnlyProfile) {
        viewDemoSampleReport('html');
        return;
    }
    var job = (window._userData.savedJobs || [])[jobIdx];
    if (!job) { showToast('Job not found.', 'error'); return; }
    logAnalyticsEvent('scouting_report_html', { company: job.company || '', title: job.title || '' });
    closeExportModal();
    showToast('Generating scouting report…', 'info', 2000);
    
    // Build REPORT_DATA from live app state
    var reportData = buildReportData(jobIdx);
    if (!reportData) return;
    
    // Apply blind settings (defaults + any per-instance overrides)
    var blindSettings = getActiveBlindSettings();
    var overridden = hasOverrides();
    applyBlindSettings(reportData, blindSettings);
    
    // Privacy audit log
    logPrivacyEvent('html', job.title, job.company, blindSettings, overridden);
    
    // Clear per-instance overrides
    _blindOverrides = null;
    
    // Render in iframe overlay with Share button
    showReportOverlay(reportData, jobIdx);
}
if (!window.generateHTMLScoutingReport) window.generateHTMLScoutingReport = generateHTMLScoutingReport;

// ── Build REPORT_DATA from live state ────────────────────
export function buildReportData(jobIdx) {
    var job = (window._userData.savedJobs || [])[jobIdx];
    if (!job) return null;
    
    var profile = window._userData.profile || {};
    var allSkills = _sd().skills || [];
    var allRoles = typeof getVisibleRoles === 'function' ? getVisibleRoles() : (_sd().roles || []);
    var matchData = job.matchData || { score: 0, matched: [], gaps: [], surplus: [] };
    var matched = matchData.matched || [];
    var gaps = matchData.gaps || [];
    var userValues = _bd().values || [];
    var userOutcomes = _bd().outcomes || [];
    var userPurpose = _bd().purpose || '';
    var userEdu = window._userData.education || [];
    var userCerts = window._userData.certifications || [];
    
    if (!job.companyValues) job.companyValues = getCompanyValues(job.company, job.rawText || job.description || '');
    var valAlign = computeValuesAlignment(userValues, job.companyValues);
    
    // Roles
    var roleColors = ['#60a5fa', '#a855f7', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#fb923c', '#38bdf8', '#84cc16'];
    var activeRoleIds = new Set();
    // Normalize: handle both s.roles (array) and s.role (string) formats
    var roleNameToId = {};
    allRoles.forEach(function(r) { roleNameToId[r.name] = r.id; });
    allSkills.forEach(function(s) {
        if (!s.roles && s.role) { s.roles = [roleNameToId[s.role] || s.role]; }
        (s.roles || []).forEach(function(r) { activeRoleIds.add(r); });
    });
    var roles = allRoles.filter(function(r) { return activeRoleIds.has(r.id); }).map(function(r, i) {
        return { id: r.id, name: r.name, color: r.color || roleColors[i % roleColors.length] };
    });
    // Build set of valid role IDs for filtering skill→role references
    var validRoleIds = new Set(roles.map(function(r) { return r.id; }));
    
    // Filter skills for visualization: only include skills connected to a visible role
    // Unconnected skills (no role assignments) become floaters in D3 graphs
    var connectedSkills = allSkills.filter(function(s) {
        var skillRoles = s.roles || [];
        return skillRoles.some(function(rid) { return validRoleIds.has(rid); });
    });
    
    // Skills — use ALL skills for counts/stats, connected only for network rendering
    var jobRequiredNames = getJobSkills(job).filter(function(s) {
        var req = (typeof s === 'string') ? 'Required' : (s.tier || s.requirement || 'Required');
        return req === 'Required' || req === 'required';
    }).map(function(s) { return typeof s === 'string' ? s : s.name; });
    var jobRequiredSet = new Set(jobRequiredNames.map(function(n) { return n.toLowerCase(); }));
    
    // Build full skill set (for stats) and network skill set (for D3)
    var reportSkills = allSkills.map(function(s) {
        var sk = { n: s.name, l: s.level || 'Proficient', r: (s.roles || []).filter(function(rid) { return validRoleIds.has(rid); }) };
        // Mark as matched (green) if skill appears in matchData.matched OR in job's required skills
        var isMatched = matched.some(function(m) {
            return m.userSkill.toLowerCase() === s.name.toLowerCase();
        });
        var isRequired = jobRequiredSet.has(s.name.toLowerCase()) || isMatched;
        if (isRequired) sk.k = 1;
        // Carry source flags for preset filtering
        sk._key = !!s.key;
        sk._level = s.level || 'Proficient';
        var ev = (s.evidence || []).map(function(e) {
            if (typeof e === 'string') return e;
            return ((e.outcome || '') + ' ' + (e.description || '')).trim();
        }).filter(Boolean).join(' ');
        if (ev) sk.ev = ev.substring(0, 300);
        var certMatch = userCerts.find(function(c) { return (c.skills || []).some(function(cs) { return cs.toLowerCase() === s.name.toLowerCase(); }); });
        var eduMatch = userEdu.find(function(e) { return (e.skills || []).some(function(es) { return es.toLowerCase() === s.name.toLowerCase(); }); });
        if (certMatch) { sk.vf = 'cert'; sk.vfLabel = certMatch.name; }
        else if (eduMatch) { sk.vf = 'edu'; sk.vfLabel = eduMatch.name; }
        else if (isRequired && ev) { sk.vf = 'verified'; }
        return sk;
    });
    
    // Sharing preset filtering — job-matched skills always included
    var activePreset = (typeof currentPreset !== 'undefined') ? currentPreset : 'custom';
    if (activePreset !== 'full' && activePreset !== 'custom') {
        var levelRank = { 'Mastery': 5, 'Expert': 4, 'Advanced': 3, 'Proficient': 2, 'Novice': 1 };
        reportSkills = reportSkills.filter(function(sk) {
            if (sk.k) return true; // always keep job-matched
            if (activePreset === 'executive') return true; // keep all, trim below
            if (activePreset === 'advisory') return sk._key;
            if (activePreset === 'board') return sk._key || sk._level === 'Mastery';
            return true;
        });
        // Executive: keep job-matched + top 20 non-matched by level rank
        if (activePreset === 'executive') {
            var jobMatched = reportSkills.filter(function(sk) { return sk.k; });
            var surplus = reportSkills.filter(function(sk) { return !sk.k; });
            surplus.sort(function(a, b) { return (levelRank[b._level] || 0) - (levelRank[a._level] || 0); });
            reportSkills = jobMatched.concat(surplus.slice(0, 20));
        }
    }
    // Clean temp flags
    reportSkills.forEach(function(sk) { delete sk._key; delete sk._level; });
    
    // Gaps
    var reportGaps = gaps.map(function(g) {
        var adjacentSkills = connectedSkills.filter(function(s) {
            var words = g.name.toLowerCase().split(/[\s\-\/&]+/).filter(function(w) { return w.length > 3; });
            return words.some(function(w) { return s.name.toLowerCase().indexOf(w) !== -1; });
        }).slice(0, 3).map(function(s) { return s.name; });
        return { n: g.name, rq: g.requirement || 'Required', br: adjacentSkills.length > 0
            ? 'Adjacent skills (' + adjacentSkills.join(', ') + ') suggest a bridgeable gap with targeted development.'
            : 'No directly adjacent skills identified. Targeted upskilling recommended.', adj: adjacentSkills };
    });
    
    // Values
    var candidateValues = userValues.filter(function(v) { return v.selected; }).map(function(v) {
        var isAligned = valAlign && valAlign.aligned && valAlign.aligned.some(function(a) { return a.name === v.name; });
        return { n: v.name, s: isAligned ? 'aligned' : 'yours' };
    });
    var companyValuesList = [];
    if (job.companyValues) {
        (job.companyValues.primary || []).forEach(function(v) {
            var isAligned = candidateValues.some(function(cv) { return cv.n === v && cv.s === 'aligned'; });
            companyValuesList.push({ n: v, t: 'primary', s: isAligned ? 'aligned' : 'theirs' });
        });
        (job.companyValues.secondary || []).forEach(function(v) {
            var isAligned = candidateValues.some(function(cv) { return cv.n === v && cv.s === 'aligned'; });
            companyValuesList.push({ n: v, t: 'secondary', s: isAligned ? 'aligned' : 'theirs' });
        });
    }
    
    // Outcomes — filter by preset
    var reportOutcomes = userOutcomes.filter(function(o) { return o.shared !== false; });
    if (activePreset === 'advisory') {
        reportOutcomes = reportOutcomes.filter(function(o) {
            return o.category === 'Strategic Foresight' || o.category === 'Thought Leadership' || o.category === 'Business Impact';
        });
    } else if (activePreset === 'board') {
        reportOutcomes = reportOutcomes.filter(function(o) {
            return o.category === 'Business Impact' || o.category === 'Crisis Leadership' || o.category === 'Entrepreneurial';
        });
    }
    reportOutcomes = reportOutcomes.slice(0, 6).map(function(o) {
        var text = (o.text || o.outcome || '');
        return { text: text, blind: text.replace(/[\w]+\s+(Inc|Corp|LLC|Ltd|Co)\.?/gi, '[Company]') };
    });
    
    // Values — filter by preset (re-filter for report inclusion, keeps alignment data above intact)
    if (activePreset === 'board') {
        candidateValues = candidateValues.filter(function(cv) {
            return userValues.some(function(v) { return v.name === cv.n && (v.category === 'Leadership' || v.key); });
        });
    }
    
    // Narrative
    var topMatched = matched.filter(function(m) { return m.requirement === 'Required'; }).slice(0, 3);
    var topSkillNames = topMatched.map(function(m) { return m.userSkill; }).join(', ');
    var narrative = (profile.name || 'This candidate') + ' brings ';
    if (topSkillNames) narrative += 'demonstrated expertise in ' + topSkillNames + ' \u2014 ';
    narrative += matched.length + ' of ' + (matched.length + gaps.length) + ' required competencies are matched';
    if (gaps.length > 0) narrative += ' with ' + gaps.length + ' gap' + (gaps.length !== 1 ? 's' : '') + ' identified in areas where adjacent skills suggest a bridgeable trajectory.';
    else narrative += ' with no significant gaps identified.';
    
    // Domains (based on connected skills only — these drive the visualization)
    var reportDomains = roles.map(function(role) {
        var c = connectedSkills.filter(function(s) { return (s.roles || []).indexOf(role.id) !== -1; }).length;
        return { n: role.name, c: c, m: connectedSkills.length, cl: role.color };
    }).filter(function(d) { return d.c > 0; });
    
    // Proficiency (full portfolio — all skills regardless of role connection)
    var proficiency = { Mastery: 0, Expert: 0, Advanced: 0, Proficient: 0, Novice: 0 };
    allSkills.forEach(function(s) { var lv = s.level || 'Proficient'; if (proficiency.hasOwnProperty(lv)) proficiency[lv]++; });
    
    return {
        candidate: {
            name: profile.name || 'Anonymous Candidate',
            photo: (profile.name || 'A').charAt(0).toUpperCase(),
            title: profile.currentTitle || profile.title || '',
            location: profile.location || 'Location undisclosed',
            contact: profile.email || 'Available upon request',
            phone: profile.phone || '',
            linkedin: profile.linkedin || profile.linkedinUrl || '',
            purpose: userPurpose,
            blindTitle: (profile.currentTitle || 'Professional').replace(/[\w]+\s+(Inc|Corp|LLC|Ltd|Co)\.?/gi, '')
        },
        workHistory: getVisibleWorkHistory().slice(0, 5).map(function(w) {
            var dates = w.dates || w.years || '';
            if (!dates) {
                var start = w.startYear || (w.startDate ? w.startDate.split('-')[0] : '');
                var end = w.current ? 'Present' : (w.endYear || (w.endDate === 'Present' ? 'Present' : (w.endDate ? w.endDate.split('-')[0] : '')));
                if (start || end) dates = [start, end].filter(Boolean).join('-');
            }
            return { title: w.title || w.role || '', company: w.company || w.organization || '', dates: dates, description: w.description || '' };
        }),
        job: { title: job.title || 'Untitled Position', company: job.company || 'Undisclosed', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
        match: { percentage: matchData.score || 0, narrative: narrative },
        roles: roles,
        skills: reportSkills,
        networkSkills: reportSkills.filter(function(sk) { return (sk.r && sk.r.length > 0) || sk.k === 1; }),
        jobMatchSkills: reportSkills.filter(function(sk) { return sk.k === 1; }),
        totalSkillCount: allSkills.length,
        sharingPreset: activePreset,
        jobRequired: jobRequiredNames,
        gaps: reportGaps,
        values: { score: valAlign ? valAlign.score : 0, narrative: 'Cultural Fit Signal — ' + ((valAlign ? (valAlign.aligned || []).length : 0) + ' shared values identified.'), candidate: candidateValues, company: companyValuesList },
        outcomes: reportOutcomes,
        education: userEdu.map(function(e) { return { name: e.institution || e.name || '', desc: (e.degree || '') + (e.field ? ' — ' + e.field : ''), location: e.location || '', dates: e.dates || e.year || '', vf: 'edu', skills: e.skills || [] }; }),
        certifications: userCerts.map(function(c) { return { name: c.name || '', vf: 'cert', vfLabel: c.issuer || c.name || '', desc: c.description || c.issuer || '', dates: c.dates || c.year || '', status: c.status || '', skills: c.skills || [] }; }),
        domains: reportDomains,
        proficiency: proficiency
    };
}
if (!window.buildReportData) window.buildReportData = buildReportData;

// ── Show report in overlay with Share button ──────────────
export function showReportOverlay(reportData, jobIdx) {
    var existing = document.getElementById('scoutReportOverlay');
    if (existing) existing.remove();
    
    // Fetch template, inject data, render in blob iframe
    fetch('reports/templates/base.html')
        .then(function(res) {
            if (!res.ok) throw new Error('Template not found');
            return res.text();
        })
        .then(function(template) {
            var safeDataStr = encodeURIComponent(JSON.stringify(reportData));
            var injected = template.replace(/const REPORT_DATA = \{[\s\S]*?\n\};/, 'const REPORT_DATA = JSON.parse(decodeURIComponent("' + safeDataStr + '"));');
            
            // Patch template: swap skills→networkSkills for D3 visualization
            // but preserve totalSkillCount for overview stats display
            var patchScript = '<script>'
                + 'if(typeof REPORT_DATA!=="undefined"&&REPORT_DATA.networkSkills){'
                + 'REPORT_DATA._allSkills=REPORT_DATA.skills;'
                + 'REPORT_DATA.skills=REPORT_DATA.networkSkills;'
                + 'REPORT_DATA.totalSkillCount=REPORT_DATA.totalSkillCount||REPORT_DATA._allSkills.length;'
                + 'REPORT_DATA.jobMatchSkills=REPORT_DATA.jobMatchSkills||REPORT_DATA.skills.filter(function(s){return s.k===1;});'
                + '}'
                + '<\/script>';
            
            // Inject CSS overrides for D3 networks to match main app aesthetic
            var patchCSS = '<style>'
                + '.network-container, .skills-network, .job-match-network, .candidate-network, [id*="network"], [id*="skills-map"], [id*="skillsMap"], [class*="network"] {'
                + '  background: #0a0e1a !important;'
                + '  border-radius: 12px !important;'
                + '}'
                + 'svg line, svg path.link {'
                + '  stroke: rgba(255,255,255,0.025) !important;'
                + '  stroke-width: 0.5px !important;'
                + '  stroke-opacity: 1 !important;'
                + '}'
                + 'svg text { font-family: "Inter", "Outfit", system-ui, sans-serif !important; }'
                + '</style>';
            
            // Inject JS to recolor D3 network nodes after rendering
            // Post-render approach: polls SVG circles and recolors by __data__ category
            var patchColors = '<script>'
                + '(function() {'
                + '  var bpColors = {'
                + '    skill:"#60a5fa", ability:"#a78bfa", workstyle:"#f59e0b",'
                + '    knowledge:"#10b981", workactivity:"#ec4899",'
                + '    unique:"#fbbf24", trade:"#f97316",'
                + '    "General Professional":"#60a5fa", Technology:"#818cf8",'
                + '    "Business & Management":"#f59e0b", "Marketing & Sales":"#ec4899",'
                + '    "Finance & Accounting":"#10b981", "HR & Talent":"#a78bfa",'
                + '    "Healthcare":"#06b6d4", Engineering:"#8b5cf6",'
                + '    Legal:"#f97316", "Creative & Design":"#f472b6",'
                + '    Transversal:"#94a3b8"'
                + '  };'
                + '  function recolorNetwork() {'
                + '    document.querySelectorAll("svg circle").forEach(function(c) {'
                + '      var d = c.__data__;'
                + '      if (!d) return;'
                + '      var cat = d.category || d.cat || d.type || d.group || "";'
                + '      var color = bpColors[cat] || (cat.toLowerCase ? bpColors[cat.toLowerCase()] : null);'
                + '      if (color) { c.setAttribute("fill", color); c.style.fill = color; }'
                + '      if (d.isRole || d.type === "role" || d.nodeType === "role") {'
                + '        c.setAttribute("fill", "rgba(255,255,255,0.06)");'
                + '        c.setAttribute("stroke", "rgba(255,255,255,0.2)");'
                + '        c.setAttribute("stroke-width", "1.5");'
                + '      }'
                + '      if (d.isCenter || d.nodeType === "center" || d.id === "center") {'
                + '        c.setAttribute("fill", "#a5d8ff");'
                + '      }'
                + '    });'
                + '    document.querySelectorAll("svg line, svg path.link").forEach(function(l) {'
                + '      l.setAttribute("stroke", "rgba(255,255,255,0.025)");'
                + '      l.setAttribute("stroke-width", "0.5");'
                + '      l.style.stroke = "rgba(255,255,255,0.025)";'
                + '      l.style.strokeWidth = "0.5";'
                + '      l.style.strokeOpacity = "1";'
                + '    });'
                + '    document.querySelectorAll("svg").forEach(function(svg) {'
                + '      var linkG = svg.querySelector("g.links, g.link-layer, g[class*=link]");'
                + '      if (linkG && linkG.parentNode) { linkG.parentNode.insertBefore(linkG, linkG.parentNode.firstChild); return; }'
                + '      var lines = Array.from(svg.querySelectorAll("line"));'
                + '      if (lines.length === 0) return;'
                + '      var parent = lines[0].parentNode;'
                + '      if (!parent) return;'
                + '      var frag = document.createDocumentFragment();'
                + '      lines.forEach(function(l) { frag.appendChild(l); });'
                + '      parent.insertBefore(frag, parent.firstChild);'
                + '    });'
                + '  }'
                // Hide surplus (non-matched, non-gap) nodes in Job Match view
                + '  function filterJobMatch() {'
                + '    var isJobMatch = false;'
                + '    document.querySelectorAll("button, [role=tab], .tab, .toggle-btn").forEach(function(b) {'
                + '      if (b.classList && b.classList.contains("active") && /job\\s*match/i.test(b.textContent)) isJobMatch = true;'
                + '    });'
                + '    var R = typeof REPORT_DATA !== "undefined" ? REPORT_DATA : null;'
                + '    if (!R || !R.jobMatchSkills) return;'
                + '    var matchedNames = {};'
                + '    R.jobMatchSkills.forEach(function(s) { matchedNames[s.n.toLowerCase()] = true; });'
                + '    (R.gaps || []).forEach(function(g) { matchedNames[g.n.toLowerCase()] = true; });'
                + '    (R.jobRequired || []).forEach(function(j) { matchedNames[j.toLowerCase()] = true; });'
                + '    document.querySelectorAll("svg g.node, svg g[class*=node], svg g").forEach(function(g) {'
                + '      var d = g.__data__;'
                + '      if (!d || !d.name) return;'
                + '      if (d.isCenter || d.isRole || d.type === "role" || d.type === "center" || d.type === "job") return;'
                + '      var nm = d.name.toLowerCase();'
                + '      if (isJobMatch && !matchedNames[nm] && d.type !== "gap") {'
                + '        g.style.display = "none";'
                + '      } else {'
                + '        g.style.display = "";'
                + '      }'
                + '    });'
                // Also hide orphan links pointing to hidden nodes
                + '    if (isJobMatch) {'
                + '      document.querySelectorAll("svg line").forEach(function(l) {'
                + '        var s = l.__data__;'
                + '        if (!s) return;'
                + '        var sName = (s.source && s.source.name) ? s.source.name.toLowerCase() : "";'
                + '        var tName = (s.target && s.target.name) ? s.target.name.toLowerCase() : "";'
                + '        if ((sName && !matchedNames[sName]) || (tName && !matchedNames[tName])) {'
                + '          l.style.display = "none";'
                + '        } else { l.style.display = ""; }'
                + '      });'
                + '    } else {'
                + '      document.querySelectorAll("svg line").forEach(function(l) { l.style.display = ""; });'
                + '    }'
                + '  }'
                + '  var n = 0;'
                + '  var iv = setInterval(function() {'
                + '    recolorNetwork();'
                + '    filterJobMatch();'
                + '    if (++n > 25) clearInterval(iv);'
                + '  }, 400);'
                + '  document.addEventListener("DOMContentLoaded", function() {'
                + '    [800,1500,2500,4000].forEach(function(ms) { setTimeout(function(){ recolorNetwork(); filterJobMatch(); }, ms); });'
                // Re-filter when tabs are clicked
                + '    document.addEventListener("click", function(e) {'
                + '      if (e.target && (e.target.matches("button, [role=tab], .tab, .toggle-btn") || e.target.closest("button, [role=tab]"))) {'
                + '        setTimeout(function(){ recolorNetwork(); filterJobMatch(); }, 300);'
                + '        setTimeout(function(){ recolorNetwork(); filterJobMatch(); }, 800);'
                + '      }'
                + '    });'
                + '  });'
                + '})();'
                + '<\/script>';
            
            // Insert patches before </head>
            injected = injected.replace('</head>', patchCSS + patchScript + patchColors + '</head>');
            var blob = new Blob([injected], { type: 'text/html; charset=utf-8' });
            var blobUrl = URL.createObjectURL(blob);
            
            var overlay = document.createElement('div');
            overlay.id = 'scoutReportOverlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;';
            // Store data on overlay for share function
            overlay._reportData = reportData;
            overlay._jobIdx = jobIdx;
            
            var container = document.createElement('div');
            container.style.cssText = 'width:100%;max-width:1200px;height:90vh;background:var(--bg);border:1px solid var(--border);border-radius:16px;overflow:hidden;position:relative;box-shadow:0 24px 64px rgba(0,0,0,0.5);display:flex;flex-direction:column;';
            
            var candidateName = reportData.candidate.name;
            var header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border);background:var(--elev-1);flex-shrink:0;';
            header.innerHTML = '<div style="display:flex;align-items:center;gap:10px;">'
                + '<span style="color:var(--accent);">' + bpIcon('target',18) + '</span>'
                + '<span style="font-weight:600;font-size:0.92em;">' + escapeHtml(candidateName) + ' → ' + escapeHtml(reportData.job.title) + '</span>'
                + '<span style="font-size:0.72em;padding:2px 8px;border-radius:10px;background:rgba(16,185,129,0.1);color:#10b981;font-weight:600;">' + reportData.match.percentage + '% MATCH</span>'
                + '</div>'
                + '<div style="display:flex;align-items:center;gap:8px;">'
                + '<button id="shareReportBtn" onclick="shareScoutingReport()" style="font-size:0.82em;padding:6px 16px;border-radius:8px;background:var(--accent);color:#fff;border:none;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">' + bpIcon('external',14) + ' Share Report</button>'
                + '<a href="' + blobUrl + '" download="scouting-report-' + candidateName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.html" style="font-size:0.82em;padding:6px 14px;border-radius:8px;background:transparent;border:1px solid var(--border);color:var(--text-secondary);text-decoration:none;display:flex;align-items:center;gap:6px;">' + bpIcon('download',14) + ' Save</a>'
                + '<button onclick="document.getElementById(\'scoutReportOverlay\').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.3em;cursor:pointer;padding:4px 8px;">✕</button>'
                + '</div>';
            
            var iframe = document.createElement('iframe');
            iframe.src = blobUrl;
            iframe.style.cssText = 'flex:1;width:100%;border:none;background:#0a0a1a;';
            
            container.appendChild(header);
            container.appendChild(iframe);
            overlay.appendChild(container);
            document.body.appendChild(overlay);
            
            var escHandler = function(e) { if (!overlay.isConnected) { document.removeEventListener('keydown', escHandler); return; } if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }};
            overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.remove(); document.removeEventListener('keydown', escHandler); } });
            document.addEventListener('keydown', escHandler);
        })
        .catch(function(err) {
            console.error('Report render error:', err);
            showToast('Failed to render report: ' + err.message, 'error');
        });
}
if (!window.showReportOverlay) window.showReportOverlay = showReportOverlay;

// ── Share to Firestore → get link ─────────────────────────
export function shareScoutingReport() {
    // Demo lockdown: no sharing on sample profiles
    if (window.isReadOnlyProfile) {
        showToast('Sharing is not available on sample profiles. Sign up to share your own reports.', 'info');
        return;
    }
    
    var overlay = document.getElementById('scoutReportOverlay');
    if (!overlay || !overlay._reportData) { showToast('No report to share.', 'error'); return; }
    
    var btn = document.getElementById('shareReportBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = bpIcon('clock',14) + ' Sharing…'; }
    
    var reportData = overlay._reportData;
    
    // Generate secure report ID: timestamp + crypto-random hex (128-bit entropy)
    var cryptoBytes = new Uint8Array(16);
    crypto.getRandomValues(cryptoBytes);
    var reportId = Date.now().toString(36) + Array.from(cryptoBytes, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    
    // Generate share token (p1-2): separate 128-bit token for URL sharing
    var tokenBytes = new Uint8Array(16);
    crypto.getRandomValues(tokenBytes);
    var shareToken = Array.from(tokenBytes, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    
    // Firestore document
    var docData = {
        reportData: JSON.stringify(reportData),
        candidateName: reportData.candidate.name,
        jobTitle: reportData.job.title,
        company: reportData.job.company,
        matchScore: reportData.match.percentage,
        blindSettings: reportData.blindSettings || {},
        createdBy: fbUser ? fbUser.uid : 'anonymous',
        createdByName: (window._userData.profile || {}).name || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        viewCount: 0,
        shortlisted: 0,
        notes: [],
        status: 'active',
        shareToken: shareToken
    };
    
    // Privacy audit log for share event
    logPrivacyEvent('share', reportData.job.title, reportData.job.company, reportData.blindSettings || {}, false);
    
    if (!fbDb) {
        showToast('Firebase not available. Save the HTML file instead.', 'warning');
        if (btn) { btn.disabled = false; btn.innerHTML = bpIcon('external',14) + ' Share Report'; }
        return;
    }
    
    fbDb.collection('reports').doc(reportId).set(docData)
        .then(function() {
            var shareUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/reports/view.html?id=' + reportId + '&token=' + shareToken);
            
            // Copy to clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl).then(function() {
                    showToast('Share link copied! ' + shareUrl, 'success', 6000);
                });
            } else {
                // Fallback
                var ta = document.createElement('textarea');
                ta.value = shareUrl;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                showToast('Share link copied! ' + shareUrl, 'success', 6000);
            }
            
            // Update button to show link
            if (btn) {
                btn.innerHTML = bpIcon('check',14) + ' Link Copied';
                btn.style.background = '#10b981';
                setTimeout(function() {
                    btn.disabled = false;
                    btn.innerHTML = bpIcon('external',14) + ' Copy Link Again';
                    btn.style.background = 'var(--accent)';
                    btn.onclick = function() {
                        navigator.clipboard.writeText(shareUrl);
                        showToast('Link copied again!', 'success', 3000);
                    };
                }, 3000);
            }
            
            // Refresh reports dashboard if initialized
            window.reportsInitialized = false;
        })
        .catch(function(err) {
            console.error('Share error:', err);
            showToast('Share failed: ' + err.message, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = bpIcon('external',14) + ' Share Report'; }
        });
}
if (!window.shareScoutingReport) window.shareScoutingReport = shareScoutingReport;

// Open sample scouting report in an iframe overlay
export function openSampleScoutingReport() {
    // Route through the standard demo report viewer which handles mismatch detection
    viewDemoSampleReport('html');
}
if (!window.openSampleScoutingReport) window.openSampleScoutingReport = openSampleScoutingReport;

export function generateScoutingReport(jobIdx) {
    // Demo lockdown: redirect to sample viewer
    if (window.isReadOnlyProfile) { viewDemoSampleReport('pdf'); return; }
    var job = (window._userData.savedJobs || [])[jobIdx];
    if (!job) { showToast('Job not found.', 'error'); return; }
    logAnalyticsEvent('scouting_report', { company: job.company || '', title: job.title || '' });
    closeExportModal();
    
    // Use buildReportData for identical data to HTML reports
    var reportData = buildReportData(jobIdx);
    if (!reportData) { showToast('Could not build report data.', 'error'); return; }
    
    // Apply blind settings (defaults + any per-instance overrides)
    var blindSettings = getActiveBlindSettings();
    var overridden = hasOverrides();
    applyBlindSettings(reportData, blindSettings);
    
    // Privacy audit log
    logPrivacyEvent('pdf', job.title, job.company, blindSettings, overridden);
    
    // Clear per-instance overrides
    _blindOverrides = null;
    
    generateScoutingReportPDF(reportData);
}
if (!window.generateScoutingReport) window.generateScoutingReport = generateScoutingReport;

// ============================================================
// SCOUTING REPORT PDF — Matches HTML report layout/data
// Uses buildReportData() for identical data to HTML reports
// ============================================================
export function generateScoutingReportPDF(R) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    var W = 210, H = 297, M = 14, MW = W - M * 2, y = 0, pg = 0;
    var name = R.candidate.name || 'Candidate';
    var firstName = name.split(' ')[0];
    var dateLine = R.job.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    var allSkills = R.skills || [];
    var totalSkillCount = R.totalSkillCount || allSkills.length;
    var matchPct = R.match.percentage || 0;
    var gaps = R.gaps || [];
    var roles = R.roles || [];
    var matched = allSkills.filter(function(s) { return s.k; });
    var surplus = totalSkillCount - matched.length - gaps.length;
    
    // ── Colors — match HTML CSS variables exactly ──
    var C = {
        bg:    [10, 14, 26],         // --bg: #0a0e1a
        card:  [17, 24, 39],         // --card: #111827
        elev:  [26, 32, 53],         // --elev: #1a2035
        border:[255, 255, 255, 0.06],// --border (will draw as rgb)
        borderRGB: [35, 42, 60],     // approx rendered border on dark
        a:     [59, 130, 246],       // --a: #3b82f6
        g:     [16, 185, 129],       // --g: #10b981
        am:    [245, 158, 11],       // --am: #f59e0b
        r:     [239, 68, 68],        // --r: #ef4444
        p:     [99, 102, 241],       // --p: #6366f1
        t1:    [241, 245, 249],      // --t1: #f1f5f9
        t2:    [148, 163, 184],      // --t2: #94a3b8
        tm:    [100, 116, 139],      // --tm: #64748b
        white: [255, 255, 255],
        orange:[249, 115, 22],
        purple:[168, 85, 247]
    };
    var lvlColor = { 'Mastery': C.am, 'Expert': C.purple, 'Advanced': C.a, 'Proficient': C.g, 'Competent': C.g, 'Novice': [107, 114, 128] };
    var lvlVal = { 'Mastery': 5, 'Expert': 4, 'Advanced': 3, 'Proficient': 2, 'Competent': 2, 'Novice': 1 };
    
    // ── Drawing helpers ──
    function sc(c) { doc.setTextColor(c[0], c[1], c[2]); }
    function sf(c) { doc.setFillColor(c[0], c[1], c[2]); }
    function sd(c) { doc.setDrawColor(c[0], c[1], c[2]); }
    function scoreColor(p) { return p >= 70 ? C.g : p >= 50 ? C.am : C.r; }
    
    function darkPage() { sf(C.bg); doc.rect(0, 0, W, H, 'F'); }
    function card(x, cy, w, h, borderColor) {
        sf(C.card); sd(borderColor || C.borderRGB); doc.setLineWidth(0.3);
        doc.roundedRect(x, cy, w, h, 2.5, 2.5, 'FD');
    }
    
    function newPage() {
        if (pg > 0) addFooter();
        if (pg > 0) doc.addPage();
        pg++; darkPage(); y = M;
        if (pg > 1) {
            // Running header
            doc.setFontSize(5.5); sc(C.tm);
            doc.text('BLUEPRINT\u2122 SCOUTING REPORT', M, 8);
            doc.text(name + '  \u2192  ' + R.job.title + '  \u2022  ' + R.job.company, W - M, 8, { align: 'right' });
            sd(C.borderRGB); doc.setLineWidth(0.15); doc.line(M, 10, W - M, 10);
            y = 14;
        }
    }
    function check(need) { if (y + need > H - 16) newPage(); }
    function addFooter() {
        doc.setFontSize(5); sc(C.tm);
        doc.text('CONFIDENTIAL  \u2022  ' + dateLine + '  \u2022  myblueprint.work', M, H - 6);
        doc.text('Page ' + pg, W - M, H - 6, { align: 'right' });
        doc.setFontSize(4.5);
        doc.text('\u00A9 ' + new Date().getFullYear() + ' Cliff Jurkiewicz. All rights reserved.', M, H - 3.5);
    }
    
    // Section header — matches .sec-h in HTML
    function secHead(title, subtitle) {
        check(16); y += 3;
        sd(C.borderRGB); doc.setLineWidth(0.15); doc.line(M, y, W - M, y);
        y += 8;
        // Icon square
        sf(C.elev); doc.roundedRect(M, y - 4, 7, 7, 1.5, 1.5, 'F');
        sf(C.a); doc.circle(M + 3.5, y - 0.5, 1.5, 'F');
        // Title
        doc.setFontSize(11); doc.setFont(undefined, 'bold'); sc(C.t1);
        doc.text(title, M + 10, y + 1.5);
        doc.setFont(undefined, 'normal');
        if (subtitle) {
            doc.setFontSize(7); sc(C.tm);
            doc.text(subtitle, M + 10, y + 6);
            y += 12;
        } else { y += 7; }
    }
    
    function pill(x, py, text, bgColor, txtColor) {
        doc.setFontSize(5); doc.setFont(undefined, 'bold');
        var tw = doc.getTextWidth(text) + 5;
        sf(bgColor); doc.roundedRect(x, py - 2, tw, 4.5, 2, 2, 'F');
        sc(txtColor || C.white); doc.text(text, x + 2.5, py + 0.5);
        doc.setFont(undefined, 'normal'); return tw + 1;
    }
    
    // ════════════════════════════════════════════════════════
    // 1. CONFIDENTIAL STRIP + HERO
    // ════════════════════════════════════════════════════════
    pg = 1; darkPage();
    
    // Confidential strip — matches .strip
    sf([12, 17, 32]); doc.rect(0, 0, W, 8, 'F');
    sd(C.borderRGB); doc.setLineWidth(0.15); doc.line(0, 8, W, 8);
    doc.setFontSize(5.5); sc(C.tm);
    doc.text('CONFIDENTIAL \u2014 Prepared for the hiring team at ', M, 5);
    doc.setFont(undefined, 'bold'); sc(C.t2);
    doc.text(R.job.company, M + doc.getTextWidth('CONFIDENTIAL \u2014 Prepared for the hiring team at ') + 1, 5);
    doc.setFont(undefined, 'normal'); sc(C.tm);
    doc.text(dateLine, W - M, 5, { align: 'right' });
    
    // Hero grid: [Photo] [Name block] [Match ring]
    y = 16;
    
    // Photo circle — matches .photo
    var photoCx = M + 10, photoCy = y + 10;
    sf(C.a); doc.circle(photoCx, photoCy, 10, 'F');
    doc.setFontSize(16); doc.setFont(undefined, 'bold'); sc(C.white);
    doc.text(R.candidate.photo || 'A', photoCx, photoCy + 3, { align: 'center' });
    
    // Name block
    var nx = M + 24;
    doc.setFontSize(17); doc.setFont(undefined, 'bold'); sc(C.t1);
    doc.text(name, nx, y + 5);
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); sc(C.t2);
    doc.text(R.candidate.title || '', nx, y + 11);
    doc.setFontSize(6.5); sc(C.tm);
    var meta = [];
    if (R.candidate.location) meta.push(R.candidate.location);
    doc.text(meta.join('    '), nx, y + 16);
    // Contact line
    var contactParts = [];
    if (R.candidate.contact && R.candidate.contact !== 'Available upon request') contactParts.push(R.candidate.contact);
    if (R.candidate.phone) contactParts.push(R.candidate.phone);
    if (R.candidate.linkedin) contactParts.push(R.candidate.linkedin);
    if (contactParts.length > 0) {
        doc.setFontSize(5.8); sc(C.t2);
        doc.text(contactParts.join('   |   '), nx, y + 20.5);
    } else {
        doc.setFontSize(5.8); sc(C.tm);
        doc.text('Contact available upon request', nx, y + 20.5);
    }
    
    // Match ring — right side
    var ringCx = W - M - 12, ringCy = y + 10, ringR = 10;
    sd([35, 42, 60]); doc.setLineWidth(2); doc.circle(ringCx, ringCy, ringR, 'S');
    var sc1 = scoreColor(matchPct);
    sd(sc1); doc.setLineWidth(2.5);
    for (var ai = 0; ai < (matchPct / 100) * 360; ai += 2) {
        var a1 = ((ai - 90) * Math.PI) / 180, a2 = ((ai + 2 - 90) * Math.PI) / 180;
        doc.line(ringCx + Math.cos(a1) * ringR, ringCy + Math.sin(a1) * ringR,
                 ringCx + Math.cos(a2) * ringR, ringCy + Math.sin(a2) * ringR);
    }
    doc.setFontSize(13); doc.setFont(undefined, 'bold');
    doc.setTextColor(sc1[0], sc1[1], sc1[2]);
    doc.text(matchPct + '%', ringCx, ringCy + 2, { align: 'center' });
    doc.setFontSize(4.5); doc.setFont(undefined, 'normal'); sc(C.tm);
    doc.text('MATCH', ringCx, ringCy + 6, { align: 'center' });
    
    y += 30;
    
    // Target Role Card — matches .target
    card(M, y, MW, 18);
    doc.setFontSize(5.5); doc.setFont(undefined, 'bold'); sc(C.a);
    doc.text('TARGET ROLE', M + 6, y + 5);
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); sc(C.t1);
    doc.text(R.job.title, M + 6, y + 11);
    doc.setFontSize(8); doc.setFont(undefined, 'normal'); sc(C.t2);
    doc.text(R.job.company, M + 6, y + 15.5);
    
    // Stats on right of target card
    var tsX = W - M - 6;
    var tStats = [
        { n: String(totalSkillCount), l: 'Skills', c: C.a },
        { n: String(matched.length), l: 'Matched', c: C.g },
        { n: String(gaps.length), l: 'Gaps', c: C.r },
        { n: String(Math.max(0, surplus)), l: 'Surplus', c: C.tm }
    ];
    tStats.reverse().forEach(function(ts) {
        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.setTextColor(ts.c[0], ts.c[1], ts.c[2]);
        doc.text(ts.n, tsX, y + 8, { align: 'center' });
        doc.setFontSize(4.5); doc.setFont(undefined, 'normal'); sc(C.tm);
        doc.text(ts.l.toUpperCase(), tsX, y + 12, { align: 'center' });
        tsX -= 18;
    });
    y += 22;
    
    // Narrative — matches .narr
    sf([14, 20, 38]); sd([40, 55, 85]); doc.setLineWidth(0.3);
    var narrativeClean = (R.match.narrative || '').replace(/<[^>]+>/g, '');
    doc.setFontSize(7); doc.setFont(undefined, 'normal');
    var narLines = doc.splitTextToSize(narrativeClean, MW - 16);
    var lineH = 3.4;
    var narH = narLines.length * lineH + 12;
    doc.roundedRect(M, y, MW, narH, 2.5, 2.5, 'FD');
    doc.setFontSize(5); doc.setFont(undefined, 'bold'); sc(C.a);
    doc.text('WHY THIS CANDIDATE FITS', M + 8, y + 5);
    doc.setFontSize(7); doc.setFont(undefined, 'normal'); sc(C.t2);
    for (var ni = 0; ni < narLines.length; ni++) {
        doc.text(narLines[ni], M + 8, y + 10 + ni * lineH);
    }
    y += narH + 4;
    
    // Purpose — matches .purpose
    if (R.candidate.purpose && R.candidate.purpose.trim()) {
        check(10);
        sd(C.borderRGB); doc.setLineWidth(0.15); doc.line(M + 20, y, W - M - 20, y);
        y += 5;
        doc.setFontSize(7.5); doc.setFont(undefined, 'italic'); sc(C.tm);
        var pText = '\u201C' + R.candidate.purpose.trim() + '\u201D';
        var pLines = doc.splitTextToSize(pText, MW - 30);
        doc.text(pLines.slice(0, 2), W / 2, y, { align: 'center' });
        y += Math.min(pLines.length, 2) * 4 + 4;
        doc.setFont(undefined, 'normal');
    }
    
    // ── Page 1 Skills Snapshot ──
    // Top skills by proficiency (compact 3-column grid)
    y += 4;
    var sortedSkills = allSkills.slice().sort(function(a, b) {
        return (lvlVal[b.l] || 0) - (lvlVal[a.l] || 0);
    });
    var topCount = Math.min(sortedSkills.length, 15);
    if (topCount > 0) {
        // Section header
        doc.setFontSize(8); doc.setFont(undefined, 'bold'); sc(C.t1);
        doc.text('Top Capabilities', M, y + 1);
        doc.setFontSize(5.5); doc.setFont(undefined, 'normal'); sc(C.tm);
        doc.text('Highest proficiency skills', M + doc.getTextWidth('Top Capabilities') + 4, y + 1);
        y += 6;
        
        var colW = (MW - 6) / 3;
        var rowH = 5.5;
        var startY = y;
        for (var si = 0; si < topCount; si++) {
            var col = si % 3;
            var row = Math.floor(si / 3);
            var sx = M + col * colW + 3;
            var sy = startY + row * rowH;
            var sk = sortedSkills[si];
            var lc = lvlColor[sk.l] || C.tm;
            
            // Proficiency dot
            sf(lc); doc.circle(sx, sy + 1.5, 1.5, 'F');
            
            // Skill name
            doc.setFontSize(5.8); doc.setFont(undefined, 'normal'); sc(C.t2);
            var skName = sk.n.length > 28 ? sk.n.slice(0, 26) + '..' : sk.n;
            doc.text(skName, sx + 4, sy + 2.2);
            
            // Required badge
            if (sk.k) {
                doc.setFontSize(4); sc(C.g);
                doc.text('REQ', sx + 4 + doc.getTextWidth(skName) + 2, sy + 2.2);
            }
        }
        y = startY + Math.ceil(topCount / 3) * rowH + 4;
    }
    
    // Competency distribution mini-bar (horizontal)
    if (roles.length > 0) {
        doc.setFontSize(8); doc.setFont(undefined, 'bold'); sc(C.t1);
        doc.text('Competency Distribution', M, y + 1);
        y += 5;
        
        var rSkillCounts = {};
        roles.forEach(function(r) { rSkillCounts[r.id] = 0; });
        allSkills.forEach(function(sk) {
            var rid = (sk.r && sk.r[0]) || '';
            if (rSkillCounts[rid] !== undefined) rSkillCounts[rid]++;
        });
        var maxCount = Math.max.apply(null, roles.map(function(r) { return rSkillCounts[r.id] || 1; }));
        
        roles.forEach(function(role, ri) {
            var barY = y + ri * 7;
            var count = rSkillCounts[role.id] || 0;
            var barW = Math.max(4, (count / maxCount) * (MW * 0.55));
            var rc = role.color || '#3b82f6';
            var rgb = [parseInt(rc.slice(1,3),16)||59, parseInt(rc.slice(3,5),16)||130, parseInt(rc.slice(5,7),16)||246];
            
            // Role name
            doc.setFontSize(5.5); doc.setFont(undefined, 'bold');
            doc.setTextColor(rgb[0], rgb[1], rgb[2]);
            var rName = role.name.length > 24 ? role.name.slice(0, 22) + '..' : role.name;
            doc.text(rName, M + 2, barY + 3);
            
            // Bar
            var barX = M + MW * 0.4;
            sf(rgb); doc.roundedRect(barX, barY, barW, 4, 1.5, 1.5, 'F');
            
            // Count label
            doc.setFontSize(5); doc.setFont(undefined, 'bold'); sc(C.t2);
            doc.text(String(count) + ' skills', barX + barW + 3, barY + 3);
        });
        y += roles.length * 7 + 2;
    }
    
    addFooter();
    
    // ════════════════════════════════════════════════════════
    // 2. CAPABILITY ARCHITECTURE — Job Match Network
    // ════════════════════════════════════════════════════════
    newPage();
    secHead('Capability Architecture', 'Skills network — node size = proficiency, color = match status');
    
    // Toggle label + match %
    doc.setFontSize(6); doc.setFont(undefined, 'bold');
    sf(C.elev); sd(C.borderRGB); doc.setLineWidth(0.2);
    doc.roundedRect(M, y, 30, 5.5, 2, 2, 'FD');
    sc(C.a); doc.text('JOB MATCH', M + 4.5, y + 3.5);
    // Match percentage badge
    var mCol = scoreColor(matchPct);
    sf(mCol); doc.roundedRect(M + 33, y, 22, 5.5, 2, 2, 'F');
    doc.setFontSize(7); doc.setFont(undefined, 'bold'); sc(C.white);
    doc.text(matchPct + '% Match', M + 34.5, y + 3.8);
    y += 9;
    
    // Network container — matches .net-w
    var netY = y, netH = 160;
    card(M, netY, MW, netH);
    
    // Draw Job Match network via D3 canvas rendering
    (function drawJobNetCanvas() {
        var cW = 3600, cH = 3200;
        var canvas = document.createElement('canvas');
        canvas.width = cW; canvas.height = cH;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgb(17,24,39)';
        ctx.fillRect(0, 0, cW, cH);
        
        function hex2rgb(c) { return [parseInt(c.slice(1,3),16)||59, parseInt(c.slice(3,5),16)||130, parseInt(c.slice(5,7),16)||246]; }
        function rgb(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
        
        var centerX = cW / 2, centerY = cH / 2;
        var lvlR = { 'Mastery': 36, 'Expert': 30, 'Advanced': 24, 'Proficient': 20, 'Competent': 20, 'Novice': 14 };
        var matchedColor = [16, 185, 129], gapColor = [239, 68, 68], surplusColor = [71, 85, 105];
        
        // Build match detection — multi-tier fallback for stale data
        var jobReqSet = new Set();
        (R.jobRequired || []).forEach(function(n) { jobReqSet.add(n.toLowerCase()); });
        var hasAnyMatched = allSkills.some(function(s) { return s.k; });
        
        // Tier 3: If no sk.k AND no jobRequired, infer from matchPct + gaps
        var inferredMatchSet = new Set();
        if (!hasAnyMatched && jobReqSet.size === 0 && matchPct > 0) {
            // Estimate how many skills should be matched
            var gapCount = gaps.length || 0;
            var estTotal = gapCount > 0 ? Math.round(gapCount / Math.max(1 - matchPct / 100, 0.1)) : Math.round(allSkills.length * matchPct / 100);
            var estMatched = Math.max(estTotal - gapCount, 1);
            // Build gap name set to exclude
            var gapNames = new Set();
            gaps.forEach(function(g) { gapNames.add(g.n.toLowerCase()); });
            // Sort candidate skills by level priority, take top N as inferred matches
            var lvlPri = { 'Mastery': 5, 'Expert': 4, 'Advanced': 3, 'Proficient': 2, 'Competent': 2, 'Novice': 1 };
            var candidates = allSkills.filter(function(s) { return !gapNames.has(s.n.toLowerCase()); });
            candidates.sort(function(a, b) { return (lvlPri[b.l] || 0) - (lvlPri[a.l] || 0); });
            candidates.slice(0, estMatched).forEach(function(sk) {
                inferredMatchSet.add(sk.n.toLowerCase());
            });
        }
        
        // Group skills by role
        var rSkills = {}; roles.forEach(function(r) { rSkills[r.id] = []; });
        allSkills.forEach(function(sk) {
            var rid = (sk.r && sk.r[0]) || '';
            if (rSkills[rid]) rSkills[rid].push(sk);
            else if (roles.length > 0) rSkills[roles[0].id].push(sk);
        });
        
        var d3nodes = [];
        var d3links = [];
        
        // Center job node — PINNED
        d3nodes.push({
            id: 'job-center', type: 'job', label: R.job.title,
            r: 80, fx: centerX, fy: centerY
        });
        
        // Role hubs — PINNED at fixed positions around periphery
        var hubRadius = Math.min(cW, cH) * 0.38;
        roles.forEach(function(role, i) {
            var angle = (i / roles.length) * Math.PI * 2 - Math.PI / 2;
            d3nodes.push({
                id: 'role-' + role.id, type: 'role', label: role.name,
                color: hex2rgb(role.color || '#3b82f6'), r: 60,
                fx: centerX + Math.cos(angle) * hubRadius,
                fy: centerY + Math.sin(angle) * hubRadius
            });
            d3links.push({ source: 'job-center', target: 'role-' + role.id, type: 'hub' });
        });
        
        // Skill nodes — determine match status
        var _nid = 0;
        roles.forEach(function(role) {
            var sks = rSkills[role.id] || [];
            sks.forEach(function(sk) {
                var nodeId = 'sk-' + (_nid++);
                // Match: sk.k (proper) → jobRequired name → inferred from matchPct
                var isMatched = sk.k || jobReqSet.has(sk.n.toLowerCase()) || inferredMatchSet.has(sk.n.toLowerCase());
                d3nodes.push({
                    id: nodeId, type: 'skill', label: sk.n,
                    color: isMatched ? matchedColor : surplusColor,
                    matchColor: isMatched ? 'matched' : 'surplus',
                    r: lvlR[sk.l] || 20, isKey: isMatched, level: sk.l
                });
                d3links.push({ source: 'role-' + role.id, target: nodeId, type: 'skill' });
            });
        });
        
        // Gap nodes
        gaps.forEach(function(gap, gi) {
            d3nodes.push({
                id: 'gap-' + gi, type: 'gap', label: gap.n,
                color: gapColor, matchColor: 'gap', r: 24
            });
            d3links.push({ source: 'job-center', target: 'gap-' + gi, type: 'gap' });
        });
        
        // D3 simulation — hubs pinned, only skills float
        var sim = d3.forceSimulation(d3nodes)
            .force('link', d3.forceLink(d3links).id(function(d) { return d.id; }).distance(function(d) {
                if (d.type === 'hub') return hubRadius;
                if (d.type === 'gap') return hubRadius * 1.3;
                return hubRadius * 0.7;
            }).strength(1))
            .force('charge', d3.forceManyBody().strength(function(d) {
                if (d.fx !== undefined) return 0;
                return -800;
            }))
            .force('collision', d3.forceCollide().radius(function(d) {
                if (d.type === 'job') return 110;
                if (d.type === 'role') return 90;
                return 60;
            }).strength(1).iterations(3))
            .force('x', d3.forceX(centerX).strength(0.015))
            .force('y', d3.forceY(centerY).strength(0.015))
            .stop();
        
        for (var t = 0; t < 500; t++) sim.tick();
        
        // Clamp
        var pad = 120;
        d3nodes.forEach(function(n) {
            if (n.fx !== undefined) return;
            n.x = Math.max(pad, Math.min(cW - pad, n.x));
            n.y = Math.max(pad, Math.min(cH - pad, n.y));
        });
        
        // ── DRAW ──
        
        // Links
        d3links.forEach(function(lk) {
            var s = lk.source, tg = lk.target;
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tg.x, tg.y);
            if (lk.type === 'hub') {
                ctx.strokeStyle = 'rgba(80,100,150,0.1)'; ctx.lineWidth = 1;
            } else if (lk.type === 'gap') {
                ctx.strokeStyle = 'rgba(239,68,68,0.25)'; ctx.lineWidth = 1.2;
                ctx.setLineDash([8, 5]);
            } else {
                ctx.strokeStyle = tg.matchColor === 'matched' ? 'rgba(16,185,129,0.07)' : 'rgba(50,65,100,0.06)';
                ctx.lineWidth = 0.5;
            }
            ctx.stroke(); ctx.setLineDash([]);
        });
        
        // Skill & gap nodes
        d3nodes.forEach(function(n) {
            if (n.type === 'job' || n.type === 'role') return;
            // Glow for matched
            if (n.isKey) {
                ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(16,185,129,0.12)'; ctx.fill();
            }
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = rgb(n.color);
            ctx.globalAlpha = n.matchColor === 'surplus' ? 0.45 : 1;
            ctx.fill(); ctx.globalAlpha = 1;
            if (n.isKey) { ctx.strokeStyle = 'rgba(16,185,129,0.8)'; ctx.lineWidth = 3; ctx.stroke(); }
            if (n.type === 'gap') { ctx.strokeStyle = 'rgba(252,165,165,0.7)'; ctx.lineWidth = 2.5; ctx.stroke(); }
            // Label
            var fs = n.type === 'gap' ? 28 : (n.isKey ? 26 : 24);
            ctx.font = (n.type === 'gap' || n.isKey ? 'bold ' : '') + fs + 'px Helvetica, Arial, sans-serif';
            ctx.fillStyle = n.type === 'gap' ? rgb(gapColor) : (n.isKey ? 'rgb(180,230,200)' : 'rgb(100,116,139)');
            ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            var lbl = n.label.length > 24 ? n.label.slice(0, 22) + '..' : n.label;
            ctx.fillText(lbl, n.x + n.r + 10, n.y);
        });
        
        // Role hubs on top
        d3nodes.forEach(function(n) {
            if (n.type !== 'role') return;
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3; ctx.stroke();
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = rgb(n.color); ctx.fill();
            ctx.font = 'bold 32px Helvetica, Arial, sans-serif';
            ctx.fillStyle = rgb(n.color); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            var rlbl = n.label.toUpperCase();
            if (rlbl.length > 22) rlbl = rlbl.slice(0, 20) + '..';
            ctx.fillText(rlbl, n.x, n.y - n.r - 12);
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        });
        
        // Center job node on very top
        var jn = d3nodes[0];
        ctx.beginPath(); ctx.arc(jn.x, jn.y, jn.r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.arc(jn.x, jn.y, jn.r, 0, Math.PI * 2);
        var grad = ctx.createRadialGradient(jn.x, jn.y, 0, jn.x, jn.y, jn.r);
        grad.addColorStop(0, 'rgb(30,45,75)'); grad.addColorStop(1, 'rgb(15,25,50)');
        ctx.fillStyle = grad; ctx.fill();
        ctx.font = 'bold 28px Helvetica, Arial, sans-serif';
        ctx.fillStyle = 'rgb(255,255,255)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var jtWords = R.job.title.split(' ');
        var jtLines = []; var jtLine = '';
        jtWords.forEach(function(w) {
            var test = jtLine ? jtLine + ' ' + w : w;
            if (ctx.measureText(test).width > jn.r * 1.6) { if (jtLine) jtLines.push(jtLine); jtLine = w; }
            else { jtLine = test; }
        });
        if (jtLine) jtLines.push(jtLine);
        jtLines.slice(0, 3).forEach(function(line, li) {
            ctx.fillText(line, jn.x, jn.y + (li - (jtLines.length - 1) / 2) * 32);
        });
        ctx.textAlign = 'left';
        
        // Embed as JPEG
        try {
            var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            doc.addImage(dataUrl, 'JPEG', M + 0.5, netY + 0.5, MW - 1, netH - 1);
        } catch(e) { console.warn('Job match canvas failed:', e); }
        
        // Legend
        var legY = netY + netH - 8;
        sf([20, 24, 42]); sd(C.borderRGB); doc.setLineWidth(0.2);
        doc.roundedRect(M + 3, legY, 72, 5.5, 2, 2, 'FD');
        var lx = M + 6;
        [{ l: 'Matched', c: C.g }, { l: 'Gap', c: C.r }, { l: 'Surplus', c: [71, 85, 105] }].forEach(function(li) {
            sf(li.c); doc.circle(lx + 1, legY + 2.8, 1.2, 'F');
            doc.setFontSize(5); sc(C.tm); doc.text(li.l, lx + 3.5, legY + 3.5);
            lx += doc.getTextWidth(li.l) + 8;
        });
    })();
    
    y = netY + netH + 4;
    
    // ════════════════════════════════════════════════════════
    // 3. CANDIDATE SKILLS Network (separate graphic)
    // ════════════════════════════════════════════════════════
    check(170);
    if (y > 40) newPage();
    
    // Toggle label
    doc.setFontSize(6); doc.setFont(undefined, 'bold');
    sf(C.elev); sd(C.borderRGB); doc.setLineWidth(0.2);
    doc.roundedRect(M, y, 38, 5.5, 2, 2, 'FD');
    sc(C.a); doc.text('CANDIDATE SKILLS', M + 4.5, y + 3.5);
    y += 9;
    
    var net2Y = y, net2H = 160;
    card(M, net2Y, MW, net2H);
    
    // Candidate Skills network via D3 canvas rendering
    (function drawCandNetCanvas() {
        var cW = 3600, cH = 3200;
        var canvas = document.createElement('canvas');
        canvas.width = cW; canvas.height = cH;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgb(17,24,39)';
        ctx.fillRect(0, 0, cW, cH);
        
        function hex2rgb(c) { return [parseInt(c.slice(1,3),16)||59, parseInt(c.slice(3,5),16)||130, parseInt(c.slice(5,7),16)||246]; }
        function rgb(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
        
        var centerX = cW / 2, centerY = cH / 2;
        var lvlR = { 'Mastery': 36, 'Expert': 30, 'Advanced': 24, 'Proficient': 20, 'Competent': 20, 'Novice': 14 };
        var lvlC = {
            'Mastery': [245, 158, 11], 'Expert': [168, 85, 247],
            'Advanced': [59, 130, 246], 'Proficient': [16, 185, 129],
            'Competent': [16, 185, 129], 'Novice': [107, 114, 128]
        };
        
        var rSkills = {}; roles.forEach(function(r) { rSkills[r.id] = []; });
        allSkills.forEach(function(sk) {
            var rid = (sk.r && sk.r[0]) || '';
            if (rSkills[rid]) rSkills[rid].push(sk);
            else if (roles.length > 0) rSkills[roles[0].id].push(sk);
        });
        
        var d3nodes = [];
        var d3links = [];
        
        // Center = candidate — PINNED
        d3nodes.push({
            id: 'cand-center', type: 'center', label: R.candidate.name,
            r: 70, fx: centerX, fy: centerY
        });
        
        // Role hubs — PINNED at fixed positions
        var hubRadius = Math.min(cW, cH) * 0.38;
        roles.forEach(function(role, i) {
            var angle = (i / roles.length) * Math.PI * 2 - Math.PI / 2;
            d3nodes.push({
                id: 'role-' + role.id, type: 'role', label: role.name,
                color: hex2rgb(role.color || '#3b82f6'), r: 60,
                fx: centerX + Math.cos(angle) * hubRadius,
                fy: centerY + Math.sin(angle) * hubRadius
            });
            d3links.push({ source: 'cand-center', target: 'role-' + role.id, type: 'hub' });
        });
        
        // Skill nodes by proficiency
        var _nid = 0;
        roles.forEach(function(role) {
            var sks = rSkills[role.id] || [];
            sks.forEach(function(sk) {
                d3nodes.push({
                    id: 'sk-' + (_nid++), type: 'skill', label: sk.n,
                    color: lvlC[sk.l] || [107, 114, 128],
                    r: lvlR[sk.l] || 20, level: sk.l
                });
                d3links.push({ source: 'role-' + role.id, target: 'sk-' + (_nid - 1), type: 'skill' });
            });
        });
        
        // D3 simulation — hubs pinned
        var sim = d3.forceSimulation(d3nodes)
            .force('link', d3.forceLink(d3links).id(function(d) { return d.id; }).distance(function(d) {
                return d.type === 'hub' ? hubRadius : hubRadius * 0.7;
            }).strength(1))
            .force('charge', d3.forceManyBody().strength(function(d) {
                if (d.fx !== undefined) return 0;
                return -800;
            }))
            .force('collision', d3.forceCollide().radius(function(d) {
                if (d.type === 'center') return 100;
                if (d.type === 'role') return 90;
                return 60;
            }).strength(1).iterations(3))
            .force('x', d3.forceX(centerX).strength(0.015))
            .force('y', d3.forceY(centerY).strength(0.015))
            .stop();
        
        for (var t = 0; t < 500; t++) sim.tick();
        
        var pad = 120;
        d3nodes.forEach(function(n) {
            if (n.fx !== undefined) return;
            n.x = Math.max(pad, Math.min(cW - pad, n.x));
            n.y = Math.max(pad, Math.min(cH - pad, n.y));
        });
        
        // ── DRAW ──
        
        // Links
        d3links.forEach(function(lk) {
            var s = lk.source, tg = lk.target;
            ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tg.x, tg.y);
            ctx.strokeStyle = lk.type === 'hub' ? 'rgba(80,100,150,0.1)' : 'rgba(50,65,100,0.06)';
            ctx.lineWidth = lk.type === 'hub' ? 1 : 0.5;
            ctx.stroke();
        });
        
        // Skill nodes
        d3nodes.forEach(function(n) {
            if (n.type === 'center' || n.type === 'role') return;
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = rgb(n.color); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.font = '24px Helvetica, Arial, sans-serif';
            ctx.fillStyle = 'rgb(148,163,184)';
            ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
            var lbl = n.label.length > 24 ? n.label.slice(0, 22) + '..' : n.label;
            ctx.fillText(lbl, n.x + n.r + 10, n.y);
        });
        
        // Role hubs
        d3nodes.forEach(function(n) {
            if (n.type !== 'role') return;
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3; ctx.stroke();
            ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = rgb(n.color); ctx.fill();
            ctx.font = 'bold 32px Helvetica, Arial, sans-serif';
            ctx.fillStyle = rgb(n.color); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            var rlbl = n.label.toUpperCase();
            if (rlbl.length > 22) rlbl = rlbl.slice(0, 20) + '..';
            ctx.fillText(rlbl, n.x, n.y - n.r - 12);
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        });
        
        // Center node
        var cn = d3nodes[0];
        ctx.beginPath(); ctx.arc(cn.x, cn.y, cn.r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.arc(cn.x, cn.y, cn.r, 0, Math.PI * 2);
        var grad = ctx.createRadialGradient(cn.x, cn.y, 0, cn.x, cn.y, cn.r);
        grad.addColorStop(0, 'rgb(40,70,140)'); grad.addColorStop(1, 'rgb(25,45,100)');
        ctx.fillStyle = grad; ctx.fill();
        ctx.font = 'bold 32px Helvetica, Arial, sans-serif';
        ctx.fillStyle = 'rgb(255,255,255)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(R.candidate.name, cn.x, cn.y);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        
        // Embed as JPEG
        try {
            var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
            doc.addImage(dataUrl, 'JPEG', M + 0.5, net2Y + 0.5, MW - 1, net2H - 1);
        } catch(e) { console.warn('Candidate canvas failed:', e); }
        
        // Legend
        var legY = net2Y + net2H - 8;
        sf([20, 24, 42]); sd(C.borderRGB); doc.setLineWidth(0.2);
        doc.roundedRect(M + 3, legY, 90, 5.5, 2, 2, 'FD');
        var lx = M + 6;
        [{ l: 'Mastery', c: C.am }, { l: 'Expert', c: C.purple }, { l: 'Advanced', c: C.a }, { l: 'Proficient', c: C.g }, { l: 'Novice', c: [107,114,128] }].forEach(function(li) {
            sf(li.c); doc.circle(lx + 1, legY + 2.8, 1.2, 'F');
            doc.setFontSize(5); sc(C.tm); doc.text(li.l, lx + 3.5, legY + 3.5);
            lx += doc.getTextWidth(li.l) + 7;
        });
    })();
    
    y = net2Y + net2H + 4;
    
    // ════════════════════════════════════════════════════════
    // 4. EDUCATION & CERTIFICATIONS
    // ════════════════════════════════════════════════════════
    var hasEdu = R.education && R.education.length > 0;
    var hasCerts = R.certifications && R.certifications.length > 0;
    if (hasEdu || hasCerts) {
        newPage();
        secHead('Education & Certifications', 'Credentials backing verified skills');
        
        if (hasEdu) {
            doc.setFontSize(6); doc.setFont(undefined, 'bold'); sc(C.tm);
            doc.text('EDUCATION', M + 2, y + 1); y += 5;
            doc.setFont(undefined, 'normal');
            
            R.education.forEach(function(edu) {
                check(18);
                card(M, y, MW, 16);
                doc.setFontSize(8); doc.setFont(undefined, 'bold'); sc(C.t1);
                var eduName = (edu.name || '').length > 40 ? edu.name.slice(0, 38) + '\u2026' : edu.name || '';
                doc.text(eduName, M + 6, y + 5.5);
                if (edu.vf) pill(M + 6 + doc.getTextWidth(eduName) + 3, y + 5.0, 'Verified', C.purple, C.white);
                doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); sc(C.t2);
                doc.text(edu.desc || '', M + 6, y + 10.5);
                doc.setFontSize(5.5); sc(C.tm);
                doc.text([edu.location, edu.dates].filter(Boolean).join('  \u2022  '), M + 6, y + 14);
                y += 19;
            });
        }
        
        if (hasCerts) {
            y += 2;
            doc.setFontSize(6); doc.setFont(undefined, 'bold'); sc(C.tm);
            doc.text('CERTIFICATIONS', M + 2, y + 1); y += 5;
            doc.setFont(undefined, 'normal');
            
            R.certifications.forEach(function(cert) {
                check(16);
                card(M, y, MW, 14);
                doc.setFontSize(8); doc.setFont(undefined, 'bold'); sc(C.t1);
                var certName = (cert.name || '').length > 40 ? cert.name.slice(0, 38) + '\u2026' : cert.name || '';
                doc.text(certName, M + 6, y + 5);
                pill(M + 6 + doc.getTextWidth(certName) + 3, y + 4.5, 'Cert', C.a, C.white);
                doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); sc(C.t2);
                doc.text([cert.desc, cert.dates].filter(Boolean).join('  \u2022  '), M + 6, y + 10);
                y += 17;
            });
        }
    }
    
    // ════════════════════════════════════════════════════════
    // 4b. PROFESSIONAL EXPERIENCE
    // ════════════════════════════════════════════════════════
    var hasWorkHistory = R.workHistory && R.workHistory.length > 0;
    if (hasWorkHistory) {
        check(30); if (y > 180) newPage();
        secHead('Professional Experience', 'Recent roles and career trajectory');
        
        R.workHistory.slice(0, 5).forEach(function(w) {
            check(16);
            card(M, y, MW, 14);
            
            // Title
            doc.setFontSize(8); doc.setFont(undefined, 'bold'); sc(C.t1);
            doc.text(w.title || 'Role', M + 6, y + 5);
            
            // Company + dates on same line
            doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); sc(C.t2);
            var expMeta = [w.company, w.dates].filter(Boolean).join('  \u2022  ');
            doc.text(expMeta, M + 6, y + 10);
            
            y += 17;
        });
    }
    
    // ════════════════════════════════════════════════════════
    // 5. VALUES & CULTURAL ALIGNMENT
    // ════════════════════════════════════════════════════════
    if (R.values && (R.values.candidate.length > 0 || R.values.company.length > 0)) {
        check(60); if (y > 100) newPage();
        secHead('Values & Cultural Alignment', 'Shared values linked — cultural fit signal');
        
        // Score — matches .val-sc
        var valScore = R.values.score || 0;
        var vsc = scoreColor(valScore);
        doc.setFontSize(18); doc.setFont(undefined, 'bold');
        doc.setTextColor(vsc[0], vsc[1], vsc[2]);
        doc.text(valScore + '%', W / 2, y + 4, { align: 'center' });
        doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); sc(C.tm);
        doc.text('Values Alignment', W / 2, y + 9, { align: 'center' });
        y += 14;
        
        // Values network (static)
        var vnY = y, vnH = 90;
        card(M, vnY, MW, vnH);
        
        var uVals = R.values.candidate || [];
        var cVals = R.values.company || [];
        var aSet = {};
        uVals.forEach(function(v) { if (v.s === 'aligned') aSet[v.n] = true; });
        
        var lX = M + MW * 0.26, rX = M + MW * 0.74, ctrY = vnY + vnH * 0.52;
        var hubY = vnY + vnH * 0.28;
        
        // Candidate hub
        sf(C.a); doc.circle(lX, hubY, 5, 'F');
        doc.setFontSize(5.5); doc.setFont(undefined, 'bold'); sc([147, 197, 253]);
        doc.text(firstName + "'s Values", lX, hubY - 7, { align: 'center' });
        
        // Company hub
        sf(C.am); doc.circle(rX, hubY, 5, 'F');
        sc([251, 191, 36]);
        doc.text(R.job.company + "'s Culture", rX, hubY - 7, { align: 'center' });
        doc.setFont(undefined, 'normal');
        
        // Candidate values
        uVals.forEach(function(v, i) {
            var angle = (i / uVals.length) * Math.PI * 0.8 + Math.PI * 0.6;
            var rd = 32;
            var vx = lX + Math.cos(angle) * rd;
            var vy = ctrY + Math.sin(angle) * rd * 0.65;
            vx = Math.max(M + 8, Math.min(M + MW - 8, vx));
            vy = Math.max(vnY + 8, Math.min(vnY + vnH - 8, vy));
            
            // Spoke
            sd([50, 65, 95]); doc.setLineWidth(0.08); doc.line(lX, hubY, vx, vy);
            
            var isA = aSet[v.n];
            var nc = isA ? C.g : C.am;
            var nr = isA ? 3 : 2.2;
            sf(nc); doc.circle(vx, vy, nr, 'F');
            if (isA) { sd(C.white); doc.setLineWidth(0.3); doc.circle(vx, vy, nr, 'S'); }
            
            doc.setFontSize(4.5); sc(isA ? C.g : C.am);
            doc.text(v.n, vx, vy - nr - 1.5, { align: 'center' });
            
            // Bridge to company if aligned
            if (isA) {
                var ci = cVals.findIndex(function(cv) { return cv.n === v.n; });
                if (ci !== -1) {
                    var cAngle = (ci / cVals.length) * Math.PI * 0.8 + Math.PI * 1.6;
                    var cvx = rX + Math.cos(cAngle) * rd;
                    var cvy = ctrY + Math.sin(cAngle) * rd * 0.65;
                    cvx = Math.max(M + 8, Math.min(M + MW - 8, cvx));
                    cvy = Math.max(vnY + 8, Math.min(vnY + vnH - 8, cvy));
                    sd(C.g); doc.setLineWidth(0.3);
                    // Dashed bridge
                    var dx = cvx - vx, dy = cvy - vy;
                    var len = Math.sqrt(dx * dx + dy * dy);
                    var dashLen = 2, gapLen = 1.5;
                    var nx = dx / len, ny = dy / len;
                    var pos = 0;
                    while (pos < len) {
                        var end = Math.min(pos + dashLen, len);
                        doc.line(vx + nx * pos, vy + ny * pos, vx + nx * end, vy + ny * end);
                        pos = end + gapLen;
                    }
                }
            }
        });
        
        // Company values
        cVals.forEach(function(v, i) {
            var angle = (i / cVals.length) * Math.PI * 0.8 + Math.PI * 1.6;
            var rd = 32;
            var vx = rX + Math.cos(angle) * rd;
            var vy = ctrY + Math.sin(angle) * rd * 0.65;
            vx = Math.max(M + 8, Math.min(M + MW - 8, vx));
            vy = Math.max(vnY + 8, Math.min(vnY + vnH - 8, vy));
            
            sd([50, 65, 95]); doc.setLineWidth(0.08); doc.line(rX, hubY, vx, vy);
            
            var isA = aSet[v.n];
            var nc = isA ? C.g : C.p;
            var nr = isA ? 3 : 2.2;
            sf(nc); doc.circle(vx, vy, nr, 'F');
            if (isA) { sd(C.white); doc.setLineWidth(0.3); doc.circle(vx, vy, nr, 'S'); }
            
            doc.setFontSize(4.5); sc(isA ? C.g : C.p);
            doc.text(v.n, vx, vy - nr - 1.5, { align: 'center' });
        });
        
        // Legend
        var vLegY = vnY + vnH - 7;
        sf([20, 24, 42]); sd(C.borderRGB); doc.setLineWidth(0.2);
        doc.roundedRect(M + 3, vLegY, 60, 5, 2, 2, 'FD');
        var vlx = M + 6;
        [{ l: 'Aligned', c: C.g }, { l: 'Candidate', c: C.am }, { l: 'Organization', c: C.p }].forEach(function(li) {
            sf(li.c); doc.circle(vlx + 1, vLegY + 2.5, 1, 'F');
            doc.setFontSize(5); sc(C.tm); doc.text(li.l, vlx + 3, vLegY + 3.2);
            vlx += doc.getTextWidth(li.l) + 7;
        });
        
        y = vnY + vnH + 4;
        
        // Narrative
        if (R.values.narrative) {
            check(12);
            var vnText = (R.values.narrative || '').replace(/<[^>]+>/g, '');
            sf([14, 20, 38]); sd([40, 55, 85]); doc.setLineWidth(0.3);
            var vnLines = doc.splitTextToSize(vnText, MW - 16);
            var vnlH = Math.min(vnLines.length, 4) * 3.5 + 8;
            doc.roundedRect(M, y, MW, vnlH, 2.5, 2.5, 'FD');
            doc.setFontSize(5); doc.setFont(undefined, 'bold'); sc(C.a);
            doc.text('CULTURAL FIT SIGNAL', M + 8, y + 4.5);
            doc.setFontSize(7); doc.setFont(undefined, 'normal'); sc(C.t2);
            doc.text(vnLines.slice(0, 4), M + 8, y + 8.5);
            y += vnlH + 4;
        }
    }
    
    // ════════════════════════════════════════════════════════
    // 6. SKILL ALIGNMENT DETAIL
    // ════════════════════════════════════════════════════════
    newPage();
    secHead('Skill Alignment Detail', 'Proficiency levels and match status');
    
    var sortedSkills = allSkills.slice().sort(function(a, b) {
        if (a.k && !b.k) return -1; if (!a.k && b.k) return 1;
        return (lvlVal[b.l] || 0) - (lvlVal[a.l] || 0);
    });
    
    sortedSkills.slice(0, 60).forEach(function(sk) {
        check(8);
        // Skill row card — matches .sk-r
        card(M, y, MW, 7);
        
        // Proficiency dot
        var lc = lvlColor[sk.l] || C.tm;
        sf(lc); doc.circle(M + 5, y + 3.5, 1.2, 'F');
        
        // Skill name
        doc.setFontSize(7); doc.setFont(undefined, 'bold'); sc(C.t1);
        var sName = sk.n.length > 32 ? sk.n.slice(0, 30) + '\u2026' : sk.n;
        doc.text(sName, M + 9, y + 4.5);
        doc.setFont(undefined, 'normal');
        
        // Verified badge
        if (sk.vf) {
            var bx = M + 9 + doc.getTextWidth(sName) + 2;
            if (bx < M + MW - 65) {
                var bc = sk.vf === 'cert' ? C.a : sk.vf === 'edu' ? C.purple : C.g;
                var bt = sk.vf === 'cert' ? '\u2713 ' + (sk.vfLabel || 'Cert') : sk.vf === 'edu' ? '\u2713 Verified' : '\u2713';
                if (bt.length > 14) bt = bt.slice(0, 12) + '\u2026';
                pill(bx, y + 4.5, bt, bc, C.white);
            }
        }
        
        // Required label
        if (sk.k) {
            doc.setFontSize(5); sc(C.tm);
            var reqX = M + MW - 55;
            sf([20, 24, 42]); doc.roundedRect(reqX, y + 2, 14, 3.8, 1.5, 1.5, 'F');
            doc.text('REQUIRED', reqX + 1.5, y + 4.6);
        }
        
        // Proficiency label
        doc.setFontSize(5); doc.setTextColor(lc[0], lc[1], lc[2]);
        doc.text(sk.l || 'Proficient', M + MW - 37, y + 4.5, { align: 'right' });
        
        // Proficiency bar — matches .sk-bars
        var barX = M + MW - 22, barW = 18, barH = 1.5;
        sf([25, 30, 50]); doc.roundedRect(barX, y + 3, barW, barH, 0.5, 0.5, 'F');
        var fillW = ((lvlVal[sk.l] || 2) / 5) * barW;
        sf(lc); doc.roundedRect(barX, y + 3, fillW, barH, 0.5, 0.5, 'F');
        
        y += 8.5;
    });
    
    if (allSkills.length > 60) {
        y += 2; doc.setFontSize(6); sc(C.tm);
        doc.text('+ ' + (allSkills.length - 60) + ' additional skills in the interactive report.', M + 4, y);
        y += 4;
    }
    
    // ════════════════════════════════════════════════════════
    // 7. GAP ANALYSIS & BRIDGE POTENTIAL
    // ════════════════════════════════════════════════════════
    if (gaps.length > 0) {
        check(25); if (y > 180) newPage();
        secHead('Gap Analysis & Bridge Potential', 'Missing skills with adjacent competencies');
        
        gaps.forEach(function(gap) {
            check(20);
            // Gap card — matches .gap-c (red border)
            sf(C.card); sd([60, 30, 30]); doc.setLineWidth(0.3);
            doc.roundedRect(M, y, MW, 17, 2.5, 2.5, 'FD');
            
            // Gap name + priority
            doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); sc(C.r);
            doc.text(gap.n, M + 6, y + 5.5);
            var priLabel = gap.rq === 'Required' ? 'REQUIRED' : 'PREFERRED';
            pill(M + 6 + doc.getTextWidth(gap.n) + 3, y + 5.5, priLabel, gap.rq === 'Required' ? [60, 20, 25] : [50, 40, 15], gap.rq === 'Required' ? C.r : C.am);
            
            // Bridge narrative
            doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); sc(C.t2);
            var brLines = doc.splitTextToSize(gap.br || '', MW - 14);
            doc.text(brLines.slice(0, 2), M + 6, y + 10);
            
            // Adjacent skill tags
            if (gap.adj && gap.adj.length > 0) {
                var tagX = M + 6;
                var tagY = y + 14.5;
                gap.adj.forEach(function(adj) {
                    var tw = doc.getTextWidth(adj) + 6;
                    if (tagX + tw > M + MW - 6) return;
                    sf([16, 30, 28]); sd([20, 60, 50]); doc.setLineWidth(0.15);
                    doc.roundedRect(tagX, tagY - 2, tw, 3.8, 1.5, 1.5, 'FD');
                    doc.setFontSize(5); sc(C.g); doc.text(adj, tagX + 3, tagY + 0.5);
                    tagX += tw + 2;
                });
            }
            
            y += 20;
        });
    }
    
    // ════════════════════════════════════════════════════════
    // 8. OUTCOMES & ACHIEVEMENTS
    // ════════════════════════════════════════════════════════
    if (R.outcomes && R.outcomes.length > 0) {
        check(25); if (y > 180) newPage();
        secHead('Outcomes & Achievements', 'Verified results from prior roles');
        
        R.outcomes.forEach(function(o) {
            // Outcome card — matches .outc
            var ct = (o.text || '').replace(/<[^>]+>/g, '');
            doc.setFontSize(6.5);
            var oLines = doc.splitTextToSize(ct, MW - 18);
            var ocH = oLines.length * 3.2 + 6;
            check(ocH + 3);
            card(M, y, MW, ocH);
            // Bullet marker
            sf(C.g); doc.circle(M + 5, y + 5, 1, 'F');
            doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); sc(C.t2);
            for (var oi = 0; oi < oLines.length; oi++) {
                doc.text(oLines[oi], M + 9, y + 5 + oi * 3.2);
            }
            y += ocH + 3;
        });
    }
    
    // ════════════════════════════════════════════════════════
    // 9. COMPETENCY DOMAINS
    // ════════════════════════════════════════════════════════
    if (R.domains && R.domains.length > 0) {
        check(50); if (y > 140) newPage();
        secHead('Competency Domains', 'Distribution across professional clusters');
        
        // Proficiency grid — matches .pgrid (5 cards in a row)
        var prof = R.proficiency || {};
        var profOrder = ['Mastery', 'Expert', 'Advanced', 'Proficient', 'Novice'];
        var profColors = [C.am, C.purple, C.a, C.g, [107, 114, 128]];
        var pgW = (MW - 8) / 5;
        
        profOrder.forEach(function(lv, i) {
            var px = M + i * (pgW + 2);
            card(px, y, pgW, 13);
            doc.setFontSize(12); doc.setFont(undefined, 'bold');
            doc.setTextColor(profColors[i][0], profColors[i][1], profColors[i][2]);
            doc.text(String(prof[lv] || 0), px + pgW / 2, y + 6, { align: 'center' });
            doc.setFontSize(4.5); doc.setFont(undefined, 'normal'); sc(C.tm);
            doc.text(lv.toUpperCase(), px + pgW / 2, y + 10.5, { align: 'center' });
        });
        y += 18;
        
        // Domain bars — matches .dom-r
        var maxDC = Math.max.apply(null, R.domains.map(function(d) { return d.c; })) || 1;
        R.domains.forEach(function(dom) {
            check(8);
            sd(C.borderRGB); doc.setLineWidth(0.1); doc.line(M, y + 5.5, W - M, y + 5.5);
            
            var rc = dom.cl || '#3b82f6';
            var rgb = [parseInt(rc.slice(1,3),16)||59, parseInt(rc.slice(3,5),16)||130, parseInt(rc.slice(5,7),16)||246];
            
            // Domain name
            doc.setFontSize(7); doc.setFont(undefined, 'bold'); sc(C.t1);
            var dl = dom.n.length > 22 ? dom.n.slice(0, 20) + '\u2026' : dom.n;
            doc.text(dl, M + 2, y + 4);
            doc.setFont(undefined, 'normal');
            
            // Bar
            var barX = M + 46, barW2 = MW - 72;
            sf([20, 24, 42]); doc.roundedRect(barX, y + 1.5, barW2, 3, 1, 1, 'F');
            var fillW = (dom.c / maxDC) * barW2;
            if (fillW > 1) { sf(rgb); doc.roundedRect(barX, y + 1.5, fillW, 3, 1, 1, 'F'); }
            
            // Count
            doc.setFontSize(6.5); sc(C.tm);
            var pct = Math.round((dom.c / (dom.m || 1)) * 100);
            doc.text(dom.c + ' (' + pct + '%)', W - M - 2, y + 4, { align: 'right' });
            
            y += 7;
        });
    }
    
    // ════════════════════════════════════════════════════════
    // 10. COMPENSATION INTELLIGENCE
    // ════════════════════════════════════════════════════════
    (function drawComp() {
        // Privacy: compensation blinding
        if (R._hideCompensation) {
            check(30); if (y > 200) newPage();
            secHead('Compensation Intelligence', 'Market positioning & benchmarks');
            card(M, y, MW, 24);
            doc.setFontSize(14); sc(C.tm);
            doc.text('$', W / 2, y + 7, { align: 'center' });
            doc.setFontSize(8); doc.setFont(undefined, 'bold'); sc(C.t2);
            doc.text('Compensation Data Withheld', W / 2, y + 13, { align: 'center' });
            doc.setFont(undefined, 'normal'); doc.setFontSize(6.5); sc(C.tm);
            doc.text('Hidden per candidate privacy settings. Available upon request.', W / 2, y + 17.5, { align: 'center' });
            y += 28;
            return;
        }
        var comp = getEffectiveComp();
        if (!comp || !comp.marketRate) {
            // Teaser — matches .teaser
            check(30); if (y > 200) newPage();
            secHead('Compensation Intelligence', 'Market positioning & benchmarks');
            card(M, y, MW, 24);
            doc.setFontSize(14); sc(C.tm);
            doc.text('$', W / 2, y + 7, { align: 'center' });
            doc.setFontSize(8); doc.setFont(undefined, 'bold'); sc(C.t2);
            doc.text('Compensation Data Available', W / 2, y + 13, { align: 'center' });
            doc.setFont(undefined, 'normal'); doc.setFontSize(6.5); sc(C.tm);
            doc.text('Market rate analysis and BLS benchmarks have been prepared.', W / 2, y + 17.5, { align: 'center' });
            doc.setFontSize(5.5);
            doc.text('Candidate-controlled release', W / 2, y + 21, { align: 'center' });
            y += 28;
            return;
        }
        check(45); if (y > 160) newPage();
        secHead('Compensation Intelligence', 'Market positioning & benchmarks');
        
        var rows;
        if (comp.compSource === 'curated' || comp.compSource === 'reported') {
            rows = [
                [comp.compLabel || 'Reported', formatCompValue(comp.displayComp), 'Self-reported'],
                ['BLS Benchmark', formatCompValue(comp.algorithmEstimate), 'Bureau of Labor Statistics'],
                ['Function', ((comp.detectedFunction || 'general').charAt(0).toUpperCase() + (comp.detectedFunction || 'general').slice(1)), 'Detected function']
            ];
        } else {
            rows = [
                ['Base Market Rate', '$' + Math.round(comp.marketRate).toLocaleString(), 'BLS median'],
                ['Conservative', '$' + Math.round(comp.conservativeOffer || comp.marketRate * 1.1).toLocaleString(), 'Evidence premium'],
                ['Standard', '$' + Math.round(comp.standardOffer || comp.marketRate * 1.2).toLocaleString(), 'Market-competitive'],
                ['Competitive', '$' + Math.round(comp.competitiveOffer || comp.marketRate * 1.3).toLocaleString(), 'Full portfolio']
            ];
        }
        
        rows.forEach(function(row, idx) {
            check(7);
            if (idx % 2 === 0) { sf([14, 18, 36]); doc.rect(M, y - 2, MW, 6.5, 'F'); }
            doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); sc(C.t1);
            doc.text(row[0], M + 4, y + 1.5);
            doc.setFont(undefined, 'bold'); sc(C.a);
            doc.text(row[1], M + 65, y + 1.5);
            doc.setFont(undefined, 'normal'); doc.setFontSize(6); sc(C.tm);
            doc.text(row[2], M + 105, y + 1.5);
            y += 7;
        });
    })();
    
    // ════════════════════════════════════════════════════════
    // 11. RECRUITER RECOMMENDATION
    // ════════════════════════════════════════════════════════
    check(45); if (y > 180) newPage();
    secHead('Recommendation', 'Summary assessment for hiring team');
    
    // Verdict card
    var verdict = matchPct >= 80 ? 'Strong Fit' : matchPct >= 60 ? 'Promising Candidate' : matchPct >= 40 ? 'Conditional Fit' : 'Development Needed';
    var verdictColor = matchPct >= 80 ? C.g : matchPct >= 60 ? C.a : matchPct >= 40 ? C.am : C.r;
    var verdictAdvice = matchPct >= 80 ? 'Recommend proceeding to phone screen. This candidate matches the majority of required competencies and demonstrates strong alignment.'
        : matchPct >= 60 ? 'Worth further evaluation. Core competencies are present with some gaps that may be bridgeable through adjacent skills.'
        : matchPct >= 40 ? 'Targeted evaluation recommended. Key gaps exist but candidate brings transferable strengths worth discussing.'
        : 'Significant skill gaps identified. Consider only if other differentiators (culture fit, growth potential) outweigh technical requirements.';
    
    card(M, y, MW, 36);
    
    // Large verdict text
    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2]);
    doc.text(verdict, M + 8, y + 9);
    
    // Match score + gaps summary
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); sc(C.t2);
    doc.text(matchPct + '% skill match  \u2022  ' + matched.length + ' matched  \u2022  ' + gaps.length + ' gap' + (gaps.length !== 1 ? 's' : '') + '  \u2022  ' + Math.max(0, surplus) + ' surplus', M + 8, y + 15);
    
    // Advice text
    doc.setFontSize(7); sc(C.tm);
    var advLines = doc.splitTextToSize(verdictAdvice, MW - 16);
    doc.text(advLines, M + 8, y + 21);
    
    // Key strengths and concerns
    var keyStrengths = matched.filter(function(m) { return m.requirement === 'Required'; }).slice(0, 3).map(function(m) { return m.userSkill; });
    if (keyStrengths.length > 0) {
        doc.setFontSize(5.5); doc.setFont(undefined, 'bold'); sc(C.g);
        doc.text('KEY STRENGTHS: ', M + 8, y + 32);
        doc.setFont(undefined, 'normal'); sc(C.t2);
        doc.text(keyStrengths.join(', '), M + 8 + doc.getTextWidth('KEY STRENGTHS: ') + 1, y + 32);
    }
    
    y += 40;
    
    // ════════════════════════════════════════════════════════
    // BACK COVER
    // ════════════════════════════════════════════════════════
    newPage();
    var fy = H / 2 - 20;
    sf(C.a); doc.circle(W/2, fy, 3, 'F');
    sd(C.a); doc.setLineWidth(0.2); doc.circle(W/2, fy, 10, 'S');
    doc.line(W/2, fy, W/2-7, fy-6); doc.line(W/2, fy, W/2+8, fy-5);
    doc.line(W/2, fy, W/2+7, fy+7); doc.line(W/2, fy, W/2-6, fy+7);
    sf([147, 187, 252]); doc.circle(W/2-7, fy-6, 1.3, 'F'); doc.circle(W/2+7, fy+7, 1.3, 'F');
    sf([168, 85, 247]); doc.circle(W/2+8, fy-5, 1.1, 'F'); doc.circle(W/2-6, fy+7, 1.1, 'F');
    fy += 16;
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); sc(C.a);
    doc.text('BLUEPRINT\u2122', W/2, fy, { align: 'center' });
    fy += 5; doc.setFontSize(7); doc.setFont(undefined, 'normal'); sc(C.tm);
    doc.text('Career Intelligence Platform', W/2, fy, { align: 'center' });
    fy += 10; doc.setFontSize(7.5); sc(C.t2);
    doc.text('Scouting report generated from ' + name + '\u2019s Blueprint profile.', W/2, fy, { align: 'center' });
    fy += 5; doc.text('Targeted analysis for: ' + R.job.title + ' at ' + R.job.company, W/2, fy, { align: 'center' });
    fy += 5; doc.text('A living capability analysis, not a static document.', W/2, fy, { align: 'center' });
    fy += 10; doc.setFontSize(9); doc.setFont(undefined, 'bold'); sc(C.a);
    doc.text('myblueprint.work', W/2, fy, { align: 'center' });
    fy += 10; doc.setFontSize(5.5); doc.setFont(undefined, 'normal'); sc(C.tm);
    doc.text('\u00A9 ' + new Date().getFullYear() + ' Cliff Jurkiewicz. All rights reserved.', W/2, fy, { align: 'center' });
    fy += 3.5; doc.text('Blueprint\u2122 and its associated methodologies are the intellectual property of Cliff Jurkiewicz.', W/2, fy, { align: 'center' });
    addFooter();
    
    // Save
    var dateStr = new Date().toISOString().split('T')[0];
    var jobSlug = (R.job.company || R.job.title || 'job').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30);
    var fileName = ('Blueprint_' + name.replace(/\s+/g, '_') + '_ScoutingReport_' + jobSlug + '_' + dateStr + '.pdf').replace(/[^a-zA-Z0-9_\-.]/g, '');
    doc.save(fileName);
    showToast('Scouting Report PDF downloaded.', 'success');
}


export function exportBlueprint(format) {
    // Demo lockdown: no exports on sample profiles (scouting report PDF uses its own path)
    if (window.isReadOnlyProfile) {
        demoGate('export your Blueprint');
        return;
    }
    logAnalyticsEvent('export_' + format, { format: format });
    var sharedData = {
        profile: window._userData.profile || {},
        outcomes: _bd().outcomes.filter(function(o) { return o.shared; }),
        values: _bd().values.filter(function(v) { return v.selected; }),
        purpose: _bd().purpose,
        skills: (_sd().skills || []).map(function(s) {
            return { name: s.name, level: s.level, category: s.category, key: s.key, roles: s.roles };
        }),
        roles: _sd().roles || [],
        exportedAt: new Date().toISOString()
    };
    
    if (format === 'json') {
        var dataStr = JSON.stringify(sharedData, null, 2);
        var dataBlob = new Blob([dataStr], {type: 'application/json'});
        var url = URL.createObjectURL(dataBlob);
        var link = document.createElement('a');
        link.href = url;
        var safeName = ((window._userData.profile && window._userData.profile.name) || 'profile').replace(/\s+/g, '-').toLowerCase();
        link.download = 'blueprint-' + safeName + '.json';
        link.click();
        URL.revokeObjectURL(url);
        showToast('JSON exported. Use this for backups or data portability.', 'success');
    } else if (format === 'pdf') {
        generatePDF(sharedData);
    }
}

export function generatePDF(data, targetJob) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    
    var isScoutingReport = !!(targetJob && targetJob.matchData);
    
    var pageWidth = doc.internal.pageSize.getWidth();   // 210
    var pageHeight = doc.internal.pageSize.getHeight();  // 297
    var margin = 18;
    var maxWidth = pageWidth - (margin * 2);
    var name = (window._userData.profile && window._userData.profile.name) || 'Blueprint';
    var title = (window._userData.profile && window._userData.profile.currentTitle) || '';
    var location = (window._userData.profile && window._userData.profile.location) || '';
    var dateLine = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var skills = _sd().skills || [];
    var roles = typeof getVisibleRoles === 'function' ? getVisibleRoles() : (_sd().roles || []);
    var yPos = 0;
    var pageNum = 0;
    
    // Color palette
    var C = {
        brand: [30, 64, 175],       // #1e40af
        accent: [96, 165, 250],      // #60a5fa
        dark: [15, 23, 42],          // #0f172a
        text: [30, 41, 59],          // #1e293b
        textLight: [100, 116, 139],  // #64748b
        textMuted: [148, 163, 184],  // #94a3b8
        green: [16, 185, 129],       // #10b981
        amber: [245, 158, 11],       // #f59e0b
        rose: [244, 114, 182],       // #f472b6
        purple: [129, 140, 248],     // #818cf8
        bgLight: [248, 250, 252],    // #f8fafc
        border: [226, 232, 240],     // #e2e8f0
        white: [255, 255, 255],
        red: [239, 68, 68],          // #ef4444
        orange: [249, 115, 22]       // #f97316
    };
    
    // Level colors
    var levelColor = {
        'Mastery': C.red,
        'Expert': C.orange,
        'Advanced': C.amber,
        'Proficient': C.green,
        'Novice': C.textMuted
    };
    
    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    
    function setColor(c) { doc.setTextColor(c[0], c[1], c[2]); }
    function setDraw(c) { doc.setDrawColor(c[0], c[1], c[2]); }
    function setFill(c) { doc.setFillColor(c[0], c[1], c[2]); }
    
    function newPage() {
        if (pageNum > 0) addFooter();
        if (pageNum > 0) doc.addPage();
        pageNum++;
        yPos = margin;
        // Header line on non-cover pages
        if (pageNum > 1) {
            doc.setFontSize(6.5);
            setColor(C.textMuted);
            doc.text('BLUEPRINT\u2122 CAREER INTELLIGENCE REPORT', margin, 10);
            doc.text('CONFIDENTIAL', pageWidth - margin, 10, { align: 'right' });
            setDraw(C.border);
            doc.setLineWidth(0.3);
            doc.line(margin, 12, pageWidth - margin, 12);
            yPos = 18;
        }
    }
    
    function checkPage(needed) {
        if (yPos + needed > pageHeight - 22) {
            newPage();
        }
    }
    
    function addFooter() {
        setDraw(C.border);
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
        doc.setFontSize(6.5);
        setColor(C.textMuted);
        doc.text(name + '  \u2022  ' + dateLine + '  \u2022  myblueprint.work', margin, pageHeight - 10);
        doc.text('Page ' + pageNum, pageWidth - margin, pageHeight - 10, { align: 'right' });
        doc.setFontSize(5.5);
        doc.text('\u00A9 ' + new Date().getFullYear() + ' Cliff Jurkiewicz. All rights reserved.', margin, pageHeight - 7);
    }
    
    function sectionHead(label, heading) {
        checkPage(22);
        yPos += 6;
        // Label
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        setColor(C.accent);
        doc.text(label.toUpperCase(), margin, yPos);
        yPos += 5;
        // Heading
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        setColor(C.dark);
        doc.text(heading, margin, yPos);
        yPos += 3;
        // Accent bar
        setDraw(C.accent);
        doc.setLineWidth(0.8);
        doc.line(margin, yPos, margin + 40, yPos);
        yPos += 6;
        doc.setFont(undefined, 'normal');
    }
    
    
    // ============================================================
    // PAGE 1: COVER
    // ============================================================
    pageNum = 1;
    
    // Dark header band
    setFill(C.dark);
    doc.rect(0, 0, pageWidth, 105, 'F');
    
    // Accent line
    setFill(C.accent);
    doc.rect(0, 105, pageWidth, 1.2, 'F');
    
    // Blueprint logo mark — mini network graph
    var cx = pageWidth / 2;
    var cy = 38;
    var nodes = [
        { x: cx, y: cy, r: 3.5, color: C.accent },          // center
        { x: cx - 18, y: cy - 14, r: 2, color: [147, 187, 252] },  // TL
        { x: cx + 20, y: cy - 12, r: 1.8, color: C.purple },       // TR
        { x: cx + 18, y: cy + 15, r: 2, color: [147, 187, 252] },  // BR
        { x: cx - 16, y: cy + 16, r: 1.8, color: C.purple },       // BL
        { x: cx - 8, y: cy - 22, r: 1.2, color: C.green },
        { x: cx + 10, y: cy - 20, r: 1.3, color: C.amber },
        { x: cx + 25, y: cy + 2, r: 1.1, color: C.rose },
        { x: cx - 24, y: cy + 4, r: 1.2, color: C.green },
    ];
    
    // Draw connections
    setDraw([96, 165, 250]);
    doc.setLineWidth(0.2);
    for (var ni = 1; ni < nodes.length; ni++) {
        doc.line(nodes[0].x, nodes[0].y, nodes[ni].x, nodes[ni].y);
    }
    // Cross-connections
    doc.setLineWidth(0.1);
    doc.line(nodes[1].x, nodes[1].y, nodes[2].x, nodes[2].y);
    doc.line(nodes[2].x, nodes[2].y, nodes[3].x, nodes[3].y);
    doc.line(nodes[3].x, nodes[3].y, nodes[4].x, nodes[4].y);
    doc.line(nodes[4].x, nodes[4].y, nodes[1].x, nodes[1].y);
    doc.line(nodes[5].x, nodes[5].y, nodes[6].x, nodes[6].y);
    doc.line(nodes[7].x, nodes[7].y, nodes[3].x, nodes[3].y);
    doc.line(nodes[8].x, nodes[8].y, nodes[4].x, nodes[4].y);
    
    // Outer ring
    setDraw([96, 165, 250]);
    doc.setLineWidth(0.3);
    doc.circle(cx, cy, 28, 'S');
    
    // Draw nodes
    nodes.forEach(function(n) {
        setFill(n.color);
        doc.circle(n.x, n.y, n.r, 'F');
    });
    
    // Title text
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(96, 165, 250);
    doc.text('BLUEPRINT\u2122', cx, cy + 36, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('CAREER INTELLIGENCE REPORT', cx, cy + 42, { align: 'center' });
    
    // Target job subtitle on cover
    if (isScoutingReport) {
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(200, 210, 230);
        doc.text('PREPARED FOR: ' + (targetJob.title || '').toUpperCase(), cx, cy + 48, { align: 'center' });
        if (targetJob.company) {
            doc.setFontSize(7);
            doc.text(targetJob.company.toUpperCase(), cx, cy + 53, { align: 'center' });
        }
    }
    
    // Name block
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(name, cx, cy + 56, { align: 'center' });
    
    // Info below dark band
    yPos = 116;
    if (title) {
        doc.setFontSize(13);
        doc.setFont(undefined, 'normal');
        setColor(C.text);
        doc.text(title, cx, yPos, { align: 'center' });
        yPos += 7;
    }
    if (location) {
        doc.setFontSize(9);
        setColor(C.textLight);
        doc.text(location, cx, yPos, { align: 'center' });
        yPos += 7;
    }
    doc.setFontSize(9);
    setColor(C.textMuted);
    doc.text(dateLine, cx, yPos, { align: 'center' });
    yPos += 12;
    
    // Quick stats boxes
    var comp = getEffectiveComp();
    var masteryCount = skills.filter(function(s) { return s.level === 'Mastery'; }).length;
    var advancedCount = skills.filter(function(s) { return s.level === 'Advanced'; }).length;
    var pdfExpertCount = skills.filter(function(s) { return s.level === 'Expert'; }).length;
    var evidenceCount = 0;
    skills.forEach(function(s) { evidenceCount += (s.evidence || []).length; });
    var outcomeCount = (data.outcomes || []).length;
    
    var stats = [];
    if (isScoutingReport) {
        var matchScore = targetJob.matchData.score || 0;
        stats = [
            { value: matchScore + '%', label: 'Match Score' },
            { value: String(skills.length), label: 'Total Skills' },
            { value: String((targetJob.matchData.matched || []).length), label: 'Skills Aligned' },
            { value: String((targetJob.matchData.gaps || []).length), label: 'Gaps' }
        ];
    } else {
        stats = [
            { value: String(skills.length), label: 'Total Skills' },
            { value: String(roles.length), label: 'Roles' },
            { value: String(masteryCount + pdfExpertCount), label: 'Expert+' },
            { value: String(evidenceCount), label: 'Evidence Items' }
        ];
    }
    
    var boxW = (maxWidth - 9) / 4;
    var boxX = margin;
    var boxY = yPos;
    stats.forEach(function(stat, i) {
        setFill(C.bgLight);
        setDraw(C.border);
        doc.setLineWidth(0.3);
        doc.roundedRect(boxX, boxY, boxW, 18, 2, 2, 'FD');
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        setColor(C.brand);
        doc.text(stat.value, boxX + boxW / 2, boxY + 8, { align: 'center' });
        
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'normal');
        setColor(C.textMuted);
        doc.text(stat.label.toUpperCase(), boxX + boxW / 2, boxY + 13.5, { align: 'center' });
        
        boxX += boxW + 3;
    });
    yPos = boxY + 26;
    
    // Purpose on cover
    if (data.purpose && data.purpose.trim()) {
        setDraw(C.accent);
        doc.setLineWidth(0.6);
        doc.line(margin, yPos, margin, yPos + 18);
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        setColor(C.text);
        var purposeLines = doc.splitTextToSize(data.purpose.trim(), maxWidth - 8);
        doc.text(purposeLines.slice(0, 4), margin + 4, yPos + 5);
        yPos += Math.min(purposeLines.length, 4) * 5 + 10;
        doc.setFont(undefined, 'normal');
    }
    
    // Market positioning on cover
    if (comp && (comp.displayComp || comp.marketRate)) {
        yPos += 4;
        setFill(C.dark);
        doc.roundedRect(margin, yPos, maxWidth, 28, 3, 3, 'F');
        
        var colW = maxWidth / 3;
        var mLabels, mValues;
        if (comp.compSource === 'curated' || comp.compSource === 'reported') {
            mLabels = [comp.compLabel, 'BLS Benchmark', 'Function'];
            mValues = [
                formatCompValue(comp.displayComp),
                formatCompValue(comp.algorithmEstimate),
                (comp.detectedFunction || 'general').charAt(0).toUpperCase() + (comp.detectedFunction || 'general').slice(1)
            ];
        } else {
            mLabels = ['Base Market Rate', 'Conservative Range', 'Competitive Range'];
            mValues = [
                '$' + Math.round(comp.marketRate).toLocaleString(),
                '$' + Math.round(comp.conservativeOffer || comp.marketRate * 1.1).toLocaleString(),
                '$' + Math.round(comp.competitiveOffer || comp.marketRate * 1.3).toLocaleString()
            ];
        }
        
        mLabels.forEach(function(label, i) {
            var cx2 = margin + (colW * i) + colW / 2;
            doc.setFontSize(6);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text(label.toUpperCase(), cx2, yPos + 8, { align: 'center' });
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(96, 165, 250);
            doc.text(mValues[i], cx2, yPos + 17, { align: 'center' });
            
            // Vertical divider
            if (i < 2) {
                doc.setDrawColor(50, 60, 80);
                doc.setLineWidth(0.2);
                doc.line(margin + colW * (i + 1), yPos + 4, margin + colW * (i + 1), yPos + 24);
            }
        });
        yPos += 36;
    }
    
    // Confidentiality
    doc.setFontSize(7);
    setColor(C.textMuted);
    doc.text('CONFIDENTIAL \u2014 This document contains proprietary career intelligence data.', cx, pageHeight - 20, { align: 'center' });
    addFooter();
    
    // ============================================================
    // SCOUTING REPORT: MATCH ANALYSIS (if targeting a job)
    // ============================================================
    if (isScoutingReport) {
        var match = targetJob.matchData;
        var matchScore = match.score || 0;
        var matchedSkills = match.matched || [];
        var gapSkills = match.gaps || [];
        var surplusSkills = match.surplus || [];
        
        // ---- PAGE: MATCH OVERVIEW ----
        newPage();
        sectionHead('Match Analysis', (targetJob.title || 'Target Position') + ' \u2014 ' + (targetJob.company || ''));
        
        // Score circle (large, centered)
        var scoreCx = pageWidth / 2;
        var scoreCy = yPos + 28;
        var scoreR = 22;
        var scoreColor = matchScore >= 70 ? C.green : matchScore >= 50 ? C.amber : C.rose;
        
        // Background ring
        setDraw(C.border);
        doc.setLineWidth(3);
        doc.circle(scoreCx, scoreCy, scoreR, 'S');
        
        // Score arc (filled portion)
        setDraw(scoreColor);
        doc.setLineWidth(3.5);
        var arcEnd = (matchScore / 100) * 360;
        // Draw arc as series of line segments
        for (var ai = 0; ai < arcEnd; ai += 2) {
            var a1 = ((ai - 90) * Math.PI) / 180;
            var a2 = ((ai + 2 - 90) * Math.PI) / 180;
            doc.line(
                scoreCx + Math.cos(a1) * scoreR,
                scoreCy + Math.sin(a1) * scoreR,
                scoreCx + Math.cos(a2) * scoreR,
                scoreCy + Math.sin(a2) * scoreR
            );
        }
        
        // Score text
        doc.setFontSize(28);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        doc.text(matchScore + '%', scoreCx, scoreCy + 4, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        setColor(C.textMuted);
        doc.text('MATCH SCORE', scoreCx, scoreCy + 11, { align: 'center' });
        
        // Flanking stats
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        setColor(C.green);
        doc.text(String(matchedSkills.length), scoreCx - 50, scoreCy + 2, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'normal');
        setColor(C.textMuted);
        doc.text('SKILLS ALIGNED', scoreCx - 50, scoreCy + 8, { align: 'center' });
        
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        setColor(C.rose);
        doc.text(String(gapSkills.length), scoreCx + 50, scoreCy + 2, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont(undefined, 'normal');
        setColor(C.textMuted);
        doc.text('GAPS', scoreCx + 50, scoreCy + 8, { align: 'center' });
        
        yPos = scoreCy + scoreR + 14;
        
        // Executive match summary
        var strongMatches = matchedSkills.filter(function(m) { return m.profMatch >= 0.9 && m.requirement === 'Required'; });
        var partialMatches = matchedSkills.filter(function(m) { return m.profMatch < 0.9; });
        var requiredGaps = gapSkills.filter(function(g) { return g.requirement === 'Required'; });
        
        setFill(C.bgLight);
        setDraw(C.border);
        doc.setLineWidth(0.3);
        var summaryH = 32;
        doc.roundedRect(margin, yPos, maxWidth, summaryH, 3, 3, 'FD');
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        setColor(C.dark);
        doc.text('EXECUTIVE SUMMARY', margin + 8, yPos + 7);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        setColor(C.text);
        
        var summaryText = name + ' demonstrates a ' + matchScore + '% skill alignment with the '
            + (targetJob.title || 'target') + ' position'
            + (targetJob.company ? ' at ' + targetJob.company : '') + '. ';
        if (strongMatches.length > 0) {
            summaryText += strongMatches.length + ' of ' + matchedSkills.length + ' matched skills meet or exceed the required proficiency level. ';
        }
        if (requiredGaps.length > 0) {
            summaryText += requiredGaps.length + ' required skill' + (requiredGaps.length > 1 ? 's' : '') + ' represent development opportunities. ';
        }
        if (surplusSkills.length > 5) {
            summaryText += 'Additionally, ' + surplusSkills.length + ' skills in the candidate\'s portfolio extend beyond the stated requirements, indicating breadth and adaptability.';
        }
        
        var sumLines = doc.splitTextToSize(summaryText, maxWidth - 16);
        doc.text(sumLines.slice(0, 4), margin + 8, yPos + 13);
        yPos += summaryH + 8;
        
        // ---- PAGE: SKILL ALIGNMENT TABLE ----
        if (matchedSkills.length > 0) {
            checkPage(30);
            if (yPos > 130) newPage();
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            setColor(C.dark);
            doc.text('Skill Alignment (' + matchedSkills.length + ' matched)', margin, yPos);
            doc.setFont(undefined, 'normal');
            yPos += 6;
            
            // Table header
            setFill(C.dark);
            doc.roundedRect(margin, yPos, maxWidth, 7, 1, 1, 'F');
            doc.setFontSize(6.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(200, 210, 230);
            doc.text('REQUIRED SKILL', margin + 4, yPos + 4.5);
            doc.text('CANDIDATE SKILL', margin + 62, yPos + 4.5);
            doc.text('LEVEL', margin + 118, yPos + 4.5);
            doc.text('FIT', pageWidth - margin - 4, yPos + 4.5, { align: 'right' });
            yPos += 9;
            
            // Sort: Required first, then by proficiency match desc
            var sortedMatched = matchedSkills.slice().sort(function(a, b) {
                if (a.requirement !== b.requirement) return a.requirement === 'Required' ? -1 : 1;
                return b.profMatch - a.profMatch;
            });
            
            sortedMatched.forEach(function(m, idx) {
                checkPage(8);
                var rowY = yPos;
                
                if (idx % 2 === 0) {
                    setFill(C.bgLight);
                    doc.rect(margin, rowY - 3, maxWidth, 7, 'F');
                }
                
                // Requirement indicator
                var reqColor = m.requirement === 'Required' ? C.brand : C.textMuted;
                setFill(reqColor);
                doc.circle(margin + 2, rowY + 0.5, 1, 'F');
                
                doc.setFontSize(7.5);
                doc.setFont(undefined, 'normal');
                setColor(C.text);
                var jobName = (m.jobSkill || '').length > 28 ? m.jobSkill.slice(0, 26) + '\u2026' : m.jobSkill;
                doc.text(jobName, margin + 5, rowY + 1);
                
                setColor(C.brand);
                var userName = (m.userSkill || '').length > 26 ? m.userSkill.slice(0, 24) + '\u2026' : m.userSkill;
                doc.text(userName, margin + 62, rowY + 1);
                
                // Level comparison
                doc.setFontSize(6.5);
                var lc = levelColor[m.userLevel] || C.textMuted;
                doc.setTextColor(lc[0], lc[1], lc[2]);
                doc.text(m.userLevel || '', margin + 118, rowY + 1);
                
                // Fit indicator
                var fitColor = m.profMatch >= 0.9 ? C.green : m.profMatch >= 0.6 ? C.amber : C.rose;
                var fitText = m.profMatch >= 0.9 ? '\u2713' : m.profMatch >= 0.6 ? '\u223C' : '\u2191';
                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
                doc.text(fitText, pageWidth - margin - 4, rowY + 1.5, { align: 'right' });
                
                yPos += 7;
            });
            yPos += 4;
        }
        
        // ---- GAP ANALYSIS ----
        if (gapSkills.length > 0) {
            checkPage(30);
            if (yPos > 200) newPage();
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            setColor(C.dark);
            doc.text('Gap Analysis (' + gapSkills.length + ' skills)', margin, yPos);
            doc.setFont(undefined, 'normal');
            yPos += 6;
            
            // Table header
            setFill([60, 20, 30]);
            doc.roundedRect(margin, yPos, maxWidth, 7, 1, 1, 'F');
            doc.setFontSize(6.5);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(230, 180, 180);
            doc.text('SKILL NEEDED', margin + 4, yPos + 4.5);
            doc.text('PRIORITY', margin + 90, yPos + 4.5);
            doc.text('LEVEL REQUIRED', margin + 120, yPos + 4.5);
            yPos += 9;
            
            gapSkills.forEach(function(g, idx) {
                checkPage(8);
                var rowY = yPos;
                
                if (idx % 2 === 0) {
                    setFill([255, 248, 248]);
                    doc.rect(margin, rowY - 3, maxWidth, 7, 'F');
                }
                
                doc.setFontSize(7.5);
                doc.setFont(undefined, 'normal');
                setColor(C.text);
                doc.text(g.name || '', margin + 4, rowY + 1);
                
                // Priority badge
                var priColor = g.requirement === 'Required' ? C.rose : C.amber;
                doc.setFontSize(6);
                doc.setTextColor(priColor[0], priColor[1], priColor[2]);
                doc.setFont(undefined, 'bold');
                doc.text(g.requirement || 'Preferred', margin + 90, rowY + 1);
                
                doc.setFont(undefined, 'normal');
                setColor(C.textMuted);
                doc.setFontSize(6.5);
                doc.text(g.proficiency || 'Proficient', margin + 120, rowY + 1);
                
                yPos += 7;
            });
            yPos += 4;
        }
        
        // ---- SURPLUS VALUE / DIFFERENTIATORS ----
        if (surplusSkills.length > 0) {
            checkPage(30);
            if (yPos > 200) newPage();
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            setColor(C.dark);
            doc.text('Additional Value \u2014 Beyond Requirements', margin, yPos);
            doc.setFont(undefined, 'normal');
            yPos += 3;
            doc.setFontSize(8);
            setColor(C.textLight);
            doc.text('Skills in the candidate\u2019s portfolio not listed in the job requirements, representing untapped value.', margin, yPos);
            yPos += 7;
            
            // Show top surplus skills sorted by level
            var levelVal = { 'Mastery': 5, 'Expert': 4, 'Advanced': 3, 'Proficient': 2, 'Novice': 1 };
            var topSurplus = surplusSkills.slice().sort(function(a, b) { return (levelVal[b.level] || 0) - (levelVal[a.level] || 0); }).slice(0, 20);
            
            // 3-column layout
            var col3W = (maxWidth - 8) / 3;
            topSurplus.forEach(function(s, idx) {
                var colIdx = idx % 3;
                var xPos = margin + colIdx * (col3W + 4);
                
                if (colIdx === 0) checkPage(7);
                
                doc.setFontSize(7);
                setColor(C.text);
                var sName = s.name.length > 24 ? s.name.slice(0, 22) + '\u2026' : s.name;
                doc.text(sName, xPos, yPos);
                
                var lc2 = levelColor[s.level] || C.textMuted;
                doc.setFontSize(5.5);
                doc.setTextColor(lc2[0], lc2[1], lc2[2]);
                doc.text(s.level || '', xPos + doc.getTextWidth(sName) + 2, yPos);
                
                if (colIdx === 2 || idx === topSurplus.length - 1) yPos += 5;
            });
            yPos += 4;
        }
        
        // ---- TALKING POINTS ----
        checkPage(40);
        if (yPos > 180) newPage();
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        setColor(C.dark);
        doc.text('Recommended Talking Points', margin, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 3;
        doc.setFontSize(8);
        setColor(C.textLight);
        doc.text('Key narratives for interview preparation and recruiter conversations.', margin, yPos);
        yPos += 8;
        
        var talkingPoints = [];
        
        // Generate talking points based on data
        if (strongMatches.length >= 3) {
            var topNames = strongMatches.slice(0, 3).map(function(m) { return m.userSkill; }).join(', ');
            talkingPoints.push({
                title: 'Core Alignment',
                text: 'Direct proficiency match in ' + strongMatches.length + ' required skills, including ' + topNames + '. These represent immediate contribution areas with no ramp-up needed.'
            });
        }
        
        if (surplusSkills.length > 10) {
            var topSurp = surplusSkills.filter(function(s) { return s.level === 'Mastery' || s.level === 'Advanced'; }).slice(0, 3);
            if (topSurp.length > 0) {
                talkingPoints.push({
                    title: 'Hidden Depth',
                    text: skills.length + ' total documented skills vs ' + (targetJob.parsedSkills || []).length + ' listed in the job description. Advanced capabilities in ' + topSurp.map(function(s) { return s.name; }).join(', ') + ' provide strategic value beyond the defined role.'
                });
            }
        }
        
        if (requiredGaps.length > 0 && requiredGaps.length <= 5) {
            talkingPoints.push({
                title: 'Growth Trajectory',
                text: requiredGaps.length + ' gap' + (requiredGaps.length > 1 ? 's' : '') + ' identified (' + requiredGaps.map(function(g) { return g.name; }).join(', ') + '). With ' + skills.length + ' existing skills, the candidate\u2019s learning velocity and adjacent competencies suggest rapid closure.'
            });
        }
        
        if (comp && comp.marketRate) {
            talkingPoints.push({
                title: 'Market Position',
                text: 'Skill portfolio supports a competitive compensation range of $' + Math.round(comp.conservativeOffer || comp.marketRate * 1.1).toLocaleString() + '\u2013$' + Math.round(comp.competitiveOffer || comp.marketRate * 1.3).toLocaleString() + ' based on ' + skills.length + ' documented skills, ' + (masteryCount + pdfExpertCount) + ' at expert level or above.'
            });
        }
        
        if (matchScore >= 70) {
            talkingPoints.push({
                title: 'Recommendation',
                text: 'At ' + matchScore + '% alignment with ' + matchedSkills.length + ' skill matches, this candidate is a strong fit for the role. Recommend advancing to interview stage with focus on ' + (requiredGaps.length > 0 ? 'assessing gap areas in ' + requiredGaps[0].name : 'verifying depth in top matched skills') + '.'
            });
        } else if (matchScore >= 50) {
            talkingPoints.push({
                title: 'Recommendation',
                text: 'At ' + matchScore + '% alignment, this candidate shows solid foundational fit with development potential. ' + (surplusSkills.length > 15 ? 'The breadth of ' + surplusSkills.length + ' additional skills suggests strong adaptability.' : 'Recommend evaluating transferable skills in conversation.')
            });
        }
        
        talkingPoints.forEach(function(tp) {
            checkPage(18);
            
            // Title with accent bar
            setFill(C.accent);
            doc.rect(margin, yPos, 2, 5, 'F');
            doc.setFontSize(8.5);
            doc.setFont(undefined, 'bold');
            setColor(C.dark);
            doc.text(tp.title, margin + 5, yPos + 3.5);
            doc.setFont(undefined, 'normal');
            yPos += 7;
            
            doc.setFontSize(8);
            setColor(C.text);
            var tpLines = doc.splitTextToSize(tp.text, maxWidth - 6);
            doc.text(tpLines, margin + 5, yPos);
            yPos += tpLines.length * 3.8 + 6;
        });
    } // end scouting report pages
    
    // ============================================================
    // PAGE 2: SKILL ARCHITECTURE
    // ============================================================
    newPage();
    sectionHead('Skill Architecture', 'Professional Competencies by Domain');
    
    // Summary line
    doc.setFontSize(9);
    setColor(C.textLight);
    doc.text(skills.length + ' documented skills across ' + roles.length + ' professional domains. '
        + (masteryCount + pdfExpertCount) + ' at expert level or above.', margin, yPos);
    yPos += 8;
    
    // Group skills by primary role
    var roleGroups = {};
    roles.forEach(function(role) { roleGroups[role.id] = { role: role, skills: [] }; });
    
    skills.forEach(function(skill) {
        var primaryRole = (skill.roles && skill.roles[0]) || 'general';
        if (roleGroups[primaryRole]) {
            roleGroups[primaryRole].skills.push(skill);
        } else {
            // Find first valid role
            var placed = false;
            (skill.roles || []).forEach(function(rid) {
                if (!placed && roleGroups[rid]) {
                    roleGroups[rid].skills.push(skill);
                    placed = true;
                }
            });
            if (!placed) {
                var firstKey = Object.keys(roleGroups)[0];
                if (firstKey) roleGroups[firstKey].skills.push(skill);
            }
        }
    });
    
    // Active roles (used by network viz and distribution pages)
    var roleList = Object.keys(roleGroups).filter(function(k) { return roleGroups[k].skills.length > 0; });
    
    // Render each role group
    Object.keys(roleGroups).forEach(function(roleId) {
        var group = roleGroups[roleId];
        if (group.skills.length === 0) return;
        
        var roleName = group.role.name;
        var roleColor = group.role.color || '#60a5fa';
        var rc = [
            parseInt(roleColor.slice(1,3), 16) || 96,
            parseInt(roleColor.slice(3,5), 16) || 165,
            parseInt(roleColor.slice(5,7), 16) || 250
        ];
        
        checkPage(18);
        
        // Role header with colored bar
        setFill(rc);
        doc.rect(margin, yPos - 1, 2, 6, 'F');
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        setColor(C.dark);
        doc.text(roleName + ' (' + group.skills.length + ')', margin + 5, yPos + 3);
        doc.setFont(undefined, 'normal');
        yPos += 9;
        
        // Skills in 2-column layout with level pills
        var col1X = margin + 4;
        var col2X = margin + (maxWidth / 2) + 2;
        var startY = yPos;
        var rowH = 5.8;
        
        // Sort: Mastery first, then Advanced, etc.
        var levelOrder = { 'Mastery': 0, 'Expert': 1, 'Advanced': 2, 'Proficient': 3, 'Novice': 4 };
        group.skills.sort(function(a, b) {
            return (levelOrder[a.level] || 4) - (levelOrder[b.level] || 4);
        });
        
        group.skills.forEach(function(skill, idx) {
            var xPos = idx % 2 === 0 ? col1X : col2X;
            var rowY = startY + Math.floor(idx / 2) * rowH;
            
            if (rowY + 4 > pageHeight - 25) {
                yPos = rowY;
                newPage();
                startY = yPos;
                rowY = startY + Math.floor(0) * rowH; // Reset row counting
            }
            
            // Skill name
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            setColor(C.text);
            var displayName = skill.name.length > 32 ? skill.name.slice(0, 30) + '\u2026' : skill.name;
            doc.text(displayName, xPos, rowY);
            
            // Level text (small, colored)
            var lc = levelColor[skill.level] || C.textMuted;
            doc.setFontSize(6);
            doc.setTextColor(lc[0], lc[1], lc[2]);
            var nameW = doc.getTextWidth(displayName);
            if (nameW < (maxWidth / 2) - 22) {
                doc.text(skill.level || '', xPos + nameW + 2, rowY);
            }
        });
        
        yPos = startY + Math.ceil(group.skills.length / 2) * rowH + 4;
    });
    
    // ============================================================
    // PAGE: SKILL NETWORK VISUALIZATION
    // ============================================================
    (function drawNetworkPage() {
        newPage();
        sectionHead('Skill Network', 'Professional Capability Architecture');
        
        doc.setFontSize(8.5);
        setColor(C.textLight);
        doc.text('Interactive network visualization of ' + skills.length + ' skills across ' + roles.length + ' professional domains.', margin, yPos);
        yPos += 4;
        doc.text('Node size reflects proficiency level. Connections show skills that share a domain.', margin, yPos);
        yPos += 8;
        
        // Compute layout — simple radial force-directed
        var graphCx = pageWidth / 2;
        var graphCy = yPos + 68;
        var graphR = 58;
        var graphNodes = [];
        var graphLinks = [];
        
        // Role nodes (hubs) — evenly spaced around inner ring
        roleList.forEach(function(roleId, i) {
            var group = roleGroups[roleId];
            var angle = (i / roleList.length) * Math.PI * 2 - Math.PI / 2;
            var dist = graphR * 0.38;
            var rc = group.role.color || '#60a5fa';
            var rgb = [
                parseInt(rc.slice(1,3), 16) || 96,
                parseInt(rc.slice(3,5), 16) || 165,
                parseInt(rc.slice(5,7), 16) || 250
            ];
            graphNodes.push({
                x: graphCx + Math.cos(angle) * dist,
                y: graphCy + Math.sin(angle) * dist,
                r: 4.5,
                color: rgb,
                type: 'role',
                label: group.role.name,
                roleIdx: i
            });
        });
        
        // Skill nodes — spread around their parent role
        var levelSizes = { 'Mastery': 2.8, 'Expert': 2.4, 'Advanced': 2.0, 'Proficient': 1.6, 'Novice': 1.0 };
        var skillNodeStart = graphNodes.length;
        
        // Deterministic hash for consistent layout
        function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return h; }
        function hashFloat(s, min, max) { var h = Math.abs(hashStr(s)) % 10000; return min + (h / 10000) * (max - min); }
        
        roleList.forEach(function(roleId, ri) {
            var group = roleGroups[roleId];
            var parentAngle = (ri / roleList.length) * Math.PI * 2 - Math.PI / 2;
            
            // Sort skills by level for consistent ordering
            var sortedSkills = group.skills.slice().sort(function(a, b) {
                var lv = { 'Mastery': 0, 'Expert': 1, 'Advanced': 2, 'Proficient': 3, 'Novice': 4 };
                return (lv[a.level] || 4) - (lv[b.level] || 4) || a.name.localeCompare(b.name);
            });
            
            sortedSkills.forEach(function(skill, si) {
                var spreadAngle = parentAngle + ((si / Math.max(sortedSkills.length, 1)) - 0.5) * 1.8;
                var dist = graphR * (0.55 + hashFloat(skill.name + ri, 0, 0.4));
                var jitter = hashFloat(skill.name + 'j', -4, 4);
                
                var lc = levelColor[skill.level] || C.textMuted;
                graphNodes.push({
                    x: graphCx + Math.cos(spreadAngle) * dist + jitter,
                    y: graphCy + Math.sin(spreadAngle) * dist + jitter * 0.6,
                    r: levelSizes[skill.level] || 1.4,
                    color: lc,
                    type: 'skill',
                    label: skill.name,
                    roleIdx: ri
                });
                
                // Link skill to its role hub
                graphLinks.push({ from: ri, to: graphNodes.length - 1 });
            });
        });
        
        // Add cross-links between nearby skills (deterministic)
        for (var si = skillNodeStart; si < graphNodes.length; si++) {
            for (var sj = si + 1; sj < Math.min(si + 6, graphNodes.length); sj++) {
                var ddx = graphNodes[si].x - graphNodes[sj].x;
                var ddy = graphNodes[si].y - graphNodes[sj].y;
                var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                if (dd < 18 && ((si * 7 + sj * 13) % 10 < 3)) {
                    graphLinks.push({ from: si, to: sj });
                }
            }
        }
        
        // Draw background circle
        setDraw([40, 50, 70]);
        doc.setLineWidth(0.15);
        doc.circle(graphCx, graphCy, graphR + 6, 'S');
        
        // Draw links
        graphLinks.forEach(function(link) {
            var a = graphNodes[link.from];
            var b = graphNodes[link.to];
            var isRoleLink = a.type === 'role' || b.type === 'role';
            doc.setLineWidth(isRoleLink ? 0.15 : 0.08);
            doc.setDrawColor(96, 165, 250);
            doc.line(a.x, a.y, b.x, b.y);
        });
        
        // Draw skill nodes (smaller, behind role nodes)
        graphNodes.forEach(function(n) {
            if (n.type === 'skill') {
                setFill(n.color);
                doc.circle(n.x, n.y, n.r, 'F');
            }
        });
        
        // Draw role nodes (on top, with labels)
        graphNodes.forEach(function(n) {
            if (n.type === 'role') {
                // Glow ring
                setDraw(n.color);
                doc.setLineWidth(0.3);
                doc.circle(n.x, n.y, n.r + 2, 'S');
                // Filled node
                setFill(n.color);
                doc.circle(n.x, n.y, n.r, 'F');
                // Label
                doc.setFontSize(6.5);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(n.color[0], n.color[1], n.color[2]);
                doc.text(n.label, n.x, n.y - n.r - 3.5, { align: 'center' });
                doc.setFont(undefined, 'normal');
            }
        });
        
        yPos = graphCy + graphR + 14;
        
        // Legend
        checkPage(14);
        doc.setFontSize(6.5);
        setColor(C.textMuted);
        doc.text('PROFICIENCY LEVELS:', margin, yPos);
        var legendX = margin + 32;
        var legendItems = [
            { label: 'Mastery', color: C.red, r: 2.8 },
            { label: 'Expert', color: C.orange, r: 2.4 },
            { label: 'Advanced', color: C.amber, r: 2.0 },
            { label: 'Proficient', color: C.green, r: 1.6 },
            { label: 'Novice', color: C.textMuted, r: 1.0 }
        ];
        legendItems.forEach(function(item) {
            setFill(item.color);
            doc.circle(legendX, yPos - 1, item.r, 'F');
            doc.setFontSize(6);
            setColor(C.text);
            doc.text(item.label, legendX + item.r + 2, yPos);
            legendX += doc.getTextWidth(item.label) + item.r + 8;
        });
        yPos += 4;
    })();
    
    // ============================================================
    // PAGE: PROFICIENCY & ROLE DISTRIBUTION
    // ============================================================
    (function drawDistributionPage() {
        newPage();
        sectionHead('Skill Distribution', 'Proficiency Breakdown & Role Coverage');
        
        // --- PROFICIENCY BAR CHART ---
        var levelOrder = ['Mastery', 'Expert', 'Advanced', 'Proficient', 'Novice'];
        var levelCounts = {};
        levelOrder.forEach(function(l) { levelCounts[l] = 0; });
        skills.forEach(function(s) { if (levelCounts[s.level] !== undefined) levelCounts[s.level]++; });
        var maxCount = Math.max.apply(null, levelOrder.map(function(l) { return levelCounts[l]; })) || 1;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        setColor(C.dark);
        doc.text('Proficiency Distribution', margin, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 7;
        
        var barMaxW = maxWidth - 55;
        var barH = 8;
        
        levelOrder.forEach(function(level) {
            var count = levelCounts[level] || 0;
            var barW = (count / maxCount) * barMaxW;
            var lc = levelColor[level] || C.textMuted;
            
            // Label
            doc.setFontSize(7.5);
            setColor(C.text);
            doc.text(level, margin, yPos + 5.5);
            
            // Bar background
            setFill(C.bgLight);
            doc.roundedRect(margin + 30, yPos + 1, barMaxW, barH, 1.5, 1.5, 'F');
            
            // Filled bar
            if (barW > 2) {
                setFill(lc);
                doc.roundedRect(margin + 30, yPos + 1, barW, barH, 1.5, 1.5, 'F');
            }
            
            // Count label
            doc.setFontSize(7);
            doc.setFont(undefined, 'bold');
            setColor(count > 0 ? C.dark : C.textMuted);
            doc.text(String(count), margin + 32 + barMaxW, yPos + 5.5);
            doc.setFont(undefined, 'normal');
            
            yPos += barH + 3;
        });
        
        yPos += 10;
        
        // --- ROLE BREAKDOWN ---
        var roleSorted = roleList.map(function(roleId) {
            return roleGroups[roleId];
        }).filter(function(g) { return g.skills.length > 0; }).sort(function(a, b) {
            return b.skills.length - a.skills.length;
        });
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        setColor(C.dark);
        doc.text('Skills by Professional Domain', margin, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 7;
        
        var roleMaxCount = roleSorted.length > 0 ? roleSorted[0].skills.length : 1;
        
        roleSorted.forEach(function(group) {
            checkPage(14);
            var rc = group.role.color || '#60a5fa';
            var rgb = [
                parseInt(rc.slice(1,3), 16) || 96,
                parseInt(rc.slice(3,5), 16) || 165,
                parseInt(rc.slice(5,7), 16) || 250
            ];
            var count = group.skills.length;
            var barW = (count / roleMaxCount) * barMaxW;
            var pct = Math.round((count / skills.length) * 100);
            
            // Color indicator
            setFill(rgb);
            doc.rect(margin, yPos + 2, 2, 6, 'F');
            
            // Role label
            doc.setFontSize(7.5);
            setColor(C.text);
            var roleLabel = group.role.name;
            if (roleLabel.length > 18) roleLabel = roleLabel.slice(0, 16) + '\u2026';
            doc.text(roleLabel, margin + 5, yPos + 6);
            
            // Bar background
            setFill(C.bgLight);
            doc.roundedRect(margin + 38, yPos + 2, barMaxW - 8, 6, 1, 1, 'F');
            
            // Filled bar
            if (barW > 2) {
                setFill(rgb);
                doc.roundedRect(margin + 38, yPos + 2, barW - 8, 6, 1, 1, 'F');
            }
            
            // Count + percentage
            doc.setFontSize(6.5);
            doc.setFont(undefined, 'bold');
            setColor(C.dark);
            doc.text(count + ' (' + pct + '%)', margin + 32 + barMaxW, yPos + 6);
            doc.setFont(undefined, 'normal');
            
            yPos += 10;
        });
        
        yPos += 8;
        
        // --- LEVEL SUMMARY TABLE ---
        checkPage(30);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        setColor(C.dark);
        doc.text('Portfolio Summary', margin, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 6;
        
        var summaryRows = [
            ['Total Skills Documented', String(skills.length)],
            ['Professional Domains', String(roles.length)],
            ['Mastery-Level Skills', String(levelCounts['Mastery'] || 0)],
            ['Advanced + Mastery', String((levelCounts['Mastery'] || 0) + (levelCounts['Advanced'] || 0))],
            ['Evidence Items', String(evidenceCount)],
            ['Documented Outcomes', String(outcomeCount)]
        ];
        
        summaryRows.forEach(function(row, idx) {
            if (idx % 2 === 0) {
                setFill(C.bgLight);
                doc.rect(margin, yPos - 3, maxWidth, 7, 'F');
            }
            doc.setFontSize(8);
            setColor(C.text);
            doc.text(row[0], margin + 3, yPos + 1);
            doc.setFont(undefined, 'bold');
            setColor(C.brand);
            doc.text(row[1], pageWidth - margin - 3, yPos + 1, { align: 'right' });
            doc.setFont(undefined, 'normal');
            yPos += 7.5;
        });
    })();
    
    // ============================================================
    // PAGE: OUTCOMES & EVIDENCE
    // ============================================================
    if (data.outcomes && data.outcomes.length > 0) {
        newPage();
        sectionHead('Evidence & Outcomes', 'Measurable Impact & Achievements');
        
        doc.setFontSize(9);
        setColor(C.textLight);
        doc.text(data.outcomes.length + ' documented outcomes with measurable evidence.', margin, yPos);
        yPos += 7;
        
        // Group outcomes by category
        var catGroups = {};
        data.outcomes.forEach(function(o) {
            var cat = o.category || 'General';
            if (!catGroups[cat]) catGroups[cat] = [];
            catGroups[cat].push(o);
        });
        
        Object.keys(catGroups).forEach(function(cat) {
            checkPage(16);
            
            // Category header
            doc.setFontSize(8.5);
            doc.setFont(undefined, 'bold');
            setColor(C.brand);
            doc.text(cat.toUpperCase(), margin, yPos);
            doc.setFont(undefined, 'normal');
            yPos += 5;
            
            catGroups[cat].forEach(function(outcome) {
                checkPage(14);
                
                // Accent bullet
                setFill(C.accent);
                doc.circle(margin + 2, yPos - 1.2, 0.8, 'F');
                
                // Outcome text
                doc.setFontSize(8.5);
                setColor(C.text);
                var oText = outcome.text || '';
                if (oText.length > 200) oText = oText.slice(0, 197) + '\u2026';
                var oLines = doc.splitTextToSize(oText, maxWidth - 8);
                doc.text(oLines, margin + 5, yPos);
                yPos += oLines.length * 3.8 + 1;
                
                // Skill attribution
                if (outcome.skill) {
                    doc.setFontSize(6.5);
                    setColor(C.textMuted);
                    doc.text('Skill: ' + outcome.skill, margin + 5, yPos);
                    yPos += 3.5;
                }
                yPos += 1.5;
            });
            yPos += 3;
        });
    }
    
    // ============================================================
    // PAGE: VALUES & PURPOSE
    // ============================================================
    if ((data.values && data.values.length > 0) || (data.purpose && data.purpose.trim())) {
        checkPage(50);
        if (yPos > 80) newPage();
        sectionHead('Values & Philosophy', 'Core Principles & Professional Identity');
        
        if (data.purpose && data.purpose.trim()) {
            doc.setFontSize(9.5);
            doc.setFont(undefined, 'italic');
            setColor(C.text);
            setDraw(C.accent);
            doc.setLineWidth(0.5);
            var pLines = doc.splitTextToSize(data.purpose.trim(), maxWidth - 8);
            doc.line(margin, yPos - 1, margin, yPos + pLines.length * 4.5 + 1);
            doc.text(pLines, margin + 5, yPos + 3);
            yPos += pLines.length * 4.5 + 10;
            doc.setFont(undefined, 'normal');
        }
        
        if (data.values && data.values.length > 0) {
            data.values.forEach(function(value) {
                checkPage(16);
                
                // Value name
                doc.setFontSize(9.5);
                doc.setFont(undefined, 'bold');
                setColor(C.dark);
                doc.text(value.name, margin, yPos);
                yPos += 4.5;
                
                // Description
                var desc = value.description || getCatalogDescription(value.name) || '';
                if (desc) {
                    doc.setFontSize(8.5);
                    doc.setFont(undefined, 'normal');
                    setColor(C.textLight);
                    var dLines = doc.splitTextToSize(desc, maxWidth - 4);
                    doc.text(dLines, margin + 1, yPos);
                    yPos += dLines.length * 3.8;
                }
                
                // Personal note
                if (value.note) {
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'italic');
                    setColor(C.accent);
                    var nLines = doc.splitTextToSize('\u201C' + value.note + '\u201D', maxWidth - 10);
                    checkPage(nLines.length * 3.8 + 4);
                    doc.text(nLines, margin + 4, yPos + 2);
                    yPos += nLines.length * 3.8 + 2;
                    doc.setFont(undefined, 'normal');
                }
                yPos += 4;
            });
        }
    }
    
    // ============================================================
    // PAGE: MARKET VALUATION DETAIL
    // ============================================================
    if (comp && comp.marketRate) {
        checkPage(80);
        if (yPos > 60) newPage();
        sectionHead('Market Valuation', 'Skill Portfolio Analysis & Compensation Positioning');
        
        // Compensation table
        var tableData = [
            ['Base Market Rate', '$' + Math.round(comp.marketRate).toLocaleString(), 'Median for detected function and seniority'],
            ['Conservative Offer', '$' + Math.round(comp.conservativeOffer || comp.marketRate * 1.1).toLocaleString(), 'With evidence-based premium applied'],
            ['Standard Offer', '$' + Math.round(comp.standardOffer || comp.marketRate * 1.2).toLocaleString(), 'Market-competitive positioning'],
            ['Competitive Offer', '$' + Math.round(comp.competitiveOffer || comp.marketRate * 1.3).toLocaleString(), 'Reflects full skill portfolio value']
        ];
        
        // Table header
        setFill(C.dark);
        doc.roundedRect(margin, yPos, maxWidth, 7, 1.5, 1.5, 'F');
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(200, 210, 230);
        doc.text('METRIC', margin + 4, yPos + 4.5);
        doc.text('VALUE', margin + 68, yPos + 4.5);
        doc.text('BASIS', margin + 100, yPos + 4.5);
        yPos += 9;
        
        tableData.forEach(function(row, idx) {
            var rowY = yPos;
            if (idx % 2 === 0) {
                setFill(C.bgLight);
                doc.rect(margin, rowY - 3, maxWidth, 7, 'F');
            }
            
            doc.setFontSize(8.5);
            doc.setFont(undefined, 'normal');
            setColor(C.text);
            doc.text(row[0], margin + 4, rowY + 1);
            
            doc.setFont(undefined, 'bold');
            setColor(C.brand);
            doc.text(row[1], margin + 68, rowY + 1);
            
            doc.setFont(undefined, 'normal');
            doc.setFontSize(7);
            setColor(C.textMuted);
            doc.text(row[2], margin + 100, rowY + 1);
            
            yPos += 8;
        });
        
        yPos += 6;
        
        // Premium breakdown
        if (comp.criticalSkills && comp.criticalSkills.length > 0) {
            checkPage(20);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            setColor(C.dark);
            doc.text('Premium Skills (High Market Demand)', margin, yPos);
            yPos += 5;
            
            doc.setFontSize(7.5);
            doc.setFont(undefined, 'normal');
            setColor(C.text);
            comp.criticalSkills.slice(0, 8).forEach(function(s) {
                checkPage(6);
                doc.text('\u2022  ' + s, margin + 3, yPos);
                yPos += 4;
            });
            yPos += 3;
        }
        
        // Top 10 skills by value
        if (comp.top10Skills && comp.top10Skills.length > 0) {
            checkPage(25);
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            setColor(C.dark);
            doc.text('Highest-Value Skills', margin, yPos);
            yPos += 5;
            
            comp.top10Skills.slice(0, 10).forEach(function(s, i) {
                checkPage(6);
                doc.setFontSize(7.5);
                doc.setFont(undefined, 'normal');
                setColor(C.text);
                var sName = (typeof s === 'string') ? s : (s.name || s.skill || '');
                var sVal = (typeof s === 'object' && s.value) ? '  $' + Math.round(s.value).toLocaleString() : '';
                doc.text((i + 1) + '.  ' + sName, margin + 3, yPos);
                if (sVal) {
                    doc.setFont(undefined, 'bold');
                    setColor(C.brand);
                    doc.text(sVal, margin + 90, yPos);
                }
                yPos += 4.2;
            });
        }
    }
    
    // ============================================================
    // PAGE: JOB MATCHES (if any)
    // ============================================================
    var savedJobs = (window._userData.savedJobs || []).filter(function(j) { return j && j.title; });
    if (savedJobs.length > 0) {
        checkPage(40);
        if (yPos > 60) newPage();
        sectionHead('Job Pipeline', 'Current Opportunities & Match Analysis');
        
        doc.setFontSize(9);
        setColor(C.textLight);
        doc.text(savedJobs.length + ' positions in pipeline.', margin, yPos);
        yPos += 7;
        
        savedJobs.slice(0, 8).forEach(function(job) {
            checkPage(20);
            
            // Job card
            setFill(C.bgLight);
            setDraw(C.border);
            doc.setLineWidth(0.2);
            doc.roundedRect(margin, yPos - 2, maxWidth, 16, 2, 2, 'FD');
            
            // Title
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            setColor(C.dark);
            var jobTitle = job.title.length > 50 ? job.title.slice(0, 48) + '\u2026' : job.title;
            doc.text(jobTitle, margin + 4, yPos + 3);
            
            // Company
            doc.setFontSize(7.5);
            doc.setFont(undefined, 'normal');
            setColor(C.textLight);
            doc.text(job.company || '', margin + 4, yPos + 8);
            
            // Match score
            if (job.matchScore || job.score) {
                var score = job.matchScore || job.score || 0;
                var scoreColor = score >= 70 ? C.green : score >= 50 ? C.amber : C.textMuted;
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
                doc.text(Math.round(score) + '%', pageWidth - margin - 4, yPos + 5, { align: 'right' });
                doc.setFontSize(6);
                doc.setFont(undefined, 'normal');
                doc.text('MATCH', pageWidth - margin - 4, yPos + 9.5, { align: 'right' });
            }
            
            yPos += 20;
        });
    }
    
    // ============================================================
    // FINAL PAGE: BACK COVER
    // ============================================================
    newPage();
    
    // Centered content
    var finalY = pageHeight / 2 - 30;
    
    // Mini logo
    setFill(C.accent);
    doc.circle(cx, finalY, 3, 'F');
    setDraw(C.accent);
    doc.setLineWidth(0.2);
    doc.circle(cx, finalY, 12, 'S');
    doc.line(cx, finalY, cx - 8, finalY - 7);
    doc.line(cx, finalY, cx + 9, finalY - 6);
    doc.line(cx, finalY, cx + 8, finalY + 8);
    doc.line(cx, finalY, cx - 7, finalY + 8);
    setFill([147, 187, 252]);
    doc.circle(cx - 8, finalY - 7, 1.5, 'F');
    doc.circle(cx + 8, finalY + 8, 1.5, 'F');
    setFill(C.purple);
    doc.circle(cx + 9, finalY - 6, 1.3, 'F');
    doc.circle(cx - 7, finalY + 8, 1.3, 'F');
    
    finalY += 22;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    setColor(C.brand);
    doc.text('BLUEPRINT\u2122', cx, finalY, { align: 'center' });
    
    finalY += 6;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    setColor(C.textMuted);
    doc.text('Career Intelligence Platform', cx, finalY, { align: 'center' });
    
    finalY += 12;
    doc.setFontSize(9);
    setColor(C.textLight);
    doc.text('This report was generated from ' + name + '\'s Blueprint profile.', cx, finalY, { align: 'center' });
    finalY += 5;
    if (isScoutingReport) {
        doc.text('Targeted analysis for: ' + (targetJob.title || 'Target Position') + (targetJob.company ? ' at ' + targetJob.company : ''), cx, finalY, { align: 'center' });
        finalY += 5;
    }
    doc.text('It represents a living capability analysis, not a static document.', cx, finalY, { align: 'center' });
    
    finalY += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    setColor(C.accent);
    doc.text('myblueprint.work', cx, finalY, { align: 'center' });
    
    finalY += 14;
    doc.setFontSize(7);
    doc.setFont(undefined, 'normal');
    setColor(C.textMuted);
    doc.text('\u00A9 ' + new Date().getFullYear() + ' Cliff Jurkiewicz. All rights reserved.', cx, finalY, { align: 'center' });
    finalY += 4;
    doc.text('Blueprint\u2122 and its associated methodologies are the intellectual property of Cliff Jurkiewicz.', cx, finalY, { align: 'center' });
    
    addFooter();
    
    // ============================================================
    // SAVE
    // ============================================================
    var dateStr = new Date().toISOString().split('T')[0];
    var fileName;
    if (isScoutingReport) {
        var jobSlug = (targetJob.company || targetJob.title || 'job').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30);
        fileName = ('Blueprint_' + name.replace(/\s+/g, '_') + '_ScoutingReport_' + jobSlug + '_' + dateStr + '.pdf').replace(/[^a-zA-Z0-9_\-.]/g, '');
    } else {
        fileName = ('Blueprint_' + name.replace(/\s+/g, '_') + '_' + dateStr + '.pdf').replace(/[^a-zA-Z0-9_\-.]/g, '');
    }
    doc.save(fileName);
    showToast(isScoutingReport ? 'Scouting Report downloaded.' : 'Career Intelligence Report downloaded.', 'success');
}

export function copyBlueprintText() {
    if (window.isReadOnlyProfile) { demoGate('copy profile text'); return; }
    var name = (window._userData.profile && window._userData.profile.name) || 'Professional';
    var title = (window._userData.profile && window._userData.profile.currentTitle) || '';
    var location = (window._userData.profile && window._userData.profile.location) || '';
    
    var lines = [];
    lines.push(name.toUpperCase());
    if (title) lines.push(title);
    if (location) lines.push(location);
    lines.push('');
    
    // Purpose
    if (_bd().purpose && _bd().purpose.trim()) {
        lines.push('PURPOSE');
        lines.push(_bd().purpose.trim());
        lines.push('');
    }
    
    // Outcomes
    var sharedOutcomes = _bd().outcomes.filter(function(o) { return o.shared; });
    if (sharedOutcomes.length > 0) {
        lines.push('KEY OUTCOMES');
        sharedOutcomes.forEach(function(o) {
            lines.push('\u2022 ' + o.text);
        });
        lines.push('');
    }
    
    // Values
    var selectedValues = _bd().values.filter(function(v) { return v.selected; });
    if (selectedValues.length > 0) {
        lines.push('CORE VALUES');
        selectedValues.forEach(function(v) {
            var desc = getCatalogDescription(v.name);
            lines.push('\u2022 ' + v.name + (desc ? ' \u2014 ' + desc : ''));
            if (v.note) lines.push('  ' + v.note);
        });
        lines.push('');
    }
    
    // Top skills summary
    var skills = _sd().skills || [];
    var topSkills = skills.filter(function(s) { return s.key; }).slice(0, 10);
    if (topSkills.length > 0) {
        lines.push('CORE COMPETENCIES');
        lines.push(topSkills.map(function(s) { return s.name; }).join(', '));
        lines.push('');
    }
    
    // Market context
    var comp = getEffectiveComp();
    if (comp && (comp.displayComp || comp.marketRate)) {
        lines.push('MARKET POSITIONING');
        lines.push(comp.compLabel + ': ' + formatCompValue(comp.displayComp));
        if (comp.compSource !== 'algorithm' && comp.algorithmEstimate > 0) {
            lines.push('BLS Benchmark: ' + formatCompValue(comp.algorithmEstimate));
        }
        if (comp.compSource === 'algorithm' && comp.marketRate) {
            lines.push('Market Rate: $' + Math.round(comp.marketRate).toLocaleString());
            if (comp.competitiveOffer) {
                lines.push('Competitive Range: $' + Math.round(comp.competitiveOffer).toLocaleString());
            }
        }
        lines.push('');
    }
    
    lines.push('Generated by Blueprint\u2122 \u2022 ' + new Date().toLocaleDateString() + ' \u2022 \u00A9 2026 Cliff Jurkiewicz \u2022 myblueprint.work');
    
    var text = lines.join('\n');
    navigator.clipboard.writeText(text).then(function() {
        showToast('Blueprint copied to clipboard. Ready to paste.', 'success');
    }).catch(function() {
        // Fallback: select from textarea
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Blueprint copied to clipboard.', 'success');
    });
}
if (!window.copyBlueprintText) window.copyBlueprintText = copyBlueprintText;
if (!window.generateWorkBlueprint) window.generateWorkBlueprint = generateWorkBlueprint;
if (!window.generateResume) window.generateResume = generateResume;
if (!window.exportBlueprint) window.exportBlueprint = exportBlueprint;

// ===== COVER LETTER GENERATOR =====

export function generateCoverLetter() {
    if (window.isReadOnlyProfile) { demoGate('generate a cover letter'); return; }
    var jobs = window._userData.savedJobs || [];
    if (jobs.length === 0) {
        showToast('Add a job in the Jobs tab first, then generate a cover letter.', 'info');
        return;
    }
    // Show job picker modal
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">Generate Cover Letter</h2>'
        + '<p style="color:var(--text-secondary); margin-top:5px;">Select a job to tailor your letter</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00d7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px;">'
        + jobs.map(function(j, i) {
            var score = j.matchData ? Math.round(j.matchData.score) : 0;
            var scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
            return '<div onclick="buildCoverLetter(' + i + ')" style="display:flex; align-items:center; gap:14px; '
                + 'padding:16px; border:1px solid var(--border); border-radius:10px; cursor:pointer; '
                + 'margin-bottom:10px; transition:all 0.15s;" '
                + 'onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
                + '<div style="width:44px; height:44px; border-radius:10px; background:rgba(96,165,250,0.1); '
                + 'display:flex; align-items:center; justify-content:center; font-weight:700; color:' + scoreColor + '; font-size:0.85em;">'
                + score + '%</div>'
                + '<div style="flex:1; min-width:0;">'
                + '<div style="font-weight:600; color:var(--text-primary); font-size:0.92em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">'
                + (j.title || 'Untitled') + '</div>'
                + '<div style="font-size:0.82em; color:var(--text-muted);">' + (j.company || 'Unknown company') + '</div>'
                + '</div>'
                + '<div style="color:var(--text-muted); font-size:1.2em;">\u2192</div>'
                + '</div>';
        }).join('')
        + '</div>';
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}
if (!window.generateCoverLetter) window.generateCoverLetter = generateCoverLetter;

export function buildCoverLetter(jobIdx) {
    var job = (window._userData.savedJobs || [])[jobIdx];
    if (!job || !job.matchData) { showToast('No match data for this job.', 'error'); return; }
    logAnalyticsEvent('cover_letter', { company: job.company || '', title: job.title || '' });
    closeExportModal();

    var name = (window._userData.profile && window._userData.profile.name) || 'Professional';
    var title = (window._userData.profile && window._userData.profile.currentTitle) || '';
    var purpose = window._userData.purpose || _bd().purpose || '';
    var matched = job.matchData.matched || [];
    var gaps = job.matchData.gaps || [];
    var sharedOutcomes = (_bd().outcomes || []).filter(function(o) { return o.shared; });
    var selectedValues = (_bd().values || []).filter(function(v) { return v.selected; });

    var apiKey = safeGet('wbAnthropicKey');

    if (apiKey) {
        showToast('Generating cover letter with AI...', 'info');
        var prompt = 'Write a professional cover letter for ' + name
            + (title ? ', currently ' + title : '')
            + ', applying for ' + (job.title || 'a role') + ' at ' + (job.company || 'the company') + '.\n\n'
            + 'MATCHED SKILLS (strengths to emphasize): ' + matched.map(function(m) { return m.name || m; }).join(', ') + '\n\n'
            + 'SKILL GAPS (acknowledge indirectly or show transferable experience): ' + gaps.map(function(g) { return g.name || g; }).join(', ') + '\n\n'
            + 'KEY OUTCOMES: ' + sharedOutcomes.slice(0, 5).map(function(o) { return o.text; }).join('; ') + '\n\n'
            + 'CORE VALUES: ' + selectedValues.slice(0, 5).map(function(v) { return v.name; }).join(', ') + '\n\n'
            + (purpose ? 'PURPOSE STATEMENT: ' + purpose + '\n\n' : '')
            + 'INSTRUCTIONS: Write 3-4 paragraphs. Opening: show specific knowledge of the company and role. '
            + 'Middle: connect 2-3 matched skills to outcomes with concrete evidence. '
            + 'Address gaps by showing adjacent experience. '
            + 'Close: express genuine interest, reference values alignment. '
            + 'Tone: confident but not arrogant, specific not generic. No cliches. '
            + 'Do NOT include placeholder brackets like [Company] or [Name]. Use the actual names provided.';

        callAnthropicAPI({
                model: BP_AI_MODEL,
                max_tokens: 1500,
                messages: [{ role: 'user', content: prompt }]
            }, apiKey, 'cover-letter')
        .then(function(data) {
            var text = (data.content || []).map(function(c) { return c.text || ''; }).join('\n');
            if (!text) throw new Error('Empty response');
            showCoverLetterResult(text, job);
        })
        .catch(function(err) {
            console.error('Cover letter API error:', err);
            showToast('AI generation failed, using template.', 'warning');
            showCoverLetterResult(buildTemplateCoverLetter(job, name, title, matched, sharedOutcomes, purpose), job);
        });
    } else {
        showCoverLetterResult(buildTemplateCoverLetter(job, name, title, matched, sharedOutcomes, purpose), job);
    }
}
if (!window.buildCoverLetter) window.buildCoverLetter = buildCoverLetter;

export function buildTemplateCoverLetter(job, name, title, matched, outcomes, purpose) {
    var matchedNames = matched.slice(0, 5).map(function(m) { return m.name || m; });
    var outcomeTexts = outcomes.slice(0, 3).map(function(o) { return o.text; });
    var lines = [];
    lines.push('Dear Hiring Manager,');
    lines.push('');
    lines.push('I am writing to express my interest in the ' + (job.title || 'open position')
        + ' at ' + (job.company || 'your organization') + '.'
        + (title ? ' As a ' + title + ',' : '') + ' I bring a combination of '
        + (matchedNames.length > 2 ? matchedNames.slice(0, 2).join(', ') + ', and ' + matchedNames[2] : matchedNames.join(' and '))
        + ' that aligns directly with what you are looking for.');
    lines.push('');
    if (outcomeTexts.length > 0) {
        lines.push('In my current and recent roles, I have delivered measurable results: '
            + outcomeTexts.join('. ') + '.'
            + ' These outcomes reflect the same capabilities your team needs to succeed.');
    }
    lines.push('');
    if (purpose) {
        lines.push(purpose + ' This philosophy drives my approach to every challenge and every team I join.');
    }
    lines.push('');
    lines.push('I would welcome the opportunity to discuss how my experience and approach can contribute to '
        + (job.company || 'your team') + '\'s continued success.');
    lines.push('');
    lines.push('Sincerely,');
    lines.push(name);
    return lines.join('\n');
}

export function showCoverLetterResult(text, job) {
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">Cover Letter</h2>'
        + '<p style="color:var(--text-secondary); margin-top:5px;">'
        + (job.title || '') + ' at ' + (job.company || '') + '</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00d7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px;">'
        + '<textarea id="coverLetterOutput" style="width:100%; min-height:350px; padding:18px; '
        + 'background:var(--input-bg); border:1px solid var(--border); border-radius:10px; '
        + 'color:var(--text-primary); font-size:0.95em; line-height:1.7; font-family:inherit; resize:vertical;">'
        + escapeHtml(text)
        + '</textarea>'
        + '<div style="display:flex; gap:10px; margin-top:16px;">'
        + '<button onclick="copyCoverLetter()" style="flex:1; background:var(--accent); color:#fff; border:none; '
        + 'padding:12px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em;">'
        + '' + bpIcon('clipboard', 14) + ' Copy to Clipboard</button>'
        + '<button onclick="downloadCoverLetter(\'' + (job.company || 'company').replace(/'/g, '') + '\')" '
        + 'style="background:var(--input-bg); color:var(--text-primary); border:1px solid var(--border); '
        + 'padding:12px 20px; border-radius:8px; cursor:pointer; font-size:0.9em;">'
        + '' + bpIcon('download', 14) + ' Download</button>'
        + '</div></div>';
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

export function copyCoverLetter() {
    var ta = document.getElementById('coverLetterOutput');
    if (ta) {
        navigator.clipboard.writeText(ta.value).then(function() {
            showToast('Cover letter copied to clipboard.', 'success');
        });
    }
}
if (!window.copyCoverLetter) window.copyCoverLetter = copyCoverLetter;

export function downloadCoverLetter(company) {
    var ta = document.getElementById('coverLetterOutput');
    if (!ta) return;
    var blob = new Blob([ta.value], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cover-letter-' + company.toLowerCase().replace(/\s+/g, '-') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Cover letter downloaded.', 'success');
}
if (!window.downloadCoverLetter) window.downloadCoverLetter = downloadCoverLetter;

// ===== INTERVIEW PREP GENERATOR =====

export function generateInterviewPrep() {
    if (window.isReadOnlyProfile) { demoGate('generate interview prep'); return; }
    var jobs = window._userData.savedJobs || [];
    if (jobs.length === 0) {
        showToast('Add a job in the Jobs tab first, then generate interview prep.', 'info');
        return;
    }
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">Interview Prep</h2>'
        + '<p style="color:var(--text-secondary); margin-top:5px;">Select a job for tailored STAR stories and talking points</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00d7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px;">'
        + jobs.map(function(j, i) {
            var score = j.matchData ? Math.round(j.matchData.score) : 0;
            var scoreColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
            return '<div onclick="buildInterviewPrep(' + i + ')" style="display:flex; align-items:center; gap:14px; '
                + 'padding:16px; border:1px solid var(--border); border-radius:10px; cursor:pointer; '
                + 'margin-bottom:10px; transition:all 0.15s;" '
                + 'onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
                + '<div style="width:44px; height:44px; border-radius:10px; background:rgba(96,165,250,0.1); '
                + 'display:flex; align-items:center; justify-content:center; font-weight:700; color:' + scoreColor + '; font-size:0.85em;">'
                + score + '%</div>'
                + '<div style="flex:1; min-width:0;">'
                + '<div style="font-weight:600; color:var(--text-primary); font-size:0.92em;">' + (j.title || 'Untitled') + '</div>'
                + '<div style="font-size:0.82em; color:var(--text-muted);">' + (j.company || 'Unknown') + '</div>'
                + '</div>'
                + '<div style="color:var(--text-muted); font-size:1.2em;">\u2192</div>'
                + '</div>';
        }).join('')
        + '</div>';
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}
if (!window.generateInterviewPrep) window.generateInterviewPrep = generateInterviewPrep;

export function buildInterviewPrep(jobIdx) {
    var job = (window._userData.savedJobs || [])[jobIdx];
    if (!job || !job.matchData) { showToast('No match data.', 'error'); return; }
    logAnalyticsEvent('interview_prep', { company: job.company || '', title: job.title || '' });
    closeExportModal();

    var name = (window._userData.profile && window._userData.profile.name) || 'Professional';
    var title = (window._userData.profile && window._userData.profile.currentTitle) || '';
    var matched = job.matchData.matched || [];
    var gaps = job.matchData.gaps || [];
    var surplus = job.matchData.surplus || [];
    var sharedOutcomes = (_bd().outcomes || []).filter(function(o) { return o.shared; });
    var skills = _sd().skills || [];

    var apiKey = safeGet('wbAnthropicKey');

    if (apiKey) {
        showToast('Generating interview prep with AI...', 'info');

        // Build skill-evidence map
        var skillEvidence = {};
        skills.forEach(function(s) {
            if (s.evidence && s.evidence.length > 0) {
                skillEvidence[s.name] = s.evidence.slice(0, 2).map(function(e) { return typeof e === 'string' ? e : e.text || ''; });
            }
        });

        var prompt = 'Create an interview preparation guide for ' + name
            + (title ? ' (' + title + ')' : '')
            + ' interviewing for ' + (job.title || 'a role') + ' at ' + (job.company || 'the company') + '.\n\n'
            + 'MATCHED SKILLS WITH EVIDENCE:\n'
            + matched.slice(0, 10).map(function(m) {
                var n = m.name || m;
                var ev = skillEvidence[n];
                return '- ' + n + (ev ? ': ' + ev.join('; ') : '');
            }).join('\n') + '\n\n'
            + 'SKILL GAPS (job requires, candidate lacks): ' + gaps.slice(0, 8).map(function(g) { return (g.name || g) + (g.required ? ' [REQUIRED]' : ''); }).join(', ') + '\n\n'
            + 'SURPLUS STRENGTHS: ' + surplus.slice(0, 5).map(function(s) { return s.name || s; }).join(', ') + '\n\n'
            + 'KEY OUTCOMES: ' + sharedOutcomes.slice(0, 5).map(function(o) { return o.text; }).join('; ') + '\n\n'
            + 'INSTRUCTIONS:\n'
            + '1. For the top 5 matched skills, write a STAR story framework: Situation (one sentence setup), Task, Action, Result. Use the evidence provided.\n'
            + '2. For each gap, write bridging language that connects adjacent experience. Frame: "While I haven\'t done X specifically, my experience with Y translates because..."\n'
            + '3. Write 3 surplus strengths as "unexpected value" talking points. These differentiate the candidate.\n'
            + '4. Write 3 smart questions to ask the interviewer that demonstrate strategic thinking.\n'
            + 'Format with clear section headers. Be specific, not generic.';

        callAnthropicAPI({
                model: BP_AI_MODEL,
                max_tokens: 2500,
                messages: [{ role: 'user', content: prompt }]
            }, apiKey, 'interview-prep')
        .then(function(data) {
            var text = (data.content || []).map(function(c) { return c.text || ''; }).join('\n');
            if (!text) throw new Error('Empty response');
            showInterviewPrepResult(text, job);
        })
        .catch(function(err) {
            console.error('Interview prep API error:', err);
            showToast('AI generation failed, using template.', 'warning');
            showInterviewPrepResult(buildTemplateInterviewPrep(job, matched, gaps, surplus, skills, sharedOutcomes), job);
        });
    } else {
        showInterviewPrepResult(buildTemplateInterviewPrep(job, matched, gaps, surplus, skills, sharedOutcomes), job);
    }
}
if (!window.buildInterviewPrep) window.buildInterviewPrep = buildInterviewPrep;

export function buildTemplateInterviewPrep(job, matched, gaps, surplus, skills, outcomes) {
    var lines = [];
    lines.push('INTERVIEW PREP: ' + (job.title || 'Role') + ' at ' + (job.company || 'Company'));
    lines.push('Match Score: ' + Math.round(job.matchData.score) + '%');
    lines.push('');

    lines.push('=== YOUR STRONGEST TALKING POINTS ===');
    lines.push('');
    matched.slice(0, 6).forEach(function(m) {
        var n = m.name || m;
        var skill = skills.find(function(s) { return s.name === n; });
        var evidence = (skill && skill.evidence) ? skill.evidence.slice(0, 2) : [];
        lines.push('\u2705 ' + n + (m.level ? ' (' + m.level + ')' : ''));
        if (evidence.length > 0) {
            evidence.forEach(function(e) {
                var txt = typeof e === 'string' ? e : e.text || '';
                if (txt) lines.push('   Evidence: ' + txt);
            });
        }
        lines.push('   STAR Framework: [Situation] Describe when you used this skill. [Task] What was the challenge? [Action] What specifically did you do? [Result] What was the measurable outcome?');
        lines.push('');
    });

    if (gaps.length > 0) {
        lines.push('=== BRIDGING LANGUAGE FOR GAPS ===');
        lines.push('');
        gaps.slice(0, 5).forEach(function(g) {
            var n = g.name || g;
            lines.push('\u26A0\uFE0F ' + n + (g.required ? ' [REQUIRED]' : ''));
            lines.push('   "While I haven\'t worked with ' + n + ' specifically, my experience with [related skill] translates directly because..."');
            lines.push('');
        });
    }

    if (surplus.length > 0) {
        lines.push('=== UNEXPECTED VALUE (YOUR DIFFERENTIATORS) ===');
        lines.push('');
        surplus.slice(0, 4).forEach(function(s) {
            lines.push('\uD83D\uDCA1 ' + (s.name || s));
            lines.push('   This skill isn\'t in the job description but adds value because...');
            lines.push('');
        });
    }

    lines.push('=== QUESTIONS TO ASK ===');
    lines.push('');
    lines.push('1. What does success look like in this role at the 6-month mark?');
    lines.push('2. How does the team approach [a key matched skill area] today, and where do you want it to go?');
    lines.push('3. What\'s the biggest challenge the person in this role will face in the first quarter?');
    lines.push('');
    lines.push('Generated by Blueprint\u2122 \u2022 ' + new Date().toLocaleDateString() + ' \u2022 myblueprint.work');
    return lines.join('\n');
}

export function showInterviewPrepResult(text, job) {
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">Interview Prep</h2>'
        + '<p style="color:var(--text-secondary); margin-top:5px;">'
        + (job.title || '') + ' at ' + (job.company || '') + '</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00d7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px;">'
        + '<textarea id="interviewPrepOutput" style="width:100%; min-height:400px; padding:18px; '
        + 'background:var(--input-bg); border:1px solid var(--border); border-radius:10px; '
        + 'color:var(--text-primary); font-size:0.92em; line-height:1.7; font-family:inherit; resize:vertical;">'
        + escapeHtml(text)
        + '</textarea>'
        + '<div style="display:flex; gap:10px; margin-top:16px;">'
        + '<button onclick="copyInterviewPrep()" style="flex:1; background:var(--accent); color:#fff; border:none; '
        + 'padding:12px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em;">'
        + '' + bpIcon('clipboard', 14) + ' Copy to Clipboard</button>'
        + '<button onclick="downloadInterviewPrep(\'' + (job.company || 'company').replace(/'/g, '') + '\')" '
        + 'style="background:var(--input-bg); color:var(--text-primary); border:1px solid var(--border); '
        + 'padding:12px 20px; border-radius:8px; cursor:pointer; font-size:0.9em;">'
        + '' + bpIcon('download', 14) + ' Download</button>'
        + '</div></div>';
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

export function copyInterviewPrep() {
    var ta = document.getElementById('interviewPrepOutput');
    if (ta) {
        navigator.clipboard.writeText(ta.value).then(function() {
            showToast('Interview prep copied to clipboard.', 'success');
        });
    }
}
if (!window.copyInterviewPrep) window.copyInterviewPrep = copyInterviewPrep;

export function downloadInterviewPrep(company) {
    var ta = document.getElementById('interviewPrepOutput');
    if (!ta) return;
    var blob = new Blob([ta.value], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'interview-prep-' + company.toLowerCase().replace(/\s+/g, '-') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Interview prep downloaded.', 'success');
}
if (!window.downloadInterviewPrep) window.downloadInterviewPrep = downloadInterviewPrep;

// ===== LINKEDIN PROFILE GENERATOR =====

export function generateLinkedInProfile() {
    if (window.isReadOnlyProfile) { demoGate('generate a LinkedIn profile'); return; }
    logAnalyticsEvent('linkedin_profile', {});
    var name = (window._userData.profile && window._userData.profile.name) || 'Professional';
    var title = (window._userData.profile && window._userData.profile.currentTitle) || '';
    var purpose = window._userData.purpose || _bd().purpose || '';
    var sharedOutcomes = (_bd().outcomes || []).filter(function(o) { return o.shared; });
    var selectedValues = (_bd().values || []).filter(function(v) { return v.selected; });
    var skills = _sd().skills || [];
    var topSkills = skills.filter(function(s) { return s.key; }).slice(0, 15);
    var allSkills = skills.slice(0, 50);

    var apiKey = safeGet('wbAnthropicKey');

    if (apiKey) {
        showToast('Generating LinkedIn profile with AI...', 'info');
        var prompt = 'Generate an optimized LinkedIn profile for ' + name
            + (title ? ', ' + title : '') + '.\n\n'
            + 'PURPOSE: ' + (purpose || 'Not provided') + '\n\n'
            + 'KEY OUTCOMES:\n' + sharedOutcomes.slice(0, 6).map(function(o) { return '- ' + o.text; }).join('\n') + '\n\n'
            + 'CORE VALUES: ' + selectedValues.slice(0, 5).map(function(v) { return v.name; }).join(', ') + '\n\n'
            + 'TOP SKILLS: ' + topSkills.map(function(s) { return s.name; }).join(', ') + '\n\n'
            + 'INSTRUCTIONS:\n'
            + '1. HEADLINE (max 220 chars): Title | Value proposition | 2-3 key differentiators. No buzzwords.\n'
            + '2. ABOUT SECTION (2000 chars max, ~3 paragraphs): First paragraph hooks with a specific outcome. Second connects purpose to capabilities. Third is forward-looking, what you are building toward. End with a brief "Specialties:" line. Write in first person. No generic openers like "Passionate professional" or "Results-driven leader".\n'
            + '3. SKILLS LIST: The top 15 skills ordered by impact, one per line.\n'
            + 'Separate each section with a clear header.';

        callAnthropicAPI({
                model: BP_AI_MODEL,
                max_tokens: 1500,
                messages: [{ role: 'user', content: prompt }]
            }, apiKey, 'linkedin-profile')
        .then(function(data) {
            var text = (data.content || []).map(function(c) { return c.text || ''; }).join('\n');
            if (!text) throw new Error('Empty response');
            showLinkedInResult(text);
        })
        .catch(function(err) {
            console.error('LinkedIn API error:', err);
            showToast('AI generation failed, using template.', 'warning');
            showLinkedInResult(buildTemplateLinkedIn(name, title, purpose, sharedOutcomes, selectedValues, topSkills));
        });
    } else {
        showLinkedInResult(buildTemplateLinkedIn(name, title, purpose, sharedOutcomes, selectedValues, topSkills));
    }
}
if (!window.generateLinkedInProfile) window.generateLinkedInProfile = generateLinkedInProfile;

export function buildTemplateLinkedIn(name, title, purpose, outcomes, values, topSkills) {
    var lines = [];
    lines.push('=== HEADLINE ===');
    lines.push(title + (values.length > 0 ? ' | ' + values.slice(0, 3).map(function(v) { return v.name; }).join(' \u00B7 ') : '')
        + (topSkills.length > 0 ? ' | ' + topSkills.slice(0, 3).map(function(s) { return s.name; }).join(', ') : ''));
    lines.push('');
    lines.push('=== ABOUT ===');
    if (outcomes.length > 0) {
        lines.push(outcomes[0].text + '\n');
    }
    if (purpose) {
        lines.push(purpose + '\n');
    }
    if (outcomes.length > 1) {
        lines.push('Key results I have delivered:');
        outcomes.slice(1, 5).forEach(function(o) {
            lines.push('\u2022 ' + o.text);
        });
        lines.push('');
    }
    if (topSkills.length > 0) {
        lines.push('Specialties: ' + topSkills.map(function(s) { return s.name; }).join(' \u00B7 '));
    }
    lines.push('');
    lines.push('=== SKILLS (Top 15) ===');
    topSkills.forEach(function(s, i) {
        lines.push((i + 1) + '. ' + s.name);
    });
    lines.push('');
    lines.push('Generated by Blueprint\u2122 \u2022 myblueprint.work');
    return lines.join('\n');
}

export function showLinkedInResult(text) {
    var modal = document.getElementById('exportModal');
    var mc = modal.querySelector('.modal-content');
    mc.innerHTML = '<div class="modal-header">'
        + '<div class="modal-header-left">'
        + '<h2 class="modal-title">LinkedIn Profile</h2>'
        + '<p style="color:var(--text-secondary); margin-top:5px;">Copy each section directly to LinkedIn</p>'
        + '</div>'
        + '<button class="modal-close" aria-label="Close dialog" onclick="closeExportModal()">\u00d7</button>'
        + '</div>'
        + '<div class="modal-body" style="padding:24px;">'
        + '<textarea id="linkedinOutput" style="width:100%; min-height:380px; padding:18px; '
        + 'background:var(--input-bg); border:1px solid var(--border); border-radius:10px; '
        + 'color:var(--text-primary); font-size:0.92em; line-height:1.7; font-family:inherit; resize:vertical;">'
        + escapeHtml(text)
        + '</textarea>'
        + '<div style="display:flex; gap:10px; margin-top:16px;">'
        + '<button onclick="copyLinkedIn()" style="flex:1; background:#0a66c2; color:#fff; border:none; '
        + 'padding:12px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.9em;">'
        + '' + bpIcon('clipboard', 14) + ' Copy to Clipboard</button>'
        + '</div></div>';
    history.pushState({ modal: true }, ''); modal.classList.add('active');
}

export function copyLinkedIn() {
    var ta = document.getElementById('linkedinOutput');
    if (ta) {
        navigator.clipboard.writeText(ta.value).then(function() {
            showToast('LinkedIn profile copied. Open LinkedIn to paste.', 'success');
        });
    }
}
if (!window.copyLinkedIn) window.copyLinkedIn = copyLinkedIn;

// ===== OPPORTUNITIES SYSTEM =====

let jobsSubTab = 'your-jobs';
let activeJobId = null;

var _fitForMeData = [];
var _fitForMeLoading = false;
var _fitForMeLastRun = 0;
var _fitForMeExpanded = {};
if (!window.initBlueprint) window.initBlueprint = initBlueprint;
if (!window.extractOutcomesFromEvidence) window.extractOutcomesFromEvidence = extractOutcomesFromEvidence;
if (!window.categorizeOutcome) window.categorizeOutcome = categorizeOutcome;
if (!window.isSensitiveContent) window.isSensitiveContent = isSensitiveContent;
if (!window.generateCoachingFor) window.generateCoachingFor = generateCoachingFor;
if (!window.inferCompanyValuesFromJD) window.inferCompanyValuesFromJD = inferCompanyValuesFromJD;
if (!window._persistCompanyValues) window._persistCompanyValues = _persistCompanyValues;
if (!window.getCompanyValues) window.getCompanyValues = getCompanyValues;
if (!window.computeValuesAlignment) window.computeValuesAlignment = computeValuesAlignment;
if (!window.saveValues) window.saveValues = saveValues;
if (!window.loadSavedValues) window.loadSavedValues = loadSavedValues;
if (!window.getEvidenceForValue) window.getEvidenceForValue = getEvidenceForValue;
if (!window.getKeywordsForValue) window.getKeywordsForValue = getKeywordsForValue;
if (!window.scoreValueByEvidence) window.scoreValueByEvidence = scoreValueByEvidence;
if (!window.getCatalogDescription) window.getCatalogDescription = getCatalogDescription;
if (!window.editValueNote) window.editValueNote = editValueNote;
if (!window.saveValueNote) window.saveValueNote = saveValueNote;
if (!window.inferValues) window.inferValues = inferValues;
if (!window.renderBlueprint) window.renderBlueprint = renderBlueprint;
if (!window.switchBlueprintTab) window.switchBlueprintTab = switchBlueprintTab;
if (!window.renderBlueprintTabContent) window.renderBlueprintTabContent = renderBlueprintTabContent;
if (!window.renderDashboardTab) window.renderDashboardTab = renderDashboardTab;
if (!window.renderSkillsManagementTab) window.renderSkillsManagementTab = renderSkillsManagementTab;
if (!window.renderExperienceTab) window.renderExperienceTab = renderExperienceTab;
if (!window.renderOutcomesSection) window.renderOutcomesSection = renderOutcomesSection;
if (!window.renderOutcomeItem) window.renderOutcomeItem = renderOutcomeItem;
if (!window.renderValuesSection) window.renderValuesSection = renderValuesSection;
if (!window.renderSelectedValues) window.renderSelectedValues = renderSelectedValues;
if (!window.renderValuesPicker) window.renderValuesPicker = renderValuesPicker;
if (!window._countContentItems) window._countContentItems = _countContentItems;
if (!window._getContentVis) window._getContentVis = _getContentVis;
if (!window.toggleContentVis) window.toggleContentVis = toggleContentVis;
if (!window.contentToggleAllSection) window.contentToggleAllSection = contentToggleAllSection;
if (!window._toggleSwitch) window._toggleSwitch = _toggleSwitch;
if (!window._contentCard) window._contentCard = _contentCard;
if (!window._sectionHeader) window._sectionHeader = _sectionHeader;
if (!window.renderContentEvidenceTab) window.renderContentEvidenceTab = renderContentEvidenceTab;
if (!window.renderExportSection) window.renderExportSection = renderExportSection;
if (!window.renderVerificationsTab) window.renderVerificationsTab = renderVerificationsTab;
if (!window.verifyTabRequestNew) window.verifyTabRequestNew = verifyTabRequestNew;
if (!window.verifyTabRevoke) window.verifyTabRevoke = verifyTabRevoke;
if (!window.verifyTabClearExpired) window.verifyTabClearExpired = verifyTabClearExpired;
if (!window.verifyTabResend) window.verifyTabResend = verifyTabResend;
if (!window.toggleOutcomeShare) window.toggleOutcomeShare = toggleOutcomeShare;
if (!window.deleteBlueprintOutcome) window.deleteBlueprintOutcome = deleteBlueprintOutcome;
if (!window.editOutcome) window.editOutcome = editOutcome;
if (!window.saveOutcomeEdit) window.saveOutcomeEdit = saveOutcomeEdit;
if (!window.viewOutcomeEvidence) window.viewOutcomeEvidence = viewOutcomeEvidence;
if (!window.addCustomOutcome) window.addCustomOutcome = addCustomOutcome;
if (!window.fillOutcomeTemplate) window.fillOutcomeTemplate = fillOutcomeTemplate;
if (!window.saveCustomOutcome) window.saveCustomOutcome = saveCustomOutcome;
if (!window.toggleValue) window.toggleValue = toggleValue;
if (!window.refreshValuesUI) window.refreshValuesUI = refreshValuesUI;
if (!window.updateValuesBadge) window.updateValuesBadge = updateValuesBadge;
if (!window.toggleValuesPicker) window.toggleValuesPicker = toggleValuesPicker;
if (!window.pickValue) window.pickValue = pickValue;
if (!window.removeSelectedValue) window.removeSelectedValue = removeSelectedValue;
if (!window.showAddCustomValueForm) window.showAddCustomValueForm = showAddCustomValueForm;
if (!window.showAddValueForm) window.showAddValueForm = showAddValueForm;
if (!window.hideAddValueForm) window.hideAddValueForm = hideAddValueForm;
if (!window.addCustomValue) window.addCustomValue = addCustomValue;
if (!window.moveValue) window.moveValue = moveValue;
if (!window.updatePurpose) window.updatePurpose = updatePurpose;
if (!window.getBlindDefaults) window.getBlindDefaults = getBlindDefaults;
if (!window.setBlindDefault) window.setBlindDefault = setBlindDefault;
if (!window.getActiveBlindSettings) window.getActiveBlindSettings = getActiveBlindSettings;
if (!window.hasAnyBlinding) window.hasAnyBlinding = hasAnyBlinding;
if (!window.hasOverrides) window.hasOverrides = hasOverrides;
if (!window.applyBlindSettings) window.applyBlindSettings = applyBlindSettings;
if (!window.logPrivacyEvent) window.logPrivacyEvent = logPrivacyEvent;
if (!window.showScoutingReportPicker) window.showScoutingReportPicker = showScoutingReportPicker;
if (!window.launchScoutingReport) window.launchScoutingReport = launchScoutingReport;
if (!window.showReportFormatPicker) window.showReportFormatPicker = showReportFormatPicker;
if (!window.generateHTMLScoutingReport) window.generateHTMLScoutingReport = generateHTMLScoutingReport;
if (!window.buildReportData) window.buildReportData = buildReportData;
if (!window.showReportOverlay) window.showReportOverlay = showReportOverlay;
if (!window.shareScoutingReport) window.shareScoutingReport = shareScoutingReport;
if (!window.openSampleScoutingReport) window.openSampleScoutingReport = openSampleScoutingReport;
if (!window.generateScoutingReport) window.generateScoutingReport = generateScoutingReport;
if (!window.generateScoutingReportPDF) window.generateScoutingReportPDF = generateScoutingReportPDF;
if (!window.exportBlueprint) window.exportBlueprint = exportBlueprint;
if (!window.generatePDF) window.generatePDF = generatePDF;
if (!window.copyBlueprintText) window.copyBlueprintText = copyBlueprintText;
if (!window.generateCoverLetter) window.generateCoverLetter = generateCoverLetter;
if (!window.buildCoverLetter) window.buildCoverLetter = buildCoverLetter;
if (!window.buildTemplateCoverLetter) window.buildTemplateCoverLetter = buildTemplateCoverLetter;
if (!window.showCoverLetterResult) window.showCoverLetterResult = showCoverLetterResult;
if (!window.copyCoverLetter) window.copyCoverLetter = copyCoverLetter;
if (!window.downloadCoverLetter) window.downloadCoverLetter = downloadCoverLetter;
if (!window.generateInterviewPrep) window.generateInterviewPrep = generateInterviewPrep;
if (!window.buildInterviewPrep) window.buildInterviewPrep = buildInterviewPrep;
if (!window.buildTemplateInterviewPrep) window.buildTemplateInterviewPrep = buildTemplateInterviewPrep;
if (!window.showInterviewPrepResult) window.showInterviewPrepResult = showInterviewPrepResult;
if (!window.copyInterviewPrep) window.copyInterviewPrep = copyInterviewPrep;
if (!window.downloadInterviewPrep) window.downloadInterviewPrep = downloadInterviewPrep;
if (!window.generateLinkedInProfile) window.generateLinkedInProfile = generateLinkedInProfile;
if (!window.buildTemplateLinkedIn) window.buildTemplateLinkedIn = buildTemplateLinkedIn;
if (!window.showLinkedInResult) window.showLinkedInResult = showLinkedInResult;
if (!window.copyLinkedIn) window.copyLinkedIn = copyLinkedIn;
