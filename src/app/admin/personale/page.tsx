import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings, getTags } from '@/lib/queries';
import { listArticles } from '@/lib/repo';
import { nowData, personalLists } from '@/lib/actions-personal';
import { onThisDay } from '@/lib/personal';
import { stripHtml } from '@/lib/utils';
import { CollectionsManager, LettersManager, NowForm, PastToday, PersonalSettingsForm, TypeByWords, UsesManager } from '@/components/admin/personal-admin';

export const dynamic = 'force-dynamic';
export default async function PersonalPage() {
  const me = await requireUser(); const admin = can(me, 'settings.manage'); const pub = can(me, 'article.publish');
  const [s, tags, mine, lists, now] = await Promise.all([getSettings(), getTags(), listArticles({ status: 'published', authorId: me.id, includeCircles: true }, 'published', 3000), personalLists(), nowData()]);
  const past = onThisDay(mine, new Date().toISOString().slice(0, 10)).slice(0, 3).map((a) => ({ id: a.id, title: a.title, yearsAgo: a.yearsAgo, excerpt: (a.excerpt || stripHtml(a.content)).slice(0, 240) }));
  return (
    <>
      <div className="page-title"><div><h1>Sito personale</h1><p>Gli strumenti di chi scrive in prima persona: l&apos;archivio che ti riscrive, le raccolte che si fanno da sole, il libro, il silenzio, l&apos;eredità. {admin && <><a href="/api/export/statico">Scarica il sito in scatola (ZIP statico)</a> · <a href={`/api/export/libro?dal=${new Date().getFullYear()}-01-01&formato=epub`}>Il libro di quest&apos;anno (EPUB)</a></>}</p></div></div>
      <PastToday items={past} />
      {pub && <div className="admin-grid-2">{admin && <NowForm initial={now ?? {}} />}<UsesManager uses={lists.uses.map((u) => ({ id: u.id, data: u.data }))} /></div>}
      {pub && <div className="admin-grid-2"><CollectionsManager collections={lists.collections.map((c) => ({ id: c.id, data: c.data }))} /><LettersManager list={lists.letters.map((c) => ({ id: c.id, data: c.data }))} /></div>}
      {admin && <TypeByWords />}
      {admin && <PersonalSettingsForm initial={s.personal ?? {}} tags={tags.map((t) => ({ id: t.id, name: t.name }))} />}
    </>
  );
}
