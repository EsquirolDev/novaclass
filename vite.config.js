import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/*
 * En desarrollo, /api va a PocketBase. El panel de administración (/_/) NO se reenvía: este Vite está publicado en
 * internet por el túnel y el panel solo debe abrirse desde el propio servidor (http://127.0.0.1:8090/_/).
 */
const PB = process.env.PB_DEV_URL || 'http://127.0.0.1:8090'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': PB } },
  /* Tests de lógica pura (horario, fechas, selectores, dudas) y de reglas del backend */
  test: { environment: 'node', include: ['src/**/*.test.js', 'backend/tests/**/*.test.js'] },
})
