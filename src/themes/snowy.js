export const snowy = {
  id: 'snow',
  label: 'Snowfall',
  sky: { day: ['#4f6b8a', '#8199b3', '#bccbd9'], night: ['#0a1322', '#18263c', '#2c3d57'] },
  scene: { sun: 0.1, cloud: 0.8, shade: 0.2, snow: 1, snowGround: 1, fog: 0.12, wind: 0.15 },
  ui: { accent: '#d6ecff', glass: '18, 36, 62', glassAlpha: 0.3 },
  music: {
    title: 'First snow',
    blurb: 'Everything is hushed. Piano keys falling as softly as the flakes.',
    genres: ['Piano', 'Classical', 'Relaxing'],
    mixes: [
      { name: 'Snowfall Piano', query: 'peaceful piano' },
      { name: 'Winter Classical', query: 'classical relaxing' },
      { name: 'Quiet Hours', query: 'neoclassical calm' },
    ],
  },
}
