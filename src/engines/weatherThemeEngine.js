// Turns an environment id (+ day/night) into (a) scene parameters for the canvas
// animation engine and (b) a UI palette applied through CSS variables.
import { sunny, golden } from '../themes/sunny.js'
import { partlyCloudy, cloudy, overcast } from '../themes/cloudy.js'
import { lightRain, heavyRain } from '../themes/rainy.js'
import { thunderRain, thunderDry } from '../themes/thunderstorm.js'
import { foggy } from '../themes/foggy.js'
import { snowy } from '../themes/snowy.js'

// Neutral scene shown before any weather is known. Not a weather claim.
const idle = {
  id: 'idle',
  label: '',
  sky: { day: ['#070b1c', '#141c3c', '#2a3158'] },
  scene: { cloud: 0.25, shade: 0.85, stars: 0.8, night: 1 },
  ui: { accent: '#a9b8ff', glass: '10, 14, 34', glassAlpha: 0.34 },
  music: cloudy.music,
}

export const THEMES = {
  idle,
  sunny,
  golden,
  'partly-cloudy': partlyCloudy,
  cloudy,
  overcast,
  'light-rain': lightRain,
  'heavy-rain': heavyRain,
  'thunder-rain': thunderRain,
  'thunder-dry': thunderDry,
  fog: foggy,
  snow: snowy,
}

// Order used by the simulation picker.
export const ENVIRONMENTS = [
  'sunny', 'partly-cloudy', 'cloudy', 'overcast', 'light-rain', 'heavy-rain',
  'thunder-rain', 'thunder-dry', 'fog', 'snow', 'golden',
]

const BASE_SCENE = {
  sun: 0, sunX: 0.8, sunY: 0.2, sunColor: [255, 238, 200],
  moon: 0, stars: 0, cloud: 0, shade: 0, rain: 0, snow: 0, fog: 0,
  lightning: 0, motes: 0, rays: 0, wet: 0, wind: 0.1, snowGround: 0, night: 0,
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

export function resolveTheme(envId, isNight = false) {
  const theme = THEMES[envId] || THEMES.idle
  const night = isNight && envId !== 'golden'
  const scene = { ...BASE_SCENE, ...theme.scene }
  const sky = (night && theme.sky.night) || theme.sky.day

  if (night) {
    scene.moon = Math.max(0, 1 - scene.cloud * 1.05)
    scene.stars = Math.max(0, 1 - scene.cloud * 1.2)
    scene.sun = 0
    scene.rays = 0
    scene.motes = 0
    scene.shade = Math.max(scene.shade, 0.84)
    scene.night = 1
  }
  scene.skyTop = hex(sky[0])
  scene.skyMid = hex(sky[1])
  scene.skyBot = hex(sky[2])

  return {
    id: theme.id,
    label: night && theme.nightLabel ? theme.nightLabel : theme.label,
    scene,
    ui: theme.ui,
    music: theme.music,
    skyCss: sky,
  }
}

export function applyPalette(resolved) {
  const s = document.documentElement.style
  s.setProperty('--accent', resolved.ui.accent)
  s.setProperty('--glass-rgb', resolved.ui.glass)
  s.setProperty('--glass-alpha', String(resolved.ui.glassAlpha))
  s.setProperty('--sky-top', resolved.skyCss[0])
  s.setProperty('--sky-bottom', resolved.skyCss[2])
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved.skyCss[0])
}
