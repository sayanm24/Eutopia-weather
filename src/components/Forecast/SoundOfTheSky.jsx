import { Play, ArrowRight, ListMusic } from 'lucide-react'
import { classifyForecast } from '../../engines/weatherClassifier.js'
import { resolveTheme } from '../../engines/weatherThemeEngine.js'
import { useForecastExplorer } from '../../hooks/useForecastExplorer.jsx'
import * as fmt from '../../utils/format.js'

/** Music mood for the selected day: today follows the live sky; other days follow their forecast conditions. */
export default function SoundOfTheSky({ resolved, onOpenMusic }) {
  const { day, isToday, tzFor } = useForecastExplorer()
  const dayName = isToday ? 'Today' : fmt.dayLong(day?.dt, tzFor(day))
  const theme = isToday || !day ? resolved : resolveTheme(classifyForecast(day).env, false)
  const mood = theme.music

  return (
    <section className="panel glass mood sky-sound" aria-labelledby="sound-title">
      <header className="panel-head">
        <h2 id="sound-title">Sound of the sky</h2>
        <span className="panel-note">{dayName} · {theme.label}</span>
      </header>
      <div className="sky-sound-body">
        <div className="mood">
          <h3>{mood.title}</h3>
          <p>{mood.blurb}</p>
          <ul className="chips">{mood.genres.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
        <ul className="sky-mixes" aria-label="Recommended mixes">
          {mood.mixes.map((m) => (
            <li key={m.name}><ListMusic size={14} aria-hidden="true" /><span>{m.name}</span><small>{m.query}</small></li>
          ))}
        </ul>
      </div>
      <button
        className="btn btn-accent"
        onClick={() => onOpenMusic(isToday ? null : { music: mood, label: `${dayName}’s forecast · ${theme.label}` })}
      >
        <Play size={15} aria-hidden="true" /> Listen to {isToday ? 'today’s' : `${dayName}’s`} mix <ArrowRight size={15} aria-hidden="true" />
      </button>
    </section>
  )
}
