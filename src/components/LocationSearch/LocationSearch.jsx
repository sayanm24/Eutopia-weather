import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X, LocateFixed, MapPin, History, Star, Loader2, Crosshair } from 'lucide-react'
import { searchLocations } from '../../services/weatherApi.js'
import { locKey, sameLoc } from '../../utils/location.js'

const DEBOUNCE_MS = 300

const regionLine = (r) =>
  r.isCoords ? 'Coordinates' : [r.admin, r.countryName || r.country].filter(Boolean).join(', ')

/**
 * Global location search: an always-visible glass search bar with debounced,
 * cancellable autocomplete, keyboard navigation, favourites / recents and a
 * "use my location" button.
 */
export default function LocationSearch({
  onSelect, onLocate, geo, recents, favourites, currentLabel, busy, focusSignal,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')
  const [active, setActive] = useState(-1)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const typed = query.trim()

  // Other parts of the app ("Search for a city" buttons) can focus the bar.
  useEffect(() => {
    if (focusSignal) { inputRef.current?.focus(); setOpen(true) }
  }, [focusSignal])

  // Close when clicking / tapping outside.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Debounced autocomplete. Each keystroke cancels the previous timer and in-flight request.
  useEffect(() => {
    if (typed.length < 2) { setResults([]); setStatus('idle'); return }
    const ctrl = new AbortController()
    setStatus('loading')
    const timer = setTimeout(async () => {
      try {
        const list = await searchLocations(typed, { signal: ctrl.signal })
        if (ctrl.signal.aborted) return
        setResults(list)
        setStatus('done')
        setActive(list.length ? 0 : -1)
      } catch (err) {
        if (err.kind === 'aborted' || ctrl.signal.aborted) return
        setResults([])
        setError(err.kind === 'rate-limit'
          ? 'Search is rate-limited right now. Please wait a moment and try again.'
          : err.message || 'Search failed. Please try again.')
        setStatus('error')
      }
    }, DEBOUNCE_MS)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [typed])

  // What the dropdown lists: live suggestions while typing, otherwise saved places.
  const groups = useMemo(() => {
    if (typed.length >= 2) return [{ label: null, kind: 'result', items: results }]
    const recentOnly = recents.filter((r) => !favourites.some((f) => sameLoc(f, r)))
    return [
      { label: 'Favourites', kind: 'favourite', items: favourites },
      { label: 'Recent', kind: 'recent', items: recentOnly },
    ].filter((g) => g.items.length)
  }, [typed, results, recents, favourites])
  const options = useMemo(() => groups.flatMap((g) => g.items.map((item) => ({ item, kind: g.kind }))), [groups])

  useEffect(() => { if (typed.length < 2) setActive(-1) }, [typed])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (loc) => {
    const { label, isCoords, countryName, ...rest } = loc
    onSelect({ ...rest, country: rest.country || countryName || null, isGeo: false })
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (!options.length) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + options.length) % options.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = options[active] || (typed.length >= 2 ? options[0] : null)
      if (pick && status !== 'loading') choose(pick.item)
    } else if (e.key === 'Escape') {
      if (query) setQuery('')
      else { setOpen(false); inputRef.current?.blur() }
    }
  }

  const locating = geo.status === 'locating'
  const showSpinner = status === 'loading' || busy
  const noMatches = status === 'done' && results.length === 0
  const Icons = { result: MapPin, favourite: Star, recent: History }
  let optionIndex = -1

  return (
    <div className={`loc-search${open ? ' is-open' : ''}`} ref={rootRef}>
      <div className="loc-bar">
        <label className="loc-field">
          {showSpinner
            ? <Loader2 size={16} className="spin" aria-hidden="true" />
            : <Search size={16} aria-hidden="true" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={open || !currentLabel ? 'Search any place, or lat, lon' : currentLabel}
            role="combobox" aria-expanded={open} aria-controls="loc-listbox" aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `loc-opt-${active}` : undefined}
            aria-label="Search for a location" autoComplete="off" spellCheck="false" enterKeyHint="search"
          />
          {query && (
            <button type="button" className="loc-clear" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
        </label>
        <button
          type="button" className="loc-locate" onClick={() => { setOpen(false); onLocate() }} disabled={locating}
          aria-label="Use my current location" title="Use my current location"
        >
          {locating ? <Loader2 size={17} className="spin" aria-hidden="true" /> : <LocateFixed size={17} aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="loc-dropdown glass-strong"
            initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <ul id="loc-listbox" role="listbox" aria-label="Locations" ref={listRef}>
              {groups.map((g) => (
                <li key={g.label || 'results'} role="presentation">
                  {g.label && <p className="loc-label">{g.label}</p>}
                  <ul role="group" aria-label={g.label || 'Suggestions'}>
                    {g.items.map((item) => {
                      optionIndex += 1
                      const i = optionIndex
                      const Icon = item.isCoords ? Crosshair : Icons[g.kind]
                      return (
                        <li
                          key={`${g.kind}-${locKey(item)}`} id={`loc-opt-${i}`} role="option"
                          aria-selected={active === i} data-active={active === i}
                          className={`loc-option${active === i ? ' active' : ''}`}
                          onPointerMove={() => active !== i && setActive(i)}
                          onPointerDown={(e) => e.preventDefault()} // keep input focus
                          onClick={() => choose(item)}
                        >
                          <Icon size={16} aria-hidden="true" />
                          <span className="loc-name">{item.isCoords ? item.label : item.name}</span>
                          <small>{regionLine(item)}</small>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>

            {status === 'loading' && results.length === 0 && <p className="loc-note"><Loader2 size={14} className="spin" aria-hidden="true" /> Searching…</p>}
            {noMatches && (
              <p className="loc-note" role="status">
                We couldn’t find “{typed}”. Check the spelling, try a nearby town, or enter coordinates like 22.57, 88.36.
              </p>
            )}
            {status === 'error' && <p className="loc-note" role="alert">{error}</p>}
            {typed.length < 2 && groups.length === 0 && (
              <p className="loc-note">Type a city, town, region or country — or coordinates such as 35.68, 139.69.</p>
            )}
            {geo.message && typed.length < 2 && <p className="loc-note">{geo.message}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
