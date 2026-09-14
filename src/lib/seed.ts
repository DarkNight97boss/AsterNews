import { Article, Category, Comment, Database, Event, MediaItem, Report, Tag, User, Zone } from './models';
import { dayOffset, hoursAgo, img, slugify } from './utils';

const categories: Category[] = [
  { id: 'c_attualita', slug: 'attualita', name: 'Attualità', kind: 'standard', color: '#d7262d', description: 'I fatti del giorno in Italia.', order: 1, showInMenu: true, showOnHome: true },
  { id: 'c_politica', slug: 'politica', name: 'Politica', kind: 'standard', color: '#1e3a8a', description: 'Governo, Parlamento, partiti e istituzioni.', order: 2, showInMenu: true, showOnHome: true },
  { id: 'c_economia', slug: 'economia', name: 'Economia e soldi', kind: 'standard', color: '#0b7a4b', description: 'Lavoro, fisco, bonus, prezzi e risparmio.', order: 3, showInMenu: true, showOnHome: true },
  { id: 'c_mondo', slug: 'mondo', name: 'Le notizie dal mondo', kind: 'standard', color: '#455a64', description: 'Esteri, Europa e geopolitica.', order: 4, showInMenu: true, showOnHome: true },
  { id: 'c_citta', slug: 'citta', name: 'Dalle città', kind: 'local', color: '#8a1c7c', description: 'Le storie dai territori raccontate dalle redazioni locali.', order: 5, showInMenu: true, showOnHome: false },
  { id: 'c_sport', slug: 'sport', name: 'Sport', kind: 'standard', color: '#e67e00', description: 'Calcio, tennis, motori e tutte le discipline.', order: 6, showInMenu: true, showOnHome: true },
  { id: 'c_life', slug: 'life', name: 'Life', kind: 'standard', color: '#00897b', description: 'Salute, benessere, casa, viaggi e stili di vita.', order: 7, showInMenu: true, showOnHome: true },
  { id: 'c_vision', slug: 'vision', name: 'Vision', kind: 'standard', color: '#c2185b', description: 'Cinema, serie tv, musica, libri e cultura pop.', order: 8, showInMenu: true, showOnHome: true },
  { id: 'c_opinioni', slug: 'opinioni', name: 'Opinioni', kind: 'opinion', color: '#1e3a8a', description: 'Editoriali, commenti e analisi delle firme di ASTER News.', order: 9, showInMenu: true, showOnHome: false },
  { id: 'c_dossier', slug: 'dossier', name: 'Dossier', kind: 'dossier', color: '#111111', description: 'Inchieste, approfondimenti e guide per capire meglio.', order: 10, showInMenu: true, showOnHome: false },
];

const tagNames = ['Governo Meloni', 'Elezioni', 'Manovra', 'Campo largo', 'Maltempo', 'Trasporti', 'Serie A', 'Champions League', 'Intelligenza artificiale', 'Smartphone', 'Inflazione', 'Lavoro', 'Sanità', 'Scuola', 'Cinema', 'Musica', 'Televisione', 'Ambiente', 'Giustizia', 'Europa', 'Bonus', 'Vaccini', 'Startup', 'Turismo', 'Ucraina', 'Migranti', 'Carburanti', 'Casa'];
const tags: Tag[] = tagNames.map((n) => ({ id: 't_' + slugify(n), slug: slugify(n), name: n }));
const T = (n: string) => 't_' + slugify(n);

const users: User[] = [
  { id: 'u_admin', name: 'Giulia Ferrante', email: 'admin@asternews.it', role: 'admin', avatar: img('giulia', 200, 200), bio: 'Direttrice responsabile di ASTER News. Scrive di politica e istituzioni.', active: true, createdAt: hoursAgo(24 * 400) },
  { id: 'u_editor', name: 'Marco Vitali', email: 'editor@asternews.it', role: 'editor', avatar: img('marco', 200, 200), bio: 'Caporedattore centrale, coordina attualità e cronaca.', active: true, createdAt: hoursAgo(24 * 380) },
  { id: 'u_author1', name: 'Sara Conti', email: 'sara@asternews.it', role: 'author', avatar: img('sara', 200, 200), bio: 'Giornalista. Segue economia, lavoro e consumi.', active: true, createdAt: hoursAgo(24 * 300) },
  { id: 'u_author2', name: 'Luca Moretti', email: 'luca@asternews.it', role: 'author', avatar: img('luca', 200, 200), bio: 'Inviato sportivo, racconta il calcio dal campo.', active: true, createdAt: hoursAgo(24 * 250) },
  { id: 'u_author3', name: 'Elena Russo', email: 'elena@asternews.it', role: 'author', avatar: img('elena', 200, 200), bio: 'Giornalista. Tecnologia, scienza e cultura digitale.', active: true, createdAt: hoursAgo(24 * 200) },
  { id: 'u_contrib', name: 'Davide Greco', email: 'davide@asternews.it', role: 'contributor', avatar: img('davide', 200, 200), bio: 'Critico cinematografico e collaboratore per Vision.', active: true, createdAt: hoursAgo(24 * 90) },
];

const zoneNames: [string, Zone['kind']][] = [
  ['Centro Storico', 'zona'], ['Esquilino', 'zona'], ['Prati', 'zona'], ['Trastevere', 'zona'], ['Testaccio', 'zona'], ['Eur', 'zona'], ['Ostia', 'zona'], ['San Lorenzo', 'zona'], ['Pigneto', 'zona'], ['Monteverde', 'zona'], ['Garbatella', 'zona'], ['Tuscolano', 'zona'], ['Parioli', 'zona'], ['Flaminio', 'zona'], ['Vigna Clara', 'zona'], ['Tor di Quinto', 'zona'], ['Appio Latino', 'zona'], ['Torpignattara', 'zona'], ['Tor Bella Monaca', 'zona'], ['Aurelio', 'zona'], ['Africano', 'zona'], ['Acilia', 'zona'],
  ['Albano Laziale', 'comune'], ['Anzio', 'comune'], ['Ciampino', 'comune'], ['Fiumicino', 'comune'], ['Frascati', 'comune'], ['Tivoli', 'comune'], ['Pomezia', 'comune'], ['Monterotondo', 'comune'], ['Rieti', 'comune'], ['Frosinone', 'comune'], ['Ladispoli', 'comune'], ['Velletri', 'comune'],
];
const zones: Zone[] = zoneNames.map(([name, kind]) => ({ id: 'z_' + slugify(name), slug: slugify(name), name, kind }));
const Z = (n: string) => 'z_' + slugify(n);

interface Seed {
  cat: string; author: string; kicker: string; title: string; subtitle: string; tags: string[]; zone?: string; address?: string;
  h: number; views: number; featured?: boolean; breaking?: boolean; format?: Article['format']; status?: Article['status']; sponsored?: boolean;
}

const body = (t: string, cat: string) => `
<p>${t.split(':')[0]}. La notizia è arrivata nelle prime ore della mattinata ed è stata confermata da fonti qualificate contattate dalla redazione di ASTER News. Le informazioni raccolte finora delineano un quadro ancora in evoluzione, sul quale sono attesi ulteriori aggiornamenti nelle prossime ore.</p>
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
<p>Nelle prossime ore sono attesi nuovi sviluppi. La redazione continuerà a seguire la vicenda con aggiornamenti su questa pagina e sui canali social di ASTER News. Per approfondire, consulta gli articoli correlati.</p>
`;

const seeds: Seed[] = [
  { cat: 'c_attualita', author: 'u_editor', kicker: 'Start, la rassegna', title: 'Il maltempo sulla Capitale, la manovra al voto, il derby e le altre notizie da sapere per iniziare la giornata', subtitle: 'Start, la rassegna stampa di ASTER News: le notizie del giorno in cinque minuti', tags: ['Maltempo', 'Manovra'], h: 1, views: 48210, featured: true },
  { cat: 'c_politica', author: 'u_admin', kicker: 'Clima teso', title: 'Manovra, via libera del Consiglio dei ministri: taglio del cuneo e bonus famiglie. Opposizioni: «Coperture incerte»', subtitle: 'Il testo passa ora al Parlamento. Il ministro: «Nessuna nuova tassa». La segretaria dem: «È una manovra di annunci»', tags: ['Governo Meloni', 'Manovra', 'Bonus'], h: 2, views: 31200, featured: true },
  { cat: 'c_mondo', author: 'u_editor', kicker: "L'esito delle urne", title: "Elezioni in Svezia, l'estrema destra perde voti ma è stallo sul governo", subtitle: 'Nessuna maggioranza chiara dopo lo spoglio. Trattative lunghe per il nuovo esecutivo', tags: ['Europa', 'Elezioni'], h: 3, views: 21800, featured: true },
  { cat: 'c_attualita', author: 'u_editor', kicker: 'Maltempo', title: 'Nubifragio sulla Capitale: allagamenti, metro chiusa e scuole evacuate', subtitle: 'Allerta arancione prorogata fino a domani. Il Campidoglio: «Restate a casa se potete»', tags: ['Maltempo', 'Trasporti'], zone: 'Esquilino', address: 'Piazza dei Cinquecento', h: 1.5, views: 44100, breaking: true, format: 'live' },
  { cat: 'c_citta', author: 'u_editor', kicker: 'Rieti', zone: 'Rieti', address: 'Strada provinciale 46', title: 'Masso travolge le auto del corteo funebre: donna muore mentre va al funerale della madre', subtitle: 'La frana sulla strada provinciale. Indagini della procura', tags: [], h: 4, views: 19500 },
  { cat: 'c_citta', author: 'u_editor', kicker: 'Rimini', title: 'Ragazzina di 17 anni torna in albergo in stato confusionale: aperta un\'inchiesta', subtitle: 'I carabinieri hanno acquisito le immagini delle telecamere del lungomare', tags: ['Giustizia'], h: 6, views: 15400 },
  { cat: 'c_citta', author: 'u_author1', kicker: 'Frosinone', zone: 'Frosinone', address: 'Via Aldo Moro', title: 'Dimentica le chiavi di casa e prova a entrare dalla finestra: donna cade e muore', subtitle: 'La tragedia in un palazzo del centro. Inutili i soccorsi', tags: [], h: 8, views: 12100 },
  { cat: 'c_citta', author: 'u_editor', kicker: 'Matera', title: 'Spara ai cinghiali ma colpisce in testa il fratello e lo uccide', subtitle: 'Battuta di caccia finita in tragedia. L\'uomo è indagato per omicidio colposo', tags: ['Giustizia'], h: 10, views: 17600 },
  { cat: 'c_economia', author: 'u_author1', kicker: 'Il peso delle scelte', title: 'Carburanti verso i 2,5 euro al litro: il costo "invisibile" delle raffinerie chiuse', subtitle: 'Perché il prezzo alla pompa sale anche quando il petrolio scende', tags: ['Carburanti', 'Inflazione'], h: 5, views: 26700 },
  { cat: 'c_economia', author: 'u_author1', kicker: 'Prezzi', title: 'Inflazione in calo all\'1,4%: cosa cambia per spesa, mutui e bollette', subtitle: 'Il dato Istat sotto le attese. Ma il carrello della spesa resta caro', tags: ['Inflazione'], h: 9, views: 19500 },
  { cat: 'c_economia', author: 'u_author1', kicker: 'Lavoro', title: 'Smart working, nuove regole dal 1° gennaio: cosa devono sapere dipendenti e aziende', subtitle: 'Accordi individuali, diritto alla disconnessione e buoni pasto', tags: ['Lavoro'], h: 15, views: 14300 },
  { cat: 'c_economia', author: 'u_author1', kicker: 'Verso la legge di bilancio', title: 'Flat tax al 5% per gli aumenti di stipendio dei giovani lavoratori: l\'idea per l\'"ultima" manovra', subtitle: 'La misura costerebbe 400 milioni. Il nodo delle coperture', tags: ['Manovra', 'Lavoro'], h: 20, views: 9800 },
  { cat: 'c_politica', author: 'u_admin', kicker: 'Il dibattito', title: '"Il piano scuola è illegale, al massimo qualche aggiustamento". Disabili e immigrati, parla il capo dei presidi', subtitle: 'Il presidente dell\'associazione nazionale: «Educare alla solidarietà non è una scelta»', tags: ['Scuola'], h: 12, views: 8900 },
  { cat: 'c_politica', author: 'u_admin', kicker: 'Elezioni', title: 'Regionali, i sondaggi a un mese dal voto: testa a testa nelle grandi città', subtitle: 'Affluenza attesa in calo. I candidati puntano su sanità e trasporti', tags: ['Elezioni', 'Campo largo'], h: 26, views: 7300 },
  { cat: 'c_politica', author: 'u_admin', kicker: 'Parlamento', title: 'Riforma della giustizia, il testo in Aula: i nodi ancora aperti', subtitle: 'Separazione delle carriere e sorteggio del Csm', tags: ['Giustizia', 'Governo Meloni'], h: 40, views: 5800 },
  { cat: 'c_mondo', author: 'u_editor', kicker: 'Europa', title: 'Bruxelles approva il nuovo patto sui migranti: cosa prevede e chi lo contesta', subtitle: 'Il voto finale dopo tre anni di negoziati', tags: ['Europa', 'Migranti'], h: 14, views: 9100 },
  { cat: 'c_mondo', author: 'u_editor', kicker: 'Guerra in Ucraina', title: 'Kiev, notte di raid sulla capitale: colpite le infrastrutture energetiche', subtitle: 'Blackout in tre regioni. L\'Europa annuncia nuovi aiuti', tags: ['Ucraina'], h: 7, views: 13400 },
  { cat: 'c_mondo', author: 'u_editor', kicker: 'Clima', title: 'Vertice sul clima, accordo al ribasso: «Un passo avanti, ma non basta»', subtitle: 'Le delegazioni lasciano il tavolo dopo una notte di trattative', tags: ['Ambiente'], h: 30, views: 6100 },
  { cat: 'c_sport', author: 'u_author2', kicker: 'Serie A', title: 'Il derby finisce 2-2: rimonta nel recupero e polemiche sul Var', subtitle: 'Due gol negli ultimi cinque minuti. L\'allenatore: «Così non si può giocare»', tags: ['Serie A'], h: 11, views: 27800 },
  { cat: 'c_sport', author: 'u_author2', kicker: 'Champions', title: 'Notte di Champions: le italiane in campo, dove vederle e le probabili formazioni', subtitle: 'Tre squadre a caccia dei quarti', tags: ['Champions League'], h: 17, views: 11000 },
  { cat: 'c_sport', author: 'u_author2', kicker: 'Tennis', title: 'Finale da sogno: l\'azzurro vola in finale dopo cinque set', subtitle: 'Una maratona di quattro ore e mezza', tags: [], h: 45, views: 16800, format: 'video' },
  { cat: 'c_life', author: 'u_author3', kicker: 'Sanità', title: 'Liste d\'attesa, il nuovo piano: visite entro 30 giorni o rimborso', subtitle: 'Arriva la piattaforma unica per le prenotazioni. Le Regioni frenano', tags: ['Sanità'], h: 13, views: 12100 },
  { cat: 'c_life', author: 'u_author3', kicker: 'Prevenzione', title: 'Influenza, al via la campagna vaccinale: chi ha diritto alla dose gratuita', subtitle: 'Prenotazioni in farmacia e dal medico di base', tags: ['Vaccini', 'Sanità'], h: 22, views: 8200 },
  { cat: 'c_life', author: 'u_author3', kicker: 'Casa', title: 'Bonus ristrutturazioni 2027: la guida completa alle detrazioni', subtitle: 'Tutte le percentuali e le scadenze', tags: ['Bonus', 'Casa'], h: 36, views: 9900 },
  { cat: 'c_vision', author: 'u_contrib', kicker: 'Cinema', title: 'Com\'è "La casa sul fiume", vincitore a Venezia (e unico film diretto da una donna in gara)', subtitle: 'Standing ovation di dieci minuti alla prima. In sala dal prossimo giovedì', tags: ['Cinema'], h: 4.5, views: 9800, format: 'gallery' },
  { cat: 'c_vision', author: 'u_contrib', kicker: 'Tv', title: 'Ascolti tv, la fiction batte il reality: i dati della serata', subtitle: 'Oltre 5 milioni di spettatori per la prima puntata', tags: ['Televisione'], h: 18, views: 6700 },
  { cat: 'c_vision', author: 'u_contrib', kicker: 'Musica', zone: 'Flaminio', address: 'Viale dei Gladiatori, 2', title: 'Il tour estivo parte dallo Stadio Olimpico: scaletta, orari e come arrivare', subtitle: 'Sessantamila biglietti venduti in due ore', tags: ['Musica'], h: 50, views: 10200 },
  { cat: 'c_opinioni', author: 'u_author3', kicker: 'Il commento', title: 'Quando la pseudoscienza trova spazio sui grandi giornali', subtitle: 'Iridologia, digiuno-terapia e altre pratiche senza basi scientifiche presentate come cure: perché è un problema', tags: ['Sanità'], h: 3.5, views: 7200 },
  { cat: 'c_opinioni', author: 'u_admin', kicker: 'L\'editoriale', title: 'La manovra dei bonus e il coraggio che manca', subtitle: 'Distribuire piccoli incentivi non è una politica economica. Serve una visione sul lavoro e sui salari', tags: ['Manovra'], h: 5.5, views: 6400 },
  { cat: 'c_opinioni', author: 'u_contrib', kicker: 'Il punto', title: 'Perché senza le periferie non esisterebbe il cinema italiano', subtitle: 'Dai quartieri popolari ai festival: una storia che ricomincia ogni volta', tags: ['Cinema'], h: 28, views: 3100 },
  { cat: 'c_dossier', author: 'u_author1', kicker: 'Spesa consapevole', title: 'Quando comprare il pesce per risparmiare: i giorni migliori e quelli da evitare', subtitle: 'Dalla freschezza del pescato alle offerte, cosa sapere su stagionalità, prezzi e promozioni. E un calendario di stagione con le specie da scegliere ogni mese', tags: ['Inflazione'], h: 6.5, views: 18800, featured: true },
  { cat: 'c_dossier', author: 'u_author3', kicker: 'I documenti esclusivi', title: 'I cavi del Ponte "galoppano", ma mancano calcoli e progetti: bisogna ricominciare da capo', subtitle: 'Il carteggio dei tecnici del ministero con la società: cosa dicono le carte', tags: ['Trasporti'], h: 24, views: 14100 },
  { cat: 'c_dossier', author: 'u_editor', kicker: 'C\'era una volta', title: 'Il quartiere che ha resistito al cemento: storia di una battaglia lunga trent\'anni', subtitle: 'Dal comitato di quartiere al parco pubblico: come una comunità ha cambiato il destino di un pezzo di città', tags: ['Ambiente'], h: 60, views: 5400 },
  { cat: 'c_attualita', author: 'u_editor', kicker: 'Giustizia', zone: 'Eur', address: 'Viale Europa', title: 'Maxi operazione contro le frodi sui bonus edilizi: 40 arresti in tutta Italia', subtitle: 'Sequestrati beni per 120 milioni. Coinvolte imprese e professionisti', tags: ['Giustizia', 'Bonus'], h: 16, views: 17600 },
  { cat: 'c_attualita', author: 'u_author3', kicker: 'Sicurezza', zone: 'Prati', title: 'Truffa del finto corriere via sms: come riconoscerla e cosa fare', subtitle: 'Migliaia di segnalazioni in una settimana', tags: ['Smartphone'], h: 33, views: 21000 },
  { cat: 'c_attualita', author: 'u_author3', kicker: 'Scuola', title: 'Intelligenza artificiale in classe: parte la sperimentazione in 500 istituti', subtitle: 'Tutor digitali per studenti e docenti. Il Ministero: «Nessuna sostituzione degli insegnanti»', tags: ['Intelligenza artificiale', 'Scuola'], h: 19, views: 15400 },
  { cat: 'c_life', author: 'u_author1', kicker: 'Weekend', zone: 'Centro Storico', title: 'Dieci cose da fare nel fine settimana tra mostre, concerti e mercatini', subtitle: 'La guida della redazione agli eventi', tags: ['Turismo'], h: 55, views: 7300, sponsored: true },
  { cat: 'c_attualita', author: 'u_author1', kicker: 'Bozza', title: 'Inchiesta sui rifiuti: cosa emerge dai documenti', subtitle: 'Un anno di lavoro sui dati delle discariche', tags: ['Ambiente'], h: 0.5, views: 0, status: 'draft' },
  { cat: 'c_sport', author: 'u_contrib', kicker: 'Revisione', title: 'Calciomercato, le trattative dell\'ultima ora', subtitle: 'Tutti i nomi caldi', tags: ['Serie A'], h: 1.5, views: 0, status: 'review' },
  { cat: 'c_economia', author: 'u_author1', kicker: 'Programmato', title: 'Pensioni 2027: le novità in arrivo', subtitle: 'Tutte le finestre di uscita', tags: ['Lavoro'], h: -24, views: 0, status: 'scheduled' },
];

const articles: Article[] = seeds.map((s, i) => {
  const slug = slugify(s.title).slice(0, 80).replace(/-$/, '');
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
    excerpt: s.subtitle,
    content: body(s.title, catName),
    coverImage: img(slug.slice(0, 20)),
    coverCaption: 'Foto di repertorio',
    categoryId: s.cat,
    tagIds: s.tags.map(T),
    authorId: s.author,
    zoneId: s.zone ? Z(s.zone) : '',
    address: s.address ?? '',
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
  { id: 'cm1', articleId: 'a_4', authorName: 'Paolo R.', email: 'paolo@example.com', body: 'Anche a Prati è tutto allagato, non si passa.', status: 'approved', createdAt: hoursAgo(0, 30) },
  { id: 'cm2', articleId: 'a_4', authorName: 'Francesca', email: 'fra@example.com', body: 'Grazie per gli aggiornamenti in tempo reale!', status: 'approved', createdAt: hoursAgo(0, 50) },
  { id: 'cm3', articleId: 'a_4', authorName: 'Anonimo', email: 'x@example.com', body: 'Compra follower qui www.spam.example', status: 'spam', createdAt: hoursAgo(1) },
  { id: 'cm4', articleId: 'a_2', authorName: 'Giorgio', email: 'g@example.com', body: 'Vedremo se le coperture reggono davvero.', status: 'pending', createdAt: hoursAgo(1, 20) },
  { id: 'cm5', articleId: 'a_19', authorName: 'Tifoso81', email: 't@example.com', body: 'Il Var doveva intervenire sul secondo gol.', status: 'pending', createdAt: hoursAgo(2) },
  { id: 'cm6', articleId: 'a_9', authorName: 'Maria', email: 'm@example.com', body: 'E chi fa 60 km al giorno per lavorare?', status: 'approved', createdAt: hoursAgo(5) },
  { id: 'cm7', articleId: 'a_28', authorName: 'Carlo', email: 'c@example.com', body: 'Finalmente qualcuno lo dice.', status: 'pending', createdAt: hoursAgo(20) },
];

const media: MediaItem[] = articles.slice(0, 12).map((a, i) => ({
  id: `m_${i + 1}`, name: `${a.slug.slice(0, 30)}.jpg`, url: a.coverImage, alt: a.title, type: 'image' as const, size: 240000 + i * 13000, uploadedBy: a.authorId, createdAt: a.createdAt,
}));

const ev = (i: number, e: Partial<Event> & Pick<Event, 'title' | 'type' | 'dateFrom' | 'place'>): Event => ({
  id: `e_${i}`, slug: slugify(e.title), description: `<p>${e.title}. Un appuntamento da non perdere: tutte le informazioni su orari, biglietti e come arrivare. L'evento è organizzato con il patrocinio del Municipio e prevede attività per tutte le età.</p><p>Per informazioni e prenotazioni consultare il sito dell'organizzatore.</p>`,
  dateTo: null, timeInfo: 'dalle 18:00', address: '', zoneId: '', price: '15 euro', free: false, image: img('ev' + i, 900, 600), rating: 4, status: 'published', submittedBy: '', createdAt: hoursAgo(24 * (i + 2)), ...e,
});
const events: Event[] = [
  ev(1, { title: 'Il Gruppo Acrobatico di Tangeri al Teatro Brancaccio', type: 'teatro', dateFrom: dayOffset(-10), dateTo: dayOffset(12), place: 'Teatro Brancaccio', address: 'Via Merulana, 244', zoneId: Z('Esquilino'), rating: 5, price: 'da 25 euro', timeInfo: 'ore 21:00' }),
  ev(2, { title: 'Moda in Luce 1955-1975: la mostra sul glamour italiano', type: 'mostre', dateFrom: dayOffset(-30), dateTo: dayOffset(60), place: 'Musei Capitolini', address: 'Piazza del Campidoglio, 1', zoneId: Z('Centro Storico'), rating: 5, price: '12 euro', timeInfo: '9:30-19:30' }),
  ev(3, { title: 'Momento Nordés: il rituale dell\'aperitivo sull\'onda atlantica', type: 'feste', dateFrom: dayOffset(0), dateTo: dayOffset(14), place: 'Location multiple', zoneId: Z('Trastevere'), rating: 4, free: true, price: '', timeInfo: 'dalle 19:00' }),
  ev(4, { title: 'Sagra degli gnocchi a Castelnuovo di Porto', type: 'sagre', dateFrom: dayOffset(5), dateTo: dayOffset(6), place: 'Centro storico di Castelnuovo di Porto', zoneId: Z('Monterotondo'), rating: 3, free: true, price: '', timeInfo: 'dalle 12:00' }),
  ev(5, { title: 'Dinosauri in carne e ossa, la mostra a tema preistorico', type: 'mostre', dateFrom: dayOffset(-60), dateTo: dayOffset(90), place: 'Appia Joy Park', address: 'Via Appia Nuova, 1245', zoneId: Z('Appio Latino'), rating: 4, price: '10 euro', timeInfo: '10:00-20:00' }),
  ev(6, { title: 'Concerto all\'alba sul Tevere', type: 'concerti', dateFrom: dayOffset(1), place: 'Lungotevere degli Anguillara', zoneId: Z('Trastevere'), rating: 4, free: true, price: '', timeInfo: 'ore 6:00' }),
  ev(7, { title: 'Mercatino vintage e artigianato al Pigneto', type: 'altro', dateFrom: dayOffset(2), dateTo: dayOffset(3), place: 'Via del Pigneto', zoneId: Z('Pigneto'), rating: 3, free: true, price: '', timeInfo: '10:00-20:00' }),
  ev(8, { title: 'Cinema sotto le stelle: rassegna a Villa Ada', type: 'cinema', dateFrom: dayOffset(0), dateTo: dayOffset(20), place: 'Villa Ada', address: 'Via di Ponte Salario', zoneId: Z('Parioli'), rating: 4, price: '6 euro', timeInfo: 'ore 21:15' }),
  ev(9, { title: 'Laboratorio di ceramica per bambini', type: 'bambini', dateFrom: dayOffset(6), place: 'Biblioteca Garbatella', address: 'Via Cesare Pascarella, 21', zoneId: Z('Garbatella'), rating: 5, free: true, price: '', timeInfo: '16:00-18:00' }),
  ev(10, { title: 'Maratona di Roma: percorso, strade chiuse e iscrizioni', type: 'sport', dateFrom: dayOffset(20), place: 'Via dei Fori Imperiali', zoneId: Z('Centro Storico'), rating: 5, price: 'iscrizione 60 euro', timeInfo: 'partenza ore 8:30' }),
  ev(11, { title: 'Presentazione del libro "La città invisibile"', type: 'incontri', dateFrom: dayOffset(3), place: 'Libreria Eli', address: 'Viale Somalia, 50', zoneId: Z('Africano'), rating: 3, free: true, price: '', timeInfo: 'ore 18:30' }),
  ev(12, { title: 'Festa della birra artigianale a Frascati', type: 'sagre', dateFrom: dayOffset(9), dateTo: dayOffset(11), place: 'Piazza Marconi', zoneId: Z('Frascati'), rating: 4, free: true, price: '', timeInfo: 'dalle 17:00' }),
  ev(13, { title: 'Concerto di beneficenza al Teatro Brancaccio', type: 'concerti', dateFrom: dayOffset(4), place: 'Teatro Brancaccio', address: 'Via Merulana, 244', zoneId: Z('Esquilino'), rating: 0, price: '20 euro', status: 'pending', submittedBy: 'lettore@example.com', timeInfo: 'ore 21:00' }),
];

const reports: Report[] = [
  { id: 'r1', name: 'Anna B.', email: 'anna@example.com', zoneId: Z('Tuscolano'), subject: 'Buche in via Tuscolana all\'altezza del civico 800', body: 'Da settimane le buche non vengono riparate e diversi motorini sono caduti. Chiediamo un intervento urgente.', image: img('rep1', 900, 600), status: 'published', reply: 'Abbiamo inoltrato la segnalazione al Municipio VII, che ha annunciato i lavori per la prossima settimana.', createdAt: hoursAgo(30) },
  { id: 'r2', name: 'Marco T.', email: 'm@example.com', zoneId: Z('Ostia'), subject: 'Rifiuti abbandonati sul lungomare', body: 'Sacchi di rifiuti accanto ai cassonetti pieni da giorni, zona pontile.', image: img('rep2', 900, 600), status: 'published', reply: '', createdAt: hoursAgo(50) },
  { id: 'r3', name: 'Lucia', email: 'l@example.com', zoneId: Z('Prati'), subject: 'Semaforo spento in piazza Mazzini', body: 'Il semaforo è spento da ieri sera, traffico pericoloso negli orari di punta.', image: '', status: 'new', reply: '', createdAt: hoursAgo(3) },
  { id: 'r4', name: 'Giovanni R.', email: 'g@example.com', zoneId: Z('San Lorenzo'), subject: 'Lampioni spenti in via dei Sabelli', body: 'Tutta la strada è al buio da una settimana.', image: '', status: 'progress', reply: '', createdAt: hoursAgo(20) },
];

export function buildSeed(): Database {
  return {
    version: 4,
    zones, events, reports,
    categories, tags, users, articles, comments, media,
    subscribers: [{ id: 's1', email: 'lettore@example.com', createdAt: hoursAgo(48) }],
    settings: {
      theme: { preset: 'today' },
      siteName: 'ASTER News',
      tagline: 'Ultime notizie dall\'Italia e dal mondo',
      description: 'ASTER News è il quotidiano online con attualità, politica, economia, sport, life e vision. Le notizie dall\'Italia e dal mondo, aggiornate 24 ore su 24.',
      ticker: ['Maltempo, allerta arancione prorogata a domani', 'Manovra approvata dal Cdm: taglio del cuneo confermato', 'Inflazione in calo all\'1,4%'],
      tickerEnabled: true,
      homeSections: ['c_attualita', 'c_politica', 'c_mondo', 'c_economia', 'c_sport', 'c_life', 'c_vision'],
      articlesPerPage: 12,
      subscribeUrl: '',
      weatherCity: 'Roma',
      weatherLat: 41.9028,
      weatherLon: 12.4964,
      googleNewsUrl: 'https://news.google.com/',
      socials: { facebook: 'https://facebook.com', instagram: 'https://instagram.com', x: 'https://x.com', youtube: 'https://youtube.com', telegram: 'https://t.me' },
      footerText: 'ASTER News è una testata giornalistica registrata. Direttore responsabile: Giulia Ferrante.',
      commentsModeration: true,
    },
    activity: [
      { id: 'ac1', userId: 'u_editor', action: 'ha pubblicato', target: articles[0].title, createdAt: hoursAgo(1) },
      { id: 'ac2', userId: 'u_author1', action: 'ha creato la bozza', target: articles[37].title, createdAt: hoursAgo(0, 30) },
      { id: 'ac3', userId: 'u_contrib', action: 'ha inviato in revisione', target: articles[38].title, createdAt: hoursAgo(1, 30) },
    ],
  };
}
