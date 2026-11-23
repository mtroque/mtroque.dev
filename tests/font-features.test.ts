import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as fontkit from 'fontkit';
import { featureRequests, featureWorks } from '../scripts/check-font-features';

describe('font feature requests', () => {
  it('finds requests in CSS and in .astro <style> blocks, with lines and font', () => {
    const css = '.a {\n  font-variant-caps: small-caps;\n}\n.m { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }';
    expect(featureRequests(css, 'x.css')).toMatchObject([
      { line: 2, tags: ['smcp'], mono: false },
      { line: 4, tags: ['tnum'], mono: true },
    ]);
    const astro = '---\nconst a = 1;\n---\n<p>x</p>\n<style>\n  td { font-feature-settings: "tnum" 1, "liga" 0; }\n</style>';
    expect(featureRequests(astro, 'x.astro')).toMatchObject([{ line: 6, tags: ['tnum'] }]);
  });
  it('ignores normal/none values', () => {
    expect(featureRequests('p { font-variant-numeric: normal; font-variant-caps: normal; }', 'x.css')).toEqual([]);
  });
  it('tells a working feature from a listed-but-empty one in the real subsets', () => {
    const serif = fontkit.create(readFileSync('src/assets/fonts/source-serif-4.woff2')) as any;
    const mono = fontkit.create(readFileSync('src/assets/fonts/ibm-plex-mono-400.woff2')) as any;
    expect(featureWorks(serif, 'smcp')).toBe(false); // listed in the font, glyphs dropped
    expect(featureWorks(serif, 'sups')).toBe(true);
    expect(featureWorks(mono, 'zero')).toBe(true);
  });
});
