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

### Novità della seconda tornata (verso WordPress)
- **Editor a blocchi** (paragrafi, titoli, citazioni, elenchi, immagini, embed, tabelle, riquadri, sondaggi, «Leggi anche») con trascinamento e inserimento tra i blocchi; l'editor classico resta disponibile. Il contenuto rimane HTML.
- **Assistente AI (Claude)**: titoli alternativi, sommario ed estratto, meta description, tag e occhiello, alt text delle foto, riscrittura di comunicati nello stile della testata, traduzione, punti da verificare, testi per i social. Chiave in Impostazioni → Assistente AI (o `ANTHROPIC_API_KEY`).
- **Social automatici**: Facebook (pagina), Telegram (canale), X (OAuth 1.0a) e webhook (Buffer/Zapier/WhatsApp); pubblicazione automatica alla messa online, coda, programmazione, ora migliore dalle statistiche, campo «Testo per i social» nell'articolo.
- **Login lettori**: Google, Facebook e magic link via email, oltre a email e password.
- **Newsletter multiple**: liste con blocchi trascinabili (intestazione, articoli con filtri, testo, immagine, pulsante, eventi, meteo), pianificazione per ora e giorni, iscrizioni per lista, tracciamento aperture e clic per invio.
- **Pubblicità**: annunci propri per posizione (home, colonna, dentro l'articolo, fine articolo, newsletter) con periodo, peso, impressioni e clic; AdSense negli spazi liberi.
- **Annunci e necrologi** dei lettori con pagamento Stripe (pagamento singolo), moderazione, scadenza, pagine pubbliche `/annunci` e `/necrologi`.
- **Aggiornamenti con un clic** (controllo su GitHub, canale stabile/beta, Deploy Hook Vercel) ed **estensioni** con hook (`beforeArticleSave`, `filterContent`, `afterArticlePublish`, `dailyJob`) e quattro estensioni incluse (firma automatica, parole vietate, webhook alla pubblicazione, avviso articoli datati).

### Novità della terza tornata
- **Pagine statiche** (Chi siamo, Contatti, Privacy…) con editor a blocchi, modelli standard/largo/landing, SEO e presenza nel menu; **menu personalizzati** di testata (con sottovoci) e piè di pagina in `/admin/menu`.
- **Cestino**: gli articoli eliminati restano recuperabili 30 giorni (ripristino, eliminazione definitiva, svuota cestino); la ricerca in redazione cerca anche nel testo e nelle note.
- **Coautori e pseudonimi**: firma personalizzata (byline) e più autori per articolo, mostrati nell'articolo e nei dati strutturati.
- **Card social automatiche** (`/api/og/{id}.png`, 1200×630) usate come immagine di condivisione quando manca la foto; dati strutturati `NewsMediaOrganization` + `WebSite` con ricerca; sitemap con immagini e video.
- **Controllo link rotti** notturno (o manuale) in Redirect e 404.
- **Commenti annidati** con risposte, voto «utile», risposta della redazione evidenziata e segnalazione.
- **Articoli salvati** e **preferenze del lettore** (zone, categorie, argomenti) con pagina «Per te»; esportazione dei propri dati e cancellazione dell'account (GDPR).
- **Donazioni** con Stripe Checkout: pagina `/sostieni`, riquadro in colonna, importi configurabili, registro e totali.
- **API pubblica** JSON di sola lettura (`/api/v1/...`) con chiavi opzionali, limite di richieste e CORS; **esportazione WXR** compatibile WordPress e **importazione da feed RSS/Atom**.
- **Protezione anti-abuso** (limiti per IP su commenti, login, donazioni, API) e **audit di accessibilità** nell'editor (alt mancanti, gerarchia titoli, link generici, contrasto).
- **Guida ai primi passi** in dashboard, pannello **«Il mio lavoro»**, **notifiche in-app** (campanella) per assegnazioni, richieste di modifica e articoli in revisione, **ruoli personalizzabili** con matrice permessi.

### Prestazioni automatiche (PageSpeed)
- **Slot immagine** (`src/lib/image-slots.ts`): ogni posizione del sito dichiara la sua larghezza reale ai breakpoint; `SmartImage slot="card"` genera da solo `sizes`, e per le immagini lazy antepone `auto` (il browser misura l'elemento e scarica solo la variante necessaria). L'apertura usa `slot="hero"`/`"cover"` con `fetchpriority=high` e preload.
- **Foto nel testo**: `optimizeBodyImages` aggiunge lazy loading, `sizes`, e per le foto della Libreria media anche `srcset` con le varianti WebP (360–1600 px) e width/height (niente scatti di layout). Il contenuto salvato non viene modificato.
- **Upload**: WebP in 5 misure allineate a `deviceSizes`; in uscita anche AVIF tramite l'ottimizzatore di Next.
- **Monitor PageSpeed** (`/admin/prestazioni`): misura home, ultimo articolo e prima categoria (o le pagine indicate) su smartphone e computer, salva lo storico, spiega in italiano cosa fare nel CMS per ogni segnalazione e avvisa (notifica, email, webhook) se il punteggio scende sotto la soglia o perde 10 punti. Serve una chiave API gratuita di PageSpeed Insights (impostazioni del pannello o `PAGESPEED_API_KEY`). Frequenza: ogni lunedì, ogni giorno o a mano.
- **Da terminale / CI**: `npm run pagespeed -- --url https://tuosito.it --pages /,/cronaca --min 90 [--desktop]`; il workflow `.github/workflows/pagespeed.yml` lo esegue ogni lunedì e su richiesta (segreto `PAGESPEED_API_KEY`).

### Quarta tornata: le idee rimanenti delle 110
- **Editor e contenuti**: blocchi riutilizzabili sincronizzati, modelli di articolo, campi personalizzati per categoria, incolla pulito da Word/Docs, note a piè di pagina `[^testo]`, riquadro «cosa sappiamo/non sappiamo», timeline, prima/dopo, tabelle da CSV, grafici SVG, PDF e audio, quiz con classifica, trascrizione audio/video con verbale, diretta in tempo reale (SSE), correzioni pubbliche e cronologia, indice dei paragrafi, modalità Focus.
- **Redazione**: desk con code di revisione, approvazione a più fasi, menzioni `@nome`, rubrica contatti, pianificazione per canale, regole automatiche «se… allora…», esportazione PDF/Word, rilevazione di articoli duplicati.
- **Media**: ritagli per formato dal punto focale, ritocchi e testo sovrapposto, cartelle/tag/cestino, banca immagini (Unsplash, Pexels), duplicati e compressione di massa, video hosting (Cloudflare Stream, Mux), credit/licenze/scadenza diritti, filigrana, invio dal telefono con posizione.
- **SEO e distribuzione**: pagine `/lite`, feed per Google News, Flipboard, Apple News e podcast, Web Stories AMP, tendenze Google e titoli della concorrenza, test A/B dei titoli, Search Console e Discover, traduzioni AI con hreflang, ricerca semantica (embedding).
- **Lettori e ricavi**: moderazione assistita da Claude, profili pubblici con badge, piani multipli e abbonamento regalo, metodi di pagamento Stripe, muro di registrazione, consigliati per te senza profilazione.
- **Canali**: webhook in uscita firmati, audio-articolo con voce sintetica, edizione digitale del giorno, widget incorporabili, bot Telegram, Flash Briefing Alexa, lettura offline nella PWA, scaffold app Capacitor (`mobile/`).
- **Multi-sito e temi**: builder della home a blocchi, libreria di layout con import/export JSON, CSS personalizzato con anteprima e versioni, redazioni per edizione, syndication, landing e microsit.
- **Piattaforma**: registro estensioni, staging con promozione, log di sicurezza con avvisi, SSO Google Workspace e Microsoft 365, test end-to-end Playwright (`npm run e2e`), monitoraggio sintetico, Core Web Vitals reali, registro consensi GDPR, guida in-app.

### Quinta tornata: affidabilità, redazione, lettori, ricavi
- **Rilascio controllato** (`/admin/rilascio`): commit in attesa, `npm run release:check` (tipi, test, end-to-end isolati), pulsante «Rilascia» attivo solo a condizioni verdi, ripristino con un clic, registro delle migrazioni, modalità manutenzione. **Uso dell'AI** registrato con tetto di spesa mensile.
- **Redazione**: commenti a margine sulla frase selezionata, scaletta del giorno stampabile, embargo, fonti riservate, rassegna mattutina automatica dai feed, dettatura vocale.
- **Lettori**: notifiche push per zona e sezione (`/notifiche`), «segui l'argomento» via email, lettura senza distrazioni, coda di ascolto, segnalazione errori, biglietti per gli eventi con controllo all'ingresso.
- **Ricavi**: report per l'inserzionista, pubblicità self-service (`/pubblicita`), abbonamenti aziendali, prova gratuita e codici sconto, abbonati a rischio con email di recupero.
- **Dati e SEO**: cruscotto per autore, contenuti sempreverdi in calo, controllo dei dati strutturati nell'editor, archivio storico (`/archivio/2026/09/18`).
- **Piattaforma**: importatori Drupal (JSON:API) e Joomla (Web Services), `Dockerfile` e `docker-compose.yml` (app, Postgres e cron con `docker compose up -d`).
- **Test**: `npm test` (unitari e di integrazione su database in memoria), `npm run e2e:isolated` (Playwright su ambiente usa e getta: login, tutte le pagine di redazione, flussi chiave).

### Un CMS che cambia forma
- **Adatta il CMS** (`/admin/adatta`): profilo d'uso (quotidiano, rivista, blog personale, diario, newsletter, portfolio), menu che sposta in «Altro» le voci non usate, modalità solista quando c'è una sola persona, vocabolario su misura («post», «appunti», «ricette»).
- **Scrittura a strati**: blocco con tre versioni dello stesso passaggio (in breve, normale, completo); il lettore sceglie la profondità con un cursore e la scelta resta per le letture successive. Senza JavaScript si legge la versione normale.
- **Come è nato questo articolo**: sotto il pezzo, versioni salvate, fonti consultate e verificate, cosa ha proposto l'AI. Disattivabile per articolo o per tutto il sito.
- **Cerchie di lettori**: post interi o singoli paragrafi riservati a gruppi (famiglia, amici, sostenitori) con chiavi d'invito revocabili; i contenuti riservati non escono mai in feed, API, ricerca e sitemap.
- **Correzione che si propaga**: una correzione aggiunta a un articolo già uscito sui social fa partire un post di rettifica sugli stessi canali.

### Sesta tornata: le idee mai viste in un CMS
Tutte passano da un archivio generico dei contributi (`records`: tipo, riferimento, stato, dati JSON), quindi nessuna ha richiesto tabelle nuove.
- **Fiducia** (`/admin/fiducia`): etichetta dell'articolo, stato di verifica, «cosa non sappiamo ancora», conflitti di interesse, promesse e previsioni con scadenza ed esito, diritto di replica, firma Ed25519 verificabile (`/api/verify/[id]`), correzione recapitata a chi aveva letto, storie lasciate a metà. Pagine pubbliche: `/trasparenza`, `/correzioni`, `/previsioni`, `/domande-aperte`, `/attenzione`.
- **Scrivere**: «Sala prove» nell'editor (domande mancanti, avvocato del diavolo, lettori di prova, mappa della certezza, impronta di stile senza AI), bozza parlata, staffetta con biglietto vocale, titoli per contesto, frasi con scadenza, numeri vivi `{{dato:chiave}}`, note d'autore `[[nota: …]]`, articolo com'era prima. `/admin/officina`: appunti che maturano, sessioni, cimitero delle bozze, newsletter dalle note.
- **Lettura**: strumenti sul testo selezionato (sottolinea, grazie, spiegami, cartolina, link al passaggio), «ho N minuti», versioni per bambini e in lingua facile, codice di tre parole (`/riprendi`), lettura condivisa, domande all'articolo, «ho cambiato idea», risposte lunghe, suono d'ambiente, `/colazione`, `/mappa`, `/percorsi`, `/luoghi/[slug]`, «ciò che ti sei perso» in home.
- **Sito personale** (`/admin/personale`): un anno fa oggi, lettere al futuro, passaggi «solo per me», raccolte automatiche con evoluzione delle idee, libro EPUB/PDF (`/api/export/libro`), post come dati (`/dati/[sezione]` + CSV), `/adesso` (anche dal bot Telegram), `/uso`, `/corrispondenze`, racconti a più voci, ricordi con posto e meteo, silenzio dichiarato, testamento digitale con erede, `/ospiti` scritto a mano, tipi di contenuto descritti a parole, stagioni del tema, `/quaderno`, home dall'attività, modalità evento (`/speciale`), sito in scatola (`/api/export/statico`).
- **Comunità** (`/comunita`, `/admin/comunita`, moderazione unica in `/admin/partecipazione`): assemblea dei lettori, banca delle competenze, taccuino di quartiere, domande al Comune con giorni di attesa, traduzioni volontarie, ricordi sui necrologi, bacheca con scadenza e link di risoluzione, archivio fotografico con datazione collettiva, lo stesso posto nel tempo, ore di ascolto, abbonamento sospeso, tessera del lettore verificabile.
- **Distribuzione**: «un contenuto, dieci uscite» con avviso quando il testo cambia, `/breve/[id]` per SMS e WhatsApp, `/stampa/[zona]` (A4 da appendere), `/schermo` per i televisori, `/llms.txt`, citazioni dagli assistenti AI (`/admin/statistiche/ai`), podcast a due voci, link esterni con copia archiviata.
- **Sostenibilità** (`/admin/ritmi`): CO₂ per pagina e basso consumo notturno, tetto di notifiche deciso dal lettore, metriche velate, metriche di senso (`/admin/statistiche/senso`), orari di quiete con emergenze dichiarate, sovraccarico, costo reale degli articoli, prezzo libero sensato, ricavi condivisi con le fonti, **uscita pulita** (`/admin/uscita`: WXR, ZIP statico, redirect per WordPress, Netlify, nginx, Apache).

Nota di sicurezza: nei file `'use server'` vivono solo azioni con i propri controlli; le letture per le pagine stanno in moduli `server-only` (`*-data.ts`) e il completamento dei pagamenti in `fulfilment.ts`, raggiungibile solo dal webhook Stripe firmato.

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

- Variabili d'ambiente opzionali: `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET`, `RESEND_API_KEY` o `BREVO_API_KEY` + `MAIL_FROM`, `BLOB_READ_WRITE_TOKEN`, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (storage), `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET`, `SENTRY_DSN`, `DEMO_MODE=1` (mostra gli account demo con password `aster2026` per gli utenti senza password).
- CI: `.github/workflows/ci.yml` esegue controllo tipi, test e build a ogni push.

## Struttura

- `src/app/(site)` sito pubblico · `src/app/admin` redazione · `src/app/setup` installazione · `src/app/api` upload, cron, push, statistiche, backup, Stripe
- `src/lib/db.ts` connessione e schema · `repo.ts` / `repo-extra.ts` SQL · `queries.ts` letture con cache · `actions*.ts` server actions per area · `seo-engine.ts` motore SEO · `storage.ts` immagini · `newsletter.ts`, `push.ts`, `mailer.ts`, `jobs.ts`, `backup.ts`, `security.ts`, `auth.ts`
- `src/components/site` e `src/components/admin` componenti · `tests/` test Vitest
