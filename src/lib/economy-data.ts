import 'server-only';
import { listRecords, updateRecord } from './records';
import { listDonations } from './repo-extra3';
import { donationsFor, marker } from './economy';
import type { Fund } from './actions-economy';

export async function listFunds() { const [funds, donations] = await Promise.all([listRecords<Fund>('fund', { limit: 50, order: 'old' }), listDonations(2000)]); return funds.map((r) => { const d = donationsFor(donations, marker('inchiesta', r.data.slug)); return { id: r.id, ...r.data, raised: r.data.raised + d.total, donors: d.count }; }); }
export async function coffeesFor(articleId: string) { return donationsFor(await listDonations(2000), marker('caffè', articleId)); }
/** Offerte di lavoro: un'email al giorno agli iscritti con le offerte nuove del loro settore (una sola volta per offerta). */
export async function sendJobAlerts(): Promise<string> {
  const { mailConfigured, sendMail, mailLayout, esc, button } = await import('./mailer'); if (!(await mailConfigured())) return ''; const { getSettings } = await import('./queries'); const { siteUrl } = await import('./site-url'); const s = await getSettings();
  const jobs = (await listRecords<Record<string, string>>('lavoro', { status: 'approved', limit: 200 })).filter((j) => !j.data.notified); if (!jobs.length) return ''; const subs = await listRecords<{ email: string; category: string }>('lavoro-avviso', { status: 'approved', limit: 5000 }); let sent = 0;
  for (const sub of subs) { const mine = jobs.filter((j) => sub.data.category === 'Tutti' || j.data.category === sub.data.category); if (!mine.length) continue; const r = await sendMail({ to: sub.data.email, subject: `${mine.length === 1 ? 'Nuova offerta di lavoro' : `${mine.length} nuove offerte di lavoro`} · ${s.siteName}`, html: mailLayout(s.siteName, 'Offerte di lavoro in zona', `<ul>${mine.map((j) => `<li><b>${esc(j.data.role)}</b> · ${esc(j.data.company)} (${esc(j.data.category)})</li>`).join('')}</ul>${button(`${siteUrl()}/lavoro`, 'Vedi le offerte')}<p style="font-size:12px;color:#888">Ricevi questa email perché ti sei iscritto agli avvisi per «${esc(sub.data.category)}».</p>`) }); if (r.ok) sent++; }
  for (const j of jobs) await updateRecord(j.id, { data: { ...j.data, notified: new Date().toISOString() } }); return sent ? `${sent} avvisi di lavoro inviati` : '';
}
