// A visitor's scroll through a page (2026-11-19): half a screen at a time with a 4 s stop, top to bottom. At each
// stop: where CREW is (strip or box), his centre x, and whether he walked. Shows how much he moves around the page
// and how spread out his stops are; compare a build with the one before it. Prints no rule breaks (it describes).
// node scripts/dev/watch-crew.mjs http://localhost:8091/ 0 1280 "" probe-tour.js   (also at 500)
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const st = () => document.querySelector('[data-guide]').crewState();
  const g = document.querySelector('.g-crew');
  const out = [], xs = [], stripXs = []; let walks = 0;
  await sleep(3000);
  const H = () => document.documentElement.scrollHeight - innerHeight;
  for (let y = 0; y <= H() + 1; y += innerHeight * 0.5) {
    scrollTo(0, y);
    let walked = false; const t0 = performance.now();
    while (performance.now() - t0 < 4000) { if (st().walking && g.classList.contains('rolling')) walked = true; await sleep(50); }
    const s = st(), r = g.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), onStrip = /junk-/.test(String(s.perch));
    if (s.mode === 'perch') { xs.push(x); if (onStrip) stripXs.push(x); }
    if (walked) walks++;
    out.push(Math.round(y) + ': ' + s.mode + (s.perch ? ' on ' + String(s.perch).split(' ').slice(0, 2).join(' ') : '') + ', x ' + x + (walked ? ', walked' : ''));
  }
  const spread = (a) => (a.length ? (Math.max(...a) - Math.min(...a)) + ' px (' + Math.min(...a) + '–' + Math.max(...a) + ')' : '-');
  out.push('stops seated: ' + xs.length + ', spread ' + spread(xs) + '; on strips: ' + stripXs.length + ', spread ' + spread(stripXs) + '; walks seen: ' + walks);
  out.push('strips fixed: ' + document.querySelectorAll('[data-junk].fixed').length + ' of ' + document.querySelectorAll('[data-junk]').length);
  return out.join('\n');
})()
