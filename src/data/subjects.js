/*
 * Asignaturas: color + forma + código. Cada escuela les pone color y forma de una paleta fija (tokens.css: --azul,
 * --azul-soft, --on-azul…), la misma que acepta PocketBase (migración 1791500400).
 */
export const COLORS = ['azul', 'naranja', 'violeta', 'verde', 'amarillo', 'cian', 'rosa', 'lima']
export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'pentagon', 'star', 'cross']

/* Las de la clase de ejemplo (seed.js): las cinco con entregas y las tres que solo están en el horario */
const DEMO = [
  { id: 'pro', code: 'PRO', name: 'Programación', color: 'azul', shape: 'circle', active: true },
  { id: 'bd', code: 'BD', name: 'Bases de Datos', color: 'naranja', shape: 'square', active: true },
  { id: 'lm', code: 'LMSGI', name: 'Lenguajes de Marcas', color: 'violeta', shape: 'triangle', active: true },
  { id: 'si', code: 'SI', name: 'Sistemas Informáticos', color: 'verde', shape: 'diamond', active: true },
  { id: 'ed', code: 'ED', name: 'Entornos de Desarrollo', color: 'amarillo', shape: 'hexagon', active: true },
  { id: 'digi', code: 'DIGI', name: 'Digitalización', color: 'cian', shape: 'pentagon', active: false },
  { id: 'cpfw', code: 'CPFW', name: 'Construcción de proyectos y frameworks web', color: 'rosa', shape: 'star', active: false },
  { id: 'ipo', code: 'IPO', name: 'Itinerario personal para la empleabilidad I', color: 'lima', shape: 'cross', active: false },
]

/*
 * Asignaturas del curso que se está viendo. SUBJECTS son las que tienen espacio (entregas, apuntes, dudas) y la
 * persona puede ver; OTHER_SUBJECTS, las demás del horario: tienen color y forma, pero no página.
 * Como el horario (schedule.js), son exportaciones «vivas» que cambia setSubjects al cargar un curso.
 */
export let SUBJECTS = {}
export let SUBJECT_ORDER = []
export let OTHER_SUBJECTS = {}
export let OTHER_ORDER = []
/* Todas las del horario: filtros del calendario */
export let MODULE_ORDER = []

/* list: [{ id, code, name, color, shape, active }] en el orden en que se enseñan */
export function setSubjects(list = DEMO) {
  const on = list.filter(s => s.active)
  const off = list.filter(s => !s.active)
  SUBJECTS = Object.fromEntries(on.map(s => [s.id, s]))
  SUBJECT_ORDER = on.map(s => s.id)
  OTHER_SUBJECTS = Object.fromEntries(off.map(s => [s.id, s]))
  OTHER_ORDER = off.map(s => s.id)
  MODULE_ORDER = [...SUBJECT_ORDER, ...OTHER_ORDER]
}
setSubjects()

export function allModulesOn() {
  return Object.fromEntries(MODULE_ORDER.map(k => [k, true]))
}

/* Asignatura con o sin espacio */
export function subjectOf(id) {
  return SUBJECTS[id] || OTHER_SUBJECTS[id] || null
}

export function subjectVars(id) {
  const s = subjectOf(id)
  if (!s) return {}
  return { '--s': `var(--${s.color})`, '--s-soft': `var(--${s.color}-soft)`, '--s-on': `var(--on-${s.color})` }
}

/* Para pintar algo si llega una asignatura que ya no está (borrada, o de otro curso) */
export const UNKNOWN = { id: null, code: '?', name: 'Asignatura', color: 'azul', shape: 'circle', active: false }
