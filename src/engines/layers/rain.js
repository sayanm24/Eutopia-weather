// Rain streaks, ground ripples and droplets clinging to the "glass".
export class RainLayer {
  resize(w, h, low) {
    this.w = w
    this.h = h
    const area = Math.min(1.6, (w * h) / (1440 * 900))
    this.max = Math.round((low ? 240 : 640) * Math.max(0.45, area))
    this.drops = Array.from({ length: this.max }, () => this.spawn({}, true))
    this.ripples = []
    this.rippleCap = low ? 16 : 40
    const glassCount = low ? 7 : 14
    this.glass = Array.from({ length: glassCount }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: 3 + Math.random() * 6, vy: 0, wait: Math.random() * 8,
    }))
  }

  spawn(d, initial) {
    d.x = Math.random() * (this.w + 300) - 150
    d.y = initial ? Math.random() * this.h : -30 - Math.random() * 80
    d.z = Math.random()
    d.ground = this.h * (0.9 + Math.random() * 0.1)
    return d
  }

  update(dt, p) {
    if (p.rain > 0.01) {
      const n = Math.min(this.max, Math.floor(this.max * p.rain * 1.05))
      const speed = 520 + 800 * p.rain
      const slant = 0.06 + 0.26 * p.wind
      for (let i = 0; i < n; i++) {
        const d = this.drops[i]
        const v = speed * (0.6 + d.z * 0.6)
        d.y += v * dt
        d.x += v * slant * dt
        if (d.y > d.ground) {
          if (d.z > 0.5 && this.ripples.length < this.rippleCap && Math.random() < 0.4) {
            this.ripples.push({ x: d.x, y: d.ground, age: 0, life: 0.5 + Math.random() * 0.4 })
          }
          this.spawn(d, false)
        }
      }
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i]
      r.age += dt
      if (r.age > r.life) this.ripples.splice(i, 1)
    }
    if (p.wet > 0.05) {
      for (const g of this.glass) {
        if (g.vy > 0) {
          g.y += g.vy * dt
          g.vy *= 1 - dt * 0.6
          if (g.vy < 6) { g.vy = 0; g.wait = 3 + Math.random() * 9 }
          if (g.y > this.h + 12) { g.y = -10; g.x = Math.random() * this.w }
        } else {
          g.wait -= dt
          if (g.wait <= 0) g.vy = 40 + Math.random() * 120
        }
      }
    }
  }

  draw(ctx, p) {
    if (p.wet > 0.05) {
      // wet ground sheen
      const g = ctx.createLinearGradient(0, this.h * 0.88, 0, this.h)
      g.addColorStop(0, 'rgba(170,200,240,0)')
      g.addColorStop(1, `rgba(170,200,240,${0.14 * p.wet})`)
      ctx.fillStyle = g
      ctx.fillRect(0, this.h * 0.88, this.w, this.h * 0.12)
    }
    if (p.rain > 0.01) {
      const n = Math.min(this.max, Math.floor(this.max * p.rain * 1.05))
      const slant = 0.06 + 0.26 * p.wind
      const len = 9 + 26 * p.rain
      ctx.lineCap = 'round'
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const d = this.drops[i]
          if ((d.z > 0.5) !== (pass === 1)) continue
          const l = len * (0.55 + d.z * 0.8)
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - l * slant, d.y - l)
        }
        ctx.strokeStyle = pass ? 'rgba(205,225,255,0.46)' : 'rgba(190,212,245,0.22)'
        ctx.lineWidth = pass ? 1.3 : 0.8
        ctx.stroke()
      }
    }
    if (this.ripples.length) {
      ctx.lineWidth = 1
      for (const r of this.ripples) {
        const k = r.age / r.life
        ctx.strokeStyle = `rgba(215,232,255,${0.42 * (1 - k)})`
        ctx.beginPath()
        ctx.ellipse(r.x, r.y, 3 + k * 26, 1 + k * 7, 0, 0, 6.283)
        ctx.stroke()
      }
    }
  }

  drawGlass(ctx, p) {
    if (p.wet < 0.05) return
    const a = p.wet
    for (const g of this.glass) {
      ctx.fillStyle = `rgba(255,255,255,${0.07 * a})`
      ctx.beginPath()
      ctx.ellipse(g.x, g.y, g.r * 0.86, g.r, 0, 0, 6.283)
      ctx.fill()
      ctx.strokeStyle = `rgba(255,255,255,${0.16 * a})`
      ctx.lineWidth = 0.8
      ctx.stroke()
      ctx.fillStyle = `rgba(255,255,255,${0.4 * a})`
      ctx.beginPath()
      ctx.arc(g.x - g.r * 0.28, g.y - g.r * 0.34, g.r * 0.2, 0, 6.283)
      ctx.fill()
    }
  }
}
