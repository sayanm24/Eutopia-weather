// OpenWeather (primary provider for current conditions + geocoding).
// Requests go to /api/ow/*; the proxy appends the API key server-side.
import { getJson } from './http.js'

const BASE = '/api/ow'
const RETRY_AFTER_REJECTION = 10 * 60 * 1000

// If the key is rejected we stop calling OpenWeather for a while (a brand-new
// key can take up to a couple of hours to activate), then try again.
let rejectedAt = 0
let lastStatus = 'unknown' // unknown | ok | invalid-key | rate-limit | error

export const openWeatherStatus = () => lastStatus
export const openWeatherUsable = () => !rejectedAt || Date.now() - rejectedAt > RETRY_AFTER_REJECTION

async function call(path, opts) {
  try {
    const data = await getJson(BASE + path, opts)
    lastStatus = 'ok'
    rejectedAt = 0
    return data
  } catch (err) {
    if (err.kind === 'invalid-key') { rejectedAt = Date.now(); lastStatus = 'invalid-key' }
    else if (err.kind === 'rate-limit') lastStatus = 'rate-limit'
    else if (err.kind !== 'not-found' && err.kind !== 'aborted') lastStatus = 'error'
    throw err
  }
}

export async function fetchCurrent(lat, lon) {
  const d = await call(`/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric`)
  const w = d.weather?.[0]
  return {
    name: d.name || null,
    country: d.sys?.country || null,
    tzOffset: d.timezone ?? 0,
    current: {
      dt: d.dt,
      temp: d.main.temp,
      feelsLike: d.main.feels_like,
      humidity: d.main.humidity,
      pressure: d.main.pressure,
      windSpeed: d.wind?.speed ?? null,
      windDeg: d.wind?.deg ?? null,
      windGust: d.wind?.gust ?? null,
      visibility: d.visibility ?? null,
      cloudPct: d.clouds?.all ?? null,
      precip1h: d.rain?.['1h'] ?? 0,
      snow1h: d.snow?.['1h'] ?? 0,
      sunrise: d.sys?.sunrise ?? null,
      sunset: d.sys?.sunset ?? null,
      isDay: null,
      uv: null,
      cond: w ? { provider: 'ow', code: w.id, description: w.description } : null,
    },
  }
}

export async function searchCities(query, opts) {
  const list = await call(`/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=6`, opts)
  return list.map((c) => ({
    name: c.name, admin: c.state || null, country: c.country || null, lat: c.lat, lon: c.lon,
  }))
}

export async function reverseGeocode(lat, lon) {
  const list = await call(`/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1`)
  const c = list[0]
  return c ? { name: c.name, admin: c.state || null, country: c.country || null } : null
}
