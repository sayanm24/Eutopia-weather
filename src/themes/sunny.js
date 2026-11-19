// Scene values are 0..1 intensities consumed by the animation engine.
export const sunny = {
  id: 'sunny',
  label: 'Sunny',
  nightLabel: 'Clear night',
  sky: { day: ['#1560c0', '#3f97e8', '#a8d4f5'], night: ['#050a1e', '#0c1838', '#1b2a52'] },
  scene: { sun: 1, cloud: 0.2, shade: 0, motes: 1, rays: 1, sunColor: [255, 232, 170] },
  ui: { accent: '#ffc857', glass: '10, 32, 72', glassAlpha: 0.3 },
  music: {
    title: 'Sunlit & weightless',
    blurb: 'Bright skies call for bright rhythms — windows down, volume up.',
    genres: ['Indie pop', 'Feel-good', 'Energetic'],
    mixes: [
      { name: 'Blue Sky Indie', query: 'indie pop sunshine' },
      { name: 'Feel-Good Drive', query: 'feel good summer hits' },
      { name: 'Golden Energy', query: 'upbeat dance pop' },
    ],
  },
}

export const golden = {
  id: 'golden',
  label: 'Golden hour',
  sky: { day: ['#27336f', '#c9607c', '#ffb061'] },
  scene: { sun: 1, sunX: 0.72, sunY: 0.7, cloud: 0.34, shade: 0.3, motes: 0.7, rays: 0.55, sunColor: [255, 168, 92] },
  ui: { accent: '#ffb37a', glass: '46, 22, 58', glassAlpha: 0.32 },
  music: {
    title: 'Golden hour glow',
    blurb: 'The sky is putting on a show. Slow down and let it play out.',
    genres: ['Chillwave', 'Soul', 'Sunset acoustic'],
    mixes: [
      { name: 'Sunset Drive', query: 'sunset chill vibes' },
      { name: 'Amber Soul', query: 'neo soul mellow' },
      { name: 'First Light', query: 'morning acoustic calm' },
    ],
  },
}
