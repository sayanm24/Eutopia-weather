import { useCallback, useEffect, useState } from 'react'
import { load, save } from '../utils/storage.js'
import { sameLoc } from '../utils/location.js'

const GEO_MESSAGES = {
  denied: 'Location permission was denied. Search for a city instead, or allow location access in your browser.',
  unavailable: 'Your device could not determine a location. Search for a city instead.',
  timeout: 'Finding your location took too long. Try again or search for a city.',
  unsupported: 'This browser does not support location detection. Search for a city instead.',
}

/**
 * Tracks the active location. On first visit it asks the browser for the
 * user's position (the browser shows its own permission prompt).
 */
export function useLocation() {
  const [location, setLocationState] = useState(() => load('location', null))
  const [recents, setRecents] = useState(() => load('recents', []))
  const [favourites, setFavourites] = useState(() => load('favourites', []))
  const [geo, setGeo] = useState({ status: 'idle', message: null }) // idle | locating | granted | denied | unavailable | timeout | unsupported

  const setLocation = useCallback((loc) => {
    setLocationState(loc)
    save('location', loc)
    if (loc && !loc.isGeo && loc.name) {
      setRecents((prev) => {
        const next = [loc, ...prev.filter((r) => !sameLoc(r, loc))].slice(0, 6)
        save('recents', next)
        return next
      })
    }
  }, [])

  const isFavourite = useCallback((loc) => favourites.some((f) => sameLoc(f, loc)), [favourites])

  const removeFavourite = useCallback((loc) => {
    setFavourites((prev) => {
      const next = prev.filter((f) => !sameLoc(f, loc))
      save('favourites', next)
      return next
    })
  }, [])

  /** Adds the place to favourites, or removes it if it is already there. */
  const toggleFavourite = useCallback((loc) => {
    if (!loc?.name) return
    setFavourites((prev) => {
      const exists = prev.some((f) => sameLoc(f, loc))
      const entry = { lat: loc.lat, lon: loc.lon, name: loc.name, admin: loc.admin || null, country: loc.country || null, isGeo: false }
      const next = exists ? prev.filter((f) => !sameLoc(f, loc)) : [...prev, entry].slice(-12)
      save('favourites', next)
      return next
    })
  }, [])

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'unsupported', message: GEO_MESSAGES.unsupported })
      return
    }
    setGeo({ status: 'locating', message: null })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ status: 'granted', message: null })
        setLocation({
          lat: +pos.coords.latitude.toFixed(4),
          lon: +pos.coords.longitude.toFixed(4),
          name: null,
          isGeo: true,
        })
      },
      (err) => {
        const status = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable'
        setGeo({ status, message: GEO_MESSAGES[status] })
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 },
    )
  }, [setLocation])

  useEffect(() => {
    if (!location) locate()
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { location, setLocation, locate, geo, recents, favourites, isFavourite, toggleFavourite, removeFavourite }
}
