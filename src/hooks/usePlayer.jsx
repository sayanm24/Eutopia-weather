import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { load, save } from '../utils/storage.js'

// App-wide audio player (30-second previews) so music keeps playing across views.
const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const audioRef = useRef(null)
  if (!audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.preload = 'none'
  }
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState({ time: 0, duration: 0 })
  const [volume, setVolumeState] = useState(() => load('volume', 0.8))
  const [error, setError] = useState(null)
  const queueRef = useRef(queue)
  queueRef.current = queue
  const indexRef = useRef(index)
  indexRef.current = index

  const startAt = useCallback((i, list = queueRef.current) => {
    const track = list[i]
    if (!track) return
    const audio = audioRef.current
    setError(null)
    setIndex(i)
    setProgress({ time: 0, duration: 0 })
    audio.src = track.previewUrl
    audio.play().catch(() => {
      setPlaying(false)
      setError('Playback was blocked or the preview is unavailable.')
    })
  }, [])

  const playTrack = useCallback((track, list) => {
    const q = list || [track]
    setQueue(q)
    startAt(Math.max(0, q.findIndex((t) => t.id === track.id)), q)
  }, [startAt])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio.src) return
    if (audio.paused) audio.play().catch(() => setError('Playback was blocked by the browser.'))
    else audio.pause()
  }, [])

  const next = useCallback(() => {
    const q = queueRef.current
    if (q.length) startAt((indexRef.current + 1) % q.length)
  }, [startAt])

  const prev = useCallback(() => {
    const audio = audioRef.current
    const q = queueRef.current
    if (!q.length) return
    if (audio.currentTime > 3) { audio.currentTime = 0; return }
    startAt((indexRef.current - 1 + q.length) % q.length)
  }, [startAt])

  const seek = useCallback((fraction) => {
    const audio = audioRef.current
    if (audio.duration) audio.currentTime = fraction * audio.duration
  }, [])

  const setVolume = useCallback((v) => { setVolumeState(v); save('volume', v) }, [])
  useEffect(() => { audioRef.current.volume = volume }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => setProgress({ time: audio.currentTime, duration: audio.duration || 0 })
    const onEnded = () => {
      const q = queueRef.current
      if (q.length > 1) startAt((indexRef.current + 1) % q.length)
      else setPlaying(false)
    }
    const onError = () => { setPlaying(false); setError('This preview could not be loaded.') }
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [startAt])

  const value = useMemo(() => ({
    track: queue[index] || null, queue, index, playing, progress, volume, error,
    playTrack, toggle, next, prev, seek, setVolume,
  }), [queue, index, playing, progress, volume, error, playTrack, toggle, next, prev, seek, setVolume])

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export const usePlayer = () => useContext(PlayerContext)
