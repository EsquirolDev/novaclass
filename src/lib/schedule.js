import * as demo from '../data/seed.js'
import { subjectOf } from '../data/subjects.js'

export const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
export const DAY_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie']
export const DAYS = [1, 2, 3, 4, 5]

/* '09:05' → '9:05' */
export const trim = t => (t ? t.replace(/^0/, '') : '')

/* '15:55' → 15.9166 */
export function toHours(time) {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

/*
 * Horario de la clase que se está viendo. Por defecto, el de ejemplo (seed.js); al cargar una clase de PocketBase,
 * setHorario lo cambia. Son exportaciones «vivas»: quien las importa ve siempre el valor actual.
 * BREAK es null si la clase no tiene patio.
 */
export let SESSIONS = demo.SESSIONS
export let BREAK = demo.BREAK
export let SCHEDULE = demo.SCHEDULE
export let TEACHERS = demo.TEACHERS
export let DAY_START = toHours(SESSIONS[0].start)
export let DAY_END = toHours(SESSIONS[SESSIONS.length - 1].end)

export function setHorario(h = demo) {
  SESSIONS = h.SESSIONS
  BREAK = h.BREAK || null
  SCHEDULE = h.SCHEDULE
  TEACHERS = h.TEACHERS
  DAY_START = SESSIONS.length ? toHours(SESSIONS[0].start) : 0
  DAY_END = SESSIONS.length ? toHours(SESSIONS[SESSIONS.length - 1].end) : 0
}

export function classInfo(id) {
  return subjectOf(id)
}

export function teacherShort(key) {
  return TEACHERS[key]?.short || key
}

/* Docentes de un módulo según el horario, por orden alfabético */
export function teacherNames(id) {
  const keys = new Set(
    Object.values(SCHEDULE)
      .flat()
      .filter(c => c && c.id === id && c.teacher)
      .map(c => c.teacher),
  )
  return [...keys].map(k => TEACHERS[k]?.name || k).sort((a, b) => a.localeCompare(b, 'es'))
}

/*
 * Bloques de un día (1–5). Franjas seguidas con el mismo módulo y el mismo profe se juntan,
 * salvo que el patio quede en medio. Las horas libres salen como bloques con id null.
 */
export function blocksFor(day, { free = false } = {}) {
  const row = SCHEDULE[day] || []
  const out = []
  row.forEach((cell, i) => {
    const id = cell ? cell.id : null
    const teacher = cell ? cell.teacher : null
    const last = out[out.length - 1]
    const crossesBreak = !!BREAK && i === BREAK.after + 1
    if (last && last.id === id && last.teacher === teacher && last.to === i - 1 && !crossesBreak) {
      last.to = i
      last.end = SESSIONS[i].end
    } else {
      out.push({ id, teacher, day, from: i, to: i, start: SESSIONS[i].start, end: SESSIONS[i].end })
    }
  })
  return free ? out : out.filter(b => b.id)
}

export function weeklyHours(id) {
  return Object.values(SCHEDULE)
    .flat()
    .filter(x => x && x.id === id).length
}

export function totalHours() {
  return Object.values(SCHEDULE).flat().filter(Boolean).length
}

/* Bloques de un módulo en toda la semana */
export function classesOf(id) {
  return DAYS.flatMap(d => blocksFor(d)).filter(b => b.id === id)
}

/* Hora de salida de cada día (fin de la última clase) */
export function dayEnd(day) {
  const b = blocksFor(day)
  return b.length ? b[b.length - 1].end : null
}

/*
 * Qué toca ahora: { state: 'clase' | 'patio' | 'libre' | 'antes' | 'fin' | 'finde', block?, next?, left? }
 * `left` = minutos que quedan del bloque actual.
 */
export function nowStatus(now) {
  const day = now.getDay()
  if (day < 1 || day > 5) return { state: 'finde' }
  const h = now.getHours() + now.getMinutes() / 60
  const blocks = blocksFor(day, { free: true })
  const next = blocksFor(day).find(b => toHours(b.start) > h) || null
  /* Los minutos que quedan se cuentan en enteros: con horas decimales 18 − 17,833… da 10,0000002 y salía «quedan 11» */
  const mins = now.getHours() * 60 + now.getMinutes()
  const toMin = t => Math.round(toHours(t) * 60)
  if (h < DAY_START) return { state: 'antes', next }
  if (BREAK && h >= toHours(BREAK.start) && h < toHours(BREAK.end)) return { state: 'patio', next, left: toMin(BREAK.end) - mins }
  const block = blocks.find(b => h >= toHours(b.start) && h < toHours(b.end))
  if (!block || (!block.id && !next)) return { state: 'fin' }
  const left = toMin(block.end) - mins
  return { state: block.id ? 'clase' : 'libre', block, next, left }
}
