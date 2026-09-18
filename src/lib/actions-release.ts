'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from './auth';
import * as repo from './repo';
import { getSettings } from './queries';
import { uid } from './utils';
import type { ActionResult } from './actions';

const vercel = async () => { const s = await getSettings(); return { token: s.updates?.vercelToken || process.env.VERCEL_TOKEN || '', project: s.updates?.vercelProjectId || process.env.VERCEL_PROJECT_ID || '' }; };
/** Pubblica i commit locali (git push) e, se configurato, chiama il Deploy Hook. Solo su richiesta esplicita dalla pagina Rilascio. */
export async function releaseNowAction(): Promise<ActionResult> {
  const me = await requirePermission('settings.manage'); const { pushRelease, releaseState } = await import('./release');
  const st = await releaseState(); if (!st.local) return { ok: false, message: 'Disponibile solo dall\'installazione locale.' };
  if (!st.pending.length) return { ok: false, message: 'Niente da rilasciare.' }; if (st.dirty) return { ok: false, message: 'Ci sono file non ancora in un commit.' };
  if (!st.check?.ok || st.check.commit !== st.head) return { ok: false, message: 'Esegui prima i controlli pre-rilascio sull\'ultimo commit (npm run release:check).' };
  const r = await pushRelease(); if (!r.ok) return r;
  let extra = ''; const s = await getSettings(); if (s.updates?.deployHookUrl) { try { const h = await fetch(s.updates.deployHookUrl, { method: 'POST' }); extra = h.ok ? ' Deploy avviato.' : ` Deploy Hook: ${h.status}.`; } catch { extra = ' Deploy Hook non raggiungibile.'; } }
  await repo.insertActivity({ id: uid('ac'), userId: me.id, action: `ha rilasciato ${st.pending.length} commit in`, target: 'produzione', createdAt: new Date().toISOString() });
  revalidatePath('/admin/rilascio'); return { ok: true, message: `${st.pending.length} commit pubblicati.${extra}` };
}
export async function rollbackAction(deploymentId: string): Promise<ActionResult> {
  const me = await requirePermission('settings.manage'); const { token, project } = await vercel(); if (!token || !project) return { ok: false, message: 'Token o ID progetto Vercel mancanti (Impostazioni → Sistema).' };
  try { const r = await fetch(`https://api.vercel.com/v10/projects/${project}/promote/${deploymentId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) return { ok: false, message: `Vercel ha rifiutato (${r.status}): ${(await r.text()).slice(0, 140)}` };
    await repo.insertActivity({ id: uid('ac'), userId: me.id, action: 'ha ripristinato la produzione alla versione', target: deploymentId.slice(0, 12), createdAt: new Date().toISOString() }); revalidatePath('/admin/rilascio'); return { ok: true, message: 'Ripristino avviato: la versione scelta torna in produzione in pochi secondi.' };
  } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function saveMaintenanceAction(m: { enabled: boolean; message: string }): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings();
  await repo.saveSettingsRow({ ...s, maintenance: { enabled: !!m.enabled, message: m.message.slice(0, 400) } }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout');
  return { ok: true, message: m.enabled ? 'Manutenzione attiva: i lettori vedono la pagina di cortesia.' : 'Manutenzione disattivata.' };
}
export async function saveAiBudgetAction(b: { monthlyBudget: number; priceIn: number; priceOut: number }): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings(); const n = (v: number) => Math.max(0, Number(v) || 0);
  await repo.saveSettingsRow({ ...s, ai: { ...(s.ai ?? {}), monthlyBudget: n(b.monthlyBudget), priceIn: n(b.priceIn), priceOut: n(b.priceOut) } as typeof s.ai }); revalidateTag('settings', 'max'); revalidatePath('/admin/ai-uso');
  return { ok: true, message: 'Tetto e prezzi salvati.' };
}
