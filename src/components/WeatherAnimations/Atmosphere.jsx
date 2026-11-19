import { useEffect, useRef } from 'react'
import { AtmosphereEngine } from '../../engines/animationEngine.js'
import { playThunder } from '../../audio/thunder.js'
import { useSettings } from '../../hooks/useSettings.jsx'

/** Full-screen living sky. Receives scene parameters and eases toward them. */
export default function Atmosphere({ scene }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const { settings, lowPower, reducedMotion } = useSettings()
  const soundRef = useRef(settings)
  soundRef.current = settings

  useEffect(() => {
    const engine = new AtmosphereEngine(canvasRef.current, {
      lowPower,
      reducedMotion,
      onStrike: (delay) => {
        const s = soundRef.current
        if (s.thunderSound) playThunder(s.thunderVolume, delay)
      },
    })
    engineRef.current = engine
    engine.setTarget(scene)
    engine.start()
    return () => engine.destroy()
    // engine is created once; later changes flow through the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { engineRef.current?.setTarget(scene) }, [scene])
  useEffect(() => { engineRef.current?.setOptions({ lowPower, reducedMotion }) }, [lowPower, reducedMotion])

  return (
    <div className="atmosphere" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="atmosphere-scrim" />
    </div>
  )
}
