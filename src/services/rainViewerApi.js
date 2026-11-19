// RainViewer public radar API (no key). Returns real observed radar frames
// (roughly the past two hours) plus any nowcast frames the API provides.
import { getJson } from './http.js'

const INDEX_URL = 'https://api.rainviewer.com/public/weather-maps.json'
export const RADAR_MAX_NATIVE_ZOOM = 7 // RainViewer serves tiles up to zoom 7
const COLOR_SCHEME = 2 // "Universal Blue"
const OPTIONS = '1_1' // smoothed, with snow colours

export async function fetchRadarFrames() {
  const d = await getJson(INDEX_URL)
  const host = d.host
  const toFrame = (f, kind) => ({
    time: f.time,
    kind, // 'past' = observed, 'nowcast' = short-term forecast
    url: `${host}${f.path}/256/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`,
  })
  const frames = [
    ...(d.radar?.past || []).map((f) => toFrame(f, 'past')),
    ...(d.radar?.nowcast || []).map((f) => toFrame(f, 'nowcast')),
  ]
  if (!frames.length) throw new Error('No radar frames available')
  return frames
}
