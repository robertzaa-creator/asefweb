import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/asefweb/' : '/',
  build: { outDir: 'dist' },
  server: { port: 5173 }
});
