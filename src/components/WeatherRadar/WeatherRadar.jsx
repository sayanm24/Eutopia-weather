import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Play, Pause, Plus, Minus, LocateFixed, RotateCw, Loader2 } from 'lucide-react'
import { fetchRadarFrames, RADAR_MAX_NATIVE_ZOOM } from '../../services/rainViewerApi.js'
import { placeName } from '../../utils/format.js'

const FRAME_MS = 650
const REFRESH_MS = 5 * 60 * 1000

const frameClock = (unix, h12) =>
  new Date(unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: h12 })

/** Real precipitation radar from RainViewer on an interactive Leaflet map. */
export default function WeatherRadar({ location, h12 }) {
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const layersRef = useRef(new Map()) // frame.time -> tile layer
  const [frames, setFrames] = useState([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const lat = location?.lat
  const lon = location?.lon

  // Map setup (once)
  useEffect(() => {
    const map = L.map(mapEl.current, {
      center: [lat ?? 20, lon ?? 0], zoom: lat != null ? 6 : 2,
      minZoom: 2, maxZoom: 10, zoomControl: false, attributionControl: true, worldCopyJump: true,
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, className: 'radar-base',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
    }).addTo(map)
    mapRef.current = map
    const fix = setTimeout(() => map.invalidateSize(), 350) // after the view transition settles
    return () => { clearTimeout(fix); map.remove(); mapRef.current = null; layersRef.current.clear() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Current location marker
  useEffect(() => {
    const map = mapRef.current
    if (!map || lat == null) return
    markerRef.current?.remove()
    markerRef.current = L.circleMarker([lat, lon], {
      radius: 7, color: '#ffffff', weight: 2, fillColor: '#4da3ff', fillOpacity: 1,
    }).addTo(map).bindTooltip(placeName(location) || 'Selected location')
    map.setView([lat, lon], Math.max(map.getZoom(), 6))
  }, [lat, lon, location])

  const loadFrames = useCallback(async () => {
    try {
      const list = await fetchRadarFrames()
      setFrames(list)
      // jump to the most recent observed frame
      const lastPast = list.map((f) => f.kind).lastIndexOf('past')
      setIndex(lastPast >= 0 ? lastPast : list.length - 1)
      setStatus('ready')
    } catch {
      setStatus((s) => (s === 'ready' ? s : 'error'))
    }
  }, [])

  useEffect(() => {
    loadFrames()
    const id = setInterval(loadFrames, REFRESH_MS)
    return () => clearInterval(id)
  }, [loadFrames])

  // Keep tile layers in sync with the frame list; show only the active frame.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !frames.length) return
    const layers = layersRef.current
    const valid = new Set(frames.map((f) => f.time))
    for (const [time, layer] of layers) {
      if (!valid.has(time)) { layer.remove(); layers.delete(time) }
    }
    const ensure = (frame) => {
      if (!frame || layers.has(frame.time)) return
      const layer = L.tileLayer(frame.url, {
        opacity: 0, maxNativeZoom: RADAR_MAX_NATIVE_ZOOM, maxZoom: 10, zIndex: 5, tileSize: 256,
      }).addTo(map)
      layers.set(frame.time, layer)
    }
    ensure(frames[index])
    ensure(frames[(index + 1) % frames.length]) // preload the next frame for smooth playback
    const active = frames[index]?.time
    for (const [time, layer] of layers) layer.setOpacity(time === active ? 0.72 : 0)
  }, [frames, index])

  useEffect(() => {
    if (!playing || frames.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % frames.length), FRAME_MS)
    return () => clearInterval(id)
  }, [playing, frames.length])

  // Pause the animation while the tab is hidden.
  useEffect(() => {
    const onVis = () => document.hidden && setPlaying(false)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const frame = frames[index]
  const recenter = () => lat != null && mapRef.current?.setView([lat, lon], 7)

  return (
    <div className="view radar">
      <header className="view-head">
        <h1>Weather map</h1>
        <p>Live precipitation radar{location ? ` around ${placeName(location)}` : ''}</p>
      </header>

      <div className="radar-frame glass">
        <div ref={mapEl} className="radar-map" role="application" aria-label="Precipitation radar map" />

        <div className="radar-zoom">
          <button className="icon-btn" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in"><Plus size={18} /></button>
          <button className="icon-btn" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out"><Minus size={18} /></button>
          <button className="icon-btn" onClick={recenter} disabled={lat == null} aria-label="Centre on selected location"><LocateFixed size={18} /></button>
        </div>

        {status === 'loading' && <div className="radar-status"><Loader2 size={16} className="spin" aria-hidden="true" /> Loading radar…</div>}
        {status === 'error' && (
          <div className="radar-status" role="alert">
            Radar data is unavailable right now.
            <button className="btn btn-ghost" onClick={() => { setStatus('loading'); loadFrames() }}><RotateCw size={14} aria-hidden="true" /> Retry</button>
          </div>
        )}

        {status === 'ready' && frame && (
          <div className="radar-timeline glass-strong">
            <button className="play-btn small" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause radar animation' : 'Play radar animation'}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <input
              type="range" min="0" max={frames.length - 1} step="1" value={index}
              onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)) }}
              aria-label="Radar timeline" aria-valuetext={frameClock(frame.time, h12)}
              style={{ '--fill': `${(index / Math.max(1, frames.length - 1)) * 100}%` }}
            />
            <span className="radar-time">
              <strong>{frameClock(frame.time, h12)}</strong>
              <small>{frame.kind === 'past' ? 'Observed' : 'Nowcast'}</small>
            </span>
          </div>
        )}
      </div>

      <div className="radar-legend">
        <span>Light</span>
        <i aria-hidden="true" />
        <span>Heavy</span>
        <p className="fineprint">
          Radar imagery: RainViewer ({frames.length} frames, times shown in your device’s timezone). Coverage depends on
          local radar stations — areas without coverage appear empty.
        </p>
      </div>
    </div>
  )
}
