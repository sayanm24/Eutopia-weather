// Unit conversion + formatting. Data is always fetched in metric and converted for display.
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

const DASH = '—'
const ok = (v) => v != null && !Number.isNaN(v)
// A date whose UTC fields read as the location's local time.
const local = (unix, tzOffset) => new Date((unix + tzOffset) * 1000)
const pad = (n) => String(n).padStart(2, '0')

export const temp = (c, units) => (ok(c) ? Math.round(units === 'imperial' ? c * 1.8 + 32 : c) : null)
export const tempText = (c, units) => (ok(c) ? `${temp(c, units)}°` : DASH)

export function wind(ms, units) {
  if (!ok(ms)) return { value: DASH, unit: '' }
  return units === 'imperial'
    ? { value: Math.round(ms * 2.23694), unit: 'mph' }
    : { value: Math.round(ms * 3.6), unit: 'km/h' }
}

export function distance(m, units) {
  if (!ok(m)) return { value: DASH, unit: '' }
  const v = units === 'imperial' ? m / 1609.344 : m / 1000
  return { value: v >= 10 ? Math.round(v) : v.toFixed(1), unit: units === 'imperial' ? 'mi' : 'km' }
}

export function pressure(hpa, units) {
  if (!ok(hpa)) return { value: DASH, unit: '' }
  return units === 'imperial'
    ? { value: (hpa * 0.02953).toFixed(2), unit: 'inHg' }
    : { value: Math.round(hpa), unit: 'hPa' }
}

export const compass = (deg) => (ok(deg) ? COMPASS[Math.round(deg / 45) % 8] : '')

export function uvLabel(uv) {
  if (!ok(uv)) return ''
  if (uv < 3) return 'Low'
  if (uv < 6) return 'Moderate'
  if (uv < 8) return 'High'
  if (uv < 11) return 'Very high'
  return 'Extreme'
}

export function time(unix, tzOffset, h12, withSeconds = false) {
  if (!ok(unix)) return DASH
  const d = local(unix, tzOffset)
  const h = d.getUTCHours()
  const tail = `:${pad(d.getUTCMinutes())}${withSeconds ? `:${pad(d.getUTCSeconds())}` : ''}`
  return h12 ? `${h % 12 || 12}${tail} ${h < 12 ? 'AM' : 'PM'}` : `${pad(h)}${tail}`
}

export function hour(unix, tzOffset, h12) {
  const h = local(unix, tzOffset).getUTCHours()
  return h12 ? `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}` : `${pad(h)}:00`
}

export const dayShort = (unix, tzOffset) => DAYS[local(unix, tzOffset).getUTCDay()]
export const dayLong = (unix, tzOffset) => DAYS_LONG[local(unix, tzOffset).getUTCDay()]
export function dateLong(unix, tzOffset) {
  const d = local(unix, tzOffset)
  return `${DAYS_LONG[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
export const sameLocalDay = (a, b, tzOffset) =>
  Math.floor((a + tzOffset) / 86400) === Math.floor((b + tzOffset) / 86400)

export function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.round(m / 60)} h ago`
}

// "Tokyo, Tokyo, JP" → "Tokyo, JP": skip a region that just repeats the place name.
export const placeName = (loc) =>
  [loc?.name, loc?.admin !== loc?.name ? loc?.admin : null, loc?.country].filter(Boolean).join(', ')
