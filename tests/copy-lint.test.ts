import { describe, expect, it } from 'vitest';
import { extractMarkdown, extractYaml } from '../scripts/copy-lint/extract';
import { splitSentences, tripletCount } from '../scripts/copy-lint/rules';
import { applyAllowlist, lintSource, loadAllowlist, type AllowEntry } from '../scripts/copy-lint/index';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const lint = (md: string, file = 'x.md', titles: string[] = []) => lintSource(md, file, titles);
const rules = (md: string) => lint(md).map((h) => h.rule);

describe('banned-terms', () => {
  it.each([
    'We delve into data.',
    'I leveraged agents.',
    'A seamless flow.',
    'Robustness matters.',
    'Cutting edge work.',
    'I am passionate about evals.',
    "In today's fast-paced world, things move.",
    'This unlocks value.',
    'It empowers teams.',
    'My journey began.',
    'A testament to care.',
    'It elevated the bar.',
  ])('flags %s', (s) => expect(rules(s)).toContain('banned-terms'));

  it('does not flag look-alikes', () => {
    expect(rules('The journal published it. I left the elevator.')).not.toContain('banned-terms');
  });

  it('ignores inline code and URLs', () => {
    expect(rules('Run `leverage --robust` now, see https://example.com/journey.')).toEqual([]);
  });
});

describe('not-just-but', () => {
  it.each([
    "It's not just a chatbot, but a teammate.",
    "This isn't just a tool, it's a platform.",
    "It isn't about speed, it's about trust.",
    'It is more than just a demo.',
  ])('flags %s', (s) => expect(rules(s)).toContain('not-just-but'));

  it('allows a plain "not"', () => {
    expect(rules('Detection is classic computer vision running in the browser, not a vision model.')).toEqual([]);
  });
});

describe('em-dash', () => {
  it('allows one per paragraph', () => expect(rules('One — only one.')).toEqual([]));
  it('flags two', () => expect(rules('One — two — three.')).toContain('em-dash'));
  it('counts per paragraph, not per file', () => expect(rules('A — b.\n\nC — d.')).toEqual([]));
});

describe('triplet', () => {
  it.each([
    'It scores your board from a photo you confirm, answers rules questions with citations to the official rulebook, and keeps a history of your plays.',
    'More games (Vale of Eternity, Flamecraft, Splendor) and the Harmonies expansion',
    'We compared crowdsourcing, web crawling and image generation as ways to collect images.',
    'It is fast, simple and free.',
  ])('flags %s', (s) => expect(tripletCount(s)).toBeGreaterThan(0));

  it.each([
    "I'm a Senior AI Engineer at PwC, building multi-agent systems for banks and insurers, where an agent's work has to hold up against regulation.",
    'Each board has a fixed layout, so reading it is a per-space classification problem, and solving it locally makes it free, offline, deterministic and measurable.',
    'On my labeled test photos, the detector found the board every time and read 99.3% of values correctly for Patchwork (691 of 696) and 98.7% for Harmonies (148 of 150).',
    'Photo scoring for Azul, whose printed board makes empty and filled spaces look alike',
    'Agent session transcripts, plus the gap between what an agent committed and what was eventually merged.',
    "I'm happy to talk about making agents reliable, especially in regulated industries, and about research collaborations.",
    'We test agents, including browser agents, and chatbots.',
    'Cats and dogs.',
    'A, B, C, and D.',
  ])('does not flag %s', (s) => expect(tripletCount(s)).toBe(0));

  it('skips headings', () => expect(rules('## Red, green and blue')).toEqual([]));
});

describe('closing-restatement', () => {
  it('flags a summary opener', () => {
    expect(rules('We ran tests. They passed. Overall, the tests passed.')).toContain('closing-restatement');
  });
  it('flags a last sentence made of earlier words', () => {
    expect(rules('Rules that fail get retired. Retired rules leave the checks. Failing rules get retired from the checks.')).toContain(
      'closing-restatement',
    );
  });
  it('flags a sentence repeated from an earlier paragraph in the same section', () => {
    const md = '## S\n\nRules that do not reduce the problem get retired.\n\nOther text here.\n\nRules that do not help get retired.';
    expect(rules(md)).toContain('closing-restatement');
  });
  it('ignores label lines like "Venue: …"', () => {
    expect(rules('## S\n\nVenue: BabyLM Workshop at EMNLP 2025, Suzhou\n\nVenue: BabyLM Workshop at EMNLP 2025, Suzhou')).toEqual([]);
  });
  it('leaves a new closing claim alone', () => {
    expect(rules('The checks caught a lot. Transcripts showed more. Nobody saw the workarounds happen.')).toEqual([]);
  });
});

describe('extraction', () => {
  it('never lints locked titles', () => {
    expect(lint('**Scaling, Simplification, and Adaptation: Lessons**', 'x.md', ['Scaling, Simplification, and Adaptation: Lessons'])).toEqual([]);
  });
  it('reports the right line in MDX and skips JSX', () => {
    const hits = lint('---\ntitle: T\n---\n\n<Media id="a" />\n\nIt is fast, simple and free.\n', 'p.mdx');
    expect(hits.map((h) => h.line)).toEqual([7]);
  });
  it('reads MDX frontmatter strings with correct lines', () => {
    const hits = lint('---\ntitle: T\nblurb: It is fast, simple and free.\n---\n\nBody.\n', 'p.mdx');
    expect(hits).toMatchObject([{ rule: 'triplet', line: 3 }]);
  });
  it('YAML: skips URLs, author names and locked titles; lints prose', () => {
    const yaml = [
      'title: Crowdsource, Crawl, or Generate?',
      'authors:',
      '  - name: Ann, Bob and Cy',
      'links:',
      '  - url: https://a.b/c',
      'summary: We delve into it.',
    ].join('\n');
    const blocks = extractYaml(yaml, 'p.yaml', { lockedTitles: ['Crowdsource, Crawl, or Generate?'] });
    expect(blocks.map((b) => b.text)).toEqual(['We delve into it.']);
    expect(lint(yaml, 'p.yaml', ['Crowdsource, Crawl, or Generate?'])).toMatchObject([{ rule: 'banned-terms', line: 6 }]);
  });
  it('splits soft line breaks into blocks', () => {
    expect(extractMarkdown('**Label**\nBody text.', 'x.md').map((b) => b.text)).toEqual(['Label', 'Body text.']);
  });
  it('honors disable comments that give a reason', () => {
    expect(rules('<!-- copy-lint-disable-next-line banned-terms: statistics term -->\nA robust estimator.')).toEqual([]);
    expect(rules('<!-- copy-lint-disable-next-line banned-terms -->\nA robust estimator.')).toContain('banned-terms');
  });
});

describe('sentences', () => {
  it('keeps decimals, file names and abbreviations together', () => {
    expect(splitSentences('It read 99.3% of values. Next.js runs, e.g. Vercel works. Done.')).toEqual([
      'It read 99.3% of values.',
      'Next.js runs, e.g. Vercel works.',
      'Done.',
    ]);
  });
});

describe('allowlist', () => {
  const hit = lint('It is fast, simple and free.')[0]!;
  const entry: AllowEntry = { rule: 'triplet', sentence: 'It is fast, simple and free.', reason: 'test' };

  it('acknowledges the exact sentence (quotes and spaces normalized)', () => {
    const { results, unused } = applyAllowlist([hit], [{ ...entry, sentence: 'It is  fast, simple and free.' }]);
    expect(results[0]!.acknowledged).toBeTruthy();
    expect(unused).toEqual([]);
  });
  it('expires when the sentence changes', () => {
    const edited = lint('It is fast, cheap and free.')[0]!;
    const { results, unused } = applyAllowlist([edited], [entry]);
    expect(results[0]!.acknowledged).toBeUndefined();
    expect(unused).toHaveLength(1);
  });
  it('rejects exact rules and missing reasons', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cl-'));
    const f = join(dir, 'a.yaml');
    writeFileSync(f, '- rule: banned-terms\n  sentence: x\n  reason: y\n');
    expect(() => loadAllowlist(f)).toThrow(/heuristic/);
    writeFileSync(f, '- rule: triplet\n  sentence: x\n  reason: ""\n');
    expect(() => loadAllowlist(f)).toThrow(/reason/);
  });
});
