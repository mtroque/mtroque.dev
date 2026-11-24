import type { APIRoute, GetStaticPaths } from 'astro';
import { getProfile, getProjects, getUi } from '../../lib/content';
import { renderOg, type OgContent } from '../../lib/og';

/** One image per page: /og/home.png and /og/<project>.png. */
export const getStaticPaths: GetStaticPaths = async () => {
  const [profile, ui, projects] = await Promise.all([getProfile(), getUi(), getProjects()]);
  const home = { params: { page: 'home' }, props: { label: profile.name, title: profile.headline, titleSize: 58 } };
  return [
    home,
    ...projects.map((p) => ({
      params: { page: p.id },
      props: {
        label: profile.name,
        title: p.data.title,
        subtitle: p.data.tagline,
        stamp: p.data.status === 'in-development' ? ui.projectStatus['in-development'] : undefined,
      },
    })),
  ];
};

export const GET: APIRoute = async ({ props, site }) => {
  const png = await renderOg({ ...(props as Omit<OgContent, 'host'>), host: new URL(site!).host });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
