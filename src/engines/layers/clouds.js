// Layered parallax clouds drawn from pre-rendered soft sprites (cheap drawImage calls).
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeSprite(seed, tint) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const x = c.getContext('2d')
  const rand = mulberry32(seed)
  const puffs = 16 + Math.floor(rand() * 8)
  for (let i = 0; i < puffs; i++) {
    const px = 90 + rand() * 332
    const edge = 1 - Math.abs(px - 256) / 256
    const py = 168 - rand() * 80 * edge
    const r = 34 + rand() * 58 * (0.5 + edge * 0.5)
    const g = x.createRadialGradient(px, py, 0, px, py, r)
    g.addColorStop(0, `rgba(${tint},0.55)`)
    g.addColorStop(0.55, `rgba(${tint},0.24)`)
    g.addColorStop(1, `rgba(${tint},0)`)
    x.fillStyle = g
    x.beginPath()
    x.arc(px, py, r, 0, 6.283)
    x.fill()
  }
  return c
}

const SPRITE_SEEDS = [11, 29, 47, 83, 131]
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export class CloudLayer {
  constructor() {
    this.light = SPRITE_SEEDS.map((s) => makeSprite(s, '255,255,255'))
    this.dark = SPRITE_SEEDS.map((s) => makeSprite(s, '38,44,58'))
    this.clouds = []
  }

  resize(w, h, low) {
    this.w = w
    this.h = h
    const count = low ? 10 : 20
    const order = Array.from({ length: count }, (_, i) => i).sort(() => Math.random() - 0.5)
    this.clouds = order.map((rank, i) => {
      const layer = i % 3 // 0 far, 1 mid, 2 near
      const cw = Math.max(340, w * (0.34 + 0.2 * layer)) * (0.8 + Math.random() * 0.5)
      return {
        layer,
        cw,
        ch: cw / 2,
        x: Math.random() * (w + cw) - cw,
        y: h * (0.0 + Math.random() * 0.5) - cw * 0.14,
        sprite: i % SPRITE_SEEDS.length,
        threshold: 0.06 + (rank / count) * 0.88, // appears as cover passes this value
        speed: (5 + 9 * layer) * (0.8 + Math.random() * 0.4) * Math.max(0.6, w / 1400),
        opacity: [0.55, 0.78, 0.96][layer],
      }
    })
  }

  update(dt, p) {
    const k = 1 + p.wind * 3.2
    for (const c of this.clouds) {
      c.x += c.speed * k * dt
      if (c.x > this.w + 20) c.x = -c.cw - Math.random() * 80
    }
  }

  // pass 0 draws far + mid layers, pass 1 draws the near layer (lightning sits between).
  draw(ctx, p, t, pass) {
    const cover = p.cloud + 0.05 * Math.sin(t * 0.07) // slowly breathing density
    for (const c of this.clouds) {
      if ((pass === 0) === (c.layer === 2)) continue
      const a = smooth(c.threshold - 0.08, c.threshold + 0.08, cover) * c.opacity
      if (a < 0.01) continue
      if (p.shade < 0.98) {
        ctx.globalAlpha = a * (1 - p.shade)
        ctx.drawImage(this.light[c.sprite], c.x, c.y, c.cw, c.ch)
      }
      if (p.shade > 0.02) {
        ctx.globalAlpha = a * p.shade
        ctx.drawImage(this.dark[c.sprite], c.x, c.y, c.cw, c.ch)
      }
    }
    ctx.globalAlpha = 1
  }
}
