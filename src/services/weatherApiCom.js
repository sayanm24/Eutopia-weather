// WeatherAPI.com — primary provider when WEATHERAPI_KEY is configured.
// Requests go to /api/wa/*; the proxy appends the key server-side.
import { getJson } from './http.js'

const BASE = '/api/wa/v1'
const RETRY_AFTER_REJECTION = 10 * 60 * 1000

// Build-time boolean (not the key): false when no WEATHERAPI_KEY is set, so we never make a doomed request.
// eslint-disable-next-line no-undef
export const enabled = typeof __WEATHERAPI_ENABLED__ !== 'undefined' && __WEATHERAPI_ENABLED__

let rejectedAt = 0
let lastStatus = enabled ? 'unknown' : 'not-configured' // not-configured | unknown | ok | invalid-key | rate-limit | error
export const status = () => lastStatus
export const usable = () => enabled && (!rejectedAt || Date.now() - rejectedAt > RETRY_AFTER_REJECTION)

async function call(path, opts) {
  try {
    const data = await getJson(BASE + path, opts)
    lastStatus = 'ok'
    rejectedAt = 0
    return data
  } catch (err) {
    if (err.kind === 'invalid-key') { rejectedAt = Date.now(); lastStatus = 'invalid-key' } // bad key or quota exhausted
    else if (err.kind === 'rate-limit') lastStatus = 'rate-limit'
    else if (err.kind !== 'aborted' && err.kind !== 'offline') lastStatus = 'error'
    throw err
  }
}

/** Seconds east of UTC for an IANA timezone id, at the given instant. */
function tzOffsetSeconds(tzId, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tzId, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    }).formatToParts(at)
    const g = (type) => Number(parts.find((p) => p.type === type).value)
    const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second'))
    return Math.round((asUtc - at.getTime()) / 60000) * 60
  } catch {
    return 0
  }
}

// "06:05 AM" → seconds after local midnight (null for "No sunrise" etc.)
function clockToSeconds(text) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(text || '')
  if (!m) return null
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)
  return h * 3600 + Number(m[2]) * 60
}

const kphToMs = (v) => (v == null ? null : v / 3.6)
const cond = (c) => (c ? { provider: 'wa', code: c.code, description: c.text } : null)
const chance = (rain, snow) => (rain == null && snow == null ? null : Math.max(rain ?? 0, snow ?? 0))

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

const mapHour = (h) => ({
  dt: h.time_epoch,
  temp: h.temp_c,
  feelsLike: h.feelslike_c ?? null,
  humidity: h.humidity ?? null,
  dewPoint: h.dewpoint_c ?? null,
  pressure: h.pressure_mb ?? null,
  pop: chance(h.chance_of_rain, h.chance_of_snow),
  precip: h.precip_mm ?? null,
  rain: null, // WeatherAPI.com reports total precipitation only
  snow: h.snow_cm ?? null,
  cloudPct: h.cloud ?? null,
  visibility: h.vis_km != null ? h.vis_km * 1000 : null,
  uv: h.uv ?? null,
  isDay: h.is_day === 1,
  windSpeed: kphToMs(h.wind_kph),
  windDeg: h.wind_degree ?? null,
  windGust: kphToMs(h.gust_kph),
  cond: cond(h.condition),
})

const mapAlert = (a) => ({
  headline: a.headline || a.event || 'Weather alert',
  event: a.event || null,
  severity: a.severity || null,
  areas: a.areas || null,
  description: a.desc || null,
  instruction: a.instruction || null,
  effective: a.effective ? Math.floor(Date.parse(a.effective) / 1000) : null,
  expires: a.expires ? Math.floor(Date.parse(a.expires) / 1000) : null,
})

/** One request returns location, current conditions, hourly and daily forecast, astronomy and alerts. */
export async function fetchForecast(lat, lon, opts) {
  const d = await call(`/forecast.json?q=${lat},${lon}&days=7&aqi=no&alerts=yes`, opts)
  const tzId = d.location?.tz_id
  const tzOffset = tzOffsetSeconds(tzId)
  const nowSec = Date.now() / 1000
  const days = d.forecast?.forecastday || []

  const daily = days.map((f) => {
    // date_epoch is midnight UTC of the local calendar date; use the offset in force on that date (DST-safe).
    const offset = tzOffsetSeconds(tzId, new Date((f.date_epoch + 43200) * 1000))
    const midnight = f.date_epoch - offset
    const at = (text) => { const s = clockToSeconds(text); return s == null ? null : midnight + s }
    const rise = at(f.astro?.sunrise)
    const set = at(f.astro?.sunset)
    const illum = num(f.astro?.moon_illumination)
    return {
      dt: midnight,
      date: f.date,
      tzOffset: offset,
      min: f.day.mintemp_c,
      max: f.day.maxtemp_c,
      feelsMin: null,
      feelsMax: null,
      avgTemp: f.day.avgtemp_c ?? null,
      avgHumidity: f.day.avghumidity ?? null,
      avgVis: f.day.avgvis_km != null ? f.day.avgvis_km * 1000 : null,
      pop: chance(f.day.daily_chance_of_rain, f.day.daily_chance_of_snow),
      precip: f.day.totalprecip_mm ?? null,
      rainSum: null,
      snowSum: f.day.totalsnow_cm ?? null,
      precipHours: null,
      uvMax: f.day.uv ?? null,
      windMax: kphToMs(f.day.maxwind_kph),
      gustMax: null,
      windDir: null,
      sunrise: rise,
      sunset: set,
      daylight: null,
      sunshine: null,
      moon: f.astro?.moon_phase ? {
        name: f.astro.moon_phase,
        illumination: illum,
        moonrise: at(f.astro.moonrise),
        moonset: at(f.astro.moonset),
        source: 'WeatherAPI.com',
      } : null,
      isDay: true,
      cond: cond(f.day.condition),
      hours: (f.hour || []).map(mapHour),
    }
  })

  const hourly = days.flatMap((f) => f.hour || []).map(mapHour)
    .filter((s) => s.dt > nowSec - 3600).slice(0, 48)

  const c = d.current
  const today = daily.find((x) => nowSec < x.dt + 86400) || daily[0]
  return {
    name: d.location?.name || null,
    admin: d.location?.region || null,
    countryName: d.location?.country || null,
    tzOffset,
    current: {
      dt: c.last_updated_epoch,
      temp: c.temp_c,
      feelsLike: c.feelslike_c,
      humidity: c.humidity,
      pressure: c.pressure_mb,
      windSpeed: kphToMs(c.wind_kph),
      windDeg: c.wind_degree ?? null,
      windGust: kphToMs(c.gust_kph),
      visibility: c.vis_km != null ? c.vis_km * 1000 : null,
      cloudPct: c.cloud ?? null,
      precip1h: c.precip_mm ?? 0,
      snow1h: 0,
      sunrise: today?.sunrise ?? null,
      sunset: today?.sunset ?? null,
      isDay: c.is_day === 1,
      uv: c.uv ?? null,
      cond: cond(c.condition),
    },
    hourly,
    daily,
    alerts: (d.alerts?.alert || []).map(mapAlert),
  }
}

/** Autocomplete search (cities, regions, postcodes, "lat,lon", airport codes…). */
export async function search(query, opts) {
  const list = await call(`/search.json?q=${encodeURIComponent(query)}`, opts)
  return (Array.isArray(list) ? list : []).map((r) => ({
    name: r.name, admin: r.region || null, country: r.country || null, countryName: r.country || null,
    lat: r.lat, lon: r.lon,
  }))
}
