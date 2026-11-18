// Hero jobs (README section 2): street lamp and dripping pipe. Run on /#crew-fast (breaks come ten times sooner).
// Logs what is broken over time, and what CREW is doing. Expect: never more than two broken at once.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sc = document.querySelector('.scene'), lamp = sc.querySelector('[data-lamp]'), tube = sc.querySelector('[data-tube]'),
    sign = sc.querySelector('[data-sign]'), spark = sc.querySelector('[data-spark]'), crew = sc.querySelector('.crew');
  const t0 = performance.now(), log = []; let last = '', maxBroken = 0;
  const broken = () => [
    !tube.classList.contains('fixed') && 'tube', spark.classList.contains('on') && 'junction',
    !/^rotate\(0/.test(sign.getAttribute('transform')) && 'sign',
    (lamp.classList.contains('dark') || lamp.classList.contains('failing')) && 'lamp', sc.classList.contains('leak') && 'pipe'].filter(Boolean);
  for (let i = 0; i < SECS * 4; i++) {
    const b = broken(); maxBroken = Math.max(maxBroken, b.length);
    const k = b.join(',') + ' | crew x=' + Math.round(crew.getBoundingClientRect().left - sc.getBoundingClientRect().left) + (crew.classList.contains('extend') ? ' reaching' : '');
    if (b.join(',') !== last) { log.push(Math.round((performance.now() - t0) / 1000) + 's broken: [' + k + ']'); last = b.join(','); }
    await sleep(250);
  }
  log.push('max broken at once: ' + maxBroken);
  return log.join('\n');
})()
