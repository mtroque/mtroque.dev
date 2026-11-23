/**
 * Copy rules. Three are exact (always errors); two are heuristics (errors until acknowledged
 * in copy-lint.allow.yaml, because a regex can't tell a reflexive triplet from three real names).
 */
import type { Block } from './extract';

export type RuleId = 'banned-terms' | 'not-just-but' | 'em-dash' | 'triplet' | 'closing-restatement';
export const HEURISTIC_RULES: ReadonlySet<RuleId> = new Set(['triplet', 'closing-restatement']);

export type Hit = {
  rule: RuleId;
  file: string;
  line: number;
  message: string;
  /** The sentence (or block) the hit is about; allowlist entries match on this. */
  sentence: string;
};

// ---------- sentences and words ----------

const ABBREV = /\b(?:e\.g|i\.e|vs|etc|approx|Dr|Mr|Ms|Mrs|Fig|No|St|U\.S)\.$/i;

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[.!?]["”’')\]]*\s+(?=["“‘(\[]?[A-Z0-9])/g;
  let start = 0;
  for (const m of text.matchAll(re)) {
    const end = m.index! + m[0].trimEnd().length;
    const candidate = text.slice(start, end);
    if (ABBREV.test(candidate)) continue;
    out.push(candidate.trim());
    start = m.index! + m[0].length;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

const STOP = new Set(
  `a an the and or but if then so of to in on at by for with from as is are was were be been being it its it's
  this that these those there here i i'm i've me my we our you your they them their he she his her not no do does
  did done can could will would should may might must have has had than too very just also only more most less
  each every any some all which who whom what when where why how into out up down over about after before again
  between through during without within because while`.split(/\s+/),
);

function stem(w: string): string {
  return w.replace(/(?:ing|ed|es|s)$/, '') || w;
}

export function contentWords(sentence: string): Set<string> {
  const words = sentence
    .toLowerCase()
    .replace(/[“”"’']/g, "'")
    .split(/[^a-z0-9'%-]+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 2 && !STOP.has(w));
  return new Set(words.map(stem));
}

// ---------- banned-terms ----------

const BANNED: { term: string; re: RegExp }[] = [
  { term: 'delve', re: /\bdelv(?:e|es|ed|ing)\b/i },
  { term: 'leverage', re: /\bleverag(?:e|es|ed|ing)\b/i },
  { term: 'seamless', re: /\bseamless(?:ly)?\b/i },
  { term: 'robust', re: /\brobust(?:ly|ness)?\b/i },
  { term: 'cutting-edge', re: /\bcutting[-\s]edge\b/i },
  { term: 'passionate about', re: /\bpassionate\s+about\b/i },
  { term: "in today's fast-paced", re: /\bin\s+today['’]s\s+fast[-\s]paced\b/i },
  { term: 'unlock', re: /\bunlock(?:s|ed|ing)?\b/i },
  { term: 'empower', re: /\bempower(?:s|ed|ing|ment)?\b/i },
  { term: 'journey', re: /\bjourneys?\b/i },
  { term: 'testament', re: /\btestaments?\b/i },
  { term: 'elevate', re: /\belevat(?:e|es|ed|ing)\b/i },
];

function bannedTerms(b: Block): Hit[] {
  const hits: Hit[] = [];
  for (const s of splitSentences(b.text)) {
    for (const { term, re } of BANNED) {
      if (re.test(s)) hits.push(hit('banned-terms', b, s, `banned term "${term}"`));
    }
  }
  return hits;
}

// ---------- not-just-but ----------

const NOT_JUST: RegExp[] = [
  /\bnot\s+(?:just|only|merely|simply)\b[^.!?]*?\bbut\b/i,
  /\b(?:is|are|was|were)n['’]t\s+(?:just|only|merely|simply)\b[^.!?]*?[,;:—–]\s*(?:it|they|this|that)(?:['’]s|\s+(?:is|are|was|were))\b/i,
  /\b(?:is|are)n['’]t\s+about\b[^.!?]*?\b(?:it|they)(?:['’]s|\s+(?:is|are))\s+about\b/i,
  /\bmore\s+than\s+just\b/i,
];

function notJustBut(b: Block): Hit[] {
  return splitSentences(b.text)
    .filter((s) => NOT_JUST.some((re) => re.test(s)))
    .map((s) => hit('not-just-but', b, s, '"not just X, but Y" construction'));
}

// ---------- em-dash ----------

function emDash(b: Block): Hit[] {
  const n = (b.text.match(/—/g)?.length ?? 0) + (b.text.match(/\s--\s/g)?.length ?? 0);
  return n > 1 ? [hit('em-dash', b, b.text, `${n} em dashes in one paragraph (max 1)`)] : [];
}

// ---------- triplet ----------

const INTRO_PHRASE =
  /^(?:over|before|after|in|on|at|for|when|if|since|by|with|without|during|today|now|then|later|also|however|so|still|instead|here|there|again)\b/i;
/** A part starting with one of these qualifies the item before it ("reliable, especially in …"); it isn't an item. */
const QUALIFIER_START = /^(?:especially|including|such as|mainly|mostly|particularly|like)\b/i;
/** A part starting with one of these opens a new clause; it can start a list but isn't a middle item. */
const CLAUSE_START = /^(?:so|but|because|where|which|while|whose|who|when|although|though|since|unless|whereas)\b/i;
const CONJ_START = /^(?:and|or)\s+/i;
const CONJ_INSIDE = /\s(?:and|or)\s/i;
/** "A, B and C": the item before the conjunction is short. Longer means a phrase like "systems for banks and insurers". */
const MAX_WORDS_BEFORE_CONJ = 4;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Number of items in each coordinated list ("A, B and C" / "A, B, and C") in a clause. */
function listSizes(clause: string): number[] {
  // Qualifier phrases ("…, especially in X, …") attach to the previous item, so they aren't counted.
  const parts = clause
    .split(/,\s+/)
    .map((p) => p.trim())
    .filter((p, i) => p && (i === 0 || !QUALIFIER_START.test(p)));
  const sizes: number[] = [];
  let start = 0;
  if (parts.length > 1 && INTRO_PHRASE.test(parts[0]!) && words(parts[0]!) <= 5) start = 1;
  for (let k = start; k < parts.length; k++) {
    const p = parts[k]!;
    if (k > start && CLAUSE_START.test(p)) {
      start = k;
      continue;
    }
    if (k > start && CONJ_START.test(p)) {
      sizes.push(k - start + 1); // Oxford comma: "A, B, and C"
      start = k; // the closing part's tail can open the next list ("makes it free, offline, …")
      continue;
    }
    const conj = p.match(CONJ_INSIDE);
    if (conj && !CONJ_START.test(p) && words(p.slice(0, conj.index)) <= MAX_WORDS_BEFORE_CONJ) {
      if (k > start) sizes.push(k - start + 2); // "A, B and C"
      start = k;
    }
  }
  return sizes;
}

export function tripletCount(sentence: string): number {
  let count = 0;
  // Parenthetical lists, e.g. "(Vale of Eternity, Flamecraft, Splendor)".
  const parens = [...sentence.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]!);
  for (const inner of parens) {
    const items = inner.split(/,\s+/);
    const conj = listSizes(inner);
    if (conj.length) count += conj.filter((n) => n === 3).length;
    else if (items.length === 3) count++;
  }
  const main = sentence.replace(/\([^()]*\)/g, '');
  for (const clause of main.split(/[;:]\s+|\s+[—–]\s+/)) count += listSizes(clause).filter((n) => n === 3).length;
  return count;
}

function triplet(b: Block): Hit[] {
  if (b.kind === 'heading') return [];
  return splitSentences(b.text)
    .filter((s) => tripletCount(s) > 0)
    .map((s) => hit('triplet', b, s, 'group of three; acknowledge if every item is concrete'));
}

// ---------- closing-restatement ----------

const SUMMARY_OPENER =
  /^(?:in short|overall|ultimately|in the end|all in all|in summary|to sum up|simply put|put simply|in other words|that['’]s why|this is why|this means|the result(?: is)?|over time|at the end of the day)\b/i;

function closingRestatement(b: Block): Hit[] {
  if (b.kind !== 'paragraph') return [];
  const sentences = splitSentences(b.text);
  if (sentences.length < 3) return [];
  const last = sentences[sentences.length - 1]!;
  if (SUMMARY_OPENER.test(last)) return [hit('closing-restatement', b, last, 'closing sentence opens with a summary phrase')];
  const lastWords = contentWords(last);
  if (lastWords.size < 4) return [];
  const before = contentWords(sentences.slice(0, -1).join(' '));
  const shared = [...lastWords].filter((w) => before.has(w)).length;
  if (shared / lastWords.size >= 0.7)
    return [hit('closing-restatement', b, last, `closing sentence repeats the paragraph (${shared}/${lastWords.size} words)`)];
  return [];
}

/** A sentence that mostly repeats an earlier sentence in the same section. */
export function repeatedSentences(blocks: Block[]): Hit[] {
  const hits: Hit[] = [];
  const seen = new Map<string, { sentence: string; words: Set<string> }[]>();
  for (const b of blocks) {
    if (b.kind !== 'paragraph') continue;
    const key = `${b.file}::${b.section}`;
    const earlier = seen.get(key) ?? [];
    for (const s of splitSentences(b.text)) {
      // Only full prose sentences; skips label lines like "Venue: …" and list fragments.
      if (!/[.!?]["”’')]*$/.test(s)) continue;
      const words = contentWords(s);
      if (words.size >= 3) {
        const match = earlier.find((e) => {
          const shared = [...words].filter((w) => e.words.has(w)).length;
          return shared / words.size >= 0.6 && shared >= 3;
        });
        if (match)
          hits.push(hit('closing-restatement', b, s, `repeats an earlier sentence: "${match.sentence}"`));
      }
      earlier.push({ sentence: s, words });
    }
    seen.set(key, earlier);
  }
  return hits;
}

// ---------- runner ----------

function hit(rule: RuleId, b: Block, sentence: string, message: string): Hit {
  return { rule, file: b.file, line: b.line, message, sentence };
}

const PER_BLOCK: ((b: Block) => Hit[])[] = [bannedTerms, notJustBut, emDash, triplet, closingRestatement];

export function runRules(blocks: Block[]): Hit[] {
  const hits = [...blocks.flatMap((b) => PER_BLOCK.flatMap((r) => r(b))), ...repeatedSentences(blocks)];
  const byLine = new Map(blocks.map((b) => [`${b.file}:${b.line}`, b.disabled]));
  const unique = new Map<string, Hit>();
  for (const h of hits) {
    if (byLine.get(`${h.file}:${h.line}`)?.has(h.rule)) continue;
    unique.set(`${h.rule}|${h.file}|${h.line}|${h.sentence}`, h);
  }
  return [...unique.values()].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
