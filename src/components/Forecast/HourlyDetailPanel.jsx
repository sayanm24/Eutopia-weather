import { AnimatePresence, motion } from 'framer-motion'
import WeatherGlyph from '../WeatherCards/WeatherGlyph.jsx'
import WindCompass from './Charts/WindCompass.jsx'
import { classifyForecast } from '../../engines/weatherClassifier.js'
import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import * as fmt from '../../utils/format.js'
import { cloudLabel, humidityLabel, rainIntensity, uvCategory, visibilityLabel, windLabel } from '../../utils/forecastStats.js'

const NA = 'Not available'

/** Every measurement the forecast provides for the selected hour. */
export default function HourlyDetailPanel() {
  const { hour: h, day, units, h12, tzFor, data } = useForecastExplorer()
  const tz = tzFor(day)
  const c = classifyForecast(h)
  const w = fmt.wind(h.windSpeed, units)
  const g = fmt.wind(h.windGust, units)
  const p = fmt.pressure(h.pressure, units)
  const v = fmt.distance(h.visibility, units)
  const uv = uvCategory(h.uv)
  const join = (a, b) => (a.unit ? `${a.value} ${a.unit}` : NA) + (b ? ` · ${b}` : '')

  const rows = [
    ['Temperature', fmt.tempText(h.temp, units)],
    ['Feels like', h.feelsLike != null ? fmt.tempText(h.feelsLike, units) : NA],
    ['Dew point', h.dewPoint != null ? fmt.tempText(h.dewPoint, units) : NA],
    ['Humidity', h.humidity != null ? `${Math.round(h.humidity)}% · ${humidityLabel(h.humidity)}` : NA],
    ['Chance of precipitation', h.pop != null ? `${Math.round(h.pop)}%` : NA],
    ['Precipitation', h.precip != null ? `${h.precip.toFixed(1)} mm · ${rainIntensity(h.precip)}` : NA],
    ['Rain', h.rain != null ? `${h.rain.toFixed(1)} mm` : NA],
    ['Snowfall', h.snow != null ? `${h.snow.toFixed(1)} cm` : NA],
    ['Wind', join(w, windLabel(h.windSpeed))],
    ['Gusts', join(g)],
    ['Pressure', join(p)],
    ['Cloud cover', h.cloudPct != null ? `${Math.round(h.cloudPct)}% · ${cloudLabel(h.cloudPct)}` : NA],
    ['Visibility', join(v, visibilityLabel(h.visibility))],
    ['UV index', h.uv != null ? `${Math.round(h.uv * 10) / 10} · ${uv.label}` : NA],
  ]

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.article
        key={h.dt} className="hour-detail" aria-live="polite"
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
      >
        <header className="hour-detail-head">
          <WeatherGlyph env={c.env} isNight={c.isNight} size={30} />
          <div>
            <h3>{fmt.time(h.dt, tz, h12)} · {fmt.dateLong(h.dt, tz)}</h3>
            <p>{c.label || 'Conditions unavailable'}{h.isDay != null ? ` · ${h.isDay ? 'Daylight' : 'Night'}` : ''}</p>
          </div>
        </header>
        <div className="hour-detail-body">
          <dl className="hour-detail-grid">
            {rows.map(([label, value]) => (
              <div key={label} className={value === NA ? 'na' : ''}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
          <WindCompass deg={h.windDeg} speed={w.value} unit={w.unit} size={132} />
        </div>
        <p className="fineprint">Hourly forecast from {data.sources.week || data.sources.forecast}. “Not available” means the source does not supply that field.</p>
      </motion.article>
    </AnimatePresence>
  )
}
