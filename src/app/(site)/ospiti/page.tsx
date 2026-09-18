import type { Metadata } from 'next';
import { listRecords } from '@/lib/records';
import { GuestbookPad } from '@/components/site/guestbook';

export const metadata: Metadata = { title: 'Libro degli ospiti', description: 'Lascia un messaggio scritto a mano.' };
export const dynamic = 'force-dynamic';
export default async function GuestbookPage() {
  const notes = await listRecords<{ name: string; image: string }>('guestbook', { status: 'approved', limit: 60 });
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Libro degli ospiti</h1><p className="lead">Niente tastiera: scrivi con il dito o con il mouse, come su un quaderno all&apos;ingresso.</p><GuestbookPad />{notes.length > 0 && <div className="guest-grid">{notes.map((n) => <figure key={n.id}><img src={n.data.image} alt={`Messaggio scritto a mano da ${n.data.name}`} loading="lazy" width={640} height={260} /><figcaption>{n.data.name} · {new Date(n.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</figcaption></figure>)}</div>}</div></div>;
}
