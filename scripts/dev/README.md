# Dev checks (not part of the site)

The app's browser pane throttles animation frames, so timing has to be checked in a real headless Chrome.
Every script here talks to Chrome over the DevTools protocol (no packages) and turns the HTTP cache off: a reused
headless profile otherwise serves a stale page after a rebuild.

## Serving and Lighthouse

- `node scripts/dev/serve.mjs _site <port>` serves the production build with gzip and Pages-like caching (run after `npx @11ty/eleventy`). Lighthouse runs against it: `npx -y lighthouse@12.6.1 http://localhost:<port>/ --quiet [--preset=desktop] --chrome-flags="--headless=new" --output=json --output-path=<file>`.
- Mobile scores move by a point between runs and machines. Before chasing a lost point, build the last commit side by side (a `git worktree`) and score both the same way.

## Animation probes

- `node scripts/dev/watch-crew.mjs <url> <seconds> <width> [reduce] [probe.js]` opens the page, optionally with reduced motion, runs a probe in the page and prints what it returns. Width 500 is the narrowest headless window (phone layout below 761).
- Hero: `crew-probe.js` (routine), `probe-arm.js` (reach and bubbles), `probe-drag.js` (carrying him), `probe-tea.js` (tea), `probe-jobs.js` (lamp and pipe; open the page with `#crew-fast` so breaks come ten times sooner).
- Guide: `probe-travel.js` (moves only after scrolling stops and the delay; freezes mid-move), `probe-rappel.js` (where he sits), `probe-landing.js` (no jump on landing, the arm stays on him, rolling; run at 500–760 too), `probe-pull.js` (the second arm only ever pulls), `probe-handback.js` (same size, spot and facing on the swap), `probe-arm3.js` (no arm left floating while he's at home), `probe-contact.js` (Contact page: on the CRT, never by the send button), `probe-footing.js` (an FAQ opening above his box: he loses his footing and lands on a box, never floating or sunk; closing it lifts him; run on a service page, Home's FAQ sits next to a sign that keeps him), `probe-stuck.js` (3 s after any stop he is never left hanging or mid-move, nor with his arm out off screen).
- Speech bubbles: `probe-bubbles.js` (every bubble on every page stays 8 px inside the screen, also while it slides in; run at 390 and 360).
- Control room storefront: `probe-room.js` (the whole story beat by beat over real time, then Confirm and Yes; counts the welding flashes; prefix the expression with `window.SKIP = true;` to press Skip ahead), `probe-room-away.js` (scrolling away mid-inspection freezes the story; behind the shutter the header never catches him; back at the shop he squeezes under it; prints the rule breaks). Run at 500 wide too, and on `/services/custom-software/` for the four-screen wall.

## Page checks

- `node scripts/dev/shot.mjs <url> <out.png> [width] [light|dark] [waitMs] [scrollY] [height] [js]` takes a screenshot (`REDUCE=1` for reduced motion).
- `node scripts/dev/contrast.mjs <base-url> <width> <path>...` checks text contrast in both themes (4.5:1, 3:1 for large text). `MIN=21` makes everything fail: a sanity check that the probe still works.
- `node scripts/dev/font-swap.mjs <base-url> <width> <path>...` checks that headings wrap the same with the fallback fonts as with the web fonts (a mismatch shifts the page when the fonts arrive).
- `node scripts/dev/shifts.mjs <url> [width]` logs layout shifts on a phone-sized, CPU-throttled load; `node scripts/dev/longtasks.mjs <url> [width]` profiles the load and lists the heaviest functions.

## Windows / Git Bash

- Prefix with `MSYS_NO_PATHCONV=1` whenever an argument is a path or starts with `/` (URL paths, `PATH_PREFIX=/cuss-staging/` for staging builds), or Git Bash rewrites it into a Windows path.
