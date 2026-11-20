import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import * as fmt from '../../utils/format.js'
import { durationText, pressureTrend, rainIntensity, uvCategory, hourAt } from '../../utils/forecastStats.js'

const when = (dt, tz, h12) => (dt != null ? fmt.time(dt, tz, h12) : null)

/** Key statistics for one metric on the selected day. Every figure comes from the forecast; gaps say so. */
export default function MetricSummary({ metric }) {
  const { summary: s, day, hour, units, h12, tzFor, isToday, data, nowSec } = useForecastExplorer()
  const tz = tzFor(day)
  const T = (c) => fmt.tempText(c, units)
  const W = (ms) => { const w = fmt.wind(ms, units); return w.unit ? `${w.value} ${w.unit}` : '—' }
  const P = (h) => { const p = fmt.pressure(h, units); return p.unit ? `${p.value} ${p.unit}` : '—' }
  const D = (m) => { const v = fmt.distance(m, units); return v.unit ? `${v.value} ${v.unit}` : '—' }
  const hourLabel = hour ? fmt.time(hour.dt, tz, h12) : null

  let items = []
  switch (metric) {
    case 'temp':
      items = [
        { label: 'High', value: T(day?.max) },
        { label: 'Low', value: T(day?.min) },
        { label: 'Average', value: T(s.tempAvg), note: s.temp ? `${s.temp.count} hourly readings` : null },
        { label: 'Feels like', value: s.feelsMin != null ? `${T(s.feelsMin)} – ${T(s.feelsMax)}` : '—' },
      ]
      break
    case 'humidity':
      items = [
        { label: 'Average', value: fmt.pct(s.humidityAvg) },
        { label: 'Lowest', value: fmt.pct(s.humidity?.min), note: when(s.humidity?.minAt, tz, h12) },
        { label: 'Highest', value: fmt.pct(s.humidity?.max), note: when(s.humidity?.maxAt, tz, h12) },
        { label: hourLabel ? `At ${hourLabel}` : 'Selected hour', value: fmt.pct(hour?.humidity) },
      ]
      break
    case 'pressure': {
      // For today, the 3-hour tendency uses the live reading against the forecast three hours earlier.
      const threeAgo = isToday ? hourAt(day?.hours, nowSec - 3 * 3600) : null
      const tendency = isToday && threeAgo ? pressureTrend(threeAgo.pressure, data.current.pressure, 3) : null
      items = [
        isToday
          ? { label: 'Now', value: P(data.current.pressure), note: tendency ? `${tendency.label} · ${fmt.pressureDelta(tendency.change, units)} in 3 h` : null }
          : { label: hourLabel ? `At ${hourLabel}` : 'Selected hour', value: P(hour?.pressure) },
        { label: 'Lowest', value: P(s.pressure?.min), note: when(s.pressure?.minAt, tz, h12) },
        { label: 'Highest', value: P(s.pressure?.max), note: when(s.pressure?.maxAt, tz, h12) },
        { label: 'Trend over the day', value: s.pressureTrend?.label ?? '—', note: s.pressureTrend ? fmt.pressureDelta(s.pressureTrend.change, units) : null },
      ]
      break
    }
    case 'wind':
      items = [
        { label: 'Average', value: W(s.windAvg) },
        { label: 'Maximum', value: W(s.windMax), note: when(s.wind?.maxAt, tz, h12) },
        { label: 'Strongest gust', value: W(s.gustMax), note: when(s.gust?.maxAt, tz, h12) },
        { label: 'Prevailing direction', value: s.windDir != null ? `${fmt.compass(s.windDir)} · ${Math.round(s.windDir)}°` : '—' },
      ]
      break
    case 'rain':
      items = [
        { label: 'Max chance', value: fmt.pct(s.popMax) },
        { label: 'Total precipitation', value: fmt.mm(s.precipTotal) },
        { label: 'Hours with precipitation', value: s.precipHours != null ? `${Math.round(s.precipHours)} h` : '—' },
        {
          label: 'Peak intensity', value: s.peakRate != null ? `${s.peakRate.toFixed(1)} mm/h` : '—',
          note: s.peakRate != null && s.peakRate > 0 ? `${rainIntensity(s.peakRate)} · ${when(s.peakRateAt, tz, h12)}` : s.peakRate != null ? 'No precipitation forecast' : null,
        },
      ]
      break
    case 'uv': {
      const cat = uvCategory(s.uvMax)
      items = [
        { label: 'Max UV index', value: s.uvMax != null ? (Math.round(s.uvMax * 10) / 10).toString() : '—', note: cat?.label, swatch: cat?.color },
        { label: 'Peak time', value: when(s.uv?.maxAt, tz, h12) ?? '—' },
        { label: 'Hours at UV 3+', value: s.uvHoursAbove3 != null ? `${s.uvHoursAbove3} h` : '—' },
        { label: 'Advice', value: cat ? cat.advice : 'UV forecast unavailable', wide: true },
      ]
      break
    }
    case 'sky':
    default:
      items = [
        { label: 'Average visibility', value: D(s.visAvg) },
        { label: 'Lowest visibility', value: D(s.visMin), note: when(s.vis?.minAt, tz, h12) },
        { label: 'Average cloud cover', value: fmt.pct(s.cloudAvg) },
        { label: 'Sunshine', value: day?.sunshine != null ? durationText(day.sunshine) : '—' },
      ]
  }

  return (
    <dl className="msum">
      {items.map((it) => (
        <div key={it.label} className={it.wide ? 'wide' : ''}>
          <dt>{it.label}</dt>
          <dd>
            {it.swatch && <i className="swatch" style={{ background: it.swatch }} aria-hidden="true" />}
            <span className={it.wide ? 'msum-text' : 'msum-value'}>{it.value}</span>
            {it.note && <small>{it.note}</small>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
