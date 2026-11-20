// Weather aggregator: the single entry point the UI uses.
//
// Provider order
//   1. WeatherAPI.com — primary when WEATHERAPI_KEY is configured (search, current, forecast)
//   2. OpenWeather    — current conditions when WeatherAPI.com is absent or failing
//   3. Open-Meteo     — keyless: hourly / 7-day / UV, and last-resort current conditions + geocoding
//
// Every value shown comes from a live API response; nothing is synthesised.
import * as wa from './weatherApiCom.js'
import * as ow from './openWeatherApi.js'
import * as om from './openMeteoApi.js'
import { ApiError } from './http.js'
import { coordLabel, locKey, parseCoordinates } from '../utils/location.js'

const fallbackName = (location) =>
  (location.isGeo ? 'Current location' : coordLabel(location.lat, location.lon))

async function viaWeatherApi(location) {
  const { lat, lon } = location
  const [waRes, omRes] = await Promise.allSettled([wa.fetchForecast(lat, lon), om.fetchForecast(lat, lon)])
  if (waRes.status !== 'fulfilled') throw waRes.reason
  const w = waRes.value
  const o = omRes.status === 'fulfilled' ? omRes.value : null
  // WeatherAPI.com's free plan returns fewer than 7 days; use Open-Meteo for the full week when needed.
  // Each day keeps the hourly values from the same provider as its daily values, so a day never mixes sources.
  const waWeek = w.daily.length >= 7
  let daily = waWeek || !o ? w.daily : o.daily
  if (daily !== w.daily) {
    // Open-Meteo has no astronomy beyond sunrise/sunset: carry WeatherAPI.com's moon data over by calendar date.
    const moonByDate = new Map(w.daily.map((d) => [d.date, d.moon]))
    daily = daily.map((d) => (moonByDate.get(d.date) ? { ...d, moon: moonByDate.get(d.date) } : d))
  }
  const hourly = w.hourly.length >= 24 || !o ? w.hourly : o.hourly
  const forecastSources = [...new Set([
    hourly === w.hourly ? 'WeatherAPI.com' : 'Open-Meteo',
    daily === w.daily ? 'WeatherAPI.com' : 'Open-Meteo',
  ])].join(' + ')

  const named = Boolean(location.name)
  return {
    location: {
      ...location,
      name: location.name || w.name || fallbackName(location),
      admin: named ? location.admin || null : w.admin,
      country: named ? location.country || null : w.countryName,
    },
    tzOffset: w.tzOffset,
    fetchedAt: Date.now(),
    current: w.current,
    hourly,
    daily,
    // Alerts are a WeatherAPI.com feature; an empty array means "none active", null means "not supported".
    alerts: w.alerts,
    sources: {
      current: 'WeatherAPI.com',
      forecast: forecastSources,
      week: daily === w.daily ? 'WeatherAPI.com' : 'Open-Meteo',
      alerts: 'WeatherAPI.com',
    },
    notices: { openWeather: null, forecast: null },
  }
}

async function viaOpenWeather(location) {
  const { lat, lon } = location
  const useOw = ow.openWeatherUsable()
  const [owRes, omRes] = await Promise.allSettled([
    useOw ? ow.fetchCurrent(lat, lon) : Promise.reject(new ApiError('invalid-key', 'OpenWeather key rejected')),
    om.fetchForecast(lat, lon),
  ])

  const owData = owRes.status === 'fulfilled' ? owRes.value : null
  const omData = omRes.status === 'fulfilled' ? omRes.value : null

  if (!owData && !omData?.current) {
    // Prefer reporting the connectivity-type error if there is one.
    const errs = [omRes.reason, owRes.reason].filter(Boolean)
    throw errs.find((e) => e.kind === 'offline') || errs.find((e) => e.kind !== 'invalid-key') || errs[0]
  }

  let current
  if (owData) {
    current = { ...owData.current }
    if (omData) {
      current.uv = omData.uvNow
      current.isDay = omData.current?.isDay ?? null
    }
  } else {
    current = omData.current
  }

  // Resolve a display name for bare coordinates (geolocation or a lat/lon search).
  let { name, country, admin } = location
  if (!name) {
    if (owData?.name) { name = owData.name; country = owData.country }
    else name = fallbackName(location)
  }

  return {
    location: { ...location, name, country: country || null, admin: admin || null },
    tzOffset: owData?.tzOffset ?? omData?.tzOffset ?? 0,
    fetchedAt: Date.now(),
    current,
    hourly: omData?.hourly ?? [],
    daily: omData?.daily ?? [],
    alerts: null, // neither OpenWeather's free current-weather endpoint nor Open-Meteo provides alerts
    sources: {
      current: owData ? 'OpenWeather' : 'Open-Meteo',
      forecast: omData ? 'Open-Meteo' : null,
      week: omData ? 'Open-Meteo' : null,
      alerts: null,
    },
    // Why a provider was skipped, so the UI can explain it instead of hiding it.
    notices: {
      openWeather: owData ? null : owRes.reason?.kind || 'network',
      forecast: omData ? null : omRes.reason?.kind || 'network',
    },
  }
}

export async function fetchWeather(location) {
  if (wa.usable()) {
    try {
      return await viaWeatherApi(location)
    } catch (err) {
      if (err.kind === 'offline') throw err
      // otherwise fall back to the other providers
    }
  }
  return viaOpenWeather(location)
}

// ───────── Location search ─────────

const COUNTRY_ALIASES = {
  usa: 'US', us: 'US', 'u.s.': 'US', 'u.s.a.': 'US', america: 'US', 'united states': 'US',
  uk: 'GB', 'u.k.': 'GB', britain: 'GB', 'great britain': 'GB', england: 'GB', scotland: 'GB', wales: 'GB',
  uae: 'AE', 'u.a.e.': 'AE', emirates: 'AE',
}

function matchesQualifier(place, qualifier) {
  const q = qualifier.toLowerCase()
  const code = (place.country || '').toLowerCase()
  const fields = [place.countryName, place.admin].filter(Boolean).map((s) => s.toLowerCase())
  return code === q
    || (COUNTRY_ALIASES[q] || '').toLowerCase() === code
    || fields.some((f) => f.includes(q))
}

const suggestionCache = new Map()
const CACHE_LIMIT = 80

const dedupe = (list) => {
  const seen = new Set()
  return list.filter((r) => (seen.has(locKey(r)) ? false : seen.add(locKey(r))))
}

/**
 * Worldwide place search for autocomplete. Accepts place names ("Darjeeling"),
 * "City, Country/Region" ("London, UK") and coordinates ("22.57, 88.36").
 * Pass an AbortSignal to cancel a request that has been superseded.
 */
export async function searchLocations(query, { signal } = {}) {
  const q = query.trim()

  const coords = parseCoordinates(q)
  if (coords) return [{ ...coords, name: null, isCoords: true, label: coordLabel(coords.lat, coords.lon) }]
  if (q.length < 2) return []

  const key = q.toLowerCase()
  if (suggestionCache.has(key)) return suggestionCache.get(key)

  const fatal = (err) => err.kind === 'aborted' || err.kind === 'offline'
  let results = []
  let failure = null

  if (wa.usable()) {
    try { results = await wa.search(q, { signal }) } catch (err) { if (fatal(err)) throw err }
  }

  if (!results.length) {
    // Open-Meteo matches on the place name only, so split off any ", Country" qualifier and filter with it.
    const [namePart, ...rest] = q.split(',')
    const qualifier = rest.join(',').trim()
    const language = (navigator.language || 'en').slice(0, 2).toLowerCase()
    try {
      const found = await om.searchCities(namePart.trim(), { signal, language })
      const narrowed = qualifier ? found.filter((p) => matchesQualifier(p, qualifier)) : found
      results = narrowed.length ? narrowed : found
    } catch (err) {
      if (fatal(err)) throw err
      failure = err
    }
  }

  if (!results.length && ow.openWeatherUsable()) {
    try { results = await ow.searchCities(q, { signal }) } catch (err) {
      if (fatal(err)) throw err
      failure = failure || err
    }
  }

  if (!results.length && failure) throw failure // a real failure, not "no matches" — don't cache it

  results = dedupe(results).slice(0, 8)
  if (suggestionCache.size >= CACHE_LIMIT) suggestionCache.delete(suggestionCache.keys().next().value)
  suggestionCache.set(key, results)
  return results
}

// ───────── Air quality (Open-Meteo, fetched only when the Forecast view needs it) ─────────

const airCache = new Map()
const AIR_TTL = 30 * 60 * 1000

/** Hourly air quality for a location, cached for 30 minutes so switching days or views never refetches. */
export async function fetchAirQuality(location, opts) {
  const key = `${location.lat.toFixed(3)},${location.lon.toFixed(3)}`
  const hit = airCache.get(key)
  if (hit && Date.now() - hit.at < AIR_TTL) return hit.data
  const data = await om.fetchAirQuality(location.lat, location.lon, opts)
  if (airCache.size > 20) airCache.delete(airCache.keys().next().value)
  airCache.set(key, { at: Date.now(), data })
  return data
}

export const openWeatherStatus = ow.openWeatherStatus
export const weatherApiStatus = wa.status
