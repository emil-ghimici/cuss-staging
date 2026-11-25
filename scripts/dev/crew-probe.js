(async () => {
  const c = document.querySelector('.scene .crew'), s = document.querySelector('.scene'), cv = s.querySelector('canvas');
  const log = []; let last = ''; const t0 = performance.now();
  while (performance.now() - t0 < SECS * 1000) {
    await new Promise((r) => setTimeout(r, 300));
    const cls = c.className.split(' ').filter((x) => x !== 'crew' && x !== 'live').join(' ');
    const k = cls + ' @' + c.style.getPropertyValue('--x') + (s.classList.contains('paused') ? ' PAUSED' : '') +
      ' tube:' + (s.querySelector('[data-tube]').classList.contains('fixed') ? 'fixed' : 'flicker') +
      ' sign:' + s.querySelector('[data-sign]').getAttribute('transform');
    if (k !== last) { log.push(((performance.now() - t0) / 1000).toFixed(1) + 's ' + k); last = k; }
  }
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lit = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 150) lit++;
  log.push('bright pixels on screen: ' + lit);
  return log.join('\n');
})()
