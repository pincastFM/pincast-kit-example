// A local stand-in for GET /v1/sets/:set/collects, following the API reference: the key first
// (401 with none, 403 for a wrong one), then the limit (429), then the set id, the actor and the set.
import { createServer } from 'node:http'
import { APP, SET_ID } from '../shared/app.js'

export const MOCK_KEY = `pck_${APP.id}_mock0secret0mock0secret`
export const WRONG_KEY = `pck_${APP.id}_wrong0secret0wrong0secret`
const SET_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/

const fail = (res, url, statusCode, message, headers = {}) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', ...headers })
  res.end(JSON.stringify({ url, statusCode, statusMessage: '', message, data: { code: 'mock', fix: message } }))
}

export async function startMockApi({ holdings = {}, sets = [SET_ID], app = APP.id, limited = false } = {}) {
  const calls = []
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://mock')
    calls.push({ method: req.method, path: url.pathname, actors: url.searchParams.getAll('actor'), key: req.headers['x-pincast-key'] })
    const m = /^\/v1\/sets\/([^/]+)\/collects$/.exec(url.pathname)
    if (!m || req.method !== 'GET') return fail(res, url.pathname, 404, 'Not found')
    const key = req.headers['x-pincast-key']
    if (!key) return fail(res, url.pathname, 401, 'X-Pincast-Key required')
    if (key !== MOCK_KEY) return fail(res, url.pathname, 403, 'Invalid key')
    if (limited) return fail(res, url.pathname, 429, 'Too many requests', { 'Retry-After': '7' })
    const set = decodeURIComponent(m[1])
    if (!SET_RE.test(set)) return fail(res, url.pathname, 400, 'Invalid set id')
    const actors = url.searchParams.getAll('actor')
    if (!actors.length) return fail(res, url.pathname, 400, 'actor required')
    if (actors.length > 3 || actors.some(a => a.length > 255)) return fail(res, url.pathname, 400, 'At most three actor ids')
    if (!sets.includes(set)) return fail(res, url.pathname, 404, `Set ${set} is not registered`)
    const cards = actors.flatMap(a => holdings[a] || [])
    const held = {}
    for (const c of cards) held[c.type] = (held[c.type] || 0) + 1
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ app, set, held, cards }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return {
    url: `http://127.0.0.1:${server.address().port}/v1`,
    calls,
    close: () => new Promise(resolve => server.close(resolve)),
  }
}

export const heldCard = (key, collectedAt = '2026-11-01T12:00:00.000Z') => ({
  key, type: 'lantern', parent: null, via: null, collectedAt, lastCollectedAt: collectedAt, count: 1, source: 'anonymous',
})
