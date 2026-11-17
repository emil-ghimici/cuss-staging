# Dev checks (not part of the site)

The app's browser pane throttles animation frames, so timing has to be checked in a real headless Chrome.

- `node scripts/dev/serve.mjs _site 8090` serves the production build with gzip and Pages-like caching (run after `npx @11ty/eleventy`). Lighthouse runs against it: `npx -y lighthouse@12.6.1 http://localhost:8090/ --quiet [--preset=desktop] --chrome-flags="--headless=new" --output=json --output-path=<file>`.
- `node scripts/dev/watch-crew.mjs <url> <seconds> <width> [reduce] [probe.js]` opens the page in headless Chrome (DevTools protocol, no packages), optionally with reduced motion, runs a probe script in the page and prints what it returns. Width 500 is the narrowest headless window (phone layout below 761).
- Probes: `crew-probe.js` (hero CREW's routine), `probe-arm.js` (reach starts at the shoulder; bubbles), `probe-drag.js` (carrying him), `probe-tea.js` (tea in front of the TV), `probe-rappel.js` (scrolling down and up, where he sits), `probe-room.js` (the Control room tour).
- Git Bash on Windows: prefix staging builds with `MSYS_NO_PATHCONV=1` or `PATH_PREFIX=/cuss-staging/` gets mangled.
