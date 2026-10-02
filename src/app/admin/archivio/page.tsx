import { requirePermission } from '@/lib/auth';
import { listDeposits, storiesWithoutFollowUp, verifyChain } from '@/lib/archive-data';
import { articleUrlWith, getCategories, getSettings } from '@/lib/queries';
import { ArchiveSettings, NoFollowUp } from '@/components/admin/archive-admin';

export const dynamic = 'force-dynamic';
export default async function ArchiveAdminPage() {
  await requirePermission('article.publish'); const [s, deposits, chain, stories, cats] = await Promise.all([getSettings(), listDeposits(50), verifyChain(), storiesWithoutFollowUp(), getCategories()]);
  return <><div className="page-title"><div><h1>Archivio e memoria</h1><p>Il deposito legale digitale e le storie che aspettano un seguito. Le pagine pubbliche: un giorno qualsiasi, accadde oggi, annate, chi era chi, toponimi, documenti.</p></div></div><div className="admin-grid-2"><ArchiveSettings initial={{ depositEnabled: !!s.archive?.depositEnabled, depositEmail: s.archive?.depositEmail ?? '' }} deposits={deposits} chain={chain} /><NoFollowUp list={stories.map((a) => ({ id: a.id, title: a.title, publishedAt: a.publishedAt ?? '', views: a.views, url: articleUrlWith(a, cats) }))} /></div></>;
}
