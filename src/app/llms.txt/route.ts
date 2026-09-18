import { getCategories, getPublished, getSettings, articleUrlWith } from '@/lib/queries';
import { buildLlmsTxt } from '@/lib/distribution';
import { siteUrl } from '@/lib/site-url';

export const revalidate = 3600;
export async function GET() {
  const [s, cats, recent] = await Promise.all([getSettings(), getCategories(), getPublished(15)]); const base = siteUrl();
  return new Response(buildLlmsTxt({ siteName: s.siteName, tagline: s.tagline ?? '', url: base, sections: cats.filter((c) => c.showInMenu).map((c) => ({ name: c.name, url: `${base}/${c.slug}` })), notes: s.aiPolicy?.notes ?? '', allowTraining: !!s.aiPolicy?.allowTraining, contact: s.newsletter?.fromEmail ?? '', recent: recent.filter((a) => !a.premium).map((a) => ({ title: a.title, url: base + articleUrlWith(a, cats) })) }), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
