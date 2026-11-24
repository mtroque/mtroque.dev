/**
 * Makes Markdown tables readable on phones without changing the Markdown:
 *  - copies each column header into data-label on its body cells (CSS shows it when rows stack)
 *  - adds explicit ARIA table roles, since some browsers drop table semantics when CSS
 *    changes `display` on table elements
 *  - renders every ✓ as a drawn check mark (both site fonts draw ✓ like a square-root sign),
 *    with visually hidden text (e.g. "Yes") for screen readers
 */
import type { Element, ElementContent, Root, Text } from 'hast';
import { visit } from 'unist-util-visit';

const textOf = (n: ElementContent): string =>
  n.type === 'text' ? n.value : n.type === 'element' ? n.children.map(textOf).join('') : '';

const ROLES: Record<string, string> = { table: 'table', thead: 'rowgroup', tbody: 'rowgroup', tr: 'row', th: 'columnheader', td: 'cell' };

function checkMarks(text: Text, label: string): ElementContent[] {
  const parts = text.value.split('✓');
  const out: ElementContent[] = [];
  parts.forEach((p, i) => {
    if (i > 0)
      out.push(
        { type: 'element', tagName: 'span', properties: { className: ['check'], ariaHidden: 'true' }, children: [] },
        { type: 'element', tagName: 'span', properties: { className: ['visually-hidden'] }, children: [{ type: 'text', value: label }] },
      );
    if (p) out.push({ type: 'text', value: p });
  });
  return out;
}

export default function rehypeTableLabels(options: { checkLabel: string }) {
  return (tree: Root) => {
    visit(tree, 'element', (table: Element) => {
      if (table.tagName !== 'table') return;
      const headers: string[] = [];
      visit(table, 'element', (el: Element) => {
        const role = ROLES[el.tagName];
        if (role) el.properties = { ...el.properties, role };
        if (el.tagName === 'th') headers.push(el.children.map(textOf).join('').trim());
      });
      visit(table, 'element', (row: Element) => {
        if (row.tagName !== 'tr') return;
        row.children
          .filter((c): c is Element => c.type === 'element' && c.tagName === 'td')
          .forEach((td, i) => {
            td.properties = { ...td.properties, dataLabel: headers[i] ?? '' };
            const content = td.children.flatMap((c) => (c.type === 'text' && c.value.includes('✓') ? checkMarks(c, options.checkLabel) : [c]));
            // One wrapper, so a stacked (flex) row is just "label | value" on phones.
            td.children = [{ type: 'element', tagName: 'span', properties: { className: ['cell'] }, children: content }];
          });
      });
      table.properties = { ...table.properties, className: ['data-table'] };
    });
  };
}
