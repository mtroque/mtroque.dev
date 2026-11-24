/**
 * pnpm measure:lighthouse  (after a build) runs Lighthouse on the built pages, mobile and desktop,
 * served locally with brotli. Previews are behind Vercel Authentication, so this is the
 * closest repeatable measurement; production numbers can differ (CDN, HTTP/2).
 */
import { chromium } from 'playwright';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { serveDist } from './lib/serve-dist';

const PORT = 4338;
const server = await serveDist(PORT);
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const rows: string[] = [];
try {
  for (const formFactor of ['mobile', 'desktop'] as const) {
    for (const path of ['/', '/projects/tablekeeper/', '/projects/strop/']) {
      const result = await lighthouse(`http://127.0.0.1:${PORT}${path}`, {
        port: chrome.port, output: 'json', logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        formFactor,
        screenEmulation: formFactor === 'desktop'
          ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
          : { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
        ...(formFactor === 'desktop' ? { throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 } } : {}),
      });
      const lhr = result!.lhr;
      const score = (k: string) => Math.round((lhr.categories[k]?.score ?? 0) * 100);
      const a = lhr.audits;
      const failed = Object.values(lhr.audits).filter((x) => x.score !== null && x.score < 1 && x.scoreDisplayMode === 'binary').map((x) => x.id);
      rows.push(
        `${formFactor.padEnd(7)} ${path.padEnd(23)} perf ${score('performance')}  a11y ${score('accessibility')}  bp ${score('best-practices')}  seo ${score('seo')}` +
          `  | LCP ${a['largest-contentful-paint']!.displayValue}  CLS ${a['cumulative-layout-shift']!.displayValue}  TBT ${a['total-blocking-time']!.displayValue}  bytes ${Math.round((a['total-byte-weight']!.numericValue ?? 0) / 1024)} KB` +
          (failed.length ? `\n        failed: ${failed.join(', ')}` : ''),
      );
    }
  }
} finally {
  await chrome.kill();
  server.close();
}
console.log(rows.join('\n'));
