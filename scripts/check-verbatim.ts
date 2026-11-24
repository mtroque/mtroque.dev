/**
 * pnpm check:verbatim [--source <file> | --ref <git-ref>]
 *
 * Migration guard: every string in src/content/ (except ui.yaml, which is new UI copy) must
 * appear character-for-character in CONTENT.md, so moving the copy can't reword anything.
 * After CONTENT.md is retired, check against its last full version: --ref <commit>.
 * Approved changes in docs/copy-changes.yaml are applied to the baseline first.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import fg from 'fast-glob';
import { parse as parseYaml } from 'yaml';
import { formatRange } from '../src/lib/format';

/** Strip Markdown syntax so the same text compares equal on both sides. */
export function plain(line: string): string {
  return line
    .replace(/^\s*(?:[-*]|\d+\.|#{1,6})\s+/, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\*\*|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Keys whose values are identifiers or structure, not copy. `alt`, `description` and
 * `shortHeadline` are new copy (approved 2026-11-24, logged as type: new in
 * docs/copy-changes.yaml): not in the baseline, but linted by lint:copy like everything else.
 */
const STRUCTURAL = new Set(['id', 'group', 'vendor', 'kind', 'status', 'start', 'end', 'href', 'src', 'poster', 'mp4', 'webm', 'alt', 'description', 'shortHeadline']);

function strings(node: unknown, key = ''): string[] {
  if (typeof node === 'string') return STRUCTURAL.has(key) ? [] : [node];
  if (Array.isArray(node)) return node.flatMap((n) => strings(n, key));
  if (node && typeof node === 'object')
    return Object.entries(node).flatMap(([k, v]) => strings(v, k));
  return [];
}

export function mdxBodyLines(body: string): string[] {
  return body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('<') && !l.startsWith('{/*') && !/^\|[-|\s]+\|$/.test(l))
    .flatMap((l) => (l.startsWith('|') ? l.split('|').map((c) => c.trim()).filter(Boolean) : [l]));
}

/** type "change" (default) rewrites baseline text; type "new" records approved new copy (nothing to apply). */
export type CopyChange = { file: string; before: string; after: string; reason: string; approved: string; type?: 'change' | 'new' };

export const COPY_CHANGES = 'docs/copy-changes.yaml';

export function loadCopyChanges(path = COPY_CHANGES): CopyChange[] {
  if (!existsSync(path)) return [];
  const raw = (parseYaml(readFileSync(path, 'utf8')) ?? []) as Partial<CopyChange>[];
  return raw.map((c, i) => {
    // `after` may be "" for a removal, but the key must be there. New copy has no `before`.
    if (c.type === 'new') {
      if (!c.file || !c.after || !c.reason || !c.approved) throw new Error(`${path}: new-copy entry ${i + 1} needs file, after, reason and approved`);
      return { ...c, before: '' } as CopyChange;
    }
    if (!c.file || !c.before || typeof c.after !== 'string' || !c.reason || !c.approved)
      throw new Error(`${path}: entry ${i + 1} needs file, before, after (may be ""), reason and approved`);
    return c as CopyChange;
  });
}

/** Apply approved changes to the baseline. Each `before` must appear exactly once. */
export function applyCopyChanges(baseline: string, changes: CopyChange[]): string {
  let out = baseline;
  for (const c of changes) {
    if (c.type === 'new') continue;
    const n = out.split(c.before).length - 1;
    if (n !== 1) throw new Error(`copy change for ${c.file}: "${c.before}" found ${n} times in the baseline (need 1)`);
    out = out.replace(c.before, c.after);
  }
  return out;
}

export function checkVerbatim(contentMd: string, files: { path: string; text: string }[]) {
  const haystack = contentMd.split('\n').map(plain).join('\n');
  const missing: { file: string; text: string }[] = [];
  const has = (t: string) => haystack.includes(plain(t)) || contentMd.includes(t);
  for (const { path, text } of files) {
    let candidates: string[];
    if (path.endsWith('.mdx')) {
      const [, fm = '', body = ''] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
      candidates = [...strings(parseYaml(fm)), ...mdxBodyLines(body)];
    } else {
      candidates = strings(parseYaml(text));
    }
    for (const c of candidates) if (!has(c)) missing.push({ file: path, text: c });
  }
  return missing;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const ref = args[args.indexOf('--ref') + 1];
  const baseline = args.includes('--ref')
    ? execFileSync('git', ['show', `${ref}:docs/CONTENT.md`], { encoding: 'utf8' })
    : readFileSync(args.includes('--source') ? args[args.indexOf('--source') + 1]! : 'docs/CONTENT.md', 'utf8');
  const changes = loadCopyChanges();
  const source = applyCopyChanges(baseline, changes);

  const paths = fg.sync('src/content/**/*.{yaml,mdx}').filter((p) => !p.endsWith('/ui.yaml')).sort();
  const missing = checkVerbatim(source, paths.map((p) => ({ path: p, text: readFileSync(p, 'utf8') })));

  // Derived display strings must also match the source.
  for (const p of fg.sync('src/content/experience/*.yaml')) {
    const d = parseYaml(readFileSync(p, 'utf8'));
    const ui = parseYaml(readFileSync('src/content/ui.yaml', 'utf8'));
    const range = formatRange(d.start, d.end, ui.present);
    if (!source.includes(range)) missing.push({ file: p, text: `(formatted dates) ${range}` });
  }

  for (const m of missing) console.error(`${m.file}: not in CONTENT.md: "${m.text}"`);
  if (missing.length) process.exit(1);
  console.log(`check:verbatim: ${paths.length} files match CONTENT.md (+ ${changes.length} approved change(s))`);
}
