import { useId, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip,
  Area, Line, Bar, Cell, ReferenceLine, ReferenceDot, ReferenceArea,
} from 'recharts'
import * as fmt from '../../../utils/format.js'
import { UV_BANDS } from '../../../utils/forecastStats.js'
import { chartSpec, findHighlights, tooltipExtras } from '../chartSpecs.js'

// Touch-only screens have no hover, so tooltips open on tap there.
const TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches

const AXIS = 'rgba(255, 255, 255, 0.58)'
const GRID = 'rgba(255, 255, 255, 0.08)'
const SURFACE = '#0f1730'

/** Round y-axis bounds and ticks (steps of 1, 2, 2.5 or 5 × 10ⁿ) that contain the panel's real values. */
function niceAxis(rows, panel, intervals) {
  const vals = rows.flatMap((r) => panel.series.map((s) => r[s.key])).filter((v) => v != null)
  if (!vals.length) return null
  const [dLo, dHi] = panel.domain
  let lo = typeof dLo === 'function' ? dLo(Math.min(...vals)) : dLo
  let hi = typeof dHi === 'function' ? dHi(Math.max(...vals)) : dHi
  if (!(hi > lo)) hi = lo + 1
  const raw = (hi - lo) / intervals
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = Number(([1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw - 1e-9)).toPrecision(6))
  lo = Math.floor(lo / step + 1e-9) * step
  hi = Math.ceil(hi / step - 1e-9) * step
  const ticks = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(10)))
  const decimals = (String(step).split('.')[1] || '').length
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks, decimals }
}

const fmtValue = (v, panel) => (v == null ? '—' : `${Number(v).toFixed(panel.decimals)}${panel.unit && panel.unit !== '%' && !panel.unit.startsWith('°') ? ' ' : ''}${panel.unit}`)

function GlassTooltip({ active, payload, label, panel, metric, mode, tz, h12 }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const when = mode === 'week' ? fmt.dateLong(label, tz) : `${fmt.dayShort(label, tz)} · ${fmt.time(label, tz, h12)}`
  const extras = tooltipExtras(metric, row)
  return (
    <div className="chart-tip">
      <p className="chart-tip-time">{when}</p>
      <ul>
        {panel.series.map((s) => (
          <li key={s.key}>
            <i style={{ background: s.colorBy?.(row[s.key]) || s.color }} className={s.dashed ? 'dashed' : ''} aria-hidden="true" />
            <span>{s.name}</span>
            <strong>{fmtValue(row[s.key], panel)}</strong>
          </li>
        ))}
        {extras.map((e) => <li key={e.label} className="extra"><span>{e.label}</span><strong>{e.value}</strong></li>)}
      </ul>
    </div>
  )
}

/** Small arrows along the wind line pointing where the wind blows to. */
function windArrowDot(step) {
  return function WindArrow({ cx, cy, index, payload }) {
    if (cx == null || cy == null || payload?.windDeg == null || index % step !== 0) return <g key={`a${index}`} />
    return (
      <g key={`a${index}`} transform={`translate(${cx},${cy - 14}) rotate(${payload.windDeg + 180})`} aria-hidden="true">
        <path d="M0,-6 L4,4 L0,1.5 L-4,4 Z" fill="rgba(255,255,255,0.78)" />
      </g>
    )
  }
}

/**
 * Generic interactive weather chart driven by chartSpecs. Renders one or more stacked panels that share a
 * time axis (synchronised tooltips), marks the selected hour/day, and highlights extremes.
 */
export default function InteractiveWeatherChart({
  metric, mode = 'day', rows, units, tz, h12,
  selectedDt = null, onSelect, compact = false, panels: onlyPanels, showHighlights = true, emptyText,
}) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const spec = useMemo(() => chartSpec(metric, mode, units), [metric, mode, units])
  const panels = onlyPanels ? spec.panels.filter((p) => onlyPanels.includes(p.id)) : spec.panels
  const highlights = useMemo(() => (showHighlights ? findHighlights(rows, spec.highlights) : []), [rows, spec, showHighlights])
  const week = mode === 'week'
  const tickFmt = (dt) => (week ? fmt.dayShort(dt, tz) : fmt.hour(dt, tz, h12))
  const height = compact ? 120 : panels.length > 1 ? 170 : 260
  const arrowStep = rows.length > 30 ? 6 : compact ? 4 : 3

  const handleClick = (e) => {
    if (onSelect && e && e.activeLabel != null) onSelect(Number(e.activeLabel))
  }

  return (
    <div className={`wchart${compact ? ' compact' : ''}`}>
      {panels.map((panel, pi) => {
        const hasData = rows.some((r) => panel.series.some((s) => r[s.key] != null))
        const avgKey = panel.average ? panel.series[0].key : null
        const known = avgKey ? rows.map((r) => r[avgKey]).filter((v) => v != null) : []
        const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null
        const multi = panel.series.length > 1
        const axis = niceAxis(rows, panel, compact ? 2 : 4)
        const tickText = (v) => Number(v).toFixed(axis?.decimals ?? 0)
        const axisWidth = axis ? Math.max(28, 10 + 7 * Math.max(...axis.ticks.map((v) => tickText(v).length))) : 36
        return (
          <div key={panel.id} className="wchart-panel">
            {(panel.title || multi) && (
              <div className="wchart-legend">
                {panel.title && <span className="wchart-title">{panel.title} <small>({panel.unit})</small></span>}
                {multi && panel.series.map((s) => (
                  <span key={s.key} className="wchart-key">
                    <i style={{ background: s.color }} className={s.dashed ? 'dashed' : ''} aria-hidden="true" />{s.name}
                  </span>
                ))}
              </div>
            )}
            {!hasData ? (
              <p className="chart-empty">{emptyText || 'This measurement is not provided by the forecast source for this period.'}</p>
            ) : (
              <ResponsiveContainer width="100%" height={height}>
                <ComposedChart
                  data={rows} syncId={`sync${uid}`} onClick={handleClick}
                  margin={{ top: panel.arrows && !compact ? 22 : 10, right: 8, bottom: 0, left: 0 }}
                  style={{ cursor: onSelect ? 'pointer' : 'default' }}
                  accessibilityLayer
                >
                  <defs>
                    {panel.series.filter((s) => s.type === 'area').map((s) => (
                      <linearGradient key={s.key} id={`g${uid}${panel.id}${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.34} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  {panel.uvBands && UV_BANDS.map((b) => (
                    <ReferenceArea key={b.label} y1={b.from} y2={b.to} fill={b.color} fillOpacity={0.05} stroke="none" ifOverflow="hidden" />
                  ))}
                  <XAxis
                    dataKey="dt" tickFormatter={tickFmt} stroke={AXIS} tick={{ fill: AXIS, fontSize: 11 }}
                    tickLine={false} axisLine={{ stroke: GRID }} minTickGap={compact ? 28 : 18}
                    hide={compact && pi < panels.length - 1}
                  />
                  <YAxis
                    domain={axis?.domain ?? panel.domain} ticks={axis?.ticks} interval={0}
                    stroke={AXIS} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false}
                    width={axisWidth} tickFormatter={tickText}
                  />
                  <Tooltip
                    content={<GlassTooltip panel={panel} metric={metric} mode={mode} tz={tz} h12={h12} />}
                    cursor={panel.series[0].type === 'bar' ? { fill: 'rgba(255,255,255,0.06)' } : { stroke: 'rgba(255,255,255,0.35)', strokeWidth: 1 }}
                    wrapperStyle={{ outline: 'none', zIndex: 5 }}
                    trigger={TOUCH ? 'click' : 'hover'}
                    isAnimationActive={false}
                  />
                  {avg != null && !compact && (
                    <ReferenceLine
                      y={avg} stroke="rgba(255,255,255,0.4)" strokeDasharray="4 4"
                      label={{ value: `avg ${avg.toFixed(panel.decimals)}${panel.unit}`, position: 'insideTopRight', fill: AXIS, fontSize: 11 }}
                    />
                  )}
                  {selectedDt != null && rows.some((r) => r.dt === selectedDt) && (
                    <ReferenceLine x={selectedDt} stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                  )}
                  {panel.series.map((s) => {
                    if (s.type === 'bar') {
                      return (
                        <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={compact ? 10 : 16} animationDuration={450}>
                          {rows.map((r) => (
                            <Cell
                              key={r.dt} fill={s.colorBy?.(r[s.key]) || s.color}
                              fillOpacity={selectedDt == null || r.dt === selectedDt ? 1 : 0.62}
                            />
                          ))}
                        </Bar>
                      )
                    }
                    const common = {
                      dataKey: s.key, name: s.name, type: 'monotone', stroke: s.color, strokeWidth: 2,
                      strokeDasharray: s.dashed ? '5 4' : undefined, connectNulls: false, animationDuration: 450,
                      activeDot: { r: 5, fill: s.color, stroke: SURFACE, strokeWidth: 2 },
                      dot: panel.arrows && !compact && pi === 0 && s === panel.series[0] ? windArrowDot(arrowStep) : false,
                      strokeLinecap: 'round', strokeLinejoin: 'round',
                    }
                    return s.type === 'area'
                      ? <Area key={s.key} {...common} fill={`url(#g${uid}${panel.id}${s.key})`} />
                      : <Line key={s.key} {...common} />
                  })}
                  {highlights
                    .filter((h) => panel.series.some((s) => s.key === h.key))
                    .map((h) => (
                      <ReferenceDot
                        key={`${h.key}${h.kind}`} x={h.dt} y={h.value} r={5}
                        fill={panel.series.find((s) => s.key === h.key).colorBy?.(h.value) || panel.series.find((s) => s.key === h.key).color}
                        stroke={SURFACE} strokeWidth={2} ifOverflow="extendDomain"
                      />
                    ))}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        )
      })}
      {showHighlights && !compact && highlights.length > 0 && (
        <ul className="wchart-highlights" aria-label="Notable values">
          {highlights.map((h) => {
            const panel = spec.panels.find((p) => p.series.some((s) => s.key === h.key))
            return (
              <li key={`${h.key}${h.kind}`}>
                <button onClick={() => onSelect?.(h.dt)} disabled={!onSelect}>
                  <span>{h.label}</span>
                  <strong>{fmtValue(h.value, panel)}</strong>
                  <small>{week ? fmt.dayShort(h.dt, tz) : fmt.time(h.dt, tz, h12)}</small>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
