'use client';

import { useState, useTransition } from 'react';
import { saveAdSalesAction } from '@/lib/actions-revenue';
import { AD_SLOTS } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

export function AdSalesForm({ initial, orders }: { initial: { enabled: boolean; prices: Record<string, number>; note: string }; orders: { id: string; company: string; email: string; amount: number; days: number; status: string; createdAt: string }[] }) {
  const [c, setC] = useState(initial); const [pending, start] = useTransition();
  return (
    <div className="panel"><div className="panel-title">Vendita online degli spazi (pagina /pubblicita)</div>
      <label className="switch"><input type="checkbox" checked={c.enabled} onChange={(e) => setC({ ...c, enabled: e.target.checked })} /> Gli inserzionisti possono comprare da soli</label>
      <div className="form-row" style={{ marginTop: 8 }}>{AD_SLOTS.map((s) => <div className="field" key={s.id}><label>{s.name} · € al giorno (0 = non in vendita)</label><input className="input" type="number" min={0} step="0.5" value={c.prices[s.id] ?? 0} onChange={(e) => setC({ ...c, prices: { ...c.prices, [s.id]: Number(e.target.value) } })} /></div>)}</div>
      <div className="field"><label>Testo di presentazione</label><textarea className="textarea" style={{ minHeight: 56 }} value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} /></div>
      <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await saveAdSalesAction(c); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Salva listino</button>
      {orders.length > 0 && <table className="table" style={{ marginTop: 12 }}><thead><tr><th>Ordine</th><th>Inserzionista</th><th>Giorni</th><th>Importo</th><th>Stato</th></tr></thead><tbody>{orders.map((o) => <tr key={o.id}><td className="help">{new Date(o.createdAt).toLocaleDateString('it-IT')}</td><td>{o.company}<div className="t-sub">{o.email}</div></td><td>{o.days}</td><td>{o.amount.toFixed(2).replace('.', ',')} €</td><td>{o.status === 'paid' ? <span className="badge badge-green">pagato: attiva l&apos;annuncio qui sopra</span> : <span className="badge badge-gray">in attesa</span>}</td></tr>)}</tbody></table>}
    </div>
  );
}
