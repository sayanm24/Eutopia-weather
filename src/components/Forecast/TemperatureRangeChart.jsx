import { motion } from 'framer-motion'
import WeatherGlyph from '../WeatherCards/WeatherGlyph.jsx'
import { classifyForecast } from '../../engines/weatherClassifier.js'
import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import * as fmt from '../../utils/format.js'

/** Floating min–max columns for each forecast day, on one shared temperature scale. Click a column to open that day. */
export default function TemperatureRangeChart() {
  const { days, dayIndex, todayIndex, selectDay, units, tzFor } = useForecastExplorer()
  if (!days.length) return null
  const lo = Math.min(...days.map((d) => d.min))
  const hi = Math.max(...days.map((d) => d.max))
  const span = Math.max(1, hi - lo)
  const pos = (v) => ((v - lo) / span) * 100

  return (
    <section className="panel glass" aria-labelledby="range-title">
      <header className="panel-head">
        <h2 id="range-title">Temperature range</h2>
        <span className="panel-note">{fmt.tempText(lo, units)} – {fmt.tempText(hi, units)} this week</span>
      </header>
      <ul className="trange">
        {days.map((d, i) => {
          const tz = tzFor(d)
          const c = classifyForecast(d)
          const selected = i === dayIndex
          return (
            <li key={d.dt}>
            <button
              className={`trange-col${selected ? ' is-selected' : ''}`} onClick={() => selectDay(i)}
              aria-pressed={selected} aria-label={`${i === todayIndex ? 'Today' : fmt.dayLong(d.dt, tz)}: low ${fmt.tempText(d.min, units)}, high ${fmt.tempText(d.max, units)}`}
            >
              <span className="trange-track">
                <motion.span
                  className="trange-bar"
                  initial={false}
                  animate={{ bottom: `${pos(d.min)}%`, top: `${100 - pos(d.max)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <b className="trange-max">{fmt.tempText(d.max, units)}</b>
                  <b className="trange-min">{fmt.tempText(d.min, units)}</b>
                </motion.span>
              </span>
              <WeatherGlyph env={c.env} size={18} />
              <span className="trange-day">{i === todayIndex ? 'Today' : fmt.dayShort(d.dt, tz)}</span>
            </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
