import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { AUTH_ON } from '../lib/flags.js'
import { pb } from '../lib/pb.js'

/*
 * Sesión: quién ha entrado (users de PocketBase) y cómo entrar, cambiar o recuperar la contraseña y salir. Las
 * cuentas las crea la escuela (pb_hooks/cuentas.pb.js): aquí no se registra nadie.
 * PocketBase guarda el token en localStorage; aquí solo se escucha para que la app se entere de los cambios.
 */
const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (AUTH_ON && pb.authStore.isValid ? pb.authStore.record : null))

  useEffect(() => {
    const off = pb.authStore.onChange(() => setUser(pb.authStore.isValid ? pb.authStore.record : null))
    /* Al abrir la app, renueva el token (y descubre si la cuenta se borró o el token caducó) */
    if (AUTH_ON && pb.authStore.isValid)
      pb.collection('users')
        .authRefresh()
        .catch(err => err?.status === 401 && pb.authStore.clear())
    return off
  }, [])

  const value = useMemo(
    () => ({
      user,
      /* Se entra con el usuario de la escuela (scollp@santjosepobrer) o con el correo */
      login: (identity, password) => pb.collection('users').authWithPassword(identity.trim().toLowerCase(), password),
      /*
       * Cambiar la contraseña (la temporal de la escuela, al entrar). PocketBase cierra las sesiones al cambiarla, así
       * que se vuelve a entrar con la nueva.
       */
      changePassword: async (oldPassword, password) => {
        const me = pb.authStore.record
        await pb.collection('users').update(me.id, { oldPassword, password, passwordConfirm: password })
        return pb.collection('users').authWithPassword(me.username || me.email, password)
      },
      requestReset: email => pb.collection('users').requestPasswordReset(email.trim()),
      logout: () => pb.authStore.clear(),
    }),
    [user],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fuera de AuthProvider')
  return v
}
