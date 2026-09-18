import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findArticle } from '@/lib/repo';
import { articleUrl } from '@/lib/queries';
import { stripCircles } from '@/lib/circles';
import { shortForm } from '@/lib/distribution';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = { robots: { index: false } };
/** Articolo via SMS e WhatsApp: la forma breve (due SMS al massimo) con i pulsanti per mandarla a chi non ha dati o non ha tempo. */
export default async function ShortPage({ params }: PageProps<'/breve/[id]'>) {
  const a = await findArticle((await params).id); if (!a || a.status !== 'published' || a.extra?.circle) notFound(); const url = siteUrl() + (await articleUrl(a));
  const sms = a.extra?.outputs?.sms ? `${a.extra.outputs.sms} ${url}` : shortForm(a.title, stripCircles(a.content), url); const wa = a.extra?.outputs?.whatsapp ? `${a.extra.outputs.whatsapp}\n${url}` : sms;
  return <div className="account" style={{ maxWidth: 520 }}><div className="account-card trust-page"><p className="kicker">In breve · {sms.length} caratteri</p><h1 style={{ fontSize: 24 }}>{a.title}</h1><p className="short-text">{sms}</p><p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><a className="btn btn-primary" href={`https://wa.me/?text=${encodeURIComponent(wa)}`} rel="noopener nofollow">Manda su WhatsApp</a><a className="btn btn-outline" href={`sms:?&body=${encodeURIComponent(sms)}`}>Manda per SMS</a><a className="btn btn-ghost" href={url}>Leggi tutto</a></p><p className="help">Pensato per chi non ha dati sul telefono o ha un minuto solo: sta in due SMS.</p></div></div>;
}
