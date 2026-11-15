import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('locked package downloads are portable outside the development workspace', () => {
    const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
    for (const [name, entry] of Object.entries(lock.packages)) {
        if (!entry.resolved || entry.link) continue;
        const url = new URL(entry.resolved);
        assert.equal(url.protocol, 'https:', `${name} must use HTTPS`);
        assert.equal(url.hostname, 'registry.npmjs.org', `${name} must use the public npm registry`);
        assert.equal(url.username + url.password, '', `${name} must not embed credentials`);
        assert.ok(entry.integrity, `${name} must retain its integrity check`);
    }
});
