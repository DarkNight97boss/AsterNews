import type { Metadata } from 'next';
import { listArticles } from '@/lib/repo';
import { listRecords } from '@/lib/records';
import { wordCount } from '@/lib/content-render';

export const metadata: Metadata = { title: 'Quaderno: il lavoro in corso', description: 'La faccia grezza del sito: appunti, bozze dichiarate e cosa sta per arrivare.' };
export const dynamic = 'force-dynamic';
/** Due siti in uno: accanto alla faccia curata, un quaderno per chi vuole seguire il processo. Compare solo ciò che l'autore ha scelto di mostrare. */
export default async function NotebookPage() {
  const [drafts, seeds] = await Promise.all([listArticles({ status: ['draft', 'review', 'scheduled'], extraHas: 'notebook', includeCircles: true }, 'updated', 40), listRecords<{ text: string; public?: boolean }>('seed', { limit: 300 })]); const open = drafts.filter((a) => a.extra?.notebook && !a.extra.circle && !a.extra.abandoned); const notes = seeds.filter((s) => s.data.public);
  return <div className="account" style={{ maxWidth: 720 }}><div className="account-card trust-page notebook-page"><h1>Quaderno</h1><p className="lead">Qui non c&apos;è niente di finito. È quello su cui sto lavorando, mostrato apposta.</p><h2>In lavorazione</h2>{open.length === 0 ? <p className="help">Niente di dichiarato al momento.</p> : <ul className="trust-list">{open.map((a) => <li key={a.id}><div><b>{a.title || 'Senza titolo'}</b><p>{a.subtitle || a.excerpt}</p><p className="help">{wordCount(a.content)} parole finora · toccato il {new Date(a.updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}{a.status === 'scheduled' && a.scheduledAt ? ` · esce il ${new Date(a.scheduledAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}` : ''}</p></div></li>)}</ul>}<h2>Appunti sparsi</h2>{notes.length === 0 ? <p className="help">Nessun appunto reso pubblico.</p> : <ul className="notebook-notes">{notes.map((n) => <li key={n.id}>{n.data.text}<span className="help"> · {new Date(n.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span></li>)}</ul>}</div></div>;
}
