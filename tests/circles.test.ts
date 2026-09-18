import { describe, expect, it } from 'vitest';
import { canSeeArticle, filterCircles, stripCircles } from '../src/lib/circles';

const html = '<p>Pubblico.</p><div class="circle-only" data-circle="fam"><p>Segreto di famiglia.</p></div><p>Fine.</p>'; const circles = [{ id: 'fam', name: 'Famiglia' }];
describe('cerchie di lettori', () => {
  it('chi è fuori dalla cerchia non riceve il testo riservato, solo il segnaposto', () => { const out = filterCircles(html, { staff: false, circles: [] }, circles); expect(out).not.toContain('Segreto'); expect(out).toContain('riservata a «Famiglia»'); expect(out).toContain('Pubblico.'); });
  it('chi è nella cerchia lo vede', () => { expect(filterCircles(html, { staff: false, circles: ['fam'] }, circles)).toContain('Segreto di famiglia'); });
  it('lo staff vede tutto con l\'etichetta', () => { expect(filterCircles(html, { staff: true, circles: [] }, circles)).toContain('Solo per «Famiglia»'); });
  it('feed e API non lo contengono mai', () => { expect(stripCircles(html)).toBe('<p>Pubblico.</p><p>Fine.</p>'); });
  it('post interi riservati', () => { expect(canSeeArticle('fam', { staff: false, circles: [] })).toBe(false); expect(canSeeArticle('fam', { staff: false, circles: ['fam'] })).toBe(true); expect(canSeeArticle(undefined, { staff: false, circles: [] })).toBe(true); });
});
