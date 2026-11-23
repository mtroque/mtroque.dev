/**
 * Turns Markdown, MDX and YAML into prose blocks the rules can read.
 *
 * - Code, inline code, HTML/MDX expressions and bare URLs are replaced by neutral tokens.
 * - Each source line of a paragraph is its own block. Site content keeps one paragraph per line,
 *   and CONTENT.md uses lines for "**Label:** value" pairs.
 * - Locked titles (titles.lock) are replaced by a token so they are never linted.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import { LineCounter, parseDocument, isMap, isSeq, isScalar, type Node as YamlNode } from 'yaml';
import type { Root, RootContent, PhrasingContent } from 'mdast';

export type Block = {
  file: string;
  line: number;
  text: string;
  kind: 'paragraph' | 'heading' | 'cell';
  /** Nearest h2/h3 heading; used to find sentences repeated within a section. */
  section: string;
  /** Lines carrying a copy-lint-disable-next-line comment, by rule. */
  disabled: Set<string>;
};

export type ExtractOptions = { lockedTitles?: string[] };

const URL_RE = /^(https?:\/\/|mailto:)\S+$/;

function inlineText(nodes: PhrasingContent[]): string {
  let out = '';
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
        out += n.value;
        break;
      case 'inlineCode':
        out += 'CODE';
        break;
      case 'break':
        out += '\n';
        break;
      case 'link': {
        const t = inlineText(n.children);
        out += URL_RE.test(t.trim()) ? 'URL' : t;
        break;
      }
      case 'html':
      case 'mdxTextExpression':
      case 'mdxJsxTextElement':
        break;
      default:
        if ('children' in n) out += inlineText(n.children as PhrasingContent[]);
    }
  }
  return out;
}

function stripTitles(text: string, titles: string[]): string {
  let t = text;
  for (const title of titles) if (title && t.includes(title)) t = t.split(title).join('TITLE');
  return t;
}

/** Map of line number -> rules disabled on it, from `copy-lint-disable-next-line rule: reason` comments. */
export function disableComments(source: string): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  const lines = source.split('\n');
  lines.forEach((l, i) => {
    const m = l.match(/copy-lint-disable-next-line\s+([\w-]+(?:\s*,\s*[\w-]+)*)\s*:\s*\S/);
    if (!m) return;
    let target = i + 1;
    while (target < lines.length && !lines[target]!.trim()) target++;
    const rules = new Set(m[1]!.split(',').map((r) => r.trim()));
    map.set(target + 1, rules);
  });
  return map;
}

export function extractMarkdown(source: string, file: string, opts: ExtractOptions = {}): Block[] {
  const mdx = file.endsWith('.mdx');
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ['yaml']);
  if (mdx) processor.use(remarkMdx);
  const tree = processor.parse(source) as Root;
  const titles = opts.lockedTitles ?? [];
  const disabled = disableComments(source);
  const blocks: Block[] = [];
  let section = '';

  const push = (raw: string, startLine: number, kind: Block['kind']) => {
    raw.split('\n').forEach((lineText, i) => {
      const text = stripTitles(lineText, titles).trim();
      if (!text || text === 'TITLE') return;
      const line = startLine + i;
      blocks.push({ file, line, text, kind, section, disabled: disabled.get(line) ?? new Set() });
    });
  };

  const walk = (node: RootContent) => {
    switch (node.type) {
      case 'yaml':
        blocks.push(...extractYaml(node.value, file, { ...opts, lineOffset: node.position!.start.line }));
        return;
      case 'heading': {
        const text = inlineText(node.children);
        if (node.depth <= 3) section = text;
        push(text, node.position!.start.line, 'heading');
        return;
      }
      case 'paragraph':
        push(inlineText(node.children), node.position!.start.line, 'paragraph');
        return;
      case 'table':
        for (const row of node.children)
          for (const cell of row.children) push(inlineText(cell.children), cell.position!.start.line, 'cell');
        return;
      case 'code':
      case 'html':
        return;
      default:
        if ('children' in node) for (const c of node.children as RootContent[]) walk(c);
    }
  };
  for (const node of tree.children) walk(node);
  return blocks;
}

/** Keys whose string values are not prose (or must never be linted, like paper titles). */
const SKIP_KEYS = new Set([
  'url', 'href', 'src', 'poster', 'id', 'kind', 'slug', 'group', 'vendor', 'badgeUrl', 'start', 'end',
  'cv', 'mp4', 'webm', 'status', 'officialTitle', 'year', 'order', 'office', 'applicationNumber',
  'publicationNumber', 'grantNumber', 'stack',
]);

export function extractYaml(
  source: string,
  file: string,
  opts: ExtractOptions & { lineOffset?: number } = {},
): Block[] {
  const lc = new LineCounter();
  const doc = parseDocument(source, { lineCounter: lc });
  const titles = opts.lockedTitles ?? [];
  const offset = opts.lineOffset ?? 0;
  const disabled = disableComments(source);
  const blocks: Block[] = [];

  const visit = (node: YamlNode | null | undefined, path: string[]) => {
    if (!node) return;
    if (isMap(node)) {
      for (const pair of node.items) {
        const key = isScalar(pair.key) ? String(pair.key.value) : '';
        if (SKIP_KEYS.has(key)) continue;
        if (key === 'name' && path.includes('authors')) continue;
        visit(pair.value as YamlNode, [...path, key]);
      }
    } else if (isSeq(node)) {
      node.items.forEach((item) => visit(item as YamlNode, path));
    } else if (isScalar(node) && typeof node.value === 'string' && node.range) {
      const yamlLine = lc.linePos(node.range[0]).line;
      const text = stripTitles(node.value, titles);
      // Strings may hold inline Markdown (links, emphasis): parse them.
      for (const b of extractMarkdown(text, `${file}.md`, {})) {
        const line = offset + yamlLine + (b.line - 1);
        blocks.push({ ...b, file, line, section: path[0] ?? '', disabled: disabled.get(yamlLine) ?? new Set() });
      }
    }
  };
  visit(doc.contents as YamlNode, []);
  return blocks;
}
