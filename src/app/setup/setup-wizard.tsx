'use client';

import { useState, useTransition } from 'react';
import { installAction, testMailAction, type SetupInfo, type SetupPayload } from '@/lib/actions-setup';

const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: 'Roma', lat: 41.9028, lon: 12.4964 }, { name: 'Milano', lat: 45.4642, lon: 9.19 }, { name: 'Napoli', lat: 40.8518, lon: 14.2681 }, { name: 'Torino', lat: 45.0703, lon: 7.6869 },
  { name: 'Palermo', lat: 38.1157, lon: 13.3615 }, { name: 'Genova', lat: 44.4056, lon: 8.9463 }, { name: 'Bologna', lat: 44.4949, lon: 11.3426 }, { name: 'Firenze', lat: 43.7696, lon: 11.2558 },
  { name: 'Bari', lat: 41.1171, lon: 16.8719 }, { name: 'Catania', lat: 37.5079, lon: 15.083 }, { name: 'Venezia', lat: 45.4408, lon: 12.3155 }, { name: 'Verona', lat: 45.4384, lon: 10.9916 },
  { name: 'Messina', lat: 38.1938, lon: 15.5542 }, { name: 'Padova', lat: 45.4064, lon: 11.8768 }, { name: 'Trieste', lat: 45.6495, lon: 13.7768 }, { name: 'Brescia', lat: 45.5416, lon: 10.2118 },
  { name: 'Parma', lat: 44.8015, lon: 10.3279 }, { name: 'Perugia', lat: 43.1107, lon: 12.3908 }, { name: 'Cagliari', lat: 39.2238, lon: 9.1217 }, { name: 'Reggio Calabria', lat: 38.1105, lon: 15.6613 },
];
const STEPS = ['Benvenuto', 'Testata', 'Amministratore', 'Tema', 'Contenuti', 'Servizi', 'Riepilogo'];

export function SetupWizard({ info, themes }: { info: SetupInfo; themes: { id: string; name: string; description: string; swatch: string[] }[] }) {
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [mailTest, setMailTest] = useState('');
  const [p, setP] = useState<SetupPayload>({
    site: { siteName: 'ASTER News', tagline: 'Le notizie della tua città', description: '', siteUrl: info.envSiteUrl || (typeof window !== 'undefined' ? window.location.origin : ''), city: 'Roma', lat: 41.9028, lon: 12.4964, language: 'it' },
    admin: { name: '', email: '', password: '' },
    theme: 'today',
    content: info.existing.articles > 0 ? 'keep' : 'demo',
    services: { mailProvider: 'none', mailApiKey: '', mailFrom: '', mailFromName: '', analytics: true, push: true, storage: 'auto' },
  });
  const [confirm, setConfirm] = useState('');
  const site = (k: keyof SetupPayload['site'], v: string | number) => setP({ ...p, site: { ...p.site, [k]: v } });
  const admin = (k: keyof SetupPayload['admin'], v: string) => setP({ ...p, admin: { ...p.admin, [k]: v } });
  const svc = <K extends keyof SetupPayload['services']>(k: K, v: SetupPayload['services'][K]) => setP({ ...p, services: { ...p.services, [k]: v } });
  const valid = (): string => {
    if (step === 1 && !p.site.siteName.trim()) return 'Inserisci il nome della testata.';
    if (step === 2) {
      if (!p.admin.name.trim()) return 'Inserisci il tuo nome.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.admin.email)) return 'Inserisci un indirizzo email valido.';
      if (p.admin.password.length < 10) return 'La password deve avere almeno 10 caratteri.';
      if (p.admin.password !== confirm) return 'Le due password non coincidono.';
    }
    return '';
  };
  const next = () => { const e = valid(); if (e) { setError(e); return; } setError(''); setStep(step + 1); };
  const install = () => start(async () => { setError(''); const r = await installAction(p); if (r && !r.ok) setError(r.message ?? 'Errore'); });
  const dbOk = !info.dbError && info.latencyMs >= 0;

  return (
    <div className="setup">
      <aside className="setup-side">
        <div className="logo">Aster<span>news</span></div>
        <p className="setup-lead">Installazione guidata</p>
        <ol className="setup-steps">{STEPS.map((s, i) => <li key={s} className={i === step ? 'current' : i < step ? 'done' : ''}><span>{i < step ? '✓' : i + 1}</span>{s}</li>)}</ol>
        <p className="setup-foot">Come in WordPress: pochi passi e la redazione è pronta. Potrai cambiare tutto dalle Impostazioni.</p>
      </aside>
      <main className="setup-main">
        {step === 0 && (
          <section>
            <h1>Benvenuto in ASTER News</h1>
            <p className="lead">Un CMS editoriale con SEO automatica, importazione da WordPress, eventi, zone, newsletter e notifiche. Prima di iniziare controlliamo il database.</p>
            <div className={`setup-check ${dbOk ? 'ok' : 'ko'}`}>
              <b>{dbOk ? '✓ Database collegato' : '✕ Database non raggiungibile'}</b>
              <div className="help">{info.dbError ? info.dbError : info.remote ? `Postgres remoto (Supabase o altro) · latenza ${info.latencyMs} ms` : `Postgres integrato (PGlite) nella cartella data/pg · latenza ${info.latencyMs} ms`}{info.serverless && !info.remote && <> · <b style={{ color: 'var(--red)' }}>attenzione:</b> in ambiente serverless senza POSTGRES_URL i dati non sono persistenti</>}</div>
            </div>
            {info.existing.articles > 0 && <div className="setup-check ok"><b>Trovati dati esistenti</b><div className="help">{info.existing.articles} articoli e {info.existing.users} utenti: verranno conservati. Nel passo Amministratore potrai scegliere un account esistente.</div></div>}
            <div className="setup-check ok"><b>Servizi rilevati</b><div className="help">Email: {info.hasMailEnv ? 'chiave trovata nell\'ambiente' : 'da configurare (opzionale)'} · Immagini: {info.hasSupabaseStorage ? 'Supabase Storage' : info.hasBlob ? 'Vercel Blob' : 'nel database (consigliato attivare uno storage)'}</div></div>
          </section>
        )}
        {step === 1 && (
          <section>
            <h1>La tua testata</h1>
            <div className="form-row"><div className="field"><label>Nome della testata *</label><input className="input" value={p.site.siteName} onChange={(e) => site('siteName', e.target.value)} /></div><div className="field"><label>Payoff</label><input className="input" value={p.site.tagline} onChange={(e) => site('tagline', e.target.value)} /></div></div>
            <div className="field"><label>Descrizione (per Google e social)</label><textarea className="textarea" value={p.site.description} onChange={(e) => site('description', e.target.value)} placeholder="Notizie, cronaca, eventi e approfondimenti da..." /></div>
            <div className="field"><label>Indirizzo pubblico del sito</label><input className="input" value={p.site.siteUrl} onChange={(e) => site('siteUrl', e.target.value)} placeholder="https://www.tuatestata.it" /><div className="help">Usato per sitemap, canonical, email e notifiche. Puoi cambiarlo in seguito.</div></div>
            <div className="form-row">
              <div className="field"><label>Città di riferimento (meteo, eventi)</label><select className="select" value={p.site.city} onChange={(e) => { const c = CITIES.find((x) => x.name === e.target.value); if (c) setP({ ...p, site: { ...p.site, city: c.name, lat: c.lat, lon: c.lon } }); }}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
              <div className="field"><label>Lingua</label><select className="select" value={p.site.language} onChange={(e) => site('language', e.target.value)}><option value="it">Italiano</option></select></div>
            </div>
          </section>
        )}
        {step === 2 && (
          <section>
            <h1>Account amministratore</h1>
            <p className="lead">Con questo account accederai alla redazione. La password è personale: niente più password condivise.</p>
            <div className="form-row"><div className="field"><label>Nome e cognome *</label><input className="input" value={p.admin.name} onChange={(e) => admin('name', e.target.value)} /></div><div className="field"><label>Email *</label><input className="input" type="email" value={p.admin.email} onChange={(e) => admin('email', e.target.value)} /></div></div>
            <div className="form-row"><div className="field"><label>Password * (almeno 10 caratteri)</label><input className="input" type="password" value={p.admin.password} onChange={(e) => admin('password', e.target.value)} autoComplete="new-password" /></div><div className="field"><label>Ripeti password *</label><input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div></div>
            <div className="help">Dopo l&apos;accesso potrai attivare la verifica in due passaggi (app di autenticazione) dal tuo profilo.</div>
          </section>
        )}
        {step === 3 && (
          <section>
            <h1>Scegli il tema</h1>
            <p className="lead">Stesso motore, aspetto diverso. Ogni tema è personalizzabile in colori, font e layout.</p>
            <div className="theme-grid">
              {themes.map((t) => (
                <button type="button" key={t.id} className={`theme-card ${p.theme === t.id ? 'selected' : ''}`} onClick={() => setP({ ...p, theme: t.id })}>
                  <div className="swatches">{t.swatch.map((c, i) => <span key={i} style={{ background: c }} />)}</div>
                  <b>{t.name}</b><small>{t.description}</small>
                </button>
              ))}
            </div>
          </section>
        )}
        {step === 4 && (
          <section>
            <h1>Contenuti iniziali</h1>
            {info.existing.articles > 0 ? (
              <label className="setup-option selected"><input type="radio" checked readOnly /> <div><b>Conserva i dati esistenti</b><div className="help">{info.existing.articles} articoli già presenti nel database (per esempio da un&apos;importazione WordPress).</div></div></label>
            ) : (
              <>
                <label className={`setup-option ${p.content === 'demo' ? 'selected' : ''}`}><input type="radio" checked={p.content === 'demo'} onChange={() => setP({ ...p, content: 'demo' })} /> <div><b>Con contenuti dimostrativi</b><div className="help">40 articoli, categorie, zone, eventi, segnalazioni e redattori di esempio: ideale per provare tutte le funzioni. Si possono eliminare in blocco in seguito.</div></div></label>
                <label className={`setup-option ${p.content === 'empty' ? 'selected' : ''}`}><input type="radio" checked={p.content === 'empty'} onChange={() => setP({ ...p, content: 'empty' })} /> <div><b>Sito vuoto</b><div className="help">Solo le categorie e le zone di base, nessun articolo: pronto per importare da WordPress o iniziare da zero.</div></div></label>
              </>
            )}
          </section>
        )}
        {step === 5 && (
          <section>
            <h1>Servizi (opzionali)</h1>
            <p className="lead">Tutto si può configurare più tardi dalle Impostazioni.</p>
            <div className="panel"><div className="panel-title">Email (newsletter, recupero password, notifiche)</div>
              <div className="form-row">
                <div className="field"><label>Provider</label><select className="select" value={p.services.mailProvider} onChange={(e) => svc('mailProvider', e.target.value as SetupPayload['services']['mailProvider'])}><option value="none">Nessuno per ora</option><option value="resend">Resend</option><option value="brevo">Brevo</option></select></div>
                <div className="field"><label>Mittente</label><input className="input" placeholder="redazione@tuatestata.it" value={p.services.mailFrom} onChange={(e) => svc('mailFrom', e.target.value)} disabled={p.services.mailProvider === 'none'} /></div>
              </div>
              {p.services.mailProvider !== 'none' && <>
                <div className="form-row"><div className="field"><label>Chiave API</label><input className="input" type="password" value={p.services.mailApiKey} onChange={(e) => svc('mailApiKey', e.target.value)} /></div><div className="field"><label>Nome mittente</label><input className="input" value={p.services.mailFromName} onChange={(e) => svc('mailFromName', e.target.value)} placeholder={p.site.siteName} /></div></div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button type="button" className="btn btn-outline btn-sm" disabled={!p.services.mailApiKey || !p.services.mailFrom || !p.admin.email} onClick={() => start(async () => { const r = await testMailAction(p.services.mailProvider as 'resend' | 'brevo', p.services.mailApiKey, p.services.mailFrom, p.admin.email); setMailTest(r.message ?? ''); })}>Invia email di prova a {p.admin.email || 'te'}</button><span className="help">{mailTest}</span></div>
              </>}
            </div>
            <div className="panel"><div className="panel-title">Immagini</div>
              <div className="field"><label>Dove salvare le foto caricate</label><select className="select" value={p.services.storage} onChange={(e) => svc('storage', e.target.value as SetupPayload['services']['storage'])}><option value="auto">Automatico (Supabase Storage o Vercel Blob se disponibili)</option><option value="supabase">Supabase Storage</option><option value="vercel-blob">Vercel Blob</option><option value="db">Nel database (solo per prove)</option></select></div>
            </div>
            <div className="panel"><div className="panel-title">Lettori</div>
              <label className="switch"><input type="checkbox" checked={p.services.analytics} onChange={(e) => svc('analytics', e.target.checked)} /> Statistiche di lettura integrate (senza cookie, rispettose della privacy)</label><br />
              <label className="switch" style={{ marginTop: 8 }}><input type="checkbox" checked={p.services.push} onChange={(e) => svc('push', e.target.checked)} /> Notifiche push per le ultim&apos;ora (chiavi generate automaticamente)</label>
            </div>
          </section>
        )}
        {step === 6 && (
          <section>
            <h1>Tutto pronto</h1>
            <table className="table setup-summary"><tbody>
              <tr><th>Testata</th><td>{p.site.siteName} · {p.site.tagline}</td></tr>
              <tr><th>Indirizzo</th><td>{p.site.siteUrl || '(automatico)'}</td></tr>
              <tr><th>Città</th><td>{p.site.city}</td></tr>
              <tr><th>Amministratore</th><td>{p.admin.name} · {p.admin.email}</td></tr>
              <tr><th>Tema</th><td>{themes.find((t) => t.id === p.theme)?.name}</td></tr>
              <tr><th>Contenuti</th><td>{p.content === 'demo' ? 'dimostrativi' : p.content === 'empty' ? 'sito vuoto' : 'dati esistenti conservati'}</td></tr>
              <tr><th>Email</th><td>{p.services.mailProvider === 'none' ? 'non configurata' : p.services.mailProvider}</td></tr>
            </tbody></table>
            <p className="help">Premendo Installa verranno creati impostazioni, account e contenuti; poi entrerai direttamente in redazione.</p>
          </section>
        )}
        {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}
        <div className="setup-nav">
          {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={pending}>← Indietro</button>}
          <span className="spacer" />
          {step < STEPS.length - 1 && <button type="button" className="btn btn-primary btn-lg" onClick={next} disabled={step === 0 && !dbOk}>Continua →</button>}
          {step === STEPS.length - 1 && <button type="button" className="btn btn-primary btn-lg" onClick={install} disabled={pending}>{pending ? 'Installazione in corso…' : '🚀 Installa ASTER News'}</button>}
        </div>
      </main>
    </div>
  );
}
