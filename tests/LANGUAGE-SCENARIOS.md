# Anonymous language dialog browser checks

Run `npm run test:work-scenarios-browser` after installing project dependencies.
The runner uses Chromium from `PATH`; set `CHROMIUM_BIN` to an absolute browser
executable path on other machines. `playwright-core` is a development dependency
and does not download a browser. Missing Chromium is a failure, not a skipped test.

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
- 320×568 and 390×844 portrait, 568×320 landscape and 1280×800 desktop.
- All three scenario cards, complete conditions, limitations, assumptions and
  footer; dialect/quality uncertainty and clinical/sworn restrictions.
- Actual rendered line bounds and scroll reachability, not just text presence.
- Real Enter, Tab, Shift+Tab, Control+End and Escape input, including focus
  wrapping, keyboard scrolling, background isolation, focus restoration and
  preservation of existing inert/ARIA/overflow state.
- Escape, close button and backdrop dismissal across repeated openings.
- 200% text size at 320px, with a reachable footer and close control.
- Browser errors, external requests and accidental local/session storage writes.

This is Chromium component coverage, not a signed-in profile integration test,
screen-reader certification or a Safari/Firefox/device compatibility claim.
For visual inspection in the development server, open
`/tests/fixtures/language-work-scenarios.html` and choose a language skill.
