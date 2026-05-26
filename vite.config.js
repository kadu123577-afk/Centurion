import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'public/index.html'),
        login: resolve(__dirname, 'public/login.html'),
        app:   resolve(__dirname, 'public/app.html'),
      }
    }
  },
  resolve: {
    alias: {
      '/src': resolve(__dirname, 'src'),
    }
  },
  server: { port: 3000, open: '/login.html', fs: { allow: ['..'] } }
})
