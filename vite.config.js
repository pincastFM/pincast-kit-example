import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { collectionRoute } from './server/route.js'

export default defineConfig(({ mode }) => {
  // Read on the server only. Vite puts nothing in the page unless its name starts with VITE_.
  const env = loadEnv(mode, process.cwd(), '')
  const mountRoute = (server) => { server.middlewares.use('/api/collection', collectionRoute(env)) }
  return {
    plugins: [vue(), { name: 'collection-route', configureServer: mountRoute, configurePreviewServer: mountRoute }],
    test: {
      include: ['test/**/*.test.js'],
      server: { deps: { inline: [/@pincast\/placecard-kit/] } },
    },
  }
})
