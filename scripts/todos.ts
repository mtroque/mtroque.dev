/**
 * pnpm todos            list every [[TODO: ...]] in site sources as file:line (exit 0)
 * pnpm todos --strict   same, but exit 1 if any remain
 *
 * The build gate (src/integrations/todo-gate.ts) scans the built HTML as well, so TODOs that
 * only appear once rendered (e.g. empty media slots) are caught too.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

/** Matches [[TODO: text]]. The bare format example "[[TODO: ...]]" is ignored. */
export const TODO_RE = /\[\[TODO:\s*(.+?)\s*\]\]/g;
const EXAMPLE = /^(\.\.\.|…)$/;

export type Todo = { file: string; line: number; text: string };

export function findTodos(source: string, file: string): Todo[] {
  const out: Todo[] = [];
  source.split('\n').forEach((lineText, i) => {
    for (const m of lineText.matchAll(TODO_RE)) {
      const text = m[1]!;
      // Skip the format example and template code that builds a TODO ({…} expressions).
      if (!EXAMPLE.test(text) && !/[{}]/.test(text)) out.push({ file, line: i + 1, text });
    }
  });
  return out;
}

// Site sources only: docs/ describes the format, scripts/ and tests/ implement and test it.
const SCOPE = [/^src\//, /^public\//, /^astro\.config\.\w+$/];
const TEXT = /\.(ts|tsx|js|mjs|astro|mdx?|ya?ml|json|css|html|svg|txt)$/;

export function listSourceFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
  // --cached still lists tracked files deleted from disk; skip those.
  return out.split('\n').filter((f) => f && TEXT.test(f) && SCOPE.some((re) => re.test(f)) && existsSync(f));
}

/** Media items with no file yet render as placeholders; list each at its frontmatter line. */
export function findMediaGaps(source: string, file: string): Todo[] {
  const fm = source.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!fm) return [];
  const media = (parseYaml(fm)?.media ?? []) as { id: string; kind: string; description: string; src?: string }[];
  const lines = source.split('\n');
  return media
    .filter((m) => !m.src)
    .map((m) => ({
      file,
      line: lines.findIndex((l) => l.trim() === `- id: ${m.id}`) + 1,
      text: `${m.kind === 'gif' ? 'GIF' : 'Screenshot'}: ${m.description}`,
    }));
}

export function collectTodos(): Todo[] {
  return listSourceFiles().flatMap((f) => {
    const src = readFileSync(f, 'utf8');
    return [...findTodos(src, f), ...(f.endsWith('.mdx') ? findMediaGaps(src, f) : [])];
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const strict = process.argv.includes('--strict');
  const todos = collectTodos();
  const gha = process.env.GITHUB_ACTIONS === 'true';
  for (const t of todos) {
    console.log(`${t.file}:${t.line}  ${t.text}`);
    if (gha) console.log(`::warning file=${t.file},line=${t.line}::TODO: ${t.text}`);
  }
  console.log(`\n${todos.length} TODO(s).`);
  if (strict && todos.length) process.exit(1);
}
