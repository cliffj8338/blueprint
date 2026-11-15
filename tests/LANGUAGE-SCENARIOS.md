# Anonymous language dialog browser checks

## Reproduce on Replit / NixOS

```sh
npm ci
npm run test:work-scenarios-browser:nix
```

The Nix wrapper builds the patched Chromium, Firefox and WebKit binaries from
a pinned nixpkgs revision and sets `PLAYWRIGHT_BROWSERS_PATH`. The development
dependency `playwright-core` is pinned to 1.52.0 to match those browser protocols.
It also selects Mesa software EGL explicitly: headless WebKit still needs an
EGL vendor, and this workspace has no `/run/opengl-driver`. Nix supplies all
linked libraries, so the wrapper disables only Playwright's Ubuntu-specific
host-library check. Browser launch failures and assertions still fail the run.
No root access, Docker, user profiles or manually patched binaries are needed.

## Reproduce on supported Ubuntu / macOS hosts

```sh
npm ci
npx playwright-core install --with-deps chromium firefox webkit
npm run test:work-scenarios-browser
```

`--with-deps` may require administrator access on Ubuntu; on a pre-provisioned
host use `npx playwright-core install chromium firefox webkit` instead.
Do not use Ubuntu `install-deps` on NixOS; use the Nix wrapper above.
Browser downloads are not stored in Git or deployed assets.

The default is all three engines. To isolate an engine without silently skipping
missing browsers:

```sh
SCENARIO_BROWSERS=firefox npm run test:work-scenarios-browser:nix
SCENARIO_BROWSERS=webkit npm run test:work-scenarios-browser:nix
```

The same filter works with the non-Nix command. Unknown engine names fail.
`CHROMIUM_BIN` optionally overrides only Chromium's executable; otherwise all
engines use the matching Playwright binaries (not arbitrary browsers on PATH).
Missing browsers are failures, not skipped tests.

The runner starts a disposable, loopback-only server on a random port. It serves
only `fixtures/language-work-scenarios.html` and the three real production
scenario assets. It closes the server, pages and browser after the run, even on
assertion failures. Each check uses a fresh anonymous browser context and rejects
external requests. No app bootstrap, authentication bypass, account, database,
profile mock, AI call or saved-profile edit is needed. The fixture is outside
`public/` and is not a Vite production build entry.

Coverage:
- Reading Arabic, writing Chinese, listening to Ukrainian, speaking Portuguese,
  sworn translation and sworn interpreting, using the maintained scenario engine.
- 320×568 and 390×844 portrait, 568×320 and 740×240 short landscape,
  and 1280×800 desktop.
- All three scenario cards, complete conditions, limitations, assumptions and
  footer; dialect/quality uncertainty and clinical/sworn restrictions.
- Actual rendered line bounds and scroll reachability, not just text presence.
- Real Enter, Tab, Shift+Tab, ArrowDown, PageDown, PageUp, Home/End and Escape input, including focus
  wrapping, keyboard scrolling, background isolation, focus restoration and
  preservation of existing inert/ARIA/overflow state.
- Escape, close button and backdrop dismissal across repeated openings.
- 200% text size at 320px, with a reachable footer and close control.
- Live viewport shrinking/expansion and portrait/landscape rotation while the
  same dialog remains open: usable scroll area, visible close control, bounded
  dialog and a keyboard-reachable footer after every resize.
- Browser errors, external requests and accidental local/session storage writes.

The scroll assertions use real keyboard events, not synthetic scrolling.
Chromium/Firefox on Linux use Control+Home/End; Linux WebKit uses Home/End
without Control for the focused scroll region. Native scroll animations are
allowed to settle before reversing direction. Geometry/text-reachability checks
separately inspect the whole scroll range using DOM measurements.

## Verified result and boundaries

The Nix run exercises Chromium 136.0.7103.25, Firefox 137.0 and WebKit 18.4.
There are 33 checks per engine (99 total), with no authenticated contexts.
These tests load the actual `public/work-scenarios-ui.js` and
`public/work-scenarios.css`; they do not replace scrolling or focus behavior
with fixture implementations.

This is anonymous cross-engine component coverage, not a signed-in profile
integration test or screen-reader certification. WebKit is the Safari engine,
not the shipping Safari application. Resizing tests dynamic viewport CSS in the
browser but does not emulate iOS address-bar collapse, the software keyboard,
physical rotation, touch scrolling or macOS Safari keyboard preferences. Actual
Safari/iOS device checks remain separate from these automated results.
For visual inspection in the development server, open
`/tests/fixtures/language-work-scenarios.html` and choose a language skill.
