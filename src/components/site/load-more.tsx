'use client';

import { Children, ReactNode, useState } from 'react';

export function LoadMore({ children, step, label = 'Carica altri articoli' }: { children: ReactNode; step: number; label?: string }) {
  const items = Children.toArray(children);
  const [n, setN] = useState(step);
  return (
    <>
      <div className="list-divided">{items.slice(0, n)}</div>
      {n < items.length && <div className="load-more"><button className="btn btn-dark btn-lg" onClick={() => setN((x) => x + step)}>{label}</button></div>}
    </>
  );
}
