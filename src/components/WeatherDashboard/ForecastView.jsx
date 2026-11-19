import { Sunrise, Sunset, Umbrella, Thermometer } from 'lucide-react'
import HourlyForecast from '../HourlyForecast/HourlyForecast.jsx'
import WeeklyForecast from '../WeeklyForecast/WeeklyForecast.jsx'
import * as fmt from '../../utils/format.js'

export default function ForecastView({ data, units, h12 }) {
  const { current, hourly, daily, tzOffset, location } = data
  const next24 = hourly.slice(0, 24)
  const maxPop = next24.length ? Math.max(...next24.map((h) => h.pop ?? 0)) : null
  const rainTotal = next24.reduce((sum, h) => sum + (h.precip || 0), 0)
  const temps = next24.map((h) => h.temp)

  return (
    <div className="view">
      <header className="view-head">
        <h1>Forecast</h1>
        <p>{fmt.placeName(location)}</p>
      </header>

      <dl className="metrics glass">
        <div className="metric">
          <dt><Sunrise size={15} aria-hidden="true" />Sunrise</dt>
          <dd><span className="metric-value">{fmt.time(current.sunrise, tzOffset, h12)}</span></dd>
        </div>
        <div className="metric">
          <dt><Sunset size={15} aria-hidden="true" />Sunset</dt>
          <dd><span className="metric-value">{fmt.time(current.sunset, tzOffset, h12)}</span></dd>
        </div>
        <div className="metric">
          <dt><Umbrella size={15} aria-hidden="true" />Rain chance, 24 h</dt>
          <dd>
            <span className="metric-value">{maxPop != null ? Math.round(maxPop) : '—'}</span>
            {maxPop != null && <span className="metric-unit">%</span>}
            {next24.length > 0 && <span className="metric-note">{rainTotal.toFixed(1)} mm expected</span>}
          </dd>
        </div>
        <div className="metric">
          <dt><Thermometer size={15} aria-hidden="true" />Range, 24 h</dt>
          <dd>
            <span className="metric-value">
              {temps.length ? `${fmt.tempText(Math.min(...temps), units)} – ${fmt.tempText(Math.max(...temps), units)}` : '—'}
            </span>
          </dd>
        </div>
      </dl>

      <HourlyForecast hourly={hourly} tzOffset={tzOffset} units={units} h12={h12} count={48} title="Next 48 hours" />
      <WeeklyForecast daily={daily} tzOffset={tzOffset} units={units} h12={h12} detailed />
      {data.sources.forecast && <p className="fineprint">Forecast data: {data.sources.forecast}. Tap a day for details.</p>}
    </div>
  )
}
