'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from './auth';
import * as repo from './repo';
import * as x2 from './repo-extra2';
import { SocialNetwork, SocialPost } from './models';
import { bestHour, configuredNetworks, enqueue, processQueue, socialSettings, suggestText } from './social';
import type { ActionResult } from './actions';

export async function socialStatusAction(): Promise<{ networks: SocialNetwork[]; auto: SocialNetwork[]; bestHour: number | null }> {
  await requirePermission('article.publish');
  const s = await socialSettings();
  return { networks: configuredNetworks(s), auto: s.autoNetworks, bestHour: await bestHour() };
}
export async function suggestSocialAction(articleId: string, network: SocialNetwork): Promise<{ text: string; url: string; image: string } | null> {
  await requirePermission('article.publish'); const a = await repo.findArticle(articleId); return a ? suggestText(a, network) : null;
}
/** Mette in coda (o invia subito) un articolo sulle reti scelte, con testo personalizzato e orario. */
export async function shareArticleAction(articleId: string, networks: SocialNetwork[], text: string, scheduledAt: string | null): Promise<ActionResult> {
  const me = await requirePermission('article.publish');
  const a = await repo.findArticle(articleId); if (!a) return { ok: false, message: 'Articolo non trovato.' };
  if (a.status !== 'published' && !scheduledAt) return { ok: false, message: 'Pubblica prima l\'articolo (o programma la condivisione).' };
  const s = await socialSettings(); const ok = configuredNetworks(s); const chosen = networks.filter((n) => ok.includes(n));
  if (!chosen.length) return { ok: false, message: 'Nessuna rete configurata tra quelle scelte (Impostazioni → Social).' };
  await enqueue(a, chosen, me.id, scheduledAt, text);
  const sent = scheduledAt ? 0 : await processQueue(chosen.length);
  await repo.insertActivity({ id: 'ac_' + Math.random().toString(36).slice(2, 10), userId: me.id, action: scheduledAt ? 'ha programmato la condivisione di' : 'ha condiviso sui social', target: a.title, articleId: a.id, createdAt: new Date().toISOString() });
  revalidatePath('/admin/social');
  return { ok: true, message: scheduledAt ? `Programmato su ${chosen.length} reti.` : `Inviato su ${sent} di ${chosen.length} reti.` };
}
export async function listSocialAction(): Promise<SocialPost[]> { await requirePermission('article.publish'); return x2.listSocialPosts(100); }
export async function retrySocialAction(id: string): Promise<ActionResult> { await requirePermission('article.publish'); await x2.updateSocialPost(id, { status: 'queued', result: '', scheduledAt: null }); const n = await processQueue(5); revalidatePath('/admin/social'); return { ok: n > 0, message: n ? 'Inviato.' : 'Invio fallito di nuovo: controlla il messaggio di errore.' }; }
export async function deleteSocialAction(id: string): Promise<ActionResult> { await requirePermission('article.publish'); await x2.deleteSocialPost(id); revalidatePath('/admin/social'); return { ok: true, message: 'Rimosso.' }; }
export async function runSocialQueueAction(): Promise<ActionResult> { await requirePermission('article.publish'); const n = await processQueue(50); revalidatePath('/admin/social'); return { ok: true, message: `${n} post inviati.` }; }
