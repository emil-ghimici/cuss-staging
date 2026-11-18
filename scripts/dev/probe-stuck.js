// Never stuck (README section 2): 3 s after scrolling stops the guide is never left hanging or mid-move, and his
// arm is never out while he is off screen. Scenario A: scroll up so his box leaves at the bottom, then scroll a
// little while he rises from below (the case that left him hanging under the screen). Scenario B: short scrolls
// at random moments while he moves. Run at 1280/500/390/360:
// node ~/.claude/skills/animation-checks/scripts/run-probe.mjs <url> scripts/dev/probe-stuck.js --width=390
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('.g-crew'), a1 = document.querySelector('.g-arm1');
  const st = () => document.querySelector('[data-guide]').crewState();
  const out = []; let breaks = 0;
  const until = async (fn, ms) => { const end = performance.now() + ms; while (performance.now() < end) { if (fn()) return true; await new Promise(requestAnimationFrame); } return false; };
  const judge = async (label) => {
    await sleep(3500);
    const s = st(), r = g.getBoundingClientRect(), off = !g.hidden && (r.top >= innerHeight || r.bottom <= 0);
    const bad = s.mode === 'hang' || s.mode === 'move' || (off && a1.classList.contains('on'));
    if (bad) breaks++;
    out.push(label + ': ' + s.mode + ', top ' + Math.round(r.top) + ' of ' + innerHeight + (a1.classList.contains('on') ? ', arm out' : '') + (bad ? '  <- BREAK' : ''));
  };
  const H = () => document.documentElement.scrollHeight - innerHeight;
  await sleep(3000);
  // A: seated mid-page, scroll up a screen; as soon as he starts rising from below, nudge the page
  for (const f of [0.35, 0.55, 0.75]) {
    scrollTo(0, H() * f); await sleep(4000);
    scrollBy(0, -innerHeight * 0.9);
    const caught = await until(() => { const r = g.getBoundingClientRect(); return st().mode === 'move' && a1.classList.contains('on') && r.top >= innerHeight - 8; }, 3000);
    if (caught) scrollBy(0, 6);
    await judge('A ' + f + (caught ? ' (nudged while rising)' : ' (did not rise from below)'));
  }
  // B: nudges at random moments while he moves
  for (let i = 0; i < 6; i++) {
    scrollTo(0, H() * (0.2 + Math.random() * 0.6)); await sleep(150 + 600 + 50);
    await until(() => st().mode === 'move', 2000);
    await sleep(Math.random() * 500);
    scrollBy(0, (Math.random() < 0.5 ? -1 : 1) * innerHeight * 0.3);
    await judge('B ' + i);
  }
  out.push('rule breaks: ' + breaks);
  return out.join('\n');
})()
