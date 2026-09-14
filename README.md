# ASTER News

CMS editoriale e sito di notizie realizzato in **Angular 22** (standalone components, signals, zoneless).
Design ispirato a Fanpage.it / tema Ciao People: layout bianco, titoli in grassetto, accento rosso, ticker "Ultim'ora", dirette, video e fotogallery.

## Avvio

```bash
npm install
npm start
```

Sito: <http://localhost:4200> — Redazione (CMS): <http://localhost:4200/admin>

### Account demo

Password unica per tutti: `aster2026`

| Ruolo          | Email                  | Permessi                                              |
| -------------- | ---------------------- | ----------------------------------------------------- |
| Amministratore | admin@asternews.it     | Tutto (utenti, impostazioni, pubblicazione)           |
| Caporedattore  | editor@asternews.it    | Tutti gli articoli, categorie, tag, media, commenti   |
| Redattore      | sara@asternews.it      | Propri articoli, pubblicazione, tag, media            |
| Collaboratore  | davide@asternews.it    | Propri articoli in bozza / revisione                  |

## Funzionalità

### Sito pubblico
- Homepage con hero, "Ultime notizie" con orario, blocchi per categoria configurabili, video, sidebar (più letti, newsletter, in diretta, argomenti)
- Pagine categoria (`/cronaca`), articolo (`/cronaca/slug`), tag, autore, archivio, ricerca
- Formati articolo: standard, **video** (YouTube), **fotogallery** (con lightbox), **diretta** (live blog con aggiornamenti)
- Ticker Ultim'ora, barra di avanzamento lettura, condivisione social, articoli correlati, commenti con moderazione, iscrizione newsletter
- SEO: title/meta/OpenGraph per pagina, slug automatici, noindex
- Responsive (desktop, tablet, mobile)

### CMS (`/admin`)
- **Dashboard**: statistiche, articoli più letti, cose da fare, attività recente
- **Articoli**: filtri per stato/categoria/autore, ordinamento, azioni bulk, duplica, elimina
- **Editor**: occhiello, titolo, sommario, editor rich text (H2/H3, citazioni, liste, link, immagini, video, sorgente HTML), estratto, copertina dalla libreria media, categoria, tag con suggerimenti, formato, flag (in evidenza, ultim'ora, sponsorizzato, commenti), stato e **programmazione**, pannello SEO con anteprima Google
- **Workflow**: bozza → revisione → pubblicato / programmato / archiviato, con permessi per ruolo
- **Categorie** (colore, ordine, menu, home), **Tag**, **Media** (upload drag&drop o URL), **Commenti** (approva / rifiuta / spam), **Newsletter** (export CSV), **Utenti e ruoli**, **Impostazioni** (identità, ticker, social, sezioni home, moderazione, export/reset dati)

## Dati

La demo usa uno store a signals persistito in `localStorage` (`src/app/core/services/store.service.ts`) con dati di esempio in `src/app/core/seed.ts`.
Per collegare un backend reale basta sostituire i metodi dello store con chiamate HTTP: i componenti dipendono solo dall'interfaccia dello store.

## Struttura

```
src/app
├── core/            modelli, store, auth, guard, pipe, utilità, seed
├── features/public/ layout, home, categoria, articolo, tag, ricerca, autore, archivio
├── features/admin/  layout, dashboard, articoli, editor, categorie, tag, media, commenti, utenti, impostazioni
└── features/auth/   login
```

## Build

```bash
npm run build
```

Output in `dist/aster-news/browser`, deployabile su qualsiasi hosting statico (Vercel, Netlify, GitHub Pages) con fallback a `index.html`.
