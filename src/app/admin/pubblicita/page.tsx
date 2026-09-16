import { redirect } from 'next/navigation';
import { AdsManager } from '@/components/admin/ads-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { adsSettings } from '@/lib/ads';
import { listAds } from '@/lib/repo-extra2';

export default async function AdsPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [ads, s] = await Promise.all([listAds(), adsSettings()]);
  return <AdsManager ads={ads} adsense={!!s.adsenseClient} />;
}
