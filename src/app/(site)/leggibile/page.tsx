import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentReader } from '@/lib/auth';
import { BigPrefs } from '@/components/site/big-prefs';

export const metadata: Metadata = { title: 'Rendi il sito più leggibile', description: 'Carattere grande e alto contrasto, scelti una volta e validi in tutto il sito.' };
export const dynamic = 'force-dynamic';
export default async function ReadablePage() { const r = await getCurrentReader(); return <div className="account" style={{ maxWidth: 680 }}><div className="account-card trust-page"><h1>Rendi il sito più leggibile</h1><p className="lead">Scegli una volta: vale per tutte le pagine. {r ? 'Hai l\'account: la scelta ti segue su ogni dispositivo.' : <>Se <Link href="/account?redirect=/leggibile">accedi</Link>, la scelta ti segue anche su altri dispositivi.</>}</p><BigPrefs logged={!!r} initial={r?.prefs?.a11y} /></div></div>; }
