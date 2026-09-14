import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';
import { SiteSettings } from '../../../core/models';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  template: `
    @let s = model();
    <div class="page-title"><div><h1>Impostazioni</h1><p>Configurazione generale del sito.</p></div><div class="actions"><button class="btn btn-primary" (click)="save()">Salva impostazioni</button></div></div>
    <div class="admin-grid-2">
      <div>
        <div class="panel"><div class="panel-title">Identità</div>
          <div class="form-row"><div class="field"><label>Nome testata</label><input class="input" [(ngModel)]="s.siteName" /></div><div class="field"><label>Payoff</label><input class="input" [(ngModel)]="s.tagline" /></div></div>
          <div class="field"><label>Descrizione (meta description home)</label><textarea class="textarea" [(ngModel)]="s.description"></textarea></div>
          <div class="field"><label>Testo footer / gerenza</label><textarea class="textarea" style="min-height:60px" [(ngModel)]="s.footerText"></textarea></div>
        </div>
        <div class="panel"><div class="panel-title">Ticker Ultim'ora <label class="switch"><input type="checkbox" [(ngModel)]="s.tickerEnabled" /> Attivo</label></div>
          <p class="help">Gli articoli marcati "Ultim'ora" compaiono automaticamente. Qui puoi aggiungere voci manuali.</p>
          @for (t of s.ticker; track $index; let i = $index) {
            <div style="display:flex;gap:6px;margin-bottom:6px"><input class="input" [(ngModel)]="s.ticker[i]" /><button class="icon-btn danger" (click)="s.ticker.splice(i, 1)">✕</button></div>
          }
          <button class="btn btn-outline btn-sm" (click)="s.ticker.push('')">+ Aggiungi voce</button>
        </div>
        <div class="panel"><div class="panel-title">Social</div>
          <div class="form-row">
            <div class="field"><label>Facebook</label><input class="input" [(ngModel)]="s.socials.facebook" /></div>
            <div class="field"><label>Instagram</label><input class="input" [(ngModel)]="s.socials.instagram" /></div>
            <div class="field"><label>X</label><input class="input" [(ngModel)]="s.socials.x" /></div>
            <div class="field"><label>YouTube</label><input class="input" [(ngModel)]="s.socials.youtube" /></div>
            <div class="field"><label>Telegram</label><input class="input" [(ngModel)]="s.socials.telegram" /></div>
          </div>
        </div>
      </div>
      <div>
        <div class="panel"><div class="panel-title">Sezioni homepage</div>
          <p class="help">Ordine dei blocchi per categoria nella home.</p>
          <ul class="sortable-list">
            @for (id of s.homeSections; track id; let i = $index) {
              <li><span class="handle">⋮⋮</span><span class="status-dot" [style.background]="store.category(id)?.color"></span>{{ store.category(id)?.name }}
                <span class="order-btns"><button class="icon-btn" (click)="move(i, -1)" [disabled]="i === 0">↑</button><button class="icon-btn" (click)="move(i, 1)" [disabled]="i === s.homeSections.length - 1">↓</button><button class="icon-btn danger" (click)="s.homeSections.splice(i, 1)">✕</button></span></li>
            }
          </ul>
          <select class="select" (change)="addSection($event)"><option value="">+ Aggiungi sezione...</option>@for (c of store.categories(); track c.id) { @if (!s.homeSections.includes(c.id)) { <option [value]="c.id">{{ c.name }}</option> } }</select>
        </div>
        <div class="panel"><div class="panel-title">Lettura e community</div>
          <div class="field"><label>Articoli per pagina</label><input class="input" type="number" min="4" max="48" [(ngModel)]="s.articlesPerPage" /></div>
          <label class="switch"><input type="checkbox" [(ngModel)]="s.commentsModeration" /> Modera i commenti prima della pubblicazione</label>
        </div>
        <div class="panel"><div class="panel-title">Dati</div>
          <p class="help">I dati della demo sono salvati nel browser (localStorage).</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-outline btn-sm" (click)="export()">Esporta JSON</button><button class="btn btn-danger btn-sm" (click)="reset()">Ripristina dati demo</button></div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  readonly model = signal<SiteSettings>(structuredClone(this.store.settings()));
  save(): void { const s = this.model(); s.ticker = s.ticker.filter((t) => t.trim()); this.store.saveSettings(s); this.toast.success('Impostazioni salvate.'); }
  move(i: number, d: number): void { const l = this.model().homeSections; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; this.model.set({ ...this.model() }); }
  addSection(e: Event): void { const v = (e.target as HTMLSelectElement).value; if (v) { this.model().homeSections.push(v); this.model.set({ ...this.model() }); (e.target as HTMLSelectElement).value = ''; } }
  export(): void {
    const blob = new Blob([this.store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'aster-news-export.json'; a.click();
  }
  reset(): void { if (confirm('Ripristinare tutti i dati demo? Le modifiche andranno perse.')) { this.store.resetDemo(); this.model.set(structuredClone(this.store.settings())); this.toast.success('Dati demo ripristinati.'); } }
}
