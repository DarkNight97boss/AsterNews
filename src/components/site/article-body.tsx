import { Fragment } from 'react';
import { PollWidget } from './poll-widget';
import { Embeds } from './embeds';

/**
 * Corpo dell'articolo: HTML dell'editor più i blocchi interattivi (sondaggi) e gli script degli embed (Instagram, X) solo se servono.
 * Un sondaggio è un segnaposto <div data-poll="ID"></div> inserito dall'editor.
 */
export function ArticleBody({ html, faq, className = 'article-body' }: { html: string; faq?: { q: string; a: string }[]; className?: string }) {
  const parts = html.split(/<div[^>]*data-poll="([^"]+)"[^>]*>(?:\s*<\/div>)?/g);
  const needsEmbeds = /instagram-media|twitter-tweet|tiktok-embed/.test(html);
  return (
    <>
      <div className={className}>
        {parts.map((p, i) => (i % 2 === 1 ? <PollWidget key={`poll-${p}`} id={p} /> : p.trim() ? <Fragment key={i}><div dangerouslySetInnerHTML={{ __html: p }} /></Fragment> : null))}
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
