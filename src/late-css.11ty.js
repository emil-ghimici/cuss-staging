// The not-inlined stylesheet (src/assets/css/late.css), minified like the inlined one.
import fs from 'node:fs';
import { minify } from './_lib/css.js';
export default class {
  data() { return { permalink: '/assets/css/late.css', eleventyExcludeFromCollections: true }; }
  render() { return minify(fs.readFileSync('src/assets/css/late.css', 'utf8')); }
}
