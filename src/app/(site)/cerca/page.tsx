import type { Metadata } from 'next';
import Form from 'next/form';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/sidebar';
import { search } from '@/lib/queries';

export async function generateMetadata({ searchParams }: PageProps<'/cerca'>): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Ricerca: ${q}` : 'Cerca', robots: { index: false } };
}

export default async function SearchPage({ searchParams }: PageProps<'/cerca'>) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const results = search(q);
  return (
    <>
      <div className="page-head">
        <h1>Cerca</h1>
        <Form action="/cerca" style={{ display: 'flex', gap: 8, marginTop: 14, maxWidth: 640 }}>
          <input className="input" name="q" defaultValue={q} placeholder="Cerca articoli, argomenti, persone..." />
          <button className="btn btn-dark" type="submit">Cerca</button>
        </Form>
        {q && <p><span className="count">{results.length} risultati per «{q}»</span></p>}
      </div>
      <div className="layout-sidebar">
        <div>{q ? <ArticleList articles={results} /> : <p style={{ color: 'var(--gray-500)' }}>Inserisci un termine per iniziare la ricerca.</p>}</div>
        <Sidebar />
      </div>
    </>
  );
}
