import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getSettings } from './queries';
import * as repo from './repo';
import { legacyState } from './personal';
import { button, esc, mailConfigured, mailLayout, sendMail } from './mailer';
import { siteUrl } from './site-url';

/**
 * Testamento digitale ed eredità dei contenuti. Se nessuno della redazione accede per il tempo stabilito:
 *  - congelato: il sito resta leggibile con l'avviso «conservato così com'era», commenti chiusi dal banner;
 *  - affidato: la persona di fiducia riceve le istruzioni per prenderlo in mano;
 *  - archiviato: come congelato, e alla persona di fiducia arriva il link per scaricare tutto in forma statica.
 * Un mese prima parte un avviso al proprietario. Basta un accesso per azzerare tutto.
 */
export async function runLegacyCheck(): Promise<string | null> {
  const s = await getSettings(); const l = s.personal?.legacy; if (!l?.enabled) return null; const users = (await repo.listUsers()).filter((u) => u.active); const last = users.map((u) => u.lastLogin ?? '').sort().pop() || null;
  const state = legacyState(l, last, Date.now()); if (state === 'ok' || state === 'off' || state === 'triggered') return null; const canMail = await mailConfigured();
  if (state === 'warning') { const owner = users.find((u) => u.role === 'admin'); if (owner && canMail && new Date().getDate() % 7 === 0) await sendMail({ to: owner.email, subject: `Non accedi a ${s.siteName} da molto tempo`, html: mailLayout(s.siteName, 'Il tuo sito ti aspetta', `<p>Hai stabilito che dopo ${l.days} giorni senza accessi il sito venga ${l.action === 'handover' ? 'affidato a ' + esc(l.heirName || l.heirEmail) : l.action === 'archive' ? 'archiviato' : 'congelato'}. Manca meno di un mese.</p><p>Basta un accesso per azzerare il conteggio.</p>${button(`${siteUrl()}/login`, 'Accedi')}`) }); return 'avviso di inattività inviato'; }
  await repo.saveSettingsRow({ ...s, personal: { ...(s.personal ?? {}), legacy: { ...l, triggeredAt: new Date().toISOString() } } }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout');
  // Link personale per l'erede: un gettone casuale valido 90 giorni, non un segreto di sistema
  const { randomToken } = await import('./security'); const { addRecord } = await import('./records'); const token = randomToken(24); if (l.action === 'archive') await addRecord('export-token', { id: `xt_${token}`, data: { for: l.heirEmail }, dueAt: new Date(Date.now() + 90 * 86_400_000).toISOString() });
  if (l.heirEmail && canMail) await sendMail({ to: l.heirEmail, subject: `${s.siteName}: un messaggio che ti è stato lasciato`, html: mailLayout(s.siteName, `Per ${esc(l.heirName || 'te')}`, `<p>Chi scriveva <b>${esc(s.siteName)}</b> non accede da più di ${l.days} giorni e ha indicato te come persona di fiducia.</p>${l.message ? `<blockquote style="border-left:3px solid #999;padding-left:12px">${esc(l.message).replace(/\n/g, '<br>')}</blockquote>` : ''}<p>${l.action === 'handover' ? 'Ti viene chiesto di prenderti cura del sito: rispondi a questa email a chi gestisce l\'hosting per ricevere le credenziali, come concordato.' : l.action === 'archive' ? 'Il sito è stato messo in sola lettura. Puoi conservarne una copia completa che si apre senza server:' : 'Il sito è stato messo in sola lettura, con un avviso per chi lo visita.'}</p>${l.action === 'archive' ? button(`${siteUrl()}/api/export/statico?chiave=${token}`, 'Scarica il sito in scatola') : ''}`) });
  return `testamento digitale eseguito (${l.action})`;
}
