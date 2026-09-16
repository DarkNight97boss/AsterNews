import { Fragment, ReactNode } from 'react';
import { PollWidget } from './poll-widget';
import { Embeds } from './embeds';

/**
 * Corpo dell'articolo: HTML dell'editor più i blocchi interattivi (sondaggi) e gli script degli embed (Instagram, X) solo se servono.
 * Un sondaggio è un segnaposto <div data-poll="ID"></div> inserito dall'editor.
 */
export function ArticleBody({ html, faq, className = 'article-body', inlineAd }: { html: string; faq?: { q: string; a: string }[]; className?: string; inlineAd?: ReactNode }) {
  // Spazio pubblicitario dopo il terzo paragrafo (se l'articolo è abbastanza lungo)
  let withAd = html; const paragraphs = [...html.matchAll(/<\/p>/g)];
  if (inlineAd && paragraphs.length >= 5) { const at = paragraphs[2].index! + 4; withAd = html.slice(0, at) + '<div data-inline-ad="1"></div>' + html.slice(at); }
  const parts = withAd.split(/<div[^>]*data-(?:poll|inline-ad)="([^"]+)"[^>]*>(?:\s*<\/div>)?/g);
  const needsEmbeds = /instagram-media|twitter-tweet|tiktok-embed/.test(html);
  return (
    <>
      <div className={className}>
        {parts.map((p, i) => (i % 2 === 1 ? (p === '1' ? <Fragment key="inline-ad">{inlineAd}</Fragment> : <PollWidget key={`poll-${p}`} id={p} />) : p.trim() ? <Fragment key={i}><div dangerouslySetInnerHTML={{ __html: p }} /></Fragment> : null))}
        {faq && faq.length > 0 && (
          <section className="faq-box" aria-label="Domande frequenti">
            <h2>Le domande dei lettori</h2>
            {faq.map((f, i) => <details key={i}><summary>{f.q}</summary><div dangerouslySetInnerHTML={{ __html: f.a }} /></details>)}
          </section>
        )}
      </div>
      {needsEmbeds && <Embeds instagram={html.includes('instagram-media')} twitter={html.includes('twitter-tweet')} tiktok={html.includes('tiktok-embed')} />}
    </>
  );
}
