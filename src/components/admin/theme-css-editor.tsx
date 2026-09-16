'use client';

import { useRef, useState, useTransition } from 'react';
import { restoreThemeVersionAction, saveCustomCssAction } from '@/lib/actions-system';
import { toast } from '@/components/ui/toaster';

/** CSS personalizzato con anteprima live (iframe della home) e versioni del tema ripristinabili. */
export function ThemeCssEditor({ initialCss, versions }: { initialCss: string; versions: { id: string; at: string; label: string }[] }) {
  const [css, setCss] = useState(initialCss); const [pending, start] = useTransition(); const frame = useRef<HTMLIFrameElement>(null);
  const preview = () => { const doc = frame.current?.contentDocument; if (!doc) return; let st = doc.getElementById('aster-custom-css'); if (!st) { st = doc.createElement('style'); st.id = 'aster-custom-css'; doc.head.appendChild(st); } st.textContent = css; };
  return (
    <div className="panel"><div className="panel-title">CSS personalizzato e versioni del tema</div>
      <div className="css-editor">
        <div><textarea className="textarea" style={{ minHeight: 260, fontFamily: 'monospace', fontSize: 12 }} value={css} onChange={(e) => setCss(e.target.value)} onBlur={preview} placeholder={':root { --brand: #0a4; }\n.card-title { letter-spacing: -.02em; }'} spellCheck={false} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="btn btn-outline btn-sm" onClick={preview}>Anteprima</button><button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await saveCustomCssAction(css); (r.ok ? toast.success : toast.error)(r.message ?? ''); frame.current?.contentWindow?.location.reload(); })}>Salva CSS (crea versione)</button></div>
        </div>
        <iframe ref={frame} src="/?preview=1" title="Anteprima" className="css-preview" onLoad={preview} />
      </div>
      {versions.length > 0 && <div style={{ marginTop: 12 }}><b style={{ fontSize: 13 }}>Versioni salvate</b><ul className="activity">{versions.map((v) => <li key={v.id}><span>🕒</span><div>{v.label} <span className="help">· {new Date(v.at).toLocaleString('it-IT')}</span> <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const r = await restoreThemeVersionAction(v.id); (r.ok ? toast.success : toast.error)(r.message ?? ''); location.reload(); })}>Ripristina</button></div></li>)}</ul></div>}
    </div>
  );
}
