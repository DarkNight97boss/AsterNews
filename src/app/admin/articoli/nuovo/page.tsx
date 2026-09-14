import { ArticleEditor } from '@/components/admin/article-editor';
import { requireUser } from '@/lib/auth';
import { Article } from '@/lib/models';
import { permissionsOf } from '@/lib/permissions';
import { getCategories, getMedia, getSeoSettings, getTags, getUsers, getZones, seoContext } from '@/lib/queries';
import { uid } from '@/lib/utils';

export default async function NewArticlePage() {
  const me = await requireUser();
  const now = new Date().toISOString();
  const initial: Article = {
    id: uid('a'), slug: '', kicker: '', title: '', subtitle: '', excerpt: '', content: '', coverImage: '', coverCaption: '',
    categoryId: getCategories()[0]?.id ?? '', tagIds: [], authorId: me.id, zoneId: '', address: '', status: 'draft', format: 'standard', videoUrl: '', gallery: [],
    liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true,
    seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: null, scheduledAt: null, createdAt: now, updatedAt: now,
  };
  return <ArticleEditor initial={initial} isNew isPublic={false} categories={getCategories()} zones={getZones()} tags={getTags()} users={getUsers()} media={getMedia()} permissions={permissionsOf(me)} seoCtx={seoContext(initial.id)} siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ''} maxLinks={getSeoSettings().maxInternalLinks} />;
}
