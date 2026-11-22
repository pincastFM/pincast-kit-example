// The production server: the built page from dist, and the one API route.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectionRoute } from './route.js'

if (existsSync('.env')) process.loadEnvFile('.env')

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.map': 'application/json' }
const route = collectionRoute(process.env)

function serveFile(req, res) {
  let path
  try {
    path = normalize(join(dist, decodeURIComponent(new URL(req.url, 'http://local').pathname)))
  } catch {
    res.writeHead(400).end()
    return
  }
  if (path !== dist && !path.startsWith(dist + sep)) {
    res.writeHead(403).end()
    return
  }
  if (!existsSync(path) || !statSync(path).isFile()) path = join(dist, 'index.html')
  if (!existsSync(path)) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end('No build yet: run npm run build first.\n')
    return
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' })
  if (req.method === 'HEAD') res.end()
  else createReadStream(path).pipe(res)
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://local')
  if (pathname === '/api/collection') return route(req, res)
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405, { Allow: 'GET, HEAD' }).end()
  return serveFile(req, res)
})

const port = Number(process.env.PORT) || 4173
const host = process.env.HOST || '127.0.0.1'
server.listen(port, host, () => console.log(`Lantern Walk: http://${host}:${port}`))
