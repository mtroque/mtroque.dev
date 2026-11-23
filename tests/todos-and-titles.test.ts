import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { findTodos } from '../scripts/todos';
import { scanBuiltOutput } from '../src/integrations/todo-gate';
import { compareTitles, titlesFromContentMd } from '../scripts/check-titles';

describe('todos', () => {
  it('finds TODOs with file and line', () => {
    expect(findTodos('a\nb [[TODO: headshot]] c [[TODO:  CV link ]]', 'f.md')).toEqual([
      { file: 'f.md', line: 2, text: 'headshot' },
      { file: 'f.md', line: 2, text: 'CV link' },
    ]);
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
  const md = [
    '## Selected Patents & Publications',
    '### Patent',
    '- **Official title (shown smaller, beneath):** Method and Apparatus',
    '### Group',
    '**Paper One: A Study**',
    '- Venue: X',
    '## Contact',
    '**Not a title**',
  ].join('\n');

  it('extracts the official title and paper titles only', () => {
    expect(titlesFromContentMd(md)).toEqual(['Method and Apparatus', 'Paper One: A Study']);
  });
  it('reports edited and missing titles', () => {
    expect(compareTitles(['Paper One: A Study'], ['Paper One: a study'])).toHaveLength(2);
    expect(compareTitles(['A'], ['A'])).toEqual([]);
  });
});
