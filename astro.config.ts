import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { resolveSiteUrl } from './src/config/site-url';

export default defineConfig({
  site: resolveSiteUrl(),
  trailingSlash: 'always',
  output: 'static',
  integrations: [mdx(), sitemap()],
});
