import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import uploadHandler from './api/upload.ts'

function apiDevServerPlugin(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/upload', (req, res) => {
        void uploadHandler(req, res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDevServerPlugin()],
})
