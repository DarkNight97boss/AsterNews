import { createHash } from 'node:crypto';
import type { Article, ArticleKindLabel, VerificationState } from './models';

/** Fiducia e trasparenza: etichetta «nutrizionale» dell'articolo, stato di verifica, impronta del testo per la firma. Solo funzioni pure. */
export const KIND_LABELS: Record<ArticleKindLabel, { name: string; hint: string }> = {
  cronaca: { name: 'Cronaca', hint: 'Fatti riportati, senza il punto di vista di chi scrive.' }, analisi: { name: 'Analisi', hint: 'Fatti più interpretazione, con gli argomenti in chiaro.' },
  opinione: { name: 'Opinione', hint: 'Il punto di vista di chi firma.' }, inchiesta: { name: 'Inchiesta', hint: 'Lavoro originale su documenti e fonti dirette.' },
  comunicato: { name: 'Comunicato', hint: 'Testo diffuso da un ente o un\'azienda, ripreso dalla redazione.' }, intervista: { name: 'Intervista', hint: 'Le parole sono dell\'intervistato.' }, satira: { name: 'Satira', hint: 'Non è una notizia: è uno scherzo dichiarato.' },
};
export const VERIFY_LABELS: Record<VerificationState, { name: string; hint: string; tone: 'ok' | 'warn' | 'bad' }> = {
  confirmed: { name: 'Confermato', hint: 'I fatti principali sono verificati da fonti dirette.', tone: 'ok' }, developing: { name: 'In evoluzione', hint: 'La vicenda è in corso: il testo può cambiare.', tone: 'warn' },
  unverified: { name: 'Non ancora verificato', hint: 'Riportiamo una notizia che non abbiamo potuto confermare in modo indipendente.', tone: 'warn' }, denied: { name: 'Smentito', hint: 'La notizia riportata è stata smentita: leggi le correzioni.', tone: 'bad' },
};
export interface NutritionLabel { kind: string; kindHint: string; sources: number; verified: number; docs: number; onSite: boolean; revisions: number; days: number; ai: boolean; corrections: number; sponsored: boolean }
export function nutritionLabel(a: Pick<Article, 'extra' | 'sponsored' | 'createdAt' | 'publishedAt'>, revisions: number): NutritionLabel | null {
  const e = a.extra ?? {}; if (!e.label?.kind) return null; const k = KIND_LABELS[e.label.kind]; const src = e.sources ?? [];
  const days = a.publishedAt && a.createdAt ? Math.max(0, Math.round((+new Date(a.publishedAt) - +new Date(a.createdAt)) / 86_400_000)) : 0;
  return { kind: k.name, kindHint: k.hint, sources: src.filter((s) => s.name.trim()).length, verified: src.filter((s) => s.verified).length, docs: e.label.docs ?? 0, onSite: !!e.label.onSite, revisions, days, ai: (e.aiUsed ?? []).length > 0, corrections: (e.corrections ?? []).length, sponsored: !!a.sponsored };
}
/** Testo canonico: titolo + corpo senza markup né spazi ripetuti. Due testi uguali per il lettore hanno la stessa impronta. */
export function canonicalText(title: string, html: string): string { return `${title.trim()}\n${html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()}`; }
export const textHash = (title: string, html: string): string => createHash('sha256').update(canonicalText(title, html)).digest('hex');
/** Storie lasciate a metà: pubblicate con qualcosa di dichiaratamente aperto e ferme da troppo tempo. */
export function isAbandoned(a: Pick<Article, 'extra' | 'updatedAt' | 'status'>, now: number, days = 30): boolean {
  if (a.status !== 'published') return false; const e = a.extra ?? {}; const open = e.verification?.state === 'developing' || e.verification?.state === 'unverified' || (e.openQuestions ?? []).length > 0;
  return open && now - +new Date(a.updatedAt) > days * 86_400_000;
}
/** Punteggio delle previsioni: giuste 1, in parte 0,5, sbagliate 0. */
export function predictionScore(outcomes: string[]): { total: number; right: number; partial: number; wrong: number; percent: number | null } {
  const right = outcomes.filter((o) => o === 'right').length, partial = outcomes.filter((o) => o === 'partial').length, wrong = outcomes.filter((o) => o === 'wrong').length, total = right + partial + wrong;
  return { total, right, partial, wrong, percent: total ? Math.round(((right + partial * 0.5) / total) * 100) : null };
}
