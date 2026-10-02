import type { Metadata } from 'next';
import { peerFeeds } from '@/lib/platform-data';

export const metadata: Metadata = { title: 'La rete delle testate', description: 'Le testate locali amiche: cosa pubblicano oggi, senza scambiarsi dati dei lettori.' };
export const dynamic = 'force-dynamic';
export default async function NetworkPage() {
  const peers = await peerFeeds();
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>La rete delle testate</h1><p className="lead">Giornali locali che si leggono a vicenda: ognuno espone i propri titoli in un formato aperto e li mostra agli altri. Nessun dato dei lettori viaggia. Chi vuole si collega da <code>/api/rete</code>.</p>{peers.length === 0 && <p className="help">Nessuna testata collegata ancora.</p>}{peers.map((p) => <section key={p.url}><h2><a href={p.url} target="_blank" rel="noopener">{p.name}</a>{!p.ok && <span className="help"> · non raggiungibile</span>}</h2><ul className="trust-list">{p.articles.map((a) => <li key={a.id}><time>{a.publishedAt?.slice(0, 10)}</time><div><a href={a.url} target="_blank" rel="noopener">{a.title}</a>{a.category && <span className="help"> · {a.category}</span>}{a.share && <span className="help"> · condivisibile</span>}</div></li>)}</ul></section>)}</div></div>;
}
