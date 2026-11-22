import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ttFromAppSet } from '@pincast/placecard-kit/registry'
import { APP, FACES, RARITIES, SET_ID } from '../shared/app.js'

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const readData = file => JSON.parse(readFileSync(join(dataDir, file), 'utf8'))

// The API doesn't return a set's cards, so the app keeps the set it sent to PUT /v1/sets/:set.
export const set = { id: SET_ID, app: APP.id, ...readData('set.json') }

// A saved answer of GET /v1/sets/:set/collects, so the app runs with no key.
export const sampleCollects = { ...readData('sample-collects.json'), app: APP.id, set: SET_ID }

// One person's collects (or null when no one is signed in) as the collection the table draws.
export const toCollection = collects => ttFromAppSet(set, collects, {
  apps: [APP],
  faces: FACES,
  rarities: { [APP.id]: RARITIES },
  // The open card's button. Unset, it reads "Open in Lanterns", which a phone cuts off in a wide font.
  rules: { [APP.id]: { set: () => ({ action: 'Open' }) } },
})
