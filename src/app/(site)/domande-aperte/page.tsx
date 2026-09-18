import type { Metadata } from 'next';
import Link from 'next/link';
import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories } from '@/lib/queries';

export const metadata: Metadata = { title: 'Domande aperte', description: 'Quello che ancora non sappiamo sulle storie che stiamo seguendo.' };
export const dynamic = 'force-dynamic';
export default async function OpenQuestionsPage() {
  const [arts, cats] = await Promise.all([listArticles({ status: 'published', extraHas: 'openQuestions' }, 'updated', 200), getCategories()]); const list = arts.filter((a) => (a.extra?.openQuestions ?? []).length > 0);
  return (
    <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Domande aperte</h1>
      <p className="lead">Un articolo finisce, una storia no. Qui teniamo in vista quello che ancora non sappiamo: se hai una risposta, scrivici.</p>
      {list.length === 0 && <p className="help">Nessuna domanda aperta in questo momento.</p>}
      {list.map((a) => <section key={a.id}><h2><Link href={articleUrlWith(a, cats)}>{a.title}</Link></h2><ul>{a.extra!.openQuestions!.map((q, i) => <li key={i}>{q}</li>)}</ul><p className="help">Ultimo aggiornamento: {new Date(a.updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} · <Link href="/segnalazioni">Ho un&apos;informazione</Link></p></section>)}
    </div></div>
  );
}
