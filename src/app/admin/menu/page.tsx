import { redirect } from 'next/navigation';
import { MenusManager } from '@/components/admin/menus-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getSettings, getZones } from '@/lib/queries';
import { listPages } from '@/lib/repo-extra3';
import { DEFAULT_MENUS } from '@/lib/models';

export default async function MenuAdmin() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [s, cats, pages, zones] = await Promise.all([getSettings(), getCategories(), listPages(true), getZones()]);
  const suggestions = [{ label: 'Tutte le notizie', url: '/notizie' }, { label: 'Cosa fare in città', url: '/eventi' }, { label: 'Zone', url: '/zone' }, { label: 'Meteo', url: '/meteo' }, { label: 'Annunci', url: '/annunci' }, { label: 'Necrologi', url: '/necrologi' }, { label: 'Sostienici', url: '/sostieni' }, ...cats.map((c) => ({ label: c.name, url: `/${c.slug}` })), ...pages.map((p) => ({ label: p.title, url: `/${p.slug}` })), ...zones.slice(0, 20).map((z) => ({ label: z.name, url: `/zone/${z.slug}` }))];
  return <MenusManager initial={{ ...DEFAULT_MENUS, ...(s.menus ?? {}) }} suggestions={suggestions} />;
}
