import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { StoreService } from './store.service';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly store = inject(StoreService);

  set(opts: { title?: string; description?: string; image?: string; noIndex?: boolean; type?: string }): void {
    const site = this.store.settings().siteName;
    const t = opts.title ? `${opts.title} | ${site}` : `${site} - ${this.store.settings().tagline}`;
    const d = opts.description ?? this.store.settings().description;
    this.title.setTitle(t);
    this.meta.updateTag({ name: 'description', content: d });
    this.meta.updateTag({ property: 'og:title', content: t });
    this.meta.updateTag({ property: 'og:description', content: d });
    this.meta.updateTag({ property: 'og:type', content: opts.type ?? 'website' });
    if (opts.image) this.meta.updateTag({ property: 'og:image', content: opts.image });
    this.meta.updateTag({ name: 'robots', content: opts.noIndex ? 'noindex, nofollow' : 'index, follow' });
  }
}
