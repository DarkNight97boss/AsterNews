import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/widgets';
import { ROLE_LABELS } from '@/lib/models';
import { articlesByAuthor, countPublished, getSettings, user } from '@/lib/queries';

export async function generateMetadata({ params }: PageProps<'/autore/[id]'>): Promise<Metadata> { const { id } = await params; const u = await user(id); return u ? { title: `${u.name}${u.title ? ' · ' + u.title : ''}`, description: (u.bio || `Tutti gli articoli di ${u.name}`).slice(0, 160) } : { title: 'Autore' }; }
const SOCIAL_LABEL: Record<string, string> = { x: 'X', instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', sito: 'Sito web' };
export default async function AuthorPage({ params, searchParams }: PageProps<'/autore/[id]'>) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const u = await user(id);
  if (!u) notFound();
  const page = Math.max(1, Number(sp.pagina ?? 1) || 1); const perPage = (await getSettings()).articlesPerPage;
  const [articles, total] = await Promise.all([articlesByAuthor(u.id, perPage, (page - 1) * perPage), countPublished({ authorId: u.id })]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: u.name, jobTitle: u.title || ROLE_LABELS[u.role], description: u.bio, image: u.avatar, sameAs: Object.values(u.socials ?? {}).filter(Boolean) }) }} />
      <div className="author-box author-page" style={{ margin: '0 0 28px' }}><img src={u.avatar} alt={u.name} /><div><div className="role">{u.title || ROLE_LABELS[u.role]}</div><h1 style={{ fontSize: 30, margin: '2px 0 6px' }}>{u.name}</h1><p>{u.bio}</p>{u.longBio && <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.55 }}>{u.longBio}</p>}
        <p className="count" style={{ marginTop: 8 }}>{total} articoli pubblicati{u.createdAt && <> · in redazione dal {new Date(u.createdAt).getFullYear()}</>}</p>
        {Object.entries(u.socials ?? {}).filter(([, v]) => v).length > 0 && <p className="author-socials">{Object.entries(u.socials ?? {}).filter(([, v]) => v).map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener me">{SOCIAL_LABEL[k] ?? k}</a>)}</p>}
      </div></div>
      <div className="layout-sidebar"><div><ArticleList articles={articles} total={total} page={page} perPage={perPage} basePath={`/autore/${u.id}`} /></div><Sidebar /></div>
    </>
  );
}
