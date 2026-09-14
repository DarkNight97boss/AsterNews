import { Injectable, computed, inject, signal } from '@angular/core';
import { Role, User, Article } from '../models';
import { StoreService } from './store.service';

const SESSION_KEY = 'aster-news-session';
export const DEMO_PASSWORD = 'aster2026';

type Permission =
  | 'article.create' | 'article.edit.any' | 'article.publish' | 'article.delete'
  | 'category.manage' | 'tag.manage' | 'media.manage' | 'comment.moderate' | 'user.manage' | 'settings.manage';

const PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['article.create', 'article.edit.any', 'article.publish', 'article.delete', 'category.manage', 'tag.manage', 'media.manage', 'comment.moderate', 'user.manage', 'settings.manage'],
  editor: ['article.create', 'article.edit.any', 'article.publish', 'article.delete', 'category.manage', 'tag.manage', 'media.manage', 'comment.moderate'],
  author: ['article.create', 'article.publish', 'tag.manage', 'media.manage'],
  contributor: ['article.create', 'media.manage'],
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly store = inject(StoreService);
  private readonly userId = signal<string | null>(this.restore());

  readonly user = computed<User | null>(() => this.store.user(this.userId()) ?? null);
  readonly isLoggedIn = computed(() => !!this.user() && this.user()!.active);
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);

  private restore(): string | null {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  }

  login(email: string, password: string): { ok: boolean; error?: string } {
    const u = this.store.users().find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return { ok: false, error: 'Nessun utente con questa email.' };
    if (!u.active) return { ok: false, error: 'Account disattivato. Contatta un amministratore.' };
    if (password !== DEMO_PASSWORD) return { ok: false, error: 'Password errata.' };
    this.userId.set(u.id);
    try {
      localStorage.setItem(SESSION_KEY, u.id);
    } catch { /* ignore */ }
    return { ok: true };
  }

  logout(): void {
    this.userId.set(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }

  can(p: Permission): boolean {
    const r = this.role();
    return !!r && PERMISSIONS[r].includes(p);
  }

  canEdit(article: Article): boolean {
    return this.can('article.edit.any') || article.authorId === this.user()?.id;
  }

  canPublish(article: Article): boolean {
    return this.can('article.publish') && this.canEdit(article);
  }
}
