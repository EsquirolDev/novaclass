import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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
    /* id del registro de event_status de cada evento, para actualizarlo en vez de crear otro */
    statusIds: Object.fromEntries(statuses.map(s => [s.event, s.id])),
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
  const [saveError, setSaveError] = useState(null)
  /* Para guardar «hecha» y nota: ids de event_status, una cola por evento y cuántos cambios quedan por confirmar */
  const statusIds = useRef({})
  const queues = useRef({})
  const pending = useRef({})
  const eventsRef = useRef([])
  eventsRef.current = state.events || []

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
        statusIds.current = data.statusIds
        setState({ status: 'ready', classes, group, school: group.expand?.school || null, ...data })
      } catch (error) {
        if (!cancelled) setState(s => ({ ...s, status: 'error', error }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, demo, current, reload])

  /* Cambia «hecha» o la nota de un evento en pantalla (sin esperar al servidor) */
  const patchEvent = useCallback((eventId, patch) => {
    setState(s => (s.status !== 'ready' ? s : { ...s, events: s.events.map(e => (e.id === eventId ? { ...e, ...patch } : e)) }))
  }, [])

  /*
   * Guarda lo de la persona sobre un evento ({ done } o { grade }) en event_status. Se ve al momento; los cambios de un
   * mismo evento van en cola (dos toques rápidos no crean dos registros) y, si algo falla, se deshace y se avisa.
   */
  const saveStatus = useCallback(
    (eventId, patch) => {
      const ev = eventsRef.current.find(e => e.id === eventId)
      if (!ev || !uid) return
      const before = { done: ev.done, grade: ev.grade }
      patchEvent(eventId, patch)
      setSaveError(null)
      pending.current[eventId] = (pending.current[eventId] || 0) + 1
      const body = { ...('done' in patch ? { done: !!patch.done } : {}), ...('grade' in patch ? { grade: patch.grade || '' } : {}) }
      const run = async () => {
        const col = pb.collection('event_status')
        if (statusIds.current[eventId]) return col.update(statusIds.current[eventId], body)
        try {
          const rec = await col.create({ user: uid, event: eventId, ...body })
          statusIds.current[eventId] = rec.id
        } catch (err) {
          /* Ya existía (creado desde otro dispositivo): se busca y se actualiza */
          const found = await col.getFirstListItem(pb.filter('user = {:u} && event = {:e}', { u: uid, e: eventId })).catch(() => null)
          if (!found) throw err
          statusIds.current[eventId] = found.id
          await col.update(found.id, body)
        }
      }
      queues.current[eventId] = (queues.current[eventId] || Promise.resolve())
        .then(run)
        .catch(() => {
          patchEvent(eventId, before)
          setSaveError('No se ha podido guardar. Revisa la conexión y vuelve a intentarlo.')
        })
        .finally(() => {
          pending.current[eventId] -= 1
        })
    },
    [uid, patchEvent],
  )

  /* Tiempo real: lo marcado desde otro dispositivo y las entregas que publican Docentes, Delegado o Subdelegado */
  const groupId = state.status === 'ready' ? state.group.id : null
  useEffect(() => {
    if (!groupId) return undefined
    let alive = true
    const offs = []
    const keep = off => (alive ? offs.push(off) : off())
    pb.collection('event_status')
      .subscribe('*', ({ action, record }) => {
        if (pending.current[record.event] > 0) return // un cambio nuestro aún en camino manda
        if (action === 'delete') {
          delete statusIds.current[record.event]
          return patchEvent(record.event, { done: false, grade: undefined })
        }
        statusIds.current[record.event] = record.id
        patchEvent(record.event, { done: !!record.done, grade: record.grade || undefined })
      })
      .then(keep, () => {})
    pb.collection('events')
      .subscribe(
        '*',
        ({ action, record }) => {
          if (record.group !== groupId) return
          setState(s => {
            if (s.status !== 'ready' || s.group.id !== groupId) return s
            const rest = s.events.filter(e => e.id !== record.id)
            if (action === 'delete') return { ...s, events: rest }
            const old = s.events.find(e => e.id === record.id)
            const [fresh] = toEvents([record])
            const next = { ...fresh, done: old?.done || false, grade: old?.grade }
            return { ...s, events: [...rest, next].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))) }
          })
        },
        { expand: 'module' },
      )
      .then(keep, () => {})
    return () => {
      alive = false
      offs.forEach(off => off())
    }
  }, [groupId, patchEvent])

  const value = useMemo(
    () => ({
      ...state,
      demo,
      saveStatus,
      saveError,
      clearSaveError: () => setSaveError(null),
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
    [state, demo, saveStatus, saveError],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useClase() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useClase fuera de ClaseProvider')
  return v
}
