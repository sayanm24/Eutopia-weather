import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2 } from 'lucide-react'
import MetricSummary from './MetricSummary.jsx'
import { CHART_COMPONENTS } from './Charts/WeatherCharts.jsx'
import { CHART_METRICS, chartSpec, dayRows, hourRows, metricMeta } from './chartSpecs.js'
import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import * as fmt from '../../utils/format.js'

function DataTable({ metric, mode }) {
  const { days, hours, units, h12, tzFor, day } = useForecastExplorer()
  const week = mode === 'week'
  const rows = useMemo(() => (week ? dayRows(days, units) : hourRows(hours, units)), [week, days, hours, units])
  const spec = chartSpec(metric, mode, units)
  const cols = spec.panels.flatMap((p) => p.series.map((s) => ({ ...s, unit: p.unit, decimals: p.decimals })))
  const tz = tzFor(day)
  return (
    <details className="data-table">
      <summary>Show data table</summary>
      <div className="data-table-scroll">
        <table>
          <thead>
            <tr><th scope="col">{week ? 'Day' : 'Time'}</th>{cols.map((c) => <th key={c.key} scope="col">{c.name}{c.unit ? ` (${c.unit})` : ''}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.dt}>
                <th scope="row">{week ? fmt.dateLong(r.dt, tz) : fmt.time(r.dt, tz, h12)}</th>
                {cols.map((c) => <td key={c.key}>{r[c.key] == null ? '—' : Number(r[c.key]).toFixed(c.decimals)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

/** Interactive charts for every metric, synchronised with the selected day and hour. */
export default function WeatherInsights() {
  const { metric, setMetric, range, setRange, day, isToday, tzFor, days, data } = useForecastExplorer()
  const meta = metricMeta(metric)
  const Focus = CHART_COMPONENTS[metric]
  const dayName = isToday ? 'Today' : fmt.dayLong(day?.dt, tzFor(day))

  const onTabKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = CHART_METRICS.findIndex((m) => m.id === metric)
    const next = CHART_METRICS[(i + (e.key === 'ArrowRight' ? 1 : CHART_METRICS.length - 1)) % CHART_METRICS.length]
    setMetric(next.id)
    e.currentTarget.querySelector(`[data-id="${next.id}"]`)?.focus()
  }

  return (
    <section id="weather-insights" className="insights" aria-labelledby="insights-title">
      <header className="insights-head">
        <h2 id="insights-title" className="section-title">Weather insights</h2>
        <div className="insights-controls">
          <div className="metric-tabs" role="tablist" aria-label="Weather metric" onKeyDown={onTabKey}>
            {CHART_METRICS.map((m) => (
              <button
                key={m.id} data-id={m.id} role="tab" aria-selected={metric === m.id} aria-controls="insights-focus"
                tabIndex={metric === m.id ? 0 : -1} className={metric === m.id ? 'active' : ''} onClick={() => setMetric(m.id)}
              >
                <m.icon size={14} aria-hidden="true" /><span>{m.label}</span>
              </button>
            ))}
          </div>
          <div className="segmented" role="group" aria-label="Time range">
            <button className={range === 'day' ? 'active' : ''} aria-pressed={range === 'day'} onClick={() => setRange('day')}>Hourly · {dayName}</button>
            <button className={range === 'week' ? 'active' : ''} aria-pressed={range === 'week'} onClick={() => setRange('week')}>{days.length} days</button>
          </div>
        </div>
      </header>

      <article id="insights-focus" role="tabpanel" className="panel glass insights-focus" aria-label={`${meta.label} chart`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${metric}-${range}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          >
            <header className="panel-head">
              <h3 className="focus-title"><meta.icon size={16} aria-hidden="true" />{meta.label} · {range === 'week' ? `${days.length}-day overview` : dayName}</h3>
              <span className="panel-note">{range === 'week' ? 'Select a day to open it' : 'Select a point to inspect that hour'}</span>
            </header>
            {range === 'week' && <p className="summary-for">Figures below are for the selected day · {dayName}</p>}
            <MetricSummary metric={metric} />
            <Focus mode={range} />
            <DataTable metric={metric} mode={range} />
          </motion.div>
        </AnimatePresence>
      </article>

      <div className="insights-grid">
        {CHART_METRICS.filter((m) => m.id !== metric).map((m) => {
          const Chart = CHART_COMPONENTS[m.id]
          return (
            <article key={m.id} className="panel glass insight-card">
              <header className="panel-head">
                <h3 className="focus-title small"><m.icon size={14} aria-hidden="true" />{m.label}</h3>
                <button className="icon-btn" onClick={() => setMetric(m.id)} aria-label={`Focus ${m.label} chart`} title="Focus this chart">
                  <Maximize2 size={14} />
                </button>
              </header>
              <Chart compact mode={range} />
            </article>
          )
        })}
      </div>
      <p className="fineprint">
        Charts plot {data.sources.week || data.sources.forecast} forecast values for {range === 'week' ? 'each day' : 'each hour'}. Gaps mean the source supplied no value.
        Highlighted dots mark the extremes listed under the main chart.
      </p>
    </section>
  )
}
