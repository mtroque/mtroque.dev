import { marked } from 'marked';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-05" -> "May 2026" */
export function formatYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m! - 1]} ${y}`;
}

/** "May 2026 – Present", "June 2024 – May 2026": spaced en dash (approved 2026-11-24). */
export function formatRange(start: string, end: string | undefined, present: string): string {
  return `${formatYearMonth(start)} – ${end ? formatYearMonth(end) : present}`;
}

/** Inline Markdown (links, emphasis) from content strings. Content is ours, not user input. */
export function inline(md: string): string {
  return marked.parseInline(md, { async: false });
}

/** "{n} papers" templates from ui.yaml. */
export function plural(n: number, t: { one: string; other: string }): string {
  return (n === 1 ? t.one : t.other).replace('{n}', String(n));
}

export const isExternal = (href: string) => /^https?:\/\//.test(href);
