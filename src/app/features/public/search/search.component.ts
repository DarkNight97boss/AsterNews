import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { SeoService } from '../../../core/services/seo.service';
import { ArticleListComponent } from '../shared/article-list.component';
import { SidebarComponent } from '../shared/sidebar.component';

@Component({
  selector: 'app-search',
  imports: [FormsModule, ArticleListComponent, SidebarComponent],
  template: `
    <div class="page-head">
      <h1>Cerca</h1>
      <form (ngSubmit)="go()" style="display:flex;gap:8px;margin-top:14px;max-width:640px">
        <input class="input" [(ngModel)]="term" name="q" placeholder="Cerca articoli, argomenti, persone..." />
        <button class="btn btn-dark" type="submit">Cerca</button>
      </form>
      @if (q()) { <p><span class="count">{{ results().length }} risultati per «{{ q() }}»</span></p> }
    </div>
    <div class="layout-sidebar">
      <div>
        @if (q()) { <app-article-list [articles]="results()" /> } @else { <p style="color:var(--gray-500)">Inserisci un termine per iniziare la ricerca.</p> }
      </div>
      <app-sidebar />
    </div>
  `,
})
export class SearchComponent {
  private readonly store = inject(StoreService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  readonly q = input<string>('');
  term = '';
  readonly results = computed(() => this.store.search(this.q()));
  constructor() {
    effect(() => {
      this.term = this.q();
      this.seo.set({ title: this.q() ? `Ricerca: ${this.q()}` : 'Cerca', noIndex: true });
    });
  }
  go(): void { this.router.navigate(['/cerca'], { queryParams: { q: this.term } }); }
}
