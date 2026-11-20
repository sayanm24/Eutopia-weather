import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FlaskConical, WifiOff, TriangleAlert, Info, X, RotateCw, Search, LocateFixed, Loader2, CloudOff } from 'lucide-react'
import Atmosphere from './components/WeatherAnimations/Atmosphere.jsx'
import Navigation, { Logo } from './components/Navigation/Navigation.jsx'
import LocationSearch from './components/LocationSearch/LocationSearch.jsx'
import FavouritesBar from './components/LocationSearch/FavouritesBar.jsx'
import WeatherDashboard, { DashboardSkeleton } from './components/WeatherDashboard/WeatherDashboard.jsx'
import MusicView, { MiniPlayer } from './components/MusicPlayer/MusicView.jsx'
import SettingsView from './components/Settings/SettingsView.jsx'
import { useSettings } from './hooks/useSettings.jsx'
import { useLocation } from './hooks/useLocation.js'
import { useWeather } from './hooks/useWeather.js'
import { classifyCurrent } from './engines/weatherClassifier.js'
import { resolveTheme, applyPalette } from './engines/weatherThemeEngine.js'
import * as fmt from './utils/format.js'

// Leaflet is only needed on the map view, so it loads on demand.
const WeatherRadar = lazy(() => import('./components/WeatherRadar/WeatherRadar.jsx'))
// The interactive forecast (and its chart library) also loads on demand.
const ForecastView = lazy(() => import('./components/WeatherDashboard/ForecastView.jsx'))

function Welcome({ geo, onSearch, onLocate }) {
  const locating = geo.status === 'locating'
  return (
    <div className="view center-state">
      <Logo />
      <h1>Experience the weather,<br />don’t just forecast it.</h1>
      {locating
        ? <p><Loader2 size={16} className="spin" aria-hidden="true" /> Waiting for your location — your browser may ask for permission.</p>
        : <p>{geo.message || 'Choose a place to step into its sky.'}</p>}
      <div className="center-actions">
        <button className="btn btn-accent" onClick={onSearch}><Search size={15} aria-hidden="true" /> Search for a city</button>
        {!locating && <button className="btn btn-ghost" onClick={onLocate}><LocateFixed size={15} aria-hidden="true" /> Use my location</button>}
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry, onSearch }) {
  return (
    <div className="view center-state" role="alert">
      <CloudOff size={40} strokeWidth={1.2} aria-hidden="true" />
      <h1>Live weather is unavailable</h1>
      <p>{error?.message || 'Something went wrong while loading the weather.'}</p>
      <div className="center-actions">
        <button className="btn btn-accent" onClick={onRetry}><RotateCw size={15} aria-hidden="true" /> Try again</button>
        <button className="btn btn-ghost" onClick={onSearch}><Search size={15} aria-hidden="true" /> Choose another city</button>
      </div>
    </div>
  )
}

export default function App() {
  const { settings, sim, setSim } = useSettings()
  const {
    location, setLocation, locate, geo, recents, favourites, isFavourite, toggleFavourite, removeFavourite,
  } = useLocation()
  const weather = useWeather(location, settings.refreshMin)
  const { data } = weather
  const [view, setView] = useState('home')
  const [searchFocus, setSearchFocus] = useState(0) // bump to focus the search bar
  const [noticeDismissed, setNoticeDismissed] = useState(false)

  // Re-run classification every minute so sunrise / sunset / nightfall arrive on time.
  const [minute, setMinute] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setMinute((m) => m + 1), 60000)
    return () => clearInterval(id)
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const live = useMemo(() => (data ? classifyCurrent(data.current) : null), [data, minute])
  // While a new city loads, hold the previous sky instead of snapping to a blank one.
  const lastLive = useRef(null)
  if (live) lastLive.current = live
  const sky = live || (weather.status === 'loading' ? lastLive.current : null)

  const simulated = Boolean(sim.env)
  const envId = simulated ? sim.env : sky?.env || 'idle'
  const isNight = simulated
    ? sim.time === 'night' || (sim.time === 'auto' && Boolean(sky?.isNight))
    : Boolean(sky?.isNight)
  const resolved = useMemo(() => resolveTheme(envId, isNight), [envId, isNight])
  useEffect(() => { applyPalette(resolved) }, [resolved])

  // A forecast day's music mood, when the user opens Music from the Forecast page; null follows the live sky.
  const [musicMood, setMusicMood] = useState(null)
  const changeView = (v) => { setView(v); setMusicMood(null); window.scrollTo({ top: 0 }) }
  const openMusicFor = (mood) => { changeView('music'); setMusicMood(mood) }
  const openSearch = () => { window.scrollTo({ top: 0 }); setSearchFocus((n) => n + 1) }

  const weatherView = (render) => {
    if (!location) return <Welcome geo={geo} onSearch={openSearch} onLocate={locate} />
    if (data && live) return render()
    if (weather.status === 'error') return <ErrorState error={weather.error} onRetry={weather.refresh} onSearch={openSearch} />
    return <DashboardSkeleton />
  }

  let content
  if (view === 'home') {
    content = weatherView(() => (
      <WeatherDashboard
        data={data} live={live} resolved={resolved} simulated={simulated}
        units={settings.units} h12={settings.h12}
        refreshing={weather.refreshing} onRefresh={weather.refresh} onOpenMusic={() => changeView('music')}
        isFavourite={isFavourite(data.location)} onToggleFavourite={() => toggleFavourite(data.location)}
      />
    ))
  } else if (view === 'forecast') {
    content = weatherView(() => (
      <Suspense fallback={<DashboardSkeleton />}>
        <ForecastView data={data} units={settings.units} h12={settings.h12} resolved={resolved} onOpenMusic={openMusicFor} />
      </Suspense>
    ))
  } else if (view === 'map') {
    content = (
      <Suspense fallback={<div className="view"><div className="skeleton sk-panel" style={{ height: '60vh' }} /></div>}>
        <WeatherRadar location={data?.location || location} h12={settings.h12} />
      </Suspense>
    )
  } else if (view === 'music') {
    content = <MusicView resolved={resolved} simulated={simulated} override={musicMood} />
  } else {
    content = (
      <SettingsView data={data} liveLabel={live?.label} location={location} geo={geo} onLocate={locate} onSearch={openSearch} />
    )
  }

  const owNotice = data?.notices.openWeather
  const updatedAt = data ? fmt.time(Math.floor(data.fetchedAt / 1000), data.tzOffset, settings.h12) : null

  return (
    <div className="app">
      <Atmosphere scene={resolved.scene} />
      <Navigation
        view={view} onChange={changeView}
        search={(
          <LocationSearch
            onSelect={setLocation} onLocate={locate} geo={geo}
            recents={recents} favourites={favourites}
            currentLabel={data?.location.name} busy={weather.status === 'loading'} focusSignal={searchFocus}
          />
        )}
      />

      <main>
        <div className="banners" aria-live="polite">
          {simulated && (
            <div className="banner banner-sim">
              <FlaskConical size={15} aria-hidden="true" />
              <span><strong>Simulated environment — {resolved.label}.</strong> This is a preview, not the live weather.</span>
              <button className="btn btn-ghost" onClick={() => setSim({ env: null, time: 'day' })}>Return to live</button>
            </div>
          )}
          {!weather.online && (
            <div className="banner">
              <WifiOff size={15} aria-hidden="true" />
              <span>You’re offline.{updatedAt ? ` Showing the last live update from ${updatedAt}.` : ''} It will refresh when you reconnect.</span>
            </div>
          )}
          {weather.online && data && weather.error && (
            <div className="banner">
              <TriangleAlert size={15} aria-hidden="true" />
              <span>Couldn’t refresh: {weather.error.message} Showing data from {updatedAt}.</span>
              <button className="btn btn-ghost" onClick={weather.refresh}><RotateCw size={13} aria-hidden="true" /> Retry</button>
            </div>
          )}
          {owNotice && !noticeDismissed && (
            <div className="banner">
              <Info size={15} aria-hidden="true" />
              <span>
                {owNotice === 'invalid-key'
                  ? 'OpenWeather rejected the API key (new keys can take a couple of hours to activate).'
                  : owNotice === 'rate-limit'
                    ? 'OpenWeather rate limit reached.'
                    : 'OpenWeather is unreachable right now.'}
                {' '}Current conditions are live from Open-Meteo instead.
              </span>
              <button className="icon-btn" onClick={() => setNoticeDismissed(true)} aria-label="Dismiss"><X size={15} /></button>
            </div>
          )}
        </div>

        {(view === 'home' || view === 'forecast') && (
          <FavouritesBar favourites={favourites} current={data?.location || location} onSelect={setLocation} onRemove={removeFavourite} />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </main>

      {view !== 'music' && <MiniPlayer onOpen={() => changeView('music')} />}
    </div>
  )
}
