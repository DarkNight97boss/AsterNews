import type { Metadata } from 'next';
import Link from 'next/link';
import { correspondents } from '@/lib/service-data';

export const metadata: Metadata = { title: 'Lettori-corrispondenti', description: 'Chi manda foto, segnalazioni e racconti che il giornale pubblica: il distintivo di chi contribuisce davvero.' };
export const dynamic = 'force-dynamic';
export default async function CorrespondentsPage() {
  const list = await correspondents();
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Lettori-corrispondenti</h1><p className="lead">Chi ha mandato almeno tre contributi che abbiamo pubblicato (foto, racconti, prezzi, segnalazioni) è un lettore-corrispondente; da dieci in su, di fiducia. Per entrare: <Link href="/account">accedi</Link> e <Link href="/comunita">partecipa</Link>.</p>{list.length === 0 && <p className="help">Ancora nessuno: il primo distintivo può essere il tuo.</p>}<ul className="trust-list">{list.map((c) => <li key={c.id}><span aria-hidden="true" style={{ fontSize: 22 }}>{c.badge.icon}</span><div><b>{c.name}</b> <span className="help">· {c.badge.label} · {c.approved} contributi pubblicati</span></div></li>)}</ul></div></div>;
}
