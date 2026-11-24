import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export async function getProfile() {
  const e = await getEntry('profile', 'profile');
  if (!e) throw new Error('src/content/profile.yaml is missing');
  return e.data;
}

export async function getUi() {
  const e = await getEntry('ui', 'ui');
  if (!e) throw new Error('src/content/ui.yaml is missing');
  return e.data;
}

export const getProjects = async () => (await getCollection('projects')).sort(byOrder);
export const getExperience = async () => (await getCollection('experience')).sort(byOrder);
export const getPatents = async () => getCollection('patents');

export async function getPublicationGroups() {
  const [groups, pubs] = await Promise.all([getCollection('publicationGroups'), getCollection('publications')]);
  return groups.sort(byOrder).map((g) => ({
    group: g,
    papers: pubs.filter((p) => p.data.group.id === g.id).sort(byOrder),
  }));
}

export async function getCertificationsByVendor() {
  const [vendors, certs] = await Promise.all([getCollection('certVendors'), getCollection('certifications')]);
  return vendors.sort(byOrder).map((v) => {
    return { vendor: v, certs: certs.filter((c) => c.data.vendor.id === v.id).sort(byOrder) };
  });
}

export type Project = CollectionEntry<'projects'>;
