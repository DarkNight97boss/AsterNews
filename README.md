# ASTER News

CMS editoriale e sito di notizie realizzato in **Next.js 16** (App Router, React Server Components, Server Actions) con rendering lato server per la SEO.
Design e funzioni ispirati a Today.it (Citynews): header blu con logo serif e box delle firme, titoli in serif, occhielli rossi, tema chiaro/scuro, "Dalle città", Dossier con badge giallo, Opinioni con firma in evidenza, "I più letti", ticker "Ultim'ora", dirette, video e fotogallery.

## Avvio

```bash
npm install
cp .env.example .env.local   # imposta AUTH_SECRET e NEXT_PUBLIC_SITE_URL
npm run dev
```

Sito: <http://localhost:3000> — Redazione (CMS): <http://localhost:3000/admin>

### Account demo

Password unica per tutti: `aster2026`

| Ruolo          | Email                  | Permessi                                              |
| -------------- | ---------------------- | ----------------------------------------------------- |
| Amministratore | admin@asternews.it     | Tutto (utenti, impostazioni, pubblicazione)           |
| Caporedattore  | editor@asternews.it    | Tutti gli articoli, categorie, tag, media, commenti   |
| Redattore      | sara@asternews.it      | Propri articoli, pubblicazione, tag, media            |
| Collaboratore  | davide@asternews.it    | Propri articoli in bozza / revisione                  |

## Funzionalità

### Sito pubblico (server-rendered)
- Homepage stile Today: apertura con titolo serif e immagine, coppia di notizie, colonna "Dalle città", fascia Dossier in evidenza, blocco Dossier scuro, sezioni per categoria a 4 colonne, "Le opinioni" con avatar delle firme, video, "I più letti" e newsletter
- Tipi di sezione configurabili dal CMS: notizie, **Dalle città** (occhiello = città), **Opinioni** (firma in evidenza, box nell'header), **Dossier** (badge giallo)
- Tema chiaro / scuro con toggle nella barra superiore (persistito via cookie, senza flash)
- URL: `/politica` (sezione con sotto-argomenti automatici dai tag), `/politica/slug-articolo`, tag, autore, archivio, ricerca
- **Funzioni Citynews (RomaToday/Today)**: meteo in barra alta con pagina previsioni a 7 giorni ora per ora (Open-Meteo, senza chiave), **Cosa fare in città** con eventi filtrabili per periodo e tipologia, stelle, "Gratis", dettaglio con JSON-LD Event e mappa, **Segnala un evento** (approvazione in redazione), **Zone** con indice alfabetico comuni/quartieri e pagina per zona, zona e indirizzo nell'articolo, **Segnalazioni** dei lettori con foto e risposta della redazione, pagine **Video** e **Foto**, mega-menu a colonne, cookie banner, fondo articolo con "© Riproduzione riservata", condivisione via email e link Google News, "In evidenza" e "I più letti della settimana", **feed RSS** (`/feed.xml`) e **sitemap Google News** (`/news-sitemap.xml`)
- Pagina articolo a tre colonne: firma, data, condivisione, "Si parla di" e "Sullo stesso argomento" a sinistra; testo serif con capolettera; "Video del giorno"; "I più letti" e newsletter a destra
- Formati articolo: standard, **video** (YouTube), **fotogallery** (lightbox), **diretta** (live blog con aggiornamenti)
- Ticker Ultim'ora, barra di lettura, condivisione social, correlati, commenti moderati, iscrizione newsletter
- **SEO**: HTML completo dal server, `generateMetadata` per pagina (title, description, OpenGraph, Twitter card, canonical, noindex), JSON-LD `NewsArticle`, `sitemap.xml` e `robots.txt` generati, redirect 308 se un articolo viene richiesto con la categoria sbagliata, immagini ottimizzate con `next/image`, font con `next/font`
- Responsive (desktop, tablet, mobile)

### CMS (`/admin`, protetto da cookie di sessione firmato + `proxy.ts`)
- **Dashboard**: statistiche, articoli più letti, cose da fare, attività recente
- **Articoli**: filtri per stato/categoria/autore, ordinamento, azioni bulk, duplica, elimina
- **Editor**: occhiello, titolo, sommario, editor rich text (H2/H3, citazioni, liste, link, immagini, video, sorgente HTML), estratto, copertina dalla libreria media, categoria, tag con suggerimenti, formato, flag (in evidenza, ultim'ora, sponsorizzato, commenti), stato e **programmazione**, pannello SEO con anteprima Google
- **Workflow**: bozza → revisione → pubblicato / programmato / archiviato, con permessi per ruolo verificati lato server in ogni server action
- **Eventi** (approvazione delle segnalazioni dei lettori), **Zone**, **Segnalazioni** (stati: nuova, in lavorazione, pubblicata, archiviata; risposta pubblica), meteo e città nelle impostazioni
- **Categorie**, **Tag**, **Media** (upload drag&drop o URL), **Commenti**, **Newsletter** (export CSV), **Utenti e ruoli**, **Impostazioni** (identità, ticker, social, sezioni home, moderazione, export/reset dati)

## SEO automatica

Ogni articolo viene analizzato in tempo reale nell'editor (punteggio 0-100 e checklist di 25 controlli: lunghezze di titolo, meta e slug, parola chiave in titolo/primo paragrafo/sottotitoli/description/slug, densità, lunghezza del testo, H2/H3, paragrafi brevi, leggibilità Gulpease, copertina e alt, link interni ed esterni, tag, titolo duplicato, noindex).
«Ottimizza automaticamente» compila parola chiave, meta title, meta description, estratto e slug, corregge alt e link esterni e inserisce fino a N **link interni** verso articoli correlati (àncore = tag e nomi propri del titolo degli altri articoli). Le stesse ottimizzazioni girano al salvataggio se attive in Impostazioni → SEO automatica, dove si imposta anche il token di verifica Google Search Console.
Motore in `src/lib/seo-engine.ts` (funzioni pure, senza servizi esterni); punteggio salvato sull'articolo e riepilogo in dashboard.

## Scrivi (modalità semplice) e importazione da WordPress

**Scrivi**: il redattore inserisce solo titolo e testo (anche incollato da Word). Il sistema spezza i paragrafi lunghi, riconosce o aggiunge i titoletti H2, sceglie parola chiave, occhiello, sommario, estratto, categoria, zona, tag, meta title, description, slug, link interni e una copertina se manca; poi salva in revisione o pubblica. Nell'editor resta il rapporto "Cosa ha fatto il sistema".

**Importa da WordPress** (Sistema → Importa da WordPress): da file di esportazione WXR (Strumenti → Esporta) o dal sito online via REST API. Importa articoli, categorie (mappabili), tag, autori, immagini in evidenza e stato; pulisce blocchi Gutenberg e shortcode; opzionalmente passa ogni articolo dal motore SEO. I vecchi URL vengono salvati e reindirizzati con 308 permanente (`/anno/mese/slug/`, `/categoria/slug`, `/slug`).

## Qualità misurata (Lighthouse, build di produzione locale)

Desktop: performance 100, accessibilità 100, best practice 100, SEO 100 (home e articolo). Mobile con rete 4G simulata: performance 92-95, il resto 100; il limite è il download delle immagini dimostrative da picsum.photos e dei font web.

## Sistema di temi

Il motore (dati, rotte, CMS, componenti) è unico; il **tema** decide colori, font, stile della testata, layout della home e stile delle card.
Si sceglie da **Impostazioni → Tema del sito**: sei preset (Today, Fanpage — replica fedele di Fanpage.it con home, sezione e articolo dedicati —, Quotidiano, Magazine, Territorio, Minimal), personalizzabili in colore principale, colore accento, font titoli/testo, testata, layout home, stile card e raggio degli angoli.
«Anteprima sul sito» mostra il tema solo all'amministratore (cookie di 30 minuti) con una barra gialla per applicarlo o uscire; «Salva impostazioni» lo rende definitivo.

Per aggiungere un tema basta un nuovo oggetto in `src/lib/themes.ts` (`THEMES`); i token CSS vengono iniettati nel layout radice come variabili (`--blue`, `--red`, `--font-serif`, `--radius-card`, ecc.), le varianti strutturali sono selezionate con `data-header`, `data-card-style` e `data-site-theme` sull'elemento `html`.

## Dati (Postgres)

Il database è **Postgres**: in produzione **Supabase** (o qualsiasi Postgres) tramite `POSTGRES_URL` / `DATABASE_URL`; in locale, se nessuna variabile è impostata, **PGlite** (Postgres embedded, salvato in `data/pg`, nessuna installazione). Lo stesso SQL gira in entrambi i casi.

- Schema e dati demo creati al primo avvio (`src/lib/db.ts`, seed in `src/lib/seed.ts`).
- Letture in `src/lib/queries.ts`, scritture in `src/lib/actions.ts`, SQL nel repository `src/lib/repo.ts`.
- Ricerca full-text in italiano (`tsvector` generato + indice GIN), indici su stato/data/categoria/autore/zona, paginazione ovunque: pensato per archivi da oltre 100.000 articoli.
- Sitemap a indice (`/sitemap.xml` → `/sitemaps/pagine.xml`, `/sitemaps/articoli-N.xml` da 20.000 URL).

Script (da eseguire con il server di sviluppo fermo, perché PGlite accetta un solo processo):

```bash
npm run import:wp -- --file export.xml      # importazione WXR dalla riga di comando (archivi enormi)
npm run import:wp -- --url https://sito.it  # importazione via REST API
npm run seed:bulk -- --n 100000              # articoli finti per misurare le prestazioni
```

> Nota: il file `.env.local` scaricato con `vercel env pull` contiene `VERCEL=1` e i valori segreti come `[SENSITIVE]`; il codice li ignora. Per usare Supabase anche in locale incolla in `.env.local` la stringa `DATABASE_URL=postgresql://...` presa dalla dashboard Supabase.

## Struttura

```
src/
├── app/                 rotte App Router
│   ├── (site)/          layout sito, home, [categorySlug], [categorySlug]/[articleSlug], tag, autore, notizie, cerca
│   ├── admin/           layout CMS, dashboard, articoli, editor, categorie, tag, media, commenti, newsletter, utenti, impostazioni
│   ├── login/           accesso redazione
│   ├── sitemap.ts, robots.ts, layout.tsx, globals.scss
├── components/          site/ (card, sidebar, header, ticker…), admin/ (editor, tabelle, manager…), ui/ (toast, action button)
├── lib/                 models, seed, db (store JSON), queries, actions (server actions), auth (sessione), permissions, utils
└── proxy.ts             protezione /admin
```

## Build e deploy

```bash
npm run build
npm start
```

Deploy su Vercel: collega l'integrazione Supabase (crea `POSTGRES_URL`) e imposta `AUTH_SECRET` e `NEXT_PUBLIC_SITE_URL` (es. `https://asternewscms.vercel.app`). Le funzioni serverless accettano upload fino a ~4,5 MB: per esportazioni WordPress più grandi usa l'importazione via REST API oppure lo script `npm run import:wp` puntato allo stesso database.
