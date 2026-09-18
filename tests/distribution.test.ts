import { describe, expect, it } from 'vitest';
import { aiCrawlerOf, aiSourceOf, buildLlmsTxt, externalLinks, healLinks, pushCap, realTopics, shortForm, underCap, urlKey } from '../src/lib/distribution';

describe('distribuzione', () => {
  it('forma breve: frasi intere, mai oltre il limite, link sempre in fondo', () => {
    const url = 'https://a.it/x'; const s = shortForm('Il ponte chiude', '<p>Da lunedì il ponte sul fiume resta chiuso per lavori urgenti. Il traffico sarà deviato sulla provinciale per tre mesi almeno.</p><p>Una terza frase lunghissima che non ci sta proprio perché supera il limite consentito dal messaggio breve che stiamo componendo adesso per i lettori senza dati e con telefoni vecchi.</p>', url);
    expect(s.length).toBeLessThanOrEqual(306); expect(s.endsWith(url)).toBe(true); expect(s).toContain('resta chiuso per lavori urgenti.'); expect(s).not.toContain('terza frase'); expect(shortForm('T'.repeat(400), '', url).length).toBeLessThanOrEqual(306);
  });
  it('riconosce assistenti AI da referrer, utm e user agent', () => { expect(aiSourceOf('https://chatgpt.com/', '/a')).toBe('chatgpt'); expect(aiSourceOf('', '/a?utm_source=chatgpt.com')).toBe('chatgpt'); expect(aiSourceOf('https://www.perplexity.ai/search', '/a')).toBe('perplexity'); expect(aiSourceOf('https://www.google.com/', '/a')).toBeNull(); expect(aiCrawlerOf('Mozilla/5.0 (compatible; ClaudeBot/1.0)')).toBe('claude'); expect(aiCrawlerOf('Mozilla/5.0 Chrome/120')).toBeNull(); });
  it('llms.txt dice come citare e rispetta la scelta sull\'addestramento', () => { const base = { siteName: 'Aster', tagline: 'Notizie', url: 'https://a.it', sections: [{ name: 'Cronaca', url: 'https://a.it/cronaca' }], notes: '', contact: 'r@a.it', recent: [] }; expect(buildLlmsTxt({ ...base, allowTraining: false })).toContain('non è consentito'); const t = buildLlmsTxt({ ...base, allowTraining: true, notes: 'Siamo una cooperativa.' }); expect(t.startsWith('# Aster')).toBe(true); expect(t).toContain('[Cronaca](https://a.it/cronaca)'); expect(t).toContain('Siamo una cooperativa.'); });
  it('link che invecchiano bene: solo gli esterni, solo i morti, con indicazione', () => {
    const html = '<p><a href="https://morto.it/p">fonte</a> e <a href="https://vivo.it/">altra</a> e <a href="https://a.it/interno">nostro</a></p>'; expect(externalLinks(html, 'www.a.it')).toEqual(['https://morto.it/p', 'https://vivo.it/']);
    const out = healLinks(html, [{ url: 'https://morto.it/p', archived: 'https://web.archive.org/web/2020/https://morto.it/p' }]); expect(out).toContain('href="https://web.archive.org/web/2020/https://morto.it/p"'); expect(out).toContain('(copia archiviata)'); expect(out).toContain('href="https://vivo.it/"'); expect(urlKey('https://x.it')).toBe(urlKey(' https://x.it ')); expect(urlKey('https://x.it')).toMatch(/^arc_[0-9a-f]{24}$/);
  });
  it('tetto di notifiche deciso dal lettore', () => { expect(pushCap(['cat:1', 'max:3'])).toBe(3); expect(pushCap(['cat:1'])).toBeNull(); expect(realTopics(['cat:1', 'max:3'])).toEqual(['cat:1']); expect(underCap(['max:2'], 1)).toBe(true); expect(underCap(['max:2'], 2)).toBe(false); expect(underCap([], 99)).toBe(true); });
});

describe('impronta del testo nel browser', () => {
  it('coincide con quella del server, così l\'editor riconosce un testo cambiato', async () => { const { canonicalHashClient } = await import('../src/lib/text-hash-client'); const { textHash } = await import('../src/lib/trust'); const html = '<p>Ciao&nbsp;<b>mondo</b></p><script>x()</script>'; expect(await canonicalHashClient(' Titolo ', html)).toBe(textHash(' Titolo ', html)); expect(await canonicalHashClient('Titolo', '<p>Altro</p>')).not.toBe(textHash('Titolo', html)); });
});
