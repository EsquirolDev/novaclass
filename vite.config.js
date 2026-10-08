import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /* Tests de lógica pura (horario, fechas, selectores, dudas): no necesitan navegador */
  test: { environment: 'node', include: ['src/**/*.test.js'] },
})
