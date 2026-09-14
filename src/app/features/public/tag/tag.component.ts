import { Component, computed, effect, inject, input } from '@angular/core';
import { StoreService } from '../../../core/services/store.service';
import { SeoService } from '../../../core/services/seo.service';
import { ArticleListComponent } from '../shared/article-list.component';
import { SidebarComponent } from '../shared/sidebar.component';

@Component({
  selector: 'app-tag',
  imports: [ArticleListComponent, SidebarComponent],
  template: `
    <div class="page-head">
      <span class="kicker">Argomento</span>
      <h1>#{{ tag()?.name ?? slug() }}</h1>
      <p><span class="count">{{ articles().length }} articoli</span></p>
    </div>
    <div class="layout-sidebar">
      <app-article-list [articles]="articles()" />
      <app-sidebar />
    </div>
  `,
})
export class TagComponent {
  private readonly store = inject(StoreService);
  private readonly seo = inject(SeoService);
  readonly slug = input.required<string>();
  readonly tag = computed(() => this.store.tagBySlug(this.slug()));
  readonly articles = computed(() => (this.tag() ? this.store.articlesByTag(this.tag()!.id) : []));
  constructor() {
    effect(() => this.seo.set({ title: `#${this.tag()?.name ?? this.slug()}` }));
  }
}
