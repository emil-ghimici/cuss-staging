// Junk strips (design README, "Junk strips", decided 2026-11-19): a crowded cyberpunk scrapyard at every pass
// between sections, drawn at build time as inline SVG. Each strip has a seeded fill (back skyline, cables, piles,
// neon fragments, a kerb) around one hand-drawn piece CREW fixes (guide.js; its fixed look is in late.css).
// The fill stays out of the middle (`keep`), so the fixable piece is clear and stays in view on phones.
// Colours are theme tokens only (classes in junk.css). Decoration: the strip is hidden from screen readers.

const W = 1280;

function rng(name) {
  let h = 2166136261;
  for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return function () {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (r, a, b) => Math.round(a + r() * (b - a));
const pick = (r, a) => a[Math.floor(r() * a.length)];

const WORDS = ['24H', 'FIX', 'VOLT', 'RAM', 'OPEN?', 'NO SIGNAL', '404', 'EXIT', 'AMPS', 'CASH ONLY', 'OK', 'SCRAP', 'LIVE', 'PARTS', 'BAR', 'HI-FI', 'WIRES', 'NO ENTRY'];
const NEON = ['n-a', 'n-c', 'n-s', 'n-h'];

// The scrapyard around a strip's piece. H: strip height (viewBox units); keep: [x0, x1] left clear for the piece.
function fill(r, H, keep, opt = {}) {
  const G = H - 10;
  const clear = (x0, x1) => x1 < keep[0] || x0 > keep[1];
  let back = '', backLines = '', wins = '', cables = '', mid = '', neon = '', rust = '', bits = '', lights = '';
  const tops = [], piles = [];   // piles: [x0, x1, top y] of each stack on the ground, the junk CREW walks over

  // Back skyline in two layers (far and near): blocks, stepped roofs, tanks, masts
  let far = '';
  for (let x = -12; x < W + 12;) {
    const w = ri(r, 30, 80), h = ri(r, H * 0.5, H * 0.96), y = G - h;
    far += r() < 0.3 ? `<path d="M${x} ${G}V${y + 10}l${w >> 1} -10l${w - (w >> 1)} 10V${G}z"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
    if (r() < 0.5) wins += `<rect x="${x + ri(r, 4, w - 10)}" y="${y + ri(r, 8, h * 0.5)}" width="5" height="4"/>`;
    x += w + ri(r, -10, 4);
  }
  for (let x = -12; x < W + 12;) {
    const w = ri(r, 24, 70), h = ri(r, H * 0.3, H * 0.72), t = r(), y = G - h;
    if (t < 0.3) {
      const m = x + (w >> 1);
      backLines += `M${m} ${G}V${y}M${m - 11} ${y + 10}h22M${m - 7} ${y + 24}h14`;
      tops.push([m, y]);
      if (r() < 0.7) lights += `<circle class="${pick(r, ['n-a', 'n-c', 'n-s'])}${r() < 0.5 ? ' j-flk' : ''}" cx="${m}" cy="${y - 3}" r="2.4"/>`;
    } else if (t < 0.55) {
      back += `<path d="M${x} ${G}V${y}h${(w * 0.45) | 0}v${ri(r, 8, 16)}H${x + w}V${G}z"/>`;
      tops.push([x + 4, y]);
    } else if (t < 0.68) {
      back += `<rect x="${x}" y="${y + 6}" width="${w}" height="${h - 6}"/><ellipse cx="${x + w / 2}" cy="${y + 6}" rx="${w / 2}" ry="5"/>`;
    } else {
      back += `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
      tops.push([x + w - 3, y]);
      for (let k = 0; k < 3; k++) if (r() < 0.5) wins += `<rect x="${x + ri(r, 4, w - 10)}" y="${y + ri(r, 6, Math.max(8, h - 20))}" width="5" height="4"/>`;
    }
    x += w + ri(r, -8, 6);
  }

  // Cables slung between the tops, crossing each other, and loose ends hanging off them
  const n = 7 + (r() * 4) | 0;
  for (let k = 0, tries = 0; k < n && tries < 60; tries++) {
    const a = pick(r, tops), b = pick(r, tops);
    if (!a || !b || Math.abs(a[0] - b[0]) < 100 || Math.abs(a[0] - b[0]) > 520) continue;
    const mx = (a[0] + b[0]) >> 1, my = Math.min(G - 16, Math.max(a[1], b[1]) + ri(r, 12, 44));
    cables += `M${a[0]} ${a[1] + 2}Q${mx} ${my} ${b[0]} ${b[1] + 2}`;
    k++;
  }
  for (let k = 0; k < 5; k++) {
    const a = pick(r, tops);
    if (a && clear(a[0] - 10, a[0] + 30)) cables += `M${a[0]} ${a[1] + 4}c${ri(r, -6, 6)} ${ri(r, 10, 20)} ${ri(r, 8, 20)} ${ri(r, 14, 26)} ${ri(r, 10, 26)} ${ri(r, 22, 40)}`;
  }

  // Pipe runs at mid height, with joints
  let pipes = '';
  for (let k = 0; k < 2; k++) {
    const len = ri(r, 140, 300), x = ri(r, 0, W - len), y = ri(r, H * 0.45, H * 0.7);
    if (!clear(x, x + len)) continue;
    pipes += `<path class="j-pp" d="M${x} ${y}h${len}${r() < 0.5 ? `v${G - y}` : ''}"/><path class="j-pp-in" d="M${x} ${y}h${len}"/>`;
    for (let j = x + ri(r, 20, 50); j < x + len - 10; j += ri(r, 50, 90)) pipes += `<rect class="j-m" x="${j}" y="${y - 7}" width="6" height="14"/>`;
  }

  // Piles on the ground: crates, barrels, tyres, dead monitors, vents, heaps; stacked two or three high
  function item(x, base, maxH) {
    const t = r();
    let w, h;
    if (t < 0.3) {
      w = ri(r, 26, 50); h = Math.min(maxH, ri(r, 20, 38));
      mid += `<rect class="j-m" x="${x}" y="${base - h}" width="${w}" height="${h}"/><path class="j-l" d="M${x + 3} ${base - 3}L${x + w - 3} ${base - h + 3}M${x + 3} ${base - h + 3}L${x + w - 3} ${base - 3}"/>`;
    } else if (t < 0.43) {
      w = ri(r, 18, 28); h = Math.min(maxH, ri(r, 26, 40));
      mid += `<rect class="j-d" x="${x}" y="${base - h}" width="${w}" height="${h}" rx="3"/><path class="j-l" d="M${x} ${base - (h * 0.3) | 0}h${w}M${x} ${base - (h * 0.7) | 0}h${w}"/>`;
      if (r() < 0.6) rust += `M${x + 5} ${base - h + 2}v${ri(r, 6, 16)}`;
    } else if (t < 0.53) {
      w = ri(r, 30, 42);
      const k = ri(r, 2, 4);
      for (let i = 0; i < k; i++) mid += `<ellipse class="j-tyre" cx="${x + w / 2}" cy="${base - 5 - i * 9}" rx="${w / 2}" ry="5"/>`;
      h = k * 9 + 2;
    } else if (t < 0.72) {
      w = ri(r, 30, 46); h = Math.min(maxH, ri(r, 24, 34));
      mid += `<rect class="j-m" x="${x}" y="${base - h}" width="${w}" height="${h}" rx="3"/><rect class="j-scr" x="${x + 4}" y="${base - h + 4}" width="${w - 8}" height="${h - 11}" rx="2"/>`;
      if (r() < 0.6) mid += `<path class="j-ph${r() < 0.3 ? ' j-flk' : ''}" d="M${x + 7} ${base - h + 9}h${w - 18}M${x + 7} ${base - h + 14}h${(w - 18) >> 1}"/>`;
    } else if (t < 0.85) {
      w = ri(r, 32, 56); h = Math.min(maxH, ri(r, 18, 32));
      mid += `<rect class="j-m" x="${x}" y="${base - h}" width="${w}" height="${h}"/><path class="j-l" d="M${x + 5} ${base - h + 5}h${w - 10}M${x + 5} ${base - h + 10}h${w - 10}M${x + 5} ${base - h + 15}h${w - 10}"/>`;
    } else {
      w = ri(r, 44, 76); h = Math.min(maxH, ri(r, 14, 26));
      const p = [];
      for (let i = 0; i <= 6; i++) p.push(`${x + (w * i / 6) | 0} ${base - (i === 0 || i === 6 ? 0 : ri(r, h * 0.4, h))}`);
      mid += `<path class="j-hp" d="M${p.join('L')}z"/>`;
    }
    return { w, h };
  }
  for (let x = ri(r, -10, 10); x < W;) {
    if (!clear(x, x + 52)) { x = keep[1] + ri(r, 4, 14); continue; }
    const a = item(x, G, H * 0.42);
    let top = a.h;
    if (r() < 0.6 && a.w > 24) {
      const b = item(x + ri(r, -4, 8), G - top, H * 0.3); top += b.h;
      if (r() < 0.35 && top < H * 0.62) { const c = item(x + ri(r, 0, 10), G - top, H * 0.22); top += c.h; }
    }
    if (r() < 0.2) bits += `<rect x="${x + 2}" y="${G - ri(r, 8, Math.max(9, top - 4))}" width="${Math.max(24, a.w)}" height="7" fill="url(#j-haz-${opt.id})"/>`;
    piles.push([x, x + a.w, G - top]);
    x += a.w + ri(r, -8, 6);
  }

  // Neon fragments on little plates, up in the junk, never on top of each other
  const nn = opt.neon ?? 5, placed = [], words = WORDS.slice();
  for (let k = 0, tries = 0; k < nn && tries < 80; tries++) {
    const word = pick(r, words), w = word.length * 10 + 14, x = ri(r, 8, W - w - 8), y = ri(r, H * 0.08, H * 0.44);
    if (!clear(x - 20, x + w + 20)) continue;
    if (placed.some(([px, py, pw]) => x < px + pw + 16 && x + w + 16 > px && y < py + 30 && y + 30 > py)) continue;
    placed.push([x, y, w]);
    words.splice(words.indexOf(word), 1);
    const c = pick(r, NEON);
    neon += `<path class="j-c" d="M${x + 8} ${y}V${y - ri(r, 6, 14)}M${x + w - 8} ${y}V${y - ri(r, 6, 14)}"/><rect class="j-d" x="${x}" y="${y}" width="${w}" height="22"/><text class="j-n ${c}${r() < 0.4 ? ' j-flk' : ''}" x="${x + w / 2}" y="${y + 16}">${word}</text>`;
    k++;
  }

  // The kerb: a ground edge with joints, the same pavement the inner pages' bands end on
  let joints = '';
  for (let x = ri(r, 10, 60); x < W; x += 72) joints += `M${x} ${G + 2}V${H}`;
  const kerb = opt.kerb === false ? '' : `<rect class="j-kb" x="0" y="${G}" width="${W}" height="${H - G}"/><path class="j-jt" d="${joints}"/><path class="j-gr" d="M0 ${G}H${W}"/>`;

  return {
    back: `<g class="j-bk0">${far}</g><g class="j-bk">${back}</g><path class="j-bkl" d="${backLines}"/><g class="j-win">${wins}</g>${lights}`,
    cables: (cables && `<path class="j-c" d="${cables}"/>`) + pipes,
    mid: `${mid}<path class="j-r" d="${rust}"/>${bits}`,
    neon,
    kerb,
    piles,
    G,
  };
}

// What CREW walks on (2026-11-19): the top of the junk, one height every 8 units across the viewBox (the ground
// where nothing is piled). The piles plus the piece's own solid tops (deck); hanging signs aren't walkable.
// guide.js turns it into his path: the highest point under his tracks, steps eased into slopes he can climb.
function walkLine(piles, deck, G) {
  const out = [];
  for (let x = 0; x <= W; x += 8) {
    let y = G;
    for (const [x0, x1, t] of piles) if (x >= x0 && x <= x1 && t < y) y = t;
    for (const [x0, x1, t] of deck) if (x >= x0 && x <= x1 && t < y) y = t;
    out.push(Math.round(y));
  }
  return out.join(' ');
}

const haz = (id) => `<defs><pattern id="j-haz-${id}" width="24" height="18" patternUnits="userSpaceOnUse" patternTransform="skewX(-40)"><rect width="24" height="18" class="j-hz0"/><rect width="12" height="18" class="j-hz1"/></pattern></defs>`;

// The pieces CREW fixes. j-brk: shown broken, j-fix: shown fixed; the moving parts carry their own class.
// All in viewBox units. seat: the piece's height for choosing a strip (and his path until the drawing arrives).
// deck: the piece's solid tops he can walk over ([x0, x1, y]; none on a hanging sign, nor on the part he fixes).
// job: where his hand goes to fix it. keep: the middle left clear of fill.
const PIECES = {
  spark: { h: 120, seat: [640, 52], deck: [[608, 672, 52]], job: [640, 74], keep: [560, 730], pull: 0.2, draw: () => `
    <rect class="j-m" x="636" y="96" width="8" height="14"/>
    <rect class="j-m" x="608" y="52" width="64" height="44"/>
    <rect class="j-scr" x="612" y="56" width="56" height="36"/>
    <path class="j-wire" d="M620 58v32M628 58c0 12 10 12 10 32M650 58v12h12v20"/>
    <rect class="j-m" x="642" y="76" width="6" height="12"/><rect class="j-m" x="652" y="60" width="6" height="12"/>
    <rect class="j-m j-door" x="608" y="52" width="64" height="44" style="transform-origin:608px 52px"/>
    <path class="j-spk" d="M676 62l9-4-4 7 10-3M674 82l11 2-7 3 9 4"/>
    <path class="j-l" d="M672 74h14"/><circle class="j-m" cx="690" cy="74" r="5"/>
    <circle class="n-c j-brk" cx="690" cy="74" r="3"/><circle class="n-s j-fix" cx="690" cy="74" r="3"/>` },

  workshop: { h: 160, seat: [640, 52], deck: [], job: [645, 129], keep: [480, 800], tape: true, draw: (id) => `
    <path class="j-c" d="M560 0v52M720 0v52"/>
    <rect class="j-plate" x="510" y="52" width="260" height="58"/>
    <text class="j-wt j-neon j-dim" x="640" y="89">WORKSHOP</text>`,
    front: (id) => `<rect x="-20" y="120" width="630" height="18" fill="url(#j-haz-${id})"/><rect x="680" y="120" width="620" height="18" fill="url(#j-haz-${id})"/>
    <rect class="j-flap" x="610" y="120" width="70" height="18" fill="url(#j-haz-${id})" style="transform-origin:610px 120px"/>` },

  dish: { h: 120, seat: [677, 78], deck: [[588, 700, 78], [598, 654, 52]], job: [622, 30], keep: [560, 740], draw: () => `
    <rect class="j-m" x="588" y="78" width="112" height="32"/><path class="j-l" d="M592 106L696 82M592 82L696 106"/>
    <rect class="j-m" x="598" y="52" width="56" height="26"/>
    <circle class="n-c j-brk" cx="612" cy="65" r="3"/><circle class="n-s j-fix" cx="612" cy="65" r="3"/>
    <g class="j-dish" style="transform-origin:626px 52px">
      <path class="j-pole" d="M626 52v-12"/>
      <ellipse class="j-m" cx="622" cy="30" rx="22" ry="8" transform="rotate(-30 622 30)"/>
      <path class="j-l" d="M622 30l14-12"/><circle class="j-m" cx="637" cy="17" r="3"/>
    </g>` },

  fan: { h: 120, seat: [640, 46], deck: [[590, 690, 46]], job: [640, 80], keep: [560, 720], draw: () => `
    <rect class="j-m" x="590" y="46" width="100" height="64"/>
    <circle class="j-d" cx="640" cy="80" r="27"/>
    <g class="j-blades" style="transform-origin:640px 80px">
      <ellipse class="j-bl" cx="640" cy="66" rx="7" ry="13"/><ellipse class="j-bl" cx="640" cy="94" rx="7" ry="13"/>
      <ellipse class="j-bl" cx="626" cy="80" rx="13" ry="7"/><ellipse class="j-bl" cx="654" cy="80" rx="13" ry="7"/>
    </g>
    <circle class="j-m" cx="640" cy="80" r="5"/>
    <path class="j-rod j-brk" d="M606 100L674 60"/>
    <path class="j-air j-fix" d="M582 66h-18M582 80h-26M582 94h-18"/>` },

  crates: { h: 120, seat: [682, 52], deck: [[584, 700, 80], [594, 704, 52]], job: [630, 39], keep: [560, 740], draw: () => `
    <rect class="j-m" x="584" y="80" width="116" height="30"/><path class="j-l" d="M588 106L696 84M588 84L696 106"/>
    <rect class="j-m" x="594" y="52" width="110" height="28"/><path class="j-l" d="M598 76L700 56M598 56L700 76"/>
    <g class="j-lean" style="transform-origin:660px 52px">
      <rect class="j-m" x="600" y="26" width="60" height="26"/><path class="j-l" d="M604 48L656 30M604 30L656 48"/>
    </g>` },

  monitor: { h: 120, seat: [647, 30], deck: [[596, 700, 86], [604, 690, 30]], job: [647, 57], keep: [560, 740], draw: () => `
    <rect class="j-m" x="596" y="86" width="104" height="24"/><path class="j-l" d="M600 106L696 90M600 90L696 106"/>
    <rect class="j-m" x="604" y="30" width="86" height="56" rx="6"/>
    <rect class="j-scr" x="614" y="38" width="66" height="38" rx="4"/>
    <g class="j-fix">
      <rect class="j-tb1" x="616" y="40" width="11" height="26"/><rect class="j-tb2" x="627" y="40" width="11" height="26"/>
      <rect class="j-tb3" x="638" y="40" width="11" height="26"/><rect class="j-tb4" x="649" y="40" width="11" height="26"/>
      <rect class="j-tb5" x="660" y="40" width="18" height="26"/><path class="j-ph" d="M618 71h56"/>
    </g>
    <path class="j-l j-brk" d="M630 40l8 12-6 6 10 14M656 50l-6 10"/>
    <circle class="j-d" cx="650" cy="81" r="2.5"/><circle class="j-d" cx="660" cy="81" r="2.5"/>` },

  cable: { h: 120, seat: [690, 62], deck: [[660, 720, 62]], job: [600, 98], keep: [520, 780], draw: () => {
    let bulbs = '';
    for (let i = 1; i <= 7; i++) {
      const t = i / 8, x = (1 - t) * (1 - t) * 540 + 2 * (1 - t) * t * 650 + t * t * 760, y = (1 - t) * (1 - t) * 28 + 2 * (1 - t) * t * 62 + t * t * 28;
      bulbs += `<circle class="j-bulb" cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="4"/>`;
    }
    return `
    <path class="j-pole" d="M540 110V22M760 110V22"/>
    <path class="j-c" d="M540 28Q650 62 760 28"/>${bulbs}
    <rect class="j-m" x="660" y="62" width="60" height="48"/><rect class="j-scr" x="670" y="80" width="14" height="12"/>
    <g class="j-brk j-sway" style="transform-origin:540px 40px"><path class="j-cab" d="M540 40C548 70 588 80 600 96"/><rect class="j-m" x="595" y="94" width="11" height="10"/></g>
    <g class="j-fix"><path class="j-cab" d="M540 40C560 70 640 92 668 86"/><rect class="j-m" x="664" y="81" width="10" height="10"/></g>`; } },

  open: { h: 160, seat: [700, 52], deck: [], job: [700, 52], keep: [500, 780], draw: () => `
    <path class="j-c" d="M0 22Q320 80 640 30T1280 38M580 37V52"/>
    <path class="j-c j-hookr" d="M700 27V52"/>
    <g class="j-hang" style="transform-origin:580px 52px">
      <rect class="j-plate j-plate-d" x="530" y="52" width="220" height="60"/>
      <text class="j-open" data-neon x="640" y="100">OPEN</text>
    </g>` },

  valve: { h: 120, seat: [690, 71], deck: [[440, 840, 71]], job: [640, 40], keep: [560, 740], draw: () => `
    <path class="j-pipe" d="M440 78H840M640 78V46"/><path class="j-pipe-in" d="M440 78H840M640 78V46"/>
    <rect class="j-m" x="516" y="68" width="8" height="20"/><rect class="j-m" x="596" y="68" width="8" height="20"/>
    <rect class="j-m" x="700" y="68" width="8" height="20"/><rect class="j-m" x="780" y="68" width="8" height="20"/>
    <path class="j-r" d="M704 88v12M520 88v8"/>
    <g class="j-wheel" style="transform-origin:640px 40px">
      <circle class="j-whl" cx="640" cy="40" r="16"/><path class="j-whl" d="M640 24v32M624 40h32"/><circle class="j-m" cx="640" cy="40" r="3"/>
    </g>
    <g class="j-steam"><circle cx="706" cy="60" r="5"/><circle cx="712" cy="47" r="7"/><circle cx="719" cy="32" r="9"/></g>` },
};

// {% junk "spark" %}: one strip's slot, ready to drop between two sections. The page carries only the slot (its size
// is fixed by CSS, so nothing moves when the drawing arrives, and its kerb is drawn by CSS meanwhile); site.js fills
// it from /assets/junk.json (junkArt, below) once the page is idle. The drawings are ~25 kB gzipped together and
// would otherwise delay the first paint; as one cached file they cost each page nothing after the first.
export function junk(id) {
  const p = PIECES[id];
  if (!p) throw new Error(`Unknown junk strip: ${id}`);
  const tall = p.h > 120 ? ' tall' : '';
  return `<div class="junk junk-${id}${tall}" data-junk="${id}" data-crew-stop="${id}" data-seat="${p.seat.join(' ')}" data-job="${p.job.join(' ')}" data-vb="${W} ${p.h}"${p.pull ? ` data-pull="${p.pull}"` : ''} aria-hidden="true"></div>`;
}

// Every strip's drawing, by id: the contents of /assets/junk.json
export function junkArt() {
  const out = {};
  for (const [id, p] of Object.entries(PIECES)) {
    const r = rng(id), f = fill(r, p.h, p.keep, { id });
    out[id] = (`<svg viewBox="0 0 ${W} ${p.h}" preserveAspectRatio="xMidYMid slice" focusable="false" data-walk="${walkLine(f.piles, p.deck, f.G)}">${haz(id)}`
      + f.back + f.cables + f.mid + f.neon + `<g class="j-pc">${p.draw(id)}</g>` + (p.front ? p.front(id) : '') + f.kerb
      + `</svg>`).replace(/\s*\n\s*/g, '');
  }
  return out;
}

// {% junkSky %}: the inner pages' band skyline (viewBox 1280×112): the same scrapyard, no piles or kerb,
// so the band's own vignette stays the thing to look at.
export function junkSky() {
  const r = rng('band-sky'), f = fill(r, 112, [W + 1, W + 2], { id: 'sky', neon: 4, kerb: false });
  return f.back + f.cables + f.neon;
}
