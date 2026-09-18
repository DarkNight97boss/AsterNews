import { redirect } from 'next/navigation';
import { AdsManager } from '@/components/admin/ads-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { adsSettings } from '@/lib/ads';
import { listAds } from '@/lib/repo-extra2';
import { listAdOrders } from '@/lib/repo-extra3';
import { getSettings } from '@/lib/queries';
import { AdSalesForm } from '@/components/admin/ad-sales-form';

export default async function AdsPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [ads, s, orders, all] = await Promise.all([listAds(), adsSettings(), listAdOrders(50), getSettings()]);
  return <><AdsManager ads={ads} adsense={!!s.adsenseClient} /><AdSalesForm initial={{ enabled: !!all.adSales?.enabled, prices: all.adSales?.prices ?? {}, note: all.adSales?.note ?? '' }} orders={orders} /></>;
}
