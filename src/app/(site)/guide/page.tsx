import type { Metadata } from 'next';
import Link from 'next/link';
import { articleUrlWith, getCategories } from '@/lib/queries';
import { listArticles } from '@/lib/repo';
import { guideStatus } from '@/lib/service';

export const metadata: Metadata = { title: 'Guide pratiche', description: 'Come si fa, con la data dell\'ultima verifica: se è passata troppo, lo diciamo.' };
export const dynamic = 'force-dynamic';
export default async function GuidesPage() {
  const [list, cats] = await Promise.all([listArticles({ status: 'published', extraHas: 'guide' }, 'title', 300), getCategories()]); const now = Date.now(); const guides = list.filter((a) => a.extra?.guide);
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Guide pratiche</h1><p className="lead">Pagine che spiegano come si fa una cosa in città. Ogni guida porta la data dell&apos;ultima verifica: quando passa troppo tempo, il badge diventa un avviso e la redazione la ricontrolla.</p>{guides.length === 0 && <p className="help">Nessuna guida ancora.</p>}<ul className="trust-list">{guides.map((a) => { const g = guideStatus(a.extra!.guide!.verifiedAt, a.extra!.guide!.everyDays || 90, now); return <li key={a.id}><span className={`guide-dot guide-${g.state}`} aria-hidden="true" /><div><Link href={articleUrlWith(a, cats)}>{a.title}</Link><div className="help">{g.state === 'never' ? 'non ancora verificata' : g.state === 'ok' ? `verificata il ${new Date(a.extra!.guide!.verifiedAt).toLocaleDateString('it-IT')}` : `ultima verifica ${g.days} giorni fa`}</div></div></li>; })}</ul></div></div>;
}
