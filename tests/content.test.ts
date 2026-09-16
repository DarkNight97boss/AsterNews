import { describe, expect, it } from 'vitest';
import { cleanPastedHtml, hasBlockElements } from '../src/lib/paste-clean';
import { chartSvg, csvToTable, parseChartData } from '../src/lib/chart-svg';

describe('incolla da Word', () => {
  it('toglie stili, span e classi e tiene grassetti, titoli e liste', () => {
    const out = cleanPastedHtml('<p class="MsoNormal" style="margin:0"><span style="font-family:Calibri">Ciao <b>mondo</b></span></p><h1>Titolo</h1><p class="MsoListParagraph">· Uno</p><p class="MsoListParagraph">· Due</p>');
    expect(out).toContain('<p>Ciao <b>mondo</b></p>'); expect(out).toContain('<h2>Titolo</h2>'); expect(out).toContain('<ul><li>Uno</li><li>Due</li></ul>'); expect(out).not.toContain('style=');
    expect(hasBlockElements(out)).toBe(true);
  });
  it('tiene solo link sicuri', () => {
    expect(cleanPastedHtml('<a href="javascript:alert(1)">x</a> <a href="https://a.it">ok</a>')).toBe('x <a href="https://a.it">ok</a>');
  });
});
describe('grafici e tabelle', () => {
  it('genera un SVG con i dati e la tabella accessibile', () => {
    const d = parseChartData('Gennaio, 10\nFebbraio; 12,5');
    expect(d.labels).toEqual(['Gennaio', 'Febbraio']); expect(d.values).toEqual([10, 12.5]);
    const svg = chartSvg('bar', d.labels, d.values, 'Test');
    expect(svg).toContain('<svg'); expect(svg).toContain('chart-data'); expect(svg).toContain('Febbraio');
  });
  it('converte CSV in tabella', () => { expect(csvToTable('a;b\n1;2')).toBe('<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>'); });
});
