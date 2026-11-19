// Canvas animation engine. One canvas, composed from reusable layers.
// Scene parameters are eased toward their targets every frame, so switching
// environment (e.g. cloudy → heavy rain) darkens the sky, thickens clouds and
// ramps particles in gradually rather than cutting.
import { SkyLayer } from './layers/sky.js'
import { CloudLayer } from './layers/clouds.js'
import { RainLayer } from './layers/rain.js'
import { SnowLayer } from './layers/snow.js'
import { FogLayer } from './layers/fog.js'
import { LightningLayer } from './layers/lightning.js'
import { LandscapeLayer } from './layers/landscape.js'

const NUMERIC = ['sun', 'sunX', 'sunY', 'moon', 'stars', 'cloud', 'shade', 'rain', 'snow', 'fog',
  'lightning', 'motes', 'rays', 'wet', 'wind', 'snowGround', 'night']
const COLORS = ['skyTop', 'skyMid', 'skyBot', 'sunColor']
const TRANSITION_TAU = 1.5 // seconds; ~95% of a transition completes in 3τ

export class AtmosphereEngine {
  constructor(canvas, { lowPower = false, reducedMotion = false, onStrike } = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.lowPower = lowPower
    this.reducedMotion = reducedMotion
    this.cur = null
    this.target = null
    this.t = 0
    this.last = 0
    this.raf = 0
    this.timeout = 0
    this.running = false

    this.sky = new SkyLayer()
    this.clouds = new CloudLayer()
    this.rain = new RainLayer()
    this.snow = new SnowLayer()
    this.fog = new FogLayer()
    this.landscape = new LandscapeLayer()
    this.lightning = new LightningLayer((delay) => onStrike?.(delay))

    this.frame = this.frame.bind(this)
    this.onVisibility = () => (document.hidden ? this.stop() : this.start())
    this.onResize = () => this.resize()
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('resize', this.onResize)
    this.resize()
  }

  setOptions({ lowPower, reducedMotion }) {
    const changed = lowPower !== this.lowPower
    this.lowPower = lowPower
    this.reducedMotion = reducedMotion
    if (changed) this.resize()
  }

  setTarget(scene) {
    this.target = scene
    if (!this.cur) {
      this.cur = {}
      for (const k of NUMERIC) this.cur[k] = scene[k]
      for (const k of COLORS) this.cur[k] = [...scene[k]]
    }
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, this.lowPower ? 1 : 1.5)
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.w = w
    this.h = h
    for (const layer of [this.sky, this.clouds, this.rain, this.snow, this.fog, this.landscape, this.lightning]) {
      layer.resize(w, h, this.lowPower)
    }
    if (this.cur) this.render()
  }

  start() {
    if (this.running || document.hidden) return
    this.running = true
    this.last = performance.now()
    this.schedule()
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
    clearTimeout(this.timeout)
  }

  schedule() {
    if (!this.running) return
    if (this.reducedMotion) {
      // Reduced motion: no drifting or particles in motion, just slow palette easing.
      this.timeout = setTimeout(() => { this.raf = requestAnimationFrame(this.frame) }, 200)
    } else {
      this.raf = requestAnimationFrame(this.frame)
    }
  }

  frame(now) {
    if (!this.running) return
    const elapsed = now - this.last
    if (this.lowPower && !this.reducedMotion && elapsed < 30) { this.schedule(); return } // ~30fps cap
    this.last = now
    const dt = Math.min(0.25, elapsed / 1000)

    if (this.cur && this.target) {
      const k = 1 - Math.exp(-dt / TRANSITION_TAU)
      for (const key of NUMERIC) this.cur[key] += (this.target[key] - this.cur[key]) * k
      for (const key of COLORS) {
        const c = this.cur[key]
        const tg = this.target[key]
        for (let i = 0; i < 3; i++) c[i] += (tg[i] - c[i]) * k
      }
      if (!this.reducedMotion) {
        const mdt = Math.min(0.05, dt)
        this.t += mdt
        this.clouds.update(mdt, this.cur)
        this.rain.update(mdt, this.cur)
        this.snow.update(mdt, this.cur, this.t)
        this.lightning.update(mdt, this.cur)
      }
      this.render()
    }
    this.schedule()
  }

  render() {
    const { ctx, cur: p, t } = this
    this.sky.draw(ctx, p, t)
    this.clouds.draw(ctx, p, t, 0)
    this.lightning.drawBolt(ctx)
    this.clouds.draw(ctx, p, t, 1)
    this.landscape.draw(ctx, p)
    this.fog.draw(ctx, p, t)
    this.rain.draw(ctx, p)
    this.snow.draw(ctx, p)
    this.sky.drawMotes(ctx, p, t)
    this.lightning.drawFlash(ctx)
    this.rain.drawGlass(ctx, p)
  }

  destroy() {
    this.stop()
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('resize', this.onResize)
  }
}
