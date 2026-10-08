import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/* En desarrollo, /api y el panel (/_/) van a PocketBase; en el servidor lo hará el proxy de delante */
const PB = process.env.PB_DEV_URL || 'http://127.0.0.1:8090'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': PB, '/_': PB } },
  /* Tests de lógica pura (horario, fechas, selectores, dudas) y de reglas del backend */
  test: { environment: 'node', include: ['src/**/*.test.js', 'backend/tests/**/*.test.js'] },
})
