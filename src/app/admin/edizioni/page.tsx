import { redirect } from 'next/navigation';
import { EditionsManager } from '@/components/admin/editions-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getZones } from '@/lib/queries';
import { listEditions } from '@/lib/repo-extra';
import { THEMES } from '@/lib/themes';

export default async function EditionsPage() {
  const me = await requireUser();
  if (!can(me, 'settings.manage')) redirect('/admin');
  const [editions, zones, categories] = await Promise.all([listEditions(), getZones(), getCategories()]);
  return <EditionsManager editions={editions} zones={zones.map((z) => ({ id: z.id, name: z.name }))} categories={categories.map((c) => ({ id: c.id, name: c.name }))} themes={THEMES.map((t) => ({ id: t.id, name: t.name }))} />;
}
