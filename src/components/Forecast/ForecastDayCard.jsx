import { Droplet } from 'lucide-react'
import WeatherGlyph from '../WeatherCards/WeatherGlyph.jsx'
import { classifyForecast } from '../../engines/weatherClassifier.js'
import * as fmt from '../../utils/format.js'

/** One selectable row of the seven-day forecast. */
export default function ForecastDayCard({ day, tz, units, isToday, selected, lo, span, onSelect }) {
  const c = classifyForecast(day)
  return (
    <li>
      <button className={`fday${selected ? ' is-selected' : ''}`} onClick={onSelect} aria-pressed={selected}
        aria-label={`${isToday ? 'Today' : fmt.dayLong(day.dt, tz)} ${fmt.dayMonth(day.dt, tz)}: ${c.label}, high ${fmt.tempText(day.max, units)}, low ${fmt.tempText(day.min, units)}`}>
        <span className="fday-name">
          <strong>{isToday ? 'Today' : fmt.dayLong(day.dt, tz)}</strong>
          <small>{fmt.dayMonth(day.dt, tz)}</small>
        </span>
        <span className="fday-icon"><WeatherGlyph env={c.env} size={22} /></span>
        <span className="fday-cond">{c.label}</span>
        <span className={`fday-pop${day.pop >= 20 ? ' wet' : ''}`}>
          {day.pop != null ? <><Droplet size={10} aria-hidden="true" />{Math.round(day.pop)}%</> : '—'}
        </span>
        <span className="fday-min">{fmt.tempText(day.min, units)}</span>
        <span className="day-range" aria-hidden="true">
          <span style={{ left: `${((day.min - lo) / span) * 100}%`, right: `${100 - ((day.max - lo) / span) * 100}%` }} />
        </span>
        <span className="fday-max">{fmt.tempText(day.max, units)}</span>
      </button>
    </li>
  )
}
