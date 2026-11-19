const stormMusic = {
  title: 'Cinematic storm',
  blurb: 'Thunder is the percussion. Dark, widescreen sound to match.',
  genres: ['Cinematic ambient', 'Dark atmospheric', 'Score'],
  mixes: [
    { name: 'Storm Front', query: 'cinematic ambient' },
    { name: 'Dark Skies', query: 'dark ambient atmospheric' },
    { name: 'Epic Score', query: 'epic film score orchestral' },
  ],
}

export const thunderRain = {
  id: 'thunder-rain',
  label: 'Thunderstorm with rain',
  sky: { day: ['#070b18', '#111a30', '#1f2c48'] },
  scene: { cloud: 1, shade: 1, rain: 0.9, wet: 1, lightning: 1, wind: 0.8, fog: 0.12 },
  ui: { accent: '#9aa8ff', glass: '4, 8, 22', glassAlpha: 0.42 },
  music: stormMusic,
}

export const thunderDry = {
  id: 'thunder-dry',
  label: 'Thunderstorm (dry)',
  sky: { day: ['#0d101c', '#1c2233', '#343a4c'] },
  scene: { cloud: 0.96, shade: 0.95, rain: 0, wet: 0, lightning: 0.8, wind: 0.5 },
  ui: { accent: '#c3b6ff', glass: '8, 10, 22', glassAlpha: 0.4 },
  music: stormMusic,
}
