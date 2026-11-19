// Minimal production server: serves the built app from /dist and proxies
// secret-bearing API calls so keys stay on the server.
//   npm run build && npm start
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { proxyRoutes } from './routes.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

// Tiny .env loader (no dependency needed)
const envFile = path.join(root, '.env')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}

const routes = proxyRoutes(process.env)
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
}

const server = http.createServer(async (req, res) => {
  try {
    const route = routes.find((r) => req.url.startsWith(r.prefix + '/'))
    if (route) {
      if (req.method !== 'GET') { res.writeHead(405).end(); return }
      const upstream = await fetch(route.target + route.rewrite(req.url), { signal: AbortSignal.timeout(15000) })
      const body = Buffer.from(await upstream.arrayBuffer())
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      })
      res.end(body)
      return
    }

    const urlPath = decodeURIComponent(req.url.split('?')[0])
    let file = path.normalize(path.join(dist, urlPath))
    if (!file.startsWith(dist)) { res.writeHead(403).end(); return }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html')
    if (!fs.existsSync(file)) { res.writeHead(404).end('Run "npm run build" first.'); return }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  } catch (err) {
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ cod: 502, message: 'Upstream request failed' }))
  }
})

const port = Number(process.env.PORT) || 8787
server.listen(port, () => console.log(`EUTOPIA running at http://localhost:${port}`))
