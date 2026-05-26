import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'public',
  resolve: {
    alias: {
      '/src': resolve(__dirname, 'src'),
    }
  },
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 3000, open: '/login.html', fs: { allow: ['..'] } }
})
