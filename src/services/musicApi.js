// Music catalogue via the public iTunes Search API (no key, CORS-enabled).
// It provides real track metadata, artwork and 30-second preview streams.
// Full-track Spotify playback needs a Spotify developer app + Premium account,
// so tracks link out to Spotify instead of pretending to play there.
import { getJson } from './http.js'

const cache = new Map()

export async function searchTracks(term, limit = 18) {
  const key = `${term.toLowerCase()}|${limit}`
  if (cache.has(key)) return cache.get(key)
  const d = await getJson(
    `https://itunes.apple.com/search?media=music&entity=song&limit=${limit}&term=${encodeURIComponent(term)}`,
  )
  const seen = new Set()
  const tracks = (d.results || [])
    .filter((r) => r.previewUrl && r.trackName)
    .filter((r) => (seen.has(r.trackId) ? false : seen.add(r.trackId)))
    .map((r) => ({
      id: r.trackId,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName || '',
      genre: r.primaryGenreName || '',
      artwork: (r.artworkUrl100 || '').replace('100x100', '400x400'),
      artworkSmall: r.artworkUrl100 || '',
      previewUrl: r.previewUrl,
      storeUrl: r.trackViewUrl,
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(`${r.trackName} ${r.artistName}`)}`,
    }))
  cache.set(key, tracks)
  return tracks
}

export const spotifyPlaylistSearchUrl = (query) =>
  `https://open.spotify.com/search/${encodeURIComponent(query)}/playlists`
