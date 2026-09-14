import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="empty" style="padding:80px 20px">
      <div class="kicker">Errore 404</div>
      <h1 style="font-size:40px;margin:10px 0">Pagina non trovata</h1>
      <p>La pagina che cerchi non esiste o è stata spostata.</p>
      <a routerLink="/" class="btn btn-dark">Torna alla home</a>
    </div>
  `,
})
export class NotFoundComponent {}
