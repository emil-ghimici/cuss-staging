// Motion switch (2026-11-26): reports the motion flag, the stored choice and the hero's "Play animation" line.
// Run with `reduce` to emulate a device that asks for less motion. URL hash #act-play clicks the hero's Play animation,
// #act-clear forgets the stored choice (the page reloads after either; run again to see the result).
(async () => {
  await new Promise((r) => setTimeout(r, 1500));
  const n = document.querySelector('.motion-note'), b = document.querySelector('[data-motion-toggle]');
  const btn = n && n.querySelector('button').getBoundingClientRect();
  const out = {
    cls: document.documentElement.className, stored: localStorage.getItem('cuss-motion'),
    note: n && getComputedStyle(n).display, noteText: n && n.querySelector('p').textContent,
    playBtn: btn && btn.width ? [Math.round(btn.width), Math.round(btn.height)] : null,
    switchPressed: b && b.getAttribute('aria-pressed'), switchTitle: b && b.title,
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
  if (location.hash === '#act-play') document.querySelector('[data-motion-play]').click();   // stores the choice, then reloads
  if (location.hash === '#act-clear') { localStorage.removeItem('cuss-motion'); }
  return JSON.stringify(out);
})()
