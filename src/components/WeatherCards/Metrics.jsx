import { Droplets, Wind, SunMedium, Eye, Gauge } from 'lucide-react'
import * as fmt from '../../utils/format.js'

/** Humidity · wind · UV · visibility · pressure, as one quiet strip rather than five cards. */
export default function Metrics({ current, units }) {
  const w = fmt.wind(current.windSpeed, units)
  const vis = fmt.distance(current.visibility, units)
  const pr = fmt.pressure(current.pressure, units)
  const uvKnown = current.uv != null

  const items = [
    { icon: Droplets, label: 'Humidity', value: current.humidity != null ? Math.round(current.humidity) : '—', unit: current.humidity != null ? '%' : '' },
    { icon: Wind, label: 'Wind', value: w.value, unit: w.unit, note: fmt.compass(current.windDeg) },
    { icon: SunMedium, label: 'UV index', value: uvKnown ? (Math.round(current.uv * 10) / 10) : '—', unit: '', note: uvKnown ? fmt.uvLabel(current.uv) : 'Unavailable' },
    { icon: Eye, label: 'Visibility', value: vis.value, unit: vis.unit },
    { icon: Gauge, label: 'Pressure', value: pr.value, unit: pr.unit },
  ]

  return (
    <dl className="metrics glass">
      {items.map(({ icon: Icon, label, value, unit, note }) => (
        <div className="metric" key={label}>
          <dt><Icon size={15} strokeWidth={1.6} aria-hidden="true" />{label}</dt>
          <dd>
            <span className="metric-value">{value}</span>
            {unit && <span className="metric-unit">{unit}</span>}
            {note && <span className="metric-note">{note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
