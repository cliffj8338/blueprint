/**
 * src/engine/certifications.js — Phase 3
 * Certification library loader + search/lookup helpers.
 * MONOLITH LINES: 17336–17535
 * DEPENDENCIES: none (leaf — skillsData referenced as transition global)
 */

// ─── State ────────────────────────────────────────────────────────────────────

export var certLibrary = { credentials: [], tiers: {} };

// ─── Loader ───────────────────────────────────────────────────────────────────

export function loadCertificationLibrary() {
    return fetch('certification_library.json?v=4.48.36')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            certLibrary = data;
            console.log('\u2705 Certification library loaded: ' + data.totalCredentials + ' credentials');
            // Chain: merge Lightcast certs if available
            return fetch('certifications/lightcast-certs.json?v=4.48.36')
                .then(function(r2) { return r2.json(); })
                .then(function(lcData) {
                    if (!lcData || !lcData.credentials || lcData.credentials.length === 0) return;
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
                    if (added > 0) console.log('\u2705 Lightcast certifications merged: +' + added + ' (' + certLibrary.credentials.length + ' total)');
                })
                .catch(function() { /* Lightcast file optional */ });
        })
        .catch(function(e) { console.warn('\u26A0\uFE0F Could not load certification library:', e); });
}

// ─── Search & lookup ──────────────────────────────────────────────────────────

export function searchCertLibrary(query) {
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    return (certLibrary.credentials || []).filter(function(c) {
        return c.name.toLowerCase().includes(q)
            || c.abbr.toLowerCase().includes(q)
            || c.description.toLowerCase().includes(q)
            || c.category.toLowerCase().includes(q);
    }).slice(0, 15);
}
window.searchCertLibrary = searchCertLibrary;

export function findCertInLibrary(nameOrAbbr) {
    if (!nameOrAbbr) return null;
    var q = nameOrAbbr.toLowerCase().trim();
    return (certLibrary.credentials || []).find(function(c) {
        return c.abbr.toLowerCase() === q || c.name.toLowerCase() === q;
    }) || null;
}
window.findCertInLibrary = findCertInLibrary;

export function getCertSkillAssociations(cert) {
    if (!cert) return [];
    if (cert.skills && cert.skills.length > 0) return cert.skills.slice();
    return getFallbackSkillMatches(cert);
}
window.getCertSkillAssociations = getCertSkillAssociations;

function getFallbackSkillMatches(cert) {
    if (!cert) return [];
    var stops = ['and','the','for','with','from','that','this','level','based','state',
                 'national','professional','certified','certification','license','advanced'];
    var keywords = (cert.description + ' ' + cert.category + ' ' + cert.name)
        .toLowerCase().split(/[\s,.\-\/]+/)
        .filter(function(w) { return w.length > 3 && stops.indexOf(w) < 0; });
    var matches = [];
    var skills = (typeof skillsData !== 'undefined' ? skillsData.skills : null) || [];
    skills.forEach(function(skill) {
        var sn = skill.name.toLowerCase();
        var score = keywords.filter(function(kw) { return sn.includes(kw); }).length;
        if (score > 0) matches.push({ name: skill.name, score: score });
    });
    matches.sort(function(a, b) { return b.score - a.score; });
    return matches.slice(0, 6).map(function(m) { return m.name; });
}

export function getCertFloorLevel(cert) {
    // evidenceConfig.certFloor referenced as transition global
    var fallback = (typeof evidenceConfig !== 'undefined' && evidenceConfig.certFloor) ? evidenceConfig.certFloor : 'Proficient';
    if (!cert) return fallback;
    return cert.tier === 2 ? 'Advanced' : 'Proficient';
}
window.getCertFloorLevel = getCertFloorLevel;
