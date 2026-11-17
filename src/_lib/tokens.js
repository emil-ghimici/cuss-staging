// Turns design/tokens.json (the design system's single source of truth) into CSS custom properties.
import fs from 'node:fs';

const fm = JSON.parse(fs.readFileSync('src/_data/fontMetrics.json', 'utf8'));
const px = (v) => parseFloat(v);

// Fluid size between a 360 px and a 1200 px viewport.
function fluid(min, max) {
  if (min === max) return `${min}px`;
  const slope = (max - min) / (1200 - 360);
  const base = min - slope * 360;
  return `clamp(${min}px, ${base.toFixed(2)}px + ${(slope * 100).toFixed(3)}vw, ${max}px)`;
}

export function tokensCss() {
  const t = JSON.parse(fs.readFileSync('design/tokens.json', 'utf8'));
  const dark = [], light = [];
  for (const c of t.color.tokens) {
    const v = typeof c.value === 'string' ? { dark: c.value, light: c.value } : c.value;
    dark.push(`--${c.name}:${v.dark ?? v.light}`);
    light.push(`--${c.name}:${v.light ?? v.dark}`);
  }
  const other = [];
  for (const fam of ['spacing', 'radius', 'border']) for (const s of t[fam]?.tokens ?? []) other.push(`--${s.name}:${s.value}`);

  // Families get a metric-matched fallback face right after the web font.
  const fallbackName = { display: 'Chakra Petch Fallback', sans: 'Atkinson Fallback', mono: 'JetBrains Mono Fallback' };
  for (const [k, v] of Object.entries(t.type.families)) {
    const parts = v.split(',').map((s) => s.trim());
    parts.splice(1, 0, `"${fallbackName[k]}"`);
    other.push(`--font-${k}:${parts.join(',')}`);
  }
  // Type scale: desktop/phone pairs become fluid sizes.
  const styles = {};
  for (const g of t.type.groups) for (const s of g.styles) styles[s.name] = s;
  for (const [name, s] of Object.entries(styles)) {
    if (name.endsWith('-phone')) continue;
    const ph = styles[`${name}-phone`];
    other.push(`--fs-${name}:${ph ? fluid(px(ph.fontSize), px(s.fontSize)) : s.fontSize}`);
    other.push(`--lh-${name}:${s.lineHeight}`);
  }

  const face = (family, file, weight, m, range) =>
    `@font-face{font-family:"${family}";src:url(/assets/fonts/${file}) format("woff2");font-weight:${weight};font-style:normal;font-display:swap;unicode-range:${range}}`;
  const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
  const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
  const both = (family, stem, weight) =>
    face(family, `${stem}-latin-${weight}-normal.woff2`, weight, null, LATIN) +
    face(family, `${stem}-latin-ext-${weight}-normal.woff2`, weight, null, LATIN_EXT);
  const fb = (family, m, weight, locals) =>
    `@font-face{font-family:"${family}";src:${locals.map((l) => `local("${l}")`).join(',')};font-weight:${weight};size-adjust:${m.sizeAdjust};ascent-override:${m.ascent};descent-override:${m.descent};line-gap-override:${m.lineGap}}`;

  const fonts =
    both('Chakra Petch', 'chakra-petch', 600) +
    both('Atkinson Hyperlegible Next', 'atkinson-hyperlegible-next', 400) +
    both('Atkinson Hyperlegible Next', 'atkinson-hyperlegible-next', 700) +
    both('JetBrains Mono', 'jetbrains-mono', 500) +
    fb('Chakra Petch Fallback', fm.display, 600, ['Arial Bold', 'Arial-BoldMT', 'Roboto Bold', 'Liberation Sans Bold']) +
    fb('Atkinson Fallback', fm.sans, 400, ['Arial', 'ArialMT', 'Roboto', 'Liberation Sans']) +
    fb('Atkinson Fallback', fm.sansBold, 700, ['Arial Bold', 'Arial-BoldMT', 'Roboto Bold', 'Liberation Sans Bold']) +
    fb('JetBrains Mono Fallback', fm.mono, 500, ['Courier New', 'CourierNewPSMT', 'Liberation Mono']);

  // Dark is the default; the OS preference picks Daylight; the header switch overrides both.
  return (
    fonts +
    `:root{${other.join(';')};${dark.join(';')};color-scheme:dark}` +
    `@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){${light.join(';')};color-scheme:light}}` +
    `:root[data-theme="light"]{${light.join(';')};color-scheme:light}`
  );
}
