import type { Permission } from './permissions';

/**
 * Menu della redazione come dati: così il CMS può cambiare forma.
 * - `profiles`: in quali profili d'uso la voce è in primo piano (le altre finiscono in «Altro», mai nascoste del tutto);
 * - `team`: serve solo se c'è più di una persona (modalità solista le mette in «Altro»);
 * - `core`: non viene mai spostata, nemmeno se non la usi.
 */
export type SiteProfile = 'quotidiano' | 'rivista' | 'blog' | 'diario' | 'newsletter' | 'portfolio';
export interface NavItem { href: string; label: string; icon: string; group: 'Contenuti' | 'Territorio' | 'Community' | 'Sistema' | 'Account'; perm?: Permission; editorOnly?: boolean; team?: boolean; core?: boolean; profiles: SiteProfile[] | 'all'; pill?: 'review' | 'comments' | 'events' | 'reports'; noun?: 'articles' }
const NEWS: SiteProfile[] = ['quotidiano', 'rivista']; const PUB: SiteProfile[] = ['quotidiano', 'rivista', 'blog', 'newsletter', 'portfolio']; const PERSONAL: SiteProfile[] = ['blog', 'diario', 'portfolio', 'newsletter'];
export const NAV: NavItem[] = [
  { href: '/admin/articoli', label: 'Articoli', icon: '✎', group: 'Contenuti', core: true, profiles: 'all', pill: 'review', noun: 'articles' },
  { href: '/admin/scrivi', label: 'Scrivi', icon: '✨', group: 'Contenuti', core: true, profiles: 'all' },
  { href: '/admin/articoli/nuovo', label: 'Editor completo', icon: '＋', group: 'Contenuti', profiles: ['quotidiano', 'rivista', 'blog', 'portfolio'] },
  { href: '/admin/calendario', label: 'Calendario', icon: '🗓', group: 'Contenuti', profiles: ['quotidiano', 'rivista', 'newsletter'] },
  { href: '/admin/scaletta', label: 'Scaletta del giorno', icon: '📋', group: 'Contenuti', team: true, profiles: NEWS },
  { href: '/admin/personale', label: 'Sito personale', icon: '🪴', group: 'Contenuti', profiles: ['blog', 'diario', 'portfolio', 'newsletter'] },
  { href: '/admin/officina', label: 'Officina', icon: '🛠️', group: 'Contenuti', profiles: ['quotidiano', 'rivista', 'blog', 'diario', 'newsletter', 'portfolio'] },
  { href: '/admin/contatti', label: 'Rubrica contatti', icon: '📇', group: 'Contenuti', profiles: NEWS },
  { href: '/admin/statistiche', label: 'Statistiche', icon: '📈', group: 'Contenuti', perm: 'stats.view', profiles: PUB },
  { href: '/admin/categorie', label: 'Categorie', icon: '☰', group: 'Contenuti', perm: 'category.manage', profiles: 'all' },
  { href: '/admin/tag', label: 'Tag', icon: '#', group: 'Contenuti', perm: 'tag.manage', profiles: 'all' },
  { href: '/admin/media', label: 'Media', icon: '▣', group: 'Contenuti', core: true, profiles: 'all' },
  { href: '/admin/mobile', label: 'Invia dal telefono', icon: '📱', group: 'Contenuti', profiles: ['quotidiano', 'diario', 'blog'] },
  { href: '/admin/pagine', label: 'Pagine', icon: '📄', group: 'Contenuti', editorOnly: true, profiles: 'all' },
  { href: '/admin/blocchi', label: 'Blocchi riutilizzabili', icon: '♻️', group: 'Contenuti', editorOnly: true, profiles: NEWS },
  { href: '/admin/eventi', label: 'Eventi', icon: '📅', group: 'Territorio', perm: 'article.publish', profiles: ['quotidiano'], pill: 'events' },
  { href: '/admin/zone', label: 'Zone', icon: '📍', group: 'Territorio', perm: 'category.manage', profiles: ['quotidiano'] },
  { href: '/admin/redazione', label: 'Desk e flussi', icon: '🗂', group: 'Territorio', perm: 'article.publish', team: true, profiles: NEWS },
  { href: '/admin/comunita', label: 'Comunità', icon: '🏘️', group: 'Community', perm: 'comment.moderate', profiles: ['quotidiano'] },
  { href: '/admin/partecipazione', label: 'Partecipazione', icon: '🙌', group: 'Community', perm: 'comment.moderate', profiles: ['quotidiano', 'rivista', 'newsletter'] },
  { href: '/admin/percorsi', label: 'Percorsi di lettura', icon: '🧭', group: 'Contenuti', perm: 'article.publish', profiles: ['quotidiano', 'rivista'] },
  { href: '/admin/fiducia', label: 'Fiducia', icon: '🤝', group: 'Community', profiles: ['quotidiano', 'rivista', 'newsletter'] },
  { href: '/admin/commenti', label: 'Commenti', icon: '💬', group: 'Community', perm: 'comment.moderate', profiles: PUB, pill: 'comments' },
  { href: '/admin/segnalazioni', label: 'Segnalazioni', icon: '🚧', group: 'Community', perm: 'comment.moderate', profiles: ['quotidiano'], pill: 'reports' },
  { href: '/admin/newsletter', label: 'Newsletter', icon: '✉', group: 'Community', perm: 'comment.moderate', profiles: ['quotidiano', 'rivista', 'blog', 'newsletter'] },
  { href: '/admin/social', label: 'Social', icon: '📣', group: 'Community', perm: 'comment.moderate', profiles: PUB },
  { href: '/admin/annunci', label: 'Annunci e necrologi', icon: '📋', group: 'Community', perm: 'comment.moderate', profiles: ['quotidiano'] },
  { href: '/admin/lettori', label: 'Lettori e abbonati', icon: '🙋', group: 'Community', perm: 'comment.moderate', profiles: 'all' },
  { href: '/admin/utenti', label: 'Utenti e ruoli', icon: '👥', group: 'Sistema', perm: 'user.manage', profiles: NEWS },
  { href: '/admin/impostazioni', label: 'Impostazioni', icon: '⚙', group: 'Sistema', perm: 'settings.manage', core: true, profiles: 'all' },
  { href: '/admin/adatta', label: 'Adatta il CMS', icon: '🪄', group: 'Sistema', perm: 'settings.manage', core: true, profiles: 'all' },
  { href: '/admin/menu', label: 'Menu del sito', icon: '🧭', group: 'Sistema', perm: 'settings.manage', profiles: 'all' },
  { href: '/admin/home', label: 'Builder home', icon: '🏠', group: 'Sistema', perm: 'settings.manage', profiles: PUB },
  { href: '/admin/api', label: 'API pubblica', icon: '🔑', group: 'Sistema', perm: 'settings.manage', profiles: NEWS },
  { href: '/admin/donazioni', label: 'Donazioni', icon: '❤️', group: 'Sistema', perm: 'settings.manage', profiles: ['quotidiano', 'rivista', 'blog', 'newsletter'] },
  { href: '/admin/importa', label: 'Importa contenuti', icon: '⬇', group: 'Sistema', perm: 'settings.manage', profiles: 'all' },
  { href: '/admin/redirect', label: 'Redirect e 404', icon: '↪', group: 'Sistema', perm: 'redirect.manage', profiles: NEWS },
  { href: '/admin/pubblicita', label: 'Pubblicità', icon: '💶', group: 'Sistema', perm: 'settings.manage', profiles: NEWS },
  { href: '/admin/edizioni', label: 'Edizioni', icon: '🏙', group: 'Sistema', perm: 'settings.manage', profiles: ['quotidiano'] },
  { href: '/admin/estensioni', label: 'Estensioni', icon: '🧩', group: 'Sistema', perm: 'settings.manage', profiles: NEWS },
  { href: '/admin/rilascio', label: 'Rilascio', icon: '🚀', group: 'Sistema', perm: 'settings.manage', profiles: NEWS },
  { href: '/admin/aggiornamenti', label: 'Aggiornamenti', icon: '⬆', group: 'Sistema', perm: 'settings.manage', profiles: 'all' },
  { href: '/admin/ai-uso', label: 'Uso dell\'AI', icon: '🧮', group: 'Sistema', perm: 'settings.manage', profiles: NEWS },
  { href: '/admin/backup', label: 'Backup', icon: '💾', group: 'Sistema', perm: 'settings.manage', profiles: 'all' },
  { href: '/admin/errori', label: 'Errori e salute', icon: '🩺', group: 'Sistema', perm: 'settings.manage', profiles: NEWS },
  { href: '/admin/prestazioni', label: 'Prestazioni', icon: '⚡', group: 'Sistema', perm: 'settings.manage', profiles: NEWS },
  { href: '/admin/sicurezza', label: 'Log di sicurezza', icon: '🔐', group: 'Sistema', perm: 'settings.manage', profiles: NEWS },
  { href: '/admin/privacy', label: 'Privacy e consensi', icon: '🛡', group: 'Sistema', perm: 'settings.manage', profiles: PUB },
  { href: '/admin/attivita', label: 'Registro attività', icon: '🗒', group: 'Sistema', perm: 'audit.view', team: true, profiles: NEWS },
  { href: '/admin/profilo', label: 'Il mio profilo', icon: '👤', group: 'Account', core: true, profiles: 'all' },
  { href: '/admin/guida', label: 'Guida', icon: '❓', group: 'Account', core: true, profiles: 'all' },
];
export const PROFILES: { id: SiteProfile; name: string; description: string; nouns: Vocabulary }[] = [
  { id: 'quotidiano', name: 'Quotidiano o giornale locale', description: 'Tutto acceso: desk, zone, eventi, annunci, pubblicità, edizioni.', nouns: { article: 'articolo', articles: 'articoli', write: 'Scrivi un articolo', site: 'testata', team: 'redazione' } },
  { id: 'rivista', name: 'Rivista o magazine', description: 'Longform, rubriche, numeri: meno cronaca, più cura.', nouns: { article: 'articolo', articles: 'articoli', write: 'Scrivi un articolo', site: 'rivista', team: 'redazione' } },
  { id: 'blog', name: 'Blog personale', description: 'Scrivi, pubblica, parla con chi ti legge. Niente ruoli né approvazioni.', nouns: { article: 'post', articles: 'post', write: 'Scrivi un post', site: 'blog', team: 'autori' } },
  { id: 'diario', name: 'Diario o quaderno', description: 'Appunti brevi e frequenti, anche privati o per pochi.', nouns: { article: 'appunto', articles: 'appunti', write: 'Nuovo appunto', site: 'quaderno', team: 'autori' } },
  { id: 'newsletter', name: 'Newsletter', description: 'Il sito è l\'archivio, la posta è il prodotto.', nouns: { article: 'numero', articles: 'numeri', write: 'Scrivi un numero', site: 'newsletter', team: 'autori' } },
  { id: 'portfolio', name: 'Portfolio', description: 'Lavori, casi, progetti in vetrina.', nouns: { article: 'progetto', articles: 'progetti', write: 'Nuovo progetto', site: 'portfolio', team: 'autori' } },
];
export interface Vocabulary { article: string; articles: string; write: string; site: string; team: string }
export interface AdaptSettings { profile: SiteProfile; autoHide: boolean; blackBox?: boolean; vocabulary?: Partial<Vocabulary>; pinned?: string[] }
export const DEFAULT_ADAPT: AdaptSettings = { profile: 'quotidiano', autoHide: true };
export const vocabularyOf = (a: AdaptSettings): Vocabulary => ({ ...(PROFILES.find((p) => p.id === a.profile) ?? PROFILES[0]).nouns, ...Object.fromEntries(Object.entries(a.vocabulary ?? {}).filter(([, v]) => v && String(v).trim())) } as Vocabulary);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/**
 * Decide cosa sta in primo piano e cosa in «Altro».
 * `used` = percorsi aperti negli ultimi 30 giorni; `mature` = l'account ha abbastanza storia per giudicare l'uso.
 */
export function arrangeNav(items: NavItem[], a: AdaptSettings, ctx: { solo: boolean; used: string[]; mature: boolean }): { main: NavItem[]; more: NavItem[] } {
  const voc = vocabularyOf(a); const main: NavItem[] = []; const more: NavItem[] = [];
  for (const raw of items) {
    const it = raw.noun === 'articles' ? { ...raw, label: cap(voc.articles) } : raw.href === '/admin/scrivi' ? { ...raw, label: voc.write } : raw;
    const pinned = (a.pinned ?? []).includes(it.href); const inProfile = it.profiles === 'all' || it.profiles.includes(a.profile);
    const usedIt = ctx.used.some((u) => u === it.href || u.startsWith(it.href + '/'));
    const front = it.core || pinned || (usedIt && !(ctx.solo && it.team)) || (inProfile && !(ctx.solo && it.team) && !(a.autoHide && ctx.mature && !usedIt));
    (front ? main : more).push(it);
  }
  return { main, more };
}
