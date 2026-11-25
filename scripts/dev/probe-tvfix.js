// The telly fixed from wherever he is (README section 2): with CREW away on a box and the TV's dial on screen,
// break the picture; within ~2–6 s (after it settles to CuSS) his arm reaches the dial, the dial clicks twice,
// the picture tunes and the arm comes back. Logs the events and where his hand was at the twist.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const t0 = performance.now(), T = () => ((performance.now() - t0) / 1000).toFixed(1) + 's', log = [];
  const grip = document.querySelector('.g-hand2'), dial = document.querySelector('[data-hero] .dial.d1');
  ['tv:needs-fix', 'tv:twist', 'tv:fixed', 'crew:back'].forEach((e) => document.addEventListener(e, () => {
    let extra = '';
    if (e === 'tv:twist') { const g = grip.getBoundingClientRect(), d = dial.getBoundingClientRect(); extra = ' hand→dial centre ' + Math.round(Math.hypot(g.left + g.width / 2 - d.left - d.width / 2, g.top + g.height / 2 - d.top - d.height / 2)) + ' px'; }
    log.push(T() + ' ' + e + extra);
  }));
  let armWas = false;
  (function w() { const on = grip.classList.contains('on'); if (on !== armWas) { log.push(T() + ' second arm ' + (on ? 'out' : 'in')); armWas = on; } requestAnimationFrame(w); })();
  await sleep(9000);                                       // intro done, picture tuned
  const scr = document.querySelector('.tv-screen'), hero = document.querySelector('[data-hero]');
  scrollTo(0, 900); await sleep(3000);                     // the header catches him; he goes down to a box
  // Back up until the dial is just under the header (the TV on screen, his box still below it)
  const dialTop = document.querySelector('[data-hero] .dial.d1').getBoundingClientRect().top + scrollY;
  scrollTo(0, Math.max(0, dialTop - 120)); await sleep(3000);
  const d = document.querySelector('[data-hero] .dial.d1').getBoundingClientRect();
  log.push(T() + ' dial on screen: ' + (d.top > 64 && d.bottom < innerHeight));
  log.push(T() + ' guide: ' + document.querySelector('[data-guide]').crewState().mode);
  const sr = scr.getBoundingClientRect();
  for (let i = 0; i < 12; i++) { scr.dispatchEvent(new PointerEvent('pointermove', { clientX: sr.left + sr.width * (0.2 + 0.6 * Math.random()), clientY: sr.top + sr.height * (0.2 + 0.6 * Math.random()), pointerType: 'mouse', bubbles: true })); await sleep(50); }
  scr.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
  log.push(T() + ' picture broken');
  await sleep(SECS * 1000);
  log.push(T() + ' guide: ' + document.querySelector('[data-guide]').crewState().mode + ', arm out: ' + grip.classList.contains('on'));
  return log.join('\n');
})()
