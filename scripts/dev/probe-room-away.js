// The Control room's storefront, interrupted: (1) mid-inspection the visitor scrolls on, so the header catches him;
// the story must freeze, then pick up when he's back. (2) Behind the shutter the visitor scrolls down past the shop:
// the header must NOT catch him; after the stop he comes in from the top bar; back at the shop he squeezes under
// the shutter and the work resumes. Prints a timeline and the rule breaks it counted.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shop = document.querySelector('[data-shop]'), sc = shop.querySelector('.shop-crew'), sh = shop.querySelector('.shutter');
  const g = document.querySelector('.g-fixed'), mode = () => g.crewState().mode, cap = () => shop.querySelector('.caption').textContent;
  const log = [], t0 = performance.now(), breaks = []; let last = '';
  const shut = () => Math.round(-new DOMMatrix(getComputedStyle(sh).transform).m42 / sh.offsetHeight * 100);
  const snap = () => [mode(), sc.classList.contains('away') ? 'away' : sc.classList.contains('live') ? 'IN' : '-', 'shut ' + shut() + '%',
    [...shop.classList].filter((c) => /inside|after|grind|weld|frozen|dusty/.test(c)).join(','), cap().slice(0, 30)].join(' | ');
  const watch = async (ms, until) => {
    const end = performance.now() + ms;
    while (performance.now() < end) {
      await sleep(60);
      const k = snap(); if (k !== last) { last = k; log.push(((performance.now() - t0) / 1000).toFixed(1) + 's ' + k); }
      if (until && until()) return true;
    }
    return false;
  };
  const toShop = () => shop.querySelector('.shop-unit').scrollIntoView({ block: 'end' });
  await sleep(4000);
  for (let i = 0; i < 6; i++) { scrollBy(0, 150); await sleep(120); }
  toShop();
  // (1) Mid-inspection: wait for his second screen line, then scroll on down the page
  await watch(40000, () => /formula/.test(shop.querySelector('.crew-bubble')?.textContent || ''));
  log.push('— scrolling on, mid-inspection');
  for (let i = 0; i < 12; i++) { scrollBy(0, 120); await sleep(60); }
  await watch(3000);
  if (mode() === 'shop') breaks.push('header did not catch him outside the shutter');
  const frozenCap = cap(), frozenShut = shut();
  await watch(3000);
  if (cap() !== frozenCap || shut() !== frozenShut) breaks.push('story moved while he was away');
  log.push('— back to the shop'); toShop();
  await watch(40000, () => shop.classList.contains('grind'));
  // (2) Behind the shutter: scroll down past the shop
  log.push('— scrolling down past the shop, behind the shutter');
  for (let i = 0; i < 14; i++) { scrollBy(0, 120); await sleep(60); if (mode() !== 'shop' && shop.getBoundingClientRect().bottom > 64) { breaks.push('caught while behind the shutter (mode ' + mode() + ')'); break; } }
  await watch(3500);
  if (mode() === 'shop') breaks.push('stayed in the shop after it left the screen');
  log.push('— back to the shop'); toShop();
  let squeezeMax = 0, sparksInSqueeze = false;
  await watch(12000, () => {
    if (shop.classList.contains('crew-inside') && !shop.classList.contains('after')) {
      squeezeMax = Math.max(squeezeMax, shut());
      if (shut() > 2 && shop.classList.contains('grind')) sparksInSqueeze = true;
    }
    return shop.classList.contains('after') && shut() > 90;
  });
  log.push('squeeze lifted the shutter to ' + squeezeMax + '% (just enough for him)');
  if (squeezeMax > 60) breaks.push('shutter lifted too far for a squeeze');
  if (sparksInSqueeze) breaks.push('sparks flew while he squeezed in');
  log.push(breaks.length ? 'RULE BREAKS: ' + breaks.join('; ') : 'rule breaks: 0');
  return log.join('\n');
})()
