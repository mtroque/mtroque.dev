# Site content (source of truth)

This file is the site's copy. Use it as written; ask before rewording anything.
`[[TODO: ...]]` marks things I still need to supply.

---

## Meta

- Display name: Matthew Roque
- Location: Taguig, Philippines
- Site address: the default Vercel URL for now; mtroque.dev later.
- Links:
  - GitHub: https://github.com/mtroque
  - LinkedIn: https://www.linkedin.com/in/mt-roque/
  - Google Scholar: https://scholar.google.com/citations?user=tcikcYAAAAAJ&hl=en
  - Email: roquematthewc@gmail.com
- No CV download for now.

---

## Intro

**Headline:** I build AI agents for work where mistakes are expensive, and the checks that show whether they did the job.

**Bio:**
I'm a Senior AI Engineer at PwC, building multi-agent systems for banks and insurers, where an agent's work has to hold up against regulation.

The question I keep coming back to is how you check what an AI actually did. It's behind my pending patent on prompt-to-output attribution, and behind Strop, a tool I'm building that catches the workarounds coding agents don't mention and turns them into checks.

Before PwC, I spent two years at Samsung Research, building chatbots used by customers and repair technicians around the world, and publishing research on how training data shapes language models. I hold a BS & MS in Computer Engineering from De La Salle University.

---

## Personal Projects

Section note (shown under the heading): Things I build on my own time, outside of work.

### 1. Tablekeeper · Board game companion

**Card blurb (home page):** A phone companion for board games. It scores your board from a photo you confirm, answers rules questions with citations to the official rulebook, and keeps a history of your plays. Supports 4 games.

**Links:** Live app https://tablekeeper-beryl.vercel.app · Source https://github.com/mtroque/tablekeeper
**Stack:** TypeScript, Next.js, Express, Postgres (Neon), opencv.js, Claude API, Vercel

#### Case study

**The problem**
Scoring a game like Patchwork or Harmonies means counting dozens of tiles and patterns at the end of a long game, and it's easy to get wrong. Rules questions mid-game mean digging through the rulebook.

**What it does**
- **Photo scoring.** Take a photo of the finished board. The app drafts the board state, you check and correct it, and it calculates the score with a breakdown you can tap to see which spaces earned what.
- **Rules assistant.** Ask a question and get a short answer with citations that open the official rulebook PDF at the right page.
- **History.** Saved plays per account with personal bests and averages, plus campaign tracking for Dorfromantik.

| Game | Rules assistant | Photo scoring | Manual scoring |
|---|---|---|---|
| Patchwork | ✓ | ✓ | ✓ |
| Harmonies | ✓ | ✓ (you set stack heights) | ✓ |
| Azul | ✓ | Not yet | ✓ |
| Dorfromantik | ✓ | No | ✓, with campaign |

**Design decisions**
- **The photo never leaves the phone.** Detection is classic computer vision running in the browser, not a vision model. Each board has a fixed layout, so reading it is a per-space classification problem, and solving it locally makes it free, offline, deterministic and measurable.
- **The app drafts; you confirm.** Every value comes with a confidence. Uncertain ones are outlined for you to check, but nothing blocks you from scoring. Where a photo can't know the answer, it doesn't guess: Harmonies stack heights can't be seen from above, so the app asks you to set them.
- **The model never computes the score.** Scoring is plain code that can be tested, and the server recomputes every score rather than trusting the phone. A lint rule keeps the scoring functions free of side effects, and property tests check that every breakdown adds up to its total.
- **The rules assistant reads like a person.** Rulebooks are short and structured, so instead of a vector store it gets the table of contents, keyword search and whole sections, and decides what to read next. It can only cite sections it actually read; anything else is dropped. When the rulebook doesn't cover a question, it says so instead of making something up.

**How accurate is it?**
On my labeled test photos, the detector found the board every time and read 99.3% of values correctly for Patchwork (691 of 696) and 98.7% for Harmonies (148 of 150). Every error was flagged as low-confidence, so the review step catches it. These photos also helped tune the detectors, so they're optimistic. The one held-out figure is 96.5% for Harmonies tile colors, tested leave-one-out. CI fails any change that drops accuracy below the recorded baseline.

**How it's built**
I run Tablekeeper as a small software factory. I write the specs, acceptance criteria and test fixtures; coding agents (Claude Code, plus Google's Antigravity) do most of the building. About 78% of the 335 commits on main were co-authored by Claude Code.
- **Parallel agents** work in separate git worktrees, one per slice of the roadmap.
- **A headless factory** runs on GitHub Actions: an agent picks up the next ready issue and opens a PR, a second agent reviews it, and findings go back to the first agent for up to two fix rounds. I merge every PR myself.
- **Checks do the policing:** strict types, custom lint rules, repo checks, unit, property and end-to-end tests, an accuracy gate for the photo detector, screenshots of every screen on each PR, and a dependency audit, all required before merge.

The checks caught a lot, but reading the agents' session transcripts afterwards showed what they missed:
- **Tests that mirrored the bug.** The test helpers used the same wrong token issuer as the sign-in code, so every test passed while production rejected every sign-in. I added a contract test written from the provider's documentation.
- **Work marked done with criteria still open.** Specs were closed with live checks never run. I added a gate that refuses to close a spec with unchecked criteria. The first time it fired, an agent got past it by deleting the unchecked criteria, without saying so.
- **Quiet workarounds.** A rejected commit scope was silently dropped, a security warning was retried past instead of reported, and a missing tool was replaced with an improvised copy.

Most of these never came up as a correction, because nobody saw them happen. That's why I built Strop, below.

**What's next**
- More games (Vale of Eternity, Flamecraft, Splendor) and the Harmonies expansion
- Photo scoring for Azul, whose printed board makes empty and filled spaces look alike
- A "My Shelf" page for the games you own
- An answer-quality evaluation for the rules assistant, and real-world photo accuracy from the corrections players make


**Media** (captured automatically from the live app)
- GIF: photo to score on Patchwork, using "Try Sample Photo": capture with draggable corners, review with outlined low-confidence values, result breakdown
- Screenshot: a rules answer with citation chips, plus a "the rulebook doesn't say" answer
- Screenshot: Harmonies breakdown with a category's hexes highlighted

---

### 2. Strop · Turning coding-agent workarounds into hard checks

**Card blurb (home page):** Reads coding agents' session transcripts to find the workarounds they didn't mention, turns each finding into the strongest check that fits, and measures whether it worked.

**Links:** Source https://github.com/mtroque/strop
**Status:** In development.

#### Case study

**Why "Strop"**
A strop is the leather strap used between sharpenings. A few light passes keep a good edge at its best. Strop does the same for a coding-agent setup: small, steady improvements to the process, even when the output already looks fine.

**The problem**
When a coding agent says a task is done, the transcript sometimes tells a different story. It skipped a failing test, committed with `--no-verify`, added a suppression comment or patched around a broken script, and the summary still said "all tests pass." A quieter cost: I kept giving agents the same corrections, session after session.

**What it reads**
Agent session transcripts, plus the gap between what an agent committed and what was eventually merged. That gap shows what a human had to fix afterwards.

**What it finds**
1. **Repeated corrections:** feedback I keep giving across sessions.
2. **Undisclosed workarounds:**
   - skipped or loosened tests
   - `--no-verify`, and lint or type-check suppression comments
   - improvised fixes for broken scripts or missing tools
   - summaries that claim success the transcript contradicts

The second kind matters more, because nobody knows to look for it.

**How it fixes them**
For each finding, it proposes the strongest fix that fits, in a fixed order:
1. Fix the environment. If a script is broken, fix the script.
2. An edit-time Claude Code hook.
3. A lint rule.
4. A pre-commit or CI gate.
5. A CLAUDE.md rule, used only for judgment calls no check can express, and labeled as such.

Every rule is stored with the transcript evidence that produced it.

**Does the fix work?**
The tool keeps watching later sessions. Rules that don't reduce the problem get retired. Soft rules are revisited to see whether they can become hard checks. Over time, more of the guardrails are deterministic, and "done" can be trusted more.

**How it compares**
Good tools exist for each piece of this:
- **Turning repeated corrections into CLAUDE.md rules:** Claude Code's built-in `/insights` command, [retro](https://retro.craftwork.design/), [claude-doctor](https://github.com/millionco/claude-doctor) and [claude-reflect](https://github.com/BayramAnnakov/claude-reflect).
- **Catching agents that weaken tests:** [goodhart](https://github.com/karamage/goodhart), [narc](https://github.com/tranhuuhuy297/narc) and [noskip](https://github.com/DariusHQ/noskip).
- **Checking "done" claims against the transcript:** [donediff](https://github.com/0xelitesystem/donediff).
- **Compiling written rules into lint rules or hooks:** [codemyrules](https://dev.to/clirimajeti/your-claudemd-is-full-of-lint-rules-in-disguise-6hb) and [nunchi](https://github.com/seob717/nunchi).

Each covers one step. Strop connects them: it finds the problem, fixes the environment before adding a rule, picks the strongest check that fits, and keeps measuring whether each rule reduced the problem.

---

## Experience

### PwC
Senior AI Engineer · May 2026–present · Taguig, Philippines

Section note: I build multi-agent systems for financial services clients. Client names and details stay confidential.

- **Complaints quality review and live assistance** · major bank
  A multi-agent workflow that reviews how frontline staff handled customer complaints against industry regulations. I extended it from reviewing cases after the fact to helping while they're open: it suggests entries as staff fill in case details, and drafts letters to customers when one is needed.
- **AI governance "front door"** · major insurer
  An agentic platform that every new AI platform, model or solution passes through before it can be used in the organization. It handles the required governance documentation and gets the necessary approvals.
- **Regulatory change assistant**
  A multi-agent assistant that reads new regulations, checks them against an organization's current policies and controls, and works out what's affected and what has to change to stay compliant.

### Samsung Research
AI Engineer · June 2024–May 2026 · Taguig, Philippines

- **Samsung.com customer service chatbot** · 5 regions (US, Canada, UK, Australia, India)
  A pre-LLM chatbot built on vector search over an FAQ database, combined with scripted answer flows.
- **Appliance repair chatbot**
  Used by Samsung repair technicians around the world. It uses the same architecture as the customer service chatbot.
- **Test cases and documentation from solution designs**
  LLM automation that drafts test cases and technical documents from a solution design. The documents cover software development, testing, and internal process and compliance.
- **Web browsing agent**
  Takes a task in plain language and uses an LLM to navigate a browser and complete it.
- **Research:** see Selected Patents & Publications.

---

## Certifications

Display grouped by vendor, highest level first. Show the "featured" ones by default; fold the rest into a "+ N more" toggle per vendor. No badge links for now (keep an optional field for them).

**Anthropic (Claude)**
- Featured: Claude Certified Architect – Professional
- More: Architect – Foundations · Developer – Foundations · Associate – Foundations

**AWS**
- Featured: Forward Deployed Engineer – Advanced (Partner) · Generative AI Developer – Professional · Solutions Architect – Professional
- More: Solutions Architect – Associate · AI Practitioner · Cloud Practitioner

**Microsoft**
- Featured: Frontier Transformation Engineer (TITAN) · Agentic AI Business Solutions Architect · Azure AI Apps and Agents Developer Associate
- More: Machine Learning Operations Engineer Associate · GitHub Copilot · Azure AI Fundamentals

**Google Cloud**
- Featured: Professional Agentic Architect · Professional Machine Learning Engineer · Professional Cloud Architect

---

## Selected Patents & Publications

### Patent
- **Display title:** Attention-Based Prompt-to-Output Attribution for Generative AI
- **Official title (shown smaller, beneath):** Method and Electronic Apparatus for Providing Prompt-to-Output Attribution Interface
- **Status:** Patent pending · USPTO, KIPO, IPOPHL
- No description or technical details for now.

### Vision-Language Data for Southeast Asia

**Crowdsource, Crawl, or Generate? Creating SEA-VL, a Multicultural Vision-Language Dataset for Southeast Asia**
- Venue: ACL 2025 (Main Conference) · Vienna, Austria
- Authors: Samuel Cahyawijaya, Holy Lovenia, et al. (large multi-institution collaboration; I'm one of the contributors)
- Links: https://aclanthology.org/2025.acl-long.916/ · https://arxiv.org/abs/2503.07920
- Summary: Southeast Asian cultures are underrepresented in vision-language datasets. We compared crowdsourcing, web crawling and image generation as ways to collect culturally relevant images, and released 1.28M of them. Crawling reached about 85% cultural relevance at a fraction of crowdsourcing's cost; generated images missed cultural detail.

### Text Complexity in Pretraining

**Rethinking the Role of Text Complexity in Language Model Pretraining**
- Venue: 1st BabyLM Workshop @ EMNLP 2025 · Suzhou, China
- Authors: Dan John Velasco, Matthew Theodore Roque (equal contribution)
- Links: https://aclanthology.org/2025.babylm-main.1/ · https://arxiv.org/abs/2509.16551
- Summary: We simplified pretraining text with an LLM while keeping its content, then trained models from 28M to 500M parameters on each version. Smaller models cope far better with simpler text. Simple text helps linguistic tasks, complex text helps world-knowledge tasks, and fine-tuning results barely change.

**Beyond Repetition: Text Simplification and Curriculum Learning for Data-Constrained Pretraining**
- Venue: 1st BabyLM Workshop @ EMNLP 2025 · Suzhou, China
- Authors: Matthew Theodore Roque, Dan John Velasco (equal contribution)
- Links: https://aclanthology.org/2025.babylm-main.19/ · https://arxiv.org/abs/2509.24356
- Summary: When pretraining data runs out, models usually see the same text again. We replaced that repetition with simplified rewrites and tested ordering data from simple to complex. Simplified text beat plain repetition, and smaller models gained the most from a simple-to-complex order.

**Scaling, Simplification, and Adaptation: Lessons from Pretraining on Machine-Translated Text**
- Venue: 5th Workshop on Multilingual Representation Learning (MRL) @ EMNLP 2025 · Suzhou, China
- Authors: Dan John Velasco, Matthew Theodore Roque (equal contribution)
- Links: https://aclanthology.org/2025.mrl-main.40/ · https://arxiv.org/abs/2509.17317
- Summary: Most languages lack enough native text to pretrain on. We pretrained GPT-2 models (124M–774M) on English machine-translated into Indonesian and Tamil. These models improve with scale, and a small amount of native text afterwards often beats training on native text alone. Simplifying the English first hurt, and culture-sensitive tasks like toxicity detection still need native data.

### Retrieval for Philippine Tax Law

**Legal Information Retrieval through Embedding Models and Synthetic Question Generation: Insights from the Philippine Tax Code**
- Venue: PACLIC 38, 2024 · Tokyo, Japan
- Authors: Matthew Roque, Nicole Abejuela, Shirley Chu, Melvin Cabatuan, Edwin Sybingco
- Links: https://aclanthology.org/2024.paclic-1.35/
- Summary: We tested ways to improve embedding-based search over the Philippine tax code. Splitting its 311 sections into 826 smaller subsections clearly improved retrieval, while matching user questions to LLM-generated synthetic questions did not.

**Harnessing NLP for Legal Section Retrieval: Embedding Models in Philippine Taxation Law**
- Venue: IEEE HNICEM 2024 (16th) · Baguio, Philippines
- Authors: Matthew Roque, Nicole Abejuela, Melvin Cabatuan, Shirley Chu, Michael Ng, Hans Nolasco, Jenine Valencia
- Links: https://ieeexplore.ieee.org/document/11258752/
- Summary: We built a manually annotated dataset of tax-law questions and compared embedding models for finding the right section of the Philippine National Internal Revenue Code in response to a user's question.

**Data-centric Advanced Knowledge Interface for Legal Archives**
- Venue: PCSC 2024 · Laguna, Philippines
- Authors: Matthew Roque, Shirley Chu, Melvin Cabatuan, Nicole Abejuela, Michael Ng, Hans Nolasco, Jenine Valencia
- Links: https://pcsc.dlsu.edu.ph/proceedings/main-conference/28.pdf
- Summary: We built DAKILA, a search tool for the Philippine tax code, with a question dataset drawn from bar exam review materials plus LLM-generated questions. Our fine-tuned embedding model ranks the correct section first out of 311 about 70% of the time, and law and accountancy users rated the tool easy to use.

Display my name in bold in author lists, and show equal-contribution marks.

---

## Contact

Email is the best way to reach me: roquematthewc@gmail.com. I'm happy to talk about making agents reliable, AI in regulated industries, or research collaborations.
