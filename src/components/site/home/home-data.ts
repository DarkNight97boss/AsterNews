import { Article, Category, Event } from '@/lib/models';
import { articlesByCategory, category, getCategories, getEvents, getFeatured, getPublished, getSettings } from '@/lib/queries';

export interface HomeData {
  lead?: Article; pair: Article[]; hero: Article[]; latest: Article[];
  dossierCat?: Category; dossierLead?: Article; dossierRest: Article[];
  opinionCat?: Category; opinions: Article[]; localCat?: Category;
  videos: Article[]; events: Event[];
  sections: { category: Category; articles: Article[] }[];
}

export function getHomeData(): HomeData {
  const cats = getCategories();
  const published = getPublished();
  const featured = getFeatured();
  const dossierCat = cats.find((c) => c.kind === 'dossier');
  const opinionCat = cats.find((c) => c.kind === 'opinion');
  const localCat = cats.find((c) => c.kind === 'local');
  const isNews = (id: string) => ![dossierCat?.id, opinionCat?.id, localCat?.id].includes(id);
  const newsPool = [...featured.filter((a) => isNews(a.categoryId)), ...published.filter((a) => isNews(a.categoryId) && !featured.includes(a))];
  const hero = newsPool.slice(0, 5);
  const used = new Set(hero.map((a) => a.id));
  const dossiers = dossierCat ? articlesByCategory(dossierCat.id) : [];
  const dossierLead = dossiers.find((a) => a.featured) ?? dossiers[0];
  return {
    lead: newsPool[0], pair: newsPool.slice(1, 3), hero,
    latest: published.filter((a) => !used.has(a.id)).slice(0, 8),
    dossierCat, dossierLead, dossierRest: dossiers.filter((a) => a.id !== dossierLead?.id).slice(0, 3),
    opinionCat, opinions: opinionCat ? articlesByCategory(opinionCat.id).slice(0, 3) : [], localCat,
    videos: published.filter((a) => a.format === 'video').slice(0, 3),
    events: getEvents().slice(0, 4),
    sections: getSettings().homeSections
      .map((id) => category(id))
      .filter((c): c is Category => !!c && c.showOnHome)
      .map((c) => ({ category: c, articles: articlesByCategory(c.id).filter((a) => !used.has(a.id)).slice(0, 4) }))
      .filter((s) => s.articles.length > 0),
  };
}

export function shortTime(a: Article): string {
  const d = new Date(a.publishedAt ?? '');
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}
