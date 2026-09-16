import 'server-only';
import * as repo from './repo';
import * as x3 from './repo-extra3';
import { DEFAULT_MONITORING, DEFAULT_PERFORMANCE, type PageSpeedRun, type PerformanceSettings } from './models';
import { runPageSpeed, type PsiStrategy } from './pagespeed-core';
import { getSettings } from './queries';
import { mailConfigured, mailLayout, sendMail } from './mailer';
import { siteUrl } from './site-url';
import { uid } from './utils';

export async function performanceSettings(): Promise<PerformanceSettings> { return { ...DEFAULT_PERFORMANCE, ...((await getSettings()).performance ?? {}) }; }
export const apiKey = async (): Promise<string> => (await performanceSettings()).psiApiKey || process.env.PAGESPEED_API_KEY || '';

/** Pagine da misurare: quelle impostate, altrimenti home, ultimo articolo pubblicato e prima categoria. */
export async function pagesToAudit(): Promise<string[]> {
  const base = siteUrl(); const s = await performanceSettings();
  const custom = s.pages.split(/\n|,/).map((p) => p.trim()).filter(Boolean).map((p) => (p.startsWith('http') ? p : base + (p.startsWith('/') ? p : '/' + p)));
  if (custom.length) return [...new Set(custom)].slice(0, 6);
  const urls = [base + '/'];
  try { const [a] = await repo.listArticles({ status: 'published' }, 'published', 1); const cats = await repo.listCategories(); if (a) { const c = cats.find((k) => k.id === a.categoryId); urls.push(`${base}/${c?.slug ?? 'notizie'}/${a.slug}`); } if (cats[0]) urls.push(`${base}/${cats[0].slug}`); } catch { /* ignora */ }
  return urls;
}

/** Misura tutte le pagine (mobile e, se attivo, desktop), salva i risultati e avvisa se il punteggio scende. */
export async function auditSite(trigger: 'manuale' | 'automatico' = 'manuale'): Promise<{ runs: PageSpeedRun[]; alerts: string[]; errors: string[] }> {
  const s = await performanceSettings(); const key = await apiKey();
  const urls = await pagesToAudit(); const strategies: PsiStrategy[] = s.desktop ? ['mobile', 'desktop'] : ['mobile'];
  const runs: PageSpeedRun[] = []; const alerts: string[] = []; const errors: string[] = [];
  for (const url of urls) for (const strategy of strategies) {
    try {
      const prev = await x3.latestPageSpeedRun(url, strategy);
      const r = await runPageSpeed(url, strategy, key);
      const run: PageSpeedRun = { id: uid('ps'), createdAt: new Date().toISOString(), url: r.url, strategy: r.strategy, performance: r.performance, accessibility: r.accessibility, bestPractices: r.bestPractices, seo: r.seo, lcp: r.lcp, cls: r.cls, tbt: r.tbt, fcp: r.fcp, si: r.si, opportunities: r.opportunities };
      await x3.insertPageSpeedRun(run); runs.push(run);
      const path = url.replace(siteUrl(), '') || '/';
      if (run.performance < s.threshold) alerts.push(`${path} (${strategy}): prestazioni ${run.performance}/100, sotto la soglia ${s.threshold}`);
      else if (prev && prev.performance - run.performance >= 10) alerts.push(`${path} (${strategy}): prestazioni scese da ${prev.performance} a ${run.performance}`);
    } catch (e) { errors.push(`${url} (${strategy}): ${(e as Error).message}`); }
  }
  await x3.prunePageSpeedRuns(400);
  if (alerts.length && s.alerts) await notify(alerts, trigger);
  return { runs, alerts, errors };
}

async function notify(alerts: string[], trigger: string): Promise<void> {
  const s = await getSettings(); const mon = { ...DEFAULT_MONITORING, ...(s.monitoring ?? {}) };
  const text = `${s.siteName} · PageSpeed (${trigger}): ${alerts.join('; ')}. Dettagli: ${siteUrl()}/admin/prestazioni`;
  try { const admins = (await repo.listUsers()).filter((u) => u.role === 'admin' && u.active); for (const a of admins) await x3.insertNotification({ id: uid('nt'), userId: a.id, kind: 'perf', text: `PageSpeed: ${alerts[0]}${alerts.length > 1 ? ` (+${alerts.length - 1})` : ''}`, url: '/admin/prestazioni', read: false, createdAt: new Date().toISOString() }); } catch { /* ignora */ }
  if (mon.webhookUrl) fetch(mon.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text, alerts }) }).catch(() => {});
  if (mon.alertEmail && (await mailConfigured())) await sendMail({ to: mon.alertEmail, subject: `📉 PageSpeed ${s.siteName}`, html: mailLayout(s.siteName, 'Controllo prestazioni', `<ul>${alerts.map((a) => `<li>${a}</li>`).join('')}</ul><p><a href="${siteUrl()}/admin/prestazioni">Apri il pannello Prestazioni</a></p>`) }).catch(() => {});
}

/** Chiamato dal job giornaliero: esegue secondo la frequenza impostata (settimanale = lunedì). */
export async function scheduledAudit(): Promise<string> {
  const s = await performanceSettings();
  if (s.frequency === 'off') return 'disattivato';
  if (s.frequency === 'weekly' && new Date().getUTCDay() !== 1) return 'in attesa di lunedì';
  if (!(await apiKey())) return 'chiave API PageSpeed mancante';
  const r = await auditSite('automatico');
  return `${r.runs.length} misurazioni${r.alerts.length ? `, ${r.alerts.length} avvisi` : ''}${r.errors.length ? `, ${r.errors.length} errori` : ''}`;
}
