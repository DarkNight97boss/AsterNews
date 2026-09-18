import type { Metadata } from 'next';
import Link from 'next/link';
import { personalLists } from '@/lib/actions-personal';

export const metadata: Metadata = { title: 'Raccolte', description: 'I temi che tornano, messi insieme da soli.' };
export const dynamic = 'force-dynamic';
export default async function CollectionsPage() { const { collections } = await personalLists(); return <div className="account" style={{ maxWidth: 720 }}><div className="account-card trust-page"><h1>Raccolte</h1><p className="lead">I temi che tornano negli anni, raccolti da soli anche dove non c&apos;era un tag.</p>{collections.length === 0 && <p className="help">Nessuna raccolta per ora.</p>}<ul className="trust-list">{collections.map((c) => <li key={c.id}><div><Link href={`/raccolte/${c.data.slug}`}>{c.data.title}</Link><p>{c.data.intro}</p></div></li>)}</ul></div></div>; }
