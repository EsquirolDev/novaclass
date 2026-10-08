import { SUBJECT_ORDER } from '../data/subjects.js'
import { addDays, DOW_LONG, DOW_SHORT, isoDate, sameDay, startOfWeek } from '../lib/dates.js'

/* Props de EventChip a partir de un evento */
export function chip(e) {
  return { id: e.id, type: e.type, subject: e.subject, title: e.title, time: e.done ? undefined : e.type === 'festivo' ? undefined : e.time, done: e.done }
}

export function eventsOn(events, iso) {
  return events.filter(e => e.date === iso)
}

/* Siete días (lunes a domingo) de la semana que contiene `ref` */
export function weekDays(events, ref, now) {
  const mon = startOfWeek(ref)
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mon, i)
    const today = sameDay(d, now)
    return {
      iso: isoDate(d),
      dow: DOW_SHORT[d.getDay()],
      long: `${DOW_LONG[d.getDay()]} ${d.getDate()}${today ? ', hoy' : ''}`,
      date: d.getDate(),
      today,
      weekend: i >= 5,
      events: eventsOn(events, isoDate(d)).map(e => ({ ...chip(e), raw: e })),
    }
  })
}

/* Lo siguiente: la primera entrega o examen pendiente que aún no ha pasado */
export function nextUp(events, now) {
  return events.find(e => e.type !== 'festivo' && !e.done && e.at > now) || null
}

export function subjectProgress(events, subject, now) {
  const own = events.filter(e => e.subject === subject)
  const entregas = own.filter(e => e.type === 'entrega')
  const done = entregas.filter(e => e.done).length
  const next = own.find(e => !e.done && e.at > now) || null
  const overdue = entregas.filter(e => !e.done && e.at <= now).length
  const exam = own.find(e => e.type === 'examen' && e.at > now) || null
  return { subject, done, total: entregas.length, next, overdue, exam }
}

export function allProgress(events, now) {
  return SUBJECT_ORDER.map(s => subjectProgress(events, s, now))
}
