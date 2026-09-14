import 'server-only';

export interface WeatherDay { date: string; code: number; max: number; min: number }
export interface WeatherHour { time: string; temp: number; code: number; precip: number; wind: number; feels: number; humidity: number }
export interface Weather { city: string; current: { temp: number; code: number; feels: number; humidity: number; wind: number }; days: WeatherDay[]; hours: WeatherHour[]; fetchedAt: string }

const CODES: Record<number, [string, string]> = {
  0: ['☀️', 'Sereno'], 1: ['🌤️', 'Prevalentemente sereno'], 2: ['⛅', 'Poco o parzialmente nuvoloso'], 3: ['☁️', 'Nuvoloso'],
  45: ['🌫️', 'Nebbia'], 48: ['🌫️', 'Nebbia con brina'], 51: ['🌦️', 'Pioviggine leggera'], 53: ['🌦️', 'Pioviggine'], 55: ['🌧️', 'Pioviggine intensa'],
  61: ['🌧️', 'Pioggia debole'], 63: ['🌧️', 'Pioggia'], 65: ['🌧️', 'Pioggia forte'], 66: ['🌧️', 'Pioggia gelata'], 67: ['🌧️', 'Pioggia gelata forte'],
  71: ['🌨️', 'Neve debole'], 73: ['🌨️', 'Neve'], 75: ['❄️', 'Neve forte'], 77: ['🌨️', 'Granelli di neve'],
  80: ['🌦️', 'Rovesci deboli'], 81: ['🌧️', 'Rovesci'], 82: ['⛈️', 'Rovesci violenti'], 85: ['🌨️', 'Rovesci di neve'], 86: ['❄️', 'Rovesci di neve forti'],
  95: ['⛈️', 'Temporale'], 96: ['⛈️', 'Temporale con grandine'], 99: ['⛈️', 'Temporale con grandine forte'],
};
export const weatherIcon = (code: number) => CODES[code]?.[0] ?? '🌡️';
export const weatherLabel = (code: number) => CODES[code]?.[1] ?? 'Variabile';

export async function getWeather(city: string, lat: number, lon: number): Promise<Weather | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,apparent_temperature,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability,wind_speed_10m,apparent_temperature,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&forecast_days=7`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const d = await res.json();
    return {
      city,
      current: { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, feels: Math.round(d.current.apparent_temperature), humidity: d.current.relative_humidity_2m, wind: Math.round(d.current.wind_speed_10m) },
      days: (d.daily.time as string[]).map((date, i) => ({ date, code: d.daily.weather_code[i], max: Math.round(d.daily.temperature_2m_max[i]), min: Math.round(d.daily.temperature_2m_min[i]) })),
      hours: (d.hourly.time as string[]).map((time, i) => ({ time, temp: Math.round(d.hourly.temperature_2m[i]), code: d.hourly.weather_code[i], precip: d.hourly.precipitation_probability[i] ?? 0, wind: Math.round(d.hourly.wind_speed_10m[i]), feels: Math.round(d.hourly.apparent_temperature[i]), humidity: d.hourly.relative_humidity_2m[i] })),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
