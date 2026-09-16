'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveSettingsAction } from '@/lib/actions';
import { Category, DEFAULT_ADS, DEFAULT_AI, DEFAULT_ANALYTICS, DEFAULT_AUTH, DEFAULT_BACKUP, DEFAULT_CACHE, DEFAULT_COMMUNITY, DEFAULT_LISTINGS, DEFAULT_MONITORING, DEFAULT_NEWSLETTER, DEFAULT_PAYWALL, DEFAULT_PUSH, DEFAULT_SEARCH, DEFAULT_SOCIAL, DEFAULT_STORAGE, DEFAULT_UPDATES, SiteSettings, SocialNetwork } from '@/lib/models';
import { ThemePicker } from './theme-picker';
import { ThemeCssEditor } from './theme-css-editor';
import { DEFAULT_SEO_SETTINGS } from '@/lib/seo-engine';
import { toast } from '@/components/ui/toaster';

type Tab = 'generale' | 'tema' | 'seo' | 'email' | 'lettori' | 'social' | 'monetizzazione' | 'ai' | 'servizi' | 'sistema';
const TABS: { id: Tab; label: string }[] = [{ id: 'generale', label: 'Generale' }, { id: 'tema', label: 'Tema' }, { id: 'seo', label: 'SEO' }, { id: 'email', label: 'Newsletter ed email' }, { id: 'lettori', label: 'Lettori e accesso' }, { id: 'social', label: 'Social' }, { id: 'monetizzazione', label: 'Pubblicità, abbonamenti, annunci' }, { id: 'ai', label: 'Assistente AI' }, { id: 'servizi', label: 'Immagini, notifiche, statistiche' }, { id: 'sistema', label: 'Sistema' }];

export function SettingsForm({ initial, categories, env }: { initial: SiteSettings; categories: Category[]; env: { mailEnv: boolean; blob: boolean; supabaseStorage: boolean; cronSecret: boolean; stripeEnv: boolean } }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('generale');
  const [s, setS] = useState<SiteSettings>({
    ...initial, seo: { ...DEFAULT_SEO_SETTINGS, ...(initial.seo ?? {}) }, newsletter: { ...DEFAULT_NEWSLETTER, ...(initial.newsletter ?? {}) }, storage: { ...DEFAULT_STORAGE, ...(initial.storage ?? {}) }, paywall: { ...DEFAULT_PAYWALL, ...(initial.paywall ?? {}) },
    community: { ...DEFAULT_COMMUNITY, ...(initial.community ?? {}) }, monitoring: { ...DEFAULT_MONITORING, ...(initial.monitoring ?? {}) }, analytics: { ...DEFAULT_ANALYTICS, ...(initial.analytics ?? {}) }, push: { ...DEFAULT_PUSH, ...(initial.push ?? {}) }, cache: { ...DEFAULT_CACHE, ...(initial.cache ?? {}) }, search: { ...DEFAULT_SEARCH, ...(initial.search ?? {}) }, backup: { ...DEFAULT_BACKUP, ...(initial.backup ?? {}) },
    social: { ...DEFAULT_SOCIAL, ...(initial.social ?? {}) }, auth: { ...DEFAULT_AUTH, ...(initial.auth ?? {}) }, ads: { ...DEFAULT_ADS, ...(initial.ads ?? {}) }, listings: { ...DEFAULT_LISTINGS, ...(initial.listings ?? {}) }, ai: { ...DEFAULT_AI, ...(initial.ai ?? {}) }, updates: { ...DEFAULT_UPDATES, ...(initial.updates ?? {}) },
  });
  const seo = s.seo!; const nl = s.newsletter!; const st = s.storage!; const pw = s.paywall!; const cm = s.community!; const mon = s.monitoring!; const an = s.analytics!; const ps = s.push!; const ch = s.cache!; const se = s.search!; const bk = s.backup!; const so = s.social!; const au = s.auth!; const ad = s.ads!; const li = s.listings!; const ai = s.ai!; const upd = s.updates!;
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

      {tab === 'tema' && <div className="panel"><div className="panel-title">Tema del sito</div><p className="help" style={{ marginBottom: 14 }}>Il motore è lo stesso: cambiano colori, font, testata, layout della home e stile delle card. Per siti gemelli con dominio proprio usa le <Link href="/admin/edizioni">Edizioni</Link>.</p><ThemePicker value={s.theme} onChange={(theme) => setS({ ...s, theme })} /><ThemeCssEditor initialCss={s.theme?.customCss ?? ''} versions={(s.themeVersions ?? []).map((v) => ({ id: v.id, at: v.at, label: v.label }))} /></div>}

      {tab === 'seo' && <div className="admin-grid-2"><div className="panel"><div className="panel-title">Search Console, lingue e distribuzione</div>
            <div className="field"><label>Proprietà Search Console (es. https://www.miosito.it/ oppure sc-domain:miosito.it)</label><input className="input" value={s.seo?.gscSiteUrl ?? ''} onChange={(e) => up('seo', { gscSiteUrl: e.target.value })} /></div>
            <div className="field"><label>Account di servizio Google (JSON) con accesso in lettura alla proprietà</label><textarea className="textarea" style={{ minHeight: 70, fontFamily: 'monospace', fontSize: 11 }} value={s.seo?.gscServiceAccount ?? ''} onChange={(e) => up('seo', { gscServiceAccount: e.target.value })} placeholder='{"type":"service_account","client_email":"…","private_key":"…"}' /></div>
            <div className="field"><label>Lingue aggiuntive per le traduzioni (codici separati da virgola)</label><input className="input" value={s.seo?.languages ?? ''} onChange={(e) => up('seo', { languages: e.target.value })} placeholder="en, fr, de" /></div>
            <p className="help">Feed pronti: <code>/feed/google-news.xml</code> (Publisher Center), <code>/feed/flipboard.xml</code>, <code>/feed/apple-news.xml</code>, <code>/feed/podcast.xml</code>. Web Stories: <code>/storie</code>. Versione leggera: <code>/lite/categoria/articolo</code>.</p>
          </div>
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

      {tab === 'lettori' && <div className="admin-grid-2"><div className="panel"><div className="panel-title">Muro di registrazione</div><div className="field"><label>Chiedi la registrazione gratuita dopo N articoli al mese (0 = mai; agisce prima del paywall)</label><input className="input" type="number" min={0} value={s.community?.registrationWallAfter ?? 0} onChange={(e) => up('community', { registrationWallAfter: Number(e.target.value) })} /></div><p className="help">Chi non è registrato vede un invito a creare l&apos;account (email o social) per continuare a leggere: aumenta iscritti e newsletter senza chiedere soldi.</p></div>
        <div>
          <div className="panel"><div className="panel-title">Commenti</div>
            <Switch on={s.commentsModeration} set={(v) => setS({ ...s, commentsModeration: v })} label="Modera i commenti prima della pubblicazione" /><br />
            <Switch on={cm.commentsRequireAccount} set={(v) => up('community', { commentsRequireAccount: v })} label="Per commentare serve un account lettore" />
            <div className="form-row" style={{ marginTop: 12 }}><div className="field"><label>Parole bloccate (una per riga o separate da virgola)</label><textarea className="textarea" style={{ minHeight: 80 }} value={cm.blockedWords} onChange={(e) => up('community', { blockedWords: e.target.value })} /></div><div className="field"><label>Segnalazioni per nascondere un commento</label><input className="input" type="number" min={1} max={20} value={cm.flagsToHide} onChange={(e) => up('community', { flagsToHide: Number(e.target.value) })} /></div></div>
            <p className="help">I commenti con parole bloccate o più di due link finiscono direttamente in moderazione.</p>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Accesso dei lettori</div>
            <Switch on={au.magicLink} set={(v) => up('auth', { magicLink: v })} label="Accesso con link via email (magic link, senza password)" />
            <div className="form-row" style={{ marginTop: 12 }}><div className="field"><label>Google: Client ID</label><input className="input" value={au.googleClientId} onChange={(e) => up('auth', { googleClientId: e.target.value })} placeholder="xxxx.apps.googleusercontent.com" /></div><div className="field"><label>Google: Client secret</label><input className="input" type="password" value={au.googleClientSecret} onChange={(e) => up('auth', { googleClientSecret: e.target.value })} /></div></div>
            <div className="form-row"><div className="field"><label>Facebook: App ID</label><input className="input" value={au.facebookAppId} onChange={(e) => up('auth', { facebookAppId: e.target.value })} /></div><div className="field"><label>Facebook: App secret</label><input className="input" type="password" value={au.facebookAppSecret} onChange={(e) => up('auth', { facebookAppSecret: e.target.value })} /></div></div>
            <p className="help">URL di callback da autorizzare: <code>/api/auth/google/callback</code> e <code>/api/auth/facebook/callback</code> sul dominio del sito. Login con Apple: richiede un account sviluppatore Apple, in arrivo.</p>
          </div>
        </div>
      </div>}

      {tab === 'social' && <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Pubblicazione automatica</div>
            <p className="help">Alla pubblicazione di un articolo il testo viene generato dal modello qui sotto (o dal campo «Testo per i social» dell'articolo) e inviato alle reti scelte. Coda, storico e condivisione manuale in <Link href="/admin/social">Social</Link>.</p>
            <div className="chips" style={{ margin: '10px 0' }}>{(['facebook', 'telegram', 'x', 'webhook'] as SocialNetwork[]).map((n) => { const on = so.autoNetworks.includes(n); return <button key={n} type="button" className="chip" style={on ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => up('social', { autoNetworks: on ? so.autoNetworks.filter((x) => x !== n) : [...so.autoNetworks, n] })}>{n === 'x' ? 'X' : n === 'webhook' ? 'Webhook' : n[0].toUpperCase() + n.slice(1)}</button>; })}</div>
            <div className="field"><label>Modello del testo (segnaposto: {'{kicker} {title} {excerpt} {url} {hashtags}'})</label><textarea className="textarea" style={{ minHeight: 70 }} value={so.template} onChange={(e) => up('social', { template: e.target.value })} /></div>
            <Switch on={so.hashtagsFromTags} set={(v) => up('social', { hashtagsFromTags: v })} label="Aggiungi hashtag dai tag dell'articolo" />
          </div>
          <div className="panel"><div className="panel-title">Facebook (pagina)</div>
            <div className="form-row"><div className="field"><label>ID pagina</label><input className="input" value={so.facebookPageId} onChange={(e) => up('social', { facebookPageId: e.target.value })} /></div><div className="field"><label>Token di accesso della pagina (lunga durata)</label><input className="input" type="password" value={so.facebookToken} onChange={(e) => up('social', { facebookToken: e.target.value })} /></div></div>
            <p className="help">Da Meta for Developers: app con permesso pages_manage_posts, poi «Page Access Token» della pagina.</p>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Telegram (canale)</div>
            <div className="form-row"><div className="field"><label>Token del bot</label><input className="input" type="password" value={so.telegramBotToken} onChange={(e) => up('social', { telegramBotToken: e.target.value })} placeholder="123456:ABC…" /></div><div className="field"><label>Chat/canale (es. @tuatestata o -100…)</label><input className="input" value={so.telegramChatId} onChange={(e) => up('social', { telegramChatId: e.target.value })} /></div></div>
            <p className="help">Crea il bot con @BotFather e aggiungilo come amministratore del canale.</p>
          </div>
          <div className="panel"><div className="panel-title">X (Twitter)</div>
            <div className="form-row"><div className="field"><label>API key</label><input className="input" value={so.xApiKey} onChange={(e) => up('social', { xApiKey: e.target.value })} /></div><div className="field"><label>API secret</label><input className="input" type="password" value={so.xApiSecret} onChange={(e) => up('social', { xApiSecret: e.target.value })} /></div></div>
            <div className="form-row"><div className="field"><label>Access token</label><input className="input" value={so.xAccessToken} onChange={(e) => up('social', { xAccessToken: e.target.value })} /></div><div className="field"><label>Access token secret</label><input className="input" type="password" value={so.xAccessSecret} onChange={(e) => up('social', { xAccessSecret: e.target.value })} /></div></div>
            <p className="help">App su developer.x.com con permessi Read and Write (OAuth 1.0a).</p>
          </div>
          <div className="panel"><div className="panel-title">Webhook (Buffer, Zapier, Make, WhatsApp Channel)</div>
            <div className="field"><label>URL</label><input className="input" value={so.webhookUrl} onChange={(e) => up('social', { webhookUrl: e.target.value })} placeholder="https://hooks.zapier.com/…" /></div>
            <p className="help">Riceve un JSON con testo, URL, immagine, titolo ed estratto: da lì puoi pubblicare ovunque, compresi canali WhatsApp e Instagram tramite Buffer/Zapier.</p>
          </div>
        </div>
      </div>}

      {tab === 'monetizzazione' && <div className="admin-grid-2"><div className="panel"><div className="panel-title">Piani di abbonamento e metodi di pagamento</div>
            <div className="field"><label>Piani (uno per riga: id | nome | prezzo | month/year/once | price_id Stripe | descrizione | evidenzia)</label><textarea className="textarea" style={{ minHeight: 80, fontFamily: 'monospace', fontSize: 12 }} value={(s.paywall?.plans ?? []).map((p) => `${p.id} | ${p.name} | ${p.price} | ${p.interval} | ${p.stripePriceId} | ${p.description}${p.highlight ? ' | *' : ''}`).join('\n')} onChange={(e) => up('paywall', { plans: e.target.value.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p[0] && p[1]).map((p) => ({ id: p[0], name: p[1], price: Number(String(p[2]).replace(',', '.')) || 0, interval: (['month', 'year', 'once'].includes(p[3]) ? p[3] : 'month') as 'month' | 'year' | 'once', stripePriceId: p[4] ?? '', description: p[5] ?? '', highlight: p[6] === '*' })) })} placeholder={'base | Base | 4.99 | month | price_xxx | Tutti gli articoli\nannuale | Annuale | 49 | year | price_yyy | Due mesi gratis | *\nsostenitore | Sostenitore | 9.99 | month | price_zzz | Tutto più la newsletter riservata'} /></div>
            <div className="field"><label>Metodi di pagamento Stripe (attivali anche nella dashboard Stripe)</label><div className="chips">{['card', 'paypal', 'sepa_debit', 'link', 'klarna', 'satispay'].map((m) => <label key={m} className="chip"><input type="checkbox" checked={(s.paywall?.paymentMethods ?? ['card']).includes(m)} onChange={(e) => { const cur = s.paywall?.paymentMethods ?? ['card']; up('paywall', { paymentMethods: e.target.checked ? [...new Set([...cur, m])] : cur.filter((x) => x !== m) }); }} /> {m === 'card' ? 'Carta (+ Apple/Google Pay)' : m === 'sepa_debit' ? 'SEPA' : m}</label>)}</div></div>
          </div>
        <div>
          <div className="panel"><div className="panel-title">Pubblicità</div>
            <Switch on={ad.enabled} set={(v) => up('ads', { enabled: v })} label="Spazi pubblicitari attivi sul sito" />
            <div className="form-row" style={{ marginTop: 12 }}><div className="field"><label>Google AdSense: ID cliente</label><input className="input" value={ad.adsenseClient} onChange={(e) => up('ads', { adsenseClient: e.target.value })} placeholder="ca-pub-XXXXXXXXXXXX" /></div><div className="field"><label>Etichetta sugli annunci</label><input className="input" value={ad.label} onChange={(e) => up('ads', { label: e.target.value })} /></div></div>
            <Switch on={ad.houseAdsOnly} set={(v) => up('ads', { houseAdsOnly: v })} label="Solo annunci propri (niente AdSense negli spazi vuoti)" />
            <p className="help" style={{ marginTop: 8 }}>Gli annunci propri si gestiscono in <Link href="/admin/pubblicita">Pubblicità</Link>: posizione, periodo, peso, impressioni e clic. Con AdSense gli spazi senza annuncio proprio mostrano gli annunci Google.</p>
          </div>
          <div className="panel"><div className="panel-title">Abbonamenti e paywall soft</div>
            <Switch on={pw.enabled} set={(v) => up('paywall', { enabled: v })} label="Paywall attivo" />
            <div className="form-row" style={{ marginTop: 12 }}><div className="field"><label>Articoli gratuiti al mese</label><input className="input" type="number" min={0} max={100} value={pw.freeArticles} onChange={(e) => up('paywall', { freeArticles: Number(e.target.value) })} /></div><div className="field"><label>Prezzo mensile (€)</label><input className="input" type="number" step="0.01" value={pw.monthlyPrice} onChange={(e) => up('paywall', { monthlyPrice: Number(e.target.value) })} /></div></div>
            <div className="field"><label>Stripe: chiave segreta</label><input className="input" type="password" value={pw.stripeSecretKey} onChange={(e) => up('paywall', { stripeSecretKey: e.target.value })} placeholder={env.stripeEnv ? 'presente nell\'ambiente' : 'sk_live_...'} /></div>
            <div className="form-row"><div className="field"><label>Stripe: ID prezzo (abbonamento mensile)</label><input className="input" value={pw.stripePriceId} onChange={(e) => up('paywall', { stripePriceId: e.target.value })} placeholder="price_..." /></div><div className="field"><label>Stripe: segreto webhook</label><input className="input" type="password" value={pw.stripeWebhookSecret} onChange={(e) => up('paywall', { stripeWebhookSecret: e.target.value })} placeholder="whsec_..." /></div></div>
            <p className="help">Webhook da registrare su Stripe: <code>/api/stripe/webhook</code> (eventi checkout.session.completed, customer.subscription.updated/deleted, invoice.payment_failed). Gli articoli &quot;premium&quot; sono sempre riservati agli abbonati; gli altri seguono il contatore mensile.</p>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Annunci e necrologi dei lettori</div>
            <Switch on={li.enabled} set={(v) => up('listings', { enabled: v })} label="Servizio attivo (pagine /annunci e /necrologi)" />
            <div className="form-row" style={{ marginTop: 12 }}><div className="field"><label>Prezzo annuncio (€, 0 = gratis)</label><input className="input" type="number" step="0.1" value={li.priceAnnuncio} onChange={(e) => up('listings', { priceAnnuncio: Number(e.target.value) })} /></div><div className="field"><label>Prezzo necrologio (€)</label><input className="input" type="number" step="0.1" value={li.priceNecrologio} onChange={(e) => up('listings', { priceNecrologio: Number(e.target.value) })} /></div><div className="field"><label>Durata (giorni)</label><input className="input" type="number" min={1} max={365} value={li.days} onChange={(e) => up('listings', { days: Number(e.target.value) })} /></div></div>
            <Switch on={li.moderation} set={(v) => up('listings', { moderation: v })} label="Approvazione della redazione prima della pubblicazione" /><br />
            <Switch on={li.freeForReaders} set={(v) => up('listings', { freeForReaders: v })} label="Gratis per i lettori registrati" />
            <p className="help" style={{ marginTop: 8 }}>I pagamenti usano la chiave Stripe qui sotto (pagamento singolo). Moderazione e inserimento manuale in <Link href="/admin/annunci">Annunci e necrologi</Link>.</p>
          </div>
        </div>
      </div>}

      {tab === 'ai' && <div className="admin-grid-2"><div className="panel"><div className="panel-title">Trascrizione, voce e ricerca semantica</div>
            <div className="form-row"><div className="field"><label>Trascrizione audio/video</label><select className="select" value={s.ai?.transcribeProvider ?? 'none'} onChange={(e) => up('ai', { transcribeProvider: e.target.value as 'none' | 'openai' | 'deepgram' })}><option value="none">Non attiva</option><option value="openai">OpenAI Whisper</option><option value="deepgram">Deepgram</option></select></div><div className="field"><label>Chiave API trascrizione</label><input className="input" type="password" value={s.ai?.transcribeKey ?? ''} onChange={(e) => up('ai', { transcribeKey: e.target.value })} /></div></div>
            <div className="form-row"><div className="field"><label>Audio-articolo (voce sintetica)</label><select className="select" value={s.ai?.ttsProvider ?? 'none'} onChange={(e) => up('ai', { ttsProvider: e.target.value as 'none' | 'openai' | 'elevenlabs' })}><option value="none">Non attivo</option><option value="openai">OpenAI TTS</option><option value="elevenlabs">ElevenLabs</option></select></div><div className="field"><label>Chiave API voce</label><input className="input" type="password" value={s.ai?.ttsKey ?? ''} onChange={(e) => up('ai', { ttsKey: e.target.value })} /></div><div className="field"><label>Voce</label><input className="input" value={s.ai?.ttsVoice ?? ''} onChange={(e) => up('ai', { ttsVoice: e.target.value })} placeholder="alloy / id voce ElevenLabs" /></div></div>
            <div className="form-row"><div className="field"><label>Ricerca semantica (embedding)</label><select className="select" value={s.ai?.embeddingsProvider ?? 'none'} onChange={(e) => up('ai', { embeddingsProvider: e.target.value as 'none' | 'openai' | 'voyage' })}><option value="none">Non attiva</option><option value="openai">OpenAI text-embedding-3-small</option><option value="voyage">Voyage AI</option></select></div><div className="field"><label>Chiave API embedding</label><input className="input" type="password" value={s.ai?.embeddingsKey ?? ''} onChange={(e) => up('ai', { embeddingsKey: e.target.value })} /></div></div>
            <label className="switch" style={{ marginRight: 14 }}><input type="checkbox" checked={!!s.ai?.ttsAuto} onChange={(e) => up('ai', { ttsAuto: e.target.checked })} /> Genera l&apos;audio-articolo a ogni pubblicazione</label><label className="switch"><input type="checkbox" checked={!!s.ai?.moderation} onChange={(e) => up('ai', { moderation: e.target.checked })} /> Moderazione assistita dei commenti (tossicità e spam valutati da Claude)</label>
          </div>
        <div className="panel"><div className="panel-title">Assistente AI (Claude)</div>
          <Switch on={ai.enabled} set={(v) => up('ai', { enabled: v })} label="Assistente attivo nell'editor" />
          <div className="form-row" style={{ marginTop: 12 }}><div className="field"><label>Chiave API Anthropic</label><input className="input" type="password" value={ai.apiKey} onChange={(e) => up('ai', { apiKey: e.target.value })} placeholder="sk-ant-… (oppure variabile ANTHROPIC_API_KEY)" /></div><div className="field"><label>Modello</label><select className="select" value={ai.model} onChange={(e) => up('ai', { model: e.target.value })}><option value="claude-opus-5">Claude Opus 5 (consigliato)</option><option value="claude-sonnet-5">Claude Sonnet 5 (più economico)</option><option value="claude-haiku-4-5">Claude Haiku 4.5 (veloce)</option></select></div></div>
          <div className="field"><label>Stile della testata (istruzioni per titoli e riscritture)</label><textarea className="textarea" style={{ minHeight: 80 }} value={ai.style} onChange={(e) => up('ai', { style: e.target.value })} /></div>
          <p className="help">Cosa fa: titoli alternativi, sommario ed estratto, meta description, tag e occhiello, alt text delle foto, riscrittura di comunicati nello stile della testata, traduzione, elenco dei punti da verificare, testi per i social. Propone soltanto: nulla viene pubblicato senza un clic del redattore. Le richieste vanno direttamente ad Anthropic con la tua chiave; i testi non vengono usati per addestrare modelli.</p>
        </div>
        <div className="panel"><div className="panel-title">Costi indicativi</div><p className="help">Un articolo medio (600 parole) costa circa 0,5-2 centesimi per funzione con Sonnet 5 e 2-5 centesimi con Opus 5. Le chiamate usano ragionamento adattivo a sforzo basso per contenere i costi; il fallback di sicurezza lato server è attivo.</p></div>
      </div>}

      {tab === 'servizi' && <div className="admin-grid-2"><div className="panel"><div className="panel-title">Banca immagini e video hosting</div>
            <div className="form-row"><div className="field"><label>Unsplash Access Key</label><input className="input" type="password" value={s.storage?.unsplashKey ?? ''} onChange={(e) => up('storage', { unsplashKey: e.target.value })} /></div><div className="field"><label>Pexels API Key</label><input className="input" type="password" value={s.storage?.pexelsKey ?? ''} onChange={(e) => up('storage', { pexelsKey: e.target.value })} /></div></div>
            <div className="field"><label>Video hosting</label><select className="select" value={s.video?.provider ?? 'none'} onChange={(e) => up('video', { provider: e.target.value as 'none' | 'cloudflare' | 'mux' })}><option value="none">Nessuno (solo YouTube/embed)</option><option value="cloudflare">Cloudflare Stream</option><option value="mux">Mux</option></select></div>
            {s.video?.provider === 'cloudflare' && <div className="form-row"><div className="field"><label>Account ID</label><input className="input" value={s.video?.cfAccountId ?? ''} onChange={(e) => up('video', { cfAccountId: e.target.value })} /></div><div className="field"><label>API Token (Stream)</label><input className="input" type="password" value={s.video?.cfApiToken ?? ''} onChange={(e) => up('video', { cfApiToken: e.target.value })} /></div><div className="field"><label>Customer code (customer-xxxx)</label><input className="input" value={s.video?.cfCustomerCode ?? ''} onChange={(e) => up('video', { cfCustomerCode: e.target.value })} /></div></div>}
            {s.video?.provider === 'mux' && <div className="form-row"><div className="field"><label>Mux Token ID</label><input className="input" value={s.video?.muxTokenId ?? ''} onChange={(e) => up('video', { muxTokenId: e.target.value })} /></div><div className="field"><label>Mux Token Secret</label><input className="input" type="password" value={s.video?.muxTokenSecret ?? ''} onChange={(e) => up('video', { muxTokenSecret: e.target.value })} /></div></div>}
          </div>
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
          <div className="panel"><div className="panel-title">Aggiornamenti</div>
            <div className="form-row"><div className="field"><label>Repository GitHub (utente/repo)</label><input className="input" value={upd.repo} onChange={(e) => up('updates', { repo: e.target.value })} /></div><div className="field"><label>Canale</label><select className="select" value={upd.channel} onChange={(e) => up('updates', { channel: e.target.value as 'stable' | 'beta' })}><option value="stable">Stabile (main)</option><option value="beta">Beta</option></select></div></div>
            <div className="field"><label>Deploy Hook Vercel (aggiornamento con un clic)</label><input className="input" type="password" value={upd.deployHookUrl} onChange={(e) => up('updates', { deployHookUrl: e.target.value })} placeholder="https://api.vercel.com/v1/integrations/deploy/…" /></div>
            <p className="help">Controllo e pulsante in <Link href="/admin/aggiornamenti">Aggiornamenti</Link>.</p>
          </div>
          <div className="panel"><div className="panel-title">Dati e demo</div><p className="help">Database Postgres (Supabase in produzione, PGlite in locale). Per ripartire da zero con i dati dimostrativi usa la pagina Backup → ripristino, oppure reinstalla cancellando la chiave <code>installed</code>.</p></div>
        </div>
      </div>}
    </>
  );
}
