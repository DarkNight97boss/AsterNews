import type { Metadata } from 'next';
import { getCurrentReader } from '@/lib/auth';
import { getSettings } from '@/lib/queries';
import { DEFAULT_PAYWALL } from '@/lib/models';
import { AccountPanel } from './account-panel';

export const metadata: Metadata = { title: 'Il mio account', robots: { index: false } };

export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const [reader, s, sp] = await Promise.all([getCurrentReader(), getSettings(), searchParams]);
  const pw = { ...DEFAULT_PAYWALL, ...(s.paywall ?? {}) };
  return <AccountPanel reader={reader} paywall={{ enabled: pw.enabled, price: pw.monthlyPrice, free: pw.freeArticles }} siteName={s.siteName} notice={typeof sp.abbonamento === 'string' ? sp.abbonamento : ''} redirectTo={typeof sp.redirect === 'string' ? sp.redirect : ''} />;
}
