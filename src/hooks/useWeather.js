import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchWeather } from '../services/weatherApi.js'

const EMPTY = { data: null, status: 'idle', error: null, refreshing: false }

/**
 * Live weather for a location with a configurable refresh interval.
 * - A location change clears the old data (we never show city A's numbers under city B).
 * - A failed background refresh keeps the last real data and exposes the error (stale state).
 * - Refetches when the connection returns or a hidden tab becomes visible with stale data.
 */
export function useWeather(location, refreshMin) {
  const [state, setState] = useState(EMPTY)
  const [online, setOnline] = useState(() => navigator.onLine !== false)
  const req = useRef(0)
  const locRef = useRef(location)
  locRef.current = location
  const key = location ? `${location.lat},${location.lon}` : ''

  const run = useCallback(async (silent) => {
    const loc = locRef.current
    if (!loc) return
    const id = ++req.current
    setState((s) => (silent && s.data
      ? { ...s, refreshing: true }
      : { data: null, status: 'loading', error: null, refreshing: true }))
    try {
      const data = await fetchWeather(loc)
      if (id !== req.current) return
      setState({ data, status: 'ready', error: null, refreshing: false })
    } catch (error) {
      if (id !== req.current) return
      setState((s) => (silent && s.data
        ? { ...s, error, refreshing: false }
        : { data: null, status: 'error', error, refreshing: false }))
    }
  }, [])

  // Initial load / location change
  useEffect(() => {
    if (!key) { setState(EMPTY); return }
    run(false)
  }, [key, run])

  // Periodic refresh
  useEffect(() => {
    if (!key) return
    const id = setInterval(() => { if (!document.hidden) run(true) }, Math.max(1, refreshMin) * 60000)
    return () => clearInterval(id)
  }, [key, refreshMin, run])

  // Connectivity + tab visibility
  const stateRef = useRef(state)
  stateRef.current = state
  useEffect(() => {
    const onOnline = () => { setOnline(true); if (locRef.current) run(Boolean(stateRef.current.data)) }
    const onOffline = () => setOnline(false)
    const onVisible = () => {
      const s = stateRef.current
      if (document.hidden || !locRef.current || !s.data) return
      if (Date.now() - s.data.fetchedAt > Math.max(1, refreshMin) * 60000) run(true)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshMin, run])

  const refresh = useCallback(() => run(Boolean(stateRef.current.data)), [run])
  return { ...state, online, refresh }
}
