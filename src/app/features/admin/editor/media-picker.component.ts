import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { AuthService } from '../../../core/services/auth.service';
import { MediaItem } from '../../../core/models';

@Component({
  selector: 'app-media-picker',
  imports: [FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-head"><h3>Libreria media</h3><button class="icon-btn" (click)="close.emit()">✕</button></div>
        <div class="modal-body">
          <div class="filters">
            <input class="input grow" placeholder="Cerca..." [(ngModel)]="q" />
            <input class="input grow" placeholder="Oppure incolla un URL immagine" [(ngModel)]="url" />
            <button class="btn btn-outline" (click)="useUrl()" [disabled]="!url">Usa URL</button>
            <label class="btn btn-dark">Carica<input type="file" accept="image/*" hidden (change)="upload($event)" /></label>
          </div>
          <div class="media-grid">
            @for (m of items(); track m.id) {
              <div class="media-item" [class.selected]="sel()?.id === m.id" (click)="sel.set(m)" (dblclick)="pick(m)">
                <div class="m-img"><img [src]="m.url" [alt]="m.alt" loading="lazy" /></div><div class="m-name">{{ m.name }}</div>
              </div>
            }
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" (click)="close.emit()">Annulla</button>
          <button class="btn btn-primary" [disabled]="!sel()" (click)="pick(sel()!)">Seleziona</button>
        </div>
      </div>
    </div>
  `,
})
export class MediaPickerComponent {
  private readonly store = inject(StoreService);
  private readonly auth = inject(AuthService);
  readonly picked = output<MediaItem>();
  readonly close = output<void>();
  readonly sel = signal<MediaItem | null>(null);
  q = ''; url = '';
  items = () => this.store.media().filter((m) => m.type === 'image' && (!this.q || m.name.toLowerCase().includes(this.q.toLowerCase())));
  pick(m: MediaItem): void { this.picked.emit(m); }
  useUrl(): void {
    const m = this.store.addMedia({ name: this.url.split('/').pop() || 'immagine', url: this.url, alt: '', type: 'image', size: 0, uploadedBy: this.auth.user()!.id });
    this.pick(m);
  }
  upload(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const m = this.store.addMedia({ name: file.name, url: reader.result as string, alt: file.name, type: 'image', size: file.size, uploadedBy: this.auth.user()!.id });
      this.pick(m);
    };
    reader.readAsDataURL(file);
  }
}
