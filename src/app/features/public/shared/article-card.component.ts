import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Article } from '../../../core/models';
import { StoreService } from '../../../core/services/store.service';
import { TimeAgoPipe } from '../../../core/pipes';

export type CardVariant = 'hero' | 'hero-overlay' | 'md' | 'sm' | 'horizontal' | 'compact' | 'number';

@Component({
  selector: 'app-article-card',
  imports: [RouterLink, TimeAgoPipe],
  template: `
    @let a = article();
    @let cat = category();
    <article class="card" [class.card-hero]="variant() === 'hero' || variant() === 'hero-overlay'" [class.overlay]="variant() === 'hero-overlay'"
      [class.card-md]="variant() === 'md'" [class.card-sm]="variant() === 'sm'" [class.card-horizontal]="variant() === 'horizontal'"
      [class.card-compact]="variant() === 'compact'" [class.card-number]="variant() === 'number'">
      @if (variant() === 'number') {
        <span class="num">{{ index() }}</span>
      } @else {
        <a class="card-img" [routerLink]="link()" [attr.aria-label]="a.title">
          <img [src]="a.coverImage" [alt]="a.title" loading="lazy" width="800" height="500" />
          @if (variant() !== 'compact') {
            <span class="card-badges">
              @if (a.format === 'live' && a.liveActive) { <span class="badge badge-live">Diretta</span> }
              @else if (a.breaking) { <span class="badge badge-red">Ultim'ora</span> }
            </span>
            @if (a.format === 'video') { <span class="card-format">▶</span> }
            @else if (a.format === 'gallery') { <span class="card-format">▦</span> }
          }
        </a>
      }
      <div class="card-body">
        @if (showKicker()) {
          <a class="kicker" [routerLink]="['/', cat?.slug]" [style.color]="variant() === 'hero-overlay' ? null : cat?.color">{{ a.kicker || cat?.name }}</a>
        }
        <h3 class="card-title"><a [routerLink]="link()">{{ a.title }}</a></h3>
        @if (showExcerpt()) { <p class="card-excerpt">{{ a.excerpt }}</p> }
        @if (showMeta()) {
          <div class="meta">
            <span>{{ a.publishedAt | timeAgo }}</span>
            @if (a.sponsored) { <span>· <span class="sponsored-label">Contenuto sponsorizzato</span></span> }
          </div>
        }
      </div>
    </article>
  `,
})
export class ArticleCardComponent {
  private readonly store = inject(StoreService);
  readonly article = input.required<Article>();
  readonly variant = input<CardVariant>('md');
  readonly index = input<number>(0);
  readonly showExcerpt = input<boolean>(false);
  readonly showMeta = input<boolean>(true);
  readonly showKicker = input<boolean>(true);
  readonly category = computed(() => this.store.category(this.article().categoryId));
  readonly link = computed(() => ['/', this.category()?.slug ?? 'notizie', this.article().slug]);
}
