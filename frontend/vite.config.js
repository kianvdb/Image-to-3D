// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    open: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
