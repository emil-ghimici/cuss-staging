// Losing his footing (README section 2): when the box the guide sits on moves under him (an FAQ above it opens or
// closes), he never stays floating above it or sunk into it. Scrolls until he sits on an FAQ box, opens the one above, then
// closes it again, and checks where his tracks are 2.5 s after each. Run on a page with an FAQ, at 1280/500/390/360:
// node ~/.claude/skills/animation-checks/scripts/run-probe.mjs <url> scripts/dev/probe-footing.js --width=390
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = document.querySelector('.g-crew'), st = () => document.querySelector('[data-guide]').crewState();
  const out = []; let breaks = 0;
  const faqs = [...document.querySelectorAll('.faq details')];
  if (faqs.length < 3) return 'no FAQ here';
  // His feet: his bottom less the part of his tracks that hangs into the box's top padding (20% of his height)
  const feet = () => { const r = g.getBoundingClientRect(); return r.bottom - r.height * 0.2; };
  faqs.forEach((d) => { d.open = false; });
  // Scroll down the FAQ a box at a time until he's sitting on one with another FAQ above it
  let k = -1;
  for (let i = 1; i < faqs.length && k < 1; i++) {
    scrollBy(0, faqs[i].getBoundingClientRect().top - 260); await sleep(4500);
    if (st().mode !== 'perch') continue;
    const f = feet(); k = faqs.findIndex((d) => Math.abs(d.getBoundingClientRect().top - f) <= 6);
    if (k >= 1 && faqs[k].previousElementSibling !== faqs[k - 1]) k = -1;   // the FAQ right above it, in the same list
  }
  if (k < 1) return 'never seated on an FAQ box with one above it (' + JSON.stringify(st()) + ')\nrule breaks: 1';
  const box = faqs[k];
  // Bring his box and the one above into view (he rides with it), so the toggle happens where the visitor sees it
  scrollBy(0, box.getBoundingClientRect().top - innerHeight * 0.55); await sleep(2500);
  if (st().mode !== 'perch' || Math.abs(box.getBoundingClientRect().top - feet()) > 4) return 'lost his seat while scrolling it into view (' + JSON.stringify(st()) + ')\nrule breaks: 1';
  const gp = () => Math.round(box.getBoundingClientRect().top - feet());
  for (const open of [true, false]) {
    faqs[k - 1].open = open; await sleep(2500);
    // Seated = his tracks on the top edge of a box under him (whichever box he fell to)
    const r = g.getBoundingClientRect(), f = feet();
    const on = [...document.querySelectorAll('.info, .card, .steps li, .vsteps li, .faq details, .crt, .mon')].find((el) => {
      const b = el.getBoundingClientRect(); return b.width && Math.abs(b.top - f) <= 4 && r.left + r.width / 2 > b.left && r.left + r.width / 2 < b.right;
    });
    const s2 = st(), seated = s2.mode === 'perch' && !!on;
    if (!seated) breaks++;
    out.push((open ? 'opened' : 'closed') + ' the FAQ above box ' + k + ': ' + s2.mode + ', gap to that box ' + gp() + ' px' + (seated ? ', seated on ' + (on === box ? 'it' : 'another box') : '  <- BREAK (floating or sunk)'));
  }
  out.push('rule breaks: ' + breaks);
  return out.join('\n');
})()
