import 'server-only';
import * as repo from './repo';
import * as x from './repo-extra';
import { all } from './db';
import { DEFAULT_BACKUP, DEFAULT_MONITORING, DEFAULT_NEWSLETTER } from './models';
import { getSettings } from './queries';
import { sendDigest } from './newsletter';
import { mailConfigured, mailLayout, sendMail } from './mailer';
import { siteUrl } from './site-url';

export interface JobReport { job: string; steps: Record<string, string> }

/** Lavori frequenti (ogni minuto se c'è un cron esterno; comunque eseguiti anche dalle richieste normali): pubblicazioni programmate e blocchi scaduti. */
export async function runMinuteJobs(): Promise<JobReport> {
  const steps: Record<string, string> = {};
  await repo.promoteScheduled(); steps.programmati = 'ok';
  const s = await getSettings(); const nl = { ...DEFAULT_NEWSLETTER, ...(s.newsletter ?? {}) };
  const hour = Number(new Date().toLocaleString('it-IT', { hour: 'numeric', hour12: false, timeZone: 'Europe/Rome' }));
  const today = new Date().toISOString().slice(0, 10);
  if (nl.digestEnabled && hour >= nl.digestHour && (await x.lastDigestDay()) !== today) { const r = await sendDigest('digest'); steps.rassegna = r.message; }
  return { job: 'minute', steps };
}

/** Lavori giornalieri: rassegna (se non già inviata), pulizia, backup, controllo salute. */
export async function runDailyJobs(): Promise<JobReport> {
  const steps: Record<string, string> = {};
  const m = await runMinuteJobs(); Object.assign(steps, m.steps);
  await x.purgeSessions(); await x.purgeHits(400); steps.pulizia = 'ok';
  const s = await getSettings();
  const bk = { ...DEFAULT_BACKUP, ...(s.backup ?? {}) };
  if (bk.enabled) { try { const { createBackup, pruneBackups } = await import('./backup'); const r = await createBackup('automatico'); await pruneBackups(bk.keep); steps.backup = r.url ? `salvato (${Math.round(r.size / 1024)} KB)` : 'salvato nel database'; } catch (e) { steps.backup = 'errore: ' + (e as Error).message; } }
  steps.salute = await healthCheck();
  return { job: 'daily', steps };
}

/** Misura la latenza del database e gli errori dell'ultimo giorno; se qualcosa non va avvisa via email o webhook. */
export async function healthCheck(): Promise<string> {
  const s = await getSettings(); const mon = { ...DEFAULT_MONITORING, ...(s.monitoring ?? {}) };
  const t0 = Date.now(); let latency = -1; let dbError = '';
  try { await all('SELECT 1'); latency = Date.now() - t0; } catch (e) { dbError = (e as Error).message; }
  const errors = await x.countErrorsSince(new Date(Date.now() - 86400000).toISOString()).catch(() => 0);
  const problems: string[] = [];
  if (dbError) problems.push(`Database non raggiungibile: ${dbError}`);
  else if (latency > mon.slowQueryMs) problems.push(`Database lento: ${latency} ms (soglia ${mon.slowQueryMs} ms)`);
  if (errors > 20) problems.push(`${errors} errori applicativi nelle ultime 24 ore`);
  if (!problems.length) return `ok (${latency} ms, ${errors} errori/24h)`;
  const text = `${s.siteName}: ${problems.join('; ')}. Dettagli: ${siteUrl()}/admin/errori`;
  if (mon.webhookUrl) fetch(mon.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, content: text, problems }) }).catch(() => {});
  if (mon.alertEmail && (await mailConfigured())) await sendMail({ to: mon.alertEmail, subject: `⚠️ Avviso ${s.siteName}`, html: mailLayout(s.siteName, 'Controllo salute', `<ul>${problems.map((p) => `<li>${p}</li>`).join('')}</ul><p><a href="${siteUrl()}/admin/errori">Apri il registro errori</a></p>`), text });
  return 'avviso inviato: ' + problems.join('; ');
}
