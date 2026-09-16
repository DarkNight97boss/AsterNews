import { redirect } from 'next/navigation';
import { HomeBuilder } from '@/components/admin/home-builder';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getSettings, getTags, getZones } from '@/lib/queries';

export default async function HomeBuilderPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [s, categories, tags, zones] = await Promise.all([getSettings(), getCategories(), getTags(), getZones()]);
  const exportJson = JSON.stringify({ name: `${s.siteName} layout`, theme: s.theme, blocks: s.homeBlocks ?? [] }, null, 1);
  return <HomeBuilder initial={s.homeBlocks ?? []} categories={categories} tags={tags} zones={zones} exportJson={exportJson} />;
}
