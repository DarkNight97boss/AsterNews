import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ROLE_LABELS, Role, User } from '../../../core/models';
import { img, uid } from '../../../core/utils';
import { ItDatePipe } from '../../../core/pipes';

@Component({
  selector: 'app-users',
  imports: [FormsModule, ItDatePipe],
  template: `
    <div class="page-title"><div><h1>Utenti e ruoli</h1><p>Redazione e permessi di accesso al CMS.</p></div><div class="actions"><button class="btn btn-primary" (click)="openNew()">+ Nuovo utente</button></div></div>
    <div class="panel">
      <div class="panel-title">Permessi per ruolo</div>
      <div class="table-wrap" style="border:0"><table class="table">
        <thead><tr><th>Ruolo</th><th>Articoli</th><th>Pubblicazione</th><th>Categorie / Tag</th><th>Commenti</th><th>Utenti / Impostazioni</th></tr></thead>
        <tbody>
          <tr><td><b>Amministratore</b></td><td>Tutti</td><td>✔</td><td>✔</td><td>✔</td><td>✔</td></tr>
          <tr><td><b>Caporedattore</b></td><td>Tutti</td><td>✔</td><td>✔</td><td>✔</td><td>—</td></tr>
          <tr><td><b>Redattore</b></td><td>Solo propri</td><td>✔ (propri)</td><td>Solo tag</td><td>—</td><td>—</td></tr>
          <tr><td><b>Collaboratore</b></td><td>Solo propri (bozza / revisione)</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
        </tbody></table></div>
    </div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Utente</th><th>Email</th><th>Ruolo</th><th>Articoli</th><th>Stato</th><th>Dal</th><th></th></tr></thead>
      <tbody>
        @for (u of store.users(); track u.id) {
          <tr>
            <td><div class="t-user"><img [src]="u.avatar" alt="" /><b>{{ u.name }}</b></div></td>
            <td>{{ u.email }}</td>
            <td><span class="badge badge-gray">{{ labels[u.role] }}</span></td>
            <td>{{ count(u.id) }}</td>
            <td>@if (u.active) { <span class="badge badge-green">Attivo</span> } @else { <span class="badge badge-red">Disattivato</span> }</td>
            <td style="color:var(--gray-600)">{{ u.createdAt | itDate: false }}</td>
            <td><div class="t-actions"><button class="icon-btn" (click)="edit(u)">✎</button>@if (u.id !== auth.user()?.id) { <button class="icon-btn danger" (click)="remove(u)">🗑</button> }</div></td>
          </tr>
        }
      </tbody></table></div>

    @if (editing()) {
      @let u = editing()!;
      <div class="modal-backdrop" (click)="editing.set(null)"><div class="modal modal-sm" (click)="$event.stopPropagation()">
        <div class="modal-head"><h3>{{ u.id ? 'Modifica' : 'Nuovo' }} utente</h3><button class="icon-btn" (click)="editing.set(null)">✕</button></div>
        <div class="modal-body">
          <div class="field"><label>Nome e cognome</label><input class="input" [(ngModel)]="u.name" /></div>
          <div class="field"><label>Email</label><input class="input" type="email" [(ngModel)]="u.email" /></div>
          <div class="field"><label>Ruolo</label><select class="select" [(ngModel)]="u.role">@for (r of roles; track r) { <option [value]="r">{{ labels[r] }}</option> }</select></div>
          <div class="field"><label>Bio</label><textarea class="textarea" style="min-height:60px" [(ngModel)]="u.bio"></textarea></div>
          <div class="field"><label>Avatar URL</label><input class="input" [(ngModel)]="u.avatar" /></div>
          <label class="switch"><input type="checkbox" [(ngModel)]="u.active" [disabled]="u.id === auth.user()?.id" /> Account attivo</label>
          <p class="help" style="margin-top:12px">Nella demo la password è uguale per tutti: <code>aster2026</code>.</p>
        </div>
        <div class="modal-foot"><button class="btn btn-ghost" (click)="editing.set(null)">Annulla</button><button class="btn btn-primary" (click)="save()" [disabled]="!u.name.trim() || !u.email.trim()">Salva</button></div>
      </div></div>
    }
  `,
})
export class UsersComponent {
  readonly store = inject(StoreService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly editing = signal<User | null>(null);
  readonly labels = ROLE_LABELS;
  readonly roles: Role[] = ['admin', 'editor', 'author', 'contributor'];
  count(id: string): number { return this.store.articles().filter((a) => a.authorId === id).length; }
  openNew(): void { this.editing.set({ id: '', name: '', email: '', role: 'author', avatar: '', bio: '', active: true, createdAt: new Date().toISOString() }); }
  edit(u: User): void { this.editing.set({ ...u }); }
  save(): void {
    const u = this.editing()!;
    const dup = this.store.users().some((x) => x.email.toLowerCase() === u.email.toLowerCase() && x.id !== u.id);
    if (dup) { this.toast.error('Email già in uso.'); return; }
    this.store.saveUser({ ...u, id: u.id || uid('u'), avatar: u.avatar || img(u.name, 200, 200) });
    this.editing.set(null); this.toast.success('Utente salvato.');
  }
  remove(u: User): void {
    if (this.count(u.id) > 0) { this.toast.error('L\'utente ha articoli associati: disattivalo invece di eliminarlo.'); return; }
    if (confirm(`Eliminare ${u.name}?`)) this.store.deleteUser(u.id);
  }
}
