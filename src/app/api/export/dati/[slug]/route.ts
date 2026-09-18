import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories, getSettings } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';

export async function GET(_req: Request, ctx: RouteContext<'/api/export/dati/[slug]'>) {
  const { slug } = await ctx.params; const [cats, s] = await Promise.all([getCategories(), getSettings()]); const cat = cats.find((c) => c.slug === slug); const fields = (cat ? (s.customFields?.[cat.id] ?? []) : []) as { key: string; label: string }[]; if (!cat || !fields.length) return new Response('Non trovato', { status: 404 });
  const arts = await listArticles({ status: 'published', categoryId: cat.id }, 'published', 2000); const q = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [['Titolo', ...fields.map((f) => f.label), 'Data', 'Indirizzo'].map(q).join(','), ...arts.map((a) => [a.title, ...fields.map((f) => a.extra?.fields?.[f.key] ?? ''), (a.publishedAt ?? '').slice(0, 10), siteUrl() + articleUrlWith(a, cats)].map(q).join(','))].join('\n');
  return new Response('﻿' + csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${cat.slug}.csv"` } });
}
