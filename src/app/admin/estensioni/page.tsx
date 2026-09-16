import { redirect } from 'next/navigation';
import { ExtensionsManager } from '@/components/admin/extensions-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { allExtensions } from '@/lib/extensions';
import { getSettings } from '@/lib/queries';
import { DEFAULT_EXTENSIONS } from '@/lib/models';

export default async function ExtensionsPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const s = { ...DEFAULT_EXTENSIONS, ...((await getSettings()).extensions ?? {}) };
  const list = allExtensions().map((e) => ({ id: e.id, name: e.name, description: e.description, version: e.version, author: e.author ?? '', fields: e.fields ?? [], hooks: [e.beforeArticleSave && 'prima del salvataggio', e.filterContent && 'filtro contenuto', e.afterArticlePublish && 'dopo la pubblicazione', e.dailyJob && 'lavoro giornaliero'].filter(Boolean) as string[] }));
  return <ExtensionsManager extensions={list} enabled={s.enabled} config={s.config} />;
}
