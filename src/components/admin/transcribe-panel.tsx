'use client';

import { useState, useTransition } from 'react';
import { transcribeAction } from '@/lib/actions-ai';
import { toast } from '@/components/ui/toaster';

/** Trascrizione di audio/video (interviste, conferenze stampa, consigli comunali) con inserimento nel testo. */
export function TranscribePanel({ onInsert }: { onInsert: (html: string) => void }) {
  const [url, setUrl] = useState(''); const [mode, setMode] = useState<'testo' | 'verbale' | 'articolo'>('testo'); const [pending, start] = useTransition();
  return (
    <div className="panel"><div className="panel-title">Trascrizione audio/video</div>
      <input className="input" placeholder="URL pubblico del file (mp3, m4a, mp4, wav)" value={url} onChange={(e) => setUrl(e.target.value)} />
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}><select className="select" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}><option value="testo">Solo trascrizione</option><option value="verbale">Verbale (conferenza, consiglio)</option><option value="articolo">Bozza di articolo</option></select><button className="btn btn-outline btn-sm" disabled={pending || !url} onClick={() => start(async () => { const r = await transcribeAction(url, mode); if (r.ok && r.data) { onInsert(r.data); toast.success('Trascrizione inserita in fondo al testo.'); } else toast.error(r.message ?? 'Errore'); })}>{pending ? 'Trascrivo… (può volerci qualche minuto)' : 'Trascrivi'}</button></div>
      <p className="help" style={{ marginTop: 6 }}>Provider e chiave in Impostazioni → Assistente AI. Il file deve essere raggiungibile online (Libreria media, Drive pubblico, sito).</p>
    </div>
  );
}
