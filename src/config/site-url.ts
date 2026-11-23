/**
 * The single place the site's own address is decided.
 *
 * 1. SITE_URL, if set (set it in Vercel when the custom domain goes live).
 * 2. Otherwise Vercel's production host for this project.
 * 3. Otherwise localhost, for local dev and builds.
 *
 * Everything else (canonical tags, OG image URLs, robots.txt, sitemap)
 * reads Astro.site, which astro.config.ts sets from this function.
 * Never write this site's domain anywhere else; `pnpm check:domains` enforces it.
 */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.SITE_URL?.trim();
  if (explicit) return new URL(explicit).origin;
  const vercelProd = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) return `https://${vercelProd}`;
  return 'http://localhost:4321';
}

/** True only for Vercel production deployments. */
export const isProductionDeploy = (env: Record<string, string | undefined> = process.env) =>
  env.VERCEL_ENV === 'production';
