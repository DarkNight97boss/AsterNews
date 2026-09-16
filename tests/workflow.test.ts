import { describe, expect, it } from 'vitest';
import { applyRules, canApproveStage, findMentions, inHomeWindow, workflowOf } from '../src/lib/workflow';
import type { Article, SiteSettings } from '../src/lib/models';

const art = (p: Partial<Article> = {}): Article => ({ id: 'a1', slug: 's', kicker: '', title: 'Derby finito 2-2', subtitle: '', excerpt: '', content: '', coverImage: '', coverCaption: '', categoryId: 'sport', tagIds: [], authorId: 'u1', zoneId: '', address: '', status: 'published', format: 'video', videoUrl: 'https://v', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true, seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: null, scheduledAt: null, createdAt: '', updatedAt: '', ...p });
const settings = { workflow: { desks: [{ id: 'd1', name: 'Sport', categoryIds: ['sport'], userIds: ['u2'] }], steps: ['desk', 'caporedattore'], rules: [{ id: 'r1', name: 'Sport con video', enabled: true, if: { categoryId: 'sport', hasVideo: true }, then: { featured: true, social: ['telegram'] } }, { id: 'r2', name: 'spenta', enabled: false, if: {}, then: { breaking: true } }] } } as unknown as SiteSettings;

describe('regole automatiche', () => {
  it('applica solo le regole attive che combaciano', () => {
    const r = applyRules(workflowOf(settings), art());
    expect(r.article.featured).toBe(true); expect(r.article.breaking).toBe(false); expect(r.social).toEqual(['telegram']); expect(r.applied).toEqual(['Sport con video']);
    expect(applyRules(workflowOf(settings), art({ categoryId: 'cronaca' })).applied).toEqual([]);
  });
});
describe('fasi di approvazione', () => {
  it('il desk approva la sua fase, il caporedattore tutte, l\'autore nessuna', () => {
    const w = workflowOf(settings);
    expect(canApproveStage(w, 0, { id: 'u2', role: 'author' }, art())).toBe(true);
    expect(canApproveStage(w, 0, { id: 'u9', role: 'author' }, art())).toBe(false);
    expect(canApproveStage(w, 1, { id: 'u2', role: 'author' }, art())).toBe(false);
    expect(canApproveStage(w, 1, { id: 'u3', role: 'editor' }, art())).toBe(true);
  });
});
describe('menzioni e finestra home', () => {
  it('riconosce @nome e @nome.cognome', () => {
    const users = [{ id: '1', name: 'Giulia Ferrante', email: 'giulia@x.it' }, { id: '2', name: 'Marco Vitali', email: 'mvitali@x.it' }];
    expect(findMentions('ciao @giulia e @mvitali, vedete?', users).map((m) => m.id)).toEqual(['1', '2']);
    expect(findMentions('@marco.vitali ok', users).map((m) => m.id)).toEqual(['2']);
  });
  it('rispetta la finestra in home', () => {
    expect(inHomeWindow(art({ extra: { slots: { homeTo: '2020-01-01T00:00:00.000Z' } } }), '2026-01-01T00:00:00.000Z')).toBe(false);
    expect(inHomeWindow(art({ extra: { slots: { homeFrom: '2020-01-01T00:00:00.000Z' } } }), '2026-01-01T00:00:00.000Z')).toBe(true);
    expect(inHomeWindow(art())).toBe(true);
  });
});
