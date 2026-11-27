import fs from 'node:fs';
import { HtmlBasePlugin } from '@11ty/eleventy';
import { inlineCss, inlineDemoCss } from './src/_lib/css.js';
import { icon } from './src/_lib/icons.js';
import { jsonld } from './src/_lib/jsonld.js';
import { compose } from './src/_lib/compose.js';
import { junk, junkSky } from './src/_lib/junk.js';
import chips from './src/_data/chips.js';
import { writeOgImages, ogSlug } from './src/_lib/og.js';
import { checkMotionGuard } from './src/_lib/motion-guard.js';
import { checkNameGuard } from './src/_lib/name-guard.js';
import { transformSync } from 'esbuild';

// Served JavaScript is minified and loses its comments (2026-11-27): visitors get compact code, the source keeps its
// explanations. Top-level names of these classic scripts are kept (esbuild's transform doesn't rename them).
const minifyJs = (code) => transformSync(code, { loader: 'js', minify: true, legalComments: 'none' }).code;

const FONTS = {
  'node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2': 'assets/fonts/chakra-petch-latin-600-normal.woff2',
  'node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-ext-600-normal.woff2': 'assets/fonts/chakra-petch-latin-ext-600-normal.woff2',
  'node_modules/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff2': 'assets/fonts/atkinson-hyperlegible-next-latin-400-normal.woff2',
  'node_modules/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-ext-400-normal.woff2': 'assets/fonts/atkinson-hyperlegible-next-latin-ext-400-normal.woff2',
  'node_modules/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-700-normal.woff2': 'assets/fonts/atkinson-hyperlegible-next-latin-700-normal.woff2',
  'node_modules/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-ext-700-normal.woff2': 'assets/fonts/atkinson-hyperlegible-next-latin-ext-700-normal.woff2',
  'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2': 'assets/fonts/jetbrains-mono-latin-500-normal.woff2',
  'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-ext-500-normal.woff2': 'assets/fonts/jetbrains-mono-latin-ext-500-normal.woff2',
  // The bakery demos' heading face (demo pages only)
  'node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff2': 'assets/fonts/fraunces-latin-600-normal.woff2',
  'node_modules/@fontsource/fraunces/files/fraunces-latin-ext-600-normal.woff2': 'assets/fonts/fraunces-latin-ext-600-normal.woff2',
};

export default function (cfg) {
  cfg.addPlugin(HtmlBasePlugin);
  cfg.addPassthroughCopy(FONTS);
  cfg.addPassthroughCopy({ 'src/assets/fonts/LICENSE.txt': 'assets/fonts/LICENSE.txt' });
  cfg.addPassthroughCopy({ 'src/assets/js': 'assets/js', 'src/assets/img': 'assets/img' });
  // The custom domain belongs to the live site only, never to staging.
  if (process.env.STAGING !== '1') cfg.addPassthroughCopy({ 'src/CNAME': 'CNAME' });
  cfg.addWatchTarget('src/assets/css/');
  cfg.addWatchTarget('design/tokens.json');

  // Email links open in a new tab (2026-11-24): a browser that hands email to a web mailbox opens it there, and the
  // visitor keeps the page they were on. One step for every mailto link, so links added later are covered too.
  cfg.addTransform('mailto-new-tab', function (content) {
    if (!(this.page.outputPath || '').endsWith('.html')) return content;
    return content.replace(/<a\b([^>]*\bhref="mailto:[^"]*"[^>]*)>/g, (m, attrs) =>
      /\btarget=/.test(attrs) ? m : '<a' + attrs + ' target="_blank" rel="noopener">');
  });

  const prefix = process.env.PATH_PREFIX || '/';
  cfg.addShortcode('inlineCss', (parts) => inlineCss(prefix, parts));
  cfg.addShortcode('inlineDemoCss', (parts) => inlineDemoCss(prefix, parts));
  // A shop time "07:00" → "7am", "16:30" → "4:30pm" (the bakery demos)
  cfg.addFilter('hm', (t) => {
    const [h, m] = String(t).split(':').map(Number);
    return (h % 12 || 12) + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm');
  });
  cfg.addFilter('money', (n, dec = 2) => Number(n).toLocaleString('en-IE', { minimumFractionDigits: dec, maximumFractionDigits: dec }));
  // A file's text, for a script a page must run before its first paint (the roster demo draws its week with it)
  cfg.addShortcode('inlineFile', (p) => minifyJs(fs.readFileSync(p, 'utf8')).replace(/<\/script/gi, '<\\/script'));
  cfg.addFilter('f2', (n) => Number(n).toFixed(2));
  // Page data as JSON for a script tag (a demo page's script reads its fictional data from it)
  cfg.addFilter('json', (v) => JSON.stringify(v).replace(/</g, '\\u003c'));
  cfg.addShortcode('icon', icon);
  cfg.addShortcode('junk', junk);
  cfg.addShortcode('junkSky', junkSky);
  cfg.addWatchTarget('src/_lib/');
  cfg.addFilter('jsonld', jsonld);
  // The first frame of the composed email for a page's pre-ticked chip.
  cfg.addFilter('composeMail', (label, email) => {
    const m = compose(chips.filter((c) => c.label === label));
    return { ...m, href: 'mailto:' + email + '?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body) };
  });
  // Absolute URL on the site's own address (keeps the staging path prefix).
  cfg.addFilter('absUrl', (path, base) => new URL(String(path).replace(/^\//, ''), base).href);

  // Build check: motion follows the one shared flag (src/_lib/motion-guard.js, design README rule 9)
  cfg.on('eleventy.before', () => checkMotionGuard());
  // Build check: no function shares a name with another declaration in its scope (src/_lib/name-guard.js)
  cfg.on('eleventy.before', () => checkNameGuard());

  // Open Graph images: one per page, rendered after the build from each page's og:title (src/_lib/og.js)
  cfg.addFilter('ogSlug', ogSlug);
  cfg.on('eleventy.after', async ({ dir, results }) => {
    // Minify the copied scripts in place (a build writes them; the dev server serves the source as it is)
    const jsDir = `${dir.output}/assets/js`;
    if (fs.existsSync(jsDir)) for (const f of fs.readdirSync(jsDir).filter((n) => n.endsWith('.js'))) {
      const p = `${jsDir}/${f}`;
      fs.writeFileSync(p, minifyJs(fs.readFileSync(p, 'utf8')));
    }
    // Build check: every email link opens in a new tab (the transform above); fails the build naming the page
    const bad = results.filter((r) => r.outputPath && r.outputPath.endsWith('.html'))
      .flatMap((r) => (r.content.match(/<a\b[^>]*href="mailto:[^>]*>/g) || []).filter((a) => !/target="_blank"/.test(a) || !/rel="noopener"/.test(a)).map((a) => r.outputPath + ': ' + a.slice(0, 80)));
    if (bad.length) throw new Error('Email links that would open in the same tab:\n' + bad.join('\n'));
    const unesc = (t) => t.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const pages = results.filter((r) => r.outputPath && r.outputPath.endsWith('.html')).map((r) => {
      const m = r.content.match(/<meta property="og:title" content="([^"]*)"/);
      const url = r.url || '/';
      const eyebrow = url === '/' ? 'Athlone · Midlands · Ireland-wide' : url.startsWith('/services/') ? 'Service · Athlone, Ireland' : 'CuSS · Athlone, Ireland';
      return m && { slug: ogSlug(url), title: unesc(m[1]), eyebrow };
    }).filter(Boolean);
    await writeOgImages(dir.output, pages);
  });
}

export const config = {
  dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
  pathPrefix: process.env.PATH_PREFIX || '/',
  templateFormats: ['njk', 'md', '11ty.js'],
  htmlTemplateEngine: 'njk',
  markdownTemplateEngine: 'njk',
};
