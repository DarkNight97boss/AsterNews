import { redirect } from 'next/navigation';
import { AdaptForm } from '@/components/admin/adapt-form';
import { requireUser } from '@/lib/auth';
import { DEFAULT_ADAPT, NAV } from '@/lib/admin-nav';
import { can } from '@/lib/permissions';
import { getSettings, getUsers } from '@/lib/queries';
import { navUsage } from '@/lib/repo-extra3';

export const dynamic = 'force-dynamic';
export default async function AdaptPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [s, users, usage] = await Promise.all([getSettings(), getUsers(), navUsage(me.id)]);
  return <AdaptForm initial={{ ...DEFAULT_ADAPT, ...(s.adapt ?? {}) }} solo={users.filter((u) => u.active).length <= 1} used={usage.used} items={NAV.map((n) => ({ href: n.href, label: n.label, icon: n.icon, core: !!n.core }))} />;
}
