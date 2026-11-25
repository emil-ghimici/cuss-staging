// The hand-back to the hero (README section 2): the guide CREW and the hero CREW must be the same size, and the
// swap must happen where he already is (no jump, no flip). Logs both rects around the swap.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('.g-crew'), h = document.querySelector('.scene .crew'), log = [];
  const R = (el) => { const r = el.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (el.classList.contains('flip') ? ' flip' : ''); };
  await sleep(7000);
  log.push('hero crew at start: ' + R(h));
  for (let i = 0; i < 6; i++) { scrollBy(0, 150); await sleep(60); }
  await sleep(2500); log.push('guide has him: ' + R(g));
  await sleep(6000);   // the hero's routine would have moved him by now if it kept running
  let last = null;
  const watch = () => { if (!g.hidden) last = R(g); else return; requestAnimationFrame(watch); };
  scrollTo(0, 0); watch();
  await sleep(3500);
  log.push('guide just before the swap: ' + last);
  log.push('hero just after the swap:  ' + R(h) + ' away=' + h.classList.contains('away'));
  await sleep(4000); log.push('hero 4 s later: ' + R(h));
  return log.join('\n');
})()
