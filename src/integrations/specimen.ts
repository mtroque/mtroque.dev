import type { AstroIntegration } from 'astro';

type Env = Record<string, string | undefined>;

/**
 * Whether to build /specimen/ (design review page).
 *   - `astro dev`: yes
 *   - Vercel preview deploys (VERCEL_ENV=preview): yes, to check the design on a phone
 *   - local builds with SPECIMEN=1: yes (for screenshots)
 *   - Vercel production (VERCEL_ENV=production): never. Asking for it there fails the build.
 */
export function specimenEnabled(command: string, env: Env): boolean {
  if (env.VERCEL_ENV === 'production') {
    if (env.SPECIMEN === '1') throw new Error('SPECIMEN=1 is not allowed in production builds');
    return false;
  }
  return command === 'dev' || env.VERCEL_ENV === 'preview' || env.SPECIMEN === '1';
}

export default function specimen(): AstroIntegration {
  return {
    name: 'specimen',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (specimenEnabled(command, process.env)) {
          injectRoute({ pattern: '/specimen', entrypoint: './src/dev/Specimen.astro' });
        }
      },
      // Belt and braces: a production build must not contain the page, whatever the config did.
      'astro:build:done': ({ pages }) => {
        if (process.env.VERCEL_ENV === 'production' && pages.some((p) => p.pathname.startsWith('specimen'))) {
          throw new Error('Production build contains /specimen/');
        }
      },
    },
  };
}
