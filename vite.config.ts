import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/Notevelist/',
  server: {
    port: 5173,
  host: true,
  open: true,
  allowedHosts: true,
  headers: {
      'Access-Control-Allow-Origin': '*',
  },
},
  build: {
    outDir: 'dist',
  },
})
