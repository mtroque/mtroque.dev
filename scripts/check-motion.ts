/**
 * pnpm check:motion  (after `SPECIMEN=1 pnpm build`)
 * Loads the specimen's test clip in a real browser and checks the reduced-motion contract:
 *  - prefers-reduced-motion: reduce   -> stays paused on the poster, button says Play
 *  - no preference                    -> plays once on screen, button says Pause, button pauses it
 */
import { existsSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { serveDist } from './lib/serve-dist';

// Default: the specimen's test clip. `--page /projects/tablekeeper/` checks a real clip.
const PAGE = process.argv.includes('--page') ? process.argv[process.argv.indexOf('--page') + 1]! : '/specimen/';

if (PAGE === '/specimen/' && !existsSync('dist/specimen/index.html')) {
  console.error('dist/specimen/ missing: run `SPECIMEN=1 pnpm build` first');
  process.exit(1);
}

const PORT = 4333;
const state = (page: Page) =>
  page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>('[data-media-video] video')!;
    const b = document.querySelector<HTMLButtonElement>('[data-media-video] button')!;
    return { paused: v.paused, time: v.currentTime, controls: v.controls, button: b.textContent?.trim(), buttonHidden: b.hidden };
  });

const server = await serveDist(PORT);
const browser = await chromium.launch();
const failures: string[] = [];
const expect = (ok: boolean, msg: string) => (ok ? console.log(`ok   ${msg}`) : failures.push(msg));
try {
  for (const motion of ['reduce', 'no-preference'] as const) {
    const ctx = await browser.newContext({ reducedMotion: motion, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}${PAGE}`);
    await page.locator('[data-media-video] video').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const s = await state(page);
    expect(!s.controls && !s.buttonHidden, `${motion}: native controls replaced by the Play/Pause button`);
    if (motion === 'reduce') {
      expect(s.paused && s.time === 0, `${motion}: clip stays paused on the poster (paused=${s.paused}, t=${s.time})`);
      expect(s.button === 'Play', `${motion}: button offers "Play" (got "${s.button}")`);
      await page.locator('[data-media-video] button').click();
      await page.waitForTimeout(500);
      expect(!(await state(page)).paused, `${motion}: Play starts it on request`);
    } else {
      expect(!s.paused && s.time > 0, `${motion}: clip plays when on screen (paused=${s.paused}, t=${s.time.toFixed(2)})`);
      expect(s.button === 'Pause', `${motion}: button offers "Pause" (got "${s.button}")`);
      await page.locator('[data-media-video] button').click();
      await page.waitForTimeout(300);
      expect((await state(page)).paused, `${motion}: Pause stops it`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  process.exit(1);
}
