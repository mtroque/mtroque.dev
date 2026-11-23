# mtroque.dev

Personal site of Matthew Roque. Astro, static output, deployed on Vercel.
See `docs/PLAN.md` for the plan and decisions.

```sh
pnpm install
pnpm dev            # local dev server
pnpm check          # types, content schemas, repo checks, tests
pnpm build          # production build
```

The site's own address comes from the `SITE_URL` env var (falls back to Vercel's
production host). Don't hard-code it; `pnpm check:domains` fails if you do.
