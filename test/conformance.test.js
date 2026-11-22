// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ttConformance } from '@pincast/placecard-kit/conformance'
import { sampleCollects, toCollection } from '../server/collection.js'
import { config } from '../src/tabletop.js'

const here = dirname(fileURLToPath(import.meta.url))

ttConformance({
  name: 'lantern-walk',
  config,
  collection: toCollection(sampleCollects),
  css: [{ name: 'lantern.css', text: readFileSync(resolve(here, '../src/lantern.css'), 'utf8') }],
  base: 'cardroom',
  goldens: resolve(here, 'goldens'),
})
