// Sky gradient, sun (glow + rays), moon, stars and floating light motes.
export const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`

export class SkyLayer {
  resize(w, h, low) {
    this.w = w
    this.h = h
    const starCount = low ? 60 : 140
    this.stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.75,
      r: Math.random() * 1.1 + 0.3, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.4,
    }))
    const moteCount = low ? 14 : 34
    this.motes = Array.from({ length: moteCount }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.2,
      v: 6 + Math.random() * 14, p: Math.random() * 6.28, s: 0.2 + Math.random() * 0.5, a: 0.3 + Math.random() * 0.7,
    }))
  }

  draw(ctx, p, t) {
    const { w, h } = this
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, rgba(p.skyTop))
    g.addColorStop(0.55, rgba(p.skyMid))
    g.addColorStop(1, rgba(p.skyBot))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    if (p.stars > 0.02) {
      ctx.fillStyle = '#fff'
      for (const s of this.stars) {
        const tw = Math.sin(t * s.s + s.p)
        ctx.globalAlpha = p.stars * (0.35 + 0.65 * tw * tw)
        ctx.fillRect(s.x, s.y, s.r * 1.6, s.r * 1.6)
      }
      ctx.globalAlpha = 1
    }

    const m = Math.min(w, h)
    const x = p.sunX * w
    const y = p.sunY * h

    if (p.sun > 0.01) {
      const pulse = 1 + 0.05 * Math.sin(t * 0.5)
      const R = m * 0.62 * pulse
      ctx.globalCompositeOperation = 'lighter'
      const glow = ctx.createRadialGradient(x, y, 0, x, y, R)
      glow.addColorStop(0, rgba(p.sunColor, 0.85 * p.sun))
      glow.addColorStop(0.14, rgba(p.sunColor, 0.4 * p.sun))
      glow.addColorStop(0.45, rgba(p.sunColor, 0.1 * p.sun))
      glow.addColorStop(1, rgba(p.sunColor, 0))
      ctx.fillStyle = glow
      ctx.fillRect(x - R, y - R, R * 2, R * 2)

      if (p.rays > 0.02) {
        const L = m * 1.25
        const rg = ctx.createRadialGradient(x, y, m * 0.05, x, y, L)
        rg.addColorStop(0, rgba(p.sunColor, 0.11 * p.rays * pulse))
        rg.addColorStop(1, rgba(p.sunColor, 0))
        ctx.fillStyle = rg
        ctx.beginPath()
        const n = 9
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + t * 0.025
          const half = 0.05 + 0.035 * Math.sin(i * 2.3 + t * 0.2)
          ctx.moveTo(x, y)
          ctx.lineTo(x + Math.cos(a - half) * L, y + Math.sin(a - half) * L)
          ctx.lineTo(x + Math.cos(a + half) * L, y + Math.sin(a + half) * L)
          ctx.closePath()
        }
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      const core = Math.max(0, (p.sun - 0.35) / 0.65)
      if (core > 0) {
        ctx.fillStyle = `rgba(255,250,232,${core})`
        ctx.beginPath()
        ctx.arc(x, y, m * 0.042, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (p.moon > 0.01) {
      const R = m * 0.26
      const glow = ctx.createRadialGradient(x, y, 0, x, y, R)
      glow.addColorStop(0, `rgba(200,215,255,${0.3 * p.moon})`)
      glow.addColorStop(1, 'rgba(200,215,255,0)')
      ctx.fillStyle = glow
      ctx.fillRect(x - R, y - R, R * 2, R * 2)
      ctx.fillStyle = `rgba(236,240,252,${p.moon})`
      ctx.beginPath()
      ctx.arc(x, y, m * 0.032, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  drawMotes(ctx, p, t) {
    if (p.motes < 0.02) return
    const { w, h } = this
    ctx.globalCompositeOperation = 'lighter'
    for (const mo of this.motes) {
      const x = (mo.x + Math.sin(t * mo.s + mo.p) * 26 + w) % w
      const y = (((mo.y - t * mo.v) % h) + h) % h
      const a = p.motes * mo.a * (0.5 + 0.5 * Math.sin(t * mo.s * 2 + mo.p))
      ctx.fillStyle = rgba(p.sunColor, 0.1 * a)
      ctx.beginPath()
      ctx.arc(x, y, mo.r * 3.2, 0, 6.283)
      ctx.fill()
      ctx.fillStyle = `rgba(255,250,235,${0.5 * a})`
      ctx.beginPath()
      ctx.arc(x, y, mo.r, 0, 6.283)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }
}
