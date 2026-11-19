export const lightRain = {
  id: 'light-rain',
  label: 'Light rain',
  sky: { day: ['#3a5068', '#587189', '#8196a8'], night: ['#070c16', '#111b2a', '#1e2b3d'] },
  scene: { cloud: 0.86, shade: 0.5, rain: 0.34, wet: 0.6, fog: 0.08, wind: 0.2 },
  ui: { accent: '#8fc1e8', glass: '12, 26, 44', glassAlpha: 0.34 },
  music: {
    title: 'Rain on the window',
    blurb: 'Gentle rain is the original lo-fi. Settle in.',
    genres: ['Lo-fi', 'Acoustic', 'Relaxing'],
    mixes: [
      { name: 'Lo-fi Drizzle', query: 'lofi chill beats' },
      { name: 'Acoustic Rain', query: 'acoustic rainy day' },
      { name: 'Window Seat', query: 'relaxing jazz piano' },
    ],
  },
}

export const heavyRain = {
  id: 'heavy-rain',
  label: 'Heavy rain',
  sky: { day: ['#16263c', '#263c58', '#3c5572'], night: ['#04070f', '#0a1422', '#132238'] },
  scene: { cloud: 1, shade: 0.82, rain: 1, wet: 1, fog: 0.16, wind: 0.6 },
  ui: { accent: '#6fb1f0', glass: '6, 16, 32', glassAlpha: 0.4 },
  music: {
    title: 'Downpour',
    blurb: 'The sky has opened. Deep, enveloping sound for staying in.',
    genres: ['Lo-fi', 'Trip-hop', 'Deep relaxing'],
    mixes: [
      { name: 'Heavy Weather', query: 'trip hop downtempo' },
      { name: 'Lo-fi Downpour', query: 'lofi rain sleep' },
      { name: 'Unplugged Indoors', query: 'acoustic mellow' },
    ],
  },
}
