import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { APUNTES, DUDAS, EVENTS, TEMAS, USER } from '../data/seed.js'
import { parseDate } from '../lib/dates.js'
import { useClase } from './clase.jsx'
import { mergeDudas, pickEditable } from './dudas.js'

/*
 * Estado de la app. Los datos de ejemplo vienen de seed.js; lo que hace la persona
 * (entregas hechas, votos, dudas y sus ediciones, respuestas, apuntes, tema) se guarda en localStorage.
 */
const KEY = 'novaclass:v1'
const EMPTY = {
  done: {},
  votes: {},
  dudas: [],
  answers: {},
  accepted: {},
  apuntes: [],
  theme: 'dark',
  welcomed: false,
  plan: {},
  planClosed: false,
  edits: {},
  deleted: {},
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* sin almacenamiento: la app sigue funcionando en memoria */
  }
}

const Ctx = createContext(null)

/* Reloj compartido: se actualiza cada 30 s para la cuenta atrás y «hoy». */
function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)
  const now = useNow()

  useEffect(() => save(state), [state])
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  const update = useCallback(fn => setState(s => ({ ...s, ...fn(s) })), [])

  /* Entregas, exámenes y temas: los de la clase cargada de PocketBase o, sin ella, los de ejemplo */
  const clase = useClase()
  const real = clase.status === 'ready'
  const baseEvents = real ? clase.events : EVENTS
  const temas = real ? clase.temas : TEMAS
  const events = useMemo(
    () =>
      baseEvents
        .map(e => ({ ...e, done: e.id in state.done ? state.done[e.id] : !!e.done, at: parseDate(e.date, e.time) }))
        .sort((a, b) => a.at - b.at),
    [baseEvents, state.done],
  )

  const dudas = useMemo(
    () =>
      mergeDudas({
        seed: DUDAS,
        own: state.dudas,
        answers: state.answers,
        accepted: state.accepted,
        votes: state.votes,
        edits: state.edits,
        deleted: state.deleted,
      }),
    [state.dudas, state.answers, state.accepted, state.votes, state.edits, state.deleted],
  )

  const apuntes = useMemo(() => [...state.apuntes, ...APUNTES], [state.apuntes])

  const value = useMemo(
    () => ({
      user: USER,
      now,
      theme: state.theme,
      welcomed: state.welcomed,
      plan: state.plan,
      planClosed: state.planClosed,
      events,
      temas,
      dudas,
      apuntes,
      setTheme: theme => update(() => ({ theme })),
      setWelcomed: welcomed => update(() => ({ welcomed })),
      setDone: (id, done) => update(s => ({ done: { ...s.done, [id]: done } })),
      /* key: id de duda, o «idDuda:idRespuesta» */
      vote: (key, dir) => update(s => ({ votes: { ...s.votes, [key]: s.votes[key] === dir ? null : dir } })),
      addDuda: ({ subject, title, body = '', code = '', tags = [] }) => {
        const id = Date.now()
        update(s => ({
          dudas: [{ id, subject, title, body, code, votes: 0, author: USER, when: 'ahora', views: 0, tags, answers: [] }, ...s.dudas],
        }))
        return id
      },
      addAnswer: (dudaId, body) =>
        update(s => ({
          answers: {
            ...s.answers,
            [dudaId]: [...(s.answers[dudaId] || []), { id: 'u' + Date.now(), author: USER, when: 'ahora', votes: 0, body }],
          },
        })),
      /* Editar una duda propia: solo título, explicación, código, etiquetas y asignatura */
      editDuda: (id, fields) => update(s => ({ edits: { ...s.edits, [id]: { ...s.edits[id], ...pickEditable(fields), edited: true } } })),
      /* Borrar una duda propia. Se marca como borrada (no se pierde) para poder deshacerlo justo después */
      deleteDuda: id => update(s => ({ deleted: { ...s.deleted, [id]: true } })),
      restoreDuda: id =>
        update(s => {
          const { [id]: _, ...rest } = s.deleted
          return { deleted: rest }
        }),
      acceptAnswer: (dudaId, answerId) => update(s => ({ accepted: { ...s.accepted, [dudaId]: answerId } })),
      addApunte: apunte =>
        update(s => ({
          apuntes: [{ id: 'u' + Date.now(), author: USER, date: 'hoy', downloads: 0, ...apunte }, ...s.apuntes],
        })),
      /* Plan de mejoras (tecla M): tareas marcadas y si ya se cerró para siempre */
      setPlanTask: (id, done) => update(s => ({ plan: { ...s.plan, [id]: done } })),
      closePlan: () => update(() => ({ planClosed: true })),
      reset: () => setState({ ...EMPTY, theme: state.theme, plan: state.plan, planClosed: state.planClosed }),
    }),
    [now, state.theme, state.welcomed, state.plan, state.planClosed, events, temas, dudas, apuntes, update],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore fuera de StoreProvider')
  return v
}
