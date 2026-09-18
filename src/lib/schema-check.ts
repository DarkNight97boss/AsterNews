import type { Article } from './models';

/** Controllo dei dati strutturati dell'articolo con i criteri dei risultati avanzati di Google (NewsArticle): puro, usato nell'editor. */
export interface SchemaIssue { level: 'error' | 'warn' | 'ok'; text: string }
export function checkArticleSchema(a: Article, ctx: { authorName: string; siteLogo: boolean }): SchemaIssue[] {
  const out: SchemaIssue[] = []; const add = (level: SchemaIssue['level'], text: string) => out.push({ level, text });
  if (!a.title.trim()) add('error', 'headline mancante: serve il titolo.'); else if (a.title.length > 110) add('warn', `headline di ${a.title.length} caratteri: Google consiglia al massimo 110.`); else add('ok', 'headline presente e della lunghezza giusta.');
  const img = a.coverImage; if (!img) add('error', 'image mancante: senza immagine l\'articolo non entra in Discover né nei caroselli.'); else if (!/^https?:\/\//.test(img) && !img.startsWith('/')) add('warn', 'image con indirizzo non assoluto.'); else add('ok', 'image presente (il sito la fornisce anche in 16:9, 4:3 e 1:1).');
  if (!a.publishedAt && a.status === 'published') add('error', 'datePublished mancante.'); else add('ok', 'datePublished e dateModified generati dal sistema.');
  if (!ctx.authorName && !a.byline) add('error', 'author mancante: assegna un autore o una firma.'); else add('ok', `author: ${a.byline || ctx.authorName}.`);
  if (!ctx.siteLogo) add('warn', 'publisher.logo: nessun logo caricato, viene usata la card generata.');
  if (!(a.seo.description || a.excerpt || a.subtitle)) add('warn', 'description mancante: compila sommario o meta description.');
  if (a.format === 'video' && !a.videoUrl) add('error', 'VideoObject: formato video senza URL del video.');
  if (a.format === 'live' && !a.liveUpdates.length) add('warn', 'LiveBlogPosting senza aggiornamenti: aggiungine almeno uno.');
  if (a.faq?.some((f) => !f.q.trim() || !f.a.trim())) add('warn', 'FAQPage: ci sono domande o risposte vuote.');
  if (a.premium) add('ok', 'isAccessibleForFree=false dichiarato per il paywall (evita penalizzazioni per cloaking).');
  if ((a.extra?.corrections?.length ?? 0) > 0) add('ok', 'correction dichiarata nei dati strutturati.');
  return out;
}
