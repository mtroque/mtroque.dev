import type { APIRoute } from 'astro';
import { isProductionDeploy } from '../config/site-url';

export const GET: APIRoute = ({ site }) => {
  const body = isProductionDeploy()
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site)}\n`
    : `User-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
