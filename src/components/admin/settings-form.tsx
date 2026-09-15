'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveSettingsAction } from '@/lib/actions';
import { Category, DEFAULT_ANALYTICS, DEFAULT_BACKUP, DEFAULT_CACHE, DEFAULT_COMMUNITY, DEFAULT_MONITORING, DEFAULT_NEWSLETTER, DEFAULT_PAYWALL, DEFAULT_PUSH, DEFAULT_SEARCH, DEFAULT_STORAGE, SiteSettings } from '@/lib/models';
import { ThemePicker } from './theme-picker';
import { DEFAULT_SEO_SETTINGS } from '@/lib/seo-engine';
import { toast } from '@/components/ui/toaster';

type Tab = 'generale' | 'tema' | 'seo' | 'email' | 'lettori' | 'servizi' | 'sistema';
const TABS: { id: Tab; label: string }[] = [{ id: 'generale', label: 'Generale' }, { id: 'tema', label: 'Tema' }, { id: 'seo', label: 'SEO' }, { id: 'email', label: 'Newsletter ed email' }, { id: 'lettori', label: 'Lettori e abbonamenti' }, { id: 'servizi', label: 'Immagini, notifiche, statistiche' }, { id: 'sistema', label: 'Sistema' }];

export function SettingsForm({ initial, categories, env }: { initial: SiteSettings; categories: Category[]; env: { mailEnv: boolean; blob: boolean; supabaseStorage: boolean; cronSecret: boolean; stripeEnv: boolean } }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('generale');
  const [s, setS] = useState<SiteSettings>({
    ...initial, seo: { ...DEFAULT_SEO_SETTINGS, ...(initial.seo ?? {}) }, newsletter: { ...DEFAULT_NEWSLETTER, ...(initial.newsletter ?? {}) }, storage: { ...DEFAULT_STORAGE, ...(initial.storage ?? {}) }, paywall: { ...DEFAULT_PAYWALL, ...(initial.paywall ?? {}) },
    community: { ...DEFAULT_COMMUNITY, ...(initial.community ?? {}) }, monitoring: { ...DEFAULT_MONITORING, ...(initial.monitoring ?? {}) }, analytics: { ...DEFAULT_ANALYTICS, ...(initial.analytics ?? {}) }, push: { ...DEFAULT_PUSH, ...(initial.push ?? {}) }, cache: { ...DEFAULT_CACHE, ...(initial.cache ?? {}) }, search: { ...DEFAULT_SEARCH, ...(initial.search ?? {}) }, backup: { ...DEFAULT_BACKUP, ...(initial.backup ?? {}) },
  });
  const seo = s.seo!; const nl = s.newsletter!; const st = s.storage!; const pw = s.paywall!; const cm = s.community!; const mon = s.monitoring!; const an = s.analytics!; const ps = s.push!; const ch = s.cache!; const se = s.search!; const bk = s.backup!;
  const up = <K extends keyof SiteSettings>(k: K, patch: Partial<NonNullable<SiteSettings[K]>>) => setS({ ...s, [k]: { ...(s[k] as object), ...patch } });
  const [pending, start] = useTransition();
  const cat = (id: string) => categories.find((c) => c.id === id);
  const move = (i: number, d: number) => { const l = [...s.homeSections]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setS({ ...s, homeSections: l }); };
  const save = () => start(async () => { const r = await saveSettingsAction(s); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); });
  const Switch = ({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) => <label className="switch"><input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} /> {label}</label>;
  return (
    <>
      <div className="page-title"><div><h1>Impostazioni</h1><p>Configurazione generale del sito e dei servizi collegati.</p></div><div className="actions"><button className="btn btn-primary" disabled={pending} onClick={save}>Salva impostazioni</button></div></div>
      <div className="tabs-bar">{TABS.map((t) => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

      {tab === 'generale' && <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Identità</div>
            <div className="form-row"><div className="field"><label>Nome testata</label><input className="input" value={s.siteName} onChange={(e) => setS({ ...s, siteName: e.target.value })} /></div><div className="field"><label>Payoff</label><input className="input" value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} /></div></div>
            <div className="field"><label>Descrizione (meta description home)</label><textarea className="textarea" value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} /></div>
            <div className="field"><label>Link &quot;Abbonati&quot; (vuoto = newsletter)</label><input className="input" value={s.subscribeUrl} onChange={(e) => setS({ ...s, subscribeUrl: e.target.value })} placeholder="https://..." /></div>
            <div className="field"><label>Testo footer / gerenza</label><textarea className="textarea" style={{ minHeight: 60 }} value={s.footerText} onChange={(e) => setS({ ...s, footerText: e.target.value })} /></div>
          </div>
          <div className="panel"><div className="panel-title">Ticker Ultim&apos;ora <Switch on={s.tickerEnabled} set={(v) => setS({ ...s, tickerEnabled: v })} label="Attivo" /></div>
            <p className="help">Gli articoli marcati &quot;Ultim&apos;ora&quot; compaiono automaticamente. Qui puoi aggiungere voci manuali.</p>
            {s.ticker.map((t, i) => <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}><input className="input" value={t} onChange={(e) => setS({ ...s, ticker: s.ticker.map((x, j) => (j === i ? e.target.value : x)) })} /><button className="icon-btn danger" onClick={() => setS({ ...s, ticker: s.ticker.filter((_, j) => j !== i) })}>✕</button></div>)}
            <button className="btn btn-outline btn-sm" onClick={() => setS({ ...s, ticker: [...s.ticker, ''] })}>+ Aggiungi voce</button>
          </div>
          <div className="panel"><div className="panel-title">Meteo e città</div>
            <div className="form-row">
              <div className="field"><label>Città</label><input className="input" value={s.weatherCity} onChange={(e) => setS({ ...s, weatherCity: e.target.value })} /></div>
              <div className="field"><label>Latitudine</label><input className="input" type="number" step="0.0001" value={s.weatherLat} onChange={(e) => setS({ ...s, weatherLat: Number(e.target.value) })} /></div>
              <div className="field"><label>Longitudine</label><input className="input" type="number" step="0.0001" value={s.weatherLon} onChange={(e) => setS({ ...s, weatherLon: Number(e.target.value) })} /></div>
            </div>
            <div className="field"><label>Link Google News (fonte preferita)</label><input className="input" value={s.googleNewsUrl} onChange={(e) => setS({ ...s, googleNewsUrl: e.target.value })} placeholder="https://news.google.com/publications/..." /></div>
          </div>
          <div className="panel"><div className="panel-title">Social</div><div className="form-row">{(['facebook', 'instagram', 'x', 'youtube', 'telegram'] as const).map((k) => <div key={k} className="field"><label>{k}</label><input className="input" value={s.socials[k]} onChange={(e) => setS({ ...s, socials: { ...s.socials, [k]: e.target.value } })} /></div>)}</div></div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Sezioni homepage</div>
            <p className="help">Ordine dei blocchi per categoria nella home.</p>
            <ul className="sortable-list">{s.homeSections.map((id, i) => <li key={id}><span className="handle">⋮⋮</span><span className="status-dot" style={{ background: cat(id)?.color }} />{cat(id)?.name}<span className="order-btns"><button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button className="icon-btn" disabled={i === s.homeSections.length - 1} onClick={() => move(i, 1)}>↓</button><button className="icon-btn danger" onClick={() => setS({ ...s, homeSections: s.homeSections.filter((x) => x !== id) })}>✕</button></span></li>)}</ul>
            <select className="select" value="" onChange={(e) => e.target.value && setS({ ...s, homeSections: [...s.homeSections, e.target.value] })}><option value="">+ Aggiungi sezione...</option>{categories.filter((c) => !s.homeSections.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <div className="panel"><div className="panel-title">Lettura</div><div className="field"><label>Articoli per pagina</label><input className="input" type="number" min={4} max={48} value={s.articlesPerPage} onChange={(e) => setS({ ...s, articlesPerPage: Number(e.target.value) })} /></div></div>
        </div>
      </div>}

      {tab === 'tema' && <div className="panel"><div className="panel-title">Tema del sito</div><p className="help" style={{ marginBottom: 14 }}>Il motore è lo stesso: cambiano colori, font, testata, layout della home e stile delle card. Per siti gemelli con dominio proprio usa le <Link href="/admin/edizioni">Edizioni</Link>.</p><ThemePicker value={s.theme} onChange={(theme) => setS({ ...s, theme })} /></div>}

      {tab === 'seo' && <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">SEO automatica</div>
          <p className="help" style={{ marginBottom: 12 }}>Al salvataggio di ogni articolo il motore compila i campi mancanti, corregge immagini e link esterni e inserisce link interni.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Switch on={seo.autoOptimizeOnSave} set={(v) => up('seo', { autoOptimizeOnSave: v })} label="Ottimizza automaticamente al salvataggio" />
            <Switch on={seo.autoInternalLinks} set={(v) => up('seo', { autoInternalLinks: v })} label="Inserisci link interni automatici" />
            <Switch on={seo.fixImages} set={(v) => up('seo', { fixImages: v })} label="Correggi alt delle immagini e link esterni" />
          </div>
          <div className="form-row" style={{ marginTop: 14 }}><div className="field"><label>Massimo link interni per articolo</label><input className="input" type="number" min={0} max={10} value={seo.maxInternalLinks} onChange={(e) => up('seo', { maxInternalLinks: Number(e.target.value) })} /></div><div className="field"><label>Google Search Console (token)</label><input className="input" value={seo.searchConsoleToken} onChange={(e) => up('seo', { searchConsoleToken: e.target.value })} /></div></div>
          <p className="help">Il sito espone sitemap a indice, news sitemap, robots con anteprime grandi per Discover, feed RSS, canonical e dati strutturati NewsArticle, LiveBlog, Video, FAQ, Event, Person e BreadcrumbList.</p>
        </div>
        <div className="panel"><div className="panel-title">Ricerca interna</div>
          <div className="field"><label>Sinonimi (una riga per gruppo: parola=sinonimo1,sinonimo2)</label><textarea className="textarea" style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 12 }} value={se.synonyms} onChange={(e) => up('search', { synonyms: e.target.value })} /></div>
          <p className="help">La ricerca usa il full-text in italiano con i sinonimi, i filtri per categoria e periodo, i suggerimenti mentre si digita e il &quot;forse cercavi&quot;.</p>
        </div>
      </div>}

      {tab === 'email' && <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">Servizio email</div>
          <p className="help">Serve per: conferma iscrizione newsletter, rassegna del mattino, recupero password, notifiche alla redazione, avvisi di salute. {env.mailEnv && 'È presente una chiave nelle variabili d\'ambiente: viene usata se qui non ne imposti una.'}</p>
          <div className="form-row"><div className="field"><label>Provider</label><select className="select" value={nl.provider} onChange={(e) => up('newsletter', { provider: e.target.value as typeof nl.provider })}><option value="none">Nessuno</option><option value="resend">Resend</option><option value="brevo">Brevo</option></select></div><div className="field"><label>Chiave API</label><input className="input" type="password" value={nl.apiKey} onChange={(e) => up('newsletter', { apiKey: e.target.value })} placeholder="re_... / xkeysib-..." /></div></div>
          <div className="form-row"><div className="field"><label>Email mittente (dominio verificato)</label><input className="input" value={nl.fromEmail} onChange={(e) => up('newsletter', { fromEmail: e.target.value })} placeholder="redazione@tuatestata.it" /></div><div className="field"><label>Nome mittente</label><input className="input" value={nl.fromName} onChange={(e) => up('newsletter', { fromName: e.target.value })} placeholder={s.siteName} /></div></div>
        </div>
        <div className="panel"><div className="panel-title">Rassegna del mattino</div>
          <Switch on={nl.digestEnabled} set={(v) => up('newsletter', { digestEnabled: v })} label="Invio automatico ogni giorno" /><br />
          <div className="field" style={{ marginTop: 10, maxWidth: 200 }}><label>Ora di invio (Italia)</label><select className="select" value={nl.digestHour} onChange={(e) => up('newsletter', { digestHour: Number(e.target.value) })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></div>
          <Switch on={nl.doubleOptIn} set={(v) => up('newsletter', { doubleOptIn: v })} label="Doppio opt-in (email di conferma all'iscrizione)" />
          <p className="help" style={{ marginTop: 10 }}>L&apos;invio automatico parte dal cron: su Vercel è configurato ogni mattina alle 5 UTC; per orari precisi al minuto collega un cron esterno a <code>/api/cron/tick?job=minute&amp;secret=CRON_SECRET</code>. {env.cronSecret ? 'CRON_SECRET è impostato.' : <b style={{ color: 'var(--red)' }}>CRON_SECRET non impostato: aggiungilo tra le variabili d&apos;ambiente.</b>}</p>
        </div>
      </div>}

      {tab === 'lettori' && <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Commenti</div>
            <Switch on={s.commentsModeration} set={(v) => setS({ ...s, commentsModeration: v })} label="Modera i commenti prima della pubblicazione" /><br />
            <Switch on={cm.commentsRequireAccount} set={(v) => up('community', { commentsRequireAccount: v })} label="Per commentare serve un account lettore" />
            <div className="form-row" style={{ marginTop: 12 }}><div className="field"><label>Parole bloccate (una per riga o separate da virgola)</label><textarea className="textarea" style={{ minHeight: 80 }} value={cm.blockedWords} onChange={(e) => up('community', { blockedWords: e.target.value })} /></div><div className="field"><label>Segnalazioni per nascondere un commento</label><input className="input" type="number" min={1} max={20} value={cm.flagsToHide} onChange={(e) => up('community', { flagsToHide: Number(e.target.value) })} /></div></div>
            <p className="help">I commenti con parole bloccate o più di due link finiscono direttamente in moderazione.</p>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Abbonamenti e paywall soft</div>
            <Switch on={pw.enabled} set={(v) => up('paywall', { enabled: v })} label="Paywall attivo" />
            <div className="form-row" style={{ marginTop: 12 }}><div className="field"><label>Articoli gratuiti al mese</label><input className="input" type="number" min={0} max={100} value={pw.freeArticles} onChange={(e) => up('paywall', { freeArticles: Number(e.target.value) })} /></div><div className="field"><label>Prezzo mensile (€)</label><input className="input" type="number" step="0.01" value={pw.monthlyPrice} onChange={(e) => up('paywall', { monthlyPrice: Number(e.target.value) })} /></div></div>
            <div className="field"><label>Stripe: chiave segreta</label><input className="input" type="password" value={pw.stripeSecretKey} onChange={(e) => up('paywall', { stripeSecretKey: e.target.value })} placeholder={env.stripeEnv ? 'presente nell\'ambiente' : 'sk_live_...'} /></div>
            <div className="form-row"><div className="field"><label>Stripe: ID prezzo (abbonamento mensile)</label><input className="input" value={pw.stripePriceId} onChange={(e) => up('paywall', { stripePriceId: e.target.value })} placeholder="price_..." /></div><div className="field"><label>Stripe: segreto webhook</label><input className="input" type="password" value={pw.stripeWebhookSecret} onChange={(e) => up('paywall', { stripeWebhookSecret: e.target.value })} placeholder="whsec_..." /></div></div>
            <p className="help">Webhook da registrare su Stripe: <code>/api/stripe/webhook</code> (eventi checkout.session.completed, customer.subscription.updated/deleted, invoice.payment_failed). Gli articoli &quot;premium&quot; sono sempre riservati agli abbonati; gli altri seguono il contatore mensile.</p>
          </div>
        </div>
      </div>}

      {tab === 'servizi' && <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Immagini</div>
            <div className="field"><label>Archiviazione</label><select className="select" value={st.provider} onChange={(e) => up('storage', { provider: e.target.value as typeof st.provider })}><option value="auto">Automatico</option><option value="supabase" disabled={!env.supabaseStorage}>Supabase Storage{!env.supabaseStorage && ' (manca SUPABASE_SERVICE_ROLE_KEY)'}</option><option value="vercel-blob" disabled={!env.blob}>Vercel Blob{!env.blob && ' (manca BLOB_READ_WRITE_TOKEN)'}</option><option value="local">Cartella locale (solo sviluppo)</option><option value="db">Database (solo prove)</option></select></div>
            <div className="form-row"><div className="field"><label>Bucket Supabase</label><input className="input" value={st.bucket} onChange={(e) => up('storage', { bucket: e.target.value })} /></div><div className="field"><label>Larghezza massima (px)</label><input className="input" type="number" min={800} max={4000} value={st.maxWidth} onChange={(e) => up('storage', { maxWidth: Number(e.target.value) })} /></div></div>
            <p className="help">Ogni upload viene ruotato, ridimensionato, convertito in WebP e salvato in tre misure (480, 960, 1600 px). Il punto focale si imposta nella Libreria media.</p>
          </div>
          <div className="panel"><div className="panel-title">Notifiche push</div>
            <Switch on={ps.enabled} set={(v) => up('push', { enabled: v })} label="Notifiche push attive (proposte ai lettori)" /><br />
            <Switch on={ps.autoBreaking} set={(v) => up('push', { autoBreaking: v })} label="Invia automaticamente le ultim'ora appena pubblicate" />
            <p className="help" style={{ marginTop: 8 }}>Le chiavi VAPID vengono generate e salvate automaticamente (o lette da VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).</p>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Statistiche</div>
            <Switch on={an.enabled} set={(v) => up('analytics', { enabled: v })} label="Statistiche integrate (senza cookie, dati aggregati)" /><br />
            <Switch on={an.vercelAnalytics} set={(v) => up('analytics', { vercelAnalytics: v })} label="Aggiungi anche Vercel Web Analytics (da attivare nel progetto Vercel)" />
          </div>
          <div className="panel"><div className="panel-title">Cache</div>
            <Switch on={ch.enabled} set={(v) => up('cache', { enabled: v })} label="Cache dei dati con invalidazione automatica al salvataggio" />
            <div className="field" style={{ marginTop: 10, maxWidth: 220 }}><label>Durata massima (secondi)</label><input className="input" type="number" min={10} max={3600} value={ch.seconds} onChange={(e) => up('cache', { seconds: Number(e.target.value) })} /></div>
            <p className="help">Le pagine restano personalizzate (tema, utente) ma le query pesanti vengono servite dalla cache e rigenerate subito quando la redazione pubblica.</p>
          </div>
        </div>
      </div>}

      {tab === 'sistema' && <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Monitoraggio e avvisi</div>
            <div className="form-row"><div className="field"><label>Email per gli avvisi</label><input className="input" value={mon.alertEmail} onChange={(e) => up('monitoring', { alertEmail: e.target.value })} placeholder="tecnico@tuatestata.it" /></div><div className="field"><label>Webhook (Slack, Discord, Teams…)</label><input className="input" value={mon.webhookUrl} onChange={(e) => up('monitoring', { webhookUrl: e.target.value })} placeholder="https://hooks.slack.com/..." /></div></div>
            <div className="field" style={{ maxWidth: 240 }}><label>Soglia database lento (ms)</label><input className="input" type="number" min={200} max={20000} value={mon.slowQueryMs} onChange={(e) => up('monitoring', { slowQueryMs: Number(e.target.value) })} /></div>
            <p className="help">Il controllo salute gira ogni giorno con il cron e a richiesta da <Link href="/admin/errori">Errori e salute</Link>. Per Sentry imposta la variabile SENTRY_DSN.</p>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Backup automatico</div>
            <Switch on={bk.enabled} set={(v) => up('backup', { enabled: v })} label="Backup giornaliero (con il cron)" />
            <div className="field" style={{ marginTop: 10, maxWidth: 220 }}><label>Backup da conservare</label><input className="input" type="number" min={1} max={60} value={bk.keep} onChange={(e) => up('backup', { keep: Number(e.target.value) })} /></div>
            <p className="help">I backup vanno nello storage immagini (bucket dedicato) oppure, se assente, nel database. Esportazione, ripristino e stato in <Link href="/admin/backup">Backup</Link>.</p>
          </div>
          <div className="panel"><div className="panel-title">Dati e demo</div><p className="help">Database Postgres (Supabase in produzione, PGlite in locale). Per ripartire da zero con i dati dimostrativi usa la pagina Backup → ripristino, oppure reinstalla cancellando la chiave <code>installed</code>.</p></div>
        </div>
      </div>}
    </>
  );
}
