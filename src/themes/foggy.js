export const foggy = {
  id: 'fog',
  label: 'Fog',
  sky: { day: ['#66788a', '#8d9ca9', '#b4bec6'], night: ['#0d1218', '#1c242c', '#2c363f'] },
  scene: { sun: 0.14, cloud: 0.5, shade: 0.3, fog: 1 },
  ui: { accent: '#cfd9e2', glass: '22, 30, 38', glassAlpha: 0.36 },
  music: {
    title: 'Lost in the mist',
    blurb: 'The world has gone quiet and close. Drifting, dreamy instrumentals.',
    genres: ['Ambient', 'Instrumental', 'Dreamy'],
    mixes: [
      { name: 'Mist', query: 'ambient instrumental' },
      { name: 'Dreamstate', query: 'dreamy ethereal' },
      { name: 'Slow Horizon', query: 'post rock instrumental' },
    ],
  },
}
