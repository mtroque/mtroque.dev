import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { resolveSiteUrl } from './src/config/site-url';
import todoGate from './src/integrations/todo-gate';

export default defineConfig({
  site: resolveSiteUrl(),
  trailingSlash: 'always',
  output: 'static',
  // Render the copy's characters exactly (no automatic curly quotes), same as YAML-sourced text.
  markdown: { smartypants: false },
  integrations: [mdx(), sitemap(), todoGate()],
});
