(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('.g-crew'), rope = document.querySelector('.g-arm1'), arm = document.querySelector('.g-arm2');
  const hero = document.querySelector('.scene .crew'), log = [];
  const state = () => {
    const r = g.getBoundingClientRect(), mode = g.hidden ? 'hidden' : g.parentNode.classList.contains('g-doc') ? 'perched' : 'moving';
    // what is he sitting on? the box whose top edge is just under his tracks
    let on = '';
    if (mode === 'perched') {
      const el = document.elementsFromPoint(r.left + r.width / 2, r.bottom - 4).find((e) => e.matches && e.matches('.info, .card, .steps li, .faq details, .crt, .mon, [data-crew-stop]'));
      on = el ? (el.getAttribute('data-crew-stop') ? 'sign ' + el.getAttribute('data-crew-stop') : el.className || el.tagName) : '(nothing under him)';
    }
    return mode + ' @' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (rope.classList.contains('on') ? ' arm1' : '') + (arm.classList.contains('on') ? ' arm2' : '') + ' ' + on + ' | hero crew ' + (hero.classList.contains('away') ? 'away' : 'on stage');
  };
  await sleep(8000);
  log.push('start: ' + state());
  for (let i = 0; i < 14; i++) { scrollBy(0, 220); await sleep(900); log.push('down ' + scrollY + ': ' + state()); }
  for (let i = 0; i < 8; i++) { scrollBy(0, -380); await sleep(1100); log.push('up ' + scrollY + ': ' + state()); }
  scrollTo(0, 0); await sleep(2500); log.push('top: ' + state());
  return log.join('\n');
})()
