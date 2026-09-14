import { Component, inject } from '@angular/core';
import { StoreService } from '../../../core/services/store.service';
import { ItDatePipe } from '../../../core/pipes';

@Component({
  selector: 'app-newsletter',
  imports: [ItDatePipe],
  template: `
    <div class="page-title"><div><h1>Newsletter</h1><p>{{ store.subscribers().length }} iscritti</p></div><div class="actions"><button class="btn btn-outline" (click)="exportCsv()">Esporta CSV</button></div></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Email</th><th>Iscritto il</th><th></th></tr></thead>
      <tbody>
        @for (s of store.subscribers(); track s.id) {
          <tr><td><b>{{ s.email }}</b></td><td>{{ s.createdAt | itDate }}</td><td><div class="t-actions"><button class="icon-btn danger" (click)="store.removeSubscriber(s.id)">🗑</button></div></td></tr>
        } @empty { <tr><td colspan="3"><div class="empty"><h3>Nessun iscritto</h3></div></td></tr> }
      </tbody></table></div>
  `,
})
export class NewsletterComponent {
  readonly store = inject(StoreService);
  exportCsv(): void {
    const csv = 'email,data\n' + this.store.subscribers().map((s) => `${s.email},${s.createdAt}`).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'iscritti.csv'; a.click();
  }
}
