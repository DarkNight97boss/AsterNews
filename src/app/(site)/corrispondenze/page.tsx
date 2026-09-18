import type { Metadata } from 'next';
import Link from 'next/link';
import { personalLists } from '@/lib/personal-data';

export const metadata: Metadata = { title: 'Corrispondenze', description: 'Scambi di lettere pubbliche con altri autori.' };
export const dynamic = 'force-dynamic';
export default async function LettersIndex() { const { letters } = await personalLists(); return <div className="account" style={{ maxWidth: 720 }}><div className="account-card trust-page"><h1>Corrispondenze</h1><p className="lead">Lettere pubbliche scambiate con altre persone che scrivono, impaginate come un pezzo solo.</p>{letters.length === 0 && <p className="help">Nessuna corrispondenza per ora.</p>}<ul className="trust-list">{letters.map((l) => <li key={l.id}><div><Link href={`/corrispondenze/${l.data.slug}`}>{l.data.title}</Link><p>con {l.data.withName} · {l.data.letters.length} lettere</p></div></li>)}</ul></div></div>; }
