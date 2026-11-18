// The Control room's storefront: scroll to it, log every state change of the story over real time (guide mode,
// whether the shop's CREW is in, shutter %, shop classes, his bubble, the caption, the visible buttons),
// then press Confirm and Yes. Run with watch-crew.mjs: node scripts/dev/watch-crew.mjs <url> 0 1280 '' probe-room.js
// Set window.SKIP = true (prefix the expression) to press Skip ahead as soon as it shows.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shop = document.querySelector('[data-shop]'), sc = shop.querySelector('.shop-crew'), sh = shop.querySelector('.shutter');
  const g = document.querySelector('.g-fixed'), mode = () => (g.crewState ? g.crewState().mode : '?');
  const log = [], t0 = performance.now(); let last = '', flashes = 0, lastLeak = '';
  const snap = () => {
    const b = shop.querySelector('.crew-bubble'), m = new DOMMatrix(getComputedStyle(sh).transform);
    const btns = [...shop.querySelectorAll('.acts > *')].filter((x) => !x.hidden).map((x) => x.classList[x.classList.length - 1]);
    const cls = [...shop.classList].filter((c) => !/^(shop|n\d|mini|paused)$/.test(c)).join(',');
    return [mode(), sc.classList.contains('live') && !sc.classList.contains('away') ? 'IN' : 'out', 'shut ' + Math.round(-m.m42 / sh.offsetHeight * 100) + '%',
      cls, b && !b.hidden ? '«' + b.textContent.replace(/^CREW/, '') + '»' : '', 'cap: ' + shop.querySelector('.caption').textContent.slice(0, 34), 'btn: ' + btns.join('/')].join(' | ');
  };
  const watch = async (ms, until) => {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      await sleep(50);
      const leak = getComputedStyle(shop.querySelector('.leak')).backgroundColor;
      if (shop.classList.contains('weld') && leak !== lastLeak && /255, 255|248, 255/.test(leak)) flashes++;
      lastLeak = leak;
      const k = snap(); if (k !== last) { last = k; log.push(((performance.now() - t0) / 1000).toFixed(1) + 's ' + k); }
      if (window.SKIP && !shop.querySelector('[data-act=skip]').hidden && !window.SKIPPED) { window.SKIPPED = 1; shop.querySelector('[data-act=skip]').click(); log.push('— pressed Skip ahead'); }
      if (until && until()) return true;
    }
    return false;
  };
  await sleep(4000);
  for (let i = 0; i < 10; i++) { scrollBy(0, 150); await sleep(120); }   // the header catches him in the hero
  shop.querySelector('.shop-unit').scrollIntoView({ block: 'end' });
  const ok = await watch(70000, () => !shop.querySelector('[data-act=confirm]').hidden);
  if (!ok) { log.push('!! never reached Confirm'); return log.join('\n'); }
  await watch(2500); shop.querySelector('[data-act=confirm]').click(); log.push('— pressed Confirm');
  await watch(12000, () => !shop.querySelector('[data-act=yes]').hidden);
  await sleep(500); shop.querySelector('[data-act=yes]').click(); log.push('— pressed Yes');
  await watch(3000);
  log.push('weld flashes counted: ' + flashes + ' (≤ 6 in 2 s keeps under 3 a second)');
  return log.join('\n');
})()
