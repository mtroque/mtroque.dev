# Site content

The copy now lives in typed collections under `src/content/`. Edit it there.

| What | Where |
|---|---|
| Intro, links, contact, section notes | `src/content/profile.yaml` |
| UI labels (nav, link labels, toggles) | `src/content/ui.yaml` |
| Personal projects and case studies | `src/content/projects/*.mdx` |
| Experience | `src/content/experience/*.yaml` |
| Patent | `src/content/patents/*.yaml` |
| Publications and their groups | `src/content/publications/*.yaml`, `src/content/publication-groups.yaml` |
| Certifications | `src/content/certifications.yaml`, `src/content/cert-vendors.yaml` |

Rules that still apply:

- `[[TODO: what's needed]]` marks anything still to supply. `pnpm todos` lists them; production builds fail while any remain.
- PwC work is client-confidential: nothing beyond what `experience/pwc.yaml` says.
- The patent shows only titles, status and offices until `published: true`.
- Paper titles are locked in `titles.lock`.
- `pnpm lint:copy` checks every string against the copy rules in `docs/PLAN.md` §5.

The last full version of this file is in commit 315561c. To confirm the collections still match it:
`pnpm check:verbatim --ref 315561c`
