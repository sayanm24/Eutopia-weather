import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { proxyRoutes } from './server/routes.js'

export default defineConfig(({ mode }) => {
  // Load every variable (no prefix filter) for the proxy only. Nothing here is exposed to client code.
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {}
  for (const r of proxyRoutes(env)) {
    proxy[r.prefix] = { target: r.target, changeOrigin: true, rewrite: r.rewrite }
  }
  return {
    plugins: [react()],
    // A boolean only (never the key itself): lets the client skip WeatherAPI.com when no key is configured.
    define: { __WEATHERAPI_ENABLED__: JSON.stringify(Boolean(env.WEATHERAPI_KEY || env.VITE_WEATHERAPI_KEY)) },
    server: { proxy },
    preview: { proxy },
  }
})
