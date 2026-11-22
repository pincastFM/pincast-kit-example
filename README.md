# Lantern Walk

A small app that shows a person's cards on the [Placecard kit's](https://www.npmjs.com/package/@pincast/placecard-kit) card table. Clone it and you'll have cards on screen with no account and no key. Add a key, and the same table shows real collects.

It's built with Vite and Vue, and the only Pincast code in it is the public kit.

## Run it

You need Node 20.12 or later.

```sh
git clone <this repository>
cd pincast-kit-example
npm ci
npm run dev
```

Open http://localhost:5173. Five sample cards are on the table, and three more wait under the Missing chip. With no key, the app never calls Pincast.

## Go live

Every Pincast key is live, so anything you write with one is real. [Test and live](https://docs.pincast.fm/concepts/test-and-live) covers how to get a key and how to keep experiments out of sight.

1. Copy the settings file, then put your key in `PINCAST_KEY`:

   ```sh
   cp .env.example .env
   ```

2. In `shared/app.js`, change `APP.id` to your app's id: the part of your key between `pck_` and the next underscore. The app refuses a key for any other app.

3. Write the goldens again, because they carry the app id:

   ```sh
   UPDATE_GOLDENS=1 npm test
   ```

4. Register the set. Its `meta.listed` is `false`, which keeps it off the Placecard map and front page.

   ```sh
   set -a; . ./.env; set +a
   curl -X PUT https://api.pincast.fm/v1/sets/old-town-lanterns \
     -H "X-Pincast-Key: $PINCAST_KEY" \
     -H "Content-Type: application/json" \
     -d @data/set.json
   ```

5. Record one collect for a guest:

   ```sh
   curl -X POST https://api.pincast.fm/v1/sets/old-town-lanterns/collects \
     -H "X-Pincast-Key: $PINCAST_KEY" \
     -H "Content-Type: application/json" \
     -d '{ "card": "lantern:ferry-steps", "actor": { "id": "guest-lantern-1", "source": "anonymous" } }'
   ```

6. Set `PINCAST_ACTOR=guest-lantern-1` in `.env` and run `npm run dev` again. The line at the top of the page reads "Live from the Pincast API."

## Where things are

| File | What it does |
| :- | :- |
| `shared/app.js` | The app's id, name and color, its set, its face and its rarity words. |
| `data/set.json` | The set and its cards: the exact body of `PUT /v1/sets/:set`. The API doesn't send a set's cards back, so the app keeps this copy. |
| `data/sample-collects.json` | A saved answer of `GET /v1/sets/:set/collects`, used when there's no key. |
| `server/collection.js` | Turns the set and one person's collects into the kit's collection with `ttFromAppSet`. |
| `server/route.js` | `GET /api/collection`, the one route. It holds the key and calls the API. |
| `server/index.js` | The production server. In development, Vite mounts the same route. |
| `src/tabletop.js` | The table's config for `createTabletop`. |
| `src/lantern.css` | The theme, and the app's own face under `.ttf[data-face="lantern"]`. |
| `test/conformance.test.js` | The kit's `ttConformance` suite, run on this app's config. |
| `test/route.test.js` | The route against a local mock of the API. The tests never reach Pincast. |

## Two rules this app follows

- **The key stays on the server.** Only `server/route.js` reads it. The page gets the finished collection.
- **The browser doesn't choose the person.** The route reads `PINCAST_ACTOR` from the server's settings, and a real app takes the person from its own sign-in session. If the browser could send the id, anyone could read anyone's cards through your key.

## Check it

```sh
npm test        # the route tests and the kit's conformance suite
npm run build   # builds the page into dist
npm start       # serves dist and the route on http://127.0.0.1:4173
```

A change to the theme or the face's markup changes the goldens in `test/goldens`. Read the difference, then write them again with `UPDATE_GOLDENS=1 npm test`.

## License

MIT. See [LICENSE](LICENSE).
