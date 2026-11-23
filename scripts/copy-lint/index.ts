/**
 * pnpm lint:copy                         lint all site copy (src/content/**); exit 1 on errors
 * pnpm lint:copy --file docs/CONTENT.md  lint specific files instead
 * pnpm lint:copy --report ...            print hits but always exit 0
 *
 * Heuristic rules (triplet, closing-restatement) fail until acknowledged in copy-lint.allow.yaml.
 * Exact rules (banned-terms, not-just-but, em-dash) can only be silenced line by line with
 * `copy-lint-disable-next-line <rule>: <reason>`.
 */
import { existsSync, readFileSync } from 'node:fs';
import fg from 'fast-glob';
import { parse as parseYaml } from 'yaml';
import { extractMarkdown, extractYaml, type Block } from './extract';
import { HEURISTIC_RULES, runRules, type Hit, type RuleId } from './rules';

export const ALLOWLIST_FILE = 'copy-lint.allow.yaml';
export const TITLES_LOCK = 'titles.lock';
const DEFAULT_GLOBS = ['src/content/**/*.{md,mdx,yaml,yml}'];

export type AllowEntry = { rule: RuleId; sentence: string; reason: string };

export const normalize = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

export function loadAllowlist(path = ALLOWLIST_FILE): AllowEntry[] {
  if (!existsSync(path)) return [];
  const raw = (parseYaml(readFileSync(path, 'utf8')) ?? []) as Partial<AllowEntry>[];
  return raw.map((e, i) => {
    if (!e.rule || !e.sentence || !e.reason?.trim())
      throw new Error(`${path}: entry ${i + 1} needs rule, sentence and a non-empty reason`);
    if (!HEURISTIC_RULES.has(e.rule))
      throw new Error(`${path}: entry ${i + 1}: only heuristic rules can be acknowledged (got "${e.rule}")`);
    return e as AllowEntry;
  });
}

export function loadLockedTitles(path = TITLES_LOCK): string[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

export function lintSource(source: string, file: string, lockedTitles: string[]): Hit[] {
  const blocks: Block[] = /\.ya?ml$/.test(file)
    ? extractYaml(source, file, { lockedTitles })
    : extractMarkdown(source, file, { lockedTitles });
  return runRules(blocks);
}

export function applyAllowlist(hits: Hit[], allow: AllowEntry[]) {
  const used = new Set<AllowEntry>();
  const results = hits.map((h) => {
    const entry = allow.find((a) => a.rule === h.rule && normalize(a.sentence) === normalize(h.sentence));
    if (entry) used.add(entry);
    return { hit: h, acknowledged: entry };
  });
  return { results, unused: allow.filter((a) => !used.has(a)) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const report = args.includes('--report');
  const files: string[] = [];
  args.forEach((a, i) => a === '--file' && args[i + 1] && files.push(args[i + 1]!));
  const fullScan = files.length === 0;
  const targets = fullScan ? fg.sync(DEFAULT_GLOBS, { dot: false }).sort() : files;

  const lockedTitles = loadLockedTitles();
  const allow = loadAllowlist();
  const hits = targets.flatMap((f) => lintSource(readFileSync(f, 'utf8'), f, lockedTitles));
  const { results, unused } = applyAllowlist(hits, allow);

  let errors = 0;
  let acknowledged = 0;
  for (const { hit, acknowledged: ack } of results) {
    if (ack) {
      acknowledged++;
      continue;
    }
    errors++;
    console.log(`${hit.file}:${hit.line}  ${hit.rule}  ${hit.message}\n    "${hit.sentence}"`);
  }
  if (fullScan)
    for (const u of unused) console.log(`warning: ${ALLOWLIST_FILE} entry matches nothing (${u.rule}): "${u.sentence}"`);

  console.log(
    `\nlint:copy: ${targets.length} file(s), ${errors} unacknowledged hit(s), ${acknowledged} acknowledged.`,
  );
  if (errors && !report) process.exit(1);
}
