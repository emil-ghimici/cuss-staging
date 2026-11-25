// Grappling hook, never a pole (README section 2): during every sideways pull, the distance from his leading
// shoulder to the hook must only shrink, and he must never pass the hook. Anything further, he rolls.
// Logs each pull (hook, start/end gap) and each roll (distance), on the home page's Control room tour.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('.g-crew'), arm2 = document.querySelector('.g-arm2'), hand2 = document.querySelector('.g-hand2');
  const log = []; let pull = null, rollFrom = null, pushes = 0;
  const hx = () => new DOMMatrixReadOnly(getComputedStyle(hand2).transform).m41;
  (function watch() {
    const r = g.getBoundingClientRect(), flip = g.classList.contains('flip');
    const lead = r.left + r.width * (flip ? 12 : 66) / 78;
    if (arm2.classList.contains('on')) {
      // Only the reeling counts: the hand has hooked (stopped moving); while the arm shoots out the gap grows by design
      const h = hx(), gap = (flip ? lead - h : h - lead);
      if (!pull) pull = { start: null, last: gap, hand: h };
      const hooked = Math.abs(h - pull.hand) < 0.5; pull.hand = h;
      if (hooked) {
        if (pull.start === null) pull.start = gap;
        else { if (gap > pull.last + 1.5) pushes++; if (gap < -3) pushes++; }      // moving away from the hook, or past it
      }
      pull.last = gap;
    } else if (pull) { log.push('pull: gap to hook ' + Math.round(pull.start === null ? pull.last : pull.start) + ' → ' + Math.round(pull.last) + ' px'); pull = null; }
    if (g.classList.contains('rolling')) { if (rollFrom === null) rollFrom = r.left; }
    else if (rollFrom !== null) { log.push('rolled ' + Math.round(r.left - rollFrom) + ' px'); rollFrom = null; }
    requestAnimationFrame(watch);
  })();
  await sleep(7000);
  const room = document.querySelector('[data-room]');
  scrollTo(0, room.getBoundingClientRect().top + scrollY - 200);
  await sleep(SECS * 1000);
  log.push('pushes (arm used as a pole): ' + pushes);
  return log.join('\n');
})()
