import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';
import { Tag } from '../../../core/models';
import { slugify, uid } from '../../../core/utils';

@Component({
  selector: 'app-tags',
  imports: [FormsModule],
  template: `
    <div class="page-title"><div><h1>Tag</h1><p>{{ store.tags().length }} argomenti</p></div></div>
    <div class="panel"><div class="panel-title">Nuovo tag</div>
      <form style="display:flex;gap:8px;flex-wrap:wrap" (ngSubmit)="add()"><input class="input" style="max-width:320px" placeholder="Nome tag" [(ngModel)]="name" name="name" /><button class="btn btn-primary" type="submit" [disabled]="!name.trim()">Aggiungi</button></form>
    </div>
    <div class="filters"><input class="input grow" placeholder="Cerca tag..." [ngModel]="q()" (ngModelChange)="q.set($event)" /></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Nome</th><th>Slug</th><th>Articoli</th><th></th></tr></thead>
      <tbody>
        @for (t of filtered(); track t.id) {
          <tr>
            <td class="t-title">@if (editing()?.id === t.id) { <input class="input" [(ngModel)]="editing()!.name" (keydown.enter)="saveEdit()" /> } @else { {{ t.name }} }</td>
            <td><code>/tag/{{ t.slug }}</code></td>
            <td>{{ count(t.id) }}</td>
            <td><div class="t-actions">
              @if (editing()?.id === t.id) { <button class="btn btn-primary btn-sm" (click)="saveEdit()">Salva</button><button class="btn btn-ghost btn-sm" (click)="editing.set(null)">Annulla</button> }
              @else { <button class="icon-btn" (click)="editing.set({ ...t })">✎</button><button class="icon-btn danger" (click)="remove(t)">🗑</button> }
            </div></td>
          </tr>
        }
      </tbody></table></div>
  `,
})
export class TagsComponent {
  readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  readonly q = signal('');
  readonly editing = signal<Tag | null>(null);
  name = '';
  readonly filtered = computed(() => this.store.tags().filter((t) => t.name.toLowerCase().includes(this.q().toLowerCase())));
  count(id: string): number { return this.store.articles().filter((a) => a.tagIds.includes(id)).length; }
  add(): void { this.store.ensureTag(this.name); this.name = ''; this.toast.success('Tag aggiunto.'); }
  saveEdit(): void { const t = this.editing()!; this.store.saveTag({ ...t, slug: slugify(t.name) }); this.editing.set(null); }
  remove(t: Tag): void { if (confirm(`Eliminare il tag "${t.name}"?`)) this.store.deleteTag(t.id); }
}
