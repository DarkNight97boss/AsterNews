import 'server-only';
import type { Article } from './models';
import { getCategories, getSettings } from './queries';
import { listRecords, addRecord, updateRecord } from './records';
import { insertNotification } from './repo-extra3';
import { uid } from './utils';
import { findReader } from './repo-extra';
import { button, esc, mailConfigured, mailLayout, sendMail } from './mailer';
import { siteUrl } from './site-url';

/** Registra che un lettore con account ha aperto l'articolo: serve solo ad avvisarlo se poi lo correggiamo. */
export async function recordRead(readerId: string, articleId: string): Promise<void> { try { await addRecord('read', { id: `rd_${readerId}_${articleId}`.slice(0, 120), ref: articleId, owner: readerId, data: {} }); } catch { /* non blocca la lettura */ } }
/** Correzione recapitata: chi aveva letto la versione sbagliata riceve la rettifica, una sola volta per correzione. */
export async function notifyCorrectionToReaders(a: Article): Promise<number> {
  const c = a.extra?.corrections?.[a.extra.corrections.length - 1]; if (!c || !(await mailConfigured())) return 0;
  const [reads, s, cats] = await Promise.all([listRecords('read', { ref: a.id, limit: 2000 }), getSettings(), getCategories()]); const url = `${siteUrl()}/${cats.find((k) => k.id === a.categoryId)?.slug ?? 'notizie'}/${a.slug}`;
  let sent = 0;
  for (const r of reads) { const reader = await findReader(r.owner); if (!reader?.email) continue; const res = await sendMail({ to: reader.email, subject: `Abbiamo corretto un articolo che hai letto`, html: mailLayout(s.siteName, 'Una correzione che ti riguarda', `<p>Hai letto <b>${esc(a.title)}</b>. Dopo la pubblicazione abbiamo corretto il testo:</p><blockquote style="border-left:3px solid #d7262d;padding-left:12px;margin:12px 0">${esc(c.text)}</blockquote><p>Te lo scriviamo perché chi ha letto un errore ha diritto a leggere anche la rettifica.</p>${button(url, 'Leggi la versione corretta')}`) }); if (res.ok) sent++; }
  return sent;
}
/** Promemoria giornaliero: promesse e previsioni arrivate a scadenza diventano una notifica per chi le ha registrate (una volta sola). */
export async function remindDueCommitments(): Promise<number> {
  let n = 0; const now = new Date().toISOString();
  for (const kind of ['promise', 'prediction'] as const) for (const r of await listRecords<{ text: string; reminded?: boolean }>(kind, { status: 'open', dueBefore: now })) {
    if (r.data.reminded || !r.owner) continue;
    await insertNotification({ id: uid('nf'), userId: r.owner, kind: 'review', text: `${kind === 'promise' ? 'Promessa ai lettori in scadenza' : 'Previsione da verificare'}: «${r.data.text.slice(0, 90)}»`, url: '/admin/fiducia', read: false, createdAt: now });
    await updateRecord(r.id, { data: { ...r.data, reminded: true } }); n++;
  }
  return n;
}
