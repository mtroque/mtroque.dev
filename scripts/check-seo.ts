/**
 * pnpm check:seo  (after a build) checks the built pages against the single site URL:
 *  - every indexable page: unique <title>, meta description, canonical = site + path,
 *    og:url = canonical, og:image absolute on the same site and present in dist/
 *  - sitemap lists exactly the indexable pages, all on the site URL
 *  - no other origin appears in canonical/og/sitemap (so switching SITE_URL switches everything)
 */
import { existsSync, readFileSync } from 'node:fs';
import fg from 'fast-glob';
import { resolveSiteUrl } from '../src/config/site-url';

const site = resolveSiteUrl();
const problems: string[] = [];
const meta = (html: string, attr: 'name' | 'property', key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];

const pages = fg.sync('dist/**/index.html').filter((f) => !f.startsWith('dist/specimen/'));
const titles = new Map<string, string>();
const indexable: string[] = [];
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const path = file.replace(/^dist/, '').replace(/index\.html$/, '');
  const expected = new URL(path, site).href;
  if (/<meta name="robots" content="noindex"/.test(html)) continue;
  indexable.push(expected);
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) problems.push(`${path}: no <title>`);
  else if (titles.has(title)) problems.push(`${path}: title duplicates ${titles.get(title)}`);
  else titles.set(title, path);
  if (!meta(html, 'name', 'description')) problems.push(`${path}: no meta description`);
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (canonical !== expected) problems.push(`${path}: canonical ${canonical} != ${expected}`);
  if (meta(html, 'property', 'og:url') !== expected) problems.push(`${path}: og:url != canonical`);
  const og = meta(html, 'property', 'og:image');
  if (!og) problems.push(`${path}: no og:image`);
  else if (!og.startsWith(site + '/')) problems.push(`${path}: og:image ${og} not on ${site}`);
  else if (!existsSync('dist' + new URL(og).pathname)) problems.push(`${path}: og:image file missing: ${new URL(og).pathname}`);
}

const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]!).sort();
const want = [...indexable].sort();
if (JSON.stringify(locs) !== JSON.stringify(want)) problems.push(`sitemap lists ${JSON.stringify(locs)}, expected ${JSON.stringify(want)}`);

for (const p of problems) console.error(p);
if (problems.length) process.exit(1);
console.log(`check:seo: ${indexable.length} indexable pages on ${site}; canonical, og:url, og:image and sitemap all match`);
