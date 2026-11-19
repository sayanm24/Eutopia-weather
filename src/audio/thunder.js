// Synthesised thunder (Web Audio, no asset files): filtered noise with a long rumble tail.
let ctx = null
let noise = null

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const len = ctx.sampleRate * 4
    noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = noise.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      // brown-ish noise for a deep rumble
      last = (last + 0.03 * (Math.random() * 2 - 1)) / 1.03
      data[i] = last * 3.2
    }
  }
  return ctx
}

/** Must be called from a user gesture (e.g. toggling the setting) to unlock audio. */
export function unlockThunder() {
  const c = ensure()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

export function playThunder(volume = 0.5, delay = 0) {
  const c = ensure()
  if (!c || c.state !== 'running' || volume <= 0) return
  const t0 = c.currentTime + delay
  const src = c.createBufferSource()
  src.buffer = noise
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(700, t0)
  filter.frequency.exponentialRampToValueAtTime(70, t0 + 3)
  const gain = c.createGain()
  const peak = Math.min(1, volume) * 0.9
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.06)
  gain.gain.exponentialRampToValueAtTime(peak * 0.35, t0 + 0.7)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.4)
  src.connect(filter).connect(gain).connect(c.destination)
  src.start(t0)
  src.stop(t0 + 3.6)
}
