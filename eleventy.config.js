import { HtmlBasePlugin } from '@11ty/eleventy';
import { inlineCss } from './src/_lib/css.js';
import { icon } from './src/_lib/icons.js';
import { jsonld } from './src/_lib/jsonld.js';
import { compose } from './src/_lib/compose.js';
import chips from './src/_data/chips.js';

const FONTS = {
  'node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2': 'assets/fonts/chakra-petch-latin-600-normal.woff2',
  'node_modules/@fontsource/chakra-petch/files/chakra-petch-latin-ext-600-normal.woff2': 'assets/fonts/chakra-petch-latin-ext-600-normal.woff2',
  'node_modules/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff2': 'assets/fonts/atkinson-hyperlegible-next-latin-400-normal.woff2',
  'node_modules/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-ext-400-normal.woff2': 'assets/fonts/atkinson-hyperlegible-next-latin-ext-400-normal.woff2',
  'node_modules/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-700-normal.woff2': 'assets/fonts/atkinson-hyperlegible-next-latin-700-normal.woff2',
  'node_modules/@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-ext-700-normal.woff2': 'assets/fonts/atkinson-hyperlegible-next-latin-ext-700-normal.woff2',
  'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2': 'assets/fonts/jetbrains-mono-latin-500-normal.woff2',
  'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-ext-500-normal.woff2': 'assets/fonts/jetbrains-mono-latin-ext-500-normal.woff2',
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

  const prefix = process.env.PATH_PREFIX || '/';
  cfg.addShortcode('inlineCss', () => inlineCss(prefix));
  cfg.addShortcode('icon', icon);
  cfg.addFilter('jsonld', jsonld);
  // The first frame of the composed email for a page's pre-ticked chip.
  cfg.addFilter('composeMail', (label, email) => {
    const m = compose(chips.filter((c) => c.label === label));
    return { ...m, href: 'mailto:' + email + '?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body) };
  });
  // Absolute URL on the site's own address (keeps the staging path prefix).
  cfg.addFilter('absUrl', (path, base) => new URL(String(path).replace(/^\//, ''), base).href);
}

export const config = {
  dir: { input: 'src', includes: '_includes', data: '_data', output: '_site' },
  pathPrefix: process.env.PATH_PREFIX || '/',
  templateFormats: ['njk', 'md', '11ty.js'],
  htmlTemplateEngine: 'njk',
  markdownTemplateEngine: 'njk',
};
