// Minimal types for the parts of these untyped packages that scripts/fonts.ts uses.
declare module 'subset-font' {
  type Axis = number | { min: number; max: number; default?: number };
  export default function subsetFont(
    font: Buffer,
    text: string,
    options?: {
      targetFormat?: 'woff2' | 'woff' | 'sfnt' | 'truetype';
      variationAxes?: Record<string, Axis>;
      noLayoutClosure?: boolean;
      noHinting?: boolean;
    },
  ): Promise<Buffer>;
}
declare module 'fontkit' {
  export function create(buffer: Buffer): unknown;
  export function openSync(path: string): unknown;
}
