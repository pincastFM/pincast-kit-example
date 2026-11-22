import { ref } from 'vue'
import { APP, FACES, SET_ID } from '../shared/app.js'

// Where the cards came from: 'sample' or 'live'. The page prints it.
export const source = ref(null)
export const signedIn = ref(true)

export async function loadCollection() {
  const res = await fetch('/api/collection')
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || "Couldn't load the cards.")
  source.value = body.source
  signedIn.value = body.signedIn !== false
  return body.collection
}

export const config = {
  contract: 1,
  app: APP.id,
  source: { load: loadCollection },
  faces: FACES,
  theme: { class: 'lantern-theme', fonts: [] },
  hand: { key: 'lantern_walk_hand', scope: SET_ID },
  modes: { collection: true },
  // The kit always draws this link at the top left, so it points somewhere useful.
  links: { back: { label: 'The kit', href: 'https://github.com/pincastFM/placecard-kit-public' } },
}
