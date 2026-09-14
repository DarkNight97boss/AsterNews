import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Article, ArticleFormat, ArticleStatus, FORMAT_LABELS, LiveUpdate, MediaItem, STATUS_LABELS } from '../../../core/models';
import { readingTime, slugify, stripHtml, toLocalInput, uid } from '../../../core/utils';
import { RichEditorComponent } from './rich-editor.component';
import { MediaPickerComponent } from './media-picker.component';
import { ItDatePipe, ItTimePipe } from '../../../core/pipes';

@Component({
  selector: 'app-article-editor',
  imports: [FormsModule, RouterLink, RichEditorComponent, MediaPickerComponent, ItDatePipe, ItTimePipe],
  template: `
    @let a = model();
    @if (a) {
      <div class="page-title">
        <div>
          <h1>{{ isNew() ? 'Nuovo articolo' : 'Modifica articolo' }}</h1>
          <p><span [class]="'badge ' + badge(a.status)">{{ statusLabels[a.status] }}</span> · {{ wordCount() }} parole · {{ readMin() }} min di lettura @if (dirty()) { · <b style="color:var(--amber)">modifiche non salvate</b> }</p>
        </div>
        <div class="actions">
          <a routerLink="/admin/articoli" class="btn btn-ghost">← Articoli</a>
          @if (isPublic()) { <a class="btn btn-outline" [routerLink]="['/', store.category(a.categoryId)?.slug, a.slug]" target="_blank">Vedi sul sito ↗</a> }
          <button class="btn btn-outline" (click)="save('draft')">Salva bozza</button>
          @if (!auth.can('article.publish')) { <button class="btn btn-dark" (click)="save('review')">Invia in revisione</button> }
          @if (auth.can('article.publish')) {
            @if (a.status === 'scheduled' || scheduledAt) { <button class="btn btn-dark" (click)="save('scheduled')">Programma</button> }
            <button class="btn btn-primary" (click)="save('published')">{{ a.status === 'published' ? 'Aggiorna' : 'Pubblica' }}</button>
          }
        </div>
      </div>

      <div class="editor-grid">
        <div>
          <div class="panel">
            <input class="input" style="text-transform:uppercase;font-weight:800;font-size:13px;letter-spacing:.08em;color:var(--red);border:0;padding-left:0" placeholder="OCCHIELLO (es. MALTEMPO)" [ngModel]="a.kicker" (ngModelChange)="set('kicker', $event)" />
            <textarea class="title-input" rows="2" style="resize:none;line-height:1.2" placeholder="Titolo dell'articolo" [ngModel]="a.title" (ngModelChange)="onTitle($event)"></textarea>
            <textarea class="subtitle-input" rows="2" placeholder="Sommario / sottotitolo" [ngModel]="a.subtitle" (ngModelChange)="set('subtitle', $event)"></textarea>
            <div style="margin-top:14px">
              <app-rich-editor [value]="a.content" (valueChange)="set('content', $event)" />
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">Anteprima e riassunto</div>
            <div class="field"><label>Estratto (mostrato nelle card e nei social)</label>
              <textarea class="textarea" [ngModel]="a.excerpt" (ngModelChange)="set('excerpt', $event)" placeholder="Lascia vuoto per generarlo dal sottotitolo"></textarea>
              <div class="char-count" [class.over]="a.excerpt.length > 200">{{ a.excerpt.length }}/200</div></div>
          </div>

          @if (a.format === 'video') {
            <div class="panel"><div class="panel-title">Video</div>
              <div class="field"><label>URL YouTube (embed o link)</label><input class="input" [ngModel]="a.videoUrl" (ngModelChange)="setVideo($event)" placeholder="https://www.youtube.com/watch?v=..." /></div>
              @if (a.videoUrl) { <div class="help">Embed: {{ a.videoUrl }}</div> }
            </div>
          }
          @if (a.format === 'gallery') {
            <div class="panel"><div class="panel-title">Fotogallery <button class="btn btn-outline btn-sm" (click)="pickerFor.set('gallery')">+ Aggiungi foto</button></div>
              <div class="media-grid">
                @for (g of a.gallery; track $index; let i = $index) {
                  <div class="media-item"><div class="m-img"><img [src]="g" alt="" /></div><div class="m-name" style="display:flex;justify-content:space-between"><span>Foto {{ i + 1 }}</span><button class="icon-btn danger" style="padding:0" (click)="removeGallery(i)">✕</button></div></div>
                } @empty { <p class="help">Nessuna foto. Aggiungi immagini dalla libreria.</p> }
              </div>
            </div>
          }
          @if (a.format === 'live') {
            <div class="panel">
              <div class="panel-title">Diretta <label class="switch"><input type="checkbox" [ngModel]="a.liveActive" (ngModelChange)="set('liveActive', $event)" /> Diretta attiva</label></div>
              <div class="form-row">
                <div class="field"><label>Titolo aggiornamento</label><input class="input" [(ngModel)]="luTitle" placeholder="es. Riaperta la metro A" /></div>
              </div>
              <div class="field"><label>Testo</label><textarea class="textarea" [(ngModel)]="luBody" style="min-height:70px"></textarea></div>
              <button class="btn btn-dark btn-sm" (click)="addLive()" [disabled]="!luTitle.trim()">+ Aggiungi aggiornamento</button>
              <div class="live-feed" style="margin-top:16px;border-color:var(--gray-300)">
                @for (u of liveSorted(); track u.id) {
                  <div class="live-item"><time>{{ u.time | itTime }}</time><div><h4>{{ u.title }}</h4><p>{{ u.body }}</p><button class="icon-btn danger" style="padding:2px 6px;font-size:12px" (click)="removeLive(u.id)">Elimina</button></div></div>
                } @empty { <p class="help" style="padding:12px">Nessun aggiornamento.</p> }
              </div>
            </div>
          }

          <div class="panel">
            <div class="panel-title">SEO</div>
            <div class="seo-preview">
              <div class="s-url">asternews.it › {{ store.category(a.categoryId)?.slug }} › {{ a.slug || slugify(a.title) }}</div>
              <div class="s-title">{{ a.seo.title || a.title || 'Titolo articolo' }}</div>
              <div class="s-desc">{{ a.seo.description || a.excerpt || a.subtitle || 'Descrizione...' }}</div>
            </div>
            <div class="form-row" style="margin-top:16px">
              <div class="field"><label>Meta title</label><input class="input" [ngModel]="a.seo.title" (ngModelChange)="setSeo('title', $event)" [placeholder]="a.title" /><div class="char-count" [class.over]="(a.seo.title || a.title).length > 60">{{ (a.seo.title || a.title).length }}/60</div></div>
              <div class="field"><label>Slug URL</label><input class="input" [ngModel]="a.slug" (ngModelChange)="set('slug', slugify($event))" /></div>
            </div>
            <div class="field"><label>Meta description</label><textarea class="textarea" style="min-height:60px" [ngModel]="a.seo.description" (ngModelChange)="setSeo('description', $event)"></textarea><div class="char-count" [class.over]="(a.seo.description || a.excerpt).length > 160">{{ (a.seo.description || a.excerpt).length }}/160</div></div>
            <div class="form-row">
              <div class="field"><label>Canonical URL</label><input class="input" [ngModel]="a.seo.canonical" (ngModelChange)="setSeo('canonical', $event)" placeholder="https://..." /></div>
              <div class="field"><label>&nbsp;</label><label class="checkbox"><input type="checkbox" [ngModel]="a.seo.noIndex" (ngModelChange)="setSeo('noIndex', $event)" /> Nascondi ai motori di ricerca (noindex)</label></div>
            </div>
          </div>
        </div>

        <aside class="editor-side">
          <div class="panel">
            <div class="panel-title">Pubblicazione</div>
            <div class="field"><label>Stato</label>
              <select class="select" [ngModel]="a.status" (ngModelChange)="set('status', $event)">
                @for (s of allowedStatuses(); track s) { <option [value]="s">{{ statusLabels[s] }}</option> }
              </select></div>
            @if (auth.can('article.publish')) {
              <div class="field"><label>Programma pubblicazione</label><input class="input" type="datetime-local" [(ngModel)]="scheduledAt" (ngModelChange)="onSchedule($event)" /><div class="help">Imposta data e ora futura, poi premi "Programma".</div></div>
            }
            @if (a.publishedAt) { <div class="field"><label>Pubblicato il</label><input class="input" type="datetime-local" [ngModel]="toLocal(a.publishedAt)" (ngModelChange)="set('publishedAt', fromLocal($event))" /></div> }
            <div class="field"><label>Autore</label>
              <select class="select" [ngModel]="a.authorId" (ngModelChange)="set('authorId', $event)" [disabled]="!auth.can('article.edit.any')">
                @for (u of store.users(); track u.id) { <option [value]="u.id">{{ u.name }}</option> }
              </select></div>
            <div class="field"><label>Formato</label>
              <select class="select" [ngModel]="a.format" (ngModelChange)="set('format', $event)">
                @for (f of formats; track f) { <option [value]="f">{{ formatLabels[f] }}</option> }
              </select></div>
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
              <label class="switch"><input type="checkbox" [ngModel]="a.featured" (ngModelChange)="set('featured', $event)" /> In evidenza (hero homepage)</label>
              <label class="switch"><input type="checkbox" [ngModel]="a.breaking" (ngModelChange)="set('breaking', $event)" /> Ultim'ora (ticker)</label>
              <label class="switch"><input type="checkbox" [ngModel]="a.sponsored" (ngModelChange)="set('sponsored', $event)" /> Contenuto sponsorizzato</label>
              <label class="switch"><input type="checkbox" [ngModel]="a.allowComments" (ngModelChange)="set('allowComments', $event)" /> Consenti commenti</label>
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">Categoria</div>
            <select class="select" [ngModel]="a.categoryId" (ngModelChange)="set('categoryId', $event)">
              @for (c of store.categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </div>

          <div class="panel">
            <div class="panel-title">Tag</div>
            <div class="chips" style="margin-bottom:8px">
              @for (id of a.tagIds; track id) { <span class="chip">{{ store.tag(id)?.name }}<button (click)="removeTag(id)">✕</button></span> }
            </div>
            <input class="input" placeholder="Aggiungi tag e premi Invio" [(ngModel)]="tagInput" (keydown.enter)="addTag($event)" />
            @if (tagInput.trim() && tagSuggestions().length) {
              <div class="suggest">@for (t of tagSuggestions(); track t.id) { <button (click)="pickTag(t.id)">{{ t.name }}</button> }</div>
            }
          </div>

          <div class="panel cover-picker">
            <div class="panel-title">Immagine di copertina</div>
            <div class="cover-preview">@if (a.coverImage) { <img [src]="a.coverImage" alt="" /> } @else { Nessuna immagine }</div>
            <div class="cover-actions">
              <button class="btn btn-outline btn-sm" (click)="pickerFor.set('cover')">Scegli dalla libreria</button>
              @if (a.coverImage) { <button class="btn btn-ghost btn-sm" (click)="set('coverImage', '')">Rimuovi</button> }
            </div>
            <div class="field" style="margin-top:12px"><label>Didascalia / credit</label><input class="input" [ngModel]="a.coverCaption" (ngModelChange)="set('coverCaption', $event)" /></div>
          </div>

          @if (!isNew()) {
            <div class="panel">
              <div class="panel-title">Info</div>
              <div class="help">Creato: {{ a.createdAt | itDate }}<br />Aggiornato: {{ a.updatedAt | itDate }}<br />Visualizzazioni: {{ a.views }}</div>
              @if (auth.can('article.delete')) { <button class="btn btn-danger btn-sm" style="margin-top:12px" (click)="remove()">Elimina articolo</button> }
            </div>
          }
        </aside>
      </div>

      @if (pickerFor()) { <app-media-picker (picked)="onPicked($event)" (close)="pickerFor.set(null)" /> }
    }
  `,
})
export class ArticleEditorComponent {
  readonly store = inject(StoreService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly id = input<string>('');
  readonly model = signal<Article | null>(null);
  readonly dirty = signal(false);
  readonly pickerFor = signal<'cover' | 'gallery' | null>(null);
  readonly isNew = computed(() => !this.id());
  readonly statusLabels = STATUS_LABELS;
  readonly formatLabels = FORMAT_LABELS;
  readonly formats: ArticleFormat[] = ['standard', 'video', 'gallery', 'live'];
  readonly slugify = slugify;
  tagInput = ''; luTitle = ''; luBody = ''; scheduledAt = '';
  private slugTouched = false;

  constructor() {
    effect(() => {
      const id = this.id();
      const existing = id ? this.store.article(id) : null;
      if (id && !existing) { this.toast.error('Articolo non trovato.'); this.router.navigate(['/admin/articoli']); return; }
      if (existing && !this.auth.canEdit(existing)) { this.toast.error('Non hai i permessi per modificare questo articolo.'); this.router.navigate(['/admin/articoli']); return; }
      if (this.model()?.id === existing?.id && this.model()) return;
      const a = existing ? structuredClone(existing) : this.store.newArticle(this.auth.user()!.id);
      this.model.set(a);
      this.scheduledAt = toLocalInput(a.scheduledAt);
      this.slugTouched = !!existing;
      this.dirty.set(false);
    });
  }

  readonly wordCount = computed(() => stripHtml(this.model()?.content ?? '').split(' ').filter(Boolean).length);
  readonly readMin = computed(() => readingTime(this.model()?.content ?? ''));
  readonly isPublic = computed(() => !!this.model() && this.store.published().some((p) => p.id === this.model()!.id));
  readonly liveSorted = computed(() => [...(this.model()?.liveUpdates ?? [])].sort((a, b) => b.time.localeCompare(a.time)));
  readonly tagSuggestions = computed(() => { const q = this.tagInput.toLowerCase(); return this.store.tags().filter((t) => t.name.toLowerCase().includes(q) && !this.model()?.tagIds.includes(t.id)).slice(0, 6); });
  readonly allowedStatuses = computed<ArticleStatus[]>(() => (this.auth.can('article.publish') ? ['draft', 'review', 'scheduled', 'published', 'archived'] : ['draft', 'review']));

  set<K extends keyof Article>(k: K, v: Article[K]): void { this.model.update((a) => (a ? { ...a, [k]: v } : a)); this.dirty.set(true); }
  setSeo(k: keyof Article['seo'], v: string | boolean): void { this.model.update((a) => (a ? { ...a, seo: { ...a.seo, [k]: v } } : a)); this.dirty.set(true); }
  onTitle(t: string): void { this.set('title', t); if (!this.slugTouched) this.set('slug', slugify(t)); }
  setVideo(url: string): void { const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); this.set('videoUrl', m ? `https://www.youtube.com/embed/${m[1]}` : url); }
  onSchedule(v: string): void { if (v) { this.set('scheduledAt', new Date(v).toISOString()); } }
  toLocal(iso: string | null) { return toLocalInput(iso); }
  fromLocal(v: string) { return v ? new Date(v).toISOString() : null; }
  badge(s: string): string { return ({ published: 'badge-green', review: 'badge-amber', scheduled: 'badge-blue', draft: 'badge-gray', archived: 'badge-dark' } as Record<string, string>)[s]; }

  addTag(e: Event): void { e.preventDefault(); const n = this.tagInput.trim(); if (!n) return; const t = this.store.ensureTag(n); this.pickTag(t.id); }
  pickTag(id: string): void { if (!this.model()!.tagIds.includes(id)) this.set('tagIds', [...this.model()!.tagIds, id]); this.tagInput = ''; }
  removeTag(id: string): void { this.set('tagIds', this.model()!.tagIds.filter((t) => t !== id)); }
  onPicked(m: MediaItem): void {
    if (this.pickerFor() === 'cover') this.set('coverImage', m.url);
    else this.set('gallery', [...this.model()!.gallery, m.url]);
    this.pickerFor.set(null);
  }
  removeGallery(i: number): void { this.set('gallery', this.model()!.gallery.filter((_, x) => x !== i)); }
  addLive(): void {
    const u: LiveUpdate = { id: uid('lu'), time: new Date().toISOString(), title: this.luTitle.trim(), body: this.luBody.trim() };
    this.set('liveUpdates', [u, ...this.model()!.liveUpdates]);
    this.luTitle = ''; this.luBody = '';
  }
  removeLive(id: string): void { this.set('liveUpdates', this.model()!.liveUpdates.filter((u) => u.id !== id)); }

  save(status: ArticleStatus): void {
    const a = this.model()!;
    if (!a.title.trim()) { this.toast.error('Il titolo è obbligatorio.'); return; }
    if (status === 'scheduled') {
      if (!this.scheduledAt) { this.toast.error('Imposta data e ora di programmazione.'); return; }
      a.scheduledAt = new Date(this.scheduledAt).toISOString();
      if (a.scheduledAt <= new Date().toISOString()) { status = 'published'; a.scheduledAt = null; }
    }
    if (status === 'published' && !this.auth.can('article.publish')) status = 'review';
    const saved = this.store.saveArticle({ ...a, status, excerpt: a.excerpt || a.subtitle }, this.auth.user()!.id);
    this.model.set(structuredClone(saved));
    this.dirty.set(false);
    this.toast.success(status === 'published' ? 'Articolo pubblicato!' : status === 'scheduled' ? 'Articolo programmato.' : status === 'review' ? 'Inviato in revisione.' : 'Bozza salvata.');
    if (this.isNew()) this.router.navigate(['/admin/articoli', saved.id], { replaceUrl: true });
  }
  remove(): void { if (confirm('Eliminare definitivamente questo articolo?')) { this.store.deleteArticle(this.model()!.id, this.auth.user()!.id); this.router.navigate(['/admin/articoli']); } }
}
