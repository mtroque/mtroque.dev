/**
 * pnpm check:font-features  fails if CSS asks for an OpenType feature the font subsets can't deliver.
 *
 * The serif subset drops OpenType alternates (see scripts/fonts.ts), and a browser then fakes some
 * of them (small caps) or silently ignores others (figure styles). The feature tags can still be
 * listed in the font with nothing behind them, so this check shapes sample text with the feature
 * on and off and requires a real glyph change.
 *
 * Font per rule: a rule whose font-family mentions the mono stack is checked against the mono
 * subsets; any other rule against the serif (the site default).
 */
import { readFileSync } from 'node:fs';
import fg from 'fast-glob';
import * as fontkit from 'fontkit';
import { FONTS, OUT_DIR } from './fonts';

/** CSS keyword -> OpenType tags it turns on. */
const KEYWORDS: Record<string, string[]> = {
  'lining-nums': ['lnum'], 'oldstyle-nums': ['onum'], 'proportional-nums': ['pnum'], 'tabular-nums': ['tnum'],
  'diagonal-fractions': ['frac'], 'stacked-fractions': ['afrc'], ordinal: ['ordn'], 'slashed-zero': ['zero'],
  'small-caps': ['smcp'], 'all-small-caps': ['smcp', 'c2sc'], 'petite-caps': ['pcap'], 'all-petite-caps': ['pcap', 'c2pc'],
  unicase: ['unic'], 'titling-caps': ['titl'],
  'discretionary-ligatures': ['dlig'], 'historical-ligatures': ['hlig'], contextual: ['calt'],
  sub: ['subs'], super: ['sups'],
};
const PROPS = ['font-variant-numeric', 'font-variant-caps', 'font-variant-ligatures', 'font-variant-position', 'font-variant'];

/** Text that a feature would visibly change. */
const SAMPLE: Record<string, string> = {
  lnum: '0123456789', onum: '0123456789', pnum: '0123456789', tnum: '0123456789', zero: '0', frac: '1/2',
  afrc: '1/2', ordn: '1a 2o', smcp: 'Abcdefg', c2sc: 'ABCDEFG', pcap: 'Abcdefg', c2pc: 'ABCDEFG', unic: 'Abc',
  titl: 'ABC', dlig: 'ct st', hlig: 'ct st', calt: 'ffi', subs: '123', sups: '123',
};

export type Request = { file: string; line: number; tags: string[]; mono: boolean; decl: string };

/** Every feature request in a stylesheet (plain CSS or an .astro file's <style> blocks). */
export function featureRequests(source: string, file: string): Request[] {
  const css = file.endsWith('.astro')
    ? source.replace(/[\s\S]*?(<style[^>]*>([\s\S]*?)<\/style>|$)/g, (_m, _s, body) => body ?? '')
    : source;
  // Map positions back to source lines (for .astro, search the declaration in the original).
  const out: Request[] = [];
  for (const block of css.matchAll(/{([^{}]*)}/g)) {
    const body = block[1]!;
    const mono = /font-family:[^;]*(--font-mono|IBM Plex Mono|monospace)/i.test(body);
    for (const d of body.matchAll(/([\w-]+)\s*:\s*([^;]+);?/g)) {
      const [decl, prop, value] = [d[0]!.trim(), d[1]!.toLowerCase(), d[2]!.trim()];
      let tags: string[] = [];
      if (prop === 'font-feature-settings') {
        tags = [...value.matchAll(/["'](\w{4})["']\s*(on|1)?(?!\s*(off|0))/g)].map((m) => m[1]!);
      } else if (PROPS.includes(prop)) {
        tags = value.split(/\s+/).flatMap((k) => KEYWORDS[k] ?? []);
      }
      if (!tags.length) continue;
      const idx = source.indexOf(decl);
      const line = idx >= 0 ? source.slice(0, idx).split('\n').length : 0;
      out.push({ file, line, tags, mono, decl });
    }
  }
  return out;
}

type Font = { layout: (t: string, f: Record<string, boolean>) => { glyphs: { id: number; advanceWidth: number }[] } };

export function featureWorks(font: Font, tag: string): boolean {
  const text = SAMPLE[tag] ?? 'Abc 0123456789';
  const sig = (on: boolean) => font.layout(text, { [tag]: on }).glyphs.map((g) => `${g.id}:${g.advanceWidth}`).join(' ');
  return sig(false) !== sig(true);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const load = (file: string) => fontkit.create(readFileSync(`${OUT_DIR}/${file}`)) as Font;
  const serif = FONTS.filter((f) => f.file.startsWith('source-serif')).map((f) => ({ name: f.file, font: load(f.file) }));
  const mono = FONTS.filter((f) => f.file.startsWith('ibm-plex-mono')).map((f) => ({ name: f.file, font: load(f.file) }));

  const files = fg.sync(['src/**/*.css', 'src/**/*.astro']).sort();
  let failures = 0;
  let checked = 0;
  for (const file of files) {
    for (const r of featureRequests(readFileSync(file, 'utf8'), file)) {
      for (const tag of r.tags) {
        checked++;
        for (const { name, font } of r.mono ? mono : serif) {
          if (!featureWorks(font, tag)) {
            failures++;
            console.error(`${file}:${r.line}  "${r.decl}" asks for ${tag}, which ${name} can't provide`);
          }
        }
      }
    }
  }
  if (failures) {
    console.error('\nRemove the request, or keep the feature in scripts/fonts.ts and run pnpm fonts.');
    process.exit(1);
  }
  console.log(`check:font-features: ${checked} feature request(s), all supported by the subsets`);
}
