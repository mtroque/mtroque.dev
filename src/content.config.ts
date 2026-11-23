/**
 * Typed content. Add an entry by adding a file; layout code never changes.
 * Schemas follow docs/PLAN.md §2.
 */
import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'use YYYY-MM');

/** Singleton: intro, links, section notes, contact. */
const profile = defineCollection({
  loader: glob({ pattern: 'profile.yaml', base: './src/content' }),
  schema: z.object({
    name: z.string(),
    location: z.string(),
    headline: z.string(),
    /** Paragraphs, verbatim. Inline Markdown allowed for links. */
    bio: z.array(z.string()).min(1),
    links: z.array(z.object({ label: z.string(), href: z.string() })).min(1),
    /** Path to a CV PDF. Renders a link only when set. */
    cv: z.string().optional(),
    sectionNotes: z.object({ projects: z.string() }),
    /** Inline Markdown allowed. */
    contact: z.string(),
  }),
});

/** Every UI string (nav, labels, toggles) in one place so the copy check covers it. */
const ui = defineCollection({
  loader: glob({ pattern: 'ui.yaml', base: './src/content' }),
  schema: z.object({
    nav: z.array(z.object({ label: z.string(), href: z.string() })),
    sections: z.object({
      projects: z.string(),
      experience: z.string(),
      publications: z.string(),
      certifications: z.string(),
      contact: z.string(),
    }),
    projectLinks: z.object({ live: z.string(), source: z.string(), caseStudy: z.string() }),
    projectStatus: z.object({ live: z.string(), 'in-development': z.string() }),
    present: z.string(),
    patentStatus: z.object({ pending: z.string(), granted: z.string() }),
    etAl: z.string(),
    equalContribution: z.string(),
    paperCount: z.object({ one: z.string(), other: z.string() }),
    publicationLinks: z.object({ acl: z.string(), arxiv: z.string(), ieee: z.string(), pdf: z.string(), other: z.string() }),
    moreToggle: z.string(),
    cvLink: z.string(),
    backHome: z.string(),
    navLabel: z.string(),
    tocLabel: z.string(),
    profileLinksLabel: z.string(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      order: z.number().int(),
      blurb: z.string(),
      status: z.enum(['live', 'in-development']),
      links: z.object({ live: z.url().optional(), source: z.url().optional() }),
      stack: z.array(z.string()).default([]),
      media: z
        .array(
          z.object({
            /** Referenced by <Media id="…"> in the body. */
            id: z.string(),
            kind: z.enum(['gif', 'screenshot']),
            /** From CONTENT.md's Media list. Shown in the placeholder until the file exists. */
            description: z.string(),
            /** Approved alt text (drafts are reviewed before use). */
            alt: z.string().optional(),
            src: image().optional(),
            video: z.object({ mp4: z.string(), webm: z.string().optional() }).optional(),
            poster: image().optional(),
          }),
        )
        .default([]),
    }),
});

const experience = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/experience' }),
  schema: z
    .object({
      org: z.string(),
      role: z.string(),
      start: yearMonth,
      /** Absent = present. */
      end: yearMonth.optional(),
      location: z.string(),
      order: z.number().int(),
      note: z.string().optional(),
      /** Client work: no outbound links allowed. */
      confidential: z.boolean().default(false),
      entries: z
        .array(
          z.object({
            title: z.string(),
            qualifier: z.string().optional(),
            body: z.string().optional(),
            /** In-page link only for confidential employers. */
            href: z.string().optional(),
          }),
        )
        .min(1),
    })
    .refine((e) => !e.confidential || e.entries.every((x) => !x.href || x.href.startsWith('#')), {
      message: 'Confidential employers get no outbound links',
    }),
});

const publicationGroups = defineCollection({
  loader: file('src/content/publication-groups.yaml'),
  schema: z.object({ heading: z.string(), order: z.number().int() }),
});

const publications = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/publications' }),
  schema: z.object({
    /** Verbatim; locked by titles.lock. */
    title: z.string(),
    group: reference('publicationGroups'),
    /** Order within the group. */
    order: z.number().int(),
    venue: z.string(),
    location: z.string(),
    year: z.number().int(),
    authors: z
      .array(
        z.object({
          name: z.string(),
          me: z.boolean().default(false),
          equal: z.boolean().default(false),
        }),
      )
      .min(1),
    etAl: z.boolean().default(false),
    authorNote: z.string().optional(),
    links: z
      .array(
        z.object({
          kind: z.enum(['acl', 'arxiv', 'ieee', 'pdf', 'other']),
          url: z.url(),
          label: z.string().optional(),
        }),
      )
      .min(1),
    summary: z.string(),
  }),
});

const patents = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/patents' }),
  schema: z
    .object({
      displayTitle: z.string(),
      /** Verbatim; locked by titles.lock. */
      officialTitle: z.string(),
      status: z.enum(['pending', 'granted']),
      /** Set to true only after the application is confirmed published. */
      published: z.boolean().default(false),
      offices: z
        .array(
          z.object({
            office: z.string(),
            applicationNumber: z.string().optional(),
            publicationNumber: z.string().optional(),
            grantNumber: z.string().optional(),
            url: z.url().optional(),
          }),
        )
        .min(1),
      description: z.string().optional(),
    })
    .refine(
      (p) =>
        p.published ||
        (!p.description &&
          p.offices.every((o) => !o.applicationNumber && !o.publicationNumber && !o.grantNumber && !o.url)),
      { message: 'Unpublished patent: only titles, status and office names are allowed' },
    ),
});

const certVendors = defineCollection({
  loader: file('src/content/cert-vendors.yaml'),
  schema: z.object({ name: z.string(), order: z.number().int() }),
});

const certifications = defineCollection({
  loader: file('src/content/certifications.yaml'),
  schema: z.object({
    vendor: reference('certVendors'),
    name: z.string(),
    featured: z.boolean().default(false),
    /** Highest level first within a vendor. */
    order: z.number().int(),
    badgeUrl: z.url().optional(),
  }),
});

export const collections = {
  profile,
  ui,
  projects,
  experience,
  publicationGroups,
  publications,
  patents,
  certVendors,
  certifications,
};
