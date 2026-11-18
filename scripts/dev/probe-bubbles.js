// Every CREW speech bubble stays on screen (8 px clear of the edges): hero, band, 404, guide and the Control room.
// Watches all bubbles while it taps CREW (opens his bubble on touch screens), scrolls, and lets the Control room's
// story run; prints each bubble that crossed an edge, with its text. Run at phone widths:
// node ~/.claude/skills/animation-checks/scripts/run-probe.mjs <url> scripts/dev/probe-bubbles.js --width=390 [--height=844]
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const bad = new Map(); let seen = 0;
  const check = () => document.querySelectorAll('.crew-bubble').forEach((b) => {
    if (b.hidden || !b.classList.contains('on')) return;
    const r = b.getBoundingClientRect(); if (!r.width) return;
    seen++;
    if (r.left < 7.5 || r.right > document.documentElement.clientWidth - 7.5) {
      const k = (b.textContent || '').replace(/^CREW/, '').slice(0, 40);
      bad.set(k, Math.round(r.left) + '…' + Math.round(r.right) + ' of ' + document.documentElement.clientWidth);
    }
  });
  const iv = setInterval(check, 50);
  const tap = (el) => { if (!el) return; const r = el.getBoundingClientRect(); el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, clientX: r.left + 5, clientY: r.top + 5 })); };
  const crews = () => [...document.querySelectorAll('.crew, .g-crew')].filter((c) => c.offsetParent !== null || c.classList.contains('g-crew'));
  await sleep(3500);
  for (const c of crews()) { tap(c); await sleep(900); tap(document.body); await sleep(200); }
  const shop = document.querySelector('[data-shop]');
  if (shop) {
    shop.querySelector('.shop-unit').scrollIntoView({ block: 'end' });
    const end = performance.now() + 60000;
    while (performance.now() < end) {
      await sleep(300);
      const c = shop.querySelector('[data-act=confirm]'); if (c && !c.hidden) { await sleep(1500); c.click(); }
      if (!shop.querySelector('[data-act=yes]').hidden) { await sleep(800); shop.querySelector('[data-act=yes]').click(); await sleep(1500); break; }
    }
  }
  // Down the page: the guide's tips, at a few spots
  for (const f of [0.3, 0.55, 0.8]) {
    scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f); await sleep(2600);
    const g = document.querySelector('.g-crew'); if (g && !g.hidden) { tap(g); await sleep(1200); tap(document.body); }
  }
  clearInterval(iv);
  return 'bubbles seen (samples): ' + seen + '\n' + (bad.size ? 'OFF SCREEN:\n' + [...bad].map(([k, v]) => '  ' + v + '  "' + k + '"').join('\n') : 'off screen: 0');
})()
