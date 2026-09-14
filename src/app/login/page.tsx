import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUsers } from '@/lib/queries';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Accedi', robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { redirect: r } = await searchParams;
  if (await getCurrentUser()) redirect(typeof r === 'string' && r.startsWith('/') ? r : '/admin');
  const users = getUsers().map((u) => ({ email: u.email, role: u.role }));
  return <LoginForm users={users} redirectTo={typeof r === 'string' ? r : '/admin'} />;
}
