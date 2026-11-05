/**
 * src/engine/crosswalk.js — Phase 3
 * O*NET occupation crosswalk: deferred loader + accessor helpers.
 * MONOLITH LINES: 19166–19248
 * DEPENDENCIES: core/constants.js (recordApiHealth)
 */

import { recordApiHealth } from '../core/constants.js';

// ─── Deferred loader ──────────────────────────────────────────────────────────
// Called once during initializeApp (100ms delay after libraries load).
// Safe to call multiple times — guards against double-load.

export function loadCrosswalkDeferred() {
    if (window.onetCrosswalk) return;
    fetch('onet-crosswalk.json?v=4.48.36')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            window.onetCrosswalk = data;
            var occCount   = Object.keys(data.occupations || {}).length;
            var aliasCount = Object.keys(data.aliases    || {}).length;
            console.log('\u2705 O*NET Crosswalk loaded (deferred): ' + occCount + ' occupations, ' + aliasCount + ' aliases');
            recordApiHealth('onet-crosswalk', 'ok', occCount + ' occupations, ' + aliasCount + ' aliases');
        })
        .catch(function(e) {
            window.onetCrosswalk = null;
            console.warn('\u26A0 onet-crosswalk.json failed to load:', e.message);
            recordApiHealth('onet-crosswalk', 'down', 'Failed to load');
        });
}
// Legacy alias used throughout monolith
window._loadCrosswalkDeferred = loadCrosswalkDeferred;

// ─── Accessors ────────────────────────────────────────────────────────────────

/** Resolve a job title string to an O*NET occupation code (best-effort). */
export function resolveOccupationCode(titleLower) {
    var cw = window.onetCrosswalk;
    if (!cw) return null;
    // Direct alias lookup first
    if (cw.aliases && cw.aliases[titleLower]) return cw.aliases[titleLower];
    // Prefix scan over occupations
    if (cw.occupations) {
        var keys = Object.keys(cw.occupations);
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase().indexOf(titleLower) !== -1) return cw.occupations[keys[i]];
        }
    }
    return null;
}

/** Return the full occupation object for an O*NET code, or null. */
export function getOccupationByCode(code) {
    var cw = window.onetCrosswalk;
    if (!cw || !code) return null;
    return (cw.occupations || {})[code] || null;
}
