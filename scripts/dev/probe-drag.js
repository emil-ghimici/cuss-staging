(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.querySelector('.scene .crew'), tv = document.querySelector('.tv'), sign = document.querySelector('[data-sign]'), b = document.querySelector('.crew-bubble');
  const log = [];
  await sleep(9000);
  function carry(toX, toY) {
    const r = c.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    const opt = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, bubbles: true });
    c.dispatchEvent(new PointerEvent('pointerdown', opt(x0, y0)));
    for (let i = 1; i <= 10; i++) document.dispatchEvent(new PointerEvent('pointermove', opt(x0 + (toX - x0) * i / 10, y0 + (toY - y0) * i / 10)));
    return b.hidden ? '' : b.textContent;
  }
  const t = tv.getBoundingClientRect();
  // 1) carried up over the middle of the TV and let go
  const said = carry(t.left + t.width / 2, t.top + 40);
  const held = c.classList.contains('held'), lifted = c.getBoundingClientRect().top;
  document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'mouse', bubbles: true }));
  await sleep(700);
  let r = c.getBoundingClientRect();
  log.push('while held: class held=' + held + ', said "' + said + '", top=' + Math.round(lifted));
  log.push('dropped over TV: lands x ' + Math.round(r.left) + '–' + Math.round(r.right) + ' (TV ' + Math.round(t.left) + '–' + Math.round(t.right) + '), bottom ' + Math.round(r.bottom));
  // 2) carried to the loose sign
  sign.setAttribute('transform', 'rotate(-9 75 270)');
  const s = sign.getBoundingClientRect();
  carry(s.left + 30, s.top);
  document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'mouse', bubbles: true }));
  const t0 = performance.now(); let fixed = false, thanks = '';
  while (performance.now() - t0 < 8000) { await sleep(100); if (!b.hidden && !thanks) thanks = b.textContent; if (sign.getAttribute('transform').startsWith('rotate(0')) { fixed = true; break; } }
  log.push('dropped by the sign: fixed=' + fixed + ' after ' + Math.round(performance.now() - t0) + 'ms, said "' + thanks + '"');
  // 3) does his routine carry on afterwards?
  const x1 = c.style.getPropertyValue('--x'); await sleep(14000);
  log.push('routine after: --x ' + x1 + ' → ' + c.style.getPropertyValue('--x') + ', classes ' + c.className);
  return log.join('\n');
})()
