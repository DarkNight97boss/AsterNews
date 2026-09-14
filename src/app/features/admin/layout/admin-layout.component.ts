import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService } from '../../../core/services/store.service';
import { ROLE_LABELS } from '../../../core/models';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @let u = auth.user();
    <div class="admin">
      <aside class="admin-sidebar" [class.open]="open()">
        <div class="brand"><a routerLink="/admin" class="logo">Aster<span>news</span></a><span class="brand-sub">Redazione · CMS</span></div>
        <nav (click)="open.set(false)">
          <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"><span class="ico">▦</span> Dashboard</a>
          <div class="nav-group">Contenuti</div>
          <a routerLink="/admin/articoli" routerLinkActive="active"><span class="ico">✎</span> Articoli @if (reviewCount()) { <span class="pill">{{ reviewCount() }}</span> }</a>
          <a routerLink="/admin/articoli/nuovo" routerLinkActive="active"><span class="ico">＋</span> Nuovo articolo</a>
          @if (auth.can('category.manage')) { <a routerLink="/admin/categorie" routerLinkActive="active"><span class="ico">☰</span> Categorie</a> }
          @if (auth.can('tag.manage')) { <a routerLink="/admin/tag" routerLinkActive="active"><span class="ico">#</span> Tag</a> }
          <a routerLink="/admin/media" routerLinkActive="active"><span class="ico">▣</span> Media</a>
          @if (auth.can('comment.moderate')) {
            <div class="nav-group">Community</div>
            <a routerLink="/admin/commenti" routerLinkActive="active"><span class="ico">💬</span> Commenti @if (pendingComments()) { <span class="pill">{{ pendingComments() }}</span> }</a>
            <a routerLink="/admin/newsletter" routerLinkActive="active"><span class="ico">✉</span> Newsletter</a>
          }
          @if (auth.can('user.manage') || auth.can('settings.manage')) {
            <div class="nav-group">Sistema</div>
            @if (auth.can('user.manage')) { <a routerLink="/admin/utenti" routerLinkActive="active"><span class="ico">👥</span> Utenti e ruoli</a> }
            @if (auth.can('settings.manage')) { <a routerLink="/admin/impostazioni" routerLinkActive="active"><span class="ico">⚙</span> Impostazioni</a> }
          }
          <div class="nav-group">Sito</div>
          <a routerLink="/"><span class="ico">↗</span> Vai al sito</a>
        </nav>
        @if (u) {
          <div class="sidebar-user">
            <img [src]="u.avatar" [alt]="u.name" />
            <div><div class="u-name">{{ u.name }}</div><div class="u-role">{{ roleLabel(u.role) }}</div></div>
            <button (click)="logout()" title="Esci">⏻</button>
          </div>
        }
      </aside>
      @if (open()) { <div class="modal-backdrop" style="z-index:250" (click)="open.set(false)"></div> }
      <div class="admin-main">
        <div class="admin-topbar">
          <button class="btn btn-ghost btn-icon burger-admin" (click)="open.set(true)">☰</button>
          <span class="crumb">ASTER News / <b>Redazione</b></span>
          <span class="spacer"></span>
          <a routerLink="/admin/articoli/nuovo" class="btn btn-primary btn-sm">+ Nuovo articolo</a>
        </div>
        <div class="admin-content"><router-outlet /></div>
      </div>
    </div>
  `,
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(StoreService);
  private readonly router = inject(Router);
  readonly open = signal(false);
  readonly reviewCount = computed(() => (this.auth.can('article.publish') ? this.store.articles().filter((a) => a.status === 'review').length : 0));
  readonly pendingComments = computed(() => this.store.comments().filter((c) => c.status === 'pending').length);
  roleLabel(r: keyof typeof ROLE_LABELS) { return ROLE_LABELS[r]; }
  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }
}
