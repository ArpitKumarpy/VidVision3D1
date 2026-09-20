import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

function apiPlugin(): Plugin {
  return {
    name: 'vidvision-api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''

        if (url === '/api/download/test.txt') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/plain')
          res.end('ok')
          return
        }

        if (url.startsWith('/api/download/')) {
          const filename = url.replace('/api/download/', '')
          const filePath = path.resolve('public/api/download', filename)
          if (fs.existsSync(filePath)) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/plain')
            fs.createReadStream(filePath).pipe(res)
            return
          }
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'File not found' }))
          return
        }

        if (url === '/api/upload' && req.method === 'POST') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            statusCode: 200,
            body_landmarks: '/download/BodyLandmarks.txt',
            right_hand_landmarks: '/download/RightHandLandmarks.txt',
            left_hand_landmarks: '/download/LeftHandLandmarks.txt'
          }))
          return
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  }
})
