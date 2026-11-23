/**
 * pnpm todos            list every [[TODO: ...]] in site sources as file:line (exit 0)
 * pnpm todos --strict   same, but exit 1 if any remain
 *
 * The build gate (src/integrations/todo-gate.ts) scans the built HTML as well, so TODOs that
 * only appear once rendered (e.g. empty media slots) are caught too.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/** Matches [[TODO: text]]. The bare format example "[[TODO: ...]]" is ignored. */
export const TODO_RE = /\[\[TODO:\s*(.+?)\s*\]\]/g;
const EXAMPLE = /^(\.\.\.|…)$/;

export type Todo = { file: string; line: number; text: string };

export function findTodos(source: string, file: string): Todo[] {
  const out: Todo[] = [];
  source.split('\n').forEach((lineText, i) => {
    for (const m of lineText.matchAll(TODO_RE)) {
      const text = m[1]!;
      if (!EXAMPLE.test(text)) out.push({ file, line: i + 1, text });
    }
  });
  return out;
}

// Site sources only: docs/ describes the format, scripts/ and tests/ implement and test it.
const SCOPE = [/^src\//, /^public\//, /^astro\.config\.\w+$/];
const TEXT = /\.(ts|tsx|js|mjs|astro|mdx?|ya?ml|json|css|html|svg|txt)$/;

export function listSourceFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
  return out.split('\n').filter((f) => f && TEXT.test(f) && SCOPE.some((re) => re.test(f)));
}

export function collectTodos(): Todo[] {
  return listSourceFiles().flatMap((f) => findTodos(readFileSync(f, 'utf8'), f));
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
