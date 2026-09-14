import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { MediaItem } from '../../../core/models';
import { FileSizePipe, ItDatePipe } from '../../../core/pipes';

@Component({
  selector: 'app-media',
  imports: [FormsModule, FileSizePipe, ItDatePipe],
  template: `
    <div class="page-title"><div><h1>Libreria media</h1><p>{{ store.media().length }} file</p></div></div>
    <label class="dropzone" [class.over]="over()" (dragover)="$event.preventDefault(); over.set(true)" (dragleave)="over.set(false)" (drop)="onDrop($event)">
      <b>Trascina qui le immagini</b> oppure clicca per selezionarle<br /><span class="help">JPG, PNG, WebP, GIF</span>
      <input type="file" accept="image/*" multiple (change)="onFiles($event)" />
    </label>
    <div class="filters">
      <input class="input grow" placeholder="Cerca..." [ngModel]="q()" (ngModelChange)="q.set($event)" />
      <input class="input grow" placeholder="Aggiungi da URL (https://...)" [(ngModel)]="url" /><button class="btn btn-outline" (click)="addUrl()" [disabled]="!url">Aggiungi URL</button>
    </div>
    <div class="admin-grid-2">
      <div class="media-grid">
        @for (m of filtered(); track m.id) {
          <div class="media-item" [class.selected]="sel()?.id === m.id" (click)="sel.set(m)"><div class="m-img"><img [src]="m.url" [alt]="m.alt" loading="lazy" /></div><div class="m-name">{{ m.name }}</div></div>
        } @empty { <div class="empty" style="grid-column:1/-1"><h3>Nessun file</h3></div> }
      </div>
      <div>
        @if (sel()) {
          @let m = sel()!;
          <div class="panel" style="position:sticky;top:80px">
            <div class="panel-title">Dettagli file</div>
            <img [src]="m.url" alt="" style="border-radius:4px;margin-bottom:12px;max-height:220px;object-fit:contain;width:100%;background:var(--gray-100)" />
            <div class="field"><label>Nome</label><input class="input" [(ngModel)]="m.name" /></div>
            <div class="field"><label>Testo alternativo (alt)</label><input class="input" [(ngModel)]="m.alt" /></div>
            <div class="field"><label>URL</label><input class="input" [value]="m.url.slice(0, 80)" readonly (click)="copy(m.url)" title="Clicca per copiare" /></div>
            <div class="help">Caricato da {{ store.user(m.uploadedBy)?.name }} il {{ m.createdAt | itDate }} · {{ m.size | fileSize }}</div>
            <div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-primary btn-sm" (click)="save(m)">Salva</button><button class="btn btn-danger btn-sm" (click)="remove(m)">Elimina</button></div>
          </div>
        } @else { <div class="panel help">Seleziona un file per vederne i dettagli.</div> }
      </div>
    </div>
  `,
})
export class MediaComponent {
  readonly store = inject(StoreService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly q = signal(''); readonly over = signal(false); readonly sel = signal<MediaItem | null>(null);
  url = '';
  readonly filtered = computed(() => this.store.media().filter((m) => m.name.toLowerCase().includes(this.q().toLowerCase())));
  onFiles(e: Event): void { this.addFiles(Array.from((e.target as HTMLInputElement).files ?? [])); }
  onDrop(e: DragEvent): void { e.preventDefault(); this.over.set(false); this.addFiles(Array.from(e.dataTransfer?.files ?? [])); }
  private addFiles(files: File[]): void {
    files.filter((f) => f.type.startsWith('image/')).forEach((f) => {
      if (f.size > 2 * 1024 * 1024) { this.toast.error(`${f.name}: massimo 2 MB nella demo locale.`); return; }
      const r = new FileReader();
      r.onload = () => { this.store.addMedia({ name: f.name, url: r.result as string, alt: f.name.replace(/\.[^.]+$/, ''), type: 'image', size: f.size, uploadedBy: this.auth.user()!.id }); this.toast.success(`${f.name} caricato.`); };
      r.readAsDataURL(f);
    });
  }
  addUrl(): void { this.store.addMedia({ name: this.url.split('/').pop() || 'immagine', url: this.url, alt: '', type: 'image', size: 0, uploadedBy: this.auth.user()!.id }); this.url = ''; this.toast.success('Immagine aggiunta.'); }
  save(m: MediaItem): void { this.store.updateMedia({ ...m }); this.toast.success('Salvato.'); }
  remove(m: MediaItem): void { if (confirm('Eliminare questo file?')) { this.store.deleteMedia(m.id); this.sel.set(null); } }
  copy(u: string): void { navigator.clipboard?.writeText(u).then(() => this.toast.info('URL copiato')); }
}
