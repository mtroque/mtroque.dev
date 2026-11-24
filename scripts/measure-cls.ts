/**
 * pnpm measure:cls  (after a build) measures layout shift caused by web fonts arriving late:
 * fonts are delayed 1.5s so the page first renders in the fallback font, then swaps.
 */
import { chromium } from 'playwright';
import { serveDist } from './lib/serve-dist';

const PORT = 4336;
const server = await serveDist(PORT);
const browser = await chromium.launch();
const results: string[] = [];
let worst = 0;
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    for (const path of ['/', '/projects/tablekeeper/', '/projects/strop/']) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.route('**/*.woff2', async (route) => {
        await new Promise((r) => setTimeout(r, 1500));
        await route.continue();
      });
      await page.addInitScript(() => {
        (window as any).__cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      const cls = (await page.evaluate(() => (window as any).__cls)) as number;
      worst = Math.max(worst, cls);
      results.push(`${String(viewport.width).padStart(4)}px  ${path.padEnd(24)} CLS ${cls.toFixed(4)}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(results.join('\n'));
console.log(`worst CLS with fonts delayed 1.5s: ${worst.toFixed(4)} (good is < 0.1)`);
if (process.argv.includes('--max') && worst > Number(process.argv[process.argv.indexOf('--max') + 1])) process.exit(1);
