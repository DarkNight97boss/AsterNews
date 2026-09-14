import { Component, computed, effect, HostListener, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';
import { ItDatePipe, ItTimePipe, ReadingTimePipe, SafeHtmlPipe, SafeUrlPipe, TimeAgoPipe } from '../../../core/pipes';
import { ArticleCardComponent } from '../shared/article-card.component';
import { SidebarComponent } from '../shared/sidebar.component';
import { ROLE_LABELS } from '../../../core/models';

@Component({
  selector: 'app-article',
  imports: [RouterLink, FormsModule, ItDatePipe, ItTimePipe, ReadingTimePipe, SafeHtmlPipe, SafeUrlPipe, TimeAgoPipe, ArticleCardComponent, SidebarComponent],
  template: `
    @let a = article();
    @let cat = category();
    @let author = authorUser();
    @if (a && cat) {
      <div class="progress-bar" [style.width.%]="progress()"></div>
      <header class="article-head">
        <a class="kicker" [routerLink]="['/', cat.slug]" [style.color]="cat.color">{{ a.kicker || cat.name }}</a>
        @if (a.format === 'live' && a.liveActive) { <span class="badge badge-live" style="margin-left:10px">Diretta</span> }
        @if (a.breaking) { <span class="badge badge-red" style="margin-left:10px">Ultim'ora</span> }
        <h1>{{ a.title }}</h1>
        <p class="subtitle">{{ a.subtitle }}</p>
        <div class="author-row">
          @if (author) {
            <img [src]="author.avatar" [alt]="author.name" />
            <div>
              <a class="author-name" [routerLink]="['/autore', author.id]">{{ author.name }}</a>
              <div class="author-meta">{{ a.publishedAt | itDate }} · {{ a.content | readingTime }} @if (a.updatedAt > (a.publishedAt || '')) { · aggiornato {{ a.updatedAt | timeAgo }} }</div>
            </div>
          }
          <div class="share">
            <a class="share-btn" [href]="shareUrl('facebook')" target="_blank" rel="noopener" title="Condividi su Facebook">f</a>
            <a class="share-btn" [href]="shareUrl('x')" target="_blank" rel="noopener" title="Condividi su X">𝕏</a>
            <a class="share-btn" [href]="shareUrl('whatsapp')" target="_blank" rel="noopener" title="Condividi su WhatsApp">W</a>
            <button class="share-btn" (click)="copyLink()" title="Copia link">🔗</button>
          </div>
        </div>
        @if (a.sponsored) { <p class="sponsored-label" style="margin-top:10px">Contenuto sponsorizzato</p> }
      </header>

      @if (a.format === 'video' && a.videoUrl) {
        <div class="article-cover"><iframe class="video-embed" [src]="a.videoUrl | safeUrl" allowfullscreen loading="lazy" title="Video"></iframe></div>
      } @else if (a.coverImage) {
        <figure class="article-cover">
          <img [src]="a.coverImage" [alt]="a.title" width="1200" height="675" />
          @if (a.coverCaption) { <figcaption>{{ a.coverCaption }}</figcaption> }
        </figure>
      }

      <div class="article-layout">
        <div>
          @if (a.format === 'live' && a.liveUpdates.length) {
            <section class="live-feed">
              <div class="live-head"><span class="badge badge-live">Live</span> Aggiornamenti in tempo reale</div>
              @for (u of liveUpdates(); track u.id) {
                <div class="live-item">
                  <time>{{ u.time | itTime }}</time>
                  <div><h4>{{ u.title }}</h4><p>{{ u.body }}</p></div>
                </div>
              }
            </section>
          }
          @if (a.format === 'gallery' && a.gallery.length) {
            <div class="gallery">
              @for (g of a.gallery; track $index) { <img [src]="g" alt="" loading="lazy" (click)="lightbox.set(g)" /> }
            </div>
          }
          <div class="article-body" [innerHTML]="a.content | safeHtml"></div>

          @if (a.tagIds.length) {
            <div class="article-tags">
              @for (t of tags(); track t.id) { <a [routerLink]="['/tag', t.slug]">#{{ t.name }}</a> }
            </div>
          }
          @if (author) {
            <div class="author-box">
              <img [src]="author.avatar" [alt]="author.name" />
              <div>
                <div class="role">{{ roleLabel(author.role) }}</div>
                <h4><a [routerLink]="['/autore', author.id]">{{ author.name }}</a></h4>
                <p>{{ author.bio }}</p>
              </div>
            </div>
          }

          <section class="section">
            <div class="section-title"><h2>Leggi anche</h2></div>
            <div class="grid grid-2">
              @for (r of related(); track r.id) { <app-article-card [article]="r" variant="horizontal" /> }
            </div>
          </section>

          @if (a.allowComments) {
            <section class="comments">
              <h3>Commenti ({{ comments().length }})</h3>
              @for (c of comments(); track c.id) {
                <div class="comment"><div class="c-head"><b>{{ c.authorName }}</b><span>{{ c.createdAt | timeAgo }}</span></div><p>{{ c.body }}</p></div>
              } @empty { <p style="color:var(--gray-500)">Nessun commento. Sii il primo a commentare.</p> }
              <form (ngSubmit)="submitComment()">
                <div class="form-row">
                  <div class="field"><label>Nome</label><input class="input" [(ngModel)]="cName" name="name" required /></div>
                  <div class="field"><label>Email (non pubblicata)</label><input class="input" type="email" [(ngModel)]="cEmail" name="email" required /></div>
                </div>
                <div class="field"><label>Commento</label><textarea class="textarea" [(ngModel)]="cBody" name="body" required></textarea></div>
                <button class="btn btn-dark" type="submit">Invia commento</button>
                @if (store.settings().commentsModeration) { <span class="help" style="margin-left:12px">I commenti sono moderati prima della pubblicazione.</span> }
              </form>
            </section>
          }
        </div>
        <app-sidebar />
      </div>

      @if (lightbox()) { <div class="lightbox" (click)="lightbox.set(null)"><img [src]="lightbox()" alt="" /></div> }
    }
  `,
})
export class ArticleComponent {
  readonly store = inject(StoreService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly categorySlug = input.required<string>();
  readonly articleSlug = input.required<string>();
  readonly progress = signal(0);
  readonly lightbox = signal<string | null>(null);
  cName = ''; cEmail = ''; cBody = '';

  readonly article = computed(() => this.store.articleBySlug(this.articleSlug()));
  readonly category = computed(() => this.store.category(this.article()?.categoryId));
  readonly authorUser = computed(() => this.store.user(this.article()?.authorId));
  readonly tags = computed(() => (this.article()?.tagIds ?? []).map((id) => this.store.tag(id)).filter((t): t is NonNullable<typeof t> => !!t));
  readonly related = computed(() => (this.article() ? this.store.related(this.article()!, 4) : []));
  readonly comments = computed(() => (this.article() ? this.store.approvedComments(this.article()!.id) : []));
  readonly liveUpdates = computed(() => [...(this.article()?.liveUpdates ?? [])].sort((a, b) => b.time.localeCompare(a.time)));

  private counted = new Set<string>();

  constructor() {
    effect(() => {
      const a = this.article();
      if (!a) {
        this.router.navigate(['/404'], { skipLocationChange: true });
        return;
      }
      this.seo.set({ title: a.seo.title || a.title, description: a.seo.description || a.excerpt, image: a.coverImage, noIndex: a.seo.noIndex, type: 'article' });
      if (!this.counted.has(a.id)) {
        this.counted.add(a.id);
        setTimeout(() => this.store.incrementViews(a.id), 0);
      }
      window.scrollTo({ top: 0 });
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    this.progress.set(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
  }

  roleLabel(r: keyof typeof ROLE_LABELS): string { return ROLE_LABELS[r]; }

  shareUrl(net: 'facebook' | 'x' | 'whatsapp'): string {
    const url = encodeURIComponent(location.href);
    const text = encodeURIComponent(this.article()?.title ?? '');
    if (net === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if (net === 'x') return `https://x.com/intent/tweet?url=${url}&text=${text}`;
    return `https://wa.me/?text=${text}%20${url}`;
  }
  copyLink(): void {
    navigator.clipboard?.writeText(location.href).then(() => this.toast.info('Link copiato negli appunti'));
  }
  submitComment(): void {
    const a = this.article();
    if (!a || !this.cName.trim() || !this.cBody.trim() || !this.cEmail.trim()) {
      this.toast.error('Compila tutti i campi.');
      return;
    }
    const c = this.store.addComment({ articleId: a.id, authorName: this.cName.trim(), email: this.cEmail.trim(), body: this.cBody.trim() });
    this.toast.success(c.status === 'approved' ? 'Commento pubblicato.' : 'Grazie! Il commento sarà pubblicato dopo la moderazione.');
    this.cBody = '';
  }
}
