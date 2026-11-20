import { useMemo } from 'react'
import InteractiveWeatherChart from './InteractiveWeatherChart.jsx'
import WindCompass from './WindCompass.jsx'
import { useForecastExplorer } from '../../../hooks/useForecastExplorer.jsx'
import { dayRows, hourRows } from '../chartSpecs.js'
import * as fmt from '../../../utils/format.js'

/**
 * A metric chart wired to the shared forecast state: it plots the selected day (or the whole week),
 * marks the selected hour, and selecting a point selects that hour (or day) everywhere on the page.
 */
export function ConnectedChart({ metric, mode = 'day', compact = false, panels, showHighlights, onWeekSelect }) {
  const { days, day, hour, hours, units, h12, tzFor, selectHour, selectDay } = useForecastExplorer()
  const week = mode === 'week'
  const rows = useMemo(() => (week ? dayRows(days, units) : hourRows(hours, units)), [week, days, hours, units])
  const onSelect = (dt) => {
    if (!week) { selectHour(dt); return }
    const i = days.findIndex((d) => d.dt === dt)
    if (i >= 0) { selectDay(i); onWeekSelect?.(i) }
  }
  return (
    <InteractiveWeatherChart
      metric={metric} mode={mode} rows={rows} units={units} h12={h12} tz={tzFor(day)}
      selectedDt={week ? day?.dt : hour?.dt} onSelect={onSelect}
      compact={compact} panels={panels} showHighlights={showHighlights ?? !compact}
    />
  )
}

export const TemperatureChart = (p) => <ConnectedChart metric="temp" {...p} />
export const HumidityChart = (p) => <ConnectedChart metric="humidity" {...p} />
export const PressureChart = (p) => <ConnectedChart metric="pressure" {...p} />
export const PrecipitationChart = (p) => <ConnectedChart metric="rain" {...p} />
export const UVChart = (p) => <ConnectedChart metric="uv" {...p} />
export const VisibilityChart = (p) => <ConnectedChart metric="sky" {...p} />

/** Wind speed + gust chart with a compass for the selected hour and the day's dominant direction. */
export function WindChart(p) {
  const { hour, summary, units, h12, tzFor, day } = useForecastExplorer()
  const w = fmt.wind(hour?.windSpeed, units)
  if (p.compact) return <ConnectedChart metric="wind" {...p} />
  return (
    <div className="wind-chart">
      <ConnectedChart metric="wind" {...p} />
      <WindCompass
        deg={hour?.windDeg ?? null} secondaryDeg={summary.windDir} speed={w.value} unit={w.unit}
        caption={hour ? `${fmt.time(hour.dt, tzFor(day), h12)}${summary.windDir != null ? ` · day's prevailing wind ${fmt.compass(summary.windDir)} (orange dot)` : ''}` : null}
      />
    </div>
  )
}

export const CHART_COMPONENTS = {
  temp: TemperatureChart,
  humidity: HumidityChart,
  pressure: PressureChart,
  wind: WindChart,
  rain: PrecipitationChart,
  uv: UVChart,
  sky: VisibilityChart,
}
