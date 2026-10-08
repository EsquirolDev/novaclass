/* Fechas: cortas y concretas («Vie 9 oct · 23:59»), plazos relativos al lado («Faltan 2 días»). */
export const DOW_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
/* Semana empezando en lunes, para calendarios */
export const DOWS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const DOW_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

export function parseDate(iso, time) {
  const [y, m, d] = iso.split('-').map(Number)
  const [hh, mm] = (time || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

export function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/* Lunes de la semana de `d` */
export function startOfWeek(d) {
  const day = (d.getDay() + 6) % 7
  return addDays(startOfDay(d), -day)
}

export function sameDay(a, b) {
  return isoDate(a) === isoDate(b)
}

/* «Vie 9 oct» / «Vie 9 oct · 23:59» */
export function shortDate(iso, time) {
  const d = parseDate(iso)
  return `${DOW_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` + (time ? ` · ${time}` : '')
}

/* «Jueves 8 oct · 23:59» */
export function mediumDate(iso, time) {
  const d = parseDate(iso)
  return `${DOW_LONG[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` + (time ? ` · ${time}` : '')
}

/* «Viernes 9 de octubre» */
export function longDate(iso) {
  const d = parseDate(iso)
  return `${DOW_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

/* «Miércoles, 7 de octubre» y «Miércoles, 7 oct» */
export function todayLong(d) {
  return `${DOW_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}
export function todayShort(d) {
  return `${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function monthTitle(d) {
  return `${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}`
}

/* Días/horas/minutos que faltan hasta `target` */
export function countdown(now, target) {
  const ms = Math.max(0, target - now)
  const mins = Math.floor(ms / 60000)
  return { days: Math.floor(mins / 1440), hours: Math.floor((mins % 1440) / 60), minutes: mins % 60 }
}

/* «Faltan 2 días», «Es hoy», «Mañana», «Faltan 4 semanas», «Pasó hace 3 días» */
export function relative(now, iso) {
  const days = Math.round((startOfDay(parseDate(iso)) - startOfDay(now)) / 86400000)
  if (days === 0) return 'Es hoy'
  if (days === 1) return 'Mañana'
  if (days < 0) return days === -1 ? 'Fue ayer' : `Hace ${-days} días`
  if (days >= 21) return `Faltan ${Math.round(days / 7)} semanas`
  return `Faltan ${days} días`
}

export function daysUntil(now, iso) {
  return Math.round((startOfDay(parseDate(iso)) - startOfDay(now)) / 86400000)
}
