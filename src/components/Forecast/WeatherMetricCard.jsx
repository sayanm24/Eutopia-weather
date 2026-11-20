import { ChevronDown } from 'lucide-react'
import Sparkline from './Charts/Sparkline.jsx'

/** One live reading: icon, value, unit, a short interpretation, today's trend, and a real action on click. */
export default function WeatherMetricCard({ id, icon: Icon, iconRotate, label, value, unit, desc, spark, sparkMark, open, onToggle, controls }) {
  return (
    <button
      type="button" className={`mcard${open ? ' is-open' : ''}`} onClick={onToggle}
      aria-expanded={open} aria-controls={controls} data-metric={id}
    >
      <span className="mcard-head">
        <Icon size={15} strokeWidth={1.6} aria-hidden="true" style={iconRotate != null ? { transform: `rotate(${iconRotate}deg)` } : undefined} />
        {label}
        <ChevronDown size={14} className="mcard-chev" aria-hidden="true" />
      </span>
      <span className="mcard-value">
        <strong>{value}</strong>{unit && <span>{unit}</span>}
      </span>
      <span className="mcard-desc">{desc}</span>
      {spark && <Sparkline values={spark} markIndex={sparkMark} />}
    </button>
  )
}
