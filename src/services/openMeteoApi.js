// Open-Meteo (keyless, CORS-enabled). Supplies hourly + 7-day forecasts and UV index,
// and acts as the fallback for current conditions / city search when OpenWeather is unavailable.
import { getJson } from './http.js'

const CURRENT = 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m'
const HOURLY = 'temperature_2m,precipitation_probability,precipitation,weather_code,cloud_cover,visibility,uv_index,is_day,wind_speed_10m'
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max'

export async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=${CURRENT}&hourly=${HOURLY}&daily=${DAILY}` +
    '&timezone=auto&timeformat=unixtime&wind_speed_unit=ms&forecast_days=7'
  const d = await getJson(url)
  const nowSec = Date.now() / 1000

  const h = d.hourly
  const all = h.time.map((dt, i) => ({
    dt,
    temp: h.temperature_2m[i],
    pop: h.precipitation_probability?.[i] ?? null,
    precip: h.precipitation?.[i] ?? 0,
    cloudPct: h.cloud_cover?.[i] ?? null,
    visibility: h.visibility?.[i] ?? null,
    uv: h.uv_index?.[i] ?? null,
    isDay: h.is_day?.[i] === 1,
    windSpeed: h.wind_speed_10m?.[i] ?? null,
    cond: { provider: 'wmo', code: h.weather_code[i] },
  })).filter((s) => s.temp != null)

  const thisHour = [...all].reverse().find((s) => s.dt <= nowSec) || all[0]
  const hourly = all.filter((s) => s.dt > nowSec - 3600).slice(0, 48)

  const dd = d.daily
  const daily = dd.time.map((dt, i) => ({
    dt,
    min: dd.temperature_2m_min[i],
    max: dd.temperature_2m_max[i],
    pop: dd.precipitation_probability_max?.[i] ?? null,
    precip: dd.precipitation_sum?.[i] ?? 0,
    uvMax: dd.uv_index_max?.[i] ?? null,
    windMax: dd.wind_speed_10m_max?.[i] ?? null,
    sunrise: dd.sunrise?.[i] ?? null,
    sunset: dd.sunset?.[i] ?? null,
    isDay: true,
    cond: { provider: 'wmo', code: dd.weather_code[i] },
  })).filter((s) => s.max != null && s.min != null)

  const c = d.current
  const today = daily.find((x) => x.sunrise && nowSec < x.dt + 86400) || daily[0]
  const current = c && {
    dt: c.time,
    temp: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    pressure: c.pressure_msl,
    windSpeed: c.wind_speed_10m,
    windDeg: c.wind_direction_10m,
    windGust: c.wind_gusts_10m ?? null,
    visibility: thisHour?.visibility ?? null,
    cloudPct: c.cloud_cover ?? null,
    precip1h: c.precipitation ?? 0,
    snow1h: c.snowfall ?? 0,
    sunrise: today?.sunrise ?? null,
    sunset: today?.sunset ?? null,
    isDay: c.is_day === 1,
    uv: thisHour?.uv ?? null,
    cond: { provider: 'wmo', code: c.weather_code },
  }

  return { tzOffset: d.utc_offset_seconds ?? 0, current, hourly, daily, uvNow: thisHour?.uv ?? null }
}

export async function searchCities(query, { signal, language = 'en' } = {}) {
  const d = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=${language}&format=json`,
    { signal },
  )
  return (d.results || []).map((c) => ({
    name: c.name, admin: c.admin1 || null, country: c.country_code || c.country || null,
    countryName: c.country || null,
    lat: c.latitude, lon: c.longitude,
  }))
}
