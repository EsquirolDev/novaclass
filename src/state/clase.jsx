import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { setSubjects } from '../data/subjects.js'
import { myRole, toEvents, toHorario, toPeople, toSubjects, toTemas } from '../lib/claseData.js'
import { AUTH_ON } from '../lib/flags.js'
import { pb } from '../lib/pb.js'
import { setHorario } from '../lib/schedule.js'
import { loadApuntes, useApuntesPb } from './apuntesPb.js'
import { loadQa, useDudasPb } from './dudasPb.js'
import { useAuth } from './auth.jsx'

/*
 * El curso que se está viendo (docs/escuelas.md). Con sesión, sale de PocketBase: los cursos de la persona (el suyo si
 * es Estudiante; donde da clase o es Tutor si es Docente; todos los de la escuela si es de la dirección), el elegido y
 * sus datos: asignaturas, horario, temas, entregas y exámenes con lo que ha marcado, festivos, dudas y apuntes.
 * Sin login (VITE_AUTH=off), la clase de ejemplo de seed.js.
 *
 * status: 'demo' | 'loading' | 'none' (no está en ningún curso) | 'error' | 'ready'
 */
const Ctx = createContext(null)
const KEY = 'novaclass:curso'

function remembered() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/* Los cursos que le tocan a la persona y si es de la dirección de su escuela */
async function loadCursos(user) {
  const [cursos, mine, teaching, staff] = await Promise.all([
    pb.collection('cursos').getFullList({ expand: 'school,tutor', sort: 'name' }),
    pb.collection('curso_alumnos').getFullList({ filter: pb.filter('user = {:u} && baja = false', { u: user.id }), fields: 'curso' }),
    pb.collection('asignaturas').getFullList({ filter: pb.filter('docentes.id ?= {:u}', { u: user.id }), fields: 'curso' }),
    pb.collection('school_staff').getFullList({ filter: pb.filter('user = {:u}', { u: user.id }), fields: 'school' }),
  ])
  const staffOf = new Set(staff.map(x => x.school))
  const ids = new Set([...mine.map(x => x.curso), ...teaching.map(x => x.curso)])
  return {
    cursos: cursos.filter(c => staffOf.has(c.school) || ids.has(c.id) || c.tutor === user.id),
    staffOf,
  }
}

async function loadCurso(curso, user, isStaff) {
  const inCurso = pb.filter('curso = {:c}', { c: curso.id })
  const byCurso = pb.filter('asignatura.curso = {:c}', { c: curso.id })
  const [asignaturas, horario, alumnos, inscripciones, topics, events, statuses, festivos, qa, apuntesRaw] = await Promise.all([
    pb.collection('asignaturas').getFullList({ filter: inCurso, expand: 'docentes', sort: 'created' }),
    pb.collection('horario').getFullList({ filter: inCurso, expand: 'docente' }),
    pb.collection('curso_alumnos').getFullList({ filter: inCurso, expand: 'user' }),
    pb
      .collection('inscripciones')
      .getFullList({ filter: pb.filter('user = {:u} && asignatura.curso = {:c}', { u: user.id, c: curso.id }) }),
    pb.collection('topics').getFullList({ filter: byCurso, sort: 'order' }),
    pb.collection('events').getFullList({ filter: byCurso, sort: 'date,time' }),
    pb
      .collection('event_status')
      .getFullList({ filter: pb.filter('user = {:u} && event.asignatura.curso = {:c}', { u: user.id, c: curso.id }) }),
    pb.collection('festivos').getFullList({ filter: pb.filter('school = {:s}', { s: curso.school }), sort: 'date' }),
    loadQa(curso.id),
    loadApuntes(curso.id),
  ])
  const subjects = toSubjects(asignaturas, { uid: user.id, inscritas: inscripciones.map(i => i.asignatura), staff: isStaff })
  return {
    asignaturas,
    subjects,
    /* Estudiantes: asignaturas con espacio abierto en las que aún no han entrado (se entra con su código) */
    locked: user.role === 'estudiante' ? asignaturas.filter(a => a.activa && !subjects.find(x => x.id === a.id).active).map(a => a.id) : [],
    horario: toHorario(curso, horario),
    temas: toTemas(topics),
    events: toEvents(events, statuses, festivos),
    festivos,
    /* id del registro de event_status de cada evento, para actualizarlo en vez de crear otro */
    statusIds: Object.fromEntries(statuses.map(s => [s.event, s.id])),
    me: myRole(user, curso, alumnos, isStaff),
    people: toPeople(curso, asignaturas, alumnos),
    /* Docentes del curso: sus respuestas en las dudas llevan la marca de Docente */
    teachers: [...new Set(asignaturas.flatMap(a => a.docentes || []))],
    /* Dudas, respuestas y votos en crudo (src/state/dudasPb.js) y apuntes (src/state/apuntesPb.js) */
    qa,
    apuntesRaw,
  }
}

export function ClaseProvider({ children }) {
  const { user } = useAuth()
  const uid = user?.id
  const userRef = useRef(user)
  userRef.current = user
  const [current, setCurrent] = useState(remembered)
  const [reload, setReload] = useState(0)
  const [state, setState] = useState({ status: AUTH_ON ? 'loading' : 'demo', cursos: [] })
  const [saveError, setSaveError] = useState(null)
  /* Para guardar «hecha» y nota: ids de event_status, una cola por evento y cuántos cambios quedan por confirmar */
  const statusIds = useRef({})
  const queues = useRef({})
  const pending = useRef({})
  const eventsRef = useRef([])
  eventsRef.current = state.events || []

  useEffect(() => {
    if (!AUTH_ON || !uid) {
      setHorario()
      setSubjects()
      setState({ status: 'demo', cursos: [] })
      return undefined
    }
    let cancelled = false
    setState(s => ({ ...s, status: 'loading' }))
    ;(async () => {
      try {
        const me = userRef.current
        const { cursos, staffOf } = await loadCursos(me)
        if (cancelled) return
        if (!cursos.length) {
          setHorario()
          setSubjects([])
          setState({ status: 'none', cursos, staffSchool: [...staffOf][0] || null })
          return
        }
        const curso = cursos.find(c => c.id === current) || cursos[0]
        const data = await loadCurso(curso, me, staffOf.has(curso.school))
        if (cancelled) return
        /* Horario y asignaturas son módulos compartidos: se cambian antes de pintar el curso nuevo */
        setHorario(data.horario)
        setSubjects(data.subjects)
        statusIds.current = data.statusIds
        /* staffSchool: la escuela de la que es dirección (para «Cuentas de la escuela»), aunque no tenga cursos */
        setState({ status: 'ready', cursos, curso, school: curso.expand?.school || null, staffSchool: [...staffOf][0] || null, ...data })
      } catch (error) {
        if (!cancelled) setState(s => ({ ...s, status: 'error', error }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, current, reload])

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
  const cursoId = state.status === 'ready' ? state.curso.id : null
  const stateRef = useRef(state)
  stateRef.current = state
  useEffect(() => {
    if (!cursoId) return undefined
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
      .subscribe('*', ({ action, record }) => {
        if (!stateRef.current.asignaturas?.some(a => a.id === record.asignatura)) return
        setState(s => {
          if (s.status !== 'ready' || s.curso.id !== cursoId) return s
          const rest = s.events.filter(e => e.id !== record.id)
          if (action === 'delete') return { ...s, events: rest }
          const old = s.events.find(e => e.id === record.id)
          const [fresh] = toEvents([record])
          const next = { ...fresh, done: old?.done || false, grade: old?.grade }
          return { ...s, events: [...rest, next].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))) }
        })
      })
      .then(keep, () => {})
    return () => {
      alive = false
      offs.forEach(off => off())
    }
  }, [cursoId, patchEvent])

  const qaActions = useDudasPb({ state, setState, uid, setSaveError })
  const apActions = useApuntesPb({ state, setState, uid })

  const value = useMemo(
    () => ({
      ...state,
      qaActions,
      apActions,
      saveStatus,
      saveError,
      clearSaveError: () => setSaveError(null),
      /* Cambiar de curso (Docentes y dirección pueden tener varios); se recuerda para la próxima vez */
      select: id => {
        setCurrent(id)
        try {
          localStorage.setItem(KEY, id)
        } catch {
          /* sin almacenamiento: se elige el primero al volver */
        }
      },
      retry: () => setReload(n => n + 1),
      /* Entrar en el espacio de una asignatura con su código: se recarga el curso para verla */
      join: async code => {
        const res = await pb.send('/api/novaclass/unirse', { method: 'POST', body: { code } })
        setCurrent(res.curso)
        try {
          localStorage.setItem(KEY, res.curso)
        } catch {
          /* sin almacenamiento */
        }
        setReload(n => n + 1)
        return res
      },
      /* Código de una asignatura (sus Docentes y la dirección) y cambiarlo por uno nuevo */
      getCode: id => pb.send(`/api/novaclass/asignaturas/${id}/codigo`, { method: 'GET' }).then(r => r.code),
      newCode: id => pb.send(`/api/novaclass/asignaturas/${id}/codigo`, { method: 'POST' }).then(r => r.code),
    }),
    [state, saveStatus, saveError, qaActions, apActions],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useClase() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useClase fuera de ClaseProvider')
  return v
}
