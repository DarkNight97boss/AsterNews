'use client';

import { useState, useTransition } from 'react';
import { submitReportAction } from '@/lib/actions';
import { toast } from '@/components/ui/toaster';

export function ReportForm({ zones }: { zones: { id: string; name: string }[] }) {
  const [f, setF] = useState({ name: '', email: '', zoneId: '', subject: '', body: '', image: '' });
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const onFile = (file?: File) => { if (!file) return; if (file.size > 1.5 * 1024 * 1024) { toast.error('Immagine troppo grande (max 1,5 MB).'); return; } const r = new FileReader(); r.onload = () => set('image', r.result as string); r.readAsDataURL(file); };
  return (
    <form style={{ paddingTop: 10 }} onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await submitReportAction(f); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) setF({ name: '', email: '', zoneId: '', subject: '', body: '', image: '' }); }); }}>
      <div className="field"><label>Nome *</label><input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required /></div>
      <div className="field"><label>Email * (non pubblicata)</label><input className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} required /></div>
      <div className="field"><label>Zona</label><select className="select" value={f.zoneId} onChange={(e) => set('zoneId', e.target.value)}><option value="">Seleziona...</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
      <div className="field"><label>Oggetto *</label><input className="input" value={f.subject} onChange={(e) => set('subject', e.target.value)} required /></div>
      <div className="field"><label>Descrizione *</label><textarea className="textarea" value={f.body} onChange={(e) => set('body', e.target.value)} required /></div>
      <div className="field"><label>Foto (facoltativa)</label><input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />{f.image && <img src={f.image} alt="" style={{ marginTop: 8, maxHeight: 120 }} />}</div>
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: '100%' }}>Invia segnalazione</button>
    </form>
  );
}
