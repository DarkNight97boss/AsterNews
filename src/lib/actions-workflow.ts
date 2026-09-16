'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentUser, requirePermission, requireUser } from './auth';
import * as repo from './repo';
import * as x3 from './repo-extra3';
import { DEFAULT_WORKFLOW, type Contact, type WorkflowSettings } from './models';
import { getSettings } from './queries';
import { canApproveStage, workflowOf } from './workflow';
import { uid } from './utils';
import type { ActionResult } from './actions';

export async function saveWorkflowAction(w: WorkflowSettings): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings();
  const clean: WorkflowSettings = { ...DEFAULT_WORKFLOW, desks: w.desks.filter((d) => d.name.trim()).slice(0, 30).map((d) => ({ id: d.id || uid('dk'), name: d.name.trim().slice(0, 40), categoryIds: d.categoryIds ?? [], userIds: d.userIds ?? [] })), steps: w.steps.map((x) => x.trim()).filter(Boolean).slice(0, 6), rules: w.rules.filter((r) => r.name.trim()).slice(0, 50).map((r) => ({ ...r, id: r.id || uid('rl') })) };
  await repo.saveSettingsRow({ ...s, workflow: clean }); revalidateTag('settings', 'max'); revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Flusso di lavoro salvato.' };
}
/** Approva la fase corrente e passa alla successiva; all'ultima fase l'articolo è pronto per la pubblicazione. */
export async function advanceStageAction(articleId: string): Promise<ActionResult & { stage?: number }> {
  const me = await requireUser(); const a = await repo.findArticle(articleId); if (!a) return { ok: false, message: 'Articolo non trovato.' };
  const w = workflowOf(await getSettings()); const stage = a.extra?.stage ?? 0;
  if (stage >= w.steps.length) return { ok: true, message: 'Già approvato in tutte le fasi.', stage };
  if (!canApproveStage(w, stage, me, a)) return { ok: false, message: `Non puoi approvare la fase «${w.steps[stage]}».` };
  const next = stage + 1; const extra = { ...(a.extra ?? {}), stage: next };
  await repo.patchArticle(articleId, { extra: JSON.stringify(extra), updated_at: new Date().toISOString() });
  await repo.insertActivity({ id: uid('ac'), userId: me.id, action: `ha approvato la fase «${w.steps[stage]}» di`, target: a.title, articleId, createdAt: new Date().toISOString() });
  try { const n = await import('./repo-extra-notify'); await n.notifyPublishers(me, `${me.name} ha approvato «${a.title}» (${w.steps[stage]})${next >= w.steps.length ? ': pronto per la pubblicazione' : ` → ora tocca a «${w.steps[next]}»`}`, `/admin/articoli/${articleId}`); } catch { /* ignora */ }
  revalidatePath(`/admin/articoli/${articleId}`); revalidatePath('/admin/redazione');
  return { ok: true, message: next >= w.steps.length ? 'Approvato: pronto per la pubblicazione.' : `Passato alla fase «${w.steps[next]}».`, stage: next };
}
export async function resetStageAction(articleId: string): Promise<ActionResult> {
  await requirePermission('article.publish'); const a = await repo.findArticle(articleId); if (!a) return { ok: false, message: 'Articolo non trovato.' };
  await repo.patchArticle(articleId, { extra: JSON.stringify({ ...(a.extra ?? {}), stage: 0 }) }); revalidatePath(`/admin/articoli/${articleId}`); return { ok: true, message: 'Flusso riportato alla prima fase.' };
}

// ---------------- Rubrica contatti ----------------
export async function saveContactAction(c: Contact): Promise<ActionResult> {
  const me = await requireUser(); if (!c.name.trim()) return { ok: false, message: 'Il nome è obbligatorio.' };
  const id = c.id || uid('ct'); await x3.upsertContact({ ...c, id, name: c.name.trim().slice(0, 100), createdBy: c.createdBy || me.id, updatedAt: new Date().toISOString() });
  revalidatePath('/admin/contatti'); return { ok: true, message: 'Contatto salvato.', id };
}
export async function deleteContactAction(id: string): Promise<ActionResult> { const me = await requireUser(); const c = await x3.findContact(id); if (!c) return { ok: false, message: 'Non trovato.' }; if (c.createdBy !== me.id && !['admin', 'editor'].includes(me.role)) return { ok: false, message: 'Puoi eliminare solo i contatti che hai creato.' }; await x3.deleteContact(id); revalidatePath('/admin/contatti'); return { ok: true, message: 'Contatto eliminato.' }; }
export async function searchContactsAction(q: string): Promise<Contact[]> { if (!(await getCurrentUser())) return []; return x3.listContacts(q, 50); }

export async function workflowInfoAction(): Promise<{ steps: string[]; desks: { id: string; name: string }[] }> { if (!(await getCurrentUser())) return { steps: [], desks: [] }; const w = workflowOf(await getSettings()); return { steps: w.steps, desks: w.desks.map((d) => ({ id: d.id, name: d.name })) }; }
