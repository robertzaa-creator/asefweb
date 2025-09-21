// vite.config.mjs  (si NO usas "type": "module" en package.json, llamalo vite.config.js y exporta con module.exports)
import { defineConfig } from 'vite';

export default defineConfig({
  // En dev: '/'  |  En build (Pages): '/asefweb/'
  base: process.env.NODE_ENV === 'production' ? '/asefweb/' : '/',
});
