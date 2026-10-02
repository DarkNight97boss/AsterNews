import type { Metadata } from 'next';
import { listArticles } from '@/lib/repo';
import { getTags, getZones } from '@/lib/queries';
import { guessTitle, seedOf, wordSearch } from '@/lib/school';
import { GuessTitle } from '@/components/site/guess-title';

export const metadata: Metadata = { title: 'I giochi del giornale', description: 'Parole nascoste e «indovina il titolo», generati dagli articoli della settimana con nomi e luoghi della città.' };
export const revalidate = 3600;
export default async function GamesPage() {
  const from = new Date(Date.now() - 7 * 86_400_000).toISOString(); const [arts, tags, zones] = await Promise.all([listArticles({ status: 'published', from }, 'views', 30), getTags(), getZones()]); const week = new Date().toISOString().slice(0, 10).replace(/-\d{2}$/, ''); const seed = seedOf(week + arts.map((a) => a.id).join(''));
  const used = new Set(arts.flatMap((a) => a.tagIds)); const words = [...tags.filter((t) => used.has(t.id)).map((t) => t.name), ...zones.map((z) => z.name)].map((w) => w.split(/\s+/).sort((a, b) => b.length - a.length)[0]).filter((w) => w.length >= 4);
  const ws = wordSearch(words.length >= 6 ? words : [...words, 'giornale', 'notizia', 'quartiere', 'comune', 'piazza', 'mercato'], seed); const cell = 28; const quiz = guessTitle(arts.map((a) => ({ title: a.title, excerpt: a.excerpt || a.subtitle })), seed);
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page games"><h1>I giochi del giornale</h1><p className="lead">Nuovi ogni settimana, fatti con i nomi e i luoghi degli articoli. Stampabili.</p>
    <h2>Parole nascoste</h2><p className="help">Trova: {ws.placed.map((p) => p.word).join(', ')}. In orizzontale, verticale e diagonale, anche al contrario.</p>
    <svg className="ws" viewBox={`0 0 ${ws.size * cell} ${ws.size * cell}`} role="img" aria-label="Griglia delle parole nascoste">{ws.grid.map((row, r) => row.map((ch, c) => <g key={`${r}-${c}`}><rect x={c * cell} y={r * cell} width={cell} height={cell} fill="#fff" stroke="#ddd" /><text x={c * cell + cell / 2} y={r * cell + cell / 2 + 6} textAnchor="middle" fontSize={16} fontFamily="monospace">{ch}</text></g>))}</svg>
    <details><summary>Soluzione</summary><ul>{ws.placed.map((p) => <li key={p.word}>{p.word}: riga {p.row + 1}, colonna {p.col + 1}, {p.dr === 0 ? 'orizzontale' : p.dc === 0 ? 'verticale' : 'diagonale'}{p.dr < 0 || p.dc < 0 ? ' al contrario' : ''}</li>)}</ul></details>
    <h2>Indovina il titolo</h2>{quiz.length === 0 ? <p className="help">Servono almeno tre articoli con sommario.</p> : <GuessTitle quiz={quiz} />}
  </div></div>;
}
