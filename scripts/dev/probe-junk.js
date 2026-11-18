// Junk strips (README "Junk strips"): scroll through the home page stopping at each strip, then report which ones
// CREW fixed, whether each strip's loops ran only while on screen, and where he sat. Prints one line per strip.
// node scripts/dev/watch-crew.mjs http://localhost:8090/ 0 1280 "" probe-junk.js   (also at 500; and with "reduce")
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const st = () => document.querySelector('[data-guide]').crewState();
  const out = [];
  await sleep(3000);
  for (const j of document.querySelectorAll('[data-junk]')) {
    for (const f of [0.55, 0.3]) {
      if (j.classList.contains('fixed')) break;
      scrollTo(0, j.getBoundingClientRect().top + scrollY - innerHeight * f);
      await sleep(4500);
    }
    const others = [...document.querySelectorAll('[data-junk].live')].filter((x) => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight; }).length;
    out.push(j.dataset.crewStop + ': ' + (j.classList.contains('fixed') ? 'fixed' : 'BROKEN') + ', live ' + j.classList.contains('live') + ', live off screen ' + others + ', crew ' + st().mode);
  }
  return out.join('\n');
})()
