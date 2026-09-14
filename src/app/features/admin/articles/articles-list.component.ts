import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Article, ArticleStatus, FORMAT_LABELS, STATUS_LABELS } from '../../../core/models';
import { CompactNumberPipe, TimeAgoPipe } from '../../../core/pipes';

type SortKey = 'updatedAt' | 'publishedAt' | 'title' | 'views';

@Component({
  selector: 'app-articles-list',
  imports: [RouterLink, FormsModule, TimeAgoPipe, CompactNumberPipe],
  template: `
    <div class="page-title">
      <div><h1>Articoli</h1><p>{{ filtered().length }} articoli · {{ mineLabel() }}</p></div>
      <div class="actions"><a routerLink="/admin/articoli/nuovo" class="btn btn-primary">+ Nuovo articolo</a></div>
    </div>

    <div class="filters">
      <input class="input grow" placeholder="Cerca per titolo..." [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <select class="select" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
        <option value="">Tutti gli stati</option>
        @for (s of statuses; track s) { <option [value]="s">{{ statusLabels[s] }} ({{ counts()[s] }})</option> }
      </select>
      <select class="select" [ngModel]="catFilter()" (ngModelChange)="catFilter.set($event)">
        <option value="">Tutte le categorie</option>
        @for (c of store.categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
      </select>
      @if (auth.can('article.edit.any')) {
        <select class="select" [ngModel]="authorFilter()" (ngModelChange)="authorFilter.set($event)">
          <option value="">Tutti gli autori</option>
          @for (u of store.users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
        </select>
      }
    </div>

    @if (selected().size) {
      <div class="bulk-bar">
        {{ selected().size }} selezionati:
        @if (auth.can('article.publish')) { <button class="btn btn-success btn-sm" (click)="bulk('published')">Pubblica</button> }
        <button class="btn btn-outline btn-sm" (click)="bulk('draft')">Bozza</button>
        <button class="btn btn-outline btn-sm" (click)="bulk('archived')">Archivia</button>
        @if (auth.can('article.delete')) { <button class="btn btn-danger btn-sm" (click)="bulkDelete()">Elimina</button> }
        <button class="btn btn-ghost btn-sm" (click)="clearSelection()">Annulla</button>
      </div>
    }

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:36px"><input type="checkbox" [checked]="allSelected()" (change)="toggleAll()" /></th>
            <th style="width:70px"></th>
            <th (click)="sortBy('title')">Titolo {{ arrow('title') }}</th>
            <th>Categoria</th>
            <th>Autore</th>
            <th>Stato</th>
            <th (click)="sortBy('views')">Visite {{ arrow('views') }}</th>
            <th (click)="sortBy('updatedAt')">Aggiornato {{ arrow('updatedAt') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (a of filtered(); track a.id) {
            <tr>
              <td><input type="checkbox" [checked]="selected().has(a.id)" (change)="toggle(a.id)" /></td>
              <td>@if (a.coverImage) { <img class="t-thumb" [src]="a.coverImage" alt="" loading="lazy" /> } @else { <div class="t-thumb"></div> }</td>
              <td class="t-title">
                <a [routerLink]="['/admin/articoli', a.id]">{{ a.title || '(senza titolo)' }}</a>
                <div class="t-sub">
                  @if (a.format !== 'standard') { <span class="badge badge-gray" style="margin-right:4px">{{ formatLabels[a.format] }}</span> }
                  @if (a.featured) { <span class="badge badge-dark" style="margin-right:4px">In evidenza</span> }
                  @if (a.breaking) { <span class="badge badge-red" style="margin-right:4px">Ultim'ora</span> }
                  /{{ a.slug }}
                </div>
              </td>
              <td><span class="status-dot" [style.background]="store.category(a.categoryId)?.color"></span>{{ store.category(a.categoryId)?.name }}</td>
              <td><div class="t-user"><img [src]="store.user(a.authorId)?.avatar" alt="" />{{ store.user(a.authorId)?.name }}</div></td>
              <td><span [class]="'badge ' + badge(a.status)">{{ statusLabels[a.status] }}</span>
                @if (a.status === 'scheduled' && a.scheduledAt) { <div class="t-sub" style="font-size:11px;color:var(--gray-500)">{{ a.scheduledAt | timeAgo }}</div> }</td>
              <td>{{ a.views | compactNumber }}</td>
              <td style="white-space:nowrap;color:var(--gray-600)">{{ a.updatedAt | timeAgo }}</td>
              <td>
                <div class="t-actions">
                  @if (isPublic(a)) { <a class="icon-btn" [routerLink]="['/', store.category(a.categoryId)?.slug, a.slug]" target="_blank" title="Vedi sul sito">↗</a> }
                  @if (auth.canEdit(a)) { <a class="icon-btn" [routerLink]="['/admin/articoli', a.id]" title="Modifica">✎</a> }
                  @if (auth.canPublish(a) && a.status !== 'published') { <button class="icon-btn" (click)="setStatus(a, 'published')" title="Pubblica">✔</button> }
                  @if (auth.can('article.create')) { <button class="icon-btn" (click)="duplicate(a)" title="Duplica">⧉</button> }
                  @if (auth.can('article.delete') || (a.authorId === auth.user()?.id && a.status === 'draft')) { <button class="icon-btn danger" (click)="remove(a)" title="Elimina">🗑</button> }
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="9"><div class="empty"><h3>Nessun articolo</h3><p>Prova a cambiare i filtri o crea un nuovo articolo.</p></div></td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ArticlesListComponent {
  readonly store = inject(StoreService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly status = input<string>('');
  readonly q = signal('');
  readonly statusFilter = signal('');
  readonly catFilter = signal('');
  readonly authorFilter = signal('');
  readonly sort = signal<SortKey>('updatedAt');
  readonly dir = signal<1 | -1>(-1);
  readonly selected = signal(new Set<string>());
  readonly statuses: ArticleStatus[] = ['draft', 'review', 'scheduled', 'published', 'archived'];
  readonly statusLabels = STATUS_LABELS;
  readonly formatLabels = FORMAT_LABELS;

  constructor() {
    // sync ?status= query param
    queueMicrotask(() => { if (this.status()) this.statusFilter.set(this.status()); });
  }

  readonly base = computed(() => (this.auth.can('article.edit.any') ? this.store.articles() : this.store.articles().filter((a) => a.authorId === this.auth.user()?.id)));
  readonly counts = computed(() => { const r: Record<string, number> = { draft: 0, review: 0, scheduled: 0, published: 0, archived: 0 }; this.base().forEach((a) => r[a.status]++); return r; });
  readonly mineLabel = computed(() => (this.auth.can('article.edit.any') ? 'tutta la redazione' : 'solo i tuoi'));
  readonly filtered = computed(() => {
    const q = this.q().toLowerCase();
    const s = this.sort(); const d = this.dir();
    return this.base()
      .filter((a) => !q || a.title.toLowerCase().includes(q) || a.slug.includes(q))
      .filter((a) => !this.statusFilter() || a.status === this.statusFilter())
      .filter((a) => !this.catFilter() || a.categoryId === this.catFilter())
      .filter((a) => !this.authorFilter() || a.authorId === this.authorFilter())
      .sort((x, y) => { const a = (x[s] ?? '') as string | number; const b = (y[s] ?? '') as string | number; return (a < b ? -1 : a > b ? 1 : 0) * d; });
  });
  readonly allSelected = computed(() => this.filtered().length > 0 && this.filtered().every((a) => this.selected().has(a.id)));

  sortBy(k: SortKey): void { if (this.sort() === k) this.dir.update((d) => (d === 1 ? -1 : 1)); else { this.sort.set(k); this.dir.set(k === 'title' ? 1 : -1); } }
  arrow(k: SortKey): string { return this.sort() === k ? (this.dir() === 1 ? '↑' : '↓') : ''; }
  clearSelection(): void { this.selected.set(new Set()); }
  toggle(id: string): void { this.selected.update((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  toggleAll(): void { this.selected.set(this.allSelected() ? new Set() : new Set(this.filtered().map((a) => a.id))); }
  badge(s: string): string { return ({ published: 'badge-green', review: 'badge-amber', scheduled: 'badge-blue', draft: 'badge-gray', archived: 'badge-dark' } as Record<string, string>)[s]; }
  isPublic(a: Article): boolean { return this.store.published().some((p) => p.id === a.id); }
  setStatus(a: Article, s: ArticleStatus): void { this.store.setArticleStatus(a.id, s, this.auth.user()!.id); this.toast.success(`Articolo ${STATUS_LABELS[s].toLowerCase()}.`); }
  bulk(s: ArticleStatus): void {
    const uid = this.auth.user()!.id;
    let n = 0;
    this.selected().forEach((id) => { const a = this.store.article(id); if (a && this.auth.canEdit(a) && (s !== 'published' || this.auth.can('article.publish'))) { this.store.setArticleStatus(id, s, uid); n++; } });
    this.selected.set(new Set());
    this.toast.success(`${n} articoli aggiornati.`);
  }
  bulkDelete(): void {
    if (!confirm(`Eliminare definitivamente ${this.selected().size} articoli?`)) return;
    const uid = this.auth.user()!.id;
    this.selected().forEach((id) => this.store.deleteArticle(id, uid));
    this.selected.set(new Set());
    this.toast.success('Articoli eliminati.');
  }
  duplicate(a: Article): void { const c = this.store.duplicateArticle(a.id, this.auth.user()!.id); if (c) this.router.navigate(['/admin/articoli', c.id]); }
  remove(a: Article): void { if (confirm(`Eliminare "${a.title}"?`)) { this.store.deleteArticle(a.id, this.auth.user()!.id); this.toast.success('Articolo eliminato.'); } }
}
