import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { magicLoginAction } from '@/lib/actions-readers';

export const metadata: Metadata = { title: 'Accesso', robots: { index: false } };
export default async function MagicPage({ searchParams }: PageProps<'/account/magic'>) {
  const { t, back } = await searchParams;
  const ok = typeof t === 'string' && (await magicLoginAction(t));
  if (ok) redirect(typeof back === 'string' && back.startsWith('/') ? back : '/account');
  return <div className="page-head" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}><h1>Link non valido</h1><p>Il link di accesso è scaduto o già usato. <Link href="/account">Richiedine uno nuovo</Link>.</p></div>;
}
