/**
 * pnpm check:titles  fails if any paper title or a patent's official title differs from titles.lock.
 *
 * Titles are never edited. Changing one means editing titles.lock on purpose, in the same commit.
 */
import { readFileSync } from 'node:fs';
import fg from 'fast-glob';
import { parse as parseYaml } from 'yaml';
import { loadLockedTitles, TITLES_LOCK } from './copy-lint/index';

export function titlesFromCollections(read: (p: string) => string = (p) => readFileSync(p, 'utf8')): string[] {
  const papers = fg.sync('src/content/publications/*.yaml').map((p) => parseYaml(read(p)).title as string);
  const patents = fg.sync('src/content/patents/*.yaml').map((p) => parseYaml(read(p)).officialTitle as string);
  return [...patents, ...papers];
}

export function compareTitles(locked: string[], actual: string[]): string[] {
  const problems: string[] = [];
  for (const t of actual) if (!locked.includes(t)) problems.push(`not in ${TITLES_LOCK}: "${t}"`);
  for (const t of locked) if (!actual.includes(t)) problems.push(`locked title missing or changed: "${t}"`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const actual = titlesFromCollections();
  const problems = compareTitles(loadLockedTitles(), actual);
  for (const p of problems) console.error(p);
  if (problems.length) process.exit(1);
  console.log(`check:titles: ${actual.length} titles match ${TITLES_LOCK}`);
}
