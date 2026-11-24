import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BASE_CHARS, FONTS, OUT_DIR, missingFrom, siteChars } from '../scripts/fonts';

describe('font subsets', () => {
  it('cover the base set and every character in the copy', () => {
    for (const f of FONTS) {
      const buf = readFileSync(`${OUT_DIR}/${f.file}`);
      expect(missingFrom(buf, [...BASE_CHARS].filter((c) => c !== ' ' && c !== ' '))).toEqual([]);
      expect(missingFrom(buf, siteChars())).toEqual([]);
    }
  });
  it('include the requested punctuation', () => {
    for (const c of '‘’“”–—·✓') expect(BASE_CHARS).toContain(c);
  });
  it('use font-display: swap on every face', () => {
    const css = readFileSync('src/styles/fonts.css', 'utf8');
    const faces = css.match(/@font-face\s*{[^}]*}/g) ?? [];
    // og/ fonts are build-only (OG images) and never get an @font-face.
    expect(faces).toHaveLength(FONTS.filter((f) => !f.file.startsWith('og/')).length);
    expect(css).not.toMatch(/fonts\/og\//);
    for (const f of faces) expect(f).toMatch(/font-display:\s*swap/);
  });
});
