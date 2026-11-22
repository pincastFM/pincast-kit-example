import { APP, SET_ID } from '../shared/app.js'
import { sampleCollects, toCollection } from './collection.js'

const DEFAULT_API = 'https://api.pincast.fm/v1'
const TIMEOUT_MS = 8000

const REFUSED = {
  401: 'The Pincast API got no key.',
  403: 'The Pincast API refused this key. Check PINCAST_KEY.',
  404: `Set ${SET_ID} isn't registered for this app yet. Send it with PUT /v1/sets/${SET_ID} first.`,
  429: 'Too many calls to the Pincast API. Wait a moment and reload.',
}

// A key reads pck_<app id>_<secret>. The app id is the only part this file ever repeats.
const keyApp = key => /^pck_([a-z0-9-]{1,32})_/.exec(key)?.[1] ?? null

/**
 * What GET /api/collection answers: { status, body, retryAfter? }.
 * With no key it answers from the sample and makes no network call.
 */
export async function readCollection(env = process.env, fetchImpl = fetch) {
  const key = (env.PINCAST_KEY || '').trim()
  if (!key) return { status: 200, body: { source: 'sample', collection: toCollection(sampleCollects) } }

  const owner = keyApp(key)
  if (owner !== APP.id) {
    const found = owner ? `This key is for the app ${owner}. ` : "This key doesn't have the shape pck_<app id>_<secret>. "
    return { status: 500, body: { error: `${found}Set APP.id in shared/app.js to your app's id.` } }
  }

  // In a real app the person comes from your own sign-in session. Never take this id from the browser:
  // anyone could then read anyone's cards through your key.
  const actor = (env.PINCAST_ACTOR || '').trim()
  if (!actor) return { status: 200, body: { source: 'live', signedIn: false, collection: toCollection(null) } }

  const api = (env.PINCAST_API || DEFAULT_API).replace(/\/+$/, '')
  const url = `${api}/sets/${encodeURIComponent(SET_ID)}/collects?actor=${encodeURIComponent(actor)}`
  let res
  try {
    res = await fetchImpl(url, { headers: { 'X-Pincast-Key': key }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch {
    return { status: 502, body: { error: "Couldn't reach the Pincast API." } }
  }
  if (!res.ok) {
    const error = REFUSED[res.status] || `The Pincast API answered ${res.status}.`
    if (res.status === 429) return { status: 429, retryAfter: res.headers.get('retry-after'), body: { error } }
    return { status: 502, body: { error } }
  }
  let collects
  try {
    collects = await res.json()
    return { status: 200, body: { source: 'live', signedIn: true, collection: toCollection(collects) } }
  } catch {
    return { status: 502, body: { error: 'The Pincast API sent an answer this app could not read.' } }
  }
}

/** The route as Node middleware: Vite mounts it in dev, server/index.js in production. */
export function collectionRoute(env = process.env, fetchImpl = fetch) {
  return async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.setHeader('Allow', 'GET, HEAD')
      res.end(JSON.stringify({ error: 'Use GET.' }))
      return
    }
    const { status, body, retryAfter } = await readCollection(env, fetchImpl)
    res.statusCode = status
    if (retryAfter) res.setHeader('Retry-After', retryAfter)
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body))
  }
}
