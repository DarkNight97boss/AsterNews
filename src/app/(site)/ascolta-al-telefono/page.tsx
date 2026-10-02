import type { Metadata } from 'next';
import { getSettings } from '@/lib/queries';

export const metadata: Metadata = { title: 'Le notizie al telefono', description: 'Un numero da chiamare per ascoltare le notizie del giorno, senza internet.' };
export const dynamic = 'force-dynamic';
export default async function PhonePage() { const s = await getSettings(); const phone = s.access?.phone; return <div className="account" style={{ maxWidth: 620 }}><div className="account-card trust-page"><h1>Le notizie al telefono</h1><p className="lead">Per chi non ha internet, o non lo vuole: una chiamata e una voce legge le notizie del giorno. Costa quanto una telefonata normale.</p>{phone ? <p className="phone-big"><a href={`tel:${phone.replace(/\s+/g, '')}`}>{phone}</a></p> : <p className="help">Il numero non è ancora attivo. Si collega in Impostazioni → Scuola e accessibilità, puntando il servizio vocale a <code>/api/voce</code>.</p>}<p className="help">La segreteria si aggiorna da sola a ogni articolo pubblicato. Chi preferisce leggere trova lo stesso testo in <a href="/api/voce/testo">versione semplice</a>.</p></div></div>; }
