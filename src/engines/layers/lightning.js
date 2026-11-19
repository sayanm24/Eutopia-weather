// Irregular lightning: a forked bolt plus a brief, capped sky illumination.
// Strikes are spaced by a guaranteed minimum gap so the effect never strobes.
const MIN_GAP = 4.5 // seconds
const MAX_FLASH_ALPHA = 0.22

export class LightningLayer {
  constructor(onStrike) {
    this.onStrike = onStrike
    this.timer = 2.5 + Math.random() * 3
    this.intensity = 0
    this.pulses = []
    this.bolt = null
  }

  resize(w, h) {
    this.w = w
    this.h = h
  }

  buildBolt() {
    const main = []
    let x = this.w * (0.12 + Math.random() * 0.76)
    let y = -10
    const end = this.h * (0.42 + Math.random() * 0.3)
    main.push([x, y])
    while (y < end) {
      y += 16 + Math.random() * 26
      x += (Math.random() - 0.5) * 46
      main.push([x, y])
    }
    const branches = []
    const count = 1 + Math.floor(Math.random() * 3)
    for (let b = 0; b < count; b++) {
      const start = main[2 + Math.floor(Math.random() * Math.max(1, main.length - 4))]
      if (!start) continue
      const dir = Math.random() < 0.5 ? -1 : 1
      let [bx, by] = start
      const pts = [[bx, by]]
      const steps = 3 + Math.floor(Math.random() * 5)
      for (let i = 0; i < steps; i++) {
        bx += dir * (8 + Math.random() * 26)
        by += 10 + Math.random() * 22
        pts.push([bx, by])
      }
      branches.push(pts)
    }
    return { main, branches }
  }

  update(dt, p) {
    this.intensity *= Math.exp(-dt * 8)
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]
      pulse.at -= dt
      if (pulse.at <= 0) {
        this.intensity = Math.max(this.intensity, pulse.a)
        this.pulses.splice(i, 1)
      }
    }
    if (p.lightning < 0.05) return
    this.timer -= dt
    if (this.timer <= 0) {
      this.bolt = this.buildBolt()
      this.pulses.push({ at: 0, a: 1 })
      if (Math.random() < 0.6) this.pulses.push({ at: 0.11 + Math.random() * 0.08, a: 0.55 })
      this.timer = MIN_GAP + (Math.random() * 9) / Math.max(0.4, p.lightning)
      this.onStrike?.(0.4 + Math.random() * 2.4) // seconds until thunder is heard
    }
  }

  drawBolt(ctx) {
    if (this.intensity < 0.12 || !this.bolt) return
    const a = Math.min(1, this.intensity * 1.2)
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = 'rgba(150,170,255,0.9)'
    ctx.shadowBlur = 18
    ctx.strokeStyle = `rgba(232,238,255,${a})`
    ctx.lineWidth = 2.2
    ctx.beginPath()
    this.bolt.main.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
    ctx.lineWidth = 1.1
    ctx.beginPath()
    for (const br of this.bolt.branches) br.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
    ctx.restore()
  }

  drawFlash(ctx) {
    if (this.intensity < 0.01) return
    ctx.fillStyle = `rgba(190,205,255,${MAX_FLASH_ALPHA * Math.min(1, this.intensity)})`
    ctx.fillRect(0, 0, this.w, this.h)
  }
}
