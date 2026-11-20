// Open-Meteo (keyless, CORS-enabled). Supplies hourly + 7-day forecasts and UV index,
// and acts as the fallback for current conditions / city search when OpenWeather is unavailable.
import { getJson } from './http.js'
import { dayOffset, localDateKey } from '../utils/forecastStats.js'

const CURRENT = 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m'
const HOURLY = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'dew_point_2m', 'pressure_msl',
  'precipitation_probability', 'precipitation', 'rain', 'showers', 'snowfall',
  'weather_code', 'cloud_cover', 'visibility', 'uv_index', 'is_day',
  'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
].join(',')
const DAILY = [
  'weather_code', 'temperature_2m_max', 'temperature_2m_min', 'apparent_temperature_max', 'apparent_temperature_min',
  'sunrise', 'sunset', 'daylight_duration', 'sunshine_duration', 'uv_index_max',
  'precipitation_sum', 'rain_sum', 'showers_sum', 'snowfall_sum', 'precipitation_hours', 'precipitation_probability_max',
  'wind_speed_10m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant',
].join(',')

const sum = (a, b) => (a == null && b == null ? null : (a ?? 0) + (b ?? 0))

export async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=${CURRENT}&hourly=${HOURLY}&daily=${DAILY}` +
    '&timezone=auto&timeformat=unixtime&wind_speed_unit=ms&forecast_days=7'
  const d = await getJson(url)
  const nowSec = Date.now() / 1000
  const tzOffset = d.utc_offset_seconds ?? 0

  // Every field is read as-is; a missing array or value stays null (never 0) so the UI can say "unavailable".
  const h = d.hourly
  const at = (key, i) => h[key]?.[i] ?? null
  const all = h.time.map((dt, i) => ({
    dt,
    temp: at('temperature_2m', i),
    feelsLike: at('apparent_temperature', i),
    humidity: at('relative_humidity_2m', i),
    dewPoint: at('dew_point_2m', i),
    pressure: at('pressure_msl', i),
    pop: at('precipitation_probability', i),
    precip: at('precipitation', i),
    rain: sum(at('rain', i), at('showers', i)),
    snow: at('snowfall', i), // cm
    cloudPct: at('cloud_cover', i),
    visibility: at('visibility', i), // m
    uv: at('uv_index', i),
    isDay: h.is_day ? h.is_day[i] === 1 : null,
    windSpeed: at('wind_speed_10m', i), // m/s
    windDeg: at('wind_direction_10m', i),
    windGust: at('wind_gusts_10m', i),
    cond: { provider: 'wmo', code: at('weather_code', i) },
  })).filter((s) => s.temp != null)

  const thisHour = [...all].reverse().find((s) => s.dt <= nowSec) || all[0]
  const hourly = all.filter((s) => s.dt > nowSec - 3600).slice(0, 48)

  const dd = d.daily
  const dat = (key, i) => dd[key]?.[i] ?? null
  const daily = dd.time.map((dt, i) => {
    const next = dd.time[i + 1] ?? dt + 86400
    const offset = dayOffset(dt, tzOffset)
    return {
      dt,
      date: localDateKey(dt, offset),
      tzOffset: offset,
      min: dat('temperature_2m_min', i),
      max: dat('temperature_2m_max', i),
      feelsMin: dat('apparent_temperature_min', i),
      feelsMax: dat('apparent_temperature_max', i),
      avgTemp: null, // not supplied by Open-Meteo; derived from the hourly values in the UI
      pop: dat('precipitation_probability_max', i),
      precip: dat('precipitation_sum', i),
      rainSum: sum(dat('rain_sum', i), dat('showers_sum', i)),
      snowSum: dat('snowfall_sum', i), // cm
      precipHours: dat('precipitation_hours', i),
      uvMax: dat('uv_index_max', i),
      windMax: dat('wind_speed_10m_max', i),
      gustMax: dat('wind_gusts_10m_max', i),
      windDir: dat('wind_direction_10m_dominant', i),
      sunrise: dat('sunrise', i),
      sunset: dat('sunset', i),
      daylight: dat('daylight_duration', i), // s
      sunshine: dat('sunshine_duration', i), // s
      moon: null,
      isDay: true,
      cond: { provider: 'wmo', code: dat('weather_code', i) },
      hours: all.filter((s) => s.dt >= dt && s.dt < next),
    }
  }).filter((s) => s.max != null && s.min != null)

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

  return { tzOffset, current, hourly, daily, uvNow: thisHour?.uv ?? null }
}

/** Hourly air quality (Open-Meteo Air Quality API, keyless). Roughly 5 days ahead; later hours are null. */
export async function fetchAirQuality(lat, lon, { signal } = {}) {
  const d = await getJson(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      '&hourly=us_aqi,european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide&timezone=auto&timeformat=unixtime&forecast_days=7',
    { signal },
  )
  const h = d.hourly || { time: [] }
  return h.time.map((dt, i) => ({
    dt,
    usAqi: h.us_aqi?.[i] ?? null,
    euAqi: h.european_aqi?.[i] ?? null,
    pm25: h.pm2_5?.[i] ?? null,
    pm10: h.pm10?.[i] ?? null,
    ozone: h.ozone?.[i] ?? null,
    no2: h.nitrogen_dioxide?.[i] ?? null,
  }))
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
