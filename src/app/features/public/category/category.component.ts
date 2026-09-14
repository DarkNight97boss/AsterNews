import { Component, computed, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { StoreService } from '../../../core/services/store.service';
import { SeoService } from '../../../core/services/seo.service';
import { ArticleCardComponent } from '../shared/article-card.component';
import { ArticleListComponent } from '../shared/article-list.component';
import { SidebarComponent } from '../shared/sidebar.component';

@Component({
  selector: 'app-category',
  imports: [ArticleCardComponent, ArticleListComponent, SidebarComponent],
  template: `
    @let c = category();
    @if (c) {
      <div class="page-head" [style.--section-color]="c.color">
        <h1>{{ c.name }}</h1>
        <p>{{ c.description }} <span class="count">· {{ articles().length }} articoli</span></p>
      </div>
      @if (articles().length >= 3) {
        <section class="hero" style="margin-bottom:32px">
          <app-article-card [article]="articles()[0]" variant="hero-overlay" [showExcerpt]="true" />
          <div class="hero-side">
            @for (a of articles().slice(1, 3); track a.id) { <app-article-card [article]="a" variant="md" /> }
          </div>
        </section>
      }
      <div class="layout-sidebar">
        <app-article-list [articles]="articles().length >= 3 ? articles().slice(3) : articles()" />
        <app-sidebar />
      </div>
    }
  `,
})
export class CategoryComponent {
  readonly store = inject(StoreService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  readonly categorySlug = input.required<string>();
  readonly category = computed(() => this.store.categoryBySlug(this.categorySlug()));
  readonly articles = computed(() => (this.category() ? this.store.articlesByCategory(this.category()!.id) : []));

  constructor() {
    effect(() => {
      const c = this.category();
      if (!c) {
        this.router.navigate(['/404'], { skipLocationChange: true });
        return;
      }
      this.seo.set({ title: c.name, description: c.description });
    });
  }
}
