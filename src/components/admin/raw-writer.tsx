'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitRawArticleAction } from '@/lib/actions';
import { Category, MediaItem } from '@/lib/models';
import { toast } from '@/components/ui/toaster';
import { MediaPicker } from './media-picker';

export function RawWriter({ categories, media, canPublish }: { categories: Category[]; media: MediaItem[]; canPublish: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [cover, setCover] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [picker, setPicker] = useState(false);
  const [pending, start] = useTransition();
  const [report, setReport] = useState<string[] | null>(null);
  const wordsN = text.trim() ? text.trim().split(/\s+/).length : 0;
  const submit = (publish: boolean) => start(async () => {
    const r = await submitRawArticleAction({ title, text, coverImage: cover || undefined, categoryId: categoryId || undefined, publish });
    if (!r.ok) { toast.error(r.message ?? 'Errore'); return; }
    toast.success(r.message ?? 'Fatto');
    setReport(r.report ?? []);
    if (r.id) setTimeout(() => router.push(`/admin/articoli/${r.id}`), 1800);
  });
  return (
    <>
      <div className="page-title">
        <div><h1>Scrivi un articolo</h1><p>Scrivi come ti viene: titolo e testo. Al resto (titoletti, occhiello, sommario, categoria, tag, parole chiave, meta, link interni, copertina) pensa il sistema.</p></div>
        <div className="actions"><Link href="/admin/articoli/nuovo" className="btn btn-ghost">Editor completo</Link></div>
      </div>
      <div className="editor-grid">
        <div>
          <div className="panel">
            <textarea className="title-input" rows={2} style={{ resize: 'none', lineHeight: 1.2 }} placeholder="Titolo (se lo lasci vuoto lo ricavo dalla prima frase)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea className="textarea raw-text" placeholder={'Incolla o scrivi qui il testo.\n\nSepara i paragrafi con una riga vuota. Se scrivi una riga breve senza punto finale, diventa un titoletto.'} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="help" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{wordsN} parole {wordsN < 300 && wordsN > 0 && '· consigliate almeno 300'}</span><span>Puoi incollare anche da Word o da una pagina web.</span></div>
          </div>
          {report && (
            <div className="panel"><div className="panel-title">Cosa ha fatto il sistema</div><ul className="seo-report">{report.map((r, i) => <li key={i}>{r}</li>)}</ul><p className="help">Ti porto nell'editor per controllare e, se vuoi, correggere.</p></div>
          )}
        </div>
        <aside className="editor-side">
          <div className="panel">
            <div className="panel-title">Invia</div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 8 }} disabled={pending || wordsN < 40} onClick={() => submit(false)}>{pending ? 'Ottimizzo…' : '✨ Ottimizza e invia in revisione'}</button>
            {canPublish && <button className="btn btn-success btn-lg" style={{ width: '100%' }} disabled={pending || wordsN < 40} onClick={() => submit(true)}>{pending ? 'Ottimizzo…' : '🚀 Ottimizza e pubblica subito'}</button>}
            <p className="help" style={{ marginTop: 10 }}>Servono almeno 40 parole. L'articolo passa dal motore SEO: struttura, meta, tag, categoria, link interni.</p>
          </div>
          <div className="panel cover-picker">
            <div className="panel-title">Foto (facoltativa)</div>
            <div className="cover-preview">{cover ? <img src={cover} alt="" /> : 'Se non la scegli, il sistema ne propone una'}</div>
            <div className="cover-actions"><button className="btn btn-outline btn-sm" onClick={() => setPicker(true)}>Scegli o carica</button>{cover && <button className="btn btn-ghost btn-sm" onClick={() => setCover('')}>Rimuovi</button>}</div>
          </div>
          <div className="panel">
            <div className="panel-title">Categoria (facoltativa)</div>
            <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Lascia decidere al sistema</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
        </aside>
      </div>
      {picker && <MediaPicker media={media} onPick={(m) => { setCover(m.url); setPicker(false); router.refresh(); }} onClose={() => setPicker(false)} />}
    </>
  );
}
