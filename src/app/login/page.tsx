import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUsers } from '@/lib/queries';
import { LoginForm } from './login-form';
import { ensureInstalled } from '@/lib/install';

export const metadata: Metadata = { title: 'Accedi', robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  await ensureInstalled();
  const { redirect: r } = await searchParams;
  if (await getCurrentUser()) redirect(typeof r === 'string' && r.startsWith('/') ? r : '/admin');
  const demo = process.env.DEMO_MODE === '1';
  const users = demo ? (await getUsers()).filter((u) => !u.hasPassword).map((u) => ({ email: u.email, role: u.role })) : [];
  return <LoginForm users={users} demo={demo} redirectTo={typeof r === 'string' ? r : '/admin'} />;
}
