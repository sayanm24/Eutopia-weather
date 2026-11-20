import { CloudOff } from 'lucide-react'
import { ForecastExplorerProvider, useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import ForecastHeader from '../Forecast/ForecastHeader.jsx'
import WeatherMetricsGrid from '../Forecast/WeatherMetricsGrid.jsx'
import HourlyForecastTimeline from '../Forecast/HourlyForecastTimeline.jsx'
import SevenDayForecast from '../Forecast/SevenDayForecast.jsx'
import TemperatureRangeChart from '../Forecast/TemperatureRangeChart.jsx'
import SelectedDayDetails from '../Forecast/SelectedDayDetails.jsx'
import WeatherInsights from '../Forecast/WeatherInsights.jsx'
import SoundOfTheSky from '../Forecast/SoundOfTheSky.jsx'

function ForecastPage({ resolved, onOpenMusic }) {
  const { data, days, setMetric, setRange } = useForecastExplorer()

  const openInsights = (metric) => {
    setMetric(metric)
    setRange('day')
    requestAnimationFrame(() => document.getElementById('weather-insights')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="view forecast">
      <ForecastHeader />
      <WeatherMetricsGrid onOpenInsights={openInsights} />

      {days.length === 0 ? (
        <section className="panel glass">
          <p className="empty"><CloudOff size={16} aria-hidden="true" />
            The hourly and daily forecast couldn’t be loaded, so no forecast is shown. Current conditions above are live.
          </p>
        </section>
      ) : (
        <>
          <HourlyForecastTimeline />
          <div className="forecast-split">
            <SevenDayForecast />
            <TemperatureRangeChart />
          </div>
          <SelectedDayDetails />
          <WeatherInsights />
        </>
      )}

      <SoundOfTheSky resolved={resolved} onOpenMusic={onOpenMusic} />
      {data.sources.forecast && (
        <p className="fineprint">
          Current conditions: {data.sources.current} · Forecast: {data.sources.week || data.sources.forecast}
 · Air quality: Open-Meteo · Times are local to {data.location.name}.
        </p>
      )}
    </div>
  )
}

/** Interactive forecast: every section follows the selected day, hour and metric held in shared state. */
export default function ForecastView({ data, units, h12, resolved, onOpenMusic }) {
  return (
    <ForecastExplorerProvider data={data} units={units} h12={h12}>
      <ForecastPage resolved={resolved} onOpenMusic={onOpenMusic} />
    </ForecastExplorerProvider>
  )
}
