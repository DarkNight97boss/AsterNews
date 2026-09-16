import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_UPDATES, UpdatesSettings } from './models';
import { getSettings } from './queries';

export interface UpdateInfo { current: string; commit: string; latest: string; latestDate: string; latestMessage: string; behind: number | null; upToDate: boolean; repo: string; channel: string; error?: string; deployHook: boolean }

export function currentVersion(): { version: string; commit: string } {
  let version = '0.0.0'; try { version = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')).version ?? version; } catch { /* ignore */ }
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? '';
  return { version, commit };
}
export async function updatesSettings(): Promise<UpdatesSettings> { return { ...DEFAULT_UPDATES, ...((await getSettings()).updates ?? {}) }; }

/** Confronta la versione installata con l'ultimo commit del ramo (stable = main, beta = beta) su GitHub. */
export async function checkUpdates(): Promise<UpdateInfo> {
  const s = await updatesSettings(); const { version, commit } = currentVersion();
  const branch = s.channel === 'beta' ? 'beta' : 'main';
  const base: UpdateInfo = { current: version, commit, latest: '', latestDate: '', latestMessage: '', behind: null, upToDate: false, repo: s.repo, channel: s.channel, deployHook: !!s.deployHookUrl };
  try {
    const r = await fetch(`https://api.github.com/repos/${s.repo}/commits/${branch}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ASTERNews' }, signal: AbortSignal.timeout(8000), next: { revalidate: 300 } } as RequestInit);
    if (!r.ok) return { ...base, error: `GitHub: ${r.status}` };
    const d = await r.json() as { sha: string; commit: { message: string; committer: { date: string } } };
    const latest = d.sha.slice(0, 7);
    let behind: number | null = null;
    if (commit && commit !== latest) { const c = await fetch(`https://api.github.com/repos/${s.repo}/compare/${commit}...${branch}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ASTERNews' }, signal: AbortSignal.timeout(8000) }); if (c.ok) behind = Number(((await c.json()) as { ahead_by?: number }).ahead_by ?? 0); }
    return { ...base, latest, latestDate: d.commit.committer.date, latestMessage: d.commit.message.split('\n')[0], behind, upToDate: !commit || commit === latest || behind === 0 };
  } catch (e) { return { ...base, error: (e as Error).message }; }
}
/** Aggiornamento con un clic: chiama il Deploy Hook di Vercel (Impostazioni → Aggiornamenti), che ricostruisce dal ramo scelto. */
export async function triggerDeploy(): Promise<{ ok: boolean; message: string }> {
  const s = await updatesSettings();
  if (!s.deployHookUrl) return { ok: false, message: 'Nessun Deploy Hook configurato: crealo su Vercel (Project → Settings → Git → Deploy Hooks) e incollalo nelle Impostazioni.' };
  const r = await fetch(s.deployHookUrl, { method: 'POST' });
  return r.ok ? { ok: true, message: 'Aggiornamento avviato: il nuovo deploy sarà online tra 1-2 minuti.' } : { ok: false, message: `Deploy Hook: ${r.status}` };
}
