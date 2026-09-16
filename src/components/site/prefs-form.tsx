'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { savePrefsAction } from '@/lib/actions-readers';
import { toast } from '@/components/ui/toaster';

type Opt = { id: string; name: string };
export function PrefsForm({ prefs, zones, categories, tags }: { prefs: { zones: string[]; tags: string[]; categories: string[] }; zones: Opt[]; categories: Opt[]; tags: Opt[] }) {
  const router = useRouter(); const [p, setP] = useState(prefs); const [pending, start] = useTransition();
  const toggle = (k: 'zones' | 'tags' | 'categories', id: string) => setP({ ...p, [k]: p[k].includes(id) ? p[k].filter((x) => x !== id) : [...p[k], id] });
  const Group = ({ k, title, items }: { k: 'zones' | 'tags' | 'categories'; title: string; items: Opt[] }) => <div className="widget"><h4 className="widget-title">{title}</h4><div className="chips">{items.map((i) => <button key={i.id} type="button" className="chip" style={p[k].includes(i.id) ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => toggle(k, i.id)}>{i.name}</button>)}</div></div>;
  return <div className="prefs-form"><Group k="zones" title="Le mie zone" items={zones} /><Group k="categories" title="Categorie" items={categories} /><Group k="tags" title="Argomenti" items={tags} /><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await savePrefsAction(p); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva preferenze</button></div>;
}
