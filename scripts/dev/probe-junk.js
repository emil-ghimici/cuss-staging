// Junk strips (README "Junk strips"): scroll through the home page stopping at each strip, then report which ones
// CREW fixed, whether each strip's loops ran only while on screen, and where he came down, landed and stopped.
// Since 2026-11-19 he lands straight below where he comes down and walks the junk to the job: a landing far from
// where he came down AND on the strip's old seat point is a pull to the middle (the old behaviour) and counts as a
// rule break; so does a fix done from more than arm's reach (two widths) away, and (the zig-zag) a stop that isn't
// on the other side of the job from where he landed, at least a fifth of the screen from it.
// node scripts/dev/watch-crew.mjs http://localhost:8091/ 0 1280 "" probe-junk.js   (also at 500; and with "reduce")
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const st = () => document.querySelector('[data-guide]').crewState();
  const g = document.querySelector('.g-crew');
  const mid = () => { const r = g.getBoundingClientRect(); return r.left + r.width / 2; };
  // A point of the strip's drawing on screen (viewBox data-vb, "xMidYMid slice")
  const map = (j, attr) => {
    const v = (j.getAttribute(attr) || j.getAttribute('data-seat')).split(' ').map(Number), vb = j.dataset.vb.split(' ').map(Number);
    const r = j.getBoundingClientRect(), s = Math.max(r.width / vb[0], r.height / vb[1]);
    return r.left + r.width / 2 + (v[0] - vb[0] / 2) * s;
  };
  const out = [], ends = []; let breaks = 0;
  await sleep(3000);
  for (const j of document.querySelectorAll('[data-junk]')) {
    let hang = null, land = null, end = null, fix = null;
    for (const f of [0.55, 0.3]) {
      if (j.classList.contains('fixed')) break;
      scrollTo(0, j.getBoundingClientRect().top + scrollY - innerHeight * f);
      const stopAt = performance.now() + 14000;
      while (performance.now() < stopAt) {
        const s = st(), on = s.mode === 'perch' && String(s.perch).includes('junk-' + j.dataset.junk);
        if (s.mode === 'move' && hang === null) hang = mid();
        if (on && land === null) land = mid();
        if (on) end = mid();
        if (on && fix === null && j.classList.contains('fixed')) fix = mid();
        if (j.classList.contains('fixed') && on && !s.walking) break;
        await sleep(50);
      }
    }
    const others = [...document.querySelectorAll('[data-junk].live')].filter((x) => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight; }).length;
    const seat = map(j, 'data-seat'), job = map(j, 'data-job'), reach = g.getBoundingClientRect().width * 2;
    let note = '';
    if (land !== null && hang !== null && Math.abs(land - hang) > 30 && Math.abs(land - seat) <= 6) { breaks++; note += '  <- BREAK: pulled to the middle'; }
    if (fix !== null && Math.abs(fix - job) > reach + 4) { breaks++; note += '  <- BREAK: fixed from out of reach'; }
    if (fix !== null && land !== null && end !== null && Math.abs(land - job) > 4
      && (Math.sign(end - job) === Math.sign(land - job) || Math.abs(end - job) < innerWidth * 0.2)) { breaks++; note += '  <- BREAK: no zig-zag'; }
    if (end !== null) ends.push(Math.round(end));
    const f = (v) => (v === null ? '-' : Math.round(v));
    out.push(j.dataset.crewStop + ': ' + (j.classList.contains('fixed') ? 'fixed' : 'BROKEN') + ', live ' + j.classList.contains('live') + ', live off screen ' + others
      + ', crew ' + st().mode + ' | came down at ' + f(hang) + ', landed ' + f(land) + ', fixed from ' + f(fix) + ', stopped ' + f(end) + ' (job ' + Math.round(job) + ', old seat ' + Math.round(seat) + ')' + note);
  }
  out.push('where he stopped: ' + ends.join(', ') + (ends.length ? ' (spread ' + (Math.max(...ends) - Math.min(...ends)) + ' px)' : ''));
  out.push('rule breaks: ' + breaks);
  return out.join('\n');
})()
