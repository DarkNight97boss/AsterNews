/** Controlli di accessibilità sul testo di un articolo (funzione pura, usabile nell'editor). */
export interface A11yIssue { level: 'error' | 'warn'; text: string }

export function checkAccessibility(html: string, title = ''): A11yIssue[] {
  const out: A11yIssue[] = [];
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\balt="[^"]+"/i.test(t)).length;
  if (noAlt) out.push({ level: 'error', text: `${noAlt} immagin${noAlt === 1 ? 'e' : 'i'} senza testo alternativo (alt).` });
  const badAlt = imgs.filter((t) => /\balt="(img|image|foto|immagine|photo|dsc|screenshot)[^"]*"/i.test(t)).length;
  if (badAlt) out.push({ level: 'warn', text: `${badAlt} alt generici (es. "immagine", "foto"): descrivi cosa si vede.` });
  const heads = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  if (heads.includes(1)) out.push({ level: 'warn', text: 'Nel testo c\'è un H1: il titolo dell\'articolo è già H1, usa H2 e H3.' });
  let prev = 1; for (const h of heads) { if (h > prev + 1) { out.push({ level: 'warn', text: `Salto di livello nei titoli (da H${prev} a H${h}): usa i livelli in ordine.` }); break; } prev = h; }
  const links = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim().toLowerCase());
  const generic = links.filter((t) => /^(qui|clicca qui|clicca|leggi|link|qua|questo|questa pagina|read more)$/.test(t)).length;
  if (generic) out.push({ level: 'warn', text: `${generic} link con testo generico ("clicca qui"): usa parole che descrivono la destinazione.` });
  if (links.some((t) => !t)) out.push({ level: 'error', text: 'Link senza testo (solo immagine o vuoto): aggiungi un testo o un alt.' });
  const longP = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].filter((m) => m[1].replace(/<[^>]+>/g, '').split(/\s+/).length > 120).length;
  if (longP) out.push({ level: 'warn', text: `${longP} paragraf${longP === 1 ? 'o' : 'i'} oltre 120 parole: spezza per la leggibilità.` });
  if (/<table\b/i.test(html) && !/<th\b/i.test(html)) out.push({ level: 'warn', text: 'Tabella senza intestazioni (th): aggiungi la riga di intestazione.' });
  if (/<iframe\b(?![^>]*title=)/i.test(html)) out.push({ level: 'warn', text: 'Video o mappa incorporati senza attributo title.' });
  if (/style="[^"]*color:/i.test(html)) out.push({ level: 'warn', text: 'Colori impostati a mano nel testo: potrebbero non avere contrasto sufficiente.' });
  if (/[A-ZÀ-Ú]{12,}/.test(title)) out.push({ level: 'warn', text: 'Titolo in maiuscolo: gli screen reader lo leggono lettera per lettera.' });
  if (/\b(vedi (sopra|sotto)|come mostrato (sopra|sotto|nell'immagine))\b/i.test(html)) out.push({ level: 'warn', text: 'Riferimenti spaziali ("vedi sotto", "nell\'immagine") non aiutano chi usa uno screen reader.' });
  return out;
}
