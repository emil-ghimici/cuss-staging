// Landing on a box (README section 2): he sits exactly where he lands (no jump), his arm retracts into his
// shoulder (never left behind), and anything further along he rolls. Run at phone-layout widths too (500–760).
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('.g-crew'), a1 = document.querySelector('.g-arm1'), h1 = document.querySelector('.g-hand1');
  const out = []; let last = null, jumps = 0, detached = 0;
  (function w() {
    const r = g.getBoundingClientRect(), st = document.querySelector('[data-guide]').crewState();
    if (last && !g.hidden && !last.hidden && st.mode !== 'move' && last.mode !== 'move' && Math.abs(r.left - last.x) > 30 && !g.classList.contains('rolling')) { /* a fast pull may cover 30 px a frame */ jumps++; out.push('JUMP ' + Math.round(last.x) + '→' + Math.round(r.left) + ' (' + st.mode + ')'); }
    if (a1.classList.contains('on')) {   // the arm's root must stay at his body (within his width)
      const m = new DOMMatrixReadOnly(getComputedStyle(a1).transform);
      if (m.m41 < r.left - 4 || m.m41 > r.right + 4) detached++;
    }
    if (g.classList.contains('rolling') && !(last && last.rolling)) out.push('rolling from x' + Math.round(r.left));
    last = { x: r.left, hidden: g.hidden, rolling: g.classList.contains('rolling'), mode: st.mode }; requestAnimationFrame(w);
  })();
  await sleep(7000);
  for (const sel of ['.info', '.steps li', '.vsteps li', '.mon', '.faq details', '.card']) {
    const box = [...document.querySelectorAll(sel)].find((el) => !el.closest('[data-hero], [data-crew-home], .panel, .menu'));
    if (!box) continue;
    scrollTo(0, box.getBoundingClientRect().top + scrollY - 300); await sleep(3500);
    out.push('after ' + sel + ': ' + document.querySelector('[data-guide]').crewState().mode);
  }
  out.push('jumps: ' + jumps + ', frames with the arm detached: ' + detached);
  return out.join('\n');
})()
