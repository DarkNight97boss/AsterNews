'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from './auth';
import * as repo from './repo';
import { DEFAULT_EXTENSIONS } from './models';
import { getSettings } from './queries';
import { triggerDeploy } from './updates';
import { uid } from './utils';
import type { ActionResult } from './actions';

export async function triggerDeployAction(): Promise<ActionResult> {
  const me = await requirePermission('settings.manage');
  const r = await triggerDeploy();
  if (r.ok) await repo.insertActivity({ id: uid('ac'), userId: me.id, action: 'ha avviato un aggiornamento del', target: 'sito', createdAt: new Date().toISOString() });
  return r;
}
export async function toggleExtensionAction(id: string, enabled: boolean): Promise<ActionResult> {
  const me = await requirePermission('settings.manage');
  const s = await getSettings(); const ext = { ...DEFAULT_EXTENSIONS, ...(s.extensions ?? {}) };
  ext.enabled = enabled ? [...new Set([...ext.enabled, id])] : ext.enabled.filter((x) => x !== id);
  await repo.saveSettingsRow({ ...s, extensions: ext });
  await repo.insertActivity({ id: uid('ac'), userId: me.id, action: enabled ? 'ha attivato l\'estensione' : 'ha disattivato l\'estensione', target: id, createdAt: new Date().toISOString() });
  revalidateTag('settings', 'max'); revalidatePath('/admin/estensioni');
  return { ok: true, message: enabled ? 'Estensione attivata.' : 'Estensione disattivata.' };
}
export async function saveExtensionConfigAction(id: string, config: Record<string, string>): Promise<ActionResult> {
  await requirePermission('settings.manage');
  const s = await getSettings(); const ext = { ...DEFAULT_EXTENSIONS, ...(s.extensions ?? {}) };
  ext.config = { ...ext.config, [id]: config };
  await repo.saveSettingsRow({ ...s, extensions: ext });
  revalidateTag('settings', 'max'); revalidatePath('/admin/estensioni');
  return { ok: true, message: 'Configurazione salvata.' };
}
