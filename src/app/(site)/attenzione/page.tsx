import type { Metadata } from 'next';
import { AttentionBudget } from '@/components/site/attention-budget';

export const metadata: Metadata = { title: 'Il tuo bilancio dell\'attenzione', description: 'Quanto tempo hai passato a leggere questa settimana, e su cosa. I dati restano nel tuo browser.', robots: { index: false } };
export default function AttentionPage() {
  return <div className="account" style={{ maxWidth: 620 }}><div className="account-card trust-page"><h1>Il tuo bilancio dell&apos;attenzione</h1><p className="lead">Non vogliamo più tempo possibile: vogliamo che quello che ci dai sia ben speso. Datti un tetto e controlla dove va la tua attenzione.</p><AttentionBudget /></div></div>;
}
