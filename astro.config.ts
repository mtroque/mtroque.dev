import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { resolveSiteUrl } from './src/config/site-url';
import todoGate from './src/integrations/todo-gate';
import specimen from './src/integrations/specimen';
import rehypeTableLabels from './src/lib/rehype-table-labels';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

// UI strings live in ui.yaml; the table plugin needs the screen-reader label for ✓.
const ui = parseYaml(readFileSync('./src/content/ui.yaml', 'utf8'));

export default defineConfig({
  site: resolveSiteUrl(),
  trailingSlash: 'always',
  output: 'static',
  markdown: {
    // unified (remark/rehype) instead of Astro 7's default processor, for the table plugin.
    // MDX inherits it. SmartyPants off: render the copy's exact characters (straight quotes).
    processor: unified({ smartypants: false, rehypePlugins: [[rehypeTableLabels, { checkLabel: ui.checkLabel }]] }),
  },
  integrations: [
    mdx(), sitemap({ filter: (page) => !page.includes('/specimen') }), todoGate(), specimen()],
});
