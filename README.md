# ASTER News

CMS editoriale e sito di notizie realizzato in **Next.js 16** (App Router, React Server Components, Server Actions) con rendering lato server per la SEO.
Design ispirato a Fanpage.it / tema Ciao People: layout bianco, titoli in grassetto, accento rosso, ticker "Ultim'ora", dirette, video e fotogallery.

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
- Homepage con hero, "Ultime notizie" con orario, blocchi per categoria configurabili, video, sidebar (più letti, newsletter, in diretta, argomenti)
- URL stile Fanpage: `/cronaca` (categoria), `/cronaca/slug-articolo` (articolo), tag, autore, archivio, ricerca
- Formati articolo: standard, **video** (YouTube), **fotogallery** (lightbox), **diretta** (live blog con aggiornamenti)
- Ticker Ultim'ora, barra di lettura, condivisione social, correlati, commenti moderati, iscrizione newsletter
- **SEO**: HTML completo dal server, `generateMetadata` per pagina (title, description, OpenGraph, Twitter card, canonical, noindex), JSON-LD `NewsArticle`, `sitemap.xml` e `robots.txt` generati, redirect 308 se un articolo viene richiesto con la categoria sbagliata, immagini ottimizzate con `next/image`, font con `next/font`
- Responsive (desktop, tablet, mobile)

### CMS (`/admin`, protetto da cookie di sessione firmato + `proxy.ts`)
- **Dashboard**: statistiche, articoli più letti, cose da fare, attività recente
- **Articoli**: filtri per stato/categoria/autore, ordinamento, azioni bulk, duplica, elimina
- **Editor**: occhiello, titolo, sommario, editor rich text (H2/H3, citazioni, liste, link, immagini, video, sorgente HTML), estratto, copertina dalla libreria media, categoria, tag con suggerimenti, formato, flag (in evidenza, ultim'ora, sponsorizzato, commenti), stato e **programmazione**, pannello SEO con anteprima Google
- **Workflow**: bozza → revisione → pubblicato / programmato / archiviato, con permessi per ruolo verificati lato server in ogni server action
- **Categorie**, **Tag**, **Media** (upload drag&drop o URL), **Commenti**, **Newsletter** (export CSV), **Utenti e ruoli**, **Impostazioni** (identità, ticker, social, sezioni home, moderazione, export/reset dati)

## Dati

Lo store è un file JSON (`data/db.json`, creato al primo avvio dai dati demo in `src/lib/seed.ts`) letto e scritto solo lato server da `src/lib/db.ts`.
Tutte le letture passano da `src/lib/queries.ts` e tutte le scritture da `src/lib/actions.ts`: per passare a un database reale (es. Postgres) basta riscrivere questi due file.

> Su hosting serverless (Vercel) il filesystem non è persistente: per la produzione collega un database o imposta `DB_PATH` su un volume persistente.

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

Deploy su Vercel senza configurazione aggiuntiva (imposta le variabili `AUTH_SECRET` e `NEXT_PUBLIC_SITE_URL`).
