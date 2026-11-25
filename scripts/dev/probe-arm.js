(async () => {
  const c = document.querySelector('.scene .crew'), arm = document.querySelector('.reach-arm'), hand = document.querySelector('.reach-hand'), b = document.querySelector('.crew-bubble');
  const log = []; let lastText = ''; let wasOn = false; const t0 = performance.now();
  while (performance.now() - t0 < SECS * 1000) {
    await new Promise((r) => requestAnimationFrame(r));
    const t = ((performance.now() - t0) / 1000).toFixed(1);
    if (!b.hidden && b.textContent !== lastText) { lastText = b.textContent; log.push(t + 's bubble: ' + lastText); }
    if (b.hidden) lastText = '';
    const on = arm.classList.contains('on');
    if (on && !wasOn) {
      // first visible frame of a reach: where are the hand and the arm's base, against his shoulder?
      const cr = c.getBoundingClientRect(), hr = hand.getBoundingClientRect(), ar = arm.getBoundingClientRect();
      const flip = c.classList.contains('flip'); const sx = cr.left + (flip ? 26 : 52) / 78 * cr.width, sy = cr.top + 52 / 104 * cr.height;
      log.push(t + 's reach starts: hand off shoulder by ' + Math.round(Math.hypot(hr.left + hr.width / 2 - sx, hr.top + hr.height / 2 - sy)) + 'px; arm box ' + Math.round(ar.width) + 'x' + Math.round(ar.height));
    }
    wasOn = on;
  }
  return log.join('\n');
})()
