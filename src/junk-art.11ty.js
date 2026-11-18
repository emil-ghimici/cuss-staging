// The junk strips' drawings (src/_lib/junk.js), one cached file every page's strip slots are filled from (site.js).
import { junkArt } from './_lib/junk.js';
export default class {
  data() { return { permalink: '/assets/junk.json', eleventyExcludeFromCollections: true }; }
  render() { return JSON.stringify(junkArt()); }
}
