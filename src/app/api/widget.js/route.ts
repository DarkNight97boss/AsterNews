import { siteUrl } from '@/lib/site-url';
export const dynamic = 'force-dynamic';
/** Caricatore dei widget: <script src="https://sito/api/widget.js" data-kind="ultime" data-n="5" data-category="cronaca" data-theme="light"></script> */
export async function GET() {
  const base = siteUrl();
  const js = `(function(){var s=document.currentScript;if(!s)return;var d=s.dataset;var k=d.kind||'ultime';var q='n='+encodeURIComponent(d.n||'5')+'&category='+encodeURIComponent(d.category||'')+'&theme='+encodeURIComponent(d.theme||'light');var f=document.createElement('iframe');f.src='${base}/widget/'+k+'?'+q;f.title='${'Widget'}';f.style.cssText='width:100%;max-width:'+(d.width||'420px')+';height:'+(d.height||(k==='meteo'?'190px':'320px'))+';border:1px solid #e5e5e5;border-radius:6px';f.loading='lazy';s.parentNode.insertBefore(f,s);})();`;
  return new Response(js, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' } });
}
