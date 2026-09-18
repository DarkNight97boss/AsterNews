import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/queries';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Abbonamento sospeso', description: 'Come il caffè sospeso: chi può paga un abbonamento per chi non può, in modo anonimo.' };
export const dynamic = 'force-dynamic';
export default async function SuspendedPage() {
  const pool = (await getSettings()).commons?.suspendedPool ?? 0;
  return <div className="account" style={{ maxWidth: 680 }}><div className="account-card trust-page"><h1>Abbonamento sospeso</h1><p className="lead">Come il caffè sospeso a Napoli: qualcuno lo paga, qualcun altro lo trova pronto. Senza domande e senza nomi.</p><p className="trust-score"><b>{pool}</b> {pool === 1 ? 'abbonamento sospeso disponibile' : 'abbonamenti sospesi disponibili'} in questo momento.</p><h2>Vuoi lasciarne uno?</h2><p>Fai una donazione dalla pagina <Link href="/sostieni">Sostieni</Link> scrivendo «sospeso» nel messaggio: la redazione lo aggiunge al conto qui sopra.</p><h2>Ne hai bisogno?</h2><p>Basta l&apos;email. Non chiediamo perché e non lo diciamo a nessuno: la richiesta viene cancellata appena ti mandiamo il codice.</p><ContributionForm kind="suspended-request" open /></div></div>;
}
