import { redirect } from 'next/navigation';
import { RedirectsManager } from '@/components/admin/redirects-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listNotFound, listRedirects } from '@/lib/repo-extra';

export default async function RedirectPage({ searchParams }: PageProps<'/admin/redirect'>) {
  const me = await requireUser();
  if (!can(me, 'redirect.manage')) redirect('/admin');
  const sp = await searchParams; const q = typeof sp.q === 'string' ? sp.q : '';
  const [redirects, notFound] = await Promise.all([listRedirects(2000, q), listNotFound(100)]);
  return <RedirectsManager redirects={redirects} notFound={notFound} query={q} />;
}
