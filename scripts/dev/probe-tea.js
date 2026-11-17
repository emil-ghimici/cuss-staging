(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.querySelector('.scene .crew'), crate = document.querySelector('.scene .crate'), tv = document.querySelector('.tv'), cv = document.querySelector('.tv-screen canvas'), s = document.querySelector('.scene');
  const t0 = performance.now(); while (!c.classList.contains('tea') && performance.now() - t0 < 70000) await sleep(250);
  await sleep(1500);
  const cr = c.getBoundingClientRect(), kr = crate.getBoundingClientRect(), tr = tv.getBoundingClientRect();
  const z = getComputedStyle(c).zIndex + ' over TV ' + getComputedStyle(tv).zIndex;
  const snap = () => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 0; for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0; return h; };
  const a = snap(); await sleep(800); const b = snap();
  return [
    'tea after ' + Math.round((performance.now() - t0) / 1000) + 's, classes: ' + c.className,
    'crew centre ' + Math.round(cr.left + cr.width / 2) + ' / crate centre ' + Math.round(kr.left + kr.width / 2) + '; crew bottom ' + Math.round(cr.bottom) + ', crate top ' + Math.round(kr.top),
    'inside TV span ' + Math.round(tr.left) + '–' + Math.round(tr.right) + '; layers: ' + z,
    'TV still playing during tea: ' + (a !== b) + ', scene paused: ' + s.classList.contains('paused')
  ].join('\n');
})()
