import { Article, Category, Event } from '@/lib/models';
import { articlesByCategory, getCategories, getEvents, getFeatured, getPublished, getSettings, listPublished } from '@/lib/queries';

export interface HomeData {
  lead?: Article; pair: Article[]; hero: Article[]; latest: Article[];
  dossierCat?: Category; dossierLead?: Article; dossierRest: Article[];
  opinionCat?: Category; opinions: Article[]; localCat?: Category;
  videos: Article[]; events: Event[];
  sections: { category: Category; articles: Article[] }[];
}

export async function getHomeData(): Promise<HomeData> {
  const [cats, published, featured, settings, events, videos] = await Promise.all([getCategories(), getPublished(40), getFeatured(8), getSettings(), getEvents({}, 4), listPublished({ format: 'video' }, 3)]);
  const dossierCat = cats.find((c) => c.kind === 'dossier');
  const opinionCat = cats.find((c) => c.kind === 'opinion');
  const localCat = cats.find((c) => c.kind === 'local');
  const isNews = (id: string) => ![dossierCat?.id, opinionCat?.id, localCat?.id].includes(id);
  const featIds = new Set(featured.map((a) => a.id));
  const newsPool = [...featured.filter((a) => isNews(a.categoryId)), ...published.filter((a) => isNews(a.categoryId) && !featIds.has(a.id))];
  const hero = newsPool.slice(0, 5);
  const used = new Set(hero.map((a) => a.id));
  const [dossiers, opinions, sectionLists] = await Promise.all([
    dossierCat ? articlesByCategory(dossierCat.id, 4) : Promise.resolve([]),
    opinionCat ? articlesByCategory(opinionCat.id, 3) : Promise.resolve([]),
    Promise.all(settings.homeSections.map((id) => cats.find((c) => c.id === id)).filter((c): c is Category => !!c && c.showOnHome).map(async (c) => ({ category: c, articles: (await articlesByCategory(c.id, 9)).filter((a) => !used.has(a.id)).slice(0, 4) }))),
  ]);
  const dossierLead = dossiers.find((a) => a.featured) ?? dossiers[0];
  return {
    lead: newsPool[0], pair: newsPool.slice(1, 3), hero,
    latest: published.filter((a) => !used.has(a.id)).slice(0, 8),
    dossierCat, dossierLead, dossierRest: dossiers.filter((a) => a.id !== dossierLead?.id).slice(0, 3),
    opinionCat, opinions, localCat, videos, events,
    sections: sectionLists.filter((s) => s.articles.length > 0),
  };
}

export function shortTime(a: Article): string {
  const d = new Date(a.publishedAt ?? '');
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}
