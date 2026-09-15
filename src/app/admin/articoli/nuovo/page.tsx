import { siteUrl } from '@/lib/site-url';
import { ArticleEditor } from '@/components/admin/article-editor';
import { requireUser } from '@/lib/auth';
import { Article } from '@/lib/models';
import { permissionsOf } from '@/lib/permissions';
import { getCategories, getMedia, getSeoSettings, getTags, getUsers, getZones, seoContext } from '@/lib/queries';
import { uid } from '@/lib/utils';

export default async function NewArticlePage() {
  const me = await requireUser();
  const now = new Date().toISOString();
  const [categories, zones, tags, users, media, seo] = await Promise.all([getCategories(), getZones(), getTags(), getUsers(), getMedia(300), getSeoSettings()]);
  const initial: Article = { id: uid('a'), slug: '', kicker: '', title: '', subtitle: '', excerpt: '', content: '', coverImage: '', coverCaption: '', categoryId: categories[0]?.id ?? '', tagIds: [], authorId: me.id, zoneId: '', address: '', status: 'draft', format: 'standard', videoUrl: '', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true, seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: null, scheduledAt: null, createdAt: now, updatedAt: now };
  return <ArticleEditor initial={initial} isNew isPublic={false} categories={categories} zones={zones} tags={tags} users={users} media={media} permissions={permissionsOf(me)} seoCtx={await seoContext(initial.id)} siteUrl={siteUrl()} meId={me.id} maxLinks={seo.maxInternalLinks} />;
}
