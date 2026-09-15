'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { calendarArticlesAction, moveScheduleAction } from '@/lib/actions-editorial';
import { Article, STATUS_LABELS } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateOf = (a: Article) => a.scheduledAt ?? a.publishedAt ?? a.deadline ?? null;

export function EditorialCalendar({ categories, users }: { categories: { id: string; name: string; color: string }[]; users: { id: string; name: string }[] }) {
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [items, setItems] = useState<Article[]>([]);
  const [drag, setDrag] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(week); d.setDate(d.getDate() + i); return d; });
  const load = useCallback(() => { const to = new Date(week); to.setDate(to.getDate() + 7); calendarArticlesAction(week.toISOString(), to.toISOString()).then(setItems); }, [week]);
  useEffect(() => { load(); }, [load]);
  const cat = (id: string) => categories.find((c) => c.id === id); const user = (id: string) => users.find((u) => u.id === id)?.name ?? '';
  const drop = (day: Date) => { if (!drag) return; const a = items.find((x) => x.id === drag); setDrag(null); if (!a) return; const prev = dateOf(a) ? new Date(dateOf(a)!) : new Date(); const target = new Date(day); target.setHours(prev.getHours(), prev.getMinutes(), 0, 0); if (target < new Date() && a.status !== 'published') { target.setDate(target.getDate()); } start(async () => { const r = await moveScheduleAction(a.id, target.toISOString()); (r.ok ? toast.success : toast.error)(r.message ?? ''); load(); }); };
  const shift = (n: number) => { const d = new Date(week); d.setDate(d.getDate() + n * 7); setWeek(d); };
  const today = ymd(new Date());
  return (
    <>
      <div className="page-title"><div><h1>Calendario editoriale</h1><p>Settimana del {days[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}. Trascina un articolo su un altro giorno per riprogrammarlo.</p></div>
        <div className="actions"><button className="btn btn-outline btn-sm" onClick={() => shift(-1)}>← Settimana</button><button className="btn btn-outline btn-sm" onClick={() => setWeek(startOfWeek(new Date()))}>Oggi</button><button className="btn btn-outline btn-sm" onClick={() => shift(1)}>Settimana →</button></div></div>
      <div className="calendar" style={{ opacity: pending ? 0.6 : 1 }}>
        {days.map((d, i) => {
          const key = ymd(d);
          const list = items.filter((a) => (dateOf(a) ?? '').slice(0, 10) === key).sort((a, b) => (dateOf(a) ?? '').localeCompare(dateOf(b) ?? ''));
          return (
            <div key={key} className={`cal-day ${key === today ? 'today' : ''} ${drag ? 'droppable' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(d)}>
              <div className="cal-head"><b>{DAYS[i]}</b> {d.getDate()}</div>
              {list.map((a) => (
                <div key={a.id} className={`cal-item st-${a.status}`} draggable onDragStart={() => setDrag(a.id)} onDragEnd={() => setDrag(null)} title={`${STATUS_LABELS[a.status]} · ${user(a.authorId)}`}>
                  <span className="cal-time">{dateOf(a) ? new Date(dateOf(a)!).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  <span className="cal-dot" style={{ background: cat(a.categoryId)?.color }} />
                  <Link href={`/admin/articoli/${a.id}`}>{a.title || '(senza titolo)'}</Link>
                  <small>{STATUS_LABELS[a.status]}{a.assignedTo ? ` · ${user(a.assignedTo)}` : ''}</small>
                </div>
              ))}
              {list.length === 0 && <div className="cal-empty">—</div>}
            </div>
          );
        })}
      </div>
      <p className="help" style={{ marginTop: 12 }}>Legenda: verde pubblicato, blu programmato, grigio bozza con scadenza, arancio in revisione. Gli articoli programmati escono da soli all&apos;ora prevista.</p>
    </>
  );
}
