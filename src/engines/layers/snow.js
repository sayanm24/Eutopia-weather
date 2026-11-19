// Snowflakes of varying size with gentle sway.
export class SnowLayer {
  resize(w, h, low) {
    this.w = w
    this.h = h
    const area = Math.min(1.5, (w * h) / (1440 * 900))
    this.max = Math.round((low ? 110 : 260) * Math.max(0.5, area))
    this.flakes = Array.from({ length: this.max }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      z: Math.random(), p: Math.random() * 6.28, s: 0.5 + Math.random() * 1.2,
    }))
  }

  update(dt, p, t) {
    if (p.snow < 0.01) return
    const n = Math.floor(this.max * Math.min(1, p.snow))
    for (let i = 0; i < n; i++) {
      const f = this.flakes[i]
      f.y += (26 + f.z * 62) * dt
      f.x += (Math.sin(t * f.s + f.p) * (10 + f.z * 16) + p.wind * 60) * dt
      if (f.y > this.h + 6) { f.y = -6; f.x = Math.random() * this.w }
      if (f.x > this.w + 6) f.x = -6
      else if (f.x < -6) f.x = this.w + 6
    }
  }

  draw(ctx, p) {
    if (p.snow < 0.01) return
    const n = Math.floor(this.max * Math.min(1, p.snow))
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const f = this.flakes[i]
        if ((f.z > 0.55) !== (pass === 1)) continue
        const r = 0.8 + f.z * 2.8
        ctx.moveTo(f.x + r, f.y)
        ctx.arc(f.x, f.y, r, 0, 6.283)
      }
      ctx.fillStyle = pass ? 'rgba(255,255,255,0.9)' : 'rgba(240,246,255,0.55)'
      ctx.fill()
    }
  }
}
