import type { Metadata } from 'next';
import { WeatherView } from '@/components/site/weather-view';
import { getSettings } from '@/lib/queries';
import { getWeather } from '@/lib/weather';

export const metadata: Metadata = { title: 'Meteo', description: 'Previsioni meteo per i prossimi 7 giorni: temperature, precipitazioni e vento ora per ora.' };

export default async function WeatherPage() {
  const s = await getSettings();
  const w = await getWeather(s.weatherCity, s.weatherLat, s.weatherLon);
  return (
    <>
      <div className="section-head"><h1>Meteo {s.weatherCity}</h1><p className="desc">Previsioni per i prossimi 7 giorni, aggiornate ogni 30 minuti. Dati Open-Meteo.</p></div>
      {w ? <WeatherView weather={w} /> : <div className="empty"><h3>Previsioni non disponibili</h3><p>Il servizio meteo non risponde. Riprova tra qualche minuto.</p></div>}
    </>
  );
}
