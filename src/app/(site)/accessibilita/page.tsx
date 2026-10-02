import type { Metadata } from 'next';
import { a11yAudits } from '@/lib/platform-data';

export const metadata: Metadata = { title: 'Accessibilità', description: 'Ogni mese il sito controlla sé stesso: immagini senza descrizione, contrasti, titoli. I risultati sono pubblici.' };
export const dynamic = 'force-dynamic';
export default async function A11yPage() {
  const list = await a11yAudits(12);
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Accessibilità</h1><p className="lead">Il primo di ogni mese il sito visita le proprie pagine e cerca quello che rende la lettura difficile a chi usa uno screen reader o la tastiera. Qui i risultati, mese per mese, senza abbellimenti. Le preferenze di lettura si regolano in <a href="/leggibile">Leggibile</a>.</p>{list.length === 0 && <p className="help">Nessun controllo ancora registrato.</p>}{list.map((a) => <details key={a.month} open={a === list[0]}><summary><b>{a.month}</b> · punteggio {a.score}/100 · {a.errors} errori, {a.warns} avvisi</summary><ul className="trust-list">{a.pages.map((p) => <li key={p.path}><div><code>{p.path}</code> <span className="help">· {p.errors} errori, {p.warns} avvisi</span>{p.issues.length > 0 && <ul>{p.issues.map((i, k) => <li key={k} className="help">{i}</li>)}</ul>}</div></li>)}</ul></details>)}</div></div>;
}
