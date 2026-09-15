'use client';

import Form from 'next/form';
import { useEffect, useState } from 'react';

/** Campo di ricerca con suggerimenti mentre si digita (tag e titoli) e filtri per categoria e periodo. */
export function SearchBox({ q, categories, categoryId, from, to }: { q: string; categories: { id: string; name: string }[]; categoryId: string; from: string; to: string }) {
  const [value, setValue] = useState(q);
  const [items, setItems] = useState<{ label: string; url: string }[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (value.trim().length < 2 || value === q) { setItems([]); return; }
    const c = new AbortController(); const t = setTimeout(() => { fetch(`/api/suggest?q=${encodeURIComponent(value)}`, { signal: c.signal }).then((r) => r.json()).then((d) => { setItems(d); setOpen(true); }).catch(() => {}); }, 180);
    return () => { clearTimeout(t); c.abort(); };
  }, [value, q]);
  return (
    <Form action="/cerca" className="search-form" onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <div className="search-main">
        <div className="search-input-wrap">
          <input className="input" name="q" value={value} onChange={(e) => setValue(e.target.value)} onFocus={() => items.length && setOpen(true)} aria-label="Cerca" placeholder="Cerca articoli, argomenti, persone..." autoComplete="off" />
          {open && items.length > 0 && <ul className="search-suggest" role="listbox">{items.map((i) => <li key={i.url}><a href={i.url}>{i.label}</a></li>)}</ul>}
        </div>
        <button className="btn btn-dark" type="submit">Cerca</button>
      </div>
      <div className="search-filters">
        <select className="select" name="categoria" defaultValue={categoryId} aria-label="Categoria"><option value="">Tutte le categorie</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <label>Dal <input className="input" type="date" name="dal" defaultValue={from} /></label>
        <label>Al <input className="input" type="date" name="al" defaultValue={to} /></label>
      </div>
    </Form>
  );
}
