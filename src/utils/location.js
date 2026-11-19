// Helpers for comparing, labelling and parsing locations.
export const sameLoc = (a, b) =>
  Boolean(a && b) && Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01

export const locKey = (l) => `${(+l.lat).toFixed(2)},${(+l.lon).toFixed(2)}`

export const coordLabel = (lat, lon) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`

const COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])?\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i

/** "22.57, 88.36" · "22.57 88.36" · "51.5N 0.12W" → { lat, lon } or null. */
export function parseCoordinates(text) {
  const m = COORDS.exec(text || '')
  if (!m) return null
  let lat = Number(m[1])
  let lon = Number(m[3])
  if (m[2]?.toUpperCase() === 'S') lat = -Math.abs(lat)
  if (m[4]?.toUpperCase() === 'W') lon = -Math.abs(lon)
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { lat: +lat.toFixed(4), lon: +lon.toFixed(4) }
}
