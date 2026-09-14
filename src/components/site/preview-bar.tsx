import { applyThemeFromPreviewAction, clearThemePreviewAction } from '@/lib/actions';

export function PreviewBar({ themeName }: { themeName: string }) {
  return (
    <div className="preview-bar">
      <span>👁 Anteprima tema <b>{themeName}</b>: la vedi solo tu. Il sito pubblico usa ancora il tema salvato.</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <form action={applyThemeFromPreviewAction}><button className="btn btn-dark btn-sm" type="submit">Applica a tutto il sito</button></form>
        <form action={clearThemePreviewAction}><button className="btn btn-outline btn-sm" type="submit">Esci dall&apos;anteprima</button></form>
      </div>
    </div>
  );
}
