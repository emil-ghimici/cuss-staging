// Foreign-files check for Lighthouse reports (2026-11-26).
// Software on the testing computer (VPN "threat protection", ad blockers, antivirus that scans HTTPS) can add its own
// script and stylesheet to every page, under random paths on the site's own domain, and Lighthouse scores them as ours.
// This reads one or more Lighthouse JSON reports and lists every request that is not a file of the built site or a host
// we use on purpose. Any hit marks the report INVALID (exit 1): rerun on a clean machine or use PageSpeed Insights.
//
//   node scripts/dev/lh-foreign.mjs <report.json>... [--site _site] [--allow host,host]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); if (i < 0) return dflt; const v = args[i + 1]; args.splice(i, 2); return v; };
const site = opt('--site', '_site');
// Hosts the pages fetch from on purpose: CREW's status file (src/_data/site.js crewStatusUrl).
const allowHosts = new Set(['stcrewpubyzotliot3d7to.blob.core.windows.net', ...opt('--allow', '').split(',').filter(Boolean)]);
if (!args.length) { console.error('usage: node scripts/dev/lh-foreign.mjs <report.json>... [--site _site] [--allow host,host]'); process.exit(2); }
if (!fs.existsSync(path.join(site, 'index.html'))) { console.error(`No built site at ${site}: run npx @11ty/eleventy first.`); process.exit(2); }

function inSite(u) {
  let p = decodeURIComponent(u.pathname);
  const prefix = (process.env.PATH_PREFIX || '/').replace(/\/$/, '');
  if (prefix && p.startsWith(prefix + '/')) p = p.slice(prefix.length);
  if (p.endsWith('/')) p += 'index.html';
  return fs.existsSync(path.join(site, p));
}

let invalid = 0;
for (const file of args) {
  const r = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pageHost = new URL(r.finalDisplayedUrl || r.requestedUrl).host;
  const items = r.audits['network-requests']?.details?.items || [];
  if (!items.length) { console.log(`${file}: no network requests in the report; can't check`); invalid++; continue; }
  const foreign = items.filter((i) => {
    if (!/^https?:/.test(i.url)) return false;          // data: and blob: URLs come from the page itself
    const u = new URL(i.url);
    if (allowHosts.has(u.host)) return false;
    return u.host !== pageHost || !inSite(u);
  });
  const kb = Math.round(foreign.reduce((s, i) => s + (i.transferSize || 0), 0) / 1024);
  const scores = Object.values(r.categories).map((c) => Math.round(c.score * 100)).join('/');
  if (!foreign.length) { console.log(`${file}: clean (${items.length} requests, all ours) · ${scores}`); continue; }
  invalid++;
  console.log(`${file}: INVALID, files added on this computer (${foreign.length} requests, ${kb} KB) · scores ${scores} don't count`);
  for (const i of foreign.slice(0, 8)) console.log(`  ${i.resourceType} ${i.transferSize} B ${i.url.slice(0, 90)}`);
  if (foreign.length > 8) console.log(`  … and ${foreign.length - 8} more`);
}
process.exit(invalid ? 1 : 0);
