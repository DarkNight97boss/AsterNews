import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; text: string; kind: 'success' | 'error' | 'info' }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private n = 0;

  show(text: string, kind: Toast['kind'] = 'success', ms = 3200): void {
    const id = ++this.n;
    this.toasts.update((t) => [...t, { id, text, kind }]);
    setTimeout(() => this.dismiss(id), ms);
  }
  success(t: string) { this.show(t, 'success'); }
  error(t: string) { this.show(t, 'error', 5000); }
  info(t: string) { this.show(t, 'info'); }
  dismiss(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
