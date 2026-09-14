import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';
import { CompactNumberPipe, TimeAgoPipe } from '../../../core/pipes';
import { STATUS_LABELS } from '../../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, TimeAgoPipe, CompactNumberPipe],
  template: `
    <div class="page-title">
      <div><h1>Buongiorno, {{ auth.user()?.name?.split(' ')?.[0] }} 👋</h1><p>Ecco cosa succede oggi nella redazione.</p></div>
      <div class="actions"><a routerLink="/admin/articoli/nuovo" class="btn btn-primary">+ Nuovo articolo</a></div>
    </div>

    <div class="stats">
      <div class="stat" style="--stat-color:#0b7a4b"><div class="stat-label">Pubblicati</div><div class="stat-value">{{ counts().published }}</div><div class="stat-sub">{{ todayCount() }} oggi</div></div>
      <div class="stat" style="--stat-color:#e67e00"><div class="stat-label">In revisione</div><div class="stat-value">{{ counts().review }}</div><div class="stat-sub">da approvare</div></div>
      <div class="stat" style="--stat-color:#8a8a8a"><div class="stat-label">Bozze</div><div class="stat-value">{{ counts().draft }}</div><div class="stat-sub">{{ counts().scheduled }} programmati</div></div>
      <div class="stat" style="--stat-color:#1f4e9c"><div class="stat-label">Visualizzazioni</div><div class="stat-value">{{ totalViews() | compactNumber }}</div><div class="stat-sub">totali</div></div>
      <div class="stat" style="--stat-color:#e2001a"><div class="stat-label">Commenti in attesa</div><div class="stat-value">{{ pendingComments() }}</div><div class="stat-sub">{{ store.subscribers().length }} iscritti newsletter</div></div>
    </div>

    <div class="admin-grid-2">
      <div>
        <div class="panel">
          <div class="panel-title">Articoli più letti <a routerLink="/admin/articoli" class="btn btn-ghost btn-sm">Tutti</a></div>
          <div class="bars" style="margin-bottom:28px">
            @for (a of top(); track a.id) {
              <div class="bar" [style.height.%]="(a.views / maxViews()) * 100" [title]="a.title + ' · ' + a.views + ' visualizzazioni'"><span class="bar-label">{{ a.views | compactNumber }}</span></div>
            }
          </div>
          <table class="table">
            <tbody>
              @for (a of top(); track a.id; let i = $index) {
                <tr><td style="width:30px;color:var(--gray-400);font-weight:800">{{ i + 1 }}</td>
                  <td class="t-title"><a [routerLink]="['/admin/articoli', a.id]">{{ a.title }}</a><div class="t-sub">{{ store.category(a.categoryId)?.name }} · {{ store.user(a.authorId)?.name }}</div></td>
                  <td style="text-align:right;font-weight:700">{{ a.views | compactNumber }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <div class="panel">
          <div class="panel-title">Ultimi articoli modificati</div>
          <table class="table">
            <tbody>
              @for (a of recent(); track a.id) {
                <tr>
                  <td class="t-title"><a [routerLink]="['/admin/articoli', a.id]">{{ a.title || '(senza titolo)' }}</a><div class="t-sub">{{ store.user(a.authorId)?.name }} · {{ a.updatedAt | timeAgo }}</div></td>
                  <td><span class="badge" [class]="'badge ' + badge(a.status)">{{ statusLabel(a.status) }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="panel">
          <div class="panel-title">Da fare</div>
          <ul class="activity">
            @if (counts().review) { <li><span>⏳</span><div><a routerLink="/admin/articoli" [queryParams]="{ status: 'review' }"><b>{{ counts().review }} articoli</b> in attesa di revisione</a></div></li> }
            @if (pendingComments()) { <li><span>💬</span><div><a routerLink="/admin/commenti"><b>{{ pendingComments() }} commenti</b> da moderare</a></div></li> }
            @if (counts().scheduled) { <li><span>📅</span><div><a routerLink="/admin/articoli" [queryParams]="{ status: 'scheduled' }"><b>{{ counts().scheduled }} articoli</b> programmati</a></div></li> }
            @if (!counts().review && !pendingComments() && !counts().scheduled) { <li>Tutto in ordine 🎉</li> }
          </ul>
        </div>
        <div class="panel">
          <div class="panel-title">Attività recente</div>
          <ul class="activity">
            @for (e of store.activity().slice(0, 10); track e.id) {
              <li><img [src]="store.user(e.userId)?.avatar" alt="" /><div><b>{{ store.user(e.userId)?.name }}</b> {{ e.action }} <i>{{ e.target }}</i><div class="a-time">{{ e.createdAt | timeAgo }}</div></div></li>
            }
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  readonly store = inject(StoreService);
  readonly auth = inject(AuthService);
  readonly counts = computed(() => this.store.countByStatus());
  readonly totalViews = computed(() => this.store.articles().reduce((s, a) => s + a.views, 0));
  readonly pendingComments = computed(() => this.store.comments().filter((c) => c.status === 'pending').length);
  readonly top = computed(() => this.store.mostRead().slice(0, 7));
  readonly maxViews = computed(() => Math.max(1, ...this.top().map((a) => a.views)));
  readonly recent = computed(() => [...this.store.articles()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6));
  readonly todayCount = computed(() => this.store.published().filter((a) => new Date(a.publishedAt!).toDateString() === new Date().toDateString()).length);
  statusLabel(s: keyof typeof STATUS_LABELS) { return STATUS_LABELS[s]; }
  badge(s: string): string { return ({ published: 'badge-green', review: 'badge-amber', scheduled: 'badge-blue', draft: 'badge-gray', archived: 'badge-dark' } as Record<string, string>)[s]; }
}
