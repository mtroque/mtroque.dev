/**
 * pnpm check:a11y  (after a build) runs axe-core on every built page at phone and desktop
 * widths, in light and dark schemes. Any violation, whatever its impact, fails.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { serveDist } from './lib/serve-dist';

function pages(dir = 'dist'): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    if (name === 'index.html') {
      const rel = relative('dist', dir).split(sep).join('/');
      return [rel ? `/${rel}/` : '/'];
    }
    return name === '404.html' ? ['/404.html'] : [];
  });
}

const PORT = 4335;
const server = await serveDist(PORT);
const browser = await chromium.launch();
let violations = 0;
let runs = 0;
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    for (const colorScheme of ['light', 'dark'] as const) {
      const ctx = await browser.newContext({ viewport, colorScheme });
      const page = await ctx.newPage();
      for (const path of pages().sort()) {
        await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
        runs++;
        for (const v of result.violations) {
          violations++;
          console.error(`${path} [${viewport.width}px ${colorScheme}] ${v.impact} ${v.id}: ${v.help}`);
          for (const n of v.nodes.slice(0, 3)) console.error(`    ${n.target.join(' ')}`);
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (violations) process.exit(1);
console.log(`check:a11y: ${runs} page runs (phone + desktop, light + dark), 0 axe violations`);
