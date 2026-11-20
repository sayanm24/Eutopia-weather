import { Info } from 'lucide-react'
import ForecastDayCard from './ForecastDayCard.jsx'
import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'

/** Seven selectable days. Exactly one is selected; it drives every other section of the page. */
export default function SevenDayForecast() {
  const { days, dayIndex, todayIndex, selectDay, units, tzFor, data } = useForecastExplorer()
  const lo = Math.min(...days.map((d) => d.min))
  const hi = Math.max(...days.map((d) => d.max))
  const span = Math.max(1, hi - lo)

  const onKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(days.length - 1, Math.max(0, dayIndex + (e.key === 'ArrowDown' ? 1 : -1)))
      selectDay(next)
      e.currentTarget.querySelectorAll('button')[next]?.focus()
    }
  }

  return (
    <section className="panel glass" aria-labelledby="week-title">
      <header className="panel-head">
        <h2 id="week-title">{days.length}-day forecast</h2>
        <span className="panel-note">Select a day</span>
      </header>
      {days.length === 0 ? (
        <p className="empty">The daily forecast is unavailable right now.</p>
      ) : (
        <ul className="fdays" onKeyDown={onKey}>
          {days.map((d, i) => (
            <ForecastDayCard
              key={d.dt} day={d} tz={tzFor(d)} units={units} lo={lo} span={span}
              isToday={i === todayIndex} selected={i === dayIndex} onSelect={() => selectDay(i)}
            />
          ))}
        </ul>
      )}
      {days.length > 0 && days.length < 7 && (
        <p className="notice"><Info size={14} aria-hidden="true" />
          {data.sources.week} returned {days.length} days of forecast for this location, so only those are shown. Missing days are not estimated.
        </p>
      )}
    </section>
  )
}
