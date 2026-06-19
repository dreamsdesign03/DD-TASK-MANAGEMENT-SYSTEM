import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'remove-crossorigin',
      enforce: 'post',
      transformIndexHtml(html) {
        return html.replace(/\s+crossorigin(=["'][^"']*["'])?/g, '')
      },
    },
  ],
  server: {
    port: 8000,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api-n8n': {
        target: 'https://improvise-from-elusive.ngrok-free.dev',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-n8n/, ''),
      },
      '/api-local': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-local/, ''),
      }
    }
  }
})
