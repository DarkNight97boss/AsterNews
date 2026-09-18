import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUsers } from '@/lib/queries';
import { LoginForm } from './login-form';
import { ensureInstalled } from '@/lib/install';
import { staffProviders } from '@/lib/oauth';

export const metadata: Metadata = { title: 'Accedi', robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  await ensureInstalled();
  const { redirect: r } = await searchParams;
  if (await getCurrentUser()) redirect(typeof r === 'string' && r.startsWith('/') ? r : '/admin');
  const demo = process.env.DEMO_MODE === '1';
  const users = demo ? (await getUsers()).filter((u) => !u.hasPassword).map((u) => ({ email: u.email, role: u.role })) : [];
  const sso = await staffProviders();
  return <><LoginForm users={users} demo={demo} redirectTo={typeof r === 'string' ? r : '/admin'} />{sso.length > 0 && <div className="sso-box"><span className="help">oppure accedi con l&apos;account aziendale</span>{sso.map((p) => <a key={p} className="btn btn-outline" href={`/api/auth/${p}?staff=1&back=${encodeURIComponent(typeof r === 'string' ? r : '/admin')}`}>{p === 'google' ? 'Google Workspace' : 'Microsoft 365'}</a>)}</div>}</>;
}
