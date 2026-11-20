import { Fragment, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Thermometer, ThermometerSun, Droplets, Wind, Navigation2, Tornado, SunMedium, Eye, Gauge, Cloud, CloudRain, Umbrella, X, ChartSpline,
} from 'lucide-react'
import WeatherMetricCard from './WeatherMetricCard.jsx'
import MetricSummary from './MetricSummary.jsx'
import { CHART_COMPONENTS } from './Charts/WeatherCharts.jsx'
import { metricMeta } from './chartSpecs.js'
import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import * as fmt from '../../utils/format.js'
import {
  cloudLabel, humidityLabel, hourAt, pressureTrend, summarizeDay, uvCategory, visibilityLabel, windLabel,
} from '../../utils/forecastStats.js'

const unavailable = (source) => `Not reported by ${source}`

/** Live readings as twelve clickable cards. Clicking a card opens that measurement's graph for the selected day. */
export default function WeatherMetricsGrid({ onOpenInsights }) {
  const { data, days, todayIndex, units, h12, nowSec, tzFor, day, isToday } = useForecastExplorer()
  const [open, setOpen] = useState(null)
  const detailRef = useRef(null)
  const { current, sources } = data
  const src = sources.current
  const today = days[todayIndex] || null
  const tz = tzFor(today)
  const todayHours = today?.hours || []
  const nowHour = hourAt(todayHours, nowSec)
  const nowIdx = nowHour ? todayHours.indexOf(nowHour) : -1
  const sToday = summarizeDay(today)
  const series = (key) => todayHours.map((h) => h[key] ?? null)
  const threeAgo = hourAt(todayHours, nowSec - 3 * 3600)
  const tendency = threeAgo ? pressureTrend(threeAgo.pressure, current.pressure, 3) : null

  const w = fmt.wind(current.windSpeed, units)
  const g = fmt.wind(current.windGust, units)
  const gMax = fmt.wind(sToday.gustMax, units)
  const vis = fmt.distance(current.visibility, units)
  const pr = fmt.pressure(current.pressure, units)
  const feelsDiff = current.feelsLike != null && current.temp != null ? fmt.temp(current.feelsLike, units) - fmt.temp(current.temp, units) : null
  const uvCat = uvCategory(current.uv)

  const cards = [
    {
      id: 'temperature', chart: 'temp', icon: Thermometer, label: 'Temperature',
      value: fmt.temp(current.temp, units) ?? '—', unit: current.temp != null ? fmt.UNIT.temp(units) : '',
      desc: today ? `Today ${fmt.tempText(today.min, units)} – ${fmt.tempText(today.max, units)}` : 'Daily range unavailable',
      spark: series('temp'),
    },
    {
      id: 'feels', chart: 'temp', icon: ThermometerSun, label: 'Feels like',
      value: fmt.temp(current.feelsLike, units) ?? '—', unit: current.feelsLike != null ? fmt.UNIT.temp(units) : '',
      desc: feelsDiff == null ? unavailable(src) : Math.abs(feelsDiff) < 1 ? 'Similar to the actual temperature' : feelsDiff > 0 ? `${feelsDiff}° warmer than actual` : `${-feelsDiff}° cooler than actual`,
      spark: series('feelsLike'),
    },
    {
      id: 'humidity', chart: 'humidity', icon: Droplets, label: 'Humidity',
      value: current.humidity != null ? Math.round(current.humidity) : '—', unit: current.humidity != null ? '%' : '',
      desc: humidityLabel(current.humidity) ?? unavailable(src), spark: series('humidity'),
    },
    {
      id: 'wind', chart: 'wind', icon: Wind, label: 'Wind speed',
      value: w.value, unit: w.unit, desc: windLabel(current.windSpeed) ?? unavailable(src), spark: series('windSpeed'),
    },
    {
      id: 'direction', chart: 'wind', icon: Navigation2, iconRotate: current.windDeg != null ? current.windDeg + 180 : null, label: 'Wind direction',
      value: current.windDeg != null ? fmt.compass(current.windDeg) : '—', unit: current.windDeg != null ? `${Math.round(current.windDeg)}°` : '',
      desc: current.windDeg != null ? `Blowing from the ${fmt.compass(current.windDeg)}` : unavailable(src),
    },
    {
      id: 'gust', chart: 'wind', icon: Tornado, label: 'Wind gusts',
      value: g.value, unit: g.unit, desc: [current.windGust == null ? unavailable(src) : null, gMax.unit ? `Forecast peak today ${gMax.value} ${gMax.unit}` : null].filter(Boolean).join(' · ') || 'Hourly gusts unavailable',
      spark: series('windGust'),
    },
    {
      id: 'uv', chart: 'uv', icon: SunMedium, label: 'UV index',
      value: current.uv != null ? Math.round(current.uv * 10) / 10 : '—', unit: '',
      desc: uvCat ? `${uvCat.label} · max today ${sToday.uvMax != null ? Math.round(sToday.uvMax) : '—'}` : 'UV not reported', spark: series('uv'),
    },
    {
      id: 'visibility', chart: 'sky', icon: Eye, label: 'Visibility',
      value: vis.value, unit: vis.unit, desc: visibilityLabel(current.visibility) ?? unavailable(src), spark: series('visibility'),
    },
    {
      id: 'pressure', chart: 'pressure', icon: Gauge, label: 'Pressure',
      value: pr.value, unit: pr.unit,
      desc: tendency ? `${tendency.label} · ${fmt.pressureDelta(tendency.change, units)} in 3 h` : current.pressure != null ? 'Sea-level pressure' : unavailable(src),
      spark: series('pressure'),
    },
    {
      id: 'cloud', chart: 'sky', icon: Cloud, label: 'Cloud cover',
      value: current.cloudPct != null ? Math.round(current.cloudPct) : '—', unit: current.cloudPct != null ? '%' : '',
      desc: cloudLabel(current.cloudPct) ?? unavailable(src), spark: series('cloudPct'),
    },
    {
      id: 'precip', chart: 'rain', icon: CloudRain, label: 'Precipitation',
      value: nowHour?.precip != null ? nowHour.precip.toFixed(1) : '—', unit: nowHour?.precip != null ? 'mm' : '',
      desc: nowHour?.precip != null ? `This hour · ${fmt.mm(sToday.precipTotal)} today` : 'Hourly amount unavailable', spark: series('precip'),
    },
    {
      id: 'pop', chart: 'rain', icon: Umbrella, label: 'Rain probability',
      value: nowHour?.pop != null ? Math.round(nowHour.pop) : '—', unit: nowHour?.pop != null ? '%' : '',
      desc: !sToday.pop ? 'Probability unavailable'
        : sToday.pop.max < 1 ? 'No precipitation expected today'
          : `Peak ${Math.round(sToday.pop.max)}% at ${fmt.time(sToday.pop.maxAt, tz, h12)}`,
      spark: series('pop'),
    },
  ]

  useEffect(() => {
    if (open) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [open])

  const openCard = cards.find((c) => c.id === open)
  const Chart = openCard ? CHART_COMPONENTS[openCard.chart] : null
  const meta = openCard ? metricMeta(openCard.chart) : null
  const dayName = isToday ? 'Today' : fmt.dayLong(day?.dt, tzFor(day))

  return (
    <section className="panel glass" aria-labelledby="metrics-title">
      <header className="panel-head">
        <h2 id="metrics-title">Current conditions</h2>
        <span className="panel-note">Live · {src} · select a card for its graph</span>
      </header>
      <div className="mgrid">
        {cards.map((c) => (
          <Fragment key={c.id}>
            <WeatherMetricCard
              {...c} open={open === c.id} controls="metric-detail" sparkMark={nowIdx}
              onToggle={() => setOpen(open === c.id ? null : c.id)}
            />
            <AnimatePresence initial={false}>
              {open === c.id && (
                <motion.div
                  key="detail" id="metric-detail" ref={detailRef} className="mdetail"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <div className="mdetail-inner">
                    <header className="mdetail-head">
                      <h3><meta.icon size={16} aria-hidden="true" /> {meta.label} · {dayName}</h3>
                      <div className="mdetail-actions">
                        <button className="btn btn-ghost" onClick={() => onOpenInsights(openCard.chart)}>
                          <ChartSpline size={14} aria-hidden="true" /> Weather insights
                        </button>
                        <button className="icon-btn" onClick={() => setOpen(null)} aria-label="Close graph"><X size={16} /></button>
                      </div>
                    </header>
                    <MetricSummary metric={openCard.chart} />
                    <Chart />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Fragment>
        ))}
      </div>
    </section>
  )
}
