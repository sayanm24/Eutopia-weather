import { useCallback, useEffect, useState } from 'react'
import { Search, Play, Pause, SkipBack, SkipForward, Volume2, ExternalLink, ListMusic, Loader2, RotateCw, X } from 'lucide-react'
import { searchTracks, spotifyPlaylistSearchUrl } from '../../services/musicApi.js'
import { usePlayer } from '../../hooks/usePlayer.jsx'

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function PlayerControls({ compact = false }) {
  const { track, playing, toggle, next, prev, queue } = usePlayer()
  return (
    <div className={`controls${compact ? ' compact' : ''}`}>
      <button className="icon-btn" onClick={prev} disabled={!track} aria-label="Previous track"><SkipBack size={compact ? 18 : 22} /></button>
      <button className="play-btn" onClick={toggle} disabled={!track} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause size={compact ? 18 : 24} /> : <Play size={compact ? 18 : 24} />}
      </button>
      <button className="icon-btn" onClick={next} disabled={!track || queue.length < 2} aria-label="Next track"><SkipForward size={compact ? 18 : 22} /></button>
    </div>
  )
}

function NowPlaying() {
  const { track, progress, seek, volume, setVolume, error } = usePlayer()
  const pct = progress.duration ? (progress.time / progress.duration) * 100 : 0
  return (
    <section className="panel glass now-playing" aria-label="Now playing">
      <div className="np-art">
        {track?.artwork ? <img src={track.artwork} alt={`Artwork for ${track.album || track.title}`} /> : <ListMusic size={44} strokeWidth={1.2} aria-hidden="true" />}
      </div>
      <div className="np-body">
        <p className="eyebrow">{track ? 'Now playing · 30-second preview' : 'Nothing playing yet'}</p>
        <h2>{track ? track.title : 'Pick a track or a mix'}</h2>
        <p className="np-artist">{track ? `${track.artist}${track.album ? ` — ${track.album}` : ''}` : 'Recommendations follow the weather outside.'}</p>

        <div className="np-progress">
          <span>{clock(progress.time)}</span>
          <input
            type="range" min="0" max="100" step="0.1" value={pct} disabled={!track}
            onChange={(e) => seek(Number(e.target.value) / 100)} aria-label="Seek"
            style={{ '--fill': `${pct}%` }}
          />
          <span>{clock(progress.duration)}</span>
        </div>

        <div className="np-row">
          <PlayerControls />
          <label className="volume">
            <Volume2 size={16} aria-hidden="true" />
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" style={{ '--fill': `${volume * 100}%` }} />
          </label>
        </div>
        {error && <p className="np-error" role="alert">{error}</p>}
        {track && (
          <p className="np-links">
            <a href={track.spotifyUrl} target="_blank" rel="noreferrer">Find on Spotify <ExternalLink size={12} aria-hidden="true" /></a>
            <a href={track.storeUrl} target="_blank" rel="noreferrer">Apple Music <ExternalLink size={12} aria-hidden="true" /></a>
          </p>
        )}
      </div>
    </section>
  )
}

export default function MusicView({ resolved, simulated }) {
  const mood = resolved.music
  const { track: current, playing, playTrack, toggle } = usePlayer()
  const [mix, setMix] = useState(mood.mixes[0])
  const [input, setInput] = useState('')
  const [term, setTerm] = useState('') // submitted search; empty = follow the mood mix
  const [state, setState] = useState({ status: 'loading', tracks: [], error: '' })
  const [attempt, setAttempt] = useState(0)

  // When the weather (and therefore the mood) changes, follow it — unless the user is searching.
  useEffect(() => { setMix(mood.mixes[0]) }, [mood])

  const activeQuery = term || mix.query
  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, status: 'loading', error: '' }))
    searchTracks(activeQuery)
      .then((tracks) => !cancelled && setState({ status: 'ready', tracks, error: '' }))
      .catch((err) => !cancelled && setState({ status: 'error', tracks: [], error: err.message || 'Music search failed.' }))
    return () => { cancelled = true }
  }, [activeQuery, attempt])

  const submit = (e) => { e.preventDefault(); setTerm(input.trim()) }
  const clearSearch = () => { setInput(''); setTerm('') }
  const onTrack = useCallback((t) => {
    if (current?.id === t.id) toggle()
    else playTrack(t, state.tracks)
  }, [current, toggle, playTrack, state.tracks])

  return (
    <div className="view music">
      <header className="view-head">
        <p className="eyebrow">{simulated ? 'Music for the simulated scene' : 'Music for this weather'} · {resolved.label}</p>
        <h1>{mood.title}</h1>
        <p>{mood.blurb}</p>
        <ul className="chips">{mood.genres.map((g) => <li key={g}>{g}</li>)}</ul>
      </header>

      <NowPlaying />

      <section aria-label="Recommended mixes">
        <h2 className="section-title">Recommended mixes</h2>
        <div className="mixes">
          {mood.mixes.map((m) => {
            const active = !term && mix.name === m.name
            return (
              <div key={m.name} className={`mix glass${active ? ' active' : ''}`}>
                <button className="mix-main" onClick={() => { clearSearch(); setMix(m) }} aria-pressed={active}>
                  <ListMusic size={18} aria-hidden="true" />
                  <span>{m.name}</span>
                  <small>{m.query}</small>
                </button>
                <a href={spotifyPlaylistSearchUrl(m.query)} target="_blank" rel="noreferrer" aria-label={`Find ${m.name} style playlists on Spotify`}>
                  Spotify playlists <ExternalLink size={11} aria-hidden="true" />
                </a>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel glass" aria-label="Tracks">
        <form className="music-search" onSubmit={submit}>
          <Search size={16} aria-hidden="true" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search songs, artists or moods" aria-label="Search music" />
          {term && <button type="button" className="icon-btn" onClick={clearSearch} aria-label="Clear search"><X size={16} /></button>}
          <button className="btn btn-accent" type="submit" disabled={!input.trim()}>Search</button>
        </form>
        <p className="track-head">{term ? `Results for “${term}”` : mix.name}</p>

        {state.status === 'loading' && <p className="empty"><Loader2 size={16} className="spin" aria-hidden="true" /> Loading tracks…</p>}
        {state.status === 'error' && (
          <div className="empty">
            <p>{state.error}</p>
            <button className="btn btn-ghost" onClick={() => setAttempt((a) => a + 1)}><RotateCw size={14} aria-hidden="true" /> Retry</button>
          </div>
        )}
        {state.status === 'ready' && state.tracks.length === 0 && <p className="empty">No playable tracks found. Try another search.</p>}
        {state.status === 'ready' && (
          <ol className="tracks">
            {state.tracks.map((t) => {
              const isCurrent = current?.id === t.id
              return (
                <li key={t.id} className={isCurrent ? 'current' : ''}>
                  <button className="track" onClick={() => onTrack(t)} aria-label={`${isCurrent && playing ? 'Pause' : 'Play'} ${t.title} by ${t.artist}`}>
                    <span className="track-art">
                      <img src={t.artworkSmall} alt="" loading="lazy" />
                      <span className="track-state">{isCurrent && playing ? <Pause size={16} /> : <Play size={16} />}</span>
                    </span>
                    <span className="track-text">
                      <strong>{t.title}</strong>
                      <small>{t.artist}</small>
                    </span>
                    <span className="track-album">{t.album}</span>
                  </button>
                  <a className="icon-btn" href={t.spotifyUrl} target="_blank" rel="noreferrer" aria-label={`Find ${t.title} on Spotify`}><ExternalLink size={15} /></a>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <p className="fineprint">
        Playback uses 30-second previews from the iTunes Search API. Spotify links open Spotify itself — in-app Spotify
        playback needs a Spotify developer app and a Premium account, which are not configured here.
      </p>
    </div>
  )
}

/** Persistent mini player shown on other views while something is loaded. */
export function MiniPlayer({ onOpen }) {
  const { track, progress } = usePlayer()
  if (!track) return null
  const pct = progress.duration ? (progress.time / progress.duration) * 100 : 0
  return (
    <div className="mini-player glass-strong" role="region" aria-label="Mini player">
      <button className="mini-info" onClick={onOpen} aria-label="Open music">
        <img src={track.artworkSmall} alt="" />
        <span><strong>{track.title}</strong><small>{track.artist}</small></span>
      </button>
      <PlayerControls compact />
      <span className="mini-bar" style={{ width: `${pct}%` }} />
    </div>
  )
}
