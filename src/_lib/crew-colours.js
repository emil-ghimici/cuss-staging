// CREW's colours (2026-11-27). Night is his drawing as designed; his Daylight colours come from the Night ones by ONE
// rule, never picked colour by colour: OKLab lightness L' = A + B·L, hue and chroma kept. So colours that match at night
// match by day, colours that differ still differ, and the dark-to-light order is kept (his look isn't broken by day).
// Used by tokens.js (the --crew-* custom properties) and og.js (the share image, Night colours).
// His visor (#0b0f14) is his screen and stays dark in both themes, like the TV's glass; the eye, the antenna light, the
// green stripe, the satchel and the mug keep their colours too, so they stay in crew.njk as they are.
export const LIFT = { A: 0.42, B: 0.70 };

export const NIGHT = {
  'crew-links': '#14171c',  // track links
  'crew-tread': '#1b1f25',  // track
  'crew-body': '#2f353e',
  'crew-head': '#3a414c',
  'crew-joint': '#4b525d',  // arm joints
  'crew-metal': '#59606b',  // neck, antenna, wheels, hand edge
  'crew-edge': '#6b7480',   // outline
  'crew-arm': '#8a93a0',
  'crew-hand': '#9aa3ae',
};

const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const toSrgb = (v) => { v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, v)) * 255); };
export function oklab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return '#' + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map((v) => toSrgb(v).toString(16).padStart(2, '0')).join('');
}
export function dayOf(hex) { const [L, a, b] = oklab(hex); return fromOklab([LIFT.A + LIFT.B * L, a, b]); }

// [name, night, Daylight] rows for tokens.js. Fails the build if the rule ever merges two colours or breaks their order.
export function crewTokens() {
  const rows = Object.entries(NIGHT).map(([name, night]) => [name, night, dayOf(night)]);
  const byNight = [...rows].sort((p, q) => oklab(p[1])[0] - oklab(q[1])[0]);
  const days = new Set();
  byNight.forEach((r, i) => {
    if (days.has(r[2])) throw new Error(`crew-colours: ${r[0]} merges with another colour by day (${r[2]})`);
    days.add(r[2]);
    if (i && !(oklab(r[2])[0] > oklab(byNight[i - 1][2])[0])) throw new Error(`crew-colours: ${r[0]} breaks the dark-to-light order by day`);
  });
  return rows;
}
