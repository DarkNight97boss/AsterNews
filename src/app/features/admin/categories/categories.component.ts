import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';
import { Category } from '../../../core/models';
import { slugify, uid } from '../../../core/utils';

@Component({
  selector: 'app-categories',
  imports: [FormsModule],
  template: `
    <div class="page-title"><div><h1>Categorie</h1><p>Sezioni del sito, ordine del menu e colori.</p></div><div class="actions"><button class="btn btn-primary" (click)="openNew()">+ Nuova categoria</button></div></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Ordine</th><th>Nome</th><th>Slug</th><th>Articoli</th><th>Menu</th><th>Home</th><th></th></tr></thead>
      <tbody>
        @for (c of store.categories(); track c.id; let i = $index) {
          <tr>
            <td><div style="display:flex;gap:2px"><button class="icon-btn" (click)="move(c, -1)" [disabled]="i === 0">↑</button><button class="icon-btn" (click)="move(c, 1)" [disabled]="i === store.categories().length - 1">↓</button></div></td>
            <td class="t-title"><span class="status-dot" [style.background]="c.color"></span>{{ c.name }}<div class="t-sub">{{ c.description }}</div></td>
            <td><code>/{{ c.slug }}</code></td>
            <td>{{ count(c.id) }}</td>
            <td>{{ c.showInMenu ? '✔' : '—' }}</td><td>{{ c.showOnHome ? '✔' : '—' }}</td>
            <td><div class="t-actions"><button class="icon-btn" (click)="edit(c)">✎</button><button class="icon-btn danger" (click)="remove(c)">🗑</button></div></td>
          </tr>
        }
      </tbody></table></div>

    @if (editing()) {
      @let c = editing()!;
      <div class="modal-backdrop" (click)="editing.set(null)"><div class="modal modal-sm" (click)="$event.stopPropagation()">
        <div class="modal-head"><h3>{{ c.id ? 'Modifica' : 'Nuova' }} categoria</h3><button class="icon-btn" (click)="editing.set(null)">✕</button></div>
        <div class="modal-body">
          <div class="field"><label>Nome</label><input class="input" [(ngModel)]="c.name" (ngModelChange)="c.slug = slugify($event)" /></div>
          <div class="field"><label>Slug</label><input class="input" [(ngModel)]="c.slug" /></div>
          <div class="field"><label>Descrizione</label><textarea class="textarea" style="min-height:60px" [(ngModel)]="c.description"></textarea></div>
          <div class="form-row">
            <div class="field"><label>Colore</label><div style="display:flex;gap:8px;align-items:center"><input class="color-input" type="color" [(ngModel)]="c.color" /><input class="input" [(ngModel)]="c.color" /></div></div>
          </div>
          <label class="switch" style="margin-bottom:10px"><input type="checkbox" [(ngModel)]="c.showInMenu" /> Mostra nel menu</label><br />
          <label class="switch"><input type="checkbox" [(ngModel)]="c.showOnHome" /> Sezione in homepage</label>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" (click)="editing.set(null)">Annulla</button><button class="btn btn-primary" (click)="save()" [disabled]="!c.name.trim()">Salva</button></div>
      </div></div>
    }
  `,
})
export class CategoriesComponent {
  readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  readonly editing = signal<Category | null>(null);
  readonly slugify = slugify;
  count(id: string): number { return this.store.articles().filter((a) => a.categoryId === id).length; }
  openNew(): void { this.editing.set({ id: '', slug: '', name: '', color: '#e2001a', description: '', order: this.store.categories().length + 1, showInMenu: true, showOnHome: true }); }
  edit(c: Category): void { this.editing.set({ ...c }); }
  save(): void { const c = this.editing()!; this.store.saveCategory({ ...c, id: c.id || uid('c') }); this.editing.set(null); this.toast.success('Categoria salvata.'); }
  remove(c: Category): void {
    if (this.store.categories().length <= 1) { this.toast.error('Deve esistere almeno una categoria.'); return; }
    if (confirm(`Eliminare "${c.name}"? Gli articoli verranno spostati nella prima categoria disponibile.`)) { this.store.deleteCategory(c.id); this.toast.success('Categoria eliminata.'); }
  }
  move(c: Category, d: number): void {
    const list = this.store.categories(); const i = list.findIndex((x) => x.id === c.id); const j = i + d;
    if (j < 0 || j >= list.length) return;
    const other = list[j];
    this.store.saveCategory({ ...c, order: other.order }); this.store.saveCategory({ ...other, order: c.order });
  }
}
