import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { metaGet, metaSet } from './db';

type G = typeof globalThis & { __asterInstalled?: { at: number; value: boolean } };
const g = globalThis as G;

/** Vero quando l'installazione guidata è stata completata (chiave meta.installed). Cache di 60 s per istanza. */
export const isInstalled = cache(async (): Promise<boolean> => {
  if (process.env.SETUP_DISABLED === '1') return true; // installazione guidata disattivata dall'ambiente
  if (g.__asterInstalled && g.__asterInstalled.value && Date.now() - g.__asterInstalled.at < 60_000) return true;
  const v = !!(await metaGet('installed'));
  g.__asterInstalled = { at: Date.now(), value: v };
  return v;
});
export async function markInstalled(): Promise<void> { await metaSet('installed', new Date().toISOString()); g.__asterInstalled = { at: Date.now(), value: true }; }
/** Da chiamare nei layout pubblici e del CMS: se il sito non è installato manda all'installazione guidata. */
export async function ensureInstalled(): Promise<void> { if (!(await isInstalled())) redirect('/setup'); }
