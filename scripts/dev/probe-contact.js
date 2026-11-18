// Contact page (README section 2, page jobs): CREW sits on the CRT preview, types a little per ticked chip,
// and is never on, over or beside "Open email to send". Logs his state and the distance to that button.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('[data-guide]'), crew = document.querySelector('.g-crew'), send = document.querySelector('[data-send]');
  const log = [];
  const gap = () => { const a = crew.getBoundingClientRect(), b = send.getBoundingClientRect();
    const dx = Math.max(b.left - a.right, a.left - b.right, 0), dy = Math.max(b.top - a.bottom, a.top - b.bottom, 0); return Math.round(Math.hypot(dx, dy)); };
  const st = (k) => { const s = g.crewState(); const r = crew.getBoundingClientRect(); log.push(k + ': ' + s.mode + (s.perch ? ' on ' + s.perch : '') + ' @' + Math.round(r.left) + ',' + Math.round(r.top) + ' | gap to send button ' + gap() + ' px'); };
  await sleep(6000); st('start');
  for (let y of [40, 80, 160, 260, 380, 520, 700]) { scrollTo(0, y); await sleep(1600); st('scrollY ' + scrollY); }
  scrollTo(0, 120); await sleep(1600); st('back to 120');
  document.querySelector('input[value="A website"]').click(); await sleep(300); log.push('ticked a chip: typing=' + crew.classList.contains('typing'));
  scrollTo(0, 0); await sleep(2000); st('top');
  return log.join('\n');
})()
