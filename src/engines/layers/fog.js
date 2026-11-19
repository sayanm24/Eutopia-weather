// Multiple drifting mist bands with parallax, plus a low-visibility veil.
function makeFogSprite() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 320
  const x = c.getContext('2d')
  for (let i = 0; i < 30; i++) {
    const px = Math.random() * 1024
    const py = 80 + Math.random() * 160
    const r = 90 + Math.random() * 130
    // draw each blob twice (wrapped) so the sprite tiles seamlessly
    for (const ox of [0, -1024, 1024]) {
      const g = x.createRadialGradient(px + ox, py, 0, px + ox, py, r)
      g.addColorStop(0, 'rgba(226,232,238,0.17)')
      g.addColorStop(1, 'rgba(226,232,238,0)')
      x.fillStyle = g
      x.fillRect(px + ox - r, py - r, r * 2, r * 2)
    }
  }
  return c
}

export class FogLayer {
  constructor() {
    this.sprite = makeFogSprite()
    this.bands = [
      { y: 0.18, speed: 7, scale: 1.5, a: 0.55 },
      { y: 0.42, speed: -11, scale: 1.9, a: 0.75 },
      { y: 0.64, speed: 16, scale: 2.4, a: 1 },
    ]
  }

  resize(w, h) {
    this.w = w
    this.h = h
  }

  draw(ctx, p, t) {
    if (p.fog < 0.01) return
    const dim = 1 - 0.55 * p.night
    ctx.fillStyle = `rgba(205,214,222,${0.3 * p.fog * dim})`
    ctx.fillRect(0, 0, this.w, this.h)
    for (const b of this.bands) {
      const sw = Math.max(this.w * 0.9, 1024 * b.scale * 0.6)
      const sh = this.h * 0.5 * (b.scale / 1.6)
      let off = ((t * b.speed) % sw + sw) % sw
      ctx.globalAlpha = Math.min(1, p.fog * b.a * dim)
      for (let x = -off; x < this.w; x += sw) {
        ctx.drawImage(this.sprite, x, b.y * this.h - sh * 0.3, sw, sh)
      }
    }
    ctx.globalAlpha = 1
  }
}
