import { AnimatePresence, motion } from 'framer-motion'
import {
  CloudRain, Wind, Droplets, Gauge, Sun, Sparkles, Moon, TriangleAlert, Leaf, Thermometer,
} from 'lucide-react'
import WeatherGlyph from '../WeatherCards/WeatherGlyph.jsx'
import WindCompass from './Charts/WindCompass.jsx'
import { HumidityChart, PressureChart, PrecipitationChart } from './Charts/WeatherCharts.jsx'
import { classifyForecast } from '../../engines/weatherClassifier.js'
import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import * as fmt from '../../utils/format.js'
import {
  aqiCategory, cloudLabel, durationText, moonPhase, stats, uvCategory, visibilityLabel, windLabel,
} from '../../utils/forecastStats.js'

const NA = '—'

function Group({ icon: Icon, title, children, wide = false }) {
  return (
    <section className={`dgroup${wide ? ' wide' : ''}`}>
      <h3><Icon size={15} strokeWidth={1.6} aria-hidden="true" />{title}</h3>
      {children}
    </section>
  )
}

function Stats({ items }) {
  return (
    <dl className="dstats">
      {items.map(([label, value, note]) => (
        <div key={label} className={value === NA ? 'na' : ''}>
          <dt>{label}</dt>
          <dd>{value}{note && <small>{note}</small>}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A plain-language summary composed only from the day's real values. */
function describeDay(day, s, units, label) {
  const parts = [`${label || 'Mixed conditions'}, with a high of ${fmt.tempText(day.max, units)} and a low of ${fmt.tempText(day.min, units)}.`]
  if (s.popMax != null) {
    parts.push(s.popMax >= 5
      ? `${Math.round(s.popMax)}% chance of precipitation${s.precipTotal != null && s.precipTotal > 0 ? `, about ${s.precipTotal.toFixed(1)} mm in total` : ''}.`
      : 'Precipitation is unlikely.')
  }
  if (s.windMax != null) {
    const w = fmt.wind(s.windMax, units)
    parts.push(`Winds up to ${w.value} ${w.unit}${s.windDir != null ? ` from the ${fmt.compass(s.windDir)}` : ''}.`)
  }
  return parts.join(' ')
}

/** Sunrise→sunset as a segment of the 24-hour day, with "now" marked on today. */
function DaylightBar({ day, tz, nowSec, isToday, h12 }) {
  if (day.sunrise == null || day.sunset == null) return null
  const span = 86400
  const pos = (t) => Math.min(100, Math.max(0, ((t - day.dt) / span) * 100))
  return (
    <div className="daybar" aria-hidden="true">
      <span className="daybar-light" style={{ left: `${pos(day.sunrise)}%`, right: `${100 - pos(day.sunset)}%` }} />
      {isToday && <span className="daybar-now" style={{ left: `${pos(nowSec)}%` }} />}
      <span className="daybar-labels"><small>{fmt.time(day.dt, tz, h12)}</small><small>{fmt.time(day.dt + 43200, tz, h12)}</small><small>{fmt.time(day.dt, tz, h12)}</small></span>
    </div>
  )
}

export default function SelectedDayDetails() {
  const { day, summary: s, isToday, units, h12, tzFor, nowSec, data, air } = useForecastExplorer()
  if (!day) return null
  const tz = tzFor(day)
  const c = classifyForecast(day)
  const T = (v) => (v == null ? NA : fmt.tempText(v, units))
  const W = (ms) => { const w = fmt.wind(ms, units); return w.unit ? `${w.value} ${w.unit}` : NA }
  const P = (h) => { const p = fmt.pressure(h, units); return p.unit ? `${p.value} ${p.unit}` : NA }
  const D = (m) => { const v = fmt.distance(m, units); return v.unit ? `${v.value} ${v.unit}` : NA }
  const uv = uvCategory(s.uvMax)
  const avgWind = fmt.wind(s.windAvg, units)
  const dayEnd = day.dt + 86400

  // Moon: WeatherAPI.com's astronomy when present, otherwise an astronomical calculation (labelled).
  const moon = day.moon || { ...moonPhase(day.dt + 43200), source: 'calculated' }

  // Alerts: only WeatherAPI.com supplies them; null means the active source has no alert feed.
  const alerts = data.alerts == null ? null
    : data.alerts.filter((a) => (a.effective == null || a.effective < dayEnd) && (a.expires == null || a.expires > day.dt))

  // Air quality for this calendar day from the hourly Open-Meteo feed.
  const airHours = air.hours.filter((h) => h.dt >= day.dt && h.dt < dayEnd)
  const aqi = stats(airHours, 'usAqi')
  const pm25 = stats(airHours, 'pm25')
  const aqiCat = aqiCategory(aqi?.max)

  return (
    <section className="panel glass day-details" aria-labelledby="day-title" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={day.dt}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <header className="day-head">
            <WeatherGlyph env={c.env} size={42} />
            <div>
              <p className="eyebrow">{isToday ? 'Today' : 'Selected day'}</p>
              <h2 id="day-title">{fmt.dateFull(day.dt, tz)}</h2>
              <p className="day-cond">{c.label || 'Conditions unavailable'}</p>
            </div>
            <div className="day-temps">
              <span><small>High</small>{T(day.max)}</span>
              <span><small>Low</small>{T(day.min)}</span>
            </div>
          </header>
          <p className="day-desc">{describeDay(day, s, units, c.label)}</p>

          <div className="dgrid">
            <Group icon={Thermometer} title="Temperature">
              <Stats items={[
                ['Maximum', T(day.max)],
                ['Minimum', T(day.min)],
                ['Feels like', s.feelsMin != null ? `${T(s.feelsMin)} – ${T(s.feelsMax)}` : NA],
                ['Average', T(s.tempAvg), s.temp ? `from ${s.temp.count} hourly values` : null],
              ]} />
            </Group>

            <Group icon={CloudRain} title="Rain">
              <Stats items={[
                ['Chance', fmt.pct(s.popMax)],
                ['Total precipitation', fmt.mm(s.precipTotal)],
                ['Expected rainfall', s.rainSum != null ? fmt.mm(s.rainSum) : NA, s.rainSum == null ? 'Not separated from snow by this source' : null],
                ['Hours with precipitation', s.precipHours != null ? `${Math.round(s.precipHours)} h` : NA],
                ...(s.snowSum ? [['Snowfall', `${s.snowSum.toFixed(1)} cm`]] : []),
              ]} />
              <PrecipitationChart compact panels={['pop']} />
            </Group>

            <Group icon={Wind} title="Wind">
              <div className="dwind">
                <Stats items={[
                  ['Average speed', W(s.windAvg), windLabel(s.windAvg)],
                  ['Maximum speed', W(s.windMax)],
                  ['Strongest gust', W(s.gustMax)],
                  ['Prevailing direction', s.windDir != null ? `${fmt.compass(s.windDir)} · ${Math.round(s.windDir)}°` : NA],
                ]} />
                <WindCompass deg={s.windDir} speed={avgWind.value} unit={avgWind.unit} size={124} caption="Prevailing · average speed" />
              </div>
            </Group>

            <Group icon={Droplets} title="Humidity">
              <Stats items={[
                ['Average', fmt.pct(s.humidityAvg)],
                ['Minimum', fmt.pct(s.humidity?.min), s.humidity ? fmt.time(s.humidity.minAt, tz, h12) : null],
                ['Maximum', fmt.pct(s.humidity?.max), s.humidity ? fmt.time(s.humidity.maxAt, tz, h12) : null],
              ]} />
              <HumidityChart compact />
            </Group>

            <Group icon={Gauge} title="Atmosphere">
              <Stats items={[
                ['Average pressure', P(s.pressure?.avg)],
                ['Min / max', s.pressure ? `${P(s.pressure.min)} / ${fmt.pressure(s.pressure.max, units).value}` : NA],
                ['Trend', s.pressureTrend ? `${s.pressureTrend.label} (${fmt.pressureDelta(s.pressureTrend.change, units)})` : NA],
                ['Cloud cover', s.cloudAvg != null ? `${Math.round(s.cloudAvg)}%` : NA, cloudLabel(s.cloudAvg)],
                ['Visibility', D(s.visAvg), s.visMin != null ? `lowest ${D(s.visMin)} · ${visibilityLabel(s.visMin)}` : null],
              ]} />
              <PressureChart compact />
            </Group>

            <Group icon={Sun} title="Sun & UV">
              <Stats items={[
                ['Sunrise', fmt.time(day.sunrise, tz, h12)],
                ['Sunset', fmt.time(day.sunset, tz, h12)],
                ['Daylight', durationText(s.daylight)],
                ['Sunshine', day.sunshine != null ? durationText(day.sunshine) : NA],
                ['Max UV', s.uvMax != null ? `${Math.round(s.uvMax * 10) / 10}` : NA, uv?.label],
              ]} />
              <DaylightBar day={day} tz={tz} nowSec={nowSec} isToday={isToday} h12={h12} />
              {uv && <p className="uv-advice"><i className="swatch" style={{ background: uv.color }} aria-hidden="true" />{uv.advice}</p>}
            </Group>

            <Group icon={Sparkles} title="Additional information" wide>
              <div className="dextra">
                <div className="dextra-item">
                  <h4><Moon size={14} aria-hidden="true" /> Moon</h4>
                  <p><strong>{moon.name}</strong>{moon.illumination != null && ` · ${Math.round(moon.illumination)}% illuminated`}</p>
                  {(moon.moonrise || moon.moonset) && (
                    <p className="muted">Rise {fmt.time(moon.moonrise, tz, h12)} · Set {fmt.time(moon.moonset, tz, h12)}</p>
                  )}
                  <p className="muted">{moon.source === 'calculated' ? 'Astronomical calculation (the forecast source has no moon data).' : `Source: ${moon.source}`}</p>
                </div>

                <div className="dextra-item">
                  <h4><TriangleAlert size={14} aria-hidden="true" /> Weather alerts</h4>
                  {alerts == null && <p className="muted">Official alerts aren’t provided by {data.sources.week || 'the active source'}. They appear here when a WeatherAPI.com key is configured.</p>}
                  {alerts && alerts.length === 0 && <p>No active alerts for this day.</p>}
                  {alerts && alerts.length > 0 && (
                    <ul className="alerts">
                      {alerts.map((a, i) => (
                        <li key={`${a.headline}${i}`}>
                          <strong>{a.event || a.headline}</strong>{a.severity && <span className="alert-sev">{a.severity}</span>}
                          {a.expires && <p className="muted">Until {fmt.dateLong(a.expires, tz)} {fmt.time(a.expires, tz, h12)}</p>}
                          {a.description && <details><summary>Details</summary><p>{a.description}</p></details>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="dextra-item">
                  <h4><Leaf size={14} aria-hidden="true" /> Air quality</h4>
                  {air.status === 'loading' && <p className="muted">Loading air quality…</p>}
                  {air.status === 'error' && <p className="muted">Air quality couldn’t be loaded right now.</p>}
                  {air.status === 'ready' && !aqi && <p className="muted">No air-quality forecast this far ahead.</p>}
                  {air.status === 'ready' && aqi && (
                    <>
                      <p><i className="swatch" style={{ background: aqiCat.color }} aria-hidden="true" /><strong>US AQI up to {Math.round(aqi.max)}</strong> · {aqiCat.label}</p>
                      {pm25 && <p className="muted">PM2.5 average {pm25.avg.toFixed(1)} µg/m³ · Source: Open-Meteo air quality</p>}
                    </>
                  )}
                </div>
              </div>
            </Group>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
