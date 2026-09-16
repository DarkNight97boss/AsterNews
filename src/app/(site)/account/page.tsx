import type { Metadata } from 'next';
import { getCurrentReader } from '@/lib/auth';
import { getSettings } from '@/lib/queries';
import { DEFAULT_PAYWALL } from '@/lib/models';
import { AccountPanel } from './account-panel';
import { PlansBox } from '@/components/site/plans-box';
import { availableProviders, authSettings } from '@/lib/oauth';
import { mailConfigured } from '@/lib/mailer';

export const metadata: Metadata = { title: 'Il mio account', robots: { index: false } };

export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const [reader, s, sp, providers, auth, mailOk] = await Promise.all([getCurrentReader(), getSettings(), searchParams, availableProviders(), authSettings(), mailConfigured()]);
  const pw = { ...DEFAULT_PAYWALL, ...(s.paywall ?? {}) };
  const plans = (pw.plans ?? []).filter((p) => p.stripePriceId && pw.enabled);
  return <><AccountPanel reader={reader} paywall={{ enabled: pw.enabled, price: pw.monthlyPrice, free: pw.freeArticles }} siteName={s.siteName} notice={typeof sp.abbonamento === 'string' ? sp.abbonamento : ''} redirectTo={typeof sp.redirect === 'string' ? sp.redirect : ''} providers={providers} magic={auth.magicLink && mailOk} error={typeof sp.errore === 'string' ? sp.errore : ''} /><PlansBox plans={plans} loggedIn={!!reader} giftCode={typeof sp.regalo === 'string' ? sp.regalo : ''} /></>;
}
