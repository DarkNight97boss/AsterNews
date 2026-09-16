import { pickAd } from '@/lib/ads';
import { AdBeacon } from './ad-beacon';

/** Spazio pubblicitario: annuncio proprio (immagine o HTML) scelto dal gestore, AdSense se configurato, altrimenti segnaposto. */
export async function AdSlot({ slot, size = '300×250', className = '' }: { slot: string; size?: string; className?: string }) {
  const { ad, settings } = await pickAd(slot);
  if (!settings.enabled) return null;
  if (ad) {
    return (
      <div className={`ad-slot ad-live ${className}`} data-slot={slot}>
        <span className="ad-label">{ad.label || settings.label}</span>
        {ad.type === 'html' ? <div dangerouslySetInnerHTML={{ __html: ad.html }} /> : <a href={`/api/ad/c?id=${ad.id}`} target="_blank" rel="noopener sponsored"><img src={ad.image} alt={ad.name} loading="lazy" /></a>}
        <AdBeacon id={ad.id} />
      </div>
    );
  }
  if (settings.adsenseClient && !settings.houseAdsOnly) {
    return <div className={`ad-slot ad-live ${className}`} data-slot={slot}><span className="ad-label">{settings.label}</span><ins className="adsbygoogle" style={{ display: 'block' }} data-ad-client={settings.adsenseClient} data-ad-format="auto" data-full-width-responsive="true" /><AdBeacon id="" adsense /></div>;
  }
  return <div className={`ad-slot ${className}`} data-slot={slot}>Spazio pubblicitario {size}</div>;
}
