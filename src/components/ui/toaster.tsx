'use client';

import { useSyncExternalStore } from 'react';

export interface Toast { id: number; text: string; kind: 'success' | 'error' | 'info' }

let toasts: Toast[] = [];
let n = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function show(text: string, kind: Toast['kind'], ms: number): void {
  const id = ++n;
  toasts = [...toasts, { id, text, kind }];
  emit();
  setTimeout(() => dismiss(id), ms);
}
function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (t: string) => show(t, 'success', 3200),
  error: (t: string) => show(t, 'error', 5000),
  info: (t: string) => show(t, 'info', 3200),
};

export function Toaster() {
  const list = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => toasts, () => toasts);
  return (
    <div className="toasts">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)}>{t.text}</div>
      ))}
    </div>
  );
}
