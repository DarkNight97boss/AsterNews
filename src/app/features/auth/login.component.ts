import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, DEMO_PASSWORD } from '../../core/services/auth.service';
import { StoreService } from '../../core/services/store.service';
import { ROLE_LABELS } from '../../core/models';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-card">
        <a routerLink="/" class="logo">Aster<span>news</span></a>
        <p class="lead">Area riservata alla redazione</p>
        <form (ngSubmit)="submit()">
          <div class="field"><label>Email</label><input class="input" type="email" [(ngModel)]="email" name="email" required autocomplete="username" /></div>
          <div class="field"><label>Password</label><input class="input" type="password" [(ngModel)]="password" name="password" required autocomplete="current-password" /></div>
          @if (error()) { <p class="error-text">{{ error() }}</p> }
          <button class="btn btn-primary btn-lg" type="submit" style="width:100%">Accedi</button>
        </form>
        <div class="demo-box">
          <b>Account demo</b> (password: <code>{{ demoPassword }}</code>)
          <ul style="margin-top:6px">
            @for (u of store.users(); track u.id) {
              <li>{{ roleLabel(u.role) }} · <button type="button" (click)="fill(u.email)">{{ u.email }}</button></li>
            }
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  readonly store = inject(StoreService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly redirect = input<string>('');
  readonly demoPassword = DEMO_PASSWORD;
  email = ''; password = '';
  readonly error = signal('');
  roleLabel(r: keyof typeof ROLE_LABELS) { return ROLE_LABELS[r]; }
  fill(email: string): void { this.email = email; this.password = DEMO_PASSWORD; }
  submit(): void {
    const r = this.auth.login(this.email, this.password);
    if (!r.ok) { this.error.set(r.error ?? 'Errore'); return; }
    this.router.navigateByUrl(this.redirect() || '/admin');
  }
}
