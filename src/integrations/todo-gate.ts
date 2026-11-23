import type { AstroIntegration } from 'astro';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const TODO_RE = /\[\[TODO:\s*(.+?)\s*\]\]/g;
const EXAMPLE = /^(\.\.\.|…)$/;

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return /\.(html|xml|txt)$/.test(name) ? [full] : [];
  });
}

export function scanBuiltOutput(dir: string): { file: string; text: string }[] {
  const hits: { file: string; text: string }[] = [];
  for (const file of htmlFiles(dir)) {
    for (const m of readFileSync(file, 'utf8').matchAll(TODO_RE)) {
      if (!EXAMPLE.test(m[1]!)) hits.push({ file: relative(dir, file), text: m[1]! });
    }
  }
  return hits;
}

/**
 * After the build, scan the generated pages for [[TODO: ...]].
 * Production deploys (VERCEL_ENV=production) and STRICT_TODOS=1 fail the build;
 * previews and local builds only warn.
 */
export default function todoGate(): AstroIntegration {
  return {
    name: 'todo-gate',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const strict = process.env.VERCEL_ENV === 'production' || process.env.STRICT_TODOS === '1';
        const hits = scanBuiltOutput(fileURLToPath(dir));
        if (!hits.length) {
          logger.info('No TODOs in built output.');
          return;
        }
        const list = hits.map((h) => `  ${h.file}: ${h.text}`).join('\n');
        const msg = `${hits.length} TODO(s) in built output:\n${list}\nRun \`pnpm todos\` for source locations.`;
        if (strict) throw new Error(`Production build blocked. ${msg}`);
        logger.warn(msg);
      },
    },
  };
}
