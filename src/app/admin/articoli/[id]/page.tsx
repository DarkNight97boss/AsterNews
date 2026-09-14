import { siteUrl } from '@/lib/site-url';
import { notFound, redirect } from 'next/navigation';
import { ArticleEditor } from '@/components/admin/article-editor';
import { requireUser } from '@/lib/auth';
import { canEdit, permissionsOf } from '@/lib/permissions';
import { article, getCategories, getMedia, getSeoSettings, getTags, getUsers, getZones, seoContext } from '@/lib/queries';

export default async function EditArticlePage({ params }: PageProps<'/admin/articoli/[id]'>) {
  const me = await requireUser();
  const { id } = await params;
  const a = await article(id);
  if (!a) notFound();
  if (!canEdit(me, a)) redirect('/admin/articoli');
  const [categories, zones, tags, users, media, seo, ctx] = await Promise.all([getCategories(), getZones(), getTags(), getUsers(), getMedia(300), getSeoSettings(), seoContext(a.id, a)]);
  return <ArticleEditor key={a.updatedAt} initial={a} isNew={false} isPublic={a.status === 'published'} categories={categories} zones={zones} tags={tags} users={users} media={media} permissions={permissionsOf(me)} seoCtx={ctx} siteUrl={siteUrl()} maxLinks={seo.maxInternalLinks} />;
}
