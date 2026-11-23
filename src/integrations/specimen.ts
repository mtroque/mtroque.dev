import type { AstroIntegration } from 'astro';

/**
 * /specimen/: a type and component specimen for design review.
 * Exists in `astro dev`, or in a build only when SPECIMEN=1 (for screenshots). Never in deploys.
 */
export default function specimen(): AstroIntegration {
  return {
    name: 'specimen',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command === 'dev' || process.env.SPECIMEN === '1') {
          if (process.env.VERCEL) throw new Error('SPECIMEN=1 is for local screenshots only');
          injectRoute({ pattern: '/specimen', entrypoint: './src/dev/Specimen.astro' });
        }
      },
    },
  };
}
