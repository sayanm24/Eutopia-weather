// Pure helpers that summarise real forecast values. Nothing here invents a measurement:
// every statistic is computed from API values, and returns null when there is nothing to compute from.

const ok = (v) => v != null && !Number.isNaN(v)
const pad = (n) => String(n).padStart(2, '0')
const mod = (a, n) => ((a % n) + n) % n

/**
 * UTC offset in force on a given day, derived from that day's local-midnight timestamp.
 * Open-Meteo reports one offset for the whole response; this keeps each day correct across DST changes.
 */
export function dayOffset(localMidnight, fallbackOffset) {
  let delta = mod(-localMidnight - fallbackOffset, 86400)
  if (delta >= 43200) delta -= 86400
  return fallbackOffset + delta
}

/** "YYYY-MM-DD" in the location's calendar. */
export function localDateKey(unix, tzOffset) {
  const d = new Date((unix + tzOffset) * 1000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** min / max / average of one field across hourly slots (nulls skipped). */
export function stats(hours, key) {
  let min = null; let max = null; let minAt = null; let maxAt = null; let total = 0; let count = 0
  for (const h of hours || []) {
    const v = h[key]
    if (!ok(v)) continue
    if (min == null || v < min) { min = v; minAt = h.dt }
    if (max == null || v > max) { max = v; maxAt = h.dt }
    total += v
    count += 1
  }
  if (!count) return null
  const known = (hours || []).filter((h) => ok(h[key]))
  return {
    min, max, minAt, maxAt, count,
    avg: total / count,
    sum: total,
    first: known[0][key],
    last: known[known.length - 1][key],
  }
}

/** Speed-weighted vector mean of wind directions ("from" degrees). */
export function dominantDirection(hours) {
  let x = 0; let y = 0; let n = 0
  for (const h of hours || []) {
    if (!ok(h.windDeg)) continue
    const w = ok(h.windSpeed) ? Math.max(h.windSpeed, 0.1) : 1
    const r = (h.windDeg * Math.PI) / 180
    x += Math.sin(r) * w
    y += Math.cos(r) * w
    n += 1
  }
  if (!n || (Math.abs(x) < 1e-6 && Math.abs(y) < 1e-6)) return null
  return mod((Math.atan2(x, y) * 180) / Math.PI, 360)
}

/** Pressure tendency over a span, in hPa. Thresholds follow common synoptic practice. */
export function pressureTrend(from, to, hours = 3) {
  if (!ok(from) || !ok(to)) return null
  const change = to - from
  const threshold = hours <= 3 ? 1 : 2
  const label = change >= threshold ? 'Rising' : change <= -threshold ? 'Falling' : 'Steady'
  return { change, label }
}

export function uvCategory(uv) {
  if (!ok(uv)) return null
  if (uv < 3) return { label: 'Low', color: '#4fb34a', advice: 'No protection needed for most people.' }
  if (uv < 6) return { label: 'Moderate', color: '#e8d23a', advice: 'Seek shade around midday; use sunscreen.' }
  if (uv < 8) return { label: 'High', color: '#f0912c', advice: 'Protection essential: shade, hat, SPF 30+.' }
  if (uv < 11) return { label: 'Very high', color: '#e2503a', advice: 'Avoid the midday sun; extra protection.' }
  return { label: 'Extreme', color: '#b26fd1', advice: 'Avoid sun exposure where possible.' }
}

export const UV_BANDS = [
  { from: 0, to: 3, label: 'Low', color: '#4fb34a' },
  { from: 3, to: 6, label: 'Moderate', color: '#e8d23a' },
  { from: 6, to: 8, label: 'High', color: '#f0912c' },
  { from: 8, to: 11, label: 'Very high', color: '#e2503a' },
  { from: 11, to: 20, label: 'Extreme', color: '#b26fd1' },
]

const BEAUFORT = [
  [0.5, 'Calm'], [1.6, 'Light air'], [3.4, 'Light breeze'], [5.5, 'Gentle breeze'], [8, 'Moderate breeze'],
  [10.8, 'Fresh breeze'], [13.9, 'Strong breeze'], [17.2, 'Near gale'], [20.8, 'Gale'], [24.5, 'Strong gale'],
  [28.5, 'Storm'], [32.7, 'Violent storm'], [Infinity, 'Hurricane force'],
]
export const windLabel = (ms) => (ok(ms) ? BEAUFORT.find(([limit]) => ms < limit)[1] : null)

export function humidityLabel(pct) {
  if (!ok(pct)) return null
  if (pct < 30) return 'Dry'
  if (pct < 60) return 'Comfortable'
  if (pct < 80) return 'Humid'
  return 'Very humid'
}

export function visibilityLabel(m) {
  if (!ok(m)) return null
  if (m < 1000) return 'Poor — fog likely'
  if (m < 4000) return 'Moderate'
  if (m < 10000) return 'Good'
  return 'Excellent'
}

export function cloudLabel(pct) {
  if (!ok(pct)) return null
  if (pct < 10) return 'Clear'
  if (pct < 30) return 'Mostly clear'
  if (pct < 70) return 'Partly cloudy'
  if (pct < 90) return 'Mostly cloudy'
  return 'Overcast'
}

/** Rain rate category for an hourly amount (mm/h). */
export function rainIntensity(mmh) {
  if (!ok(mmh)) return null
  if (mmh < 0.1) return 'None'
  if (mmh < 2.5) return 'Light'
  if (mmh < 7.6) return 'Moderate'
  if (mmh < 50) return 'Heavy'
  return 'Violent'
}

export function aqiCategory(usAqi) {
  if (!ok(usAqi)) return null
  if (usAqi <= 50) return { label: 'Good', color: '#4fb34a' }
  if (usAqi <= 100) return { label: 'Moderate', color: '#e8d23a' }
  if (usAqi <= 150) return { label: 'Unhealthy for sensitive groups', color: '#f0912c' }
  if (usAqi <= 200) return { label: 'Unhealthy', color: '#e2503a' }
  if (usAqi <= 300) return { label: 'Very unhealthy', color: '#b26fd1' }
  return { label: 'Hazardous', color: '#8a2c47' }
}

export function durationText(sec) {
  if (!ok(sec)) return '—'
  const m = Math.round(sec / 60)
  return `${Math.floor(m / 60)} h ${pad(m % 60)} min`
}

// Moon phase from the mean synodic month. This is an astronomical calculation, not a measurement,
// and is labelled as such in the UI; WeatherAPI.com's own value is preferred when it is available.
const SYNODIC = 29.530588853
const NEW_MOON_REF = 947182440 // 2000-01-06 18:14 UTC
const MOON_NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent']
export function moonPhase(unix) {
  const age = mod((unix - NEW_MOON_REF) / 86400, SYNODIC)
  const illumination = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2
  return { name: MOON_NAMES[Math.round((age / SYNODIC) * 8) % 8], illumination: illumination * 100, age }
}

/**
 * Everything the selected-day panel needs, preferring the provider's daily values
 * and falling back to statistics of that day's real hourly values.
 */
export function summarizeDay(day) {
  const hours = day?.hours || []
  const temp = stats(hours, 'temp')
  const feels = stats(hours, 'feelsLike')
  const humidity = stats(hours, 'humidity')
  const pressure = stats(hours, 'pressure')
  const wind = stats(hours, 'windSpeed')
  const gust = stats(hours, 'windGust')
  const cloud = stats(hours, 'cloudPct')
  const vis = stats(hours, 'visibility')
  const pop = stats(hours, 'pop')
  const precip = stats(hours, 'precip')
  const uv = stats(hours, 'uv')
  const allPrecipKnown = hours.length > 0 && hours.every((h) => ok(h.precip))
  const daylight = ok(day?.daylight) ? day.daylight
    : ok(day?.sunrise) && ok(day?.sunset) && day.sunset > day.sunrise ? day.sunset - day.sunrise : null

  return {
    temp, feels, humidity, pressure, wind, gust, cloud, vis, pop, precip, uv,
    hourCount: hours.length,
    tempAvg: ok(day?.avgTemp) ? day.avgTemp : temp?.avg ?? null,
    feelsMin: ok(day?.feelsMin) ? day.feelsMin : feels?.min ?? null,
    feelsMax: ok(day?.feelsMax) ? day.feelsMax : feels?.max ?? null,
    humidityAvg: ok(day?.avgHumidity) ? day.avgHumidity : humidity?.avg ?? null,
    pressureTrend: pressure ? pressureTrend(pressure.first, pressure.last, 24) : null,
    windAvg: wind?.avg ?? null,
    windMax: ok(day?.windMax) ? day.windMax : wind?.max ?? null,
    gustMax: ok(day?.gustMax) ? day.gustMax : gust?.max ?? null,
    windDir: ok(day?.windDir) ? day.windDir : dominantDirection(hours),
    popMax: ok(day?.pop) ? day.pop : pop?.max ?? null,
    precipTotal: ok(day?.precip) ? day.precip : allPrecipKnown ? precip.sum : null,
    rainSum: ok(day?.rainSum) ? day.rainSum : null,
    snowSum: ok(day?.snowSum) ? day.snowSum : null,
    precipHours: ok(day?.precipHours) ? day.precipHours
      : allPrecipKnown ? hours.filter((h) => h.precip > 0).length : null,
    peakRate: precip?.max ?? null,
    peakRateAt: precip?.maxAt ?? null,
    uvMax: ok(day?.uvMax) ? day.uvMax : uv?.max ?? null,
    uvHoursAbove3: uv ? hours.filter((h) => ok(h.uv) && h.uv >= 3).length : null,
    cloudAvg: cloud?.avg ?? null,
    visAvg: ok(day?.avgVis) ? day.avgVis : vis?.avg ?? null,
    visMin: vis?.min ?? null,
    daylight,
  }
}

/** Hour slot containing `nowSec`, if the list covers it. */
export const hourAt = (hours, nowSec) => (hours || []).find((h) => h.dt <= nowSec && nowSec < h.dt + 3600) || null
