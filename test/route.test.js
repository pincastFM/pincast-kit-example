import { afterEach, describe, expect, it } from 'vitest'
import { createServer } from 'node:http'
import { collectionRoute, readCollection } from '../server/route.js'
import { MOCK_KEY, WRONG_KEY, heldCard, startMockApi } from './mock-api.js'

let mock
afterEach(async () => { if (mock) await mock.close(); mock = null })

const live = (extra = {}) => ({ PINCAST_KEY: MOCK_KEY, PINCAST_ACTOR: 'guest-test-1', PINCAST_API: mock.url, ...extra })
const heldTitles = body => body.collection.cards.filter(c => c.held).map(c => c.title)

describe('with no key', () => {
  it('answers from the sample and makes no network call', async () => {
    const fetchImpl = () => { throw new Error('no call should be made') }
    const { status, body } = await readCollection({}, fetchImpl)
    expect(status).toBe(200)
    expect(body.source).toBe('sample')
    expect(body.collection.cards).toHaveLength(8)
    expect(heldTitles(body)).toEqual(['Ferry Steps', "Chandler's Corner", 'Market Cross', 'Bell Yard', 'Harbor Light'])
  })

  it('treats a blank key as no key', async () => {
    const { body } = await readCollection({ PINCAST_KEY: '   ' }, () => { throw new Error('no call') })
    expect(body.source).toBe('sample')
  })
})

describe('with a key', () => {
  it('reads the set\'s collects with the key in the header, for the one actor', async () => {
    mock = await startMockApi({ holdings: { 'guest-test-1': [heldCard('lantern:the-last-wick')] } })
    const { status, body } = await readCollection(live())
    expect(status).toBe(200)
    expect(body.source).toBe('live')
    expect(heldTitles(body)).toEqual(['The Last Wick'])
    expect(mock.calls).toEqual([{ method: 'GET', path: '/v1/sets/old-town-lanterns/collects', actors: ['guest-test-1'], key: MOCK_KEY }])
  })

  it('never sends the key to the browser, on success or on a refusal', async () => {
    mock = await startMockApi({ holdings: { 'guest-test-1': [heldCard('lantern:ferry-steps')] } })
    expect(JSON.stringify((await readCollection(live())).body)).not.toContain(MOCK_KEY)
    expect(JSON.stringify((await readCollection(live({ PINCAST_KEY: WRONG_KEY }))).body)).not.toContain(WRONG_KEY)
  })

  it('shows nothing held and makes no call when no person is set', async () => {
    mock = await startMockApi()
    const { status, body } = await readCollection(live({ PINCAST_ACTOR: '' }))
    expect(status).toBe(200)
    expect(body).toMatchObject({ source: 'live', signedIn: false })
    expect(heldTitles(body)).toEqual([])
    expect(mock.calls).toHaveLength(0)
  })

  it('refuses a key for another app before calling the API', async () => {
    mock = await startMockApi()
    const other = 'pck_other-app_mock0secret0mock0secret'
    const { status, body } = await readCollection(live({ PINCAST_KEY: other }))
    expect(status).toBe(500)
    expect(body.error).toContain('other-app')
    expect(body.error).not.toContain('mock0secret')
    expect(mock.calls).toHaveLength(0)
  })

  it('refuses a key with the wrong shape without repeating it', async () => {
    mock = await startMockApi()
    const { status, body } = await readCollection(live({ PINCAST_KEY: 'not-a-key-at-all' }))
    expect(status).toBe(500)
    expect(body.error).not.toContain('not-a-key-at-all')
    expect(mock.calls).toHaveLength(0)
  })
})

describe('when the API refuses', () => {
  it('403: says the key was refused', async () => {
    mock = await startMockApi()
    const { status, body } = await readCollection(live({ PINCAST_KEY: WRONG_KEY }))
    expect(status).toBe(502)
    expect(body.error).toContain('refused')
  })

  it('404: says to register the set first', async () => {
    mock = await startMockApi({ sets: [] })
    const { status, body } = await readCollection(live())
    expect(status).toBe(502)
    expect(body.error).toContain('PUT /v1/sets/old-town-lanterns')
  })

  it('429: passes Retry-After on, and calls once', async () => {
    mock = await startMockApi({ limited: true })
    const { status, retryAfter } = await readCollection(live())
    expect(status).toBe(429)
    expect(retryAfter).toBe('7')
    expect(mock.calls).toHaveLength(1)
  })

  it('an answer for another app is an error, not a crash', async () => {
    mock = await startMockApi({ app: 'other-app' })
    const { status, body } = await readCollection(live())
    expect(status).toBe(502)
    expect(body.error).toBeTruthy()
  })

  it('an API it cannot reach is a 502', async () => {
    const { status, body } = await readCollection({ PINCAST_KEY: MOCK_KEY, PINCAST_ACTOR: 'guest-test-1', PINCAST_API: 'http://127.0.0.1:9/v1' })
    expect(status).toBe(502)
    expect(body.error).toContain('reach')
  })
})

describe('the route over HTTP', () => {
  const serve = async (handler) => {
    const server = createServer(handler)
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(resolve => server.close(resolve)) }
  }

  it('answers GET with JSON that is not cached', async () => {
    const s = await serve(collectionRoute({}))
    const res = await fetch(s.url)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect((await res.json()).source).toBe('sample')
    await s.close()
  })

  it('takes no actor from the browser', async () => {
    mock = await startMockApi({ holdings: { 'guest-test-1': [heldCard('lantern:ferry-steps')], 'someone-else': [heldCard('lantern:harbor-light')] } })
    const s = await serve(collectionRoute(live()))
    const body = await (await fetch(`${s.url}?actor=someone-else`)).json()
    expect(heldTitles(body)).toEqual(['Ferry Steps'])
    expect(mock.calls[0].actors).toEqual(['guest-test-1'])
    await s.close()
  })

  it('refuses anything but GET and HEAD', async () => {
    const s = await serve(collectionRoute({}))
    const res = await fetch(s.url, { method: 'POST' })
    expect(res.status).toBe(405)
    expect(res.headers.get('allow')).toBe('GET, HEAD')
    await s.close()
  })
})
