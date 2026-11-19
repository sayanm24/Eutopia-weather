import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MapPin, Navigation2, RefreshCw, Play, ArrowRight, FlaskConical, Star } from 'lucide-react'
import Metrics from '../WeatherCards/Metrics.jsx'
import HourlyForecast from '../HourlyForecast/HourlyForecast.jsx'
import WeeklyForecast from '../WeeklyForecast/WeeklyForecast.jsx'
import WeatherGlyph from '../WeatherCards/WeatherGlyph.jsx'
import * as fmt from '../../utils/format.js'

function LocalClock({ tzOffset, h12 }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const sec = Math.floor(now / 1000)
  return (
    <p className="hero-time">
      <time>{fmt.time(sec, tzOffset, h12, true)}</time>
      <span>{fmt.dateLong(sec, tzOffset)}</span>
    </p>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="view home" aria-busy="true" aria-label="Loading weather">
      <div className="hero">
        <div className="skeleton sk-line" style={{ width: 220 }} />
        <div className="skeleton sk-temp" />
        <div className="skeleton sk-line" style={{ width: 280 }} />
      </div>
      <div className="skeleton sk-panel" style={{ height: 92 }} />
      <div className="skeleton sk-panel" style={{ height: 168 }} />
      <div className="skeleton sk-panel" style={{ height: 300 }} />
    </div>
  )
}

export default function WeatherDashboard({ data, live, resolved, simulated, units, h12, refreshing, onRefresh, onOpenMusic, isFavourite, onToggleFavourite }) {
  const { current, location, tzOffset, hourly, daily } = data
  const today = daily.find((d) => fmt.sameLocalDay(d.dt, Date.now() / 1000, tzOffset))
  const tempValue = fmt.temp(current.temp, units)

  return (
    <div className="view home">
      <section className="hero" aria-label="Current weather">
        <p className="hero-place">
          {location.isGeo ? <Navigation2 size={15} aria-hidden="true" /> : <MapPin size={15} aria-hidden="true" />}
          <span>{fmt.placeName(location)}</span>
          <button
            className={`fav-toggle${isFavourite ? ' on' : ''}`} onClick={onToggleFavourite} aria-pressed={isFavourite}
            aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'} title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Star size={17} fill={isFavourite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        </p>
        <LocalClock tzOffset={tzOffset} h12={h12} />

        <div className="hero-temp" aria-label={`${tempValue} degrees ${units === 'imperial' ? 'Fahrenheit' : 'Celsius'}`}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={tempValue}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {tempValue}
            </motion.span>
          </AnimatePresence>
          <sup>°{units === 'imperial' ? 'F' : 'C'}</sup>
        </div>

        <p className="hero-cond">
          <WeatherGlyph env={live.env} isNight={live.isNight} size={26} />
          <span>{live.label}</span>
        </p>
        <p className="hero-sub">
          Feels like {fmt.tempText(current.feelsLike, units)}
          {today && <> <i>·</i> High {fmt.tempText(today.max, units)} <i>·</i> Low {fmt.tempText(today.min, units)}</>}
        </p>
        {simulated && (
          <p className="sim-chip">
            <FlaskConical size={13} aria-hidden="true" />
            Simulated scenery: {resolved.label}. Readings above are live.
          </p>
        )}
      </section>

      <Metrics current={current} units={units} />
      <HourlyForecast hourly={hourly} tzOffset={tzOffset} units={units} h12={h12} />

      <div className="split">
        <WeeklyForecast daily={daily} tzOffset={tzOffset} units={units} h12={h12} />
        <section className="panel glass mood" aria-label="Music for this weather">
          <header className="panel-head"><h2>Sound of the sky</h2></header>
          <h3>{resolved.music.title}</h3>
          <p>{resolved.music.blurb}</p>
          <ul className="chips">{resolved.music.genres.map((g) => <li key={g}>{g}</li>)}</ul>
          <button className="btn btn-accent" onClick={onOpenMusic}>
            <Play size={15} aria-hidden="true" /> Listen <ArrowRight size={15} aria-hidden="true" />
          </button>
        </section>
      </div>

      <footer className="source">
        <span>
          Current conditions: {data.sources.current}
          {data.sources.forecast && <> · Forecast &amp; UV: {data.sources.forecast}</>}
          {' '}· Updated {fmt.time(Math.floor(data.fetchedAt / 1000), tzOffset, h12)}
        </span>
        <button className="btn btn-ghost" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} aria-hidden="true" />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </footer>
    </div>
  )
}
