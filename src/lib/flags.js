/*
 * Interruptores de la app.
 * AUTH_ON: portada, cuentas y login con PocketBase. Apagado hasta que el backend esté completo: la app se abre
 * directamente con la clase de ejemplo. Se enciende con VITE_AUTH=on (en .env.local o al compilar).
 */
export const AUTH_ON = import.meta.env.VITE_AUTH === 'on'
