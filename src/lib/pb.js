import PocketBase from 'pocketbase'

/*
 * Cliente de PocketBase. Por defecto, el mismo dominio que la app (/api): en desarrollo lo pasa el proxy de Vite
 * y en el servidor el de delante. VITE_PB_URL lo cambia si el backend vive en otro sitio.
 * La sesión se guarda en localStorage (pocketbase_auth) y se renueva sola mientras el token sea válido.
 */
export const pb = new PocketBase(import.meta.env.VITE_PB_URL || '/')
pb.autoCancellation(false)
