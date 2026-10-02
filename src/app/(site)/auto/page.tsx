import type { Metadata } from 'next';
import { getSettings } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = { title: 'In auto', description: 'Le notizie su CarPlay e Android Auto, come podcast con i capitoli.' };
export default async function CarPage() { const s = await getSettings(); const feed = `${siteUrl()}/feed/podcast.xml`; return <div className="account" style={{ maxWidth: 640 }}><div className="account-card trust-page"><h1>In auto</h1><p className="lead">Il notiziario del mattino e gli articoli con l&apos;audio arrivano in macchina come un podcast, con i capitoli per saltare da una notizia all&apos;altra dal volante.</p><ol className="odg"><li><b>Apri l&apos;app podcast</b> che usi in auto (Apple Podcasts, Pocket Casts, AntennaPod…).</li><li><b>Aggiungi il feed</b>: <code>{feed}</code></li><li><b>Cerca «{s.siteName}»</b> su CarPlay o Android Auto: gli episodi nuovi si scaricano da soli.</li></ol><p className="help">I capitoli seguono lo standard Podcast Namespace; le app che li supportano mostrano una notizia per capitolo.</p></div></div>; }
