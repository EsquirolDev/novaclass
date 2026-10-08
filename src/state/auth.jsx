import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { pb } from '../lib/pb.js'

/*
 * Sesión: quién ha entrado (users de PocketBase) y cómo entrar, crear cuenta, recuperar contraseña y salir.
 * PocketBase guarda el token en localStorage; aquí solo se escucha para que la app se entere de los cambios.
 */
const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (pb.authStore.isValid ? pb.authStore.record : null))

  useEffect(() => {
    const off = pb.authStore.onChange(() => setUser(pb.authStore.isValid ? pb.authStore.record : null))
    /* Al abrir la app, renueva el token (y descubre si la cuenta se borró o el token caducó) */
    if (pb.authStore.isValid)
      pb.collection('users')
        .authRefresh()
        .catch(err => err?.status === 401 && pb.authStore.clear())
    return off
  }, [])

  const value = useMemo(
    () => ({
      user,
      login: (email, password) => pb.collection('users').authWithPassword(email.trim(), password),
      register: async ({ name, email, password }) => {
        await pb.collection('users').create({ name: name.trim(), email: email.trim(), password, passwordConfirm: password })
        return pb.collection('users').authWithPassword(email.trim(), password)
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
