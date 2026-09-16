import 'server-only';
import * as repo from './repo';
import type { Article } from './models';
import { siteUrl } from './site-url';

const NAMES: Record<string, string> = { it: 'Italiano', en: 'English', fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português', ro: 'Română', ar: 'العربية', zh: '中文', sq: 'Shqip', uk: 'Українська' };
async function family(a: Article): Promise<{ lang: string; article: Article }[]> {
  const rootId = a.extra?.translationOf ?? a.id; const root = rootId === a.id ? a : await repo.findArticle(rootId); if (!root) return [{ lang: a.extra?.lang ?? 'it', article: a }];
  const out = [{ lang: root.extra?.lang ?? 'it', article: root }];
  for (const [lang, id] of Object.entries(root.extra?.translations ?? {})) { const t = id === a.id ? a : await repo.findArticle(id); if (t && t.status === 'published') out.push({ lang, article: t }); }
  return out;
}
const urlOf = async (a: Article) => { const cats = await repo.listCategories(); const c = cats.find((k) => k.id === a.categoryId); return `${siteUrl()}/${c?.slug ?? 'notizie'}/${a.slug}`; };
/** alternates.languages per i metadata di Next (hreflang). */
export async function hreflangFor(a: Article): Promise<{ languages?: Record<string, string> }> {
  const fam = await family(a); if (fam.length < 2) return {};
  const languages: Record<string, string> = {}; for (const f of fam) languages[f.lang] = await urlOf(f.article); languages['x-default'] = languages.it ?? languages[fam[0].lang];
  return { languages };
}
export async function languageLinks(a: Article): Promise<{ lang: string; label: string; url: string }[]> {
  const fam = await family(a); if (fam.length < 2) return [];
  const cur = a.extra?.lang ?? 'it'; const out = []; for (const f of fam) if (f.lang !== cur) out.push({ lang: f.lang, label: NAMES[f.lang] ?? f.lang.toUpperCase(), url: await urlOf(f.article) });
  return out;
}
