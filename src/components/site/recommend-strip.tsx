'use client';

import { useEffect, useState } from 'react';

type Item = { id: string; title: string; url: string; image?: string; category?: string };
/** «Consigliati per te» senza profilazione lato server: le categorie lette restano nel browser del lettore (localStorage) e alimentano l'API pubblica. */
export function RecommendStrip({ categorySlug, currentId }: { categorySlug: string; currentId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let prefs: Record<string, number> = {}; try { prefs = JSON.parse(localStorage.getItem('aster_reads') ?? '{}'); } catch { prefs = {}; }
    prefs[categorySlug] = (prefs[categorySlug] ?? 0) + 1; try { localStorage.setItem('aster_reads', JSON.stringify(prefs)); } catch { /* ignora */ }
    const top = Object.entries(prefs).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
    Promise.all(top.map((c) => fetch(`/api/v1/articles?category=${encodeURIComponent(c)}&limit=4`).then((r) => r.json()).catch(() => ({ items: [] })))).then((res) => { const seen = new Set<string>([currentId]); const out: Item[] = []; for (const r of res) for (const a of (r.items ?? []) as (Item & { coverImage?: string })[]) { if (seen.has(a.id)) continue; seen.add(a.id); out.push({ id: a.id, title: a.title, url: a.url, image: a.image ?? a.coverImage, category: a.category }); } setItems(out.slice(0, 4)); });
  }, [categorySlug, currentId]);
  if (!items.length) return null;
  return <section className="section recommend"><div className="section-title"><h2>Consigliati per te</h2><span className="help">in base a ciò che leggi su questo dispositivo</span></div><div className="grid grid-4 grid-divided">{items.map((a) => <a key={a.id} href={a.url} className="rec-card">{a.image && <img src={a.image} alt="" loading="lazy" />}<b>{a.title}</b></a>)}</div></section>;
}
