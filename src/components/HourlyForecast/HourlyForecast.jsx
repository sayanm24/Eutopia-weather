import { Droplet } from 'lucide-react'
import WeatherGlyph from '../WeatherCards/WeatherGlyph.jsx'
import { classifyForecast } from '../../engines/weatherClassifier.js'
import * as fmt from '../../utils/format.js'

/** Horizontally scrollable hourly forecast. */
export default function HourlyForecast({ hourly, tzOffset, units, h12, count = 24, title = 'Next 24 hours' }) {
  const slots = hourly.slice(0, count)
  const nowSec = Date.now() / 1000

  return (
    <section className="panel glass" aria-label={title}>
      <header className="panel-head"><h2>{title}</h2></header>
      {slots.length === 0 ? (
        <p className="empty">Hourly forecast is unavailable right now.</p>
      ) : (
        <ul className="hourly" tabIndex={0}>
          {slots.map((s, i) => {
            const c = classifyForecast(s)
            const isNow = s.dt <= nowSec
            const newDay = i > 0 && !fmt.sameLocalDay(s.dt, slots[i - 1].dt, tzOffset)
            return (
              <li key={s.dt} className={`hour${isNow ? ' is-now' : ''}`} title={c.label}>
                <span className="hour-time">{isNow ? 'Now' : newDay ? fmt.dayShort(s.dt, tzOffset) : fmt.hour(s.dt, tzOffset, h12)}</span>
                <WeatherGlyph env={c.env} isNight={c.isNight} size={24} label={c.label} />
                <span className="hour-temp">{fmt.tempText(s.temp, units)}</span>
                <span className={`hour-pop${s.pop >= 20 ? ' wet' : ''}`}>
                  {s.pop != null ? <><Droplet size={10} aria-hidden="true" />{Math.round(s.pop)}%</> : ' '}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
