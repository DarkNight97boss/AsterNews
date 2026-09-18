import 'server-only';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { all, isServerless } from './db';

const sh = promisify(execFile);
const git = async (...args: string[]): Promise<string> => { try { return (await sh('git', args, { cwd: process.cwd(), timeout: 15_000 })).stdout.trim(); } catch { return ''; } };

export interface ReleaseState { local: boolean; branch: string; pending: { hash: string; subject: string; date: string }[]; dirty: number; check: { at: string; commit: string; ok: boolean; fast: boolean; results: { name: string; ok: boolean; seconds: number; summary: string }[] } | null; head: string }
/** Stato del rilascio: commit locali non ancora pubblicati, file modificati, esito dell'ultimo controllo pre-rilascio. Solo in locale (su Vercel non c'è git). */
export async function releaseState(): Promise<ReleaseState> {
  if (isServerless()) return { local: false, branch: '', pending: [], dirty: 0, check: null, head: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? '' };
  const [branch, log, status, head] = await Promise.all([git('rev-parse', '--abbrev-ref', 'HEAD'), git('log', 'origin/main..HEAD', '--pretty=%h%x09%s%x09%cI'), git('status', '--porcelain'), git('rev-parse', '--short', 'HEAD')]);
  let check: ReleaseState['check'] = null; try { check = JSON.parse(await readFile(path.join(process.cwd(), 'data', 'release-check.json'), 'utf8')); } catch { check = null; }
  return { local: true, branch, head, dirty: status ? status.split('\n').length : 0, pending: log ? log.split('\n').map((l) => { const [hash, subject, date] = l.split('\t'); return { hash, subject, date }; }) : [], check };
}
/** Pubblica i commit locali: git push su main (il collegamento GitHub di Vercel o il Deploy Hook fanno partire il deploy). */
export async function pushRelease(): Promise<{ ok: boolean; message: string }> {
  if (isServerless()) return { ok: false, message: 'Il rilascio da qui funziona solo dall\'installazione locale.' };
  try { const r = await sh('git', ['push', 'origin', 'HEAD:main'], { cwd: process.cwd(), timeout: 120_000 }); return { ok: true, message: (r.stderr || r.stdout).trim().split('\n').slice(-1)[0] || 'Commit pubblicati su GitHub.' }; } catch (e) { return { ok: false, message: (e as Error).message.slice(0, 300) }; }
}
export interface MigrationRow { id: string; stmt: string; ok: boolean; error: string; appliedAt: string }
export const migrationsLog = async (limit = 300): Promise<MigrationRow[]> => ((await all('SELECT * FROM schema_migrations ORDER BY applied_at DESC, id LIMIT ?', [limit])) as Record<string, unknown>[]).map((r) => ({ id: String(r.id), stmt: String(r.stmt ?? ''), ok: !!r.ok, error: String(r.error ?? ''), appliedAt: String(r.applied_at ?? '') }));

/** Ultimi deploy di produzione su Vercel (per il ripristino con un clic). */
export async function productionDeployments(token: string, project: string): Promise<{ uid: string; url: string; createdAt: number; commit: string; message: string; current: boolean }[]> {
  const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${project}&target=production&state=READY&limit=8`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }); const j = await r.json() as { deployments?: { uid: string; url: string; createdAt: number; meta?: Record<string, string> }[]; error?: { message: string } };
  if (j.error) throw new Error(j.error.message);
  return (j.deployments ?? []).map((d, i) => ({ uid: d.uid, url: d.url, createdAt: d.createdAt, commit: (d.meta?.githubCommitSha ?? '').slice(0, 7), message: d.meta?.githubCommitMessage?.split('\n')[0] ?? '', current: i === 0 }));
}
