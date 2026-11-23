/**
 * pnpm check:contrast  WCAG contrast for every text/background pair in src/styles/tokens.css,
 * in both the light and dark schemes. Fails below AA.
 */
import { readFileSync } from 'node:fs';

/** Text tokens x surfaces they appear on, with the AA minimum. */
export const PAIRS: { fg: string; bg: string; min: number; use: string }[] = [
  { fg: 'ink', bg: 'paper', min: 4.5, use: 'body text' },
  { fg: 'ink-muted', bg: 'paper', min: 4.5, use: 'metadata, notes' },
  { fg: 'accent', bg: 'paper', min: 4.5, use: 'links, stamps, focus ring' },
  { fg: 'ink', bg: 'paper-sunk', min: 4.5, use: 'text on placeholders and code' },
  { fg: 'ink-muted', bg: 'paper-sunk', min: 4.5, use: 'placeholder text' },
  { fg: 'accent', bg: 'paper-sunk', min: 4.5, use: 'links on sunk surfaces' },
];

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Returns { light, dark } maps of token -> hex. Dark inherits light values it doesn't override. */
export function parseTokens(css: string) {
  const grab = (block: string) =>
    Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]));
  const darkStart = css.indexOf('prefers-color-scheme: dark');
  const light = grab(darkStart >= 0 ? css.slice(0, darkStart) : css);
  const dark = { ...light, ...(darkStart >= 0 ? grab(css.slice(darkStart)) : {}) };
  return { light, dark };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const schemes = parseTokens(readFileSync('src/styles/tokens.css', 'utf8'));
  let failed = 0;
  for (const [scheme, t] of Object.entries(schemes)) {
    for (const p of PAIRS) {
      const fg = t[p.fg];
      const bg = t[p.bg];
      if (!fg || !bg) throw new Error(`tokens.css: missing --${fg ? p.bg : p.fg} (${scheme})`);
      const ratio = contrast(fg, bg);
      const ok = ratio >= p.min;
      if (!ok) failed++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${scheme.padEnd(5)} ${p.fg} on ${p.bg}: ${ratio.toFixed(2)}:1 (min ${p.min}, ${p.use})`);
    }
  }
  if (failed) process.exit(1);
}
