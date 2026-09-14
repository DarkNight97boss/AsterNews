import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { formatDate, readingTime, timeAgo } from '../utils';

@Pipe({ name: 'timeAgo', pure: false })
export class TimeAgoPipe implements PipeTransform {
  transform(v: string | null | undefined): string { return timeAgo(v); }
}

@Pipe({ name: 'itDate' })
export class ItDatePipe implements PipeTransform {
  transform(v: string | null | undefined, withTime = true): string { return formatDate(v, withTime); }
}

@Pipe({ name: 'readingTime' })
export class ReadingTimePipe implements PipeTransform {
  transform(html: string): string { return `${readingTime(html)} min di lettura`; }
}

@Pipe({ name: 'safeHtml' })
export class SafeHtmlPipe implements PipeTransform {
  private s = inject(DomSanitizer);
  transform(v: string): SafeHtml { return this.s.bypassSecurityTrustHtml(v || ''); }
}

@Pipe({ name: 'safeUrl' })
export class SafeUrlPipe implements PipeTransform {
  private s = inject(DomSanitizer);
  transform(v: string): SafeResourceUrl { return this.s.bypassSecurityTrustResourceUrl(v || ''); }
}

@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  }
}

@Pipe({ name: 'compactNumber' })
export class CompactNumberPipe implements PipeTransform {
  transform(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    return String(n);
  }
}

@Pipe({ name: 'itTime' })
export class ItTimePipe implements PipeTransform {
  transform(v: string | null | undefined): string {
    if (!v) return '';
    const d = new Date(v);
    const sameDay = d.toDateString() === new Date().toDateString();
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return sameDay ? time : `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ${time}`;
  }
}
