import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { APUNTES, DUDAS, EVENTS, USER } from '../data/seed.js'
import { parseDate } from '../lib/dates.js'

/*
 * Estado de la app. Los datos de ejemplo vienen de seed.js; lo que hace la persona
 * (entregas hechas, votos, dudas, respuestas, apuntes, tema) se guarda en localStorage.
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

function dudaStatus(d) {
  if (d.accepted) return 'resuelta'
  return d.answers.length ? 'abierta' : 'sin-responder'
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)
  const now = useNow()

  useEffect(() => save(state), [state])
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
  }, [state.theme])

  const update = useCallback(fn => setState(s => ({ ...s, ...fn(s) })), [])

  const events = useMemo(
    () =>
      EVENTS.map(e => ({ ...e, done: e.id in state.done ? state.done[e.id] : !!e.done, at: parseDate(e.date, e.time) })).sort(
        (a, b) => a.at - b.at,
      ),
    [state.done],
  )

  const dudas = useMemo(
    () =>
      [...state.dudas, ...DUDAS].map(d => {
        const answers = [...d.answers, ...(state.answers[d.id] || [])].map(a => ({
          ...a,
          votes: a.votes + voteDelta(state.votes[`${d.id}:${a.id}`]),
          myVote: state.votes[`${d.id}:${a.id}`] || null,
        }))
        const accepted = state.accepted[d.id] !== undefined ? state.accepted[d.id] : d.accepted
        const full = { ...d, answers, accepted, votes: d.votes + voteDelta(state.votes[d.id]), myVote: state.votes[d.id] || null }
        return { ...full, status: dudaStatus(full) }
      }),
    [state.dudas, state.answers, state.accepted, state.votes],
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
    [now, state.theme, state.welcomed, state.plan, state.planClosed, events, dudas, apuntes, update],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function voteDelta(v) {
  return v === 'up' ? 1 : v === 'down' ? -1 : 0
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore fuera de StoreProvider')
  return v
}
