/**
 * Fails if this site's own address is hard-coded anywhere.
 * The address must come from src/config/site-url.ts (SITE_URL env var or Vercel's host).
 *
 * Flags:
 *   - mtroque.dev used as a host (https://mtroque.dev, www.mtroque.dev, @mtroque.dev, bare "mtroque.dev/")
 *   - this project's *.vercel.app hosts (production mtroque-dev.vercel.app, previews mtroque-*-bunny-budget.vercel.app)
 * Allows:
 *   - the GitHub repo path "mtroque/mtroque.dev"
 *   - other projects' vercel.app hosts (e.g. the Tablekeeper app)
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';

const SCOPE = [/^src\//, /^public\//, /^scripts\//, /^astro\.config\.\w+$/, /^vercel\.json$/, /^package\.json$/];
const SELF = relative(process.cwd(), new URL(import.meta.url).pathname);
const TEXT = /\.(ts|tsx|js|mjs|cjs|astro|mdx?|ya?ml|json|css|html|svg|txt|xml)$/;

const OWN_HOST_PATTERNS: { name: string; re: RegExp }[] = [
  // any "mtroque.dev" host, except the GitHub repo path "mtroque/mtroque.dev"
  { name: 'mtroque.dev', re: /(?<![\w.-])(?<!mtroque\/)(?:www\.)?mtroque\.dev\b/gi },
  { name: 'project vercel.app host', re: /\b(?:mtroque[a-z0-9-]*|[a-z0-9-]*bunny-budget)\.vercel\.app\b/gi },
];

export function findDomainHits(text: string): { line: number; match: string; rule: string }[] {
  const hits: { line: number; match: string; rule: string }[] = [];
  text.split('\n').forEach((lineText, i) => {
    for (const { name, re } of OWN_HOST_PATTERNS) {
      for (const m of lineText.matchAll(re)) hits.push({ line: i + 1, match: m[0], rule: name });
    }
  });
  return hits;
}

function listFiles(): string[] {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
  return out.split('\n').filter((f) => f && f !== SELF && TEXT.test(f) && SCOPE.some((re) => re.test(f)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let failures = 0;
  for (const file of listFiles()) {
    for (const hit of findDomainHits(readFileSync(file, 'utf8'))) {
      failures++;
      console.error(`${file}:${hit.line}  hard-coded site address "${hit.match}" (${hit.rule})`);
    }
  }
  if (failures) {
    console.error(`\ncheck:domains: ${failures} hit(s). Read the site address from Astro.site instead.`);
    process.exit(1);
  }
  console.log('check:domains: ok');
}
