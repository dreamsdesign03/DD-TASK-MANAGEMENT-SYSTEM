import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
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
    allowedHosts: true
  }
})
