// Single source of truth for secret-bearing proxy routes.
// Used by the Vite dev/preview server (vite.config.js) and the production server (server/index.js).
// The browser only ever calls /api/ow/... — the key is appended here, on the server.

export function proxyRoutes(env = {}) {
  const owKey = env.OPENWEATHER_API_KEY || env.VITE_OPENWEATHER_API_KEY || ''

  const waKey = env.WEATHERAPI_KEY || env.VITE_WEATHERAPI_KEY || ''

  const withParam = (path, prefix, name, value) => {
    const rest = path.slice(prefix.length) || '/'
    if (!value) return rest
    return `${rest}${rest.includes('?') ? '&' : '?'}${name}=${encodeURIComponent(value)}`
  }

  return [
    {
      prefix: '/api/ow',
      target: 'https://api.openweathermap.org',
      rewrite: (path) => withParam(path, '/api/ow', 'appid', owKey),
    },
    {
      prefix: '/api/wa',
      target: 'https://api.weatherapi.com',
      rewrite: (path) => withParam(path, '/api/wa', 'key', waKey),
    },
  ]
}
