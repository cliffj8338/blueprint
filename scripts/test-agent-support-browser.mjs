import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('Blueprint selector works with real browser events and SVG overlays', () => {
    // Use the workspace browser, or set CHROMIUM_BIN to a local Chromium executable.
    const browser = spawnSync(process.env.CHROMIUM_BIN || 'chromium', [
        '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
        '--timeout=15000', '--virtual-time-budget=5000', '--dump-dom',
        pathToFileURL(resolve('tests/fixtures/agent-support-selection.html')).href
    ], { encoding: 'utf8', timeout: 25000, maxBuffer: 2 * 1024 * 1024 });
    assert.ifError(browser.error);
    assert.equal(browser.status, 0, browser.stderr);
    const result = browser.stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1];
    assert.ok(result?.startsWith('PASS:'), result || 'Browser regression did not finish');
});
