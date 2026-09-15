'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from './auth';
import { createBackup, pruneBackups } from './backup';
import { insertActivity } from './repo';
import { deleteBackupRow } from './repo-extra';
import { CACHE_TAGS } from './cache';
import { uid } from './utils';
import type { ActionResult } from './actions';

export async function createBackupAction(): Promise<ActionResult> {
  const me = await requirePermission('settings.manage');
  try {
    const r = await createBackup('manuale');
    await insertActivity({ id: uid('ac'), userId: me.id, action: 'ha creato un backup di', target: `${Math.round(r.size / 1024)} KB`, createdAt: new Date().toISOString() });
    revalidatePath('/admin/backup');
    return { ok: true, message: r.url ? 'Backup salvato nello storage.' : 'Backup salvato nel database (nessuno storage esterno configurato).' };
  } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function deleteBackupAction(id: string): Promise<ActionResult> { await requirePermission('settings.manage'); await deleteBackupRow(id); revalidatePath('/admin/backup'); return { ok: true, message: 'Backup rimosso dall\'elenco.' }; }
export async function pruneBackupsAction(keep: number): Promise<ActionResult> { await requirePermission('settings.manage'); await pruneBackups(keep); revalidatePath('/admin/backup'); return { ok: true, message: `Conservati gli ultimi ${keep} backup.` }; }
export async function afterRestoreAction(): Promise<void> { await requirePermission('settings.manage'); for (const t of Object.values(CACHE_TAGS)) revalidateTag(t, 'max'); revalidatePath('/', 'layout'); }

// ---------------- Errori e salute ----------------
export async function clearErrorsAction(): Promise<ActionResult> { await requirePermission('settings.manage'); const { clearErrors } = await import('./repo-extra'); await clearErrors(); revalidatePath('/admin/errori'); return { ok: true, message: 'Registro svuotato.' }; }
export async function runHealthCheckAction(): Promise<ActionResult> { await requirePermission('settings.manage'); const { healthCheck } = await import('./jobs'); const r = await healthCheck(); return { ok: !r.startsWith('avviso'), message: `Controllo salute: ${r}` }; }
