// CREW's travel timing (README section 2): logs every mode change against the last scroll, in real time.
// Expect: no 'move' while scrolling; a move starts ~150 ms (still) + 600 ms (delay) after the last scroll;
// scrolling mid-move freezes him into 'hang' at once.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('[data-guide]'), crew = document.querySelector('.g-crew');
  const t0 = performance.now(), log = [];
  let lastScroll = -1, last = '', scrollingNow = false;
  addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  const t = () => Math.round(performance.now() - t0);
  (function watch() {
    const s = g.crewState ? g.crewState() : { mode: '?' };
    const r = crew.getBoundingClientRect();
    const key = s.mode + (s.perch ? ' on ' + s.perch.split(' ')[0] : '');
    if (key !== last) {
      const since = lastScroll < 0 ? '-' : Math.round(performance.now() - lastScroll);
      log.push(t() + ' ms  ' + key + '  (' + since + ' ms after last scroll; y=' + Math.round(r.top) + ')' + (scrollingNow ? '  [DURING SCROLL]' : ''));
      last = key;
    }
    requestAnimationFrame(watch);
  })();
  const scrollFor = async (dy, steps, gap) => { scrollingNow = true; for (let i = 0; i < steps; i++) { scrollBy(0, dy); await sleep(gap); } scrollingNow = false; };
  await sleep(7000);
  log.push(t() + ' --- scroll down past the hero');
  await scrollFor(120, 8, 40);
  await sleep(2500);
  log.push(t() + ' --- scroll down more');
  await scrollFor(120, 6, 40);
  await sleep(2500);
  log.push(t() + ' --- scroll, then scroll again 850 ms later (mid-move)');
  await scrollFor(150, 4, 40);
  await sleep(850);
  await scrollFor(60, 3, 40);
  await sleep(3000);
  log.push(t() + ' --- slow continuous scroll for 3 s (must not move)');
  await scrollFor(20, 30, 100);
  await sleep(3000);
  log.push(t() + ' --- scroll up 600 px');
  await scrollFor(-150, 4, 40);
  await sleep(3000);
  log.push(t() + ' --- back to top');
  scrollTo(0, 0);
  await sleep(3500);
  return log.join('\n');
})()
