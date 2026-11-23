import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findMediaGaps, findTodos } from '../scripts/todos';
import { scanBuiltOutput } from '../src/integrations/todo-gate';
import { compareTitles, titlesFromCollections } from '../scripts/check-titles';

describe('todos', () => {
  it('finds TODOs with file and line', () => {
    expect(findTodos('a\nb [[TODO: headshot]] c [[TODO:  CV link ]]', 'f.md')).toEqual([
      { file: 'f.md', line: 2, text: 'headshot' },
      { file: 'f.md', line: 2, text: 'CV link' },
    ]);
  });
  it('ignores template code that builds a TODO', () => {
    expect(findTodos('<p>[[TODO: {label}: {item.description}]]</p>', 'M.astro')).toEqual([]);
  });
  it('lists media items without a file at their frontmatter line', () => {
    const mdx = '---\ntitle: T\nmedia:\n  - id: a\n    kind: gif\n    description: photo flow\n  - id: b\n    kind: screenshot\n    description: done\n    src: ./b.png\n---\nBody';
    expect(findMediaGaps(mdx, 'p.mdx')).toEqual([{ file: 'p.mdx', line: 4, text: 'GIF: photo flow' }]);
  });
  it('ignores the format example', () => {
    expect(findTodos('Use `[[TODO: ...]]` for gaps.', 'f.md')).toEqual([]);
  });
  it('build gate finds TODOs in rendered HTML', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dist-'));
    mkdirSync(join(dir, 'projects'));
    writeFileSync(join(dir, 'index.html'), '<p>ok</p>');
    writeFileSync(join(dir, 'projects', 'index.html'), '<figure>[[TODO: GIF: photo to score]]</figure>');
    expect(scanBuiltOutput(dir)).toEqual([{ file: join('projects', 'index.html'), text: 'GIF: photo to score' }]);
  });
});

describe('titles', () => {
  it('reads every paper title and patent official title from the collections', () => {
    const titles = titlesFromCollections();
    expect(titles).toHaveLength(8);
    expect(titles).toContain('Data-centric Advanced Knowledge Interface for Legal Archives');
  });
  it('reports edited and missing titles', () => {
    expect(compareTitles(['Paper One: A Study'], ['Paper One: a study'])).toHaveLength(2);
    expect(compareTitles(['A'], ['A'])).toEqual([]);
  });
});

describe('verbatim', () => {
  it('ignores Markdown syntax and catches rewording', async () => {
    const { checkVerbatim } = await import('../scripts/check-verbatim');
    const src = '**The problem**\n- **Bold.** Text with `code` and [a link](https://x.y).\n';
    const ok = { path: 'a.mdx', text: '---\ntitle: The problem\n---\n## The problem\n\n- **Bold.** Text with `code` and [a link](https://x.y).\n' };
    expect(checkVerbatim(src, [ok])).toEqual([]);
    const bad = { path: 'b.yaml', text: 'summary: Text with code and a lnk.' };
    expect(checkVerbatim(src, [bad])).toHaveLength(1);
  });
});

describe('approved copy changes', () => {
  it('applies a logged change to the baseline so the new copy passes', async () => {
    const { applyCopyChanges, checkVerbatim } = await import('../scripts/check-verbatim');
    const baseline = "That's why I built Strop, below.\n";
    const site = [{ path: 't.mdx', text: "---\ntitle: T\n---\nThat's why I built [Strop](/projects/strop/).\n" }];
    expect(checkVerbatim(baseline, site)).toHaveLength(1);
    const change = { file: 't.mdx', before: "That's why I built Strop, below.", after: "That's why I built [Strop](/projects/strop/).", reason: 'r', approved: '2026-11-23' };
    expect(checkVerbatim(applyCopyChanges(baseline, [change]), site)).toEqual([]);
  });
  it('refuses a change whose "before" is not in the baseline exactly once', async () => {
    const { applyCopyChanges } = await import('../scripts/check-verbatim');
    expect(() => applyCopyChanges('a', [{ file: 'f', before: 'b', after: 'c', reason: 'r', approved: 'd' }])).toThrow(/found 0 times/);
  });
});
