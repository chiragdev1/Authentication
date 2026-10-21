import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// /api is stripped before reaching express, same as the caddy proxy in production,
// so the frontend uses one url scheme everywhere and never needs CORS
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
})
