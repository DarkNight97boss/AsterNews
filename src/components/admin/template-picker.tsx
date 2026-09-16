'use client';

import { ARTICLE_TEMPLATES, type ArticleTemplate } from '@/lib/article-templates';

export function TemplatePicker({ onPick }: { onPick: (t: ArticleTemplate) => void }) {
  return (
    <div className="panel template-picker"><div className="panel-title">Parti da un modello <span className="help">(facoltativo)</span></div>
      <div className="template-grid">{ARTICLE_TEMPLATES.map((t) => <button key={t.id} type="button" className="template-card" onClick={() => onPick(t)}><b>{t.name}</b><span>{t.description}</span></button>)}</div>
    </div>
  );
}
