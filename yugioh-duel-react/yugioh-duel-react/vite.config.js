import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const duelServiceRoot = path.resolve(import.meta.dirname, '../../../duel-service')
const cardsDatabase = path.join(duelServiceRoot, '.local-runtime/resources/BabelCDB/cards.cdb')
const imageCache = path.join(duelServiceRoot, '.local-runtime/card-images')

function localCardAssets() {
  return {
    name: 'local-card-assets',
    configureServer(server) {
      server.middlewares.use('/local-assets/cards.cdb', (_request, response) => {
        if (!fs.existsSync(cardsDatabase)) {
          response.statusCode = 503
          response.end('cards.cdb ausente; execute ./dev.sh runtime-setup no duel-service')
          return
        }
        response.setHeader('Content-Type', 'application/vnd.sqlite3')
        fs.createReadStream(cardsDatabase).pipe(response)
      })

      server.middlewares.use('/local-assets/cards', async (request, response) => {
        const code = path.basename(request.url || '').replace(/\.jpg$/i, '')
        if (!/^\d{1,10}$/.test(code)) {
          response.statusCode = 400
          response.end()
          return
        }
        fs.mkdirSync(imageCache, { recursive: true })
        const cached = path.join(imageCache, `${code}.jpg`)
        if (!fs.existsSync(cached)) {
          try {
            const upstream = await fetch(`https://images.ygoprodeck.com/images/cards/${code}.jpg`)
            if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`)
            fs.writeFileSync(cached, Buffer.from(await upstream.arrayBuffer()))
          } catch {
            response.statusCode = 404
            response.end()
            return
          }
        }
        response.setHeader('Content-Type', 'image/jpeg')
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        fs.createReadStream(cached).pipe(response)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localCardAssets()],
  server: {
    proxy: {
      '/evolution': {
        target: 'http://127.0.0.1:7922',
        changeOrigin: true,
        rewrite: value => value.replace(/^\/evolution/, ''),
      },
      '/windbot': {
        target: 'http://127.0.0.1:2399',
        changeOrigin: true,
        rewrite: value => value.replace(/^\/windbot/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    exclude: ['node_modules', 'e2e'],
  },
})
