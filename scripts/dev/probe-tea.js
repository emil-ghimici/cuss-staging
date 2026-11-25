// The tea break (README section 2, step 4 "Rest", changed 2026-11-24). Open Home with #crew-tea-soon (tea after 3 s
// instead of 45 s) and keep the pointer off the hero. Logs the break's steps over real time and counts rule breaks:
// the mug before the announcement, or he walks before the mug; a 1-frame jump of more than 12 px while he climbs
// (the old version jumped onto the crate in one frame); the arm not attached (its start off his shoulder, or its end
// off the top bar) while he rises; "Don’t tell the boss." before he's seated; on the crate but not facing the screen.
// With window.CUT = 1 (prefix), the probe moves the pointer over the hero once he starts rising: he must let go and
// be back on the ground within 1.5 s, the arm in, no seat.
// node scripts/dev/watch-crew.mjs "http://localhost:8091/#crew-tea-soon" 0 1280 "" probe-tea.js
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.querySelector('.scene .crew'), crate = document.querySelector('.scene .crate'), hero = c.closest('[data-hero]') || document.body;
  const arm = document.querySelector('.scene .reach-arm'), hand = document.querySelector('.scene .reach-hand'), bub = document.querySelector('.scene .crew-bubble');
  const hdr = document.querySelector('.hdr'), mug = c.querySelector('.mug');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;   // no moves: on the crate at once
  const noCrate = !crate || crate.offsetParent === null || getComputedStyle(crate).display === 'none';   // phones: tea beside the telly
  const log = [], t0 = performance.now(); let breaks = 0, last = '', prevBottom = null, rising = false, saidAt = null, mugAt = null, walkAt = null, seatedAt = null, x0 = null, cutAt = null;
  const T = () => ((performance.now() - t0) / 1000).toFixed(2) + 's';
  const say = () => (bub && !bub.hidden ? bub.textContent.replace(/^CREW/, '') : '');
  while (performance.now() - t0 < 30000) {
    await sleep(30);
    const r = c.getBoundingClientRect(), bottom = r.bottom, txt = say(), mugOn = +getComputedStyle(mug).opacity > 0.5;
    if (x0 === null) x0 = r.left;
    if (/kettle|telly can mind|Union rules/.test(txt) && saidAt === null) { saidAt = performance.now(); x0 = r.left; log.push(T() + ' announces: «' + txt + '»'); }
    if (mugOn && mugAt === null) { mugAt = performance.now(); log.push(T() + ' mug in hand'); if (saidAt === null) { breaks++; log.push('  <- BREAK: mug before the announcement'); } }
    if (Math.abs(r.left - x0) > 3 && walkAt === null && saidAt !== null) { walkAt = performance.now(); log.push(T() + ' walks'); if (mugAt === null) { breaks++; log.push('  <- BREAK: walks before the mug'); } }
    const armOn = arm.classList.contains('on') && hand.classList.contains('out') && !c.classList.contains('sit');   // reaching out, not pulling back
    if (prevBottom !== null && Math.abs(bottom - prevBottom) > 0.5 && saidAt !== null) {
      if (!rising) { rising = true; log.push(T() + ' rises'); if (window.CUT && cutAt === null) { cutAt = performance.now(); hero.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 20, clientY: 200 })); log.push(T() + ' — pointer moved over the hero'); } }
      if (!reduced && Math.abs(bottom - prevBottom) > 12) { breaks++; log.push(T() + '  <- BREAK: jumped ' + Math.round(prevBottom - bottom) + ' px in one frame'); }
      if (!reduced && !armOn && !c.classList.contains('sit') && bottom < prevBottom) { breaks++; log.push(T() + '  <- BREAK: rising with no arm'); }
      if (armOn) {
        const h = hand.getBoundingClientRect(), hb = hdr.getBoundingClientRect().bottom;
        if (Math.abs(h.top + h.height / 2 - hb) > 14) { breaks++; log.push(T() + '  <- BREAK: hand off the top bar (' + Math.round(h.top + h.height / 2) + ' vs ' + Math.round(hb) + ')'); }
        const sx = parseFloat(arm.style.getPropertyValue('--sx')), sy = parseFloat(arm.style.getPropertyValue('--sy')), sc = c.parentElement.getBoundingClientRect();
        const shY = r.top - sc.top + 52 / 104 * r.height;
        if (Math.abs(sy - shY) > 4) { breaks++; log.push(T() + '  <- BREAK: arm off his shoulder by ' + Math.round(sy - shY) + ' px'); }
      }
    }
    prevBottom = bottom;
    if (c.classList.contains('sit') && seatedAt === null) { seatedAt = performance.now(); log.push(T() + ' seated' + (c.classList.contains('flip') ? '' : ' (not yet facing the screen)')); }
    if (/tell the boss/.test(txt) && !/boss/.test(last)) { log.push(T() + ' says «' + txt + '»'); if (noCrate) { if (mugAt === null) { breaks++; log.push('  <- BREAK: said before the mug'); } } else if (seatedAt === null) { breaks++; log.push('  <- BREAK: said before he was seated'); } else if (!c.classList.contains('flip')) { breaks++; log.push('  <- BREAK: not facing the screen'); } }
    last = txt;
    if (cutAt !== null && performance.now() - cutAt > 1500) {
      const ok = !c.classList.contains('sit') && !arm.classList.contains('on') && Math.abs(c.getBoundingClientRect().bottom - crate.getBoundingClientRect().bottom) < 4;
      if (!ok) breaks++;
      log.push(T() + ' after the pointer: ' + (ok ? 'back on the ground, arm in' : '<- BREAK: still up, seated or reaching'));
      break;
    }
    if (seatedAt !== null && performance.now() - seatedAt > 4000) break;
    if (noCrate && /boss/.test(txt)) break;
  }
  if (cutAt === null && seatedAt === null && !noCrate) { breaks++; log.push('<- BREAK: never seated'); }
  if (noCrate) log.push('no crate (phone): he stays standing beside the telly');
  log.push('rule breaks: ' + breaks);
  return log.join('\n');
})()
