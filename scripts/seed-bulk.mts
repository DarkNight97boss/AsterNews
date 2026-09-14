/**
 * Genera N articoli di prova (default 100.000) per misurare il CMS con un archivio da magazine.
 *   npm run seed:bulk -- --n 100000
 */
const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { args.set(a.slice(2), process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true'); } }
const N = Number(args.get('n') ?? 100000);
const repo = await import('../src/lib/repo');
const { slugify } = await import('../src/lib/utils');
const { extractKeywords } = await import('../src/lib/seo-engine');
const cats = await repo.listCategories(); const users = await repo.listUsers(); const tags = await repo.listTags(500); const zones = await repo.listZones();
const words = 'governo manovra bonus scuola sanità trasporti metro cantiere sindaco consiglio elezioni partito ministro regione comune quartiere traffico maltempo allerta polizia carabinieri indagine processo tribunale calcio derby campionato finale tennis concerto festival cinema serie musica mostra teatro startup lavoro contratto stipendio pensione inflazione prezzi carburanti bollette casa affitto mutuo turismo estate spiaggia montagna neve'.split(' ');
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const sentence = () => { const n = 8 + Math.floor(Math.random() * 10); const w = Array.from({ length: n }, () => pick(words)); w[0] = w[0][0].toUpperCase() + w[0].slice(1); return w.join(' ') + '.'; };
const paragraph = () => Array.from({ length: 4 + Math.floor(Math.random() * 4) }, sentence).join(' ');
const t0 = Date.now();
let done = 0;
const BATCH = 200;
for (let start = 0; start < N; start += BATCH) {
  const list = [];
  for (let i = start; i < Math.min(N, start + BATCH); i++) {
    const cat = pick(cats); const title = `${sentence().replace(/\.$/, '')} ${i}`;
    const days = Math.floor(Math.random() * 3650); const d = new Date(Date.now() - days * 86400000 - Math.random() * 86400000).toISOString();
    const content = `<p>${paragraph()}</p><h2>${sentence().replace(/\.$/, '')}</h2><p>${paragraph()}</p><p>${paragraph()}</p><h2>${sentence().replace(/\.$/, '')}</h2><p>${paragraph()}</p>`;
    const tagIds = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => pick(tags).id);
    const kw = extractKeywords(title, '', content, 3)[0] ?? '';
    list.push({ a: { id: `bulk_${i}`, slug: slugify(title).slice(0, 70) || `bulk-${i}`, kicker: pick(words), title, subtitle: sentence(), excerpt: sentence(), content, coverImage: `https://picsum.photos/seed/b${i % 500}/1200/800`, coverCaption: 'Foto di repertorio', categoryId: cat.id, authorId: pick(users).id, zoneId: Math.random() < 0.3 ? pick(zones).id : '', address: '', status: 'published' as const, format: 'standard' as const, videoUrl: '', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true, seo: { title: title.slice(0, 60), description: sentence().slice(0, 150), canonical: '', noIndex: false, focusKeyword: kw }, tagIds: [...new Set(tagIds)], views: Math.floor(Math.random() * 50000), publishedAt: d, scheduledAt: null, createdAt: d, updatedAt: d, seoScore: 50 + Math.floor(Math.random() * 50) } });
  }
  await repo.bulkUpsertArticles(list);
  done += list.length;
  if (done % 5000 === 0 || done === N) process.stdout.write(`\r${done}/${N} articoli (${(done / ((Date.now() - t0) / 1000)).toFixed(0)}/s)     `);
}
console.log(`\nFatto in ${((Date.now() - t0) / 1000).toFixed(1)} s. Totale articoli: ${await repo.countArticles({})}`);
await (await import("../src/lib/db")).closeDb();
process.exit(0);
