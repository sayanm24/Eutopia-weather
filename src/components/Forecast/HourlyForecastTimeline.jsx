import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Droplet, Wind, Droplets } from 'lucide-react'
import WeatherGlyph from '../WeatherCards/WeatherGlyph.jsx'
import HourlyDetailPanel from './HourlyDetailPanel.jsx'
import { classifyForecast } from '../../engines/weatherClassifier.js'
import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import * as fmt from '../../utils/format.js'

/** Every hourly slot of the selected day as a scrollable, selectable timeline, plus the selected hour's details. */
export default function HourlyForecastTimeline() {
  const {
    day, hours, hour, isToday, units, h12, tzFor, nowSec, selectHour, stepHour, canStepBack, canStepForward,
  } = useForecastExplorer()
  const listRef = useRef(null)
  const tz = tzFor(day)

  // Keep the selected hour in view (horizontal scroll only; never moves the page).
  useEffect(() => {
    const list = listRef.current
    const el = list?.querySelector('[aria-pressed="true"]')
    if (!list || !el) return
    const left = el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2
    list.scrollTo({ left, behavior: 'smooth' })
  }, [hour?.dt, day?.dt])

  const scrollBy = (dir) => {
    const list = listRef.current
    if (list) list.scrollBy({ left: dir * list.clientWidth * 0.8, behavior: 'smooth' })
  }

  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); stepHour(1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepHour(-1) }
  }

  const title = `Hourly · ${isToday ? 'Today' : fmt.dayLong(day?.dt, tz)}`

  return (
    <section className="panel glass" aria-labelledby="hourly-title">
      <header className="panel-head">
        <h2 id="hourly-title">{title}</h2>
        <div className="timeline-nav">
          <button className="icon-btn" onClick={() => scrollBy(-1)} aria-label="Scroll timeline left"><ChevronsLeft size={16} /></button>
          <button className="icon-btn" onClick={() => stepHour(-1)} disabled={!canStepBack} aria-label="Previous hour"><ChevronLeft size={16} /></button>
          <button className="icon-btn" onClick={() => stepHour(1)} disabled={!canStepForward} aria-label="Next hour"><ChevronRight size={16} /></button>
          <button className="icon-btn" onClick={() => scrollBy(1)} aria-label="Scroll timeline right"><ChevronsRight size={16} /></button>
        </div>
      </header>

      {hours.length === 0 ? (
        <p className="empty">No hourly forecast is available for this day from the configured source.</p>
      ) : (
        <>
          <ul className="timeline" ref={listRef} onKeyDown={onKey} aria-label={`${title}, ${hours.length} hours`}>
            {hours.map((s) => {
              const c = classifyForecast(s)
              const isNow = isToday && s.dt <= nowSec && nowSec < s.dt + 3600
              const past = isToday && s.dt + 3600 <= nowSec
              const selected = hour?.dt === s.dt
              const wv = fmt.wind(s.windSpeed, units)
              return (
                <li key={s.dt}>
                  <button
                    className={`tl-hour${selected ? ' is-selected' : ''}${isNow ? ' is-now' : ''}${past ? ' is-past' : ''}`}
                    aria-pressed={selected} onClick={() => selectHour(s.dt)}
                    aria-label={`${fmt.time(s.dt, tz, h12)}, ${c.label}, ${fmt.tempText(s.temp, units)}`}
                  >
                    <span className="tl-time">{isNow ? 'Now' : fmt.hour(s.dt, tz, h12)}</span>
                    <WeatherGlyph env={c.env} isNight={c.isNight} size={22} />
                    <span className="tl-temp">{fmt.tempText(s.temp, units)}</span>
                    <span className="tl-feels" title="Feels like">{s.feelsLike != null ? `≈ ${fmt.tempText(s.feelsLike, units)}` : '—'}</span>
                    <span className={`tl-row${s.pop >= 20 ? ' wet' : ''}`} title="Chance of precipitation">
                      <Droplet size={10} aria-hidden="true" />{s.pop != null ? `${Math.round(s.pop)}%` : '—'}
                    </span>
                    <span className="tl-row" title="Precipitation">{s.precip != null ? `${s.precip.toFixed(1)} mm` : '—'}</span>
                    <span className="tl-row" title="Wind speed"><Wind size={10} aria-hidden="true" />{wv.value}</span>
                    <span className="tl-row" title="Humidity"><Droplets size={10} aria-hidden="true" />{s.humidity != null ? `${Math.round(s.humidity)}%` : '—'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="tl-legend">≈ feels like · <Droplet size={10} aria-hidden="true" /> chance · mm precipitation · <Wind size={10} aria-hidden="true" /> {fmt.UNIT.wind(units)} · <Droplets size={10} aria-hidden="true" /> humidity · ← → keys step through hours</p>
          {hour && <HourlyDetailPanel />}
        </>
      )}
    </section>
  )
}
