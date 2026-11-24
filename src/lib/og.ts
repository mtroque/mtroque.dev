/**
 * Build-time Open Graph images (1200x630) in the site's own type and palette.
 * Satori lays out the markup and draws text as paths; resvg rasterizes to PNG.
 */
import { readFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Light palette from src/styles/tokens.css (share images aren't themed).
const C = { paper: '#faf8f3', ink: '#1c1b19', muted: '#625e57', rule: '#d9d4c7', accent: '#8c2f1b' };

const font = (file: string) => readFileSync(`src/assets/fonts/${file}`);
const FONTS = [
  { name: 'Serif', data: font('og/source-serif-4-600.woff2'), weight: 600 as const, style: 'normal' as const },
  { name: 'Serif', data: font('og/source-serif-4-400.woff2'), weight: 400 as const, style: 'normal' as const },
  { name: 'Mono', data: font('ibm-plex-mono-400.woff2'), weight: 400 as const, style: 'normal' as const },
];

type Node = { type: string; props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown } };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

export type OgContent = {
  /** Small mono label at the top (the person's name). */
  label: string;
  title: string;
  subtitle?: string | undefined;
  /** Optional status stamp, e.g. IN DEVELOPMENT. */
  stamp?: string | undefined;
  /** Footer: the site's host, from the single site URL. */
  host: string;
  /** Title size: large for short names, smaller for a sentence-length headline. */
  titleSize?: number;
};

const PAD_X = 80;
const INNER = OG_WIDTH - 2 * PAD_X; // 1040
const TEXT = INNER - 42; // inside the left rule and its padding
// Fixed vertical budget (Satori doesn't shrink flex children reliably).
const PAD_TOP = 64, PAD_BOTTOM = 56, LABEL_H = 32, GAP = 32, FOOTER_H = 52;
const MIDDLE_H = OG_HEIGHT - PAD_TOP - PAD_BOTTOM - LABEL_H - 2 * GAP - FOOTER_H; // 362

export function ogMarkup(c: OgContent): Node {
  return el(
    'div',
    {
      width: OG_WIDTH, height: OG_HEIGHT, display: 'flex', flexDirection: 'column',
      background: C.paper, color: C.ink, padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`, fontFamily: 'Serif',
    },
    [
      el('div', { display: 'flex', flexShrink: 0, height: LABEL_H, fontFamily: 'Mono', fontSize: 24, letterSpacing: 0.5, color: C.ink }, c.label),
      el('div', {
        display: 'flex', flexDirection: 'column', width: INNER, height: MIDDLE_H,
        justifyContent: 'center', borderLeft: `2px solid ${C.rule}`, paddingLeft: 40, marginTop: GAP, marginBottom: GAP,
      }, [
        el('div', { display: 'flex', width: TEXT, fontSize: c.titleSize ?? 96, fontWeight: 600, lineHeight: 1.12, letterSpacing: -1 }, c.title),
        ...(c.subtitle ? [el('div', { display: 'flex', width: TEXT, fontSize: 40, fontWeight: 400, color: C.muted, marginTop: 20, lineHeight: 1.3 }, c.subtitle)] : []),
        ...(c.stamp
          ? [el('div', { display: 'flex', marginTop: 32 }, [
              el('div', { display: 'flex', fontFamily: 'Mono', fontSize: 22, letterSpacing: 2, color: C.accent, border: `2px solid ${C.accent}`, borderRadius: 3, padding: '8px 14px 6px' }, c.stamp.toUpperCase()),
            ])]
          : []),
      ]),
      el('div', { display: 'flex', flexShrink: 0, width: INNER, height: FOOTER_H, alignItems: 'flex-end', borderTop: `1px solid ${C.rule}`, fontFamily: 'Mono', fontSize: 22, color: C.muted }, c.host),
    ],
  );
}

export async function renderOg(c: OgContent): Promise<Buffer> {
  const svg = await satori(ogMarkup(c) as Parameters<typeof satori>[0], { width: OG_WIDTH, height: OG_HEIGHT, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng();
}
