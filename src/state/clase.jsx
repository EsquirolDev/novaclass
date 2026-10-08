import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { myRole, toEvents, toHorario, toTemas } from '../lib/claseData.js'
import { AUTH_ON } from '../lib/flags.js'
import { pb } from '../lib/pb.js'
import { setHorario } from '../lib/schedule.js'
import { useAuth } from './auth.jsx'

/*
 * La clase que se está viendo. Con sesión, sale de PocketBase: las clases que la persona puede ver (las suyas y, si es
 * Director, las de su escuela), la elegida y sus datos (horario, temas, entregas y exámenes con lo que ha marcado).
 * Sin login (VITE_AUTH=off) o con «ver una clase de ejemplo», la de seed.js.
 *
 * status: 'demo' | 'loading' | 'none' (no está en ninguna clase) | 'error' | 'ready'
 */
const Ctx = createContext(null)
const KEY = 'novaclass:clase'

function remembered() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

async function loadClase(group, userId) {
  const inGroup = pb.filter('group = {:g}', { g: group.id })
  const [schedule, memberships, topics, events, statuses, staff] = await Promise.all([
    pb.collection('schedule').getFullList({ filter: inGroup, expand: 'module' }),
    pb.collection('memberships').getFullList({ filter: inGroup, expand: 'user' }),
    pb.collection('topics').getFullList({ filter: inGroup, expand: 'module', sort: 'order' }),
    pb.collection('events').getFullList({ filter: inGroup, expand: 'module', sort: 'date,time' }),
    pb.collection('event_status').getFullList({ filter: pb.filter('user = {:u} && event.group = {:g}', { u: userId, g: group.id }) }),
    pb.collection('school_staff').getFullList({ filter: pb.filter('school = {:s} && user = {:u}', { s: group.school, u: userId }) }),
  ])
  return {
    horario: toHorario(group, schedule, memberships),
    temas: toTemas(topics),
    events: toEvents(events, statuses),
    me: myRole(memberships, userId, staff.length > 0),
    members: memberships,
  }
}

export function ClaseProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.id
  const [demo, setDemo] = useState(false)
  const [current, setCurrent] = useState(remembered)
  const [reload, setReload] = useState(0)
  const [state, setState] = useState({ status: AUTH_ON ? 'loading' : 'demo', classes: [] })

  useEffect(() => {
    if (!AUTH_ON || !uid || demo) {
      setHorario()
      setState({ status: 'demo', classes: [] })
      return undefined
    }
    let cancelled = false
    setState(s => ({ ...s, status: 'loading' }))
    ;(async () => {
      try {
        const classes = await pb.collection('groups').getFullList({ expand: 'school', sort: 'name' })
        if (cancelled) return
        if (!classes.length) {
          setHorario()
          setState({ status: 'none', classes })
          return
        }
        const group = classes.find(g => g.id === current) || classes[0]
        const data = await loadClase(group, uid)
        if (cancelled) return
        /* El horario es un módulo compartido: se cambia antes de pintar la clase nueva */
        setHorario(data.horario)
        setState({ status: 'ready', classes, group, school: group.expand?.school || null, ...data })
      } catch (error) {
        if (!cancelled) setState(s => ({ ...s, status: 'error', error }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, demo, current, reload])

  const value = useMemo(
    () => ({
      ...state,
      demo,
      /* Cambiar de clase (si se está en varias); se recuerda para la próxima vez */
      select: id => {
        setCurrent(id)
        try {
          localStorage.setItem(KEY, id)
        } catch {
          /* sin almacenamiento: se elige la primera al volver */
        }
      },
      retry: () => setReload(n => n + 1),
      /* «Ver una clase de ejemplo» desde la pantalla de sin clase; false para volver */
      showDemo: on => setDemo(on),
    }),
    [state, demo],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useClase() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useClase fuera de ClaseProvider')
  return v
}
