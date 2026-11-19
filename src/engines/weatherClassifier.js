// Weather classification engine.
// Maps provider condition codes (OpenWeather ids or WMO codes from Open-Meteo)
// onto one of EUTOPIA's environments. Only real API fields are used.

const GOLDEN_WINDOW = 35 * 60 // seconds either side of sunrise / sunset

const WMO_TEXT = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Heavy freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Violent showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
}

function fromOpenWeather(code, { precip = 0, snow = 0 }) {
  if (code >= 200 && code < 300) {
    // 200–202 & 230–232 are "thunderstorm with rain/drizzle"; 210–221 are bare thunderstorms.
    const withRain = code <= 202 || code >= 230 || precip > 0
    return withRain ? 'thunder-rain' : 'thunder-dry'
  }
  if (code >= 300 && code < 400) return 'light-rain'
  if (code >= 500 && code < 600) {
    if ([502, 503, 504, 522, 531].includes(code) || precip >= 4) return 'heavy-rain'
    return 'light-rain'
  }
  if (code >= 600 && code < 700) return 'snow'
  if (code >= 700 && code < 800) return code === 771 || code === 781 ? 'overcast' : 'fog'
  if (code === 800) return 'sunny'
  if (code === 801 || code === 802) return 'partly-cloudy'
  if (code === 803) return 'cloudy'
  if (code === 804) return 'overcast'
  return snow > 0 ? 'snow' : 'cloudy'
}

function fromWmo(code, { precip = 0, cloudPct = null }) {
  if (code === 0 || code === 1) return 'sunny'
  if (code === 2) return 'partly-cloudy'
  if (code === 3) return cloudPct != null && cloudPct < 85 ? 'cloudy' : 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'light-rain'
  if (code === 65 || code === 67 || code === 82) return 'heavy-rain'
  if ((code >= 61 && code <= 66) || code === 80 || code === 81) return precip >= 4 ? 'heavy-rain' : 'light-rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  // WMO 95 does not itself say whether rain is falling – require measured precipitation.
  if (code === 95) return precip > 0 ? 'thunder-rain' : 'thunder-dry'
  if (code === 96 || code === 99) return 'thunder-rain'
  return 'cloudy'
}

// WeatherAPI.com condition codes (https://www.weatherapi.com/docs/weather_conditions.json)
const WA_HEAVY_RAIN = [1192, 1195, 1201, 1243, 1246]
const WA_LIGHT_RAIN = [1063, 1072, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1198, 1240]
const WA_SNOW = [1066, 1069, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264]

function fromWeatherApi(code, { precip = 0 }) {
  if (code === 1000) return 'sunny'
  if (code === 1003) return 'partly-cloudy'
  if (code === 1006) return 'cloudy'
  if (code === 1009) return 'overcast'
  if (code === 1030 || code === 1135 || code === 1147) return 'fog'
  // 1087 is "thundery outbreaks possible" – only a rain storm if precipitation is measured.
  if (code === 1087) return precip > 0 ? 'thunder-rain' : 'thunder-dry'
  if ([1273, 1276, 1279, 1282].includes(code)) return 'thunder-rain'
  if (WA_HEAVY_RAIN.includes(code)) return 'heavy-rain'
  if (WA_LIGHT_RAIN.includes(code)) return precip >= 4 ? 'heavy-rain' : 'light-rain'
  if (WA_SNOW.includes(code)) return 'snow'
  return 'cloudy'
}

export function baseEnvironment(cond, extra = {}) {
  if (!cond) return 'cloudy'
  if (cond.provider === 'ow') return fromOpenWeather(cond.code, extra)
  if (cond.provider === 'wa') return fromWeatherApi(cond.code, extra)
  return fromWmo(cond.code, extra)
}

export function describe(cond) {
  if (!cond) return ''
  const text = cond.description || WMO_TEXT[cond.code] || ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Classify the live current conditions.
 * @returns {{env:string, baseEnv:string, isNight:boolean, phase:'day'|'night'|'sunrise'|'sunset', label:string}}
 */
export function classifyCurrent(current, nowSec = Date.now() / 1000) {
  const baseEnv = baseEnvironment(current.cond, {
    precip: current.precip1h, snow: current.snow1h, cloudPct: current.cloudPct,
  })
  const { sunrise, sunset } = current
  let isNight = current.isDay != null ? !current.isDay : false
  let phase = isNight ? 'night' : 'day'

  if (sunrise && sunset && sunset > sunrise) {
    isNight = nowSec < sunrise || nowSec > sunset
    phase = isNight ? 'night' : 'day'
    if (Math.abs(nowSec - sunrise) <= GOLDEN_WINDOW) phase = 'sunrise'
    else if (Math.abs(nowSec - sunset) <= GOLDEN_WINDOW) phase = 'sunset'
  }

  const goldenEligible = baseEnv === 'sunny' || baseEnv === 'partly-cloudy'
  const env = (phase === 'sunrise' || phase === 'sunset') && goldenEligible ? 'golden' : baseEnv
  if (env === 'golden') isNight = false

  return { env, baseEnv, isNight, phase, label: describe(current.cond) }
}

/** Classify a forecast slot (hourly or daily). Never promoted to "golden". */
export function classifyForecast(slot) {
  return {
    env: baseEnvironment(slot.cond, { precip: slot.precip, cloudPct: slot.cloudPct }),
    isNight: slot.isDay === false,
    label: describe(slot.cond),
  }
}
