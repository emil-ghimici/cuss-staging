(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('.g-crew'), b = g.querySelector('.g-bubble p'), room = document.querySelector('[data-room]'), log = [];
  const on = () => { if (g.hidden || !g.parentNode.classList.contains('g-doc')) return g.hidden ? 'hidden' : 'moving'; const r = g.getBoundingClientRect(); const m = [...room.querySelectorAll('.mon')].find((m) => { const k = m.getBoundingClientRect(); return r.left + r.width / 2 > k.left && r.left + r.width / 2 < k.right && Math.abs(r.bottom - k.top) < 40; }); return m ? 'on ' + m.dataset.k : 'elsewhere'; };
  let last = ''; const t0 = performance.now();
  const watch = async (ms) => { const end = performance.now() + ms; while (performance.now() < end) { await sleep(150); const k = on() + ' | ' + (g.querySelector('.g-bubble').hidden ? '' : b.textContent); if (k !== last) { last = k; log.push(((performance.now() - t0) / 1000).toFixed(1) + 's ' + k); } } };
  await sleep(6000);
  // scroll so the wall is in the middle; he'll be caught and rappel
  for (let i = 0; i < 8; i++) { scrollBy(0, 160); await sleep(500); }
  room.scrollIntoView({ block: 'center' });
  await watch(16000);
  room.querySelector('.connect').click(); log.push('— pressed Connect them');
  await watch(6000);
  room.querySelector('.confirm').click(); log.push('— pressed Confirm invoice');
  await watch(8000);
  log.push('caption: ' + room.querySelector('.caption').textContent);
  return log.join('\n');
})()
