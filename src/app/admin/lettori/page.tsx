import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { countReaders, listReaders } from '@/lib/repo-extra';
import { getSettings } from '@/lib/queries';
import { DEFAULT_PAYWALL } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ReadersTable } from '@/components/admin/readers-table';

export default async function ReadersPage({ searchParams }: PageProps<'/admin/lettori'>) {
  const me = await requireUser();
  if (!can(me, 'comment.moderate')) redirect('/admin');
  const sp = await searchParams; const q = typeof sp.q === 'string' ? sp.q : '';
  const [readers, counts, s] = await Promise.all([listReaders(200, 0, q), countReaders(), getSettings()]);
  const pw = { ...DEFAULT_PAYWALL, ...(s.paywall ?? {}) };
  return (
    <>
      <div className="page-title"><div><h1>Lettori e abbonati</h1><p>{counts.total} account registrati · {counts.premium} abbonati premium · paywall {pw.enabled ? `attivo (${pw.freeArticles} articoli gratis al mese, ${pw.monthlyPrice} €/mese)` : 'disattivato'}</p></div></div>
      <form className="filters" method="get"><input className="input grow" name="q" placeholder="Cerca per email o nome…" defaultValue={q} /><button className="btn btn-outline" type="submit">Cerca</button></form>
      <ReadersTable readers={readers.map((r) => ({ ...r, createdAtLabel: formatDate(r.createdAt, false), lastLoginLabel: r.lastLogin ? formatDate(r.lastLogin) : '—' }))} />
    </>
  );
}
