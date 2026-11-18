// No floating arm (README section 2): whenever the guide CREW is hidden (the hero or a band has him), none of his
// arms or hands may be visible. Scrolls down and back up a few times and counts frames where one is.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('.g-crew'), parts = document.querySelectorAll('.g-arm, .g-hand');
  let bad = 0, frames = 0;
  (function w() { if (g.hidden) { frames++; if ([...parts].some((p) => p.classList.contains('on'))) bad++; } requestAnimationFrame(w); })();
  await sleep(7000);
  for (let i = 0; i < 3; i++) { scrollTo(0, 700); await sleep(3000); scrollTo(0, 0); await sleep(3500); }
  return 'frames with him at home: ' + frames + ', with an arm or hand still showing: ' + bad;
})()
