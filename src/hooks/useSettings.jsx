import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { load, save } from '../utils/storage.js'

const DEFAULTS = {
  units: 'metric', // metric | imperial
  h12: false,
  refreshMin: 10,
  thunderSound: false,
  thunderVolume: 0.5,
  quality: 'auto', // auto | low | high
  motion: 'auto', // auto | reduced
}

const SettingsContext = createContext(null)

function useMediaQuery(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...load('settings', {}) }))
  // Simulation is deliberately NOT persisted: a reload always returns to live weather.
  const [sim, setSim] = useState({ env: null, time: 'day' })

  const update = useCallback((patch) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      save('settings', next)
      return next
    })
  }, [])

  const smallScreen = useMediaQuery('(max-width: 820px), (pointer: coarse)')
  const prefersReduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const lowPower = settings.quality === 'low' || (settings.quality === 'auto' && smallScreen)
  const reducedMotion = settings.motion === 'reduced' || prefersReduced

  const value = useMemo(
    () => ({ settings, update, sim, setSim, lowPower, reducedMotion, prefersReduced }),
    [settings, update, sim, lowPower, reducedMotion, prefersReduced],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
