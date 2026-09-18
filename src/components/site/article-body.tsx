import { Fragment, ReactNode } from 'react';
import { PollWidget } from './poll-widget';
import { Embeds } from './embeds';
import { QuizWidget, type QuizDef } from './quiz-widget';
import { optimizeBodyImages } from '@/lib/body-images';
import { enhanceContent } from '@/lib/content-render';
import { filterCircles, type Viewer } from '@/lib/circles';
import { getSettings } from '@/lib/queries';

/**
 * Corpo dell'articolo: HTML dell'editor più i blocchi interattivi (sondaggi) e gli script degli embed (Instagram, X) solo se servono.
 * Un sondaggio è un segnaposto <div data-poll="ID"></div> inserito dall'editor.
 */
export async function ArticleBody({ html: rawHtml, faq, className = 'article-body', inlineAd, articleId = '', viewer }: { viewer?: Viewer; html: string; faq?: { q: string; a: string }[]; className?: string; inlineAd?: ReactNode; articleId?: string }) {
  const visible = rawHtml.includes('circle-only') ? filterCircles(rawHtml, viewer ?? { staff: false, circles: [] }, (await getSettings()).circles ?? []) : rawHtml;
  const html = await optimizeBodyImages(await enhanceContent(visible));
  // Spazio pubblicitario dopo il terzo paragrafo (se l'articolo è abbastanza lungo)
  let withAd = html; const paragraphs = [...html.matchAll(/<\/p>/g)];
  if (inlineAd && paragraphs.length >= 5) { const at = paragraphs[2].index! + 4; withAd = html.slice(0, at) + '<div data-inline-ad="1"></div>' + html.slice(at); }
  const quizzes = new Map<string, QuizDef>(); for (const m of withAd.matchAll(/<div[^>]*data-quiz="([^"]+)"[^>]*>/g)) { try { const def = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')) as QuizDef; quizzes.set(def.id, def); } catch { /* quiz malformato: ignorato */ } }
  const parts = withAd.replace(/<div[^>]*data-quiz="([^"]+)"[^>]*>(?:[\s\S]*?<\/div>)?/g, (m, json) => { try { const d = JSON.parse(json.replace(/&quot;/g, '"').replace(/&amp;/g, '&')) as QuizDef; return `<div data-poll="quiz:${d.id}"></div>`; } catch { return ''; } }).split(/<div[^>]*data-(?:poll|inline-ad)="([^"]+)"[^>]*>(?:\s*<\/div>)?/g);
  const needsEmbeds = /instagram-media|twitter-tweet|tiktok-embed/.test(html);
  return (
    <>
      <div className={className}>
        {parts.map((p, i) => (i % 2 === 1 ? (p === '1' ? <Fragment key="inline-ad">{inlineAd}</Fragment> : p.startsWith('quiz:') ? (quizzes.get(p.slice(5)) ? <QuizWidget key={p} def={quizzes.get(p.slice(5))!} articleId={articleId} /> : null) : <PollWidget key={`poll-${p}`} id={p} />) : p.trim() ? <Fragment key={i}><div dangerouslySetInnerHTML={{ __html: p }} /></Fragment> : null))}
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
