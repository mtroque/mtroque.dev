# mtroque.dev: build plan

Status: approved 2026-11-23 (Direction A, Astro). Decisions from review are logged below; §6 keeps the original questions for reference.
Source of truth for copy: `docs/CONTENT.md` until Milestone 2, then `src/content/` (Q-G2).

## Decisions from review (2026-11-23)

- **Copy fixes applied to CONTENT.md:** removed the PROMPT.md reference; deleted "Rules that don't help get retired." from Strop's How it compares; removed the factory-PR Media item (Q-T3); Strop gets a Source link (https://github.com/mtroque/strop) and its status is now just "In development."
- **Allowlist:** "Over time, more of the guardrails are deterministic…" is kept and acknowledged for `closing-restatement`. Triplet hits are reported in Milestone 1 for you to decide.
- **Strop:** source link shown on card and case study like Tablekeeper's, `In development` stamp kept, the in-development/source-link refine removed, `statusNote` dropped.
- **Q-G2** yes · **Q-G3** system dark mode · **Q-G4** Projects · Experience · Research · Certifications · Contact.
- **Q-G5:** Vercel Web Analytics, loaded only when `VERCEL_ENV=production`.
- **Q-G6:** repo is public. Nothing private goes in commits, TODO text or the allowlist.
- **Q-G7:** create public `mtroque/mtroque.dev` with `gh`; Vercel project under the personal account.
- **Q-I1–3, Q-P1–2, Q-T5–6, Q-R2–5, Q-C1, Q-K1:** recommendations accepted. **Q-E1:** leave as written.
- **Q-T1:** alt-text drafts shown to you before use; no captions. **Q-T3:** factory-PR slot dropped. **Q-T4:** MP4/WebM video with poster.
- **Q-T2:** Patchwork. Answered: "Can I rotate and flip a patch when I place it?" Not covered: "What's a good strategy for beginners?" The rules flow runs only with `pnpm media --rules`; normal runs reuse the saved capture. Both answers are checked when captured.
- **Q-R1:** headings kept as written, balanced with option (c): same mono size and a paper count on each heading rule.

## Decisions during build

- **Contact line** reworded by you to two sentences; the triplet rule now ignores qualifier phrases ("especially…", "including…", "such as…", "mainly…", "mostly…", "particularly…", "like…").
- **13 triplets** kept and acknowledged in `copy-lint.allow.yaml` with your reasons; 4 rewritten by you.
- **Work happens on the `build` branch** (preview deploys); `main` moves to production only on your approval.
- **SmartyPants off:** rendered text keeps the copy's exact characters (straight quotes), the same for MDX and YAML-sourced text. Approved 2026-11-23. If curly quotes are revisited during design, they apply to every page, and `check:verbatim` must treat straight and curly quotes as equal.
- **CONTENT.md retired** after migration. Commit 315561c holds the last full version. `pnpm check:verbatim` (in `pnpm check`, CI fetches full history) compares the collections against it.
- **Approved copy changes after migration** are logged in `docs/copy-changes.yaml` (before, after, reason, date) and applied to the baseline by `check:verbatim`. First entry: "That's why I built Strop, below." → "That's why I built Strop." with Strop linked to its case study, because the full case study lives on its own page.
- **/specimen/ on previews** (approved 2026-11-24): built in dev, on Vercel previews and with `SPECIMEN=1`; noindex, not in the sitemap; production builds never contain it (refused, with tests).
- **Fonts** (2026-11-24): subset by `pnpm fonts` from upstream files pinned to a google/fonts commit and SHA-256. Latin + Latin-1, curly quotes, dashes, ellipsis, ✓, plus every character in the copy (`pnpm check:fonts` fails if new copy needs more). Serif: weights 400–650, optical sizes 12–48, no OpenType alternates (so lining numerals, no fi/fl ligatures). Only the serif file is preloaded; all faces use `font-display: swap`. Total 85.3 KB (serif 57.9, mono 400 13.5, mono 500 13.8).
- **OpenType features** (2026-11-24): no CSS requests any. The serif subset's default figures are lining and equal-width; `pnpm check:font-features` shapes text to prove any requested feature changes glyphs, so faked small caps or ignored figure styles fail CI.
- **Vercel scope** confirmed: `bunny-budget` is the slug of the personal Hobby account (the user's default team, OWNER); project `mtroque-dev` linked to `mtroque/mtroque.dev`.
- **SEA-VL authors** (approved 2026-11-24, logged in `docs/copy-changes.yaml`): "Samuel Cahyawijaya, Holy Lovenia, … **Matthew Theodore Roque**, … et al." Name as published in ACL Anthology 2025.acl-long.916, author 36 of 92. The parenthetical and the `authorNote` field are gone; author lists support `{ gap: true }` for "…". This supersedes Q-R2.
- **Certifications** (approved 2026-11-24, logged): all 19 listed plainly by vendor, highest level first. The featured/more split and the "+ N more" toggle are removed from the schema, content and UI strings; `badgeUrl` stays optional.
- **Paper links:** every paper shows all its links as visible labels separated by "·" (e.g. "ACL Anthology · arXiv"), in addition to the title link.
- **Copy and display changes, 2026-11-24** (each logged in `docs/copy-changes.yaml`): "Architect – Professional" (was "Claude Certified Architect – Professional"); vendor group "Claude" (was "Anthropic (Claude)"); Samsung.com chatbot qualifier replaced by the sentence "Live in the US, Canada, UK, Australia and India."; PwC confidentiality note removed (qualifiers kept); date ranges as "May 2026 – Present" via the formatter. Work-project titles stay in sentence case.
- **Links never contain trailing punctuation** (the Samsung "Research" line was the only case; all 79 links checked).
- **Footer:** "© Matthew Roque", no year (a build-time year goes stale between deploys).
- **Case studies (M7):** Astro 7's default Markdown processor doesn't run rehype plugins, so `markdown.processor` is `unified({ smartypants: false, rehypePlugins })` from `@astrojs/markdown-remark` (MDX inherits it). The games table gets ARIA roles, per-cell labels for the phone layout, and a drawn check mark with hidden "Yes" text (both fonts draw ✓ like √). Numbers are not echoed as margin notes, as the wireframe once suggested: that would duplicate copy.
- **Clips:** `<video>` with poster; autoplay only without reduced motion and only on screen; Play/Pause button; native controls without JS. `pnpm check:motion` tests this in a browser on the specimen's test clip and runs in CI.


Throughline for every decision below: **I build AI agents and make them trustworthy.** The design treats the site like an evidence file: every claim sits next to the thing that backs it (a paper, a patent, a number, a demo).

---

## 0. Things I found while reading CONTENT.md

These shape the plan, so they come first.

1. **There are no `[[TODO: ...]]` markers in CONTENT.md.** The only one is the format example on line 4. The TODOs the site will have come from things the plan adds: the four Tablekeeper media slots (until `pnpm media` runs) and anything you answer "leave a TODO" to in §6.
2. **Line 92 points to `PROMPT.md`**, which doesn't exist. It's inside the Media heading, which isn't rendered, so it has no effect on the site.
3. **A manual preview of the copy check** (the real script lands in Milestone 1, and I'll report its actual output then):
   - Banned terms: 0 hits. Em dashes: 0 in the whole file. "Not just X, but Y": 0 hits.
   - Groups-of-three candidates (the check will flag these; you decide which are reflexive):
     - L41 Tablekeeper card blurb: "scores…, answers…, and keeps…"
     - L163 Regulatory change assistant: "reads…, checks…, and works out…"
     - L173 Test cases entry: "software development, testing, and internal process and compliance"
     - L263 Contact: "making agents reliable, AI in regulated industries, or research collaborations"
     - L75, L81, L86, L215 are also triplets, but each item is concrete (three pipeline steps, three observed workarounds, three named games, three collection methods). I expect you'll keep these; the check makes you say so once (see §5).
   - Closing-restatement candidates:
     - L138 "Over time, more of the guardrails are deterministic, and "done" can be trusted more."
     - L147 "Rules that don't help get retired." (repeats L138's "Rules that don't reduce the problem get retired.")
   - Paper titles with three-part lists ("Crowdsource, Crawl, or Generate?", "Scaling, Simplification, and Adaptation") are excluded from the check, since titles are never edited.

I have not changed any copy.

---

## 1. Information architecture

### Routes

| Route | Content | Source |
|---|---|---|
| `/` | The whole site: six sections on one scrolling page | `profile`, `projects`, `experience`, `patents`, `publications`, `certifications` collections |
| `/projects/tablekeeper/` | Case study | `projects/tablekeeper.mdx` |
| `/projects/strop/` | Case study | `projects/strop.mdx` |
| `/og/<page>.png` | Build-time Open Graph image per page | generated |
| `/sitemap-index.xml`, `/robots.txt` | Generated from the single site URL | generated |
| `/404` | Short not-found page linking home | template |

Section anchors on `/`: `#projects`, `#experience`, `#publications`, `#certifications`, `#contact`. Stable IDs so links from case studies and the bio work.

### Home page, section by section

Desktop wireframe (Direction A, chosen in §3). Mobile is a single column; margin notes move inline under their paragraph.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Matthew Roque                     Projects Experience Research ...   │  ← slim header, anchor nav (Q-G4)
├───────────┬──────────────────────────────────────┬───────────────────┤
│ §0        │ I build AI agents for work where     │ Taguig,           │
│           │ mistakes are expensive, and the      │ Philippines       │
│           │ checks that show whether they did    │                   │
│           │ the job.                             │ GitHub ↗          │
│           │                                      │ LinkedIn ↗        │
│           │ I'm a Senior AI Engineer at PwC, …   │ Google Scholar ↗  │
│           │ The question I keep coming back to…  │ Email             │
│           │ Before PwC, …                        │ [CV slot, empty]  │
├───────────┼──────────────────────────────────────┼───────────────────┤
│ §1        │ Personal Projects                    │                   │
│ Personal  │ Things I build on my own time, …     │                   │
│ Projects  │ ┌──────────────────────────────────┐ │                   │
│           │ │ Tablekeeper · Board game compan… │ │ Live app ↗        │
│           │ │ blurb                            │ │ Source ↗          │
│           │ │ TypeScript · Next.js · …         │ │                   │
│           │ │ Read the case study →            │ │                   │
│           │ └──────────────────────────────────┘ │                   │
│           │ ┌──────────────────────────────────┐ │                   │
│           │ │ Strop · Turning coding-agent …   │ │ [In development]  │
│           │ │ blurb                            │ │                   │
│           │ │ Read the case study →            │ │                   │
│           │ └──────────────────────────────────┘ │                   │
├───────────┼──────────────────────────────────────┼───────────────────┤
│ §2 …      │ Experience, Publications, Certs, Contact follow the same │
│           │ three-column rhythm                                      │
└───────────┴──────────────────────────────────────────────────────────┘
```

Where each part of CONTENT.md goes:

| # | Section | CONTENT.md source | Layout |
|---|---|---|---|
| 0 | **Intro** | Meta (name, location, links) · Intro (headline, bio) | `h1` is the name, set small. Headline is the large lede. Three bio paragraphs as written. Link list in the margin (stacked under the bio on mobile): GitHub, LinkedIn, Google Scholar, Email. Text links with the service name, no icon-only buttons. A `cv` field in `profile` renders a "CV (PDF)" link when set; empty now, so nothing renders. |
| 1 | **Personal Projects** | Personal Projects: section note, each project's title, tagline, card blurb, links, stack, status | Section note under the heading. One card per project, stacked full-width (two entries, no grid). Card: title · tagline, blurb, stack as a mono line, "Read the case study" link. Tablekeeper's margin holds Live app + Source. Strop shows an `In development` status stamp and its Source link. Whole card is not one giant link; the title and "Read the case study" are the links, so the external links stay separately clickable. |
| 2 | **Experience** | Experience | PwC then Samsung. Per employer: org name, role · dates · location as a mono meta line, optional section note (PwC's confidentiality note). Each project is a short entry: bold title, qualifier ("major bank", "5 regions (US, …)") as a small mono tag, description. Samsung's "Research" entry renders as a link to `#publications`. |
| 3 | **Selected Patents & Publications** | Selected Patents & Publications | Patent first, as its own block: display title, official title smaller beneath, then "Patent pending · USPTO, KIPO, IPOPHL". Nothing else (enforced in the schema, §2). Then three groups in a fixed order, each with its heading and papers. Per paper: title (linked to the first link), venue · location, author list with my name bold and `*` on equal-contribution authors, summary, link row. One footnote at the end of the section: "* Equal contribution" (Q-R3). |
| 4 | **Certifications** | Certifications | One compact row per vendor, highest level first: vendor name in mono, then all of that vendor's certifications listed plainly (19 in total, no toggle; changed 2026-11-24). Set smaller than body text, no badges, so it reads lighter than Projects and Publications. |
| 5 | **Contact** | Contact | The one paragraph, with the email as a `mailto:` link. |

Not on the page: "Meta" notes (site address, no CV), section-note labels, the Certifications display instructions, the Media lists, and the "Display my name in bold" note. These become schema fields or rendering rules instead of text.

### Case study pages

Section order follows CONTENT.md exactly.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Matthew Roque                                                      │
├───────────┬──────────────────────────────────────┬───────────────────┤
│ Contents  │ Tablekeeper                          │ Live app ↗        │
│ (sticky,  │ Board game companion                 │ Source ↗          │
│ desktop)  │                                      │ Stack: TypeScript,│
│           │ ## The problem                       │ Next.js, …        │
│ Problem   │ …                                    │                   │
│ What it   │ ## What it does                      │                   │
│  does     │ - Photo scoring …                    │                   │
│ Design    │   [ media slot: photo → score GIF ]  │                   │
│ Accuracy  │ - Rules assistant …                  │                   │
│ Built     │   [ media slot: rules answers ]      │                   │
│ Next      │ [ games table / stacked on phone ]   │                   │
│           │ ## Design decisions …                │                   │
│           │ ## How accurate is it?               │ 691 / 696         │
│           │                                      │ 148 / 150         │  ← numbers echoed as margin notes
│           │ ## How it's built …                  │                   │     (only numbers already in the copy)
└───────────┴──────────────────────────────────────┴───────────────────┘
```

- **Tablekeeper:** header (title, tagline, links, stack) → The problem → What it does (with the games table) → Design decisions → How accurate is it? → How it's built → What's next.
- **Strop:** header (title, tagline, `In development` stamp, Source link) → Why "Strop" → The problem → What it reads → What it finds → How it fixes them → Does the fix work? → How it compares.
- **Scanning:** `h2` per CONTENT.md bold heading, a sticky contents list on desktop (collapses to a short "On this page" list under the header on phone), measure capped at ~66 characters, bold lead-ins on list items kept as written.
- **Games table on a phone:** it stays a real Markdown table in the MDX file. A small rehype plugin copies each column header into a `data-label` on its cells. Below 40rem, CSS turns each row into a block: the game name as a heading, then three labeled lines ("Rules assistant ✓", "Photo scoring ✓ (you set stack heights)", …). Screen readers still get a table. Each `✓` gets a visually hidden "Yes" (Q-T6).
- **Media slots** (Tablekeeper only; Strop has no Media list). The Media list is not rendered as text. Each item becomes a `<Media id="…">` placed next to the copy it illustrates:

  | Media item | Placed under |
  |---|---|
  | GIF: photo to score on Patchwork | What it does → Photo scoring |
  | Screenshot: rules answer + "rulebook doesn't say" | What it does → Rules assistant |
  | Screenshot: Harmonies breakdown | Design decisions → "The app drafts; you confirm." |

  Until a file exists, the slot renders a dashed frame at the final aspect ratio (390×844) with the text `[[TODO: <the Media item's description>]]`, so it's visible on previews and caught by the production TODO gate.
- **Reduced motion:** recommended format is a muted, looping `<video>` (MP4 + WebM) with a poster frame, about 5 to 10 times smaller than the same clip as GIF. It autoplays only under `prefers-reduced-motion: no-preference` (decided by a ~10-line script); otherwise the poster shows with a play button. Every animated slot has a visible pause control. If you'd rather ship real GIFs (Q-T4), the no-JS fallback is `<picture>` with `<source media="(prefers-reduced-motion: reduce)" srcset="poster.png">`, which shows the static poster to those users.

---

## 2. Content schemas

All collections use Astro's Content Layer with Zod schemas in `src/content.config.ts`. `astro check` and `astro build` fail on any entry that doesn't match, so adding a paper or cert means adding one file, never touching layout code.

```ts
// profile: singleton, src/content/profile.yaml
profile = z.object({
  name: z.string(),                       // "Matthew Roque"
  location: z.string(),
  headline: z.string(),
  bio: z.array(z.string()),               // paragraphs, verbatim; inline Markdown allowed for links
  links: z.array(z.object({ label: z.string(), href: z.string() })),
  cv: z.string().optional(),              // path to PDF; renders a link only when set
  sectionNotes: z.object({ projects: z.string() }),
  contact: z.string(),                    // the Contact paragraph
});

// projects: src/content/projects/<slug>.mdx (frontmatter + case-study body)
projects = z.object({
  title: z.string(),                      // "Tablekeeper"
  tagline: z.string(),                    // "Board game companion"
  order: z.number(),
  blurb: z.string(),                      // home-page card text
  status: z.enum(['live', 'in-development']),
  links: z.object({ live: z.string().url().optional(), source: z.string().url().optional() }),
  stack: z.array(z.string()).default([]),
  media: z.array(z.object({
    id: z.string(),                       // referenced by <Media id="…"> in the body
    kind: z.enum(['gif', 'screenshot']),
    description: z.string(),              // from CONTENT.md's Media list; placeholder text + alt draft
    src: image().optional(),              // absent → placeholder slot
    video: z.object({ mp4: z.string(), webm: z.string().optional() }).optional(),
    poster: image().optional(),
    optional: z.boolean().default(false),
  })).default([]),
});

// experience: src/content/experience/<org>.yaml
experience = z.object({
  org: z.string(),
  role: z.string(),
  start: z.string().regex(/^\d{4}-\d{2}$/),   // "2026-05"
  end: z.string().regex(/^\d{4}-\d{2}$/).optional(),  // absent = "present"
  location: z.string(),
  order: z.number(),
  note: z.string().optional(),
  confidential: z.boolean().default(false),
  entries: z.array(z.object({
    title: z.string(),
    qualifier: z.string().optional(),     // "major bank"
    body: z.string().optional(),
    href: z.string().optional(),          // Samsung "Research" → "#publications"
  })),
}).refine(e => !e.confidential || e.entries.every(x => !x.href),
  'Confidential employers get no outbound links');

// publicationGroups: src/content/publication-groups.yaml
publicationGroups = z.object({ id: z.string(), heading: z.string(), order: z.number() });

// publications: src/content/publications/<slug>.yaml
publications = z.object({
  title: z.string(),                      // verbatim; locked by check:titles (§5)
  group: reference('publicationGroups'),
  order: z.number(),                      // order within its group
  venue: z.string(),                      // "ACL 2025 (Main Conference)"
  location: z.string(),                   // "Vienna, Austria"
  year: z.number(),
  authors: z.array(z.union([            // in published order
    z.object({
      name: z.string(),
      me: z.boolean().default(false),     // rendered bold
      equal: z.boolean().default(false),  // rendered with *
    }),
    z.object({ gap: z.literal(true) }),   // omitted authors, rendered as "…"
  ])),
  etAl: z.boolean().default(false),
  links: z.array(z.object({
    kind: z.enum(['acl', 'arxiv', 'ieee', 'pdf', 'other']),
    url: z.string().url(),
    label: z.string().optional(),         // default label from kind
  })).min(1),
  summary: z.string(),
});

// patents: src/content/patents/<slug>.yaml
patents = z.object({
  displayTitle: z.string(),
  officialTitle: z.string(),
  status: z.enum(['pending', 'granted']),
  published: z.boolean().default(false),  // flip only after you confirm publication
  offices: z.array(z.object({
    office: z.string(),                   // "USPTO" | "KIPO" | "IPOPHL" | …
    applicationNumber: z.string().optional(),
    publicationNumber: z.string().optional(),
    grantNumber: z.string().optional(),
    url: z.string().url().optional(),
  })).min(1),
  description: z.string().optional(),
}).refine(p => p.published || (!p.description &&
    p.offices.every(o => !o.applicationNumber && !o.publicationNumber && !o.grantNumber && !o.url)),
  'Unpublished patent: only titles, status and office names are allowed');

// certVendors + certifications: src/content/certifications.yaml (one file, easy to edit)
certVendors = z.object({ id: z.string(), name: z.string(), order: z.number() }); // "Anthropic (Claude)"
certifications = z.object({
  vendor: reference('certVendors'),
  name: z.string(),
  order: z.number(),                      // highest level first within vendor
  badgeUrl: z.string().url().optional(),
});

// ui: src/content/ui.yaml: every UI string (nav labels, "Read the case study",
// footnote text) in one place so the copy check covers it.
```

The patent refine means numbers can't even be stored in the repo until `published: true`. That matters if the repo is public (Q-G6).

**Adding a blog later:** add a `posts` collection (glob of `.mdx`), a `/writing/[slug]` route that reuses the same `Prose` layout the case studies use, and one nav entry. No redesign.

---

## 3. Design directions

Both reject the banned patterns: no gradients, glass, blobs, icon grids, emoji, waving hero or template look. Both use the existing copy only; the motifs restyle it, they don't add text.

### Direction A: "Annotated record" (my pick)

The page reads like a well-kept lab notebook or a reviewed document: a main text column with a margin of annotations.

- **Type:** Source Serif 4 for headings and body (optical sizes, built for long reading) + IBM Plex Mono for metadata: dates, venues, statuses, stack lines, numbers. Both OFL, self-hosted via Fontsource, subset to Latin, two weights each.
- **Palette:** paper `#FAF8F3`, ink `#1C1B19`, muted ink `#6B675F` (≈5.3:1 on paper), rules `#D9D4C7`, one accent `#8C2F1B` (oxblood) for links and annotation markers. Dark scheme follows the system: paper `#161513`, ink `#ECE8DF`, accent `#E0866B`. All pairs checked to WCAG AA in Milestone 3.
- **Layout:** three columns on desktop: a narrow left rail with section numbers (`§1 Personal Projects`), a ~38rem text column, a ~14rem right margin for notes. One column on phones, notes inline.
- **Motifs, tied to the throughline:**
  - **Margin notes** carry the evidence beside the claim: links beside the bio, venue beside each paper, the raw counts (691/696, 148/150) beside the accuracy paragraph.
  - **Footnote marks** for equal contribution, and a numbered footnote style for any future citation.
  - **Status stamps** in mono caps with a thin border: `PATENT PENDING`, `IN DEVELOPMENT`. The only "badge" shape on the site.
  - **Hairline rules and section numbers** instead of cards with shadows. Project cards are bordered records, not floating tiles.

### Direction B: "Review diff"

The page reads like a code review: claims as changes, evidence as review comments.

- **Type:** IBM Plex Sans (body) + IBM Plex Mono (headings, labels). One superfamily, engineering-document feel.
- **Palette:** cool paper `#F4F5F2`, ink `#16181A`, addition green `#2F6B3A` and removal red `#9C2F2F` used only as gutter markers, always paired with `+`/`−` glyphs so color isn't the only cue.
- **Layout:** single wide column with a line-number gutter on the left. Section headings look like file headers (`experience.yaml`). Case-study "what the checks missed" items styled as review comments threaded off a line.
- **Motifs:** diff gutters, inline review comments, check-run rows (`✓ passed`) next to measurable claims.

### Why A

- **Reading comfort.** The case studies run to ~900 words. A serif at reading size holds up; B's mono-heavy look tires the eye and starts to look like a developer-tool template, which is the thing to avoid.
- **The motif carries meaning without inventing content.** Margin notes and footnotes are where evidence naturally goes. B's diff and check-run metaphors would tempt me to make up "passed" states or fake diffs around copy that isn't a diff.
- **It ages well.** A works for papers, a patent, certifications and a future blog. B fits Strop's case study and feels forced on the publications list.
- **One piece of B worth keeping:** Strop's "What it finds" list could get a subtle `−`/`+` gutter later, if you want it. Not in the first build.

---

## 4. Stack and project structure

### Recommendation: Astro (latest stable) + MDX + Content Layer, static output on Vercel

Your lean is right. Reasons:

- **Zero JS by default.** The site needs about three small scripts (video autoplay, maybe the contents highlight). Astro ships HTML and CSS and nothing else unless asked.
- **Typed content is first-class.** Zod schemas, `reference()` between collections, build errors on bad entries, and MDX bodies with components (`<Media>`) for case studies.
- **Static output needs no adapter** on Vercel. Images go through `astro:assets` (AVIF/WebP, sized `srcset`).
- **TypeScript throughout,** including the check scripts (`tsx`).

Considered and rejected: **Next.js** (React runtime and App Router for a site with no interactivity; more to maintain), **Eleventy** (no typed collections without extra work). The one place Astro needs help is OG images; I'll render them at build time with Satori + resvg in a static endpoint, which is a few dozen lines.

**Other choices:** pnpm; plain CSS with custom properties and cascade layers (no Tailwind, which also keeps us away from the template look); `@astrojs/sitemap`; `@astrojs/mdx`; Fontsource; Vitest for check-script tests; Playwright for screenshots, accessibility checks (axe) and media capture; GitHub Actions for CI.

### Site URL, one place

```ts
// astro.config.ts: the only place the site's own address is decided
const site =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ??
  'http://localhost:4321';
```

Canonical tags, OG image URLs, `robots.txt` and the sitemap all read `Astro.site`. Today `SITE_URL` is unset and Vercel supplies the production `*.vercel.app` host. Moving to `mtroque.dev` is one env var change in Vercel (`SITE_URL=https://mtroque.dev`). A `check:domains` script fails CI if `mtroque.dev` or the project's `*.vercel.app` host appears as a URL anywhere in `src/`, `public/` or config. (External links like `tablekeeper-beryl.vercel.app` are allowed; the check targets this site's own hosts.) Previews get `noindex` (Vercel adds `X-Robots-Tag` on preview URLs, and `robots.txt` disallows all when `VERCEL_ENV !== 'production'`).

### Structure

```
.
├── astro.config.ts
├── src/
│   ├── content.config.ts          # all Zod schemas (§2)
│   ├── content/
│   │   ├── profile.yaml
│   │   ├── ui.yaml
│   │   ├── projects/{tablekeeper,strop}.mdx
│   │   ├── experience/{pwc,samsung}.yaml
│   │   ├── publication-groups.yaml
│   │   ├── publications/*.yaml     # 7 papers
│   │   ├── patents/prompt-attribution.yaml
│   │   └── certifications.yaml     # vendors + certs
│   ├── assets/media/tablekeeper/  # screenshots + posters (optimized by astro:assets)
│   ├── components/                # Intro, ProjectCard, ExperienceEntry, Paper, Patent,
│   │                              # CertVendor, MarginNote, StatusStamp, Media, ResponsiveTable
│   ├── layouts/{Base,Prose}.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── projects/[slug].astro
│   │   ├── og/[...page].png.ts
│   │   ├── robots.txt.ts
│   │   └── 404.astro
│   ├── lib/rehype-table-labels.ts
│   └── styles/{tokens,base,prose}.css
├── public/media/tablekeeper/      # video/GIF files (served as-is)
├── scripts/
│   ├── todos.ts                   # pnpm todos
│   ├── copy-lint/                 # pnpm lint:copy (+ rules/, tests/)
│   ├── check-titles.ts            # pnpm check:titles
│   ├── check-domains.ts           # pnpm check:domains
│   ├── screens.ts                 # pnpm screens (milestone screenshots)
│   └── media/                     # pnpm media (capture.ts + flows/*.ts)
├── copy-lint.allow.yaml           # acknowledged heuristic hits, each with a reason
├── titles.lock                    # verbatim paper titles
├── .github/workflows/ci.yml
└── docs/{CONTENT.md,PLAN.md}
```

---

## 5. The checks

`pnpm check` runs everything below plus `astro check`. CI (GitHub Actions, on every push and PR) runs `pnpm check` and `pnpm build`. The Vercel build runs `pnpm build`, which runs the copy check first, so nothing skips it by bypassing CI.

### TODO check: `pnpm todos`

- **Pattern:** `\[\[TODO:\s*(.+?)\]\]`. The literal format example `[[TODO: ...]]` is ignored.
- **List mode** (`pnpm todos`): scans tracked files in `src/`, `public/` (text files), and config; prints `file:line  text`, sorted. Exits 0. In GitHub Actions it also emits each one as a warning annotation on the PR.
- **Build gate:** an Astro integration runs after `astro build` and scans the built HTML in `dist/`. This catches TODOs that only appear once rendered (media placeholders built from schema fields). If `VERCEL_ENV=production` (or `STRICT_TODOS=1` locally), any hit fails the build and prints the source locations. Preview and local builds print a warning and pass.
- **Consequence to be aware of:** production deploys are blocked until every media slot is filled (or marked optional and dropped, Q-T3) and every TODO you add is resolved. Previews work throughout.

### Copy check: `pnpm lint:copy`

TypeScript, Markdown parsed with `remark` + `remark-mdx` so it sees paragraphs and skips code, inline code, URLs and author names. Scope: every prose field in the collections, MDX bodies, `ui.yaml`, and with `--file docs/CONTENT.md` in report mode. Excluded fields: publication `title`, patent `officialTitle`, author names, URLs.

| Rule | Detects | Severity |
|---|---|---|
| `banned-terms` | delve, leverage, seamless, robust, cutting-edge / cutting edge, passionate about, in today's fast-paced, unlock, empower, journey, testament, elevate; with inflections (leveraging, empowers, elevated, seamlessly…) | error |
| `not-just-but` | "not just/only/merely/simply X, but Y", "isn't just X, it's Y", "more than just" | error |
| `em-dash` | more than one `—` (or ` -- `) in a paragraph | error |
| `triplet` | a sentence whose main coordination is exactly three items, "A, B(,) and/or C", including three adjectives in a row | error unless acknowledged |
| `closing-restatement` | last sentence of a paragraph of 3+ sentences that opens with a summary phrase (In short, Overall, Ultimately, In the end, That's why, This means, Over time…) or whose content words are ≥70% already in the paragraph; also flags a sentence that repeats one from an earlier paragraph in the same section | error unless acknowledged |

The last two are heuristics: they can't tell a reflexive triplet from three real game names. So a hit fails CI until it's acknowledged in `copy-lint.allow.yaml`:

```yaml
- file: src/content/projects/tablekeeper.mdx
  rule: triplet
  sentence: "More games (Vale of Eternity, Flamecraft, Splendor) and the Harmonies expansion"
  reason: three real game names
```

The entry is keyed to the exact sentence, so editing the sentence expires the acknowledgment and forces a fresh look. A per-line escape `<!-- copy-lint-disable-next-line banned-terms: reason -->` exists for literal uses (e.g. "robust" as a statistics term) and requires a reason.

Not linted, because no regex can judge it: concrete nouns, first person, short sentences and "every claim points to something specific." Those are a review checklist I'll walk through at each content milestone.

Each rule has Vitest fixtures, including the real CONTENT.md sentences from §0, so the heuristics are tested against the cases we already know about.

### Supporting checks

- **`check:titles`:** compares every publication title (and the patent's official title) against `titles.lock`, created from CONTENT.md during migration. Any difference fails CI. Changing a title means editing the lock file on purpose.
- **`check:domains`:** see §4.
- **`check:verbatim`** (migration only): asserts every string moved into the collections appears character-for-character in CONTENT.md, so the move can't reword anything by accident. Runs while CONTENT.md is still the source (Q-G2).

---

## 6. Questions for you

Each has my recommendation in bold so you can answer "yes" or override.

### General

- **Q-G1. TODOs.** CONTENT.md has no `[[TODO]]` markers. Did you expect some (a CV, a headshot, a Strop repo link)? **I'll proceed assuming none beyond the media slots.**
- **Q-G2. After migration,** two sources of truth would drift. **Replace CONTENT.md's body with a pointer to `src/content/` and keep the original in git history.** Or keep it and run `check:verbatim` forever.
- **Q-G3. Dark mode:** **follow the system setting, no toggle.**
- **Q-G4. Header nav labels** are new copy. Proposal: **Projects · Experience · Research · Certifications · Contact.** "Research" is shorter than "Selected Patents & Publications"; the section heading itself stays as written.
- **Q-G5. Analytics:** **none,** or Vercel Web Analytics (cookieless)?
- **Q-G6. Will `mtroque/mtroque.dev` be public?** If yes, everything in the repo is public, including draft TODO text and the allowlist. The patent schema already blocks numbers from being stored.
- **Q-G7. Git:** the folder isn't a git repo yet. **I'll `git init`, add the GitHub remote `mtroque/mtroque.dev`, and link a Vercel project in Milestone 0.** Does the GitHub repo exist already, and should the Vercel project be under your personal account?

### Intro

- **Q-I1.** **`h1` = "Matthew Roque" (small), headline as the large lede.** The alternative puts the headline in the `h1`.
- **Q-I2.** **Link "my pending patent" to `#publications` and "Strop" to its case study** in the bio. No words change, it just turns two claims into pointers to their evidence.
- **Q-I3.** **Show "Taguig, Philippines" in the intro margin.**

### Personal Projects

- **Q-P1. Case study lede:** **show the card blurb under the title** on each case study page as well.
- **Q-P2. Strop status note** ("Open-source release planned; I'll add the repo link when it's public."): **show it on the case study header, not the card** (the card already has the badge).
- **Q-T1. Media alt text:** **use each Media list description as the alt text,** lightly cut to describe what's on screen. That's rewording, so I'll show you the four drafts before using them. Captions: **none.**
- **Q-T2. Rules assistant screenshot** needs two live questions. Which? Proposal: one Patchwork rules question the rulebook answers, one it doesn't. Each capture run calls the Claude API on your live app (cost, and answers vary between runs).
- **Q-T3. Optional factory-PR media** can't come from the live app (it's on GitHub, and may need sign-in). **Drop the slot,** or keep it as a TODO, which blocks production until you supply it?
- **Q-T4. GIF or video?** **Record → MP4/WebM `<video>` with poster** (smaller, pausable, same look). Or real GIF with the `<picture>` reduced-motion fallback.
- **Q-T5. Case study external links** (retro, goodhart…) open **in the same tab.**
- **Q-T6. Games table:** **add visually hidden "Yes" text next to each ✓** so screen readers say "Yes" instead of "check mark."

### Experience

- **Q-E1.** CONTENT.md's copy rule asks for real numbers, and the experience entries have few. Are there Samsung numbers you're allowed to share (users, languages, deflection rate)? If not, **leave as written.**

### Selected Patents & Publications

- **Q-R1. Group headings** are 39, 30 and 32 characters, and "Vision-Language Data for Southeast Asia" runs to two lines on phones. Options:
  - **(a) Rename one:** "Vision-Language Data for SEA" (28) next to "Text Complexity in Pretraining" (30) and "Retrieval for Philippine Tax Law" (32). Best balance; "SEA" may read as jargon.
  - (b) "Southeast Asian Vision-Language Data" (36). Clearer, still the longest.
  - (c) Keep all three and balance visually instead: same mono size, a paper count on the right of each heading rule ("1 paper", "3 papers", "3 papers"), so weight comes from the rule, not the text.
  - I lean (a) with (c)'s styling; your call, since it's a rewording.
- **Q-R2. SEA-VL authors:** is "(large multi-institution collaboration; I'm one of the contributors)" display text? **Yes, shown in muted text after "et al."**
- **Q-R3. Equal contribution:** **`*` after each equal author, one "* Equal contribution" footnote per paper.**
- **Q-R4. Link labels** (new copy): **ACL Anthology · arXiv · IEEE Xplore · PDF.**
- **Q-R5. Your name** appears as "Matthew Roque" and "Matthew Theodore Roque". **Keep each exactly as published.**

### Certifications

- **Q-C1.** The "More" entries are shortened ("Architect – Foundations"). **Show them exactly as written,** with the vendor name providing context.

### Contact

- **Q-K1. Email:** **plain `mailto:` link,** no obfuscation. It's already public on Scholar papers.

---

## 7. Build order

Every milestone ends with the same gate, and I report each result to you:

1. `pnpm build` passes (and `STRICT_TODOS=1 pnpm build` result noted: expected to fail only on media TODOs until Milestone 10).
2. `pnpm check` passes.
3. `pnpm screens` captures every changed page at **390×844** and **1440×900** (full page, light and dark) into `screenshots/<milestone>/` (git-ignored). I open and look at each image, and say what I checked and anything I fixed.

| # | Milestone | Done when |
|---|---|---|
| 0 | **Scaffold.** `git init`, Astro + MDX + TS strict, pnpm, `site` config, `check:domains`, CI workflow, Vercel project linked, first preview deploy. | Preview URL loads a blank page with correct canonical and `robots.txt`. |
| 1 | **Checks first.** `todos` + build gate, `lint:copy` with all five rules and Vitest fixtures, `check:titles` scaffold. Run `lint:copy --file docs/CONTENT.md`. | **Stop and report** every CONTENT.md hit to you. Nothing is fixed silently; heuristic hits get allowlisted only with your reasons. |
| 2 | **Schemas + migration.** All collections, copy moved verbatim, `check:verbatim` and `titles.lock`. Minimal unstyled render of every field on `/`. | Every CONTENT.md item appears once on the unstyled page; verbatim check passes. |
| 3 | **Design system.** Tokens, fonts, base and prose CSS, `MarginNote`, `StatusStamp`, a dev-only `/_specimen` page (excluded from build output). Contrast checks. | Specimen screenshots in both schemes; AA contrast for every text/background pair. |
| 4 | **Home: Intro + Personal Projects.** | Cards, badge, links, CV slot (verified by temporarily setting `cv`). |
| 5 | **Home: Experience + Patents & Publications.** Move the paper count ("3 papers") out of the group `h3` so screen readers don't read it as part of the heading (noted in M2 review). | Bold name, `*` marks, footnote, group order, patent shows only allowed fields; group headings contain only the heading text. |
| 6 | **Home: Certifications + Contact + header/footer.** All 19 certifications listed, no toggle (changed 2026-11-24). | Certs section is visibly lighter than projects; header nav and skip link work by keyboard. |
| 7 | **Case study pages.** Prose layout, contents list, responsive games table, `<Media>` placeholders, reduced-motion behavior. | Table readable at 390 wide; placeholders visible; reduced-motion verified with Playwright's `reducedMotion: 'reduce'`. |
| 8 | **SEO.** Per-page OG images, sitemap, canonical, meta descriptions (from blurbs/headline), 404. | I view each OG PNG; sitemap and canonicals use the env URL; switching `SITE_URL` locally changes all of them. |
| 9 | **Quality pass.** axe (via Playwright) on every page, keyboard pass, Lighthouse on the preview, no layout shift from fonts. | Zero axe violations; Lighthouse numbers reported as measured. |
| 10 | **Media capture.** `pnpm media`: Playwright on https://tablekeeper-beryl.vercel.app at 390×844 with the built-in sample photos; video via `recordVideo` → ffmpeg (trimmed, ~12 fps, target ≤10 s and ≤1 MB, poster frame extracted); screenshots at 2× DPR. Any flow that lands on sign-in is skipped and logged. Files written to `src/assets/media/` and `public/media/`, frontmatter `src`/`poster` filled in, placeholders gone. | **Stop and show you every captured file** (paths, sizes, a contact sheet of video frames) before anything is committed. |

After Milestone 10, the production build passes only once your remaining TODOs are resolved. Production deploy happens when you say so.
