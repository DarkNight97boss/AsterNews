import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store.service';
import { SeoService } from '../../../core/services/seo.service';
import { ArticleCardComponent } from '../shared/article-card.component';
import { SidebarComponent } from '../shared/sidebar.component';

import { Article } from '../../../core/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ArticleCardComponent, SidebarComponent],
  template: `
    @let hero = heroArticles();
    @if (hero.length) {
      <section class="hero">
        <app-article-card [article]="hero[0]" variant="hero-overlay" [showExcerpt]="true" />
        <div class="hero-side">
          @for (a of hero.slice(1, 3); track a.id) { <app-article-card [article]="a" variant="md" /> }
        </div>
      </section>
    }

    <div class="layout-sidebar">
      <div>
        <section class="section">
          <div class="section-title"><h2>Ultime notizie</h2><a routerLink="/notizie">Tutte le notizie →</a></div>
          <div class="grid grid-4">
            @for (a of latest(); track a.id) {
              <article class="card card-sm">
                <a class="card-img" [routerLink]="link(a)"><img [src]="a.coverImage" [alt]="a.title" loading="lazy" /></a>
                <div class="card-body">
                  <div class="meta"><span class="badge badge-red" style="font-size:10px">{{ time(a) }}</span> <b>{{ store.category(a.categoryId)?.name }}</b></div>
                  <h3 class="card-title" style="margin-top:6px"><a [routerLink]="link(a)">{{ a.title }}</a></h3>
                </div>
              </article>
            }
          </div>
        </section>

        @for (sec of sections(); track sec.category.id) {
          <section class="section" [style.--section-color]="sec.category.color">
            <div class="section-title"><h2>{{ sec.category.name }}</h2><a [routerLink]="['/', sec.category.slug]">Tutto {{ sec.category.name }} →</a></div>
            <div class="section-mixed">
              <app-article-card [article]="sec.articles[0]" variant="hero" [showExcerpt]="true" />
              <div class="list">
                @for (a of sec.articles.slice(1, 5); track a.id) { <app-article-card [article]="a" variant="compact" [showMeta]="false" /> }
              </div>
            </div>
          </section>
        }

        @if (videos().length) {
          <section class="section" style="--section-color:#111">
            <div class="section-title"><h2>Video</h2></div>
            <div class="grid grid-3">
              @for (a of videos(); track a.id) { <app-article-card [article]="a" variant="sm" /> }
            </div>
          </section>
        }
      </div>
      <app-sidebar />
    </div>
  `,
})
export class HomeComponent implements OnInit {
  readonly store = inject(StoreService);
  private readonly seo = inject(SeoService);

  readonly heroArticles = computed(() => {
    const f = this.store.featured();
    const rest = this.store.published().filter((a) => !f.includes(a));
    return [...f, ...rest].slice(0, 3);
  });
  readonly latest = computed(() => {
    const ids = new Set(this.heroArticles().map((a) => a.id));
    return this.store.published().filter((a) => !ids.has(a.id)).slice(0, 8);
  });
  readonly sections = computed(() =>
    this.store.settings().homeSections
      .map((id) => this.store.category(id))
      .filter((c): c is NonNullable<typeof c> => !!c && c.showOnHome)
      .map((category) => ({ category, articles: this.store.articlesByCategory(category.id).slice(0, 5) }))
      .filter((s) => s.articles.length > 0),
  );
  readonly videos = computed(() => this.store.published().filter((a) => a.format === 'video').slice(0, 3));

  ngOnInit(): void { this.seo.set({}); }
  link(a: Article) { return ['/', this.store.category(a.categoryId)?.slug ?? 'notizie', a.slug]; }
  time(a: Article): string {
    const d = new Date(a.publishedAt ?? '');
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  }
}
