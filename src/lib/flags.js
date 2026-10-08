/*
 * Interruptores de la app.
 * AUTH_ON: portada, cuentas y login con PocketBase. Encendido; VITE_AUTH=off lo apaga (la app se abre directamente
 * con la clase de ejemplo, sin backend).
 */
export const AUTH_ON = import.meta.env.VITE_AUTH !== 'off'
