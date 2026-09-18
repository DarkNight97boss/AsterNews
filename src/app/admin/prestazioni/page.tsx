import { redirect } from 'next/navigation';
import { PerformancePanel } from '@/components/admin/performance-panel';
import { VitalsPanel } from '@/components/admin/vitals-panel';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listPageSpeedRuns } from '@/lib/repo-extra3';
import { pagesToAudit, performanceSettings } from '@/lib/pagespeed';

export default async function PerformancePage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [runs, settings, pages] = await Promise.all([listPageSpeedRuns(80), performanceSettings(), pagesToAudit()]);
  return <><VitalsPanel /><PerformancePanel runs={runs} settings={{ ...settings, psiApiKey: settings.psiApiKey ? '••••' + settings.psiApiKey.slice(-4) : '' }} hasKey={!!(settings.psiApiKey || process.env.PAGESPEED_API_KEY)} pages={pages} /></>;
}
