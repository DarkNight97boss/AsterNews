import { AfterViewInit, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

@Component({
  selector: 'app-rich-editor',
  template: `
    <div class="rte">
      <div class="rte-toolbar">
        <button type="button" title="Grassetto" (mousedown)="cmd($event, 'bold')"><b>B</b></button>
        <button type="button" title="Corsivo" (mousedown)="cmd($event, 'italic')"><i>I</i></button>
        <button type="button" title="Sottolineato" (mousedown)="cmd($event, 'underline')"><u>U</u></button>
        <span class="sep"></span>
        <button type="button" title="Paragrafo" (mousedown)="cmd($event, 'formatBlock', 'p')">¶</button>
        <button type="button" title="Titolo H2" (mousedown)="cmd($event, 'formatBlock', 'h2')">H2</button>
        <button type="button" title="Titolo H3" (mousedown)="cmd($event, 'formatBlock', 'h3')">H3</button>
        <button type="button" title="Citazione" (mousedown)="cmd($event, 'formatBlock', 'blockquote')">❝</button>
        <span class="sep"></span>
        <button type="button" title="Elenco puntato" (mousedown)="cmd($event, 'insertUnorderedList')">•≡</button>
        <button type="button" title="Elenco numerato" (mousedown)="cmd($event, 'insertOrderedList')">1≡</button>
        <span class="sep"></span>
        <button type="button" title="Link" (mousedown)="link($event)">🔗</button>
        <button type="button" title="Immagine da URL" (mousedown)="image($event)">🖼</button>
        <button type="button" title="Video YouTube" (mousedown)="video($event)">▶</button>
        <span class="sep"></span>
        <button type="button" title="Rimuovi formattazione" (mousedown)="cmd($event, 'removeFormat')">Tx</button>
        <button type="button" title="Annulla" (mousedown)="cmd($event, 'undo')">↶</button>
        <button type="button" title="Ripeti" (mousedown)="cmd($event, 'redo')">↷</button>
        <span class="sep"></span>
        <button type="button" [class.active]="html()" title="Sorgente HTML" (mousedown)="toggleHtml($event)">&lt;/&gt;</button>
      </div>
      @if (html()) {
        <textarea class="textarea" style="border:0;min-height:420px;font-family:monospace;font-size:13px" [value]="value()" (input)="fromSource($event)"></textarea>
      } @else {
        <div #editor class="rte-content" contenteditable="true" data-placeholder="Scrivi qui il corpo dell'articolo..." (input)="onInput()" (paste)="onPaste($event)"></div>
      }
    </div>
  `,
})
export class RichEditorComponent implements AfterViewInit {
  readonly value = input<string>('');
  readonly valueChange = output<string>();
  readonly html = signal(false);
  private readonly editor = viewChild<ElementRef<HTMLDivElement>>('editor');

  ngAfterViewInit(): void { this.sync(); }

  private sync(): void {
    const el = this.editor()?.nativeElement;
    if (el && el.innerHTML !== this.value()) el.innerHTML = this.value();
  }
  onInput(): void { this.valueChange.emit(this.editor()!.nativeElement.innerHTML); }
  onPaste(e: ClipboardEvent): void {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  }
  cmd(e: Event, command: string, arg?: string): void {
    e.preventDefault();
    document.execCommand(command, false, arg);
    this.onInput();
  }
  link(e: Event): void {
    e.preventDefault();
    const url = prompt('Indirizzo del link (https://...)');
    if (url) { document.execCommand('createLink', false, url); this.onInput(); }
  }
  image(e: Event): void {
    e.preventDefault();
    const url = prompt('URL immagine');
    if (url) { document.execCommand('insertHTML', false, `<figure><img src="${url}" alt="" /><figcaption>Didascalia</figcaption></figure><p></p>`); this.onInput(); }
  }
  video(e: Event): void {
    e.preventDefault();
    const url = prompt('URL video YouTube');
    if (!url) return;
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    const id = m ? m[1] : url;
    document.execCommand('insertHTML', false, `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe><p></p>`);
    this.onInput();
  }
  toggleHtml(e: Event): void {
    e.preventDefault();
    this.html.update((v) => !v);
    setTimeout(() => this.sync());
  }
  fromSource(e: Event): void { this.valueChange.emit((e.target as HTMLTextAreaElement).value); }
}
