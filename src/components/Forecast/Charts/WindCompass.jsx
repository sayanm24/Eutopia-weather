import * as fmt from '../../../utils/format.js'

const TICKS = Array.from({ length: 36 }, (_, i) => i * 10)
const POINTS = [['N', 0], ['E', 90], ['S', 180], ['W', 270]]

/**
 * Compass rose. The needle points where the wind is coming FROM (meteorological convention),
 * with a faint marker for a second direction (e.g. the day's dominant wind) when given.
 */
export default function WindCompass({ deg, secondaryDeg = null, speed, unit, size = 150, caption }) {
  const known = deg != null
  const r = size / 2
  return (
    <figure className="compass" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img"
        aria-label={known ? `Wind from ${fmt.compass(deg)} (${Math.round(deg)} degrees)` : 'Wind direction unavailable'}>
        <circle cx={r} cy={r} r={r - 2} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.14)" />
        {TICKS.map((t) => {
          const major = t % 90 === 0
          const a = (t * Math.PI) / 180
          const r1 = r - 4; const r2 = r - (major ? 12 : 8)
          return (
            <line key={t} x1={r + Math.sin(a) * r1} y1={r - Math.cos(a) * r1} x2={r + Math.sin(a) * r2} y2={r - Math.cos(a) * r2}
              stroke={major ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'} strokeWidth={major ? 1.5 : 1} />
          )
        })}
        {POINTS.map(([label, a]) => {
          const rad = (a * Math.PI) / 180
          return (
            <text key={label} x={r + Math.sin(rad) * (r - 24)} y={r - Math.cos(rad) * (r - 24) + 4}
              textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.62)">{label}</text>
          )
        })}
        {secondaryDeg != null && (
          <g transform={`rotate(${secondaryDeg} ${r} ${r})`} opacity="0.5">
            <circle cx={r} cy={10} r={3.5} fill="#d95926" />
          </g>
        )}
        {known && (
          <g className="compass-needle" style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${r}px ${r}px` }}>
            {/* tail points downwind, head marks the source direction */}
            <path d={`M${r},${16} L${r + 7},${r} L${r},${r - 6} L${r - 7},${r} Z`} fill="#3987e5" />
            <path d={`M${r},${size - 16} L${r + 5},${r} L${r - 5},${r} Z`} fill="rgba(255,255,255,0.28)" />
          </g>
        )}
        <circle cx={r} cy={r} r={18} fill="rgba(8,12,26,0.85)" stroke="rgba(255,255,255,0.14)" />
        <text x={r} y={r + 1} textAnchor="middle" fontSize="13" fontWeight="500" fill="#fff">{speed ?? '—'}</text>
        <text x={r} y={r + 12} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.6)">{unit}</text>
      </svg>
      <figcaption>
        {known ? <><strong>From {fmt.compass(deg)}</strong> · {Math.round(deg)}°</> : 'Direction unavailable'}
        {caption && <small>{caption}</small>}
      </figcaption>
    </figure>
  )
}
