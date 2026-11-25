// Walking a junk strip (README section 2, 2026-11-19): he never moves while the page moves. For each strip on the
// page: bring it into view, wait until he is walking (or reaching), then scroll in small steps for ~0.8 s. While the
// page moves his place on the page must not change (more than 1 px) and his reaching arm must be in at once; once
// scrolling stops he carries on and the strip ends up fixed. A strip where he lands within reach (no walk) is listed,
// not judged.
// node scripts/dev/watch-crew.mjs http://localhost:8091/ 0 1280 "" probe-walk.js   (also at 500)
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const st = () => document.querySelector('[data-guide]').crewState();
  const g = document.querySelector('.g-crew'), a2 = document.querySelector('.g-arm2');
  const docX = () => g.getBoundingClientRect().left + scrollX;
  const out = []; let breaks = 0, tested = 0;
  await sleep(3000);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced motion: no walks to test (every strip starts fixed and he never walks)';
  for (const j of document.querySelectorAll('[data-junk]')) {
    if (j.classList.contains('fixed')) continue;
    scrollTo(0, j.getBoundingClientRect().top + scrollY - innerHeight * 0.55);
    // wait for a walk or a reach to start on this strip
    const t0 = performance.now(); let busy = false;
    while (performance.now() - t0 < 8000) {
      const s = st();
      if (s.walking && String(s.perch).includes('junk-' + j.dataset.junk)) { busy = true; break; }
      if (j.classList.contains('fixed')) break;
      await sleep(30);
    }
    if (!busy) { out.push(j.dataset.crewStop + ': no walk to interrupt (' + (j.classList.contains('fixed') ? 'fixed at once' : 'not fixed') + ')'); continue; }
    tested++;
    await sleep(150 + Math.random() * 400);
    const x0 = docX(); let moved = 0, armOut = 0, caught = false;
    for (let i = 0; i < 16; i++) {
      scrollBy(0, 3);
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const s = st();
      if (s.mode !== 'perch') { caught = true; break; }        // the header caught him: a different story, fine
      moved = Math.max(moved, Math.abs(docX() - x0));
      if (i > 0 && a2.classList.contains('on')) armOut++;
      await sleep(20);
    }
    // after the stop and the delay he carries on; the strip must end up fixed
    const t1 = performance.now(); let fixed = false;
    while (performance.now() - t1 < 12000) { if (j.classList.contains('fixed') && !st().walking) { fixed = true; break; } await sleep(100); }
    let note = '';
    if (!caught && moved > 1) { breaks++; note += '  <- BREAK: moved ' + moved.toFixed(1) + ' px while the page moved'; }
    if (armOut > 0) { breaks++; note += '  <- BREAK: arm out ' + armOut + ' frames while scrolling'; }
    if (!fixed && !caught) { breaks++; note += '  <- BREAK: never finished'; }
    out.push(j.dataset.crewStop + ': interrupted' + (caught ? ' (caught by the header)' : '') + ', moved ' + moved.toFixed(1) + ' px, ' + (fixed ? 'then fixed' : 'NOT fixed') + note);
  }
  out.push('walks interrupted: ' + tested);
  out.push('rule breaks: ' + breaks);
  return out.join('\n');
})()
