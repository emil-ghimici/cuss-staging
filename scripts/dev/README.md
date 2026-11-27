# Dev checks (not part of the site)

The app's browser pane throttles animation frames, so timing has to be checked in a real headless Chrome.
Every script here talks to Chrome over the DevTools protocol (no packages) and turns the HTTP cache off: a reused
headless profile otherwise serves a stale page after a rebuild.

## Serving and Lighthouse

- `node scripts/dev/serve.mjs _site <port>` serves the production build with gzip and Pages-like caching (run after `npx @11ty/eleventy`). Lighthouse runs against it: `npx -y lighthouse@12.6.1 http://localhost:<port>/ --quiet [--preset=desktop] --chrome-flags="--headless=new" --output=json --output-path=<file>`.
- After every Lighthouse run, `node scripts/dev/lh-foreign.mjs <report.json>... [--site _site]` checks that every request is a file of the build (or CREW's status file). Software on the testing computer can add its own files to every page (2026-11-26: NordVPN Threat Protection added a 136 KB render-blocking script and a 44 KB stylesheet under random cuss.ie paths, and "Pause" didn't stop it; only quitting the app did). It prints INVALID and exits 1 when it finds any: those scores don't count. For live speed, PageSpeed Insights (pagespeed.web.dev) runs on Google's servers and is the reference.
- Mobile scores move by a point between runs and machines. Before chasing a lost point, build the last commit side by side (a `git worktree`) and score both the same way. Before scoring, check the baseline's port is free and that it really serves the old build (grep its HTML for something only one version has): a server left on that port silently serves whatever it was started with, and the comparison is void.

## Animation probes

- `node scripts/dev/watch-crew.mjs <url> <seconds> <width> [reduce] [probe.js]` opens the page, optionally with reduced motion, runs a probe in the page and prints what it returns. Width 500 is the narrowest headless window (phone layout below 761).
- Hero: `crew-probe.js` (routine), `probe-arm.js` (reach and bubbles), `probe-drag.js` (carrying him), `probe-tea.js` (tea break, 2026-11-24: open Home with `#crew-tea-soon` for a break after 3 s; checks the announcement, then the mug, then the walk, a climb with no 1-frame jump and the arm on his shoulder and the top bar, the line only once seated; `window.CUT=1` moves the pointer mid-climb: back on the ground in 1.5 s), `probe-jobs.js` (lamp and pipe; open the page with `#crew-fast` so breaks come ten times sooner).
- Guide: `probe-travel.js` (moves only after scrolling stops and the delay; freezes mid-move), `probe-rappel.js` (where he sits), `probe-landing.js` (no jump on landing, the arm stays on him, rolling; run at 500–760 too), `probe-pull.js` (the second arm only ever pulls), `probe-handback.js` (same size, spot and facing on the swap), `probe-arm3.js` (no arm left floating while he's at home), `probe-contact.js` (Contact page: on the CRT, never by the send button), `probe-footing.js` (an FAQ opening above his box: he loses his footing and lands on a box, never floating or sunk; closing it lifts him; run on a service page, Home's FAQ sits next to a sign that keeps him), `probe-stuck.js` (3 s after any stop he is never left hanging or mid-move, nor with his arm out off screen).
- Junk strips: `probe-junk.js` (scrolls Home stopping at each strip: which ones CREW fixed, that a strip's loops run only while it's on screen, and where he came down, landed and stopped: a landing on the strip's old seat point far from where he came down is the old pull to the middle, a fix done from out of arm's reach is a break, and so is a stop that isn't on the other side of the job from where he landed (the zig-zag); run at 1280 and 500, and with `reduce`: every strip starts fixed, and it still scrolls to each one and checks he sits still on a box once his home is off screen; before 2026-11-24 it skipped fixed strips and read the page top). `probe-walk.js` (with `reduce` it says there are no walks to test; interrupts his walk along a strip with small scrolls: he must not move along the page while it moves, his reaching arm comes in at once, and he finishes after the stop; 1280 and 500). `probe-tour.js` (a visitor's scroll, half a screen at a time with 4 s stops: where he sat, how spread out his stops are, how often he walked; compare with the previous build, it prints no breaks). After touching CREW's perches, also rerun `probe-contact.js`: the footer's valve strip must never pull him off the CRT.
- Speech bubbles: `probe-bubbles.js` (every bubble on every page stays 8 px inside the screen, also while it slides in; run at 390 and 360).
- Control room storefront: `probe-room.js` (the whole story beat by beat over real time, then Confirm and Yes; counts the welding flashes; prefix the expression with `window.SKIP = true;` to press Skip ahead), `probe-room-away.js` (scrolling away mid-inspection freezes the story; behind the shutter the header never catches him; back at the shop he squeezes under it; prints the rule breaks). Run at 500 wide too, and on `/services/custom-software/` for the four-screen wall.

- Motion switch: `probe-motion.js` (2026-11-26) reports the motion flag (`html.still`, `still-os`), the stored choice and the hero's "Play animation" line. Run it with `reduce`; open the page with `#act-clear` to forget the choice or `#act-play` to press Play animation (the page reloads; run again to see the result). The runner keeps its browser profile, so choices carry between runs.

## Page checks

- `node scripts/dev/shot.mjs <url> <out.png> [width] [light|dark] [waitMs] [scrollY] [height] [js]` takes a screenshot (`REDUCE=1` for reduced motion).
- `node scripts/dev/contrast.mjs <base-url> <width> <path>...` checks text contrast in both themes (4.5:1, 3:1 for large text). `MIN=21` makes everything fail: a sanity check that the probe still works.
- `node scripts/dev/font-swap.mjs <base-url> <width> <path>...` checks that headings wrap the same with the fallback fonts as with the web fonts (a mismatch shifts the page when the fonts arrive).
- `node scripts/dev/shifts.mjs <url> [width]` logs layout shifts on a phone-sized, CPU-throttled load; `node scripts/dev/longtasks.mjs <url> [width]` profiles the load and lists the heaviest functions.

## Windows / Git Bash

- Prefix with `MSYS_NO_PATHCONV=1` whenever an argument is a path or starts with `/` (URL paths, `PATH_PREFIX=/cuss-staging/` for staging builds), or Git Bash rewrites it into a Windows path.

- Control room sign: `probe-sign.js` (2026-11-24: his first contact is the dead K, then the R, never the sign's end; the drop starts after both, with his hand pulling back; 1280 and 500).
- Work screenshots: `npm run shots` (`scripts/shots.mjs`): builds, opens each bakery demo at Thursday 10:30 Irish time with the CuSS bar and notes hidden, writes AVIF + WebP at 1280 and 640 to `src/assets/img/work/`; needs ffmpeg. Rerun when a demo changes.
