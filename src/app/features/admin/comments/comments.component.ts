import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';
import { COMMENT_STATUS_LABELS, Comment, CommentStatus } from '../../../core/models';
import { TimeAgoPipe } from '../../../core/pipes';

@Component({
  selector: 'app-comments',
  imports: [FormsModule, RouterLink, TimeAgoPipe],
  template: `
    <div class="page-title"><div><h1>Commenti</h1><p>Moderazione dei commenti dei lettori.</p></div></div>
    <div class="filters">
      @for (s of statuses; track s) { <button class="btn btn-sm" [class.btn-dark]="filter() === s" [class.btn-outline]="filter() !== s" (click)="filter.set(s)">{{ labels[s] }} ({{ counts()[s] }})</button> }
      <button class="btn btn-sm" [class.btn-dark]="filter() === ''" [class.btn-outline]="filter() !== ''" (click)="filter.set('')">Tutti</button>
    </div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Autore</th><th>Commento</th><th>Articolo</th><th>Stato</th><th></th></tr></thead>
      <tbody>
        @for (c of filtered(); track c.id) {
          <tr>
            <td><b>{{ c.authorName }}</b><div class="t-sub" style="font-size:12px;color:var(--gray-500)">{{ c.email }}<br />{{ c.createdAt | timeAgo }}</div></td>
            <td style="max-width:380px">{{ c.body }}</td>
            <td class="t-title"><a [routerLink]="['/admin/articoli', c.articleId]">{{ store.article(c.articleId)?.title }}</a></td>
            <td><span [class]="'badge ' + badge(c.status)">{{ labels[c.status] }}</span></td>
            <td><div class="t-actions">
              @if (c.status !== 'approved') { <button class="btn btn-success btn-sm" (click)="set(c, 'approved')">Approva</button> }
              @if (c.status !== 'rejected') { <button class="btn btn-outline btn-sm" (click)="set(c, 'rejected')">Rifiuta</button> }
              @if (c.status !== 'spam') { <button class="btn btn-outline btn-sm" (click)="set(c, 'spam')">Spam</button> }
              <button class="icon-btn danger" (click)="remove(c)">🗑</button>
            </div></td>
          </tr>
        } @empty { <tr><td colspan="5"><div class="empty"><h3>Nessun commento</h3></div></td></tr> }
      </tbody></table></div>
  `,
})
export class CommentsComponent {
  readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  readonly filter = signal<CommentStatus | ''>('pending');
  readonly statuses: CommentStatus[] = ['pending', 'approved', 'rejected', 'spam'];
  readonly labels = COMMENT_STATUS_LABELS;
  readonly counts = computed(() => { const r: Record<string, number> = { pending: 0, approved: 0, rejected: 0, spam: 0 }; this.store.comments().forEach((c) => r[c.status]++); return r; });
  readonly filtered = computed(() => this.store.comments().filter((c) => !this.filter() || c.status === this.filter()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  badge(s: string): string { return ({ approved: 'badge-green', pending: 'badge-amber', rejected: 'badge-gray', spam: 'badge-red' } as Record<string, string>)[s]; }
  set(c: Comment, s: CommentStatus): void { this.store.setCommentStatus(c.id, s); this.toast.success(`Commento ${COMMENT_STATUS_LABELS[s].toLowerCase()}.`); }
  remove(c: Comment): void { if (confirm('Eliminare il commento?')) this.store.deleteComment(c.id); }
}
