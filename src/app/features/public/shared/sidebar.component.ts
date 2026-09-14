import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';
import { ArticleCardComponent } from './article-card.component';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, FormsModule, ArticleCardComponent],
  template: `
    <aside class="sidebar">
      <div class="widget">
        <h3 class="widget-title">I più letti</h3>
        @for (a of store.mostRead().slice(0, 6); track a.id; let i = $index) {
          <app-article-card [article]="a" variant="number" [index]="i + 1" [showMeta]="false" />
        }
      </div>

      <div class="widget-dark">
        <h3>Newsletter ASTER</h3>
        <p>Le notizie più importanti della giornata, ogni mattina alle 7 nella tua casella email.</p>
        <form (ngSubmit)="subscribe()">
          <input class="input" type="email" placeholder="La tua email" [(ngModel)]="email" name="email" required />
          <button class="btn btn-primary" type="submit">Iscriviti gratis</button>
        </form>
      </div>

      @if (store.liveArticles().length) {
        <div class="widget">
          <h3 class="widget-title">In diretta</h3>
          @for (a of store.liveArticles(); track a.id) {
            <app-article-card [article]="a" variant="compact" />
          }
        </div>
      }

      <div class="widget">
        <h3 class="widget-title">Argomenti</h3>
        <div class="tag-cloud">
          @for (t of store.tags().slice(0, 18); track t.id) {
            <a [routerLink]="['/tag', t.slug]">{{ t.name }}</a>
          }
        </div>
      </div>

      <div class="ad-slot">Spazio pubblicitario 300×250</div>
    </aside>
  `,
})
export class SidebarComponent {
  readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  email = '';
  subscribe(): void {
    if (this.store.subscribe(this.email)) {
      this.toast.success('Iscrizione completata. Benvenuto!');
      this.email = '';
    } else {
      this.toast.error('Inserisci un indirizzo email valido.');
    }
  }
}
