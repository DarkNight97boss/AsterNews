import { Component, computed, inject, input, signal } from '@angular/core';
import { Article } from '../../../core/models';
import { StoreService } from '../../../core/services/store.service';
import { ArticleCardComponent } from './article-card.component';

@Component({
  selector: 'app-article-list',
  imports: [ArticleCardComponent],
  template: `
    @if (articles().length === 0) {
      <div class="empty"><h3>Nessun articolo</h3><p>Non ci sono ancora contenuti in questa sezione.</p></div>
    } @else {
      <div class="grid grid-1" style="gap: 28px">
        @for (a of visible(); track a.id) {
          <app-article-card [article]="a" variant="horizontal" [showExcerpt]="true" />
        }
      </div>
      @if (visible().length < articles().length) {
        <div class="load-more"><button class="btn btn-dark btn-lg" (click)="more()">Carica altri articoli</button></div>
      }
    }
  `,
})
export class ArticleListComponent {
  private readonly store = inject(StoreService);
  readonly articles = input.required<Article[]>();
  readonly page = signal(1);
  readonly visible = computed(() => this.articles().slice(0, this.page() * this.store.settings().articlesPerPage));
  more(): void { this.page.update((p) => p + 1); }
}
