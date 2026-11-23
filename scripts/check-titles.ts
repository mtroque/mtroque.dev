/**
 * pnpm check:titles  fails if any paper title or the patent's official title differs from titles.lock.
 *
 * Titles are never edited. Changing one means editing titles.lock on purpose, in the same commit.
 * Source: docs/CONTENT.md until the content migration (Milestone 2), then src/content/.
 */
import { readFileSync } from 'node:fs';
import { loadLockedTitles, TITLES_LOCK } from './copy-lint/index';

export function titlesFromContentMd(md: string): string[] {
  const section = md.split(/^## Selected Patents & Publications\s*$/m)[1]?.split(/^## /m)[0] ?? '';
  const titles: string[] = [];
  const official = section.match(/^- \*\*Official title[^*]*\*\*\s*(.+)$/m);
  if (official) titles.push(official[1]!.trim());
  for (const m of section.matchAll(/^\*\*(.+)\*\*\s*$/gm)) titles.push(m[1]!.trim());
  return titles;
}

export function compareTitles(locked: string[], actual: string[]): string[] {
  const problems: string[] = [];
  for (const t of actual) if (!locked.includes(t)) problems.push(`not in ${TITLES_LOCK}: "${t}"`);
  for (const t of locked) if (!actual.includes(t)) problems.push(`locked title missing or changed: "${t}"`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const actual = titlesFromContentMd(readFileSync('docs/CONTENT.md', 'utf8'));
  const problems = compareTitles(loadLockedTitles(), actual);
  for (const p of problems) console.error(p);
  if (problems.length) process.exit(1);
  console.log(`check:titles: ${actual.length} titles match ${TITLES_LOCK}`);
}
