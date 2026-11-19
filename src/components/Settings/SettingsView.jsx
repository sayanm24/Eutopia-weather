import { FlaskConical, LocateFixed, Volume2, Radio, Trash2, Search } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings.jsx'
import { ENVIRONMENTS, THEMES } from '../../engines/weatherThemeEngine.js'
import { playThunder, unlockThunder } from '../../audio/thunder.js'
import { openWeatherStatus, weatherApiStatus } from '../../services/weatherApi.js'
import { clearAll } from '../../utils/storage.js'
import WeatherGlyph from '../WeatherCards/WeatherGlyph.jsx'
import { placeName } from '../../utils/format.js'

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Row({ title, hint, children }) {
  return (
    <div className="set-row">
      <div><h3>{title}</h3>{hint && <p>{hint}</p>}</div>
      <div className="set-control">{children}</div>
    </div>
  )
}

const WA_STATUS = {
  'not-configured': ['idle', 'Not configured — add WEATHERAPI_KEY to .env to make it the primary provider'],
  unknown: ['idle', 'Configured, not contacted yet'],
  ok: ['ok', 'Connected — primary provider'],
  'invalid-key': ['bad', 'Key rejected or quota exhausted — using the other providers'],
  'rate-limit': ['warn', 'Rate limited — using the other providers'],
  error: ['warn', 'Unreachable — using the other providers'],
}

const OW_STATUS = {
  ok: ['ok', 'Connected'],
  'invalid-key': ['bad', 'Key rejected (invalid or not yet activated) — using Open-Meteo for current conditions'],
  'rate-limit': ['warn', 'Rate limited — using Open-Meteo for current conditions'],
  error: ['warn', 'Unreachable — using Open-Meteo for current conditions'],
  unknown: ['idle', 'Not contacted yet'],
}

export default function SettingsView({ data, liveLabel, location, geo, onLocate, onSearch }) {
  const { settings, update, sim, setSim, prefersReduced } = useSettings()
  const [owTone, owText] = OW_STATUS[openWeatherStatus()] || OW_STATUS.unknown
  const [waTone, waText] = WA_STATUS[weatherApiStatus()] || WA_STATUS.unknown

  const toggleThunder = () => {
    const on = !settings.thunderSound
    if (on) unlockThunder() // this click is the user gesture that unlocks audio
    update({ thunderSound: on })
  }

  return (
    <div className="view settings">
      <header className="view-head"><h1>Settings</h1></header>

      <section className="panel glass sim-panel" aria-label="Weather simulation">
        <header className="panel-head">
          <h2><FlaskConical size={15} aria-hidden="true" /> Simulation mode</h2>
          {sim.env && <span className="badge-sim">Simulating</span>}
        </header>
        <p className="set-hint">
          Preview any environment without touching the live data. While active, a “Simulated” banner stays on screen and
          the readings shown remain the real ones{liveLabel ? ` (live: ${liveLabel})` : ''}.
        </p>
        <div className="sim-grid">
          <button className={!sim.env ? 'active' : ''} onClick={() => setSim({ env: null, time: 'day' })} aria-pressed={!sim.env}>
            <Radio size={20} strokeWidth={1.5} aria-hidden="true" />
            <span>Live weather</span>
          </button>
          {ENVIRONMENTS.map((id) => (
            <button key={id} className={sim.env === id ? 'active' : ''} onClick={() => setSim((s) => ({ ...s, env: id }))} aria-pressed={sim.env === id}>
              <WeatherGlyph env={id} size={20} />
              <span>{id === 'golden' ? 'Sunrise / sunset' : THEMES[id].label}</span>
            </button>
          ))}
        </div>
        <Row title="Simulated time of day" hint="Applies only while simulating. Thunderstorms and golden hour look the same day or night.">
          <Segmented label="Simulated time of day" value={sim.time} onChange={(time) => setSim((s) => ({ ...s, time }))}
            options={[{ value: 'day', label: 'Day' }, { value: 'night', label: 'Night' }, { value: 'auto', label: 'Match live' }]} />
        </Row>
      </section>

      <section className="panel glass" aria-label="Location">
        <header className="panel-head"><h2>Location</h2></header>
        <Row title={location ? placeName(data?.location || location) || 'Current location' : 'No location selected'}
          hint={geo.message || (location?.isGeo ? 'Detected from your device.' : 'Chosen manually.')}>
          <button className="btn btn-ghost" onClick={onLocate} disabled={geo.status === 'locating'}>
            <LocateFixed size={14} aria-hidden="true" /> {geo.status === 'locating' ? 'Locating…' : 'Use my location'}
          </button>
          <button className="btn btn-ghost" onClick={onSearch}><Search size={14} aria-hidden="true" /> Search city</button>
        </Row>
      </section>

      <section className="panel glass" aria-label="Units and updates">
        <header className="panel-head"><h2>Units &amp; updates</h2></header>
        <Row title="Units">
          <Segmented label="Units" value={settings.units} onChange={(units) => update({ units })}
            options={[{ value: 'metric', label: '°C · km/h' }, { value: 'imperial', label: '°F · mph' }]} />
        </Row>
        <Row title="Clock">
          <Segmented label="Clock format" value={settings.h12} onChange={(h12) => update({ h12 })}
            options={[{ value: false, label: '24-hour' }, { value: true, label: '12-hour' }]} />
        </Row>
        <Row title="Refresh interval" hint="How often live weather is re-fetched while the tab is visible.">
          <Segmented label="Refresh interval" value={settings.refreshMin} onChange={(refreshMin) => update({ refreshMin })}
            options={[5, 10, 15, 30, 60].map((m) => ({ value: m, label: `${m} min` }))} />
        </Row>
      </section>

      <section className="panel glass" aria-label="Sound and motion">
        <header className="panel-head"><h2>Sound &amp; motion</h2></header>
        <Row title="Thunder sound" hint="Plays a rumble after each lightning strike. Off by default.">
          <button className={`switch${settings.thunderSound ? ' on' : ''}`} role="switch" aria-checked={settings.thunderSound} onClick={toggleThunder} aria-label="Thunder sound"><span /></button>
        </Row>
        <Row title="Thunder volume">
          <label className="volume">
            <Volume2 size={16} aria-hidden="true" />
            <input type="range" min="0" max="1" step="0.05" value={settings.thunderVolume} disabled={!settings.thunderSound}
              onChange={(e) => update({ thunderVolume: Number(e.target.value) })} aria-label="Thunder volume"
              style={{ '--fill': `${settings.thunderVolume * 100}%` }} />
          </label>
          <button className="btn btn-ghost" disabled={!settings.thunderSound} onClick={() => { unlockThunder(); setTimeout(() => playThunder(settings.thunderVolume), 60) }}>Test</button>
        </Row>
        <Row title="Animation quality" hint="Auto lowers particle counts and resolution on phones and tablets.">
          <Segmented label="Animation quality" value={settings.quality} onChange={(quality) => update({ quality })}
            options={[{ value: 'auto', label: 'Auto' }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]} />
        </Row>
        <Row title="Reduce motion" hint={prefersReduced ? 'Your system asks for reduced motion, so it is always on.' : 'Freezes particles, drifting clouds and lightning.'}>
          <button className={`switch${settings.motion === 'reduced' || prefersReduced ? ' on' : ''}`} role="switch" disabled={prefersReduced}
            aria-checked={settings.motion === 'reduced' || prefersReduced} aria-label="Reduce motion"
            onClick={() => update({ motion: settings.motion === 'reduced' ? 'auto' : 'reduced' })}><span /></button>
        </Row>
      </section>

      <section className="panel glass" aria-label="Data sources">
        <header className="panel-head"><h2>Data sources</h2></header>
        <ul className="sources">
          <li><i className={`dot ${waTone}`} /><div><strong>WeatherAPI.com</strong><span>Search, current conditions, forecast · {waText}</span></div></li>
          <li><i className={`dot ${owTone}`} /><div><strong>OpenWeather</strong><span>Current conditions, city search · {owText}</span></div></li>
          <li><i className={`dot ${data?.sources.forecast ? 'ok' : data ? 'warn' : 'idle'}`} /><div><strong>Open-Meteo</strong><span>Place search, hourly &amp; 7-day forecast, UV index (no key required)</span></div></li>
          <li><i className="dot idle" /><div><strong>RainViewer</strong><span>Precipitation radar on the Weather Map</span></div></li>
          <li><i className="dot idle" /><div><strong>iTunes Search</strong><span>Track search, artwork and 30-second previews</span></div></li>
        </ul>
        <Row title="Saved data" hint="Removes your saved location, recent places and preferences from this browser.">
          <button className="btn btn-ghost" onClick={() => { clearAll(); window.location.reload() }}><Trash2 size={14} aria-hidden="true" /> Clear &amp; reload</button>
        </Row>
      </section>
    </div>
  )
}
