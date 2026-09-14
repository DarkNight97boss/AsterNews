import { Component, computed, effect, inject, input } from '@angular/core';
import { StoreService } from '../../../core/services/store.service';
import { SeoService } from '../../../core/services/seo.service';
import { ArticleListComponent } from '../shared/article-list.component';
import { SidebarComponent } from '../shared/sidebar.component';
import { ROLE_LABELS } from '../../../core/models';

@Component({
  selector: 'app-author',
  imports: [ArticleListComponent, SidebarComponent],
  template: `
    @let u = user();
    @if (u) {
      <div class="author-box" style="margin:0 0 28px">
        <img [src]="u.avatar" [alt]="u.name" />
        <div><div class="role">{{ roleLabel(u.role) }}</div><h4 style="font-size:26px">{{ u.name }}</h4><p>{{ u.bio }}</p><p class="count" style="margin-top:6px">{{ articles().length }} articoli pubblicati</p></div>
      </div>
      <div class="layout-sidebar">
        <app-article-list [articles]="articles()" />
        <app-sidebar />
      </div>
    } @else { <div class="empty"><h3>Autore non trovato</h3></div> }
  `,
})
export class AuthorComponent {
  private readonly store = inject(StoreService);
  private readonly seo = inject(SeoService);
  readonly id = input.required<string>();
  readonly user = computed(() => this.store.user(this.id()));
  readonly articles = computed(() => this.store.articlesByAuthor(this.id()));
  constructor() { effect(() => this.seo.set({ title: this.user()?.name ?? 'Autore' })); }
  roleLabel(r: keyof typeof ROLE_LABELS) { return ROLE_LABELS[r]; }
}
