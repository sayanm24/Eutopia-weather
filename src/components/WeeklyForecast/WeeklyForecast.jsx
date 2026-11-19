import { useState } from 'react'
import { ChevronDown, Droplet } from 'lucide-react'
import WeatherGlyph from '../WeatherCards/WeatherGlyph.jsx'
import { classifyForecast } from '../../engines/weatherClassifier.js'
import * as fmt from '../../utils/format.js'

/** Seven-day forecast. With `detailed`, rows expand to show sunrise, UV, wind and rainfall. */
export default function WeeklyForecast({ daily, tzOffset, units, h12, detailed = false }) {
  const [open, setOpen] = useState(detailed ? 0 : -1)
  const days = daily.slice(0, 7)
  const lo = Math.min(...days.map((d) => d.min))
  const hi = Math.max(...days.map((d) => d.max))
  const span = Math.max(1, hi - lo)
  const nowSec = Date.now() / 1000

  return (
    <section className="panel glass" aria-label="7-day forecast">
      <header className="panel-head"><h2>7-day forecast</h2></header>
      {days.length === 0 ? (
        <p className="empty">Daily forecast is unavailable right now.</p>
      ) : (
        <ul className="weekly">
          {days.map((d, i) => {
            const c = classifyForecast(d)
            const isToday = fmt.sameLocalDay(d.dt, nowSec, tzOffset)
            const w = fmt.wind(d.windMax, units)
            const row = (
              <>
                <span className="day-name">{isToday ? 'Today' : detailed ? fmt.dayLong(d.dt, tzOffset) : fmt.dayShort(d.dt, tzOffset)}</span>
                <span className="day-icon"><WeatherGlyph env={c.env} size={22} label={c.label} /></span>
                <span className={`day-pop${d.pop >= 20 ? ' wet' : ''}`}>
                  {d.pop != null && d.pop >= 5 ? <><Droplet size={10} aria-hidden="true" />{Math.round(d.pop)}%</> : ''}
                </span>
                <span className="day-min">{fmt.tempText(d.min, units)}</span>
                <span className="day-range" aria-hidden="true">
                  <span style={{ left: `${((d.min - lo) / span) * 100}%`, right: `${((hi - d.max) / span) * 100}%` }} />
                </span>
                <span className="day-max">{fmt.tempText(d.max, units)}</span>
              </>
            )
            return (
              <li key={d.dt} className={open === i ? 'is-open' : ''}>
                {detailed ? (
                  <button className="day-row" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                    {row}
                    <ChevronDown size={16} className="day-chevron" aria-hidden="true" />
                  </button>
                ) : (
                  <div className="day-row">{row}</div>
                )}
                {detailed && open === i && (
                  <dl className="day-detail">
                    <div><dt>Conditions</dt><dd>{c.label}</dd></div>
                    <div><dt>Sunrise</dt><dd>{fmt.time(d.sunrise, tzOffset, h12)}</dd></div>
                    <div><dt>Sunset</dt><dd>{fmt.time(d.sunset, tzOffset, h12)}</dd></div>
                    <div><dt>UV max</dt><dd>{d.uvMax != null ? `${Math.round(d.uvMax)} · ${fmt.uvLabel(d.uvMax)}` : '—'}</dd></div>
                    <div><dt>Wind max</dt><dd>{w.value} {w.unit}</dd></div>
                    <div><dt>Precipitation</dt><dd>{d.precip != null ? `${d.precip.toFixed(1)} mm` : '—'}</dd></div>
                  </dl>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
