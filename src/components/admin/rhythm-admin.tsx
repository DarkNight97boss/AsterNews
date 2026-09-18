'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toaster';
import type { RhythmSettings } from '@/lib/models';
import { declareEmergencyAction, saveRhythmAction } from '@/lib/actions-rhythm';

const KEY = 'aster_nometrics_until';
export function NoMetricsToggle() {
  const [until, setUntil] = useState(''); useEffect(() => { try { setUntil(localStorage.getItem(KEY) ?? ''); } catch { /* */ } }, []); const on = until > new Date().toISOString();
  const set = (days: number) => { const v = days ? new Date(Date.now() + days * 86_400_000).toISOString() : ''; try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* */ } setUntil(v); window.dispatchEvent(new Event('aster-nometrics')); };
  return <div className="panel"><div className="panel-title">Niente metriche per una settimana</div><p className="help">Visite, classifiche e percentuali vengono velate su questo dispositivo. Il lavoro resta lo stesso, l&apos;ansia da numeri no. Vale solo per te.</p>{on ? <p><b>Attivo fino al {new Date(until).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}.</b> <button type="button" className="btn btn-ghost btn-sm" onClick={() => set(0)}>Torna a vedere i numeri</button></p> : <div style={{ display: 'flex', gap: 6 }}><button type="button" className="btn btn-outline btn-sm" onClick={() => set(7)}>Vela i numeri per 7 giorni</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => set(30)}>Per un mese</button></div>}</div>;
}
export function EmergencyForm() {
  const [t, setT] = useState(''); const [pending, start] = useTransition();
  return <div className="panel"><div className="panel-title">Dichiarare un&apos;emergenza</div><p className="help">È l&apos;unica notifica che raggiunge i colleghi negli orari di quiete. Usala per una notizia che non può aspettare domattina.</p><div style={{ display: 'flex', gap: 6 }}><input className="input" aria-label="Cosa sta succedendo" placeholder="es. Crollo in via Garibaldi, servono due persone subito" value={t} onChange={(e) => setT(e.target.value)} /><button type="button" className="btn btn-danger btn-sm" disabled={pending || t.trim().length < 10} onClick={() => start(async () => { const r = await declareEmergencyAction(t); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) setT(''); })}>🚨 Dichiara</button></div></div>;
}
export function RhythmForm({ initial }: { initial: RhythmSettings }) {
  const [r, setR] = useState<RhythmSettings>({ maxOpen: 6, hourlyRate: 0, rpm: 0, subscriptionValue: 0, ...initial }); const [pending, start] = useTransition(); const router = useRouter(); const n = (k: keyof RhythmSettings, label: string, hint: string) => <div className="field"><label htmlFor={`rh-${k}`}>{label}</label><input id={`rh-${k}`} className="input" type="number" min={0} step="any" value={(r[k] as number | undefined) ?? 0} onChange={(e) => setR({ ...r, [k]: Number(e.target.value) })} /><span className="help">{hint}</span></div>;
  return <div className="panel"><div className="panel-title">Regole della casa</div><div className="form-row"><div className="field"><label htmlFor="rh-from">Quiete dalle</label><input id="rh-from" className="input" type="time" value={r.quietFrom ?? ''} onChange={(e) => setR({ ...r, quietFrom: e.target.value })} /></div><div className="field"><label htmlFor="rh-to">alle</label><input id="rh-to" className="input" type="time" value={r.quietTo ?? ''} onChange={(e) => setR({ ...r, quietTo: e.target.value })} /></div></div><p className="help">In questi orari la campanella diventa una luna e non mostra niente, tranne le emergenze dichiarate.</p>
    <div className="form-row">{n('maxOpen', 'Pezzi aperti a testa, al massimo', 'oltre questa soglia scatta l\'avviso di sovraccarico')}{n('hourlyRate', 'Costo di un\'ora di lavoro (€)', 'serve al costo reale degli articoli')}</div><div className="form-row">{n('rpm', 'Ricavo pubblicitario per 1000 visite (€)', 'una stima tua, non un dato che inventiamo noi')}{n('subscriptionValue', 'Valore di un abbonamento (€)', 'quanto vale in media un abbonato nel tempo')}</div>
    <button type="button" className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const x = await saveRhythmAction(r); (x.ok ? toast.success : toast.error)(x.message ?? ''); router.refresh(); })}>Salva</button></div>;
}
