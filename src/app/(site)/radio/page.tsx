import type { Metadata } from 'next';
import { latestRadio } from '@/lib/formats-data';
import { getPublished } from '@/lib/queries';

export const metadata: Metadata = { title: 'La radio del mattino', description: 'Cinque minuti di notizie ogni mattina, da ascoltare mentre fai colazione o guidi.' };
export const dynamic = 'force-dynamic';
export default async function RadioPage() {
  const [episodes, arts] = await Promise.all([latestRadio(), getPublished(10)]); const withAudio = arts.filter((a) => a.extra?.audioUrl);
  return <div className="account" style={{ maxWidth: 680 }}><div className="account-card trust-page"><h1>La radio del mattino</h1><p className="lead">Cinque minuti, le notizie del giorno, una voce. Si registra da sola ogni mattina e finisce anche nel <a href="/feed/podcast.xml">podcast</a> e al <a href="/ascolta-al-telefono">telefono</a>.</p>{episodes.length === 0 ? <p className="help">Nessun notiziario registrato ancora{withAudio.length ? ': intanto puoi ascoltare gli articoli con l\'audio qui sotto.' : '.'}</p> : <>{episodes.slice(0, 1).map((e) => <section key={e.id} className="radio-now"><b>{e.data.title}</b><audio controls preload="none" src={e.data.url} style={{ width: '100%' }} /><p className="help">circa {Math.round((e.data.words || 700) / 150)} minuti · voce sintetica</p></section>)}{episodes.length > 1 && <details><summary>Giorni precedenti</summary><ul className="trust-list">{episodes.slice(1).map((e) => <li key={e.id}><time>{e.data.date}</time><div><audio controls preload="none" src={e.data.url} /></div></li>)}</ul></details>}</>}{withAudio.length > 0 && <><h2>Articoli da ascoltare</h2><ul className="trust-list">{withAudio.map((a) => <li key={a.id}><div><b>{a.title}</b><audio controls preload="none" src={a.extra!.audioUrl} style={{ width: '100%', marginTop: 4 }} /></div></li>)}</ul></>}</div></div>;
}
