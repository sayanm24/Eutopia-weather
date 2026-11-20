// Chart definitions for every weather metric, in two resolutions:
//   'day'  — one row per real hourly forecast slot of the selected day
//   'week' — one row per forecast day
// Values are converted to display units here; a missing measurement stays null and is drawn as a gap.
import { Thermometer, Droplets, Gauge, Wind, CloudRain, SunMedium, Eye } from 'lucide-react'
import * as fmt from '../../utils/format.js'
import { summarizeDay, uvCategory, rainIntensity } from '../../utils/forecastStats.js'

// Validated (dataviz palette check, dark surface): slot 1 blue + slot 2 orange for paired series.
export const SERIES = {
  primary: '#3987e5',
  secondary: '#d95926',
  water: '#199e70',
  cloud: '#9085e9',
}

export const CHART_METRICS = [
  { id: 'temp', label: 'Temperature', icon: Thermometer },
  { id: 'humidity', label: 'Humidity', icon: Droplets },
  { id: 'pressure', label: 'Pressure', icon: Gauge },
  { id: 'wind', label: 'Wind', icon: Wind },
  { id: 'rain', label: 'Rain', icon: CloudRain },
  { id: 'uv', label: 'UV', icon: SunMedium },
  { id: 'sky', label: 'Visibility', icon: Eye },
]
export const metricMeta = (id) => CHART_METRICS.find((m) => m.id === id) || CHART_METRICS[0]

/** Rows for the hourly charts of one day. */
export function hourRows(hours, units) {
  return (hours || []).map((h) => ({
    dt: h.dt,
    temp: fmt.tempNum(h.temp, units),
    feels: fmt.tempNum(h.feelsLike, units),
    humidity: h.humidity ?? null,
    dew: fmt.tempNum(h.dewPoint, units),
    pressure: fmt.pressureNum(h.pressure, units),
    wind: fmt.windNum(h.windSpeed, units),
    gust: fmt.windNum(h.windGust, units),
    windDeg: h.windDeg ?? null,
    pop: h.pop ?? null,
    precip: h.precip ?? null,
    uv: h.uv ?? null,
    vis: fmt.distanceNum(h.visibility, units),
    cloud: h.cloudPct ?? null,
  }))
}

/** Rows for the 7-day charts: provider daily values first, statistics of real hourly values otherwise. */
export function dayRows(days, units) {
  return (days || []).map((d) => {
    const s = summarizeDay(d)
    return {
      dt: d.dt,
      tempMax: fmt.tempNum(d.max, units),
      tempMin: fmt.tempNum(d.min, units),
      humidityAvg: s.humidityAvg,
      pressureAvg: fmt.pressureNum(s.pressure?.avg, units),
      windMax: fmt.windNum(s.windMax, units),
      gustMax: fmt.windNum(s.gustMax, units),
      windDeg: s.windDir,
      popMax: s.popMax,
      precipSum: s.precipTotal,
      uvMax: s.uvMax,
      visAvg: fmt.distanceNum(s.visAvg, units),
      cloudAvg: s.cloudAvg,
    }
  })
}

const padded = (pad, floor = -Infinity) => [
  (min) => Math.max(floor, Math.floor(min - pad)),
  (max) => Math.ceil(max + pad),
]
const atLeast = (n) => [0, (max) => Math.max(n, Math.ceil(max))]
const pct = [0, 100]

/**
 * Chart spec for a metric.
 * panels: stacked charts sharing the time axis (two measures of different units never share a y-axis).
 * highlights: notable points to mark and list.
 */
export function chartSpec(metric, mode, units) {
  const T = fmt.UNIT.temp(units)
  const W = fmt.UNIT.wind(units)
  const P = fmt.UNIT.pressure(units)
  const D = fmt.UNIT.distance(units)
  const pDec = units === 'imperial' ? 2 : 0
  const week = mode === 'week'

  switch (metric) {
    case 'temp':
      return week ? {
        panels: [{
          id: 'temp', unit: T, decimals: 0, domain: padded(2),
          series: [
            { key: 'tempMax', name: 'High', type: 'line', color: SERIES.secondary },
            { key: 'tempMin', name: 'Low', type: 'line', color: SERIES.primary, dashed: true },
          ],
        }],
        highlights: [{ key: 'tempMax', kind: 'max', label: 'Warmest day' }, { key: 'tempMin', kind: 'min', label: 'Coldest night' }],
      } : {
        panels: [{
          id: 'temp', unit: T, decimals: 0, domain: padded(2),
          series: [
            { key: 'temp', name: 'Temperature', type: 'area', color: SERIES.primary },
            { key: 'feels', name: 'Feels like', type: 'line', color: SERIES.secondary, dashed: true },
          ],
        }],
        highlights: [{ key: 'temp', kind: 'max', label: 'Warmest' }, { key: 'temp', kind: 'min', label: 'Coolest' }],
      }

    case 'humidity':
      return {
        panels: [{
          id: 'humidity', unit: '%', decimals: 0, domain: pct, average: true,
          series: [{ key: week ? 'humidityAvg' : 'humidity', name: week ? 'Average humidity' : 'Relative humidity', type: 'area', color: SERIES.primary }],
        }],
        highlights: [
          { key: week ? 'humidityAvg' : 'humidity', kind: 'max', label: 'Highest humidity' },
          { key: week ? 'humidityAvg' : 'humidity', kind: 'min', label: 'Lowest humidity' },
        ],
      }

    case 'pressure':
      return {
        panels: [{
          id: 'pressure', unit: P, decimals: pDec, domain: units === 'imperial' ? [(m) => Math.floor((m - 0.05) * 20) / 20, (m) => Math.ceil((m + 0.05) * 20) / 20] : padded(2),
          series: [{ key: week ? 'pressureAvg' : 'pressure', name: week ? 'Average pressure (sea level)' : 'Pressure (sea level)', type: 'line', color: SERIES.primary }],
        }],
        highlights: [
          { key: week ? 'pressureAvg' : 'pressure', kind: 'min', label: 'Lowest pressure' },
          { key: week ? 'pressureAvg' : 'pressure', kind: 'max', label: 'Highest pressure' },
        ],
      }

    case 'wind':
      return {
        panels: [{
          id: 'wind', unit: W, decimals: 0, domain: atLeast(10), arrows: true,
          series: week ? [
            { key: 'windMax', name: 'Max wind', type: 'line', color: SERIES.primary },
            { key: 'gustMax', name: 'Max gust', type: 'line', color: SERIES.secondary, dashed: true },
          ] : [
            { key: 'wind', name: 'Wind speed', type: 'area', color: SERIES.primary },
            { key: 'gust', name: 'Gusts', type: 'line', color: SERIES.secondary, dashed: true },
          ],
        }],
        highlights: week
          ? [{ key: 'gustMax', kind: 'max', label: 'Strongest gust' }, { key: 'windMax', kind: 'max', label: 'Windiest day' }]
          : [{ key: 'gust', kind: 'max', label: 'Strongest gust' }, { key: 'wind', kind: 'max', label: 'Strongest wind' }],
      }

    case 'rain':
      return {
        panels: [
          {
            id: 'pop', unit: '%', decimals: 0, domain: pct, title: 'Chance of precipitation',
            series: [{ key: week ? 'popMax' : 'pop', name: week ? 'Max chance' : 'Chance', type: 'area', color: SERIES.primary }],
          },
          {
            id: 'precip', unit: 'mm', decimals: 1, domain: atLeast(1), title: week ? 'Precipitation total' : 'Precipitation amount',
            series: [{ key: week ? 'precipSum' : 'precip', name: week ? 'Total' : 'Amount', type: 'bar', color: SERIES.water }],
          },
        ],
        highlights: [
          { key: week ? 'popMax' : 'pop', kind: 'max', label: 'Highest rain probability', minValue: 1 },
          { key: week ? 'precipSum' : 'precip', kind: 'max', label: week ? 'Wettest day' : 'Heaviest hour', minValue: 0.05 },
        ],
      }

    case 'uv':
      return {
        panels: [{
          id: 'uv', unit: '', decimals: 1, domain: atLeast(6), uvBands: true,
          series: [{ key: week ? 'uvMax' : 'uv', name: week ? 'Max UV index' : 'UV index', type: 'bar', color: SERIES.primary, colorBy: (v) => uvCategory(v)?.color }],
        }],
        highlights: [{ key: week ? 'uvMax' : 'uv', kind: 'max', label: 'Peak UV', minValue: 0.5 }],
      }

    case 'sky':
    default:
      return {
        panels: [
          {
            id: 'vis', unit: D, decimals: 1, domain: atLeast(10), title: week ? 'Average visibility' : 'Visibility',
            series: [{ key: week ? 'visAvg' : 'vis', name: 'Visibility', type: 'line', color: SERIES.primary }],
          },
          {
            id: 'cloud', unit: '%', decimals: 0, domain: pct, title: week ? 'Average cloud cover' : 'Cloud cover',
            series: [{ key: week ? 'cloudAvg' : 'cloud', name: 'Cloud cover', type: 'area', color: SERIES.cloud }],
          },
        ],
        highlights: [
          { key: week ? 'visAvg' : 'vis', kind: 'min', label: 'Lowest visibility' },
          { key: week ? 'cloudAvg' : 'cloud', kind: 'max', label: 'Cloudiest', minValue: 1 },
        ],
      }
  }
}

/** Extra tooltip lines that put a value in context. */
export function tooltipExtras(metric, row) {
  if (metric === 'wind' && row.windDeg != null) return [{ label: 'From', value: `${fmt.compass(row.windDeg)} (${Math.round(row.windDeg)}°)` }]
  if (metric === 'uv') {
    const v = row.uv ?? row.uvMax
    const c = uvCategory(v)
    return c ? [{ label: 'Risk', value: c.label }] : []
  }
  if (metric === 'rain' && row.precip != null) return [{ label: 'Intensity', value: rainIntensity(row.precip) }]
  if (metric === 'humidity' && row.dew != null) return [{ label: 'Dew point', value: `${Math.round(row.dew)}°` }]
  return []
}

/** Find highlight points (extremes) in rows. */
export function findHighlights(rows, highlights) {
  const out = []
  for (const h of highlights) {
    let best = null
    for (const r of rows) {
      const v = r[h.key]
      if (v == null) continue
      if (!best || (h.kind === 'max' ? v > best.value : v < best.value)) best = { dt: r.dt, value: v }
    }
    if (!best) continue
    if (h.minValue != null && best.value < h.minValue) continue
    out.push({ ...h, ...best })
  }
  return out
}
