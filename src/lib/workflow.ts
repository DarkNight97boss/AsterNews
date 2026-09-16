import type { Article, SiteSettings, WorkflowRule, WorkflowSettings } from './models';
import { DEFAULT_WORKFLOW } from './models';

/** Desk, fasi di approvazione e regole automatiche: funzioni pure, usate da azioni e pagine. */
export const workflowOf = (s: SiteSettings): WorkflowSettings => ({ ...DEFAULT_WORKFLOW, ...(s.workflow ?? {}) });
export const deskFor = (w: WorkflowSettings, a: Pick<Article, 'categoryId' | 'authorId'>) => w.desks.find((d) => d.categoryIds.includes(a.categoryId)) ?? w.desks.find((d) => d.userIds.includes(a.authorId));
export const stageLabel = (w: WorkflowSettings, stage: number): string => (stage >= w.steps.length ? 'Pronto per la pubblicazione' : w.steps[stage] ?? '');
/** Chi può approvare la fase corrente: admin sempre; caporedattore tutte tranne «legale»; membri del desk la fase «desk». */
export function canApproveStage(w: WorkflowSettings, stage: number, user: { id: string; role: string }, a: Pick<Article, 'categoryId' | 'authorId'>): boolean {
  const step = (w.steps[stage] ?? '').toLowerCase(); if (user.role === 'admin') return true;
  if (step.includes('legal')) return false;
  if (step.includes('desk')) { const d = deskFor(w, a); return !!d && d.userIds.includes(user.id) || user.role === 'editor'; }
  return user.role === 'editor';
}
export function ruleMatches(r: WorkflowRule, a: Article): boolean {
  const c = r.if; if (c.categoryId && c.categoryId !== a.categoryId) return false; if (c.format && c.format !== a.format) return false; if (c.tagId && !a.tagIds.includes(c.tagId)) return false;
  if (c.hasVideo && !(a.videoUrl || a.format === 'video')) return false; if (c.zoneId && c.zoneId !== a.zoneId) return false; if (c.titleContains && !a.title.toLowerCase().includes(c.titleContains.toLowerCase())) return false;
  return true;
}
/** Applica le regole «se… allora…» alla pubblicazione. Restituisce l'articolo modificato e le reti social da usare in più. */
export function applyRules(w: WorkflowSettings, a: Article): { article: Article; social: string[]; applied: string[] } {
  const out = { ...a }; const social = new Set<string>(); const applied: string[] = [];
  for (const r of w.rules) {
    if (!r.enabled || !ruleMatches(r, a)) continue; applied.push(r.name);
    if (r.then.featured) out.featured = true; if (r.then.breaking) out.breaking = true; if (r.then.premium) out.premium = true;
    if (r.then.tagId && !out.tagIds.includes(r.then.tagId)) out.tagIds = [...out.tagIds, r.then.tagId];
    if (r.then.kicker && !out.kicker) out.kicker = r.then.kicker;
    for (const n of r.then.social ?? []) social.add(n);
  }
  return { article: out, social: [...social], applied };
}
/** L'articolo può stare in home adesso? (finestra multi-slot facoltativa) */
export function inHomeWindow(a: Article, now = new Date().toISOString()): boolean { const s = a.extra?.slots; if (!s) return true; if (s.homeFrom && s.homeFrom > now) return false; if (s.homeTo && s.homeTo < now) return false; return true; }
/** Trova le menzioni @nome in un testo e restituisce gli utenti corrispondenti (per nome o parte dell'email). */
export function findMentions(text: string, users: { id: string; name: string; email: string }[]): { id: string; name: string }[] {
  const out = new Map<string, { id: string; name: string }>();
  for (const m of text.matchAll(/@([\p{L}\d._-]+)/gu)) {
    const q = m[1].toLowerCase().replace(/[.\s]+$/, '');
    for (const u of users) { const first = u.name.toLowerCase().split(' ')[0]; const full = u.name.toLowerCase().replace(/\s+/g, '.'); const local = u.email.toLowerCase().split('@')[0]; if (q === first || q === full || q === local || u.name.toLowerCase() === q.replace('.', ' ')) out.set(u.id, { id: u.id, name: u.name }); }
  }
  return [...out.values()];
}
