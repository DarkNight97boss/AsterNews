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
  try { const { processQueue } = await import('./social'); const n = await processQueue(20); if (n) steps.social = `${n} post inviati`; } catch (e) { steps.social = 'errore: ' + (e as Error).message; }
  try { const { dueLists, sendList } = await import('./newsletters'); for (const l of await dueLists()) { const r = await sendList(l, 'digest'); steps[`lista ${l.slug}`] = r.message; } } catch (e) { steps.liste = 'errore: ' + (e as Error).message; }
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
  try { const n = await repo.purgeTrash(30); if (n) steps.cestino = `${n} articoli eliminati definitivamente`; } catch { /* ignore */ }
  try { const n = await repo.purgeMediaTrash(30); if (n) steps.cestinoMedia = `${n} file eliminati`; const exp = await repo.mediaRightsExpiring(7); if (exp.length) { const x3 = await import('./repo-extra3'); const admins = (await repo.listUsers()).filter((u) => u.role === 'admin' && u.active); for (const a of admins) await x3.insertNotification({ id: `nt_rights_${a.id}_${new Date().toISOString().slice(0, 10)}`, userId: a.id, kind: 'rights', text: `${exp.length} foto con diritti in scadenza entro 7 giorni: ${exp.slice(0, 3).map((m) => m.name).join(', ')}`, url: '/admin/media', read: false, createdAt: new Date().toISOString() }).catch(() => {}); steps.diritti = `${exp.length} in scadenza`; } } catch { /* ignore */ }
  try { const { checkBrokenLinks } = await import('./broken-links'); steps.link = await checkBrokenLinks(); } catch (e) { steps.link = 'errore: ' + (e as Error).message; }
  try { const { expireListings } = await import('./repo-extra2'); await expireListings(); steps.annunci = 'scadenze aggiornate'; } catch { /* ignore */ }
  try { const { runDailyExtensions } = await import('./extensions'); Object.assign(steps, await runDailyExtensions()); } catch { /* ignore */ }
  try { const { scheduledAudit } = await import('./pagespeed'); steps.pagespeed = await scheduledAudit(); } catch (e) { steps.pagespeed = 'errore: ' + (e as Error).message; }
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
