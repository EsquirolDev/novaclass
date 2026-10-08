/* Asignaturas: color + forma + código. El color vive en tokens.css (--pro, --pro-soft, --on-pro…). */
export const SUBJECTS = {
  pro: { id: 'pro', code: 'PRO', name: 'Programación', shape: 'circle', teachers: ['molina', 'pau'] },
  bd: { id: 'bd', code: 'BD', name: 'Bases de Datos', shape: 'square', teachers: ['tomeu', 'santiago'] },
  lm: { id: 'lm', code: 'LMSGI', name: 'Lenguajes de Marcas', shape: 'triangle', teachers: ['dustin'] },
  si: { id: 'si', code: 'SI', name: 'Sistemas Informáticos', shape: 'diamond', teachers: ['maties'] },
  ed: { id: 'ed', code: 'ED', name: 'Entornos de Desarrollo', shape: 'hexagon', teachers: ['montero'] },
}

export const SUBJECT_ORDER = ['pro', 'bd', 'lm', 'si', 'ed']

/* Módulos del horario sin entregas en la app: tienen color y forma, pero no página ni apuntes */
export const OTHER_SUBJECTS = {
  digi: { id: 'digi', code: 'DIGI', name: 'Digitalización', shape: 'pentagon', teachers: ['antoni'] },
  cpfw: { id: 'cpfw', code: 'CPFW', name: 'Construcción de proyectos y frameworks web', shape: 'star', teachers: ['irene'] },
  ipo: { id: 'ipo', code: 'IPO', name: 'Itinerario personal para la empleabilidad I', shape: 'cross', teachers: ['magdalena'] },
}

export const OTHER_ORDER = ['digi', 'cpfw', 'ipo']

/* Todos los módulos del horario: filtros del calendario */
export const MODULE_ORDER = [...SUBJECT_ORDER, ...OTHER_ORDER]

export function allModulesOn() {
  return Object.fromEntries(MODULE_ORDER.map(k => [k, true]))
}

/* Asignatura o módulo del horario */
export function subjectOf(id) {
  return SUBJECTS[id] || OTHER_SUBJECTS[id] || null
}

export function subjectVars(id) {
  if (!subjectOf(id)) return {}
  return { '--s': `var(--${id})`, '--s-soft': `var(--${id}-soft)`, '--s-on': `var(--on-${id})` }
}
