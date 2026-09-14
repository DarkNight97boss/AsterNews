'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteReportAction, updateReportAction } from '@/lib/actions';
import { REPORT_STATUS_LABELS, Report, ReportStatus, Zone } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

const CLS: Record<string, string> = { new: 'badge-amber', progress: 'badge-blue', published: 'badge-green', archived: 'badge-dark' };

export function ReportsManager({ reports, zones }: { reports: Report[]; zones: Zone[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<ReportStatus | ''>('new');
  const [editing, setEditing] = useState<Report | null>(null);
  const [pending, start] = useTransition();
  const counts: Record<string, number> = { new: 0, progress: 0, published: 0, archived: 0 };
  reports.forEach((r) => counts[r.status]++);
  const list = reports.filter((r) => !filter || r.status === filter);
  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? '—';
  const save = () => start(async () => { const r = await updateReportAction(editing!.id, { status: editing!.status, reply: editing!.reply, subject: editing!.subject, body: editing!.body }); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setEditing(null); router.refresh(); } });
  return (
    <>
      <div className="page-title"><div><h1>Segnalazioni</h1><p>Le segnalazioni dei lettori: verifica, rispondi e pubblica.</p></div></div>
      <div className="filters">
        {(['new', 'progress', 'published', 'archived'] as ReportStatus[]).map((s) => <button key={s} className={`btn btn-sm ${filter === s ? 'btn-dark' : 'btn-outline'}`} onClick={() => setFilter(s)}>{REPORT_STATUS_LABELS[s]} ({counts[s]})</button>)}
        <button className={`btn btn-sm ${filter === '' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setFilter('')}>Tutte</button>
      </div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th style={{ width: 70 }}></th><th>Segnalazione</th><th>Zona</th><th>Lettore</th><th>Stato</th><th></th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td>{r.image ? <img className="t-thumb" src={r.image} alt="" /> : <div className="t-thumb" />}</td>
              <td className="t-title">{r.subject}<div className="t-sub">{r.body.slice(0, 120)}{r.body.length > 120 && '…'}{r.reply && <><br /><b>Risposta:</b> {r.reply.slice(0, 80)}</>}</div></td>
              <td>{zoneName(r.zoneId)}</td>
              <td style={{ fontSize: 13 }}>{r.name}<div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{r.email}<br />{formatDate(r.createdAt)}</div></td>
              <td><span className={`badge ${CLS[r.status]}`}>{REPORT_STATUS_LABELS[r.status]}</span></td>
              <td><div className="t-actions">
                {r.status === 'new' && <ActionButton className="btn btn-outline btn-sm" action={() => updateReportAction(r.id, { status: 'progress' })}>Prendi in carico</ActionButton>}
                {r.status !== 'published' && <ActionButton className="btn btn-success btn-sm" action={() => updateReportAction(r.id, { status: 'published' })}>Pubblica</ActionButton>}
                <button className="icon-btn" title="Modifica / rispondi" onClick={() => setEditing({ ...r })}>✎</button>
                <ActionButton className="icon-btn danger" confirm="Eliminare la segnalazione?" action={() => deleteReportAction(r.id)}>🗑</ActionButton>
              </div></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={6}><div className="empty"><h3>Nessuna segnalazione</h3></div></td></tr>}
        </tbody></table></div>
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head"><h3>Segnalazione di {editing.name}</h3><button className="icon-btn" onClick={() => setEditing(null)}>✕</button></div>
          <div className="modal-body">
            {editing.image && <img src={editing.image} alt="" style={{ maxHeight: 220, marginBottom: 12 }} />}
            <div className="field"><label>Oggetto</label><input className="input" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></div>
            <div className="field"><label>Testo</label><textarea className="textarea" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
            <div className="field"><label>Risposta della redazione (pubblicata)</label><textarea className="textarea" value={editing.reply} onChange={(e) => setEditing({ ...editing, reply: e.target.value })} /></div>
            <div className="field"><label>Stato</label><select className="select" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as ReportStatus })}>{(Object.keys(REPORT_STATUS_LABELS) as ReportStatus[]).map((s) => <option key={s} value={s}>{REPORT_STATUS_LABELS[s]}</option>)}</select></div>
            <p className="help">Zona: {zoneName(editing.zoneId)} · Email: {editing.email}</p>
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Annulla</button><button className="btn btn-primary" disabled={pending} onClick={save}>Salva</button></div>
        </div></div>
      )}
    </>
  );
}
