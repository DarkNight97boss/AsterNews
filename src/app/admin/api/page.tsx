import { redirect } from 'next/navigation';
import { ApiKeysManager } from '@/components/admin/api-keys-manager';
import { WebhooksManager } from '@/components/admin/webhooks-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { listApiKeys } from '@/lib/repo-extra3';
import { DEFAULT_API } from '@/lib/models';
import { siteUrl } from '@/lib/site-url';

export default async function ApiAdmin() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [keys, s] = await Promise.all([listApiKeys(), getSettings()]); const base = siteUrl();
  return (
    <>
      <ApiKeysManager keys={keys} settings={{ ...DEFAULT_API, ...(s.api ?? {}) }} base={base} />
      <WebhooksManager initial={s.webhooks ?? []} />
      <div className="panel"><div className="panel-title">Widget per siti terzi, bot e assistenti vocali</div>
        <ul className="activity">
          <li><span>🧩</span><div><b>Widget incorporabile</b> (ultime notizie, eventi, meteo): <code>{`<script src="${base}/api/widget.js" data-kind="ultime" data-n="5" data-category="cronaca" data-theme="light"></script>`}</code></div></li>
          <li><span>🔊</span><div><b>Alexa Flash Briefing</b>: <code>{base}/api/flash-briefing</code> (con audio se c&apos;è l&apos;audio-articolo). Google Assistant legge il feed <code>{base}/feed.xml</code>.</div></li>
          <li><span>🤖</span><div><b>Bot Telegram</b> per i lettori (/ultime, /cerca, /meteo): registra il webhook <code>{base}/api/bots/telegram</code> con il token del bot (Impostazioni → Social) e <code>secret_token</code> = CRON_SECRET.</div></li>
          <li><span>🎧</span><div><b>Podcast</b>: <code>{base}/feed/podcast.xml</code> · pagina <code>{base}/podcast</code> · capitoli <code>{base}/api/chapters/&#123;slug&#125;</code></div></li>
          <li><span>📰</span><div><b>Edizione digitale del giorno</b> (sfogliabile e stampabile in PDF): <code>{base}/edizione</code></div></li>
          <li><span>📱</span><div><b>App iOS/Android</b>: cartella <code>mobile/</code> con la configurazione Capacitor pronta (stessa API, notifiche push native).</div></li>
        </ul>
      </div>
    </>
  );
}
