/** Tiny trend line of real hourly values (nulls break the line). Decorative: the card text carries the value. */
export default function Sparkline({ values, markIndex = -1, width = 96, height = 26 }) {
  const known = values.filter((v) => v != null)
  if (known.length < 2) return null
  const min = Math.min(...known)
  const max = Math.max(...known)
  const span = max - min || 1
  const x = (i) => (i / (values.length - 1)) * (width - 4) + 2
  const y = (v) => height - 3 - ((v - min) / span) * (height - 6)
  let d = ''
  let pen = false
  values.forEach((v, i) => {
    if (v == null) { pen = false; return }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    pen = true
  })
  const mark = markIndex >= 0 && values[markIndex] != null
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {mark && <circle cx={x(markIndex)} cy={y(values[markIndex])} r="2.5" fill="#fff" />}
    </svg>
  )
}
