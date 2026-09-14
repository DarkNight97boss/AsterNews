import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    @let s = store.settings();
    <div class="topbar">
      <div class="container">
        <span class="date">{{ today }}</span>
        <div class="socials">
          <a [href]="s.socials.facebook" target="_blank" rel="noopener">Facebook</a>
          <a [href]="s.socials.instagram" target="_blank" rel="noopener">Instagram</a>
          <a [href]="s.socials.x" target="_blank" rel="noopener">X</a>
          <a [href]="s.socials.youtube" target="_blank" rel="noopener">YouTube</a>
          <a [href]="s.socials.telegram" target="_blank" rel="noopener">Telegram</a>
        </div>
        @if (auth.isLoggedIn()) {
          <a routerLink="/admin" style="font-weight:700">⚙ Redazione</a>
        } @else {
          <a routerLink="/login" style="font-weight:700">Accedi</a>
        }
      </div>
    </div>

    <header class="site-header">
      <div class="container">
        <button class="btn btn-ghost btn-icon burger" (click)="menuOpen.set(!menuOpen())" aria-label="Menu">☰</button>
        <a routerLink="/" class="logo">Aster<span>news</span></a>
        <nav class="main-nav">
          @if (store.liveArticles().length) {
            <a class="nav-live" [routerLink]="liveLink()">Diretta</a>
          }
          @for (c of menuCategories(); track c.id) {
            <a [routerLink]="['/', c.slug]" routerLinkActive="active">{{ c.name }}</a>
          }
        </nav>
        <div class="header-actions">
          <button class="btn btn-ghost btn-icon" (click)="searchOpen.set(!searchOpen())" aria-label="Cerca">🔍</button>
        </div>
      </div>
      @if (searchOpen()) {
        <div class="search-bar">
          <div class="container">
            <form (ngSubmit)="search()">
              <input class="input" placeholder="Cerca su ASTER News..." [(ngModel)]="q" name="q" autofocus />
              <button class="btn btn-dark" type="submit">Cerca</button>
            </form>
          </div>
        </div>
      }
      <nav class="mobile-nav" [class.open]="menuOpen()">
        @for (c of store.categories(); track c.id) {
          <a [routerLink]="['/', c.slug]" (click)="menuOpen.set(false)">{{ c.name }}</a>
        }
        <a routerLink="/notizie" (click)="menuOpen.set(false)">Tutte le notizie</a>
      </nav>
    </header>

    @if (s.tickerEnabled && tickerItems().length) {
      <div class="ticker">
        <div class="container">
          <span class="ticker-label">Ultim'ora</span>
          <div class="ticker-track">
            <div class="ticker-items">
              @for (t of tickerItems(); track $index) { <a [routerLink]="t.link">{{ t.text }}</a> }
              @for (t of tickerItems(); track $index) { <a [routerLink]="t.link" aria-hidden="true">{{ t.text }}</a> }
            </div>
          </div>
        </div>
      </div>
    }

    <main class="page">
      <div class="container">
        <router-outlet />
      </div>
    </main>

    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <a routerLink="/" class="logo">Aster<span>news</span></a>
            <p style="margin-top:12px">{{ s.description }}</p>
            <p>{{ s.footerText }}</p>
          </div>
          <div>
            <h4>Sezioni</h4>
            <ul>@for (c of store.categories(); track c.id) { <li><a [routerLink]="['/', c.slug]">{{ c.name }}</a></li> }</ul>
          </div>
          <div>
            <h4>Servizi</h4>
            <ul>
              <li><a routerLink="/notizie">Tutte le notizie</a></li>
              <li><a routerLink="/cerca">Cerca</a></li>
              <li><a routerLink="/login">Area redazione</a></li>
            </ul>
          </div>
          <div>
            <h4>Seguici</h4>
            <ul>
              <li><a [href]="s.socials.facebook" target="_blank" rel="noopener">Facebook</a></li>
              <li><a [href]="s.socials.instagram" target="_blank" rel="noopener">Instagram</a></li>
              <li><a [href]="s.socials.x" target="_blank" rel="noopener">X</a></li>
              <li><a [href]="s.socials.youtube" target="_blank" rel="noopener">YouTube</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© {{ year }} {{ s.siteName }}. Tutti i diritti riservati.</span>
          <span>Privacy · Cookie policy · Contatti · Pubblicità</span>
        </div>
      </div>
    </footer>
  `,
})
export class PublicLayoutComponent {
  readonly store = inject(StoreService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly searchOpen = signal(false);
  q = '';
  readonly year = new Date().getFullYear();
  readonly today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  readonly menuCategories = computed(() => this.store.categories().filter((c) => c.showInMenu));
  readonly liveLink = computed(() => {
    const a = this.store.liveArticles()[0];
    return a ? ['/', this.store.category(a.categoryId)?.slug, a.slug] : ['/'];
  });
  readonly tickerItems = computed(() => {
    const breaking = this.store.breaking().slice(0, 3).map((a) => ({ text: a.title, link: ['/', this.store.category(a.categoryId)?.slug ?? 'notizie', a.slug] }));
    const manual = this.store.settings().ticker.map((t) => ({ text: t, link: ['/notizie'] }));
    return [...breaking, ...manual];
  });
  search(): void {
    if (!this.q.trim()) return;
    this.router.navigate(['/cerca'], { queryParams: { q: this.q } });
    this.searchOpen.set(false);
  }
}
