import type { Metadata } from 'next';
import { personalLists } from '@/lib/actions-personal';

export const metadata: Metadata = { title: 'Usa questo', description: 'Strumenti, libri e luoghi che consiglio, con la data dell\'ultima volta che l\'ho confermato.' };
export const dynamic = 'force-dynamic';
export default async function UsesPage() {
  const { uses } = await personalLists(); const kinds = [...new Set(uses.map((u) => u.data.kind))]; const old = Date.now() - 365 * 86_400_000;
  return <div className="account" style={{ maxWidth: 720 }}><div className="account-card trust-page"><h1>Usa questo</h1><p className="lead">Le cose che consiglio davvero. Accanto a ognuna c&apos;è la data dell&apos;ultima volta che ho controllato di pensarla ancora così.</p>{uses.length === 0 && <p className="help">Ancora nessun consiglio.</p>}{kinds.map((k) => <section key={k}><h2>{k}</h2><ul className="trust-list">{uses.filter((u) => u.data.kind === k).map((u) => <li key={u.id}><div>{u.data.url ? <a href={u.data.url} rel="noopener" target="_blank">{u.data.name}</a> : <b>{u.data.name}</b>}<p>{u.data.note}</p><p className="help">{+new Date(u.data.confirmedAt) < old ? '⚠︎ non lo riconfermo da più di un anno · ' : ''}confermato il {new Date(u.data.confirmedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div></li>)}</ul></section>)}</div></div>;
}
