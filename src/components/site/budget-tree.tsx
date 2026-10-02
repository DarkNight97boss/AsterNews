import type { BudgetNode } from '@/lib/civic';

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
/** Bilancio come albero cliccabile; `prev` dà la variazione rispetto all'anno precedente per le voci con lo stesso nome. */
export function BudgetTree({ tree, prev, years, year }: { tree: BudgetNode[]; prev?: BudgetNode[]; years: string[]; year: string }) {
  const diff = (n: BudgetNode, side?: BudgetNode) => { const p = side?.children.find((x) => x.name === n.name); if (!p || !p.amount) return null; const d = ((n.amount - p.amount) / p.amount) * 100; return <span className={`budget-diff ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>{d > 0 ? '+' : ''}{d.toFixed(1)}% sul {Number(year) - 1}</span>; };
  return <div className="budget"><p className="help">Anno: {years.map((y) => <a key={y} href={`/citta?anno=${y}`} aria-current={y === year ? 'page' : undefined} className="year-link">{y}</a>)}</p>
    {tree.map((side) => { const pside = prev?.find((x) => x.name === side.name); return <details key={side.name} open><summary><b>{side.name}</b> <span>{euro(side.amount)}</span></summary><ul>{side.children.map((v) => <li key={v.name}><details><summary>{v.name} <span>{euro(v.amount)} · {Math.round((v.amount / Math.max(1, side.amount)) * 100)}% {diff(v, pside)}</span><span className="funding-bar"><span style={{ width: `${(v.amount / Math.max(1, side.amount)) * 100}%` }} /></span></summary>{v.children.length > 0 && <ul>{v.children.map((s, i) => <li key={i} className="budget-leaf">{s.name} <span>{euro(s.amount)}</span></li>)}</ul>}</details></li>)}</ul></details>; })}</div>;
}
