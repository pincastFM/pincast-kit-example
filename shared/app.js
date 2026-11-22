// Who this app is. To go live, change `id` to the app id in your key.
export const APP = { id: 'lantern-walk', name: 'Lanterns', color: '#B4532A' }

// The set this app shows, as it's named in /v1/sets/:set.
export const SET_ID = 'old-town-lanterns'

// The app's own face: the kit's destination face draws it, under the id `lantern`.
export const FACES = { lantern: { base: 'destination' } }

// The rarity words on this set's cards, low to high.
export const RARITIES = ['Common', 'Uncommon', 'Rare']
