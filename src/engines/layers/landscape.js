// Distant layered hills that pick up the sky colour (atmospheric perspective),
// turn white under snow, and sit behind the fog bands.
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
const DARK = [10, 15, 26]
const SNOW = [232, 240, 249]

export class LandscapeLayer {
  resize(w, h) {
    this.w = w
    this.h = h
    const defs = [
      { base: 0.86, amp: 0.05, f: 2.1, depth: 0.32 },
      { base: 0.905, amp: 0.04, f: 3.4, depth: 0.52 },
      { base: 0.955, amp: 0.028, f: 5.2, depth: 0.76 },
    ]
    this.hills = defs.map((d, i) => {
      const pts = []
      const ph1 = i * 1.7 + 0.4
      const ph2 = i * 2.9 + 1.1
      for (let x = 0; x <= w + 24; x += 24) {
        const u = (x / Math.max(w, 900)) * Math.PI * 2
        const y = h * (d.base - d.amp * (0.6 * Math.sin(u * d.f * 0.5 + ph1) + 0.4 * Math.sin(u * d.f * 1.3 + ph2)))
        pts.push([x, y])
      }
      return { pts, depth: d.depth }
    })
  }

  draw(ctx, p) {
    const snowK = p.snowGround * (1 - 0.45 * p.night)
    for (const hill of this.hills) {
      let c = mix(p.skyBot, DARK, hill.depth)
      if (snowK > 0.01) c = mix(c, SNOW, snowK * (0.55 + hill.depth * 0.35))
      ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
      ctx.beginPath()
      ctx.moveTo(0, this.h)
      for (const [x, y] of hill.pts) ctx.lineTo(x, y)
      ctx.lineTo(this.w, this.h)
      ctx.closePath()
      ctx.fill()
    }
  }
}
