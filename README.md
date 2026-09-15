# ASTER News

CMS editoriale e sito di notizie in **Next.js 16** (App Router, React Server Components, Server Actions) su **Postgres** (Supabase in produzione, PGlite in locale). Design e funzioni ispirati a Today.it (Citynews), con sistema di temi, SEO automatica, importazione da WordPress per archivi da oltre 100.000 articoli, newsletter, notifiche push, statistiche integrate, lettori registrati e abbonamenti.

## Installazione (stile WordPress)

```bash
npm install
npm run dev
```

Apri <http://localhost:3000> (o la porta indicata): parte l'**installazione guidata** in sette passi — controllo database, testata, account amministratore con password personale, tema, contenuti (demo o sito vuoto, oppure dati esistenti conservati), servizi opzionali (email, immagini, statistiche, push) e riepilogo. Al termine entri direttamente in redazione (`/admin`).

Su Vercel: collega l'integrazione Supabase (crea `POSTGRES_URL`), fai il deploy e apri il dominio: comparirà la stessa installazione guidata. Variabili consigliate: `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.

## Cosa c'è

### Sito pubblico
- Home in stile Today (apertura, Dalle città, Dossier, Opinioni, sezioni, video, più letti) con **temi** selezionabili (Today, Fanpage, Quotidiano, Magazine, Territorio, Minimal) e personalizzabili; **edizioni** multi-testata per dominio (nome, logo, tema, filtro per zona o categorie).
- Categorie, tag con descrizione automatica, autori con bio estesa e social, zone, eventi, segnalazioni, meteo, video, foto, ricerca con **sinonimi, filtri per categoria e periodo, suggerimenti mentre si digita e "forse cercavi"**.
- Articoli: standard, video, fotogallery, diretta; blocchi Instagram, X, TikTok, mappe, tabelle, gallerie con didascalie, riquadri, «Leggi anche», **sondaggi**, FAQ; commenti con account lettore, segnalazione abusi e parole bloccate.
- Newsletter con **doppio opt-in** e **rassegna del mattino** automatica; **notifiche push** per le ultim'ora (PWA installabile); **paywall soft** (X articoli gratis al mese, contenuti premium, abbonamento Stripe); area lettore `/account`.
- Accessibilità: testo più grande, alto contrasto, meno animazioni, lettura ad alta voce.
- SEO: sitemap a indice (blocchi da 20.000 URL), news sitemap, RSS, robots per Google Discover, canonical, JSON-LD NewsArticle / LiveBlogPosting / VideoObject / FAQPage / Event / Person / Breadcrumb, redirect dei vecchi URL WordPress e **redirect manager** con registro 404 e suggerimenti.

### Redazione (`/admin`)
- Accesso con **password personale** (scrypt), **verifica in due passaggi** (app di autenticazione), recupero password via email, sessioni revocabili, blocco dei tentativi, **registro attività** con IP.
- Editor completo con SEO in tempo reale e ottimizzazione automatica; **Scrivi** in modalità semplice (testo grezzo → articolo ottimizzato); **revisioni** con confronto e ripristino; **autosalvataggio** ogni 30 secondi; avviso di **modifica concorrente**; note interne, **richiesta modifiche** all'autore, **assegnazione** con scadenza; **calendario editoriale** con trascinamento.
- Libreria media su **Supabase Storage o Vercel Blob** (ridimensionamento, WebP, tre varianti, punto focale, alt suggerito).
- **Importazione WordPress** (WXR in streaming o REST API) in background con ripresa, mappatura categorie, autori con email, immagini trasferite nello storage, redirect automatici.
- Statistiche integrate senza cookie (pagine viste, sorgenti, tempo di lettura, più letti/commentati), lettori e abbonati, newsletter e push, redirect e 404, edizioni, backup ed esportazione con ripristino, errori e controllo salute (email/webhook, Sentry opzionale), impostazioni a schede.

## Dati e infrastruttura

- Postgres via `POSTGRES_URL` / `DATABASE_URL` (driver `pg`, pooler Supabase in transaction mode); senza variabili, PGlite in `data/pg`. Schema e migrazioni idempotenti in `src/lib/db.ts`.
- Cache dei dati con tag e invalidazione al salvataggio (Impostazioni → Cache).
- Cron: `/api/cron/tick?job=daily` è pianificato in `vercel.json` (ogni giorno alle 5 UTC: pubblicazioni programmate, rassegna, backup, pulizia, controllo salute). Per precisione al minuto collega un cron esterno a `/api/cron/tick?job=minute&secret=CRON_SECRET`.
- Script (con il server di sviluppo fermo, PGlite accetta un solo processo):

```bash
npm run import:wp -- --file export.xml      # importazione WXR da riga di comando
npm run import:wp -- --url https://sito.it  # importazione via REST API
npm run seed:bulk -- --n 100000              # articoli di prova per misurare le prestazioni
npm test                                     # test unitari (motore SEO, sicurezza, importazione, database)
```

- Variabili d'ambiente opzionali: `RESEND_API_KEY` o `BREVO_API_KEY` + `MAIL_FROM`, `BLOB_READ_WRITE_TOKEN`, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (storage), `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET`, `SENTRY_DSN`, `DEMO_MODE=1` (mostra gli account demo con password `aster2026` per gli utenti senza password).
- CI: `.github/workflows/ci.yml` esegue controllo tipi, test e build a ogni push.

## Struttura

- `src/app/(site)` sito pubblico · `src/app/admin` redazione · `src/app/setup` installazione · `src/app/api` upload, cron, push, statistiche, backup, Stripe
- `src/lib/db.ts` connessione e schema · `repo.ts` / `repo-extra.ts` SQL · `queries.ts` letture con cache · `actions*.ts` server actions per area · `seo-engine.ts` motore SEO · `storage.ts` immagini · `newsletter.ts`, `push.ts`, `mailer.ts`, `jobs.ts`, `backup.ts`, `security.ts`, `auth.ts`
- `src/components/site` e `src/components/admin` componenti · `tests/` test Vitest
