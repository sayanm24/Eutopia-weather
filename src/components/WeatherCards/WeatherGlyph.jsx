import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy, CloudDrizzle, CloudRain,
  CloudLightning, Zap, CloudFog, CloudSnow, Sunset,
} from 'lucide-react'

const ICONS = {
  sunny: [Sun, Moon],
  'partly-cloudy': [CloudSun, CloudMoon],
  cloudy: [Cloud, Cloud],
  overcast: [Cloudy, Cloudy],
  'light-rain': [CloudDrizzle, CloudDrizzle],
  'heavy-rain': [CloudRain, CloudRain],
  'thunder-rain': [CloudLightning, CloudLightning],
  'thunder-dry': [Zap, Zap],
  fog: [CloudFog, CloudFog],
  snow: [CloudSnow, CloudSnow],
  golden: [Sunset, Sunset],
}

/** Small line icon for an environment id. */
export default function WeatherGlyph({ env, isNight = false, size = 22, label }) {
  const Icon = (ICONS[env] || ICONS.cloudy)[isNight ? 1 : 0]
  return <Icon size={size} strokeWidth={1.5} aria-label={label} role={label ? 'img' : undefined} aria-hidden={label ? undefined : true} />
}
