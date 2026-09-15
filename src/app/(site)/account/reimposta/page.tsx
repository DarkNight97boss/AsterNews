import type { Metadata } from 'next';
import Link from 'next/link';
import { peekToken } from '@/lib/repo-extra';
import { ReaderResetForm } from '../recover-forms';

export const metadata: Metadata = { title: 'Nuova password', robots: { index: false } };
export default async function ReaderResetPage({ searchParams }: PageProps<'/account/reimposta'>) {
  const { t } = await searchParams;
  const token = typeof t === 'string' ? t : '';
  if (!token || !(await peekToken(token, 'reader-reset'))) return <div className="page-head" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}><h1>Link non valido</h1><p><Link href="/account/recupero">Richiedi un nuovo link</Link></p></div>;
  return <ReaderResetForm token={token} />;
}
