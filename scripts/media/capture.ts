/**
 * pnpm media [--rules] [--only clip,harmonies,rules]
 *
 * Captures the Tablekeeper case-study media from the live app at phone size (390x844), using the
 * app's built-in sample photos. Never signs in: a flow that reaches a sign-in page is skipped.
 *
 *   clip       Patchwork photo -> score (Sample Photo 2): corners, review with outlined
 *              low-confidence values, result breakdown. Recorded Playwright video -> ffmpeg
 *              WebM + MP4, plus a 2x poster frame of the review step.
 *   harmonies  Harmonies result with the Water row selected and its hexes highlighted (2x PNG).
 *   rules      Only with --rules (calls the Claude API on the live app): one question the
 *              rulebook answers, one it doesn't. Normal runs keep the saved capture.
 *
 * Outputs: public/media/tablekeeper/*.{webm,mp4}, src/assets/media/tablekeeper/*.png.
 * Review material (raw video, full-page rules capture, answer transcript) goes to media-review/
 * (git-ignored). Look at every file before committing.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type BrowserContextOptions, type Page } from 'playwright';

const APP = 'https://tablekeeper-beryl.vercel.app';
const PUBLIC_DIR = 'public/media/tablekeeper';
const ASSET_DIR = 'src/assets/media/tablekeeper';
const REVIEW_DIR = 'media-review';
const PHONE = { width: 390, height: 844 };
const RULES_GAME = 'azul';
/** One the rulebook answers plainly ("End of the game": 7 points per vertical line), one it doesn't. */
const RULES_QUESTIONS = ['How many points do I get for a complete vertical line at the end of the game?', "What's a good strategy for beginners?"];

const args = process.argv.slice(2);
const withRules = args.includes('--rules');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1]!.split(',') : ['clip', 'harmonies', 'rules'];

/** Set when any page lands on a sign-in URL; the runner then skips that flow. */
let signInHit: string | null = null;
function guardSignIn(page: Page) {
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame() && /sign-?in|login|\/auth|accounts\.google/i.test(f.url())) signInHit = f.url();
  });
}

const context = (browser: Browser, extra: BrowserContextOptions = {}) =>
  browser.newContext({ viewport: PHONE, isMobile: true, hasTouch: true, colorScheme: 'light', locale: 'en-US', ...extra });

/** Sample photo -> corners -> Read Board -> review. Returns when the review screen is up. */
async function toPatchworkReview(page: Page, sample: number, hold = (ms: number) => page.waitForTimeout(ms)) {
  await page.goto(`${APP}/games/patchwork/score`, { waitUntil: 'networkidle' });
  await hold(700);
  await page.getByRole('button', { name: `Try Sample Photo ${sample}` }).click();
  await page.getByRole('button', { name: 'Read Board' }).waitFor({ timeout: 30_000 });
  await page.getByText("Drag the corners onto the board's corners.").waitFor({ timeout: 30_000 });
  await hold(1400);
  await page.getByRole('button', { name: 'Read Board' }).click();
  await page.waitForURL(/\/review$/, { timeout: 30_000 });
  await page.locator('[data-low-confidence="true"]').first().waitFor({ timeout: 15_000 });
}

async function captureClip(browser: Browser) {
  const rawDir = join(REVIEW_DIR, 'raw-video');
  rmSync(rawDir, { recursive: true, force: true });
  const ctx = await context(browser, { recordVideo: { dir: rawDir, size: PHONE } });
  const page = await ctx.newPage();
  guardSignIn(page);
  const t0 = Date.now();
  const marks: Record<string, number> = {};
  const mark = (name: string) => (marks[name] = (Date.now() - t0) / 1000);

  await page.goto(`${APP}/games/patchwork/score`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  mark('start');
  await toPatchworkReview(page, 2);
  mark('review');
  await page.waitForTimeout(2200);
  // Show the outlined chit counts below the board.
  await page.evaluate(() => window.scrollBy({ top: 420, behavior: 'smooth' }));
  await page.waitForTimeout(1800);
  await page.getByText('See Score', { exact: true }).click();
  await page.waitForURL(/\/result$/, { timeout: 30_000 });
  mark('result');
  await page.waitForTimeout(2600);
  mark('end');
  await ctx.close();

  const raw = readdirSync(rawDir).find((f) => f.endsWith('.webm'))!;
  const src = join(rawDir, raw);
  writeFileSync(join(REVIEW_DIR, 'clip-marks.json'), JSON.stringify(marks, null, 2));

  // Trim to the flow (from just before the sample-photo tap) and play it 1.3x so it stays short.
  const start = marks.start! + 0.35;
  const duration = marks.end! - start;
  const filters = `trim=start=${start.toFixed(2)}:duration=${duration.toFixed(2)},setpts=(PTS-STARTPTS)/1.3,fps=15`;
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const ff = (out: string, codec: string[]) =>
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', filters, '-an', ...codec, out]);
  ff(join(PUBLIC_DIR, 'photo-to-score.webm'), ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1']);
  ff(join(PUBLIC_DIR, 'photo-to-score.mp4'), ['-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']);

  // Poster: a sharp 2x capture of the review step (outlined values), same 390x844 frame.
  const pctx = await context(browser, { deviceScaleFactor: 2 });
  const ppage = await pctx.newPage();
  guardSignIn(ppage);
  await toPatchworkReview(ppage, 2);
  await ppage.waitForTimeout(800);
  mkdirSync(ASSET_DIR, { recursive: true });
  await ppage.screenshot({ path: join(ASSET_DIR, 'photo-to-score-poster.png') });
  await pctx.close();
  console.log(`clip: ${duration.toFixed(1)}s raw -> ${(duration / 1.3).toFixed(1)}s at 1.3x`, marks);
}

async function captureHarmonies(browser: Browser) {
  const ctx = await context(browser, { deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  guardSignIn(page);
  await page.goto(`${APP}/games/harmonies/score`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Try Sample Photo 1' }).click();
  await page.getByRole('button', { name: 'Read Board' }).waitFor({ timeout: 30_000 });
  await page.getByText("Drag the corners onto the board's corners.").waitFor({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Read Board' }).click();
  await page.waitForURL(/\/review$/, { timeout: 30_000 });
  await page.waitForTimeout(1200);
  await page.getByText('See Score', { exact: true }).click();
  await page.waitForURL(/\/result$/, { timeout: 30_000 });
  await page.waitForTimeout(1200);
  const row = page.getByRole('button', { name: /^Water/ });
  await row.click();
  await page.waitForTimeout(600);
  if ((await row.getAttribute('aria-pressed')) !== 'true') throw new Error('Water row did not select');
  // Scroll so the tab bar sits right under the sticky header (a clean cut above the board),
  // then check the selected row is fully in view.
  await page.evaluate(() => {
    const header = document.querySelector('header')!.getBoundingClientRect();
    const tabs = [...document.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Score')!.parentElement!.getBoundingClientRect();
    window.scrollBy(0, tabs.top - header.bottom);
  });
  const rowBox = await row.boundingBox();
  if (!rowBox || rowBox.y + rowBox.height > PHONE.height) throw new Error('Water row does not fit under the board');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(ASSET_DIR, 'harmonies-breakdown.png') });
  await ctx.close();
}

/** Wait until the page text stops changing (a streamed answer has finished). */
async function waitForStableText(page: Page, quietMs = 3000, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  let since = Date.now();
  while (Date.now() < deadline) {
    const now = await page.evaluate(() => document.body.innerText);
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (Date.now() - since >= quietMs) return;
    await page.waitForTimeout(400);
  }
  throw new Error('answer did not finish within 2 minutes');
}

async function captureRules(browser: Browser) {
  const ctx = await context(browser, { deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  guardSignIn(page);
  const apiCalls: string[] = [];
  page.on('request', (r) => r.method() !== 'GET' && apiCalls.push(`${r.method()} ${new URL(r.url()).pathname}`));
  await page.goto(`${APP}/games/${RULES_GAME}/rules`, { waitUntil: 'networkidle' });
  const quotaBefore = await page.getByTestId('quota-pill').innerText().catch(() => '?');
  const quota = () => page.getByTestId('quota-pill').innerText().catch(() => '?');
  // Save after every step: an answer that cost an API call must never be lost to a later failure.
  const save = async (step: string) => {
    const transcript = await page.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText);
    writeFileSync(
      join(REVIEW_DIR, 'rules-transcript.txt'),
      `step: ${step}\nquota before: ${quotaBefore}\nquota now: ${await quota()}\nnon-GET requests: ${apiCalls.join(', ')}\n\n${transcript}\n`,
    );
    await page.screenshot({ path: join(REVIEW_DIR, 'rules-full.png'), fullPage: true });
    await page.screenshot({ path: join(REVIEW_DIR, 'rules-viewport.png') });
  };
  try {
    const done = page.locator('[data-testid="answer"], [data-testid="answer-not-covered"], [data-testid="answer-error"]');
    for (const [i, q] of RULES_QUESTIONS.entries()) {
      const box = page.getByRole('textbox', { name: 'Your question' });
      if (!(await box.isVisible()) || /No questions left/.test(await page.evaluate(() => document.body.innerText))) {
        throw new Error(`no questions left today (quota ${await quota()}); stopping before question ${i + 1}`);
      }
      await box.fill(q);
      await page.getByRole('button', { name: 'Ask', exact: true }).click();
      await page.getByText(q).first().waitFor({ timeout: 15_000 });
      // The app shows a static "Reading the rulebook." (data-testid answer-pending) until the
      // answer arrives, so stable text alone isn't enough: wait for the pending marker to go and
      // for this question's answer (or error) to be on the page.
      await page.getByTestId('answer-pending').waitFor({ state: 'detached', timeout: 120_000 });
      await page.waitForFunction((n) => document.querySelectorAll('[data-testid="answer"], [data-testid="answer-not-covered"], [data-testid="answer-error"]').length >= n, i + 1, { timeout: 30_000 });
      await waitForStableText(page);
      await save(`after question ${i + 1}`);
      if ((await page.getByTestId('answer-error').count()) > 0 || (await done.count()) < i + 1) {
        throw new Error(`question ${i + 1} failed in the app ("Couldn't get an answer"); stopping`);
      }
    }
    // The site asset: from the top of the page to just below the last answer (no half-cut input box).
    const bottom = await done.last().evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY);
    await page.screenshot({ path: join(ASSET_DIR, 'rules-answers.png'), fullPage: true, clip: { x: 0, y: 0, width: PHONE.width, height: Math.ceil(bottom + 16) } });
  } finally {
    await save('end').catch(() => {});
    await ctx.close();
  }
  console.log(`rules: quota ${quotaBefore} -> see transcript; requests: ${apiCalls.join(', ')}`);
}

mkdirSync(REVIEW_DIR, { recursive: true });
mkdirSync(ASSET_DIR, { recursive: true });
const browser = await chromium.launch();
const flows: [string, (b: Browser) => Promise<void>][] = [
  ['clip', captureClip],
  ['harmonies', captureHarmonies],
  ...(withRules ? ([['rules', captureRules]] as [string, (b: Browser) => Promise<void>][]) : []),
];
try {
  for (const [name, run] of flows) {
    if (!only.includes(name)) continue;
    signInHit = null;
    try {
      await run(browser);
    } catch (e) {
      if (!signInHit) throw e;
    }
    if (signInHit) console.warn(`skipped ${name}: it reached a sign-in page (${signInHit}); outputs may be incomplete`);
  }
  if (!withRules && only.includes('rules')) console.log('rules: not run (needs --rules); keeping the saved capture');
} finally {
  await browser.close();
}

for (const dir of [PUBLIC_DIR, ASSET_DIR]) {
  for (const f of readdirSync(dir)) console.log(`${join(dir, f)}  ${(statSync(join(dir, f)).size / 1024).toFixed(1)} KB`);
}
