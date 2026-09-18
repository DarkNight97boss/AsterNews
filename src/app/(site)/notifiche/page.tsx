import type { Metadata } from 'next';
import { getCategories, getZones } from '@/lib/queries';
import { PushTopics } from '@/components/site/push-topics';
import { vapidKeys, pushEnabled } from '@/lib/push';

export const metadata: Metadata = { title: 'Notifiche su misura', description: 'Scegli le zone e gli argomenti per cui vuoi ricevere le notifiche.' };
export const dynamic = 'force-dynamic';
export default async function NotificationsPage() {
  const [cats, zones, enabled] = await Promise.all([getCategories(), getZones(), pushEnabled()]); const key = enabled ? (await vapidKeys()).publicKey : '';
  return <div className="account" style={{ maxWidth: 680 }}><div className="account-card"><h1>Notifiche su misura</h1><p className="lead">Ricevi un avviso solo per ciò che ti interessa: il tuo quartiere, lo sport, la cronaca. Le ultim&apos;ora importanti arrivano comunque a tutti.</p>{enabled ? <PushTopics publicKey={key} categories={cats.filter((c) => c.showInMenu).map((c) => ({ id: c.id, name: c.name }))} zones={zones.slice(0, 40).map((z) => ({ id: z.id, name: z.name }))} /> : <p className="notice">Le notifiche non sono ancora attive su questo sito.</p>}</div></div>;
}
