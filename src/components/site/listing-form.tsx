'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { submitListingAction } from '@/lib/actions-listings';
import { LISTING_CATEGORIES, ListingKind } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

interface Props { kind: ListingKind; zones: { id: string; name: string }[]; price: number; free: boolean; moderation: boolean; days: number; reader: { name: string; email: string } | null; notice: string; enabled: boolean }

export function ListingForm({ kind, zones, price, free, moderation, days, reader, notice, enabled }: Props) {
  const [f, setF] = useState({ title: '', body: '', image: '', category: LISTING_CATEGORIES[0], price: '', contactName: reader?.name ?? '', contactEmail: reader?.email ?? '', contactPhone: '', zoneId: '', date: '', funeral: '' });
  const [pending, start] = useTransition();
  const [done, setDone] = useState('');
  const isOb = kind === 'necrologio';
  if (!enabled) return <div className="account"><div className="account-card"><h1>Servizio non disponibile</h1></div></div>;
  if (notice === 'ok') return <div className="account"><div className="account-card"><h1>Pagamento ricevuto</h1><p>Grazie! {moderation ? 'La redazione controllerà il testo e lo pubblicherà a breve.' : 'La tua inserzione è online.'}</p><Link href={isOb ? '/necrologi' : '/annunci'} className="btn btn-primary">Torna agli {isOb ? 'necrologi' : 'annunci'}</Link></div></div>;
  if (done) return <div className="account"><div className="account-card"><h1>Ricevuto</h1><p>{done}</p><Link href={isOb ? '/necrologi' : '/annunci'} className="btn btn-primary">Torna agli {isOb ? 'necrologi' : 'annunci'}</Link></div></div>;
  const submit = () => start(async () => {
    const r = await submitListingAction({ kind, title: f.title, body: f.body, image: f.image, category: isOb ? 'Necrologio' : f.category, price: f.price, contactName: f.contactName, contactEmail: f.contactEmail, contactPhone: f.contactPhone, zoneId: f.zoneId, extra: isOb ? { date: f.date, funeral: f.funeral } : {} });
    if (!r.ok) { toast.error(r.message ?? 'Errore'); return; }
    if (r.checkoutUrl) { location.href = r.checkoutUrl; return; }
    setDone(r.message ?? 'Ricevuto.');
  });
  const readImage = (file: File) => { if (file.size > 2 * 1024 * 1024) { toast.error('Immagine troppo grande (max 2 MB).'); return; } const rd = new FileReader(); rd.onload = () => setF({ ...f, image: String(rd.result) }); rd.readAsDataURL(file); };
  return (
    <div className="account" style={{ maxWidth: 720 }}><div className="account-card">
      <h1>{isOb ? 'Pubblica un necrologio' : 'Pubblica un annuncio'}</h1>
      <p className="lead">{free || price <= 0 ? 'Gratuito' : `Costo ${price.toFixed(2).replace('.', ',')} € (pagamento sicuro con carta)`} · online per {days} giorni{moderation ? ' · pubblicazione dopo il controllo della redazione' : ''}.{notice === 'annullato' && ' Il pagamento è stato annullato: puoi riprovare.'}</p>
      <div className="field"><label>{isOb ? 'Nome e cognome della persona' : 'Titolo'}</label><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={140} /></div>
      {isOb ? <div className="form-row"><div className="field"><label>Data (es. 12 settembre 2026, anni 84)</label><input className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div><div className="field"><label>Esequie (luogo, giorno e ora)</label><input className="input" value={f.funeral} onChange={(e) => setF({ ...f, funeral: e.target.value })} /></div></div>
        : <div className="form-row"><div className="field"><label>Categoria</label><select className="select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{LISTING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div><div className="field"><label>Prezzo (facoltativo)</label><input className="input" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="es. 350 €" /></div></div>}
      <div className="field"><label>{isOb ? 'Testo del necrologio' : 'Descrizione'}</label><textarea className="textarea" style={{ minHeight: 140 }} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={4000} /></div>
      <div className="form-row"><div className="field"><label>Zona</label><select className="select" value={f.zoneId} onChange={(e) => setF({ ...f, zoneId: e.target.value })}><option value="">—</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div><div className="field"><label>Foto (facoltativa)</label><input className="input" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) readImage(file); }} /></div></div>
      <div className="form-row"><div className="field"><label>Nome</label><input className="input" value={f.contactName} onChange={(e) => setF({ ...f, contactName: e.target.value })} /></div><div className="field"><label>Email {isOb ? '(non pubblicata)' : ''}</label><input className="input" type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /></div><div className="field"><label>Telefono {isOb ? '(non pubblicato)' : '(facoltativo)'}</label><input className="input" value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value })} /></div></div>
      <button className="btn btn-primary btn-lg" disabled={pending || !f.title.trim() || f.body.trim().length < 10 || !f.contactEmail} onClick={submit}>{pending ? 'Invio…' : free || price <= 0 ? 'Invia' : `Procedi al pagamento (${price.toFixed(2).replace('.', ',')} €)`}</button>
      <p className="help" style={{ marginTop: 10 }}>Inviando accetti che il testo venga pubblicato e conservato per il periodo indicato. I dati di contatto degli annunci sono visibili ai lettori.</p>
    </div></div>
  );
}
