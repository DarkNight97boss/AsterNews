import type { Metadata } from 'next';
import Link from 'next/link';
import { peekToken } from '@/lib/repo-extra';
import { ResetForm } from './reset-form';

export const metadata: Metadata = { title: 'Nuova password', robots: { index: false } };

export default async function ResetPage({ searchParams }: PageProps<'/login/reimposta'>) {
  const { token } = await searchParams;
  const t = typeof token === 'string' ? token : '';
  const valid = t ? await peekToken(t, 'reset') : null;
  if (!valid) return <div className="login-page"><div className="login-card"><Link href="/" className="logo">Aster<span>news</span></Link><p className="lead">Il link non è valido o è scaduto.</p><p className="help"><Link href="/login/recupero">Richiedi un nuovo link</Link></p></div></div>;
  return <ResetForm token={t} />;
}
