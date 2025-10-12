// =======================================================
// ⚙️ Vite Configuración ASEF
// =======================================================
// Compatible con:
//  - Localhost (npm run dev)
//  - GitHub Pages (deploy en /asefweb/)
//  - Carga de rutas relativas (./pages/archivo.html)
//  - Firebase desde CDN (sin romper build)
//
// RobertZaa · ASEF Project 2025
// =======================================================

import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // =====================================================
  // 🌐 Base pública dinámica
  // =====================================================
  // En desarrollo → usa raíz "/"
  // En producción (GitHub Pages) → usa "/asefweb/"
  base: process.env.NODE_ENV === 'development' ? '/' : '/asefweb/',

  // =====================================================
  // 🏗️ Opciones de Build
  // =====================================================
  build: {
    outDir: 'dist',
    assetsDir: '',
    rollupOptions: {
      input: {
        // Entrada principal
        main: resolve(__dirname, 'index.html'),
      },
      external: [
        // Evita que Vite intente incluir dependencias externas
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage'
      ]
    }
  },

  // =====================================================
  // 🧩 Servidor de desarrollo
  // =====================================================
  server: {
    port: 5173, // Puerto local por defecto
    fs: {
      // 👇 Esto permite acceder a archivos HTML dentro de /pages/
      // usando rutas relativas como ./pages/contacto.html
      allow: ['.']
    }
  },

  // =====================================================
  // 💡 Sugerencia: se puede extender con plugins Vite
  // =====================================================
  // plugins: [
  //   ...
  // ]
})
