import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { readTwoFactorPending } from '@/lib/auth';
import { TwoFactorForm } from './two-factor-form';

export const metadata: Metadata = { title: 'Verifica in due passaggi', robots: { index: false } };

export default async function VerifyPage() {
  const pending = await readTwoFactorPending();
  if (!pending) redirect('/login');
  return <TwoFactorForm />;
}
