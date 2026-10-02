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

describe('diario privato', () => {
  it('i passaggi «solo io» spariscono senza traccia per i lettori, restano per chi scrive', async () => {
    const { filterCircles, stripCircles } = await import('../src/lib/circles'); const html = '<p>Pubblico.</p><div class="circle-only" data-circle="__me"><p>Pensiero mio.</p></div>';
    expect(filterCircles(html, { staff: false, circles: [] }, [])).toBe('<p>Pubblico.</p>'); expect(filterCircles(html, { staff: true, circles: [] }, [])).toContain('Pensiero mio.'); expect(stripCircles(html)).toBe('<p>Pubblico.</p>');
  });
});

describe('blocchi riservati con div annidati', () => {
  it('un riquadro dentro un passaggio riservato non fa uscire il resto del testo', async () => {
    const { filterCircles, stripCircles } = await import('../src/lib/circles');
    const html = '<p>Pubblico.</p><div class="circle-only" data-circle="__me"><div class="box"><b>Da sapere</b><p>appunto</p></div><p>Il vero segreto</p></div><p>Coda pubblica.</p>';
    expect(filterCircles(html, { staff: false, circles: [] }, [])).toBe('<p>Pubblico.</p><p>Coda pubblica.</p>'); expect(stripCircles(html)).toBe('<p>Pubblico.</p><p>Coda pubblica.</p>');
    expect(filterCircles(html, { staff: true, circles: [] }, [])).toContain('Il vero segreto');
    const fam = '<div class="circle-only" data-circle="fam"><div class="layered"><div data-depth="1">breve</div></div><p>Segreto</p></div><p>Fine</p>';
    expect(filterCircles(fam, { staff: false, circles: [] }, [{ id: 'fam', name: 'Famiglia' }])).toBe('<p class="circle-locked">🔒 Una parte di questo testo è riservata a «Famiglia».</p><p>Fine</p>'); expect(filterCircles(fam, { staff: false, circles: ['fam'] }, [{ id: 'fam', name: 'Famiglia' }])).toContain('Segreto');
    expect(stripCircles('<div class="circle-only" data-circle="__me"><p>mai chiuso')).toBe('');
  });
});
