import { redirect } from 'next/navigation';
import { RedirectsManager } from '@/components/admin/redirects-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listNotFound, listRedirects } from '@/lib/repo-extra';
import { listBrokenLinks } from '@/lib/repo-extra3';
import { findArticle } from '@/lib/repo';
import { BrokenLinksPanel } from '@/components/admin/broken-links-panel';

export default async function RedirectPage({ searchParams }: PageProps<'/admin/redirect'>) {
  const me = await requireUser();
  if (!can(me, 'redirect.manage')) redirect('/admin');
  const sp = await searchParams; const q = typeof sp.q === 'string' ? sp.q : '';
  const [redirects, notFound, broken] = await Promise.all([listRedirects(2000, q), listNotFound(100), listBrokenLinks(100)]);
  const titles: Record<string, string> = {};
  await Promise.all([...new Set(broken.map((b) => b.articleId))].map(async (id) => { const a = await findArticle(id); if (a) titles[id] = a.title; }));
  return <><RedirectsManager redirects={redirects} notFound={notFound} query={q} /><BrokenLinksPanel links={broken} titles={titles} /></>;
}
