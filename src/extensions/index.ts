import type { Extension } from '../lib/extensions';

/**
 * Registro delle estensioni. Per aggiungerne una: crea un file in questa cartella che esporta un oggetto `Extension`
 * e aggiungilo all'array. Le estensioni si attivano e configurano da Sistema → Estensioni.
 */

const firmaAutomatica: Extension = {
  id: 'firma-automatica', name: 'Firma automatica', version: '1.0.0', author: 'ASTER News',
  description: 'Aggiunge in fondo a ogni articolo pubblicato un riquadro HTML (redazione, contatti, invito alla newsletter). Non viene duplicato se già presente.',
  fields: [{ key: 'html', label: 'HTML della firma', type: 'textarea', placeholder: '<p class="firma">Hai una notizia? Scrivi a redazione@…</p>', help: 'Puoi usare {siteName}.' }],
  filterContent: (html, _a, ctx) => { const sig = (ctx.config.html ?? '').replace('{siteName}', ctx.siteName).trim(); if (!sig || html.includes('data-ext="firma"')) return html; return `${html}\n<div data-ext="firma">${sig}</div>`; },
};

const paroleVietate: Extension = {
  id: 'parole-vietate', name: 'Parole vietate', version: '1.0.0', author: 'ASTER News',
  description: 'Blocca il salvataggio se titolo o testo contengono parole o espressioni nella lista (refusi ricorrenti, termini legalmente rischiosi, marchi da non citare).',
  fields: [{ key: 'words', label: 'Parole o frasi (una per riga)', type: 'textarea', placeholder: 'presunto colpevole\nclicca qui' }, { key: 'mode', label: 'Comportamento', type: 'select', options: ['blocca', 'avvisa'] }],
  beforeArticleSave: (a, ctx) => {
    const words = (ctx.config.words ?? '').split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(Boolean);
    const text = `${a.title} ${a.subtitle} ${a.content}`.toLowerCase();
    const found = words.filter((w) => text.includes(w));
    if (found.length && (ctx.config.mode ?? 'blocca') === 'blocca') throw new Error(`Parole vietate presenti nel testo: ${found.join(', ')}`);
    if (found.length) return { ...a, seoReport: [...(a.seoReport ?? []), `Attenzione: parole da evitare (${found.join(', ')})`] };
  },
};

const webhookPubblicazione: Extension = {
  id: 'webhook-pubblicazione', name: 'Webhook alla pubblicazione', version: '1.0.0', author: 'ASTER News',
  description: 'Invia un JSON con titolo, URL, estratto, categoria e copertina a un indirizzo esterno ogni volta che un articolo viene pubblicato (Zapier, Make, n8n, Slack, Discord).',
  fields: [{ key: 'url', label: 'URL del webhook', type: 'url', placeholder: 'https://hooks.zapier.com/…' }, { key: 'secret', label: 'Segreto (intestazione X-Aster-Secret)', type: 'text' }],
  afterArticlePublish: async (a, ctx) => {
    if (!ctx.config.url) return;
    const { siteUrl } = await import('../lib/site-url'); const { getCategories } = await import('../lib/queries');
    const cats = await getCategories(); const cat = cats.find((c) => c.id === a.categoryId);
    await fetch(ctx.config.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Aster-Secret': ctx.config.secret ?? '' }, body: JSON.stringify({ event: 'article.published', id: a.id, title: a.title, url: `${siteUrl()}/${cat?.slug ?? 'notizie'}/${a.slug}`, excerpt: a.excerpt, category: cat?.name, image: a.coverImage, publishedAt: a.publishedAt, text: `${a.title}\n${siteUrl()}/${cat?.slug ?? 'notizie'}/${a.slug}` }) }).catch(() => {});
  },
};

const avvisoArticoliVecchi: Extension = {
  id: 'articoli-vecchi', name: 'Avviso articoli datati', version: '1.0.0', author: 'ASTER News',
  description: 'Aggiunge un avviso in cima agli articoli pubblicati da più di N giorni ("Questo articolo ha più di un anno") al momento del salvataggio; utile per archivi importati.',
  fields: [{ key: 'days', label: 'Giorni dopo i quali mostrare l\'avviso', type: 'number', placeholder: '365' }, { key: 'text', label: 'Testo dell\'avviso', type: 'text', placeholder: 'Questo articolo è stato pubblicato più di un anno fa: le informazioni potrebbero non essere aggiornate.' }],
  filterContent: (html, a, ctx) => {
    const days = Number(ctx.config.days) || 365; if (!a.publishedAt || Date.now() - new Date(a.publishedAt).getTime() < days * 86400000) return html;
    if (html.includes('data-ext="vecchio"')) return html;
    return `<div class="box box-warning" data-ext="vecchio"><b>Nota</b><p>${ctx.config.text || 'Questo articolo è stato pubblicato più di un anno fa: le informazioni potrebbero non essere aggiornate.'}</p></div>\n${html}`;
  },
};

export const EXTENSIONS: Extension[] = [firmaAutomatica, paroleVietate, webhookPubblicazione, avvisoArticoliVecchi];
