/**
 * pnpm fonts         download the upstream fonts (pinned commit + SHA-256), subset them to the
 *                    characters the site uses, and write src/assets/fonts/*.woff2. Commit the output.
 * pnpm check:fonts   offline: fail if any character in the site's copy is missing from a subset
 *                    (new copy with a new character → run `pnpm fonts`).
 *
 * Character set: printable Basic Latin, Latin-1 Supplement (accented letters, ·, §), curly quotes,
 * en and em dashes, ellipsis, ✓, plus every character found in src/content and src/**\/*.astro.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import fg from 'fast-glob';
import * as fontkit from 'fontkit';

const GOOGLE_FONTS = 'https://raw.githubusercontent.com/google/fonts';

export const FONTS = [
  {
    file: 'source-serif-4.woff2',
    url: `${GOOGLE_FONTS}/7b203a635ebe80801c80f29633d4fc467cd1214e/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf`,
    sha256: '97b2d4da6e3cb494b5a1e66ae176914d852ccabef49e0c02c0df25f3e39aca0b',
    // Weights the site uses: 400 body, 500 lede, 600 headings, 650 strong.
    // Optical sizes for 12.6px (footnote marks) to 42px (headline).
    axes: { wght: { min: 400, max: 650 }, opsz: { min: 12, max: 48 } } as Record<string, { min: number; max: number }>,
    // Skip OpenType alternates (old-style figures, ligatures, small caps): halves the file.
    noLayoutClosure: true,
  },
  {
    file: 'ibm-plex-mono-400.woff2',
    url: `${GOOGLE_FONTS}/633f3200539c52ee0aba2dfd7f46921417a81877/ofl/ibmplexmono/IBMPlexMono-Regular.ttf`,
    sha256: '6a3412f058c7d8dfd9170c41e85ade48e5156ecb89356110ca57a0a27734af46',
  },
  {
    file: 'ibm-plex-mono-500.woff2',
    url: `${GOOGLE_FONTS}/633f3200539c52ee0aba2dfd7f46921417a81877/ofl/ibmplexmono/IBMPlexMono-Medium.ttf`,
    sha256: 'a9b4c49bb299e05b5f6c481e7fb5e78943d2793249a0c8874ab574a2d1ea6755',
  },
  // Static instances for build-time OG images only (Satori renders variable fonts at their
  // default instance). Not served to browsers.
  {
    file: 'og/source-serif-4-600.woff2',
    url: `${GOOGLE_FONTS}/7b203a635ebe80801c80f29633d4fc467cd1214e/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf`,
    sha256: '97b2d4da6e3cb494b5a1e66ae176914d852ccabef49e0c02c0df25f3e39aca0b',
    axes: { wght: 600, opsz: 60 } as Record<string, number>,
    noLayoutClosure: true,
  },
  {
    file: 'og/source-serif-4-400.woff2',
    url: `${GOOGLE_FONTS}/7b203a635ebe80801c80f29633d4fc467cd1214e/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf`,
    sha256: '97b2d4da6e3cb494b5a1e66ae176914d852ccabef49e0c02c0df25f3e39aca0b',
    axes: { wght: 400, opsz: 32 } as Record<string, number>,
    noLayoutClosure: true,
  },
] as const;

export const OUT_DIR = 'src/assets/fonts';
const CACHE_DIR = 'node_modules/.cache/site-fonts';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i));

/** The fixed base set: Latin plus the punctuation the copy uses. */
export const BASE_CHARS = [
  ...range(0x20, 0x7e), // Basic Latin (printable)
  ...range(0xa0, 0xff), // Latin-1 Supplement: accented letters, ·, §, ©, ×
  ...'‘’“”–—…✓',
].join('');

/** Every non-whitespace character in the site's copy and templates. */
export function siteChars(): Set<string> {
  const text = fg
    .sync(['src/content/**/*.{yaml,yml,md,mdx}', 'src/**/*.astro'])
    .map((f) => readFileSync(f, 'utf8'))
    .join('');
  return new Set([...text].filter((c) => !/\s/.test(c)));
}

export function missingFrom(fontBuffer: Buffer, chars: Iterable<string>): string[] {
  const font = fontkit.create(fontBuffer) as unknown as { characterSet: number[] };
  const have = new Set(font.characterSet);
  return [...chars].filter((c) => !have.has(c.codePointAt(0)!));
}

async function source(url: string, sha256: string): Promise<Buffer> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cached = `${CACHE_DIR}/${sha256}.ttf`;
  let buf: Buffer;
  if (existsSync(cached)) buf = readFileSync(cached);
  else {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed (${res.status}): ${url}`);
    buf = Buffer.from(await res.arrayBuffer());
  }
  const actual = createHash('sha256').update(buf).digest('hex');
  if (actual !== sha256) throw new Error(`SHA-256 mismatch for ${url}\n  expected ${sha256}\n  got      ${actual}`);
  writeFileSync(cached, buf);
  return buf;
}

async function build() {
  const { default: subsetFont } = await import('subset-font');
  const text = [...new Set([...BASE_CHARS, ...siteChars()])].join('');
  mkdirSync(`${OUT_DIR}/og`, { recursive: true });
  let total = 0;
  for (const f of FONTS) {
    const src = await source(f.url, f.sha256);
    const out = await subsetFont(src, text, {
      targetFormat: 'woff2',
      ...('axes' in f ? { variationAxes: f.axes } : {}),
      ...('noLayoutClosure' in f ? { noLayoutClosure: f.noLayoutClosure } : {}),
    });
    const missing = missingFrom(out, siteChars());
    if (missing.length) throw new Error(`${f.file}: upstream font lacks ${missing.join(' ')}`);
    writeFileSync(`${OUT_DIR}/${f.file}`, out);
    if (!f.file.startsWith('og/')) total += out.length;
    console.log(`${f.file}: ${(out.length / 1024).toFixed(1)} KB`);
  }
  console.log(`served total: ${(total / 1024).toFixed(1)} KB for ${text.length} characters (og/ files are build-only)`);
}

function check() {
  const chars = siteChars();
  let failed = false;
  for (const f of FONTS) {
    const path = `${OUT_DIR}/${f.file}`;
    if (!existsSync(path)) {
      console.error(`${path} missing: run pnpm fonts`);
      failed = true;
      continue;
    }
    const missing = missingFrom(readFileSync(path), chars);
    if (missing.length) {
      console.error(`${f.file} lacks ${missing.map((c) => `${c} (U+${c.codePointAt(0)!.toString(16).toUpperCase()})`).join(', ')}: run pnpm fonts`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log(`check:fonts: ${FONTS.length} fonts cover all ${chars.size} characters used`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--check')) check();
  else await build();
}
