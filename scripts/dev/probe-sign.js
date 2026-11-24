// The Control room's sign (README section 3.4, step 1, changed 2026-11-24): he tries to fix it, then it breaks by itself.
// Scrolls to the shop and watches his hand until the sign has dropped. Rule breaks: his hand's first contact isn't on
// a dead letter (the K); the R isn't tried before the drop; his hand touches the sign's left end (where he used to
// nudge it) before the drop; his hand is still reaching out (not pulling back) once the drop has started.
// node scripts/dev/watch-crew.mjs http://localhost:8091/ 0 1280 "" probe-sign.js   (also at 500)
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shop = document.querySelector('[data-shop]'), sign = shop.querySelector('.sign'), hang = shop.querySelector('.hanger.l');
  const [K, Rr] = sign.querySelectorAll('[data-dead]'), grip = sign.querySelector('.grip');
  const mid = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  const near = (h, el, pad) => { const r = el.getBoundingClientRect(); return h.x > r.left - pad && h.x < r.right + pad && h.y > r.top - pad && h.y < r.bottom + pad; };
  await sleep(2500);
  scrollTo(0, shop.getBoundingClientRect().top + scrollY - 80);
  const log = [], t0 = performance.now(); let breaks = 0, first = null, triedK = false, triedR = false, gripTouched = false, dropAt = null, last = '';
  while (performance.now() - t0 < 40000) {
    await sleep(30);
    const hand = shop.querySelector('.reach-hand');
    const out = hand && hand.classList.contains('on') && hand.classList.contains('out');
    const h = hand && mid(hand);
    const t = ((performance.now() - t0) / 1000).toFixed(2) + 's';
    if (out && !hang.classList.contains('snap')) {
      const on = near(h, K, 6) ? 'K' : near(h, Rr, 6) ? 'R' : near(h, grip, 14) ? 'end' : null;
      if (on && on !== last) { last = on; log.push(t + ' hand on ' + on); }
      if (on && !first) first = on;
      if (on === 'K') triedK = true;
      if (on === 'R') triedR = true;
      if (on === 'end') gripTouched = true;
    }
    if (hang.classList.contains('snap') && dropAt === null) {
      dropAt = performance.now();
      log.push(t + ' the sign drops; hand ' + (out ? 'still reaching out' : 'pulling back'));
      await sleep(60);
      const still = hand && hand.classList.contains('out');
      if (still) { breaks++; log.push('  <- BREAK: hand still out after the drop started'); }
      break;
    }
  }
  if (dropAt === null) { breaks++; log.push('<- BREAK: the sign never dropped'); }
  if (first !== 'K') { breaks++; log.push('<- BREAK: first contact ' + first + ', not the K'); }
  if (!triedR) { breaks++; log.push('<- BREAK: the R was never tried'); }
  if (gripTouched) { breaks++; log.push('<- BREAK: his hand touched the sign\'s end before the drop'); }
  log.push('rule breaks: ' + breaks);
  return log.join('\n');
})()
