'use client';

import { useState } from 'react';
import type { Weather } from '@/lib/weather';

const CODES: Record<number, [string, string]> = { 0: ['☀️', 'Sereno'], 1: ['🌤️', 'Prevalentemente sereno'], 2: ['⛅', 'Poco nuvoloso'], 3: ['☁️', 'Nuvoloso'], 45: ['🌫️', 'Nebbia'], 48: ['🌫️', 'Nebbia'], 51: ['🌦️', 'Pioviggine'], 53: ['🌦️', 'Pioviggine'], 55: ['🌧️', 'Pioviggine'], 61: ['🌧️', 'Pioggia debole'], 63: ['🌧️', 'Pioggia'], 65: ['🌧️', 'Pioggia forte'], 71: ['🌨️', 'Neve'], 73: ['🌨️', 'Neve'], 75: ['❄️', 'Neve forte'], 80: ['🌦️', 'Rovesci'], 81: ['🌧️', 'Rovesci'], 82: ['⛈️', 'Rovesci forti'], 95: ['⛈️', 'Temporale'], 96: ['⛈️', 'Temporale'], 99: ['⛈️', 'Temporale'] };
const icon = (c: number) => CODES[c]?.[0] ?? '🌡️';
const label = (c: number) => CODES[c]?.[1] ?? 'Variabile';
const dayName = (ymd: string, i: number) => { if (i === 0) return 'Oggi'; if (i === 1) return 'Domani'; const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric' }); };

export function WeatherView({ weather: w }: { weather: Weather }) {
  const [sel, setSel] = useState(0);
  const day = w.days[sel];
  const hours = w.hours.filter((h) => h.time.startsWith(day.date)).filter((h, i) => sel > 0 ? i % 3 === 0 : true);
  const nowHour = new Date().getHours();
  return (
    <>
      <div className="weather-now">
        <div className="wn-main"><span className="wn-icon">{icon(w.current.code)}</span><div><div className="wn-temp">{w.current.temp}°</div><div className="wn-label">{label(w.current.code)}</div></div></div>
        <div className="wn-details"><span>Percepita <b>{w.current.feels}°</b></span><span>Umidità <b>{w.current.humidity}%</b></span><span>Vento <b>{w.current.wind} km/h</b></span></div>
      </div>
      <h2 className="serif" style={{ fontSize: 24, margin: '28px 0 14px' }}>Previsioni prossimi 7 giorni</h2>
      <div className="weather-days">
        {w.days.map((d, i) => (
          <button key={d.date} className={`wd ${i === sel ? 'active' : ''}`} onClick={() => setSel(i)}>
            <div className="wd-name">{icon(d.code)} {dayName(d.date, i)}</div>
            <div className="wd-temp"><b>{d.max}°</b> {d.min}°</div>
            <div className="wd-label">{label(d.code)}</div>
          </button>
        ))}
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table className="table weather-table">
          <thead><tr><th>Orario</th><th>Temperatura</th><th>Precipitazioni</th><th>Vento</th><th>Percepita</th><th>Umidità</th></tr></thead>
          <tbody>
            {hours.map((h) => { const hh = Number(h.time.slice(11, 13)); const isNow = sel === 0 && hh === nowHour; return (
              <tr key={h.time} className={isNow ? 'now' : ''}><td><b>{isNow ? 'Ora' : String(hh).padStart(2, '0')}</b> {icon(h.code)} <span className="muted">{label(h.code)}</span></td><td><b>{h.temp}°</b></td><td>{h.precip}%</td><td>{h.wind} km/h</td><td>{h.feels}°</td><td>{h.humidity}%</td></tr>
            ); })}
          </tbody>
        </table>
      </div>
    </>
  );
}
