import { useEffect, useState } from 'react'
import { MapPin, Navigation2, Sunrise, Sunset, Umbrella, Thermometer } from 'lucide-react'
import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import * as fmt from '../../utils/format.js'

function LocalDate({ tzOffset, h12 }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30000)
    return () => clearInterval(id)
  }, [])
  return <time>{fmt.dateFull(now, tzOffset)} · {fmt.time(now, tzOffset, h12)} local time</time>
}

/** Title, place, local date, and the selected day's sun, rain and temperature range. */
export default function ForecastHeader() {
  const { data, day, isToday, summary: s, units, h12, tzFor } = useForecastExplorer()
  const { location } = data
  const tz = tzFor(day)
  const dayName = isToday ? 'Today' : fmt.dayLong(day?.dt, tz)

  return (
    <>
      <header className="view-head forecast-head">
        <h1>Forecast</h1>
        <p className="hero-place">
          {location.isGeo ? <Navigation2 size={15} aria-hidden="true" /> : <MapPin size={15} aria-hidden="true" />}
          <span>{fmt.placeName(location)}</span>
        </p>
        <p className="forecast-date"><LocalDate tzOffset={data.tzOffset} h12={h12} /></p>
      </header>

      {day && (
        <dl className="metrics glass" aria-label={`${dayName} at a glance`}>
          <div className="metric">
            <dt><Sunrise size={15} aria-hidden="true" />Sunrise · {dayName}</dt>
            <dd><span className="metric-value">{fmt.time(day.sunrise, tz, h12)}</span></dd>
          </div>
          <div className="metric">
            <dt><Sunset size={15} aria-hidden="true" />Sunset · {dayName}</dt>
            <dd><span className="metric-value">{fmt.time(day.sunset, tz, h12)}</span></dd>
          </div>
          <div className="metric">
            <dt><Umbrella size={15} aria-hidden="true" />Rain chance</dt>
            <dd>
              <span className="metric-value">{s.popMax != null ? Math.round(s.popMax) : '—'}</span>
              {s.popMax != null && <span className="metric-unit">%</span>}
              {s.precipTotal != null && <span className="metric-note">{s.precipTotal.toFixed(1)} mm expected</span>}
            </dd>
          </div>
          <div className="metric">
            <dt><Thermometer size={15} aria-hidden="true" />Temperature range</dt>
            <dd><span className="metric-value">{fmt.tempText(day.min, units)} – {fmt.tempText(day.max, units)}</span></dd>
          </div>
        </dl>
      )}
    </>
  )
}
