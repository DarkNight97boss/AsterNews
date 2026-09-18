'use client';
import { useEffect, useRef, useState } from 'react';
import { co2Grams, co2Rating, isNight } from '@/lib/rhythm';
import { readEndAction } from '@/lib/actions-rhythm';
import { ATTENTION_KEY, type AttentionEntry } from './attention-tracker';
import { fairPrice } from '@/lib/rhythm';

const ECO_KEY = 'aster_eco';
/** Bilancio di CO₂ della pagina (dal peso realmente trasferito) e modalità a basso consumo: automatica di notte e con «risparmio dati», sempre disattivabile. */
export function EcoBadge() {
  const [grams, setGrams] = useState<number | null>(null); const [eco, setEco] = useState(false);
  useEffect(() => {
    let pref = ''; try { pref = localStorage.getItem(ECO_KEY) ?? ''; } catch { /* */ } const saveData = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData; const on = pref === 'on' || (pref !== 'off' && (isNight(new Date().getHours()) || !!saveData)); setEco(on);
    const measure = () => { const entries = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')] as PerformanceResourceTiming[]; const bytes = entries.reduce((n, e) => n + (e.transferSize || 0), 0); if (bytes > 0) setGrams(co2Grams(bytes)); }; const t = setTimeout(measure, 2500); return () => clearTimeout(t);
  }, []);
  useEffect(() => { if (eco) document.documentElement.dataset.eco = '1'; else delete document.documentElement.dataset.eco; }, [eco]);
  const toggle = () => { const next = !eco; setEco(next); try { localStorage.setItem(ECO_KEY, next ? 'on' : 'off'); } catch { /* */ } };
  return <p className="eco-badge">{grams !== null && <span title="Stima secondo il modello Sustainable Web Design: byte trasferiti × 0,81 kWh/GB × 442 g/kWh">🌱 Questa pagina: <b>{grams.toFixed(2).replace('.', ',')} g</b> di CO₂ · classe {co2Rating(grams)}</span>} <button type="button" className="linklike" aria-pressed={eco} onClick={toggle}>{eco ? 'Basso consumo attivo: disattiva' : 'Attiva il basso consumo'}</button></p>;
}
export function ReadEnd({ articleId }: { articleId: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; const started = Date.now(); const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && Date.now() - started > 15_000) { io.disconnect(); try { if (sessionStorage.getItem(`end_${articleId}`)) return; sessionStorage.setItem(`end_${articleId}`, '1'); } catch { /* */ } readEndAction(articleId).catch(() => {}); } }); io.observe(el); return () => io.disconnect(); }, [articleId]);
  return <span ref={ref} aria-hidden="true" />;
}
/** Prezzo libero sensato: suggerisce una cifra da quanto leggi davvero (i minuti restano nel browser) e dice chiaro che puoi pagare meno. */
export function FairPrice({ full }: { full: number }) {
  const [p, setP] = useState<{ suggested: number; label: string; minutes: number } | null>(null);
  useEffect(() => { try { const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10); const rows = (JSON.parse(localStorage.getItem(ATTENTION_KEY) ?? '[]') as AttentionEntry[]).filter((r) => r.day >= from); const minutes = Math.round(rows.reduce((n, r) => n + r.sec, 0) / 60); setP({ ...fairPrice(minutes, full), minutes }); } catch { /* */ } }, [full]);
  if (!p) return null; const euro = (n: number) => n.toFixed(2).replace('.', ',').replace(',00', '') + ' €';
  return <div className="fair-price"><b>Quanto è giusto per te?</b><p>Nell&apos;ultimo mese su questo dispositivo hai letto circa {p.minutes} minuti: {p.label}. Il prezzo che ti suggeriamo è <b>{euro(p.suggested)} al mese</b> (quello pieno è {euro(full)}).</p><p className="help">Puoi pagare meno, o di più: decidi tu. Il conto dei minuti resta nel tuo browser, a noi non arriva.</p></div>;
}
