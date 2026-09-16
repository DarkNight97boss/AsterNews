import { redirect } from 'next/navigation';
import { SocialCenter } from '@/components/admin/social-center';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, listPublished } from '@/lib/queries';
import { listSocialPosts } from '@/lib/repo-extra2';
import { bestHour, configuredNetworks, socialSettings } from '@/lib/social';

export default async function SocialPage() {
  const me = await requireUser(); if (!can(me, 'article.publish')) redirect('/admin');
  const [posts, recent, s, hour, cats] = await Promise.all([listSocialPosts(100), listPublished({}, 30), socialSettings(), bestHour(), getCategories()]);
  return <SocialCenter posts={posts} recent={recent.map((a) => ({ id: a.id, title: a.title, category: cats.find((c) => c.id === a.categoryId)?.name ?? '' }))} networks={configuredNetworks(s)} auto={s.autoNetworks} bestHour={hour} />;
}
