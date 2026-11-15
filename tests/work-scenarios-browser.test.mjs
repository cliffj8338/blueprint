import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';

// Deliberately serve only the disposable fixture and the three production assets.
// No application server, Firebase, profile mocks or saved-user writes are involved.
const files = new Map([
    ['/tests/fixtures/language-work-scenarios.html', ['tests/fixtures/language-work-scenarios.html', 'text/html']],
    ...['work-scenarios.js', 'work-scenarios-ui.js', 'work-scenarios.css']
        .map(name => [`/${name}`, [`public/${name}`, name.endsWith('.css') ? 'text/css' : 'text/javascript']])
]);
let server, browser, origin;
before(async () => {
    server = createServer(async (req, res) => {
        const file = files.get(req.url);
        if (!file) { res.writeHead(404).end(); return; }
        try {
            res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
            res.end(await readFile(file[0]));
        } catch (error) {
            res.writeHead(500).end(String(error));
        }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_BIN || execFileSync('which', ['chromium'], { encoding: 'utf8' }).trim(),
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
});
after(async () => {
    await browser?.close();
    if (server) await new Promise(resolve => server.close(resolve));
});

async function fixture(viewport, run) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], externalRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
        if (new URL(route.request().url()).origin !== origin) {
            externalRequests.push(route.request().url());
            return route.abort();
        }
        return route.continue();
    });
    try {
        await page.goto(`${origin}/tests/fixtures/language-work-scenarios.html`);
        await page.locator('[data-bp-scenario-open]').last().waitFor();
        await run(page);
        assert.deepEqual(errors, [], 'no browser errors');
        assert.deepEqual(externalRequests, [], 'fixture must remain anonymous and self-contained');
        assert.deepEqual(await page.evaluate(() => ({
            local: localStorage.length, session: sessionStorage.length
        })), { local: 0, session: 0 }, 'no persisted profile or session state');
    } finally {
        await context.close();
    }
}

const skills = [
    ['understand written Arabic', 'language-reading'],
    ['write Chinese', 'language-writing'],
    ['understand spoken Ukrainian', 'language-listening'],
    ['interact verbally in Portuguese', 'language-conversation'],
    ['perform sworn translations', 'translation'],
    ['perform sworn interpretations', 'language-interpreting']
];

for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 568, height: 320 },
    { width: 1280, height: 800 }
]) {
    for (const [skill, profile] of skills) {
        test(`${skill}: readable and reachable at ${viewport.width}x${viewport.height}`, async () => {
            await fixture(viewport, async page => {
                const trigger = page.getByRole('button', { name: `Explore work scenarios for ${skill}`, exact: true });
                await trigger.click();
                const dialog = page.getByRole('dialog', { name: skill, exact: true });
                await dialog.waitFor();
                assert.equal(await dialog.getAttribute('aria-modal'), 'true');
                const data = await page.evaluate(name => BPWorkScenarios.describe(name), skill);
                assert.equal(data.match.profileId, profile);
                assert.equal(await dialog.locator('article').count(), 3);
                assert.deepEqual(await dialog.locator('.bp-scenario-kind').allTextContents(),
                    ['Human-led', 'Agent-augmented', 'Agent-performed']);
                for (let i = 0; i < 3; i++) {
                    const card = dialog.locator('article').nth(i);
                    assert.equal(await card.locator('h3').textContent(), data.scenarios[i].task);
                    assert.deepEqual(await card.locator('.bp-scenario-list-grid .bp-scenario-list').nth(1).locator('li').allTextContents(),
                        data.scenarios[i].conditions);
                    assert.deepEqual(await card.locator('.bp-scenario-limits li').allTextContents(), data.scenarios[i].limits);
                    const limits = data.scenarios[i].limits.join(' ');
                    assert.match(limits, /dialect/);
                    assert.match(limits, /quality|Quality/);
                    assert.match(limits, /[Cc]linical/);
                    assert.match(limits, /[Ss]worn/);
                }
                assert.deepEqual(await dialog.locator('.bp-scenario-assumptions li').allTextContents(), data.assumptions);
                // Inspect actual rendered text lines, not merely DOM presence. Every
                // line must fit horizontally; the start and end of each text block
                // must be revealable within the dialog's own scrolling viewport.
                const failures = await dialog.evaluate(dialog => {
                    const failures = [];
                    const scroller = dialog.querySelector('.bp-scenario-scroll');
                    const bounds = scroller.getBoundingClientRect();
                    if (scroller.clientHeight < 40) failures.push('no usable scroll viewport');
                    if (dialog.getBoundingClientRect().right > innerWidth + 1) failures.push('dialog overflows viewport');
                    if (scroller.scrollWidth > scroller.clientWidth + 1) failures.push('horizontal scroll required');
                    for (const element of scroller.querySelectorAll('h3, h4, p, li, strong')) {
                        const range = document.createRange();
                        range.selectNodeContents(element);
                        const lines = [...range.getClientRects()];
                        const offset = scroller.scrollTop;
                        if (!lines.length) failures.push('hidden text: ' + element.textContent);
                        for (const line of lines) {
                            if (line.left < bounds.left - 1 || line.right > bounds.right + 1)
                                failures.push('clipped text: ' + element.textContent);
                        }
                        for (const line of [lines[0], lines.at(-1)].filter(Boolean)) {
                            // Rects are captured at the current scroll offset.
                            const top = line.top - bounds.top + offset;
                            scroller.scrollTop = Math.max(0, top - scroller.clientHeight / 2);
                            const y = top - scroller.scrollTop;
                            if (y < -1 || y + line.height > scroller.clientHeight + 1)
                                failures.push('unreachable text: ' + element.textContent);
                        }
                    }
                    scroller.scrollTop = scroller.scrollHeight;
                    const footer = scroller.querySelector('.bp-scenario-footer-note').getBoundingClientRect();
                    if (footer.bottom > bounds.bottom + 1) failures.push('footer unreachable');
                    return failures;
                });
                assert.deepEqual(failures, []);
                await page.keyboard.press('Escape');
                assert.equal(await dialog.count(), 0);
                assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
            });
        });
    }
}

test('real keyboard navigation traps focus, scrolls all content, and every close route restores state', async () => {
    await fixture({ width: 320, height: 568 }, async page => {
        const trigger = page.getByRole('button', { name: 'Explore work scenarios for perform sworn interpretations', exact: true });
        for (const closeVia of ['Escape', 'button', 'backdrop']) {
            await page.evaluate(() => { document.body.style.overflow = 'auto'; });
            await trigger.focus();
            await page.keyboard.press('Enter');
            const dialog = page.getByRole('dialog');
            assert.equal(await dialog.evaluate(el => el === document.activeElement), true);
            assert.equal(await page.locator('#fixture-background').evaluate(el => el.inert), true);
            assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
            const close = page.getByRole('button', { name: 'Close work scenarios', exact: true });
            await page.keyboard.press('Tab');
            assert.equal(await close.evaluate(el => el === document.activeElement), true, 'first tab enters dialog controls, not backdrop');
            const scroller = page.locator('.bp-scenario-scroll');
            await page.keyboard.press('Tab');
            assert.equal(await scroller.evaluate(el => el === document.activeElement), true, 'text region is keyboard reachable');
            await page.keyboard.press('Control+End');
            await page.waitForFunction(() => {
                const el = document.querySelector('.bp-scenario-scroll');
                return el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
            });
            await page.keyboard.press('Tab');
            assert.equal(await close.evaluate(el => el === document.activeElement), true, 'Tab wraps to first control');
            await page.keyboard.press('Shift+Tab');
            assert.equal(await scroller.evaluate(el => el === document.activeElement), true, 'Shift+Tab wraps to scroll region');
            await page.keyboard.press('Shift+Tab');
            assert.equal(await close.evaluate(el => el === document.activeElement), true);
            if (closeVia === 'Escape') await page.keyboard.press('Escape');
            if (closeVia === 'button') await page.keyboard.press('Enter');
            if (closeVia === 'backdrop') await page.locator('.bp-scenario-backdrop').click({ position: { x: 2, y: 2 } });
            assert.equal(await dialog.count(), 0);
            assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
            assert.equal(await page.locator('#fixture-background').evaluate(el => el.inert || el.hasAttribute('aria-hidden')), false);
            assert.equal(await page.locator('#already-hidden').evaluate(el => el.inert && el.getAttribute('aria-hidden') === 'true'), true);
            assert.equal(await page.evaluate(() => document.body.style.overflow), 'auto');
        }
    });
});

test('200% text size still exposes long language limitations and close button', async () => {
    await fixture({ width: 320, height: 568 }, async page => {
        await page.addStyleTag({ content: 'html { font-size: 200%; }' });
        await page.getByRole('button', { name: 'Explore work scenarios for perform sworn interpretations', exact: true }).click();
        const scroller = page.locator('.bp-scenario-scroll');
        assert.ok(await scroller.evaluate(el => el.clientHeight >= 40), 'text enlargement leaves a usable scroll region');
        assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
        await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
        const footer = page.locator('.bp-scenario-footer-note');
        assert.equal(await footer.evaluate(el => {
            const parent = el.closest('.bp-scenario-scroll').getBoundingClientRect();
            const rect = el.getBoundingClientRect();
            return rect.bottom <= parent.bottom + 1;
        }), true);
        await page.getByRole('button', { name: 'Close work scenarios', exact: true }).click();
        assert.equal(await page.getByRole('dialog').count(), 0);
    });
});
