import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: process.env.NODE_ENV === 'development' ? '/' : '/asefweb/',
  build: {
    outDir: 'dist',
    assetsDir: '',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      external: [
        // Evita errores de resolución si algo se carga desde CDN
        'firebase/app',
        'firebase/auth',
        'firebase/firestore'
      ]
    }
  },
  server: {
    port: 5173
  }
})
