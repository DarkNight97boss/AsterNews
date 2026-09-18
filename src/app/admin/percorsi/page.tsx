import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { allPaths } from '@/lib/actions-paths';
import { findArticle } from '@/lib/repo';
import { PathsManager } from '@/components/admin/paths-manager';

export const dynamic = 'force-dynamic';
export default async function PathsAdminPage() {
  const me = await requireUser(); if (!can(me, 'article.publish')) redirect('/admin'); const paths = await allPaths(); const titles: Record<string, string> = {};
  for (const id of new Set(paths.flatMap((p) => p.data.steps.map((s) => s.articleId)))) titles[id] = (await findArticle(id))?.title ?? '';
  return <><div className="page-title"><div><h1>Percorsi di lettura</h1><p>Serie guidate fatte con articoli già pubblicati: il lettore vede le tappe, quanto manca e dove è arrivato.</p></div></div><PathsManager paths={paths.map((p) => ({ id: p.id, data: p.data }))} titles={titles} /></>;
}
