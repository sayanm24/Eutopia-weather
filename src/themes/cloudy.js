const cloudMusic = {
  title: 'Soft grey daydream',
  blurb: 'Diffused light, unhurried thoughts. Music with its head in the clouds.',
  genres: ['Indie', 'Dream pop', 'Chill'],
  mixes: [
    { name: 'Cloud Drift', query: 'dream pop' },
    { name: 'Indie Overcast', query: 'indie chill mellow' },
    { name: 'Slow Afternoon', query: 'chill electronic downtempo' },
  ],
}

export const partlyCloudy = {
  id: 'partly-cloudy',
  label: 'Partly cloudy',
  sky: { day: ['#2a6fc4', '#63a6e6', '#c4dcf2'], night: ['#070d22', '#111e40', '#22315a'] },
  scene: { sun: 0.75, cloud: 0.46, shade: 0.08, motes: 0.4, rays: 0.4 },
  ui: { accent: '#9fd0ff', glass: '12, 34, 70', glassAlpha: 0.3 },
  music: {
    title: 'Sun between the clouds',
    blurb: 'A little light, a little shade — easygoing songs for an in-between sky.',
    genres: ['Indie folk', 'Soft pop', 'Chill'],
    mixes: [
      { name: 'Light & Shade', query: 'indie folk feel good' },
      { name: 'Easy Breeze', query: 'soft pop acoustic' },
      { name: 'Cloud Drift', query: 'dream pop' },
    ],
  },
}

export const cloudy = {
  id: 'cloudy',
  label: 'Cloudy',
  sky: { day: ['#4f6d8f', '#7f9bb6', '#b9c7d4'], night: ['#0a0f1c', '#1a2333', '#2a3446'] },
  scene: { sun: 0.25, cloud: 0.74, shade: 0.32, motes: 0, rays: 0 },
  ui: { accent: '#b8cde0', glass: '18, 30, 48', glassAlpha: 0.32 },
  music: cloudMusic,
}

export const overcast = {
  id: 'overcast',
  label: 'Overcast',
  sky: { day: ['#3b4756', '#586574', '#7d8792'], night: ['#080b12', '#141a24', '#222a35'] },
  scene: { sun: 0.04, cloud: 1, shade: 0.62, fog: 0.2 },
  ui: { accent: '#aab7c4', glass: '14, 20, 30', glassAlpha: 0.36 },
  music: {
    title: 'Low sky, slow tempo',
    blurb: 'A heavy lid of cloud. Moody, muted and a little introspective.',
    genres: ['Shoegaze', 'Dream pop', 'Slowcore'],
    mixes: [
      { name: 'Grey Matter', query: 'shoegaze' },
      { name: 'Muted Tones', query: 'melancholy indie' },
      { name: 'Cloud Drift', query: 'dream pop' },
    ],
  },
}
