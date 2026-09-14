import { Article, Category, Comment, Database, MediaItem, Tag, User } from './models';
import { hoursAgo, img, slugify } from './utils';

const categories: Category[] = [
  { id: 'c_cronaca', slug: 'cronaca', name: 'Cronaca', color: '#e2001a', description: 'Fatti, indagini e notizie dal territorio.', order: 1, showInMenu: true, showOnHome: true },
  { id: 'c_politica', slug: 'politica', name: 'Politica', color: '#1f4e9c', description: 'Governo, Parlamento, partiti e istituzioni.', order: 2, showInMenu: true, showOnHome: true },
  { id: 'c_economia', slug: 'economia', name: 'Economia', color: '#0b7a4b', description: 'Mercati, lavoro, imprese e finanza personale.', order: 3, showInMenu: true, showOnHome: true },
  { id: 'c_roma', slug: 'roma', name: 'Roma', color: '#8a1c7c', description: 'La città, i quartieri, la mobilità e gli eventi.', order: 4, showInMenu: true, showOnHome: true },
  { id: 'c_sport', slug: 'sport', name: 'Sport', color: '#e67e00', description: 'Calcio, tennis, motori e tutte le discipline.', order: 5, showInMenu: true, showOnHome: true },
  { id: 'c_spettacolo', slug: 'spettacolo', name: 'Spettacolo', color: '#c2185b', description: 'Cinema, TV, musica e gossip.', order: 6, showInMenu: true, showOnHome: true },
  { id: 'c_tecnologia', slug: 'tecnologia', name: 'Tecnologia', color: '#0277bd', description: 'Innovazione, app, AI e scienza.', order: 7, showInMenu: true, showOnHome: true },
  { id: 'c_salute', slug: 'salute', name: 'Salute', color: '#00897b', description: 'Benessere, sanità e ricerca medica.', order: 8, showInMenu: true, showOnHome: false },
  { id: 'c_esteri', slug: 'esteri', name: 'Esteri', color: '#455a64', description: 'Il mondo visto da vicino.', order: 9, showInMenu: true, showOnHome: false },
];

const tagNames = ['Governo', 'Elezioni', 'Maltempo', 'Trasporti', 'Serie A', 'Champions League', 'Intelligenza artificiale', 'Smartphone', 'Inflazione', 'Lavoro', 'Sanità', 'Scuola', 'Cinema', 'Musica', 'Televisione', 'Metro C', 'Traffico', 'Ambiente', 'Giustizia', 'Europa', 'Bonus', 'Vaccini', 'Startup', 'Turismo'];
const tags: Tag[] = tagNames.map((n) => ({ id: 't_' + slugify(n), slug: slugify(n), name: n }));
const T = (n: string) => 't_' + slugify(n);

const users: User[] = [
  { id: 'u_admin', name: 'Giulia Ferrante', email: 'admin@asternews.it', role: 'admin', avatar: img('giulia', 200, 200), bio: 'Direttrice responsabile di ASTER News.', active: true, createdAt: hoursAgo(24 * 400) },
  { id: 'u_editor', name: 'Marco Vitali', email: 'editor@asternews.it', role: 'editor', avatar: img('marco', 200, 200), bio: 'Caporedattore centrale, coordina cronaca e politica.', active: true, createdAt: hoursAgo(24 * 380) },
  { id: 'u_author1', name: 'Sara Conti', email: 'sara@asternews.it', role: 'author', avatar: img('sara', 200, 200), bio: 'Segue economia e lavoro. Prima a Il Sole, poi in redazione digitale.', active: true, createdAt: hoursAgo(24 * 300) },
  { id: 'u_author2', name: 'Luca Moretti', email: 'luca@asternews.it', role: 'author', avatar: img('luca', 200, 200), bio: 'Inviato sportivo, racconta il calcio dal campo.', active: true, createdAt: hoursAgo(24 * 250) },
  { id: 'u_author3', name: 'Elena Russo', email: 'elena@asternews.it', role: 'author', avatar: img('elena', 200, 200), bio: 'Tecnologia, scienza e cultura digitale.', active: true, createdAt: hoursAgo(24 * 200) },
  { id: 'u_contrib', name: 'Davide Greco', email: 'davide@asternews.it', role: 'contributor', avatar: img('davide', 200, 200), bio: 'Collaboratore per spettacolo e cultura.', active: true, createdAt: hoursAgo(24 * 90) },
];

interface Seed {
  cat: string; author: string; kicker: string; title: string; subtitle: string; tags: string[];
  h: number; views: number; featured?: boolean; breaking?: boolean; format?: Article['format']; status?: Article['status']; sponsored?: boolean;
}

const body = (t: string, cat: string) => `
<p><strong>${t.split(':')[0]}.</strong> La notizia è arrivata nelle prime ore della mattinata ed è stata confermata da fonti qualificate contattate dalla redazione di ASTER News. Le informazioni raccolte finora delineano un quadro ancora in evoluzione, sul quale sono attesi ulteriori aggiornamenti nelle prossime ore.</p>
<p>Secondo quanto ricostruito, gli elementi al centro della vicenda sono stati verificati attraverso più fonti indipendenti. Gli interlocutori istituzionali hanno chiesto prudenza e invitato a evitare speculazioni prima della conclusione degli accertamenti in corso.</p>
<h2>Cosa sappiamo finora</h2>
<p>I punti fermi sono pochi ma significativi. In primo luogo, la tempistica: tutto è avvenuto in un arco di poche ore, con una rapida escalation di reazioni. In secondo luogo, l'impatto sul settore ${cat.toLowerCase()} è già misurabile e viene monitorato da osservatori e analisti.</p>
<blockquote>«Stiamo seguendo la situazione con la massima attenzione. Ogni decisione sarà presa nell'interesse dei cittadini e nel rispetto delle regole», ha dichiarato un portavoce.</blockquote>
<h2>Le reazioni</h2>
<p>Le prime reazioni non si sono fatte attendere. Sui social il tema è rapidamente entrato tra i più discussi della giornata, mentre le associazioni di categoria hanno diffuso note ufficiali chiedendo chiarezza e tempi certi.</p>
<ul>
<li>Le istituzioni hanno convocato un tavolo tecnico per le prossime 48 ore.</li>
<li>Gli operatori del settore chiedono misure straordinarie.</li>
<li>Prevista una conferenza stampa nel pomeriggio.</li>
</ul>
<h2>Cosa succede adesso</h2>
<p>Nelle prossime ore sono attesi nuovi sviluppi. La redazione continuerà a seguire la vicenda con aggiornamenti in tempo reale su questa pagina e sui canali social di ASTER News. Per approfondire, consulta gli articoli correlati in fondo alla pagina.</p>
`;

const seeds: Seed[] = [
  { cat: 'c_cronaca', author: 'u_editor', kicker: 'Maltempo', title: 'Nubifragio sulla Capitale: allagamenti, metro chiusa e scuole evacuate', subtitle: 'Allerta arancione prorogata fino a domani. Il Campidoglio: «Restate a casa se potete»', tags: ['Maltempo', 'Trasporti', 'Traffico'], h: 1, views: 48210, featured: true, breaking: true, format: 'live' },
  { cat: 'c_politica', author: 'u_editor', kicker: 'Governo', title: 'Manovra, via libera del Consiglio dei ministri: taglio del cuneo e bonus famiglie', subtitle: 'Il testo passa ora al Parlamento. Opposizioni: «Coperture incerte»', tags: ['Governo', 'Bonus', 'Lavoro'], h: 2, views: 31200, featured: true },
  { cat: 'c_sport', author: 'u_author2', kicker: 'Serie A', title: 'Il derby finisce 2-2: rimonta nel recupero e polemiche sul VAR', subtitle: 'Due gol negli ultimi cinque minuti. L\'allenatore: «Così non si può giocare»', tags: ['Serie A'], h: 3, views: 27800, featured: true },
  { cat: 'c_economia', author: 'u_author1', kicker: 'Prezzi', title: 'Inflazione in calo al 1,4%: cosa cambia per spesa, mutui e bollette', subtitle: 'Il dato Istat sotto le attese. Ma il carrello della spesa resta caro', tags: ['Inflazione'], h: 4, views: 19500, featured: true },
  { cat: 'c_tecnologia', author: 'u_author3', kicker: 'AI', title: 'Intelligenza artificiale a scuola: parte la sperimentazione in 500 istituti', subtitle: 'Tutor digitali per studenti e docenti. Il Ministero: «Nessuna sostituzione degli insegnanti»', tags: ['Intelligenza artificiale', 'Scuola'], h: 5, views: 15400 },
  { cat: 'c_roma', author: 'u_editor', kicker: 'Mobilità', title: 'Metro C, apre la stazione Colosseo: orari, collegamenti e cosa cambia per i pendolari', subtitle: 'Dopo dieci anni di cantieri il Colosseo è finalmente collegato alla linea C', tags: ['Metro C', 'Trasporti'], h: 6, views: 22300, format: 'gallery' },
  { cat: 'c_spettacolo', author: 'u_contrib', kicker: 'Cinema', title: 'Il film italiano che sta conquistando i festival: recensione e curiosità', subtitle: 'Standing ovation di dieci minuti alla prima. In sala dal prossimo giovedì', tags: ['Cinema'], h: 7, views: 9800, format: 'video' },
  { cat: 'c_salute', author: 'u_author3', kicker: 'Sanità', title: 'Liste d\'attesa, il nuovo piano: visite entro 30 giorni o rimborso', subtitle: 'Arriva la piattaforma unica per le prenotazioni. Le Regioni frenano', tags: ['Sanità'], h: 9, views: 12100 },
  { cat: 'c_cronaca', author: 'u_editor', kicker: 'Giustizia', title: 'Maxi operazione contro le frodi sui bonus edilizi: 40 arresti in tutta Italia', subtitle: 'Sequestrati beni per 120 milioni. Coinvolte imprese e professionisti', tags: ['Giustizia', 'Bonus'], h: 11, views: 17600 },
  { cat: 'c_politica', author: 'u_editor', kicker: 'Elezioni', title: 'Regionali, i sondaggi a un mese dal voto: testa a testa nelle grandi città', subtitle: 'Affluenza attesa in calo. I candidati puntano su sanità e trasporti', tags: ['Elezioni'], h: 13, views: 8900 },
  { cat: 'c_economia', author: 'u_author1', kicker: 'Lavoro', title: 'Smart working, nuove regole dal 1° gennaio: cosa devono sapere dipendenti e aziende', subtitle: 'Accordi individuali, diritto alla disconnessione e buoni pasto', tags: ['Lavoro'], h: 15, views: 14300 },
  { cat: 'c_sport', author: 'u_author2', kicker: 'Champions', title: 'Notte di Champions: le italiane in campo, dove vederle e le probabili formazioni', subtitle: 'Tre squadre a caccia dei quarti', tags: ['Champions League'], h: 17, views: 11000 },
  { cat: 'c_tecnologia', author: 'u_author3', kicker: 'Smartphone', title: 'Il nuovo smartphone pieghevole alla prova: pregi, difetti e prezzo', subtitle: 'Sette giorni di test. Batteria ottima, fotocamera migliorabile', tags: ['Smartphone'], h: 20, views: 7600 },
  { cat: 'c_roma', author: 'u_editor', kicker: 'Quartieri', title: 'Ztl fascia verde, parte la fase due: nuovi varchi e multe dal 1° del mese', subtitle: 'Cosa cambia per chi ha un diesel Euro 4 e le deroghe previste', tags: ['Traffico', 'Ambiente'], h: 22, views: 20100 },
  { cat: 'c_spettacolo', author: 'u_contrib', kicker: 'TV', title: 'Ascolti tv, la fiction batte il reality: i dati della serata', subtitle: 'Oltre 5 milioni di spettatori per la prima puntata', tags: ['Televisione'], h: 26, views: 6700 },
  { cat: 'c_esteri', author: 'u_editor', kicker: 'Europa', title: 'Bruxelles approva il nuovo patto sui migranti: cosa prevede e chi lo contesta', subtitle: 'Il voto finale dopo tre anni di negoziati', tags: ['Europa'], h: 28, views: 9100 },
  { cat: 'c_cronaca', author: 'u_editor', kicker: 'Incidente', title: 'Tamponamento a catena sul Raccordo: code per 10 chilometri, due feriti', subtitle: 'Traffico in tilt in carreggiata interna tra Appia e Tuscolana', tags: ['Traffico'], h: 30, views: 13400 },
  { cat: 'c_economia', author: 'u_author1', kicker: 'Startup', title: 'La startup romana che ha raccolto 20 milioni per la logistica green', subtitle: 'Consegne con cargo bike elettriche in dieci città', tags: ['Startup', 'Ambiente'], h: 34, views: 5400 },
  { cat: 'c_salute', author: 'u_author3', kicker: 'Prevenzione', title: 'Influenza, al via la campagna vaccinale: chi ha diritto alla dose gratuita', subtitle: 'Prenotazioni in farmacia e dal medico di base', tags: ['Vaccini', 'Sanità'], h: 40, views: 8200 },
  { cat: 'c_sport', author: 'u_author2', kicker: 'Tennis', title: 'Finale da sogno: l\'azzurro vola in finale dopo cinque set', subtitle: 'Una maratona di quattro ore e mezza', tags: [], h: 45, views: 16800 },
  { cat: 'c_tecnologia', author: 'u_author3', kicker: 'Sicurezza', title: 'Truffa del finto corriere via SMS: come riconoscerla e cosa fare', subtitle: 'Migliaia di segnalazioni in una settimana', tags: ['Smartphone'], h: 50, views: 21000 },
  { cat: 'c_roma', author: 'u_editor', kicker: 'Eventi', title: 'Weekend a Roma: dieci cose da fare tra mostre, concerti e mercatini', subtitle: 'La guida della redazione agli eventi del fine settimana', tags: ['Turismo'], h: 55, views: 7300, sponsored: true },
  { cat: 'c_esteri', author: 'u_editor', kicker: 'Mondo', title: 'Vertice sul clima, accordo al ribasso: «Un passo avanti, ma non basta»', subtitle: 'Le delegazioni lasciano il tavolo dopo una notte di trattative', tags: ['Ambiente'], h: 60, views: 6100 },
  { cat: 'c_spettacolo', author: 'u_contrib', kicker: 'Musica', title: 'Il tour estivo parte dallo Stadio Olimpico: scaletta, orari e come arrivare', subtitle: 'Sessantamila biglietti venduti in due ore', tags: ['Musica'], h: 70, views: 10200 },
  { cat: 'c_politica', author: 'u_editor', kicker: 'Parlamento', title: 'Riforma della giustizia, il testo in Aula: i nodi ancora aperti', subtitle: 'Separazione delle carriere e sorteggio del Csm', tags: ['Giustizia', 'Governo'], h: 80, views: 5800 },
  { cat: 'c_cronaca', author: 'u_author1', kicker: 'Bozza', title: 'Inchiesta sui rifiuti: cosa emerge dai documenti', subtitle: 'Un anno di lavoro sui dati delle discariche', tags: ['Ambiente'], h: 0.5, views: 0, status: 'draft' },
  { cat: 'c_sport', author: 'u_contrib', kicker: 'Revisione', title: 'Calciomercato, le trattative dell\'ultima ora', subtitle: 'Tutti i nomi caldi', tags: ['Serie A'], h: 1.5, views: 0, status: 'review' },
  { cat: 'c_economia', author: 'u_author1', kicker: 'Programmato', title: 'Bonus casa 2027: la guida completa alle detrazioni', subtitle: 'Tutte le percentuali e le scadenze', tags: ['Bonus'], h: -24, views: 0, status: 'scheduled' },
];

const articles: Article[] = seeds.map((s, i) => {
  const slug = slugify(s.title);
  const status = s.status ?? 'published';
  const publishedAt = status === 'published' ? hoursAgo(s.h) : null;
  const scheduledAt = status === 'scheduled' ? hoursAgo(s.h) : null;
  const catName = categories.find((c) => c.id === s.cat)!.name;
  const format = s.format ?? 'standard';
  return {
    id: `a_${i + 1}`,
    slug,
    kicker: s.kicker,
    title: s.title,
    subtitle: s.subtitle,
    excerpt: s.subtitle + '. Tutti gli aggiornamenti e gli approfondimenti sulla vicenda nella pagina dedicata di ASTER News.',
    content: body(s.title, catName),
    coverImage: img(slug.slice(0, 20)),
    coverCaption: 'Foto di repertorio',
    categoryId: s.cat,
    tagIds: s.tags.map(T),
    authorId: s.author,
    status,
    format,
    videoUrl: format === 'video' ? 'https://www.youtube.com/embed/dQw4w9WgXcQ' : '',
    gallery: format === 'gallery' ? [1, 2, 3, 4, 5, 6].map((n) => img(`${slug.slice(0, 10)}-${n}`, 1200, 800)) : [],
    liveUpdates: format === 'live' ? [
      { id: 'lu1', time: hoursAgo(0, 12), title: 'Riaperta la linea A', body: 'Atac comunica la ripresa del servizio sulla linea A dopo l\'allagamento della stazione Termini.' },
      { id: 'lu2', time: hoursAgo(0, 40), title: 'Scuole chiuse anche domani', body: 'Il sindaco ha firmato l\'ordinanza: scuole di ogni ordine e grado chiuse nella giornata di domani.' },
      { id: 'lu3', time: hoursAgo(1, 5), title: 'Vigili del fuoco: oltre 300 interventi', body: 'Alberi caduti, cantine allagate e semafori fuori uso: la sala operativa parla di una notte difficile.' },
    ] : [],
    liveActive: format === 'live',
    featured: !!s.featured,
    breaking: !!s.breaking,
    sponsored: !!s.sponsored,
    allowComments: true,
    seo: { title: s.title, description: s.subtitle, canonical: '', noIndex: false },
    views: s.views,
    publishedAt,
    scheduledAt,
    createdAt: hoursAgo(Math.max(s.h, 0) + 2),
    updatedAt: hoursAgo(Math.max(s.h, 0)),
  };
});

const comments: Comment[] = [
  { id: 'cm1', articleId: 'a_1', authorName: 'Paolo R.', email: 'paolo@example.com', body: 'Anche a Prati è tutto allagato, non si passa.', status: 'approved', createdAt: hoursAgo(0, 30) },
  { id: 'cm2', articleId: 'a_1', authorName: 'Francesca', email: 'fra@example.com', body: 'Grazie per gli aggiornamenti in tempo reale!', status: 'approved', createdAt: hoursAgo(0, 50) },
  { id: 'cm3', articleId: 'a_1', authorName: 'Anonimo', email: 'x@example.com', body: 'Compra follower qui www.spam.example', status: 'spam', createdAt: hoursAgo(1) },
  { id: 'cm4', articleId: 'a_2', authorName: 'Giorgio', email: 'g@example.com', body: 'Vedremo se le coperture reggono davvero.', status: 'pending', createdAt: hoursAgo(1, 20) },
  { id: 'cm5', articleId: 'a_3', authorName: 'Tifoso81', email: 't@example.com', body: 'Il VAR doveva intervenire sul secondo gol.', status: 'pending', createdAt: hoursAgo(2) },
  { id: 'cm6', articleId: 'a_6', authorName: 'Maria', email: 'm@example.com', body: 'Finalmente! Era ora.', status: 'approved', createdAt: hoursAgo(5) },
  { id: 'cm7', articleId: 'a_14', authorName: 'Carlo', email: 'c@example.com', body: 'E chi non può permettersi un\'auto nuova?', status: 'pending', createdAt: hoursAgo(20) },
];

const media: MediaItem[] = articles.slice(0, 12).map((a, i) => ({
  id: `m_${i + 1}`,
  name: `${a.slug.slice(0, 30)}.jpg`,
  url: a.coverImage,
  alt: a.title,
  type: 'image' as const,
  size: 240000 + i * 13000,
  uploadedBy: a.authorId,
  createdAt: a.createdAt,
}));

export function buildSeed(): Database {
  return {
    version: 1,
    categories,
    tags,
    users,
    articles,
    comments,
    media,
    subscribers: [{ id: 's1', email: 'lettore@example.com', createdAt: hoursAgo(48) }],
    settings: {
      siteName: 'ASTER News',
      tagline: 'Le notizie, in tempo reale',
      description: 'ASTER News è il quotidiano online con cronaca, politica, economia, sport e spettacolo. Aggiornamenti 24 ore su 24.',
      ticker: [
        'Maltempo, allerta arancione prorogata a domani',
        'Manovra approvata dal Cdm: taglio del cuneo confermato',
        'Metro C: inaugurata la stazione Colosseo',
        'Inflazione in calo all\'1,4%',
      ],
      tickerEnabled: true,
      homeSections: ['c_cronaca', 'c_politica', 'c_roma', 'c_economia', 'c_sport', 'c_spettacolo', 'c_tecnologia'],
      articlesPerPage: 12,
      socials: { facebook: 'https://facebook.com', instagram: 'https://instagram.com', x: 'https://x.com', youtube: 'https://youtube.com', telegram: 'https://t.me' },
      footerText: 'ASTER News è una testata giornalistica registrata. Direttore responsabile: Giulia Ferrante.',
      commentsModeration: true,
    },
    activity: [
      { id: 'ac1', userId: 'u_editor', action: 'ha pubblicato', target: articles[0].title, createdAt: hoursAgo(1) },
      { id: 'ac2', userId: 'u_author1', action: 'ha creato la bozza', target: articles[25].title, createdAt: hoursAgo(0, 30) },
      { id: 'ac3', userId: 'u_contrib', action: 'ha inviato in revisione', target: articles[26].title, createdAt: hoursAgo(1, 30) },
    ],
  };
}
