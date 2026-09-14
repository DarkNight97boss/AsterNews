import { Component, inject, OnInit } from '@angular/core';
import { StoreService } from '../../../core/services/store.service';
import { SeoService } from '../../../core/services/seo.service';
import { ArticleListComponent } from '../shared/article-list.component';
import { SidebarComponent } from '../shared/sidebar.component';

@Component({
  selector: 'app-archive',
  imports: [ArticleListComponent, SidebarComponent],
  template: `
    <div class="page-head"><h1>Tutte le notizie</h1><p>Gli articoli in ordine cronologico. <span class="count">{{ store.published().length }} articoli</span></p></div>
    <div class="layout-sidebar">
      <app-article-list [articles]="store.published()" />
      <app-sidebar />
    </div>
  `,
})
export class ArchiveComponent implements OnInit {
  readonly store = inject(StoreService);
  private readonly seo = inject(SeoService);
  ngOnInit(): void { this.seo.set({ title: 'Tutte le notizie' }); }
}
