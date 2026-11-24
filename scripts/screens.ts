/**
 * pnpm screens [label] [--pages /,/projects/strop/]
 *
 * Serves dist/ (scripts/lib/serve-dist.ts), then saves full-page screenshots of every built page
 * at phone (390x844) and desktop (1440x900), in light and dark schemes, to
 * screenshots/<label>/. Run `pnpm build` first.
 */
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from './lib/serve-dist';

const args = process.argv.slice(2);
const pagesIdx = args.indexOf('--pages');
const pagesArg = pagesIdx >= 0 ? args[pagesIdx + 1] : undefined;
const positional = args.filter((a, i) => !a.startsWith('--') && !(pagesIdx >= 0 && i === pagesIdx + 1));
const label = positional[0] ?? new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const PORT = 4329;
const BASE = `http://127.0.0.1:${PORT}`;

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;
const SCHEMES = ['light', 'dark'] as const;

function builtPages(dir = 'dist'): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...builtPages(full));
    else if (entry === 'index.html') {
      const rel = relative('dist', dir).split(sep).join('/');
      if (!rel.startsWith('_')) out.push(rel ? `/${rel}/` : '/');
    }
  }
  return out.sort();
}


const pages = pagesArg ? pagesArg.split(',') : builtPages();
const outDir = join('screenshots', label);
mkdirSync(outDir, { recursive: true });

const server = await serveDist(PORT);
try {
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      for (const path of pages) {
        await page.goto(BASE + path, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const slug = path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\//g, '__');
        const file = join(outDir, `${slug}.${vp.name}.${scheme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(file);
      }
      await ctx.close();
    }
  }
  await browser.close();
} finally {
  server.close();
}
