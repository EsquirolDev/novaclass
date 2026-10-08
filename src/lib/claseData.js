/*
 * Registros de PocketBase → la forma que ya usa la app (la misma que src/data/seed.js), para que las pantallas no
 * tengan que saber de dónde vienen los datos. Funciones puras: se prueban en claseData.test.js.
 */

const personName = m => (m.expand?.user?.name || m.pending_name || m.expand?.user?.email || '').trim()

/*
 * Nombre corto de cada Docente: el nombre de pila, o los dos primeros si hay dos con el mismo
 * («Miquel Àngel» y «Miquel Molina»). `people`: [{ id, name }] → { id: short }
 */
export function shortNames(people) {
  const first = p => p.name.split(/\s+/)[0]
  const count = {}
  for (const p of people) count[first(p)] = (count[first(p)] || 0) + 1
  return Object.fromEntries(people.map(p => [p.id, count[first(p)] > 1 ? p.name.split(/\s+/).slice(0, 2).join(' ') : first(p)]))
}

/*
 * Horario de la clase: franjas, patio, una celda por día y franja ({ id: clave del módulo, teacher }) y los Docentes.
 * `schedule` con expand de module; `memberships` de la clase (con expand de user).
 */
export function toHorario(group, schedule, memberships) {
  const sessions = Array.isArray(group.sessions) ? group.sessions : []
  const brk = group.break && group.break.start ? { label: 'Patio', ...group.break } : null
  const SCHEDULE = {}
  for (const day of [1, 2, 3, 4, 5]) SCHEDULE[day] = sessions.map(() => null)
  for (const s of schedule) {
    const key = s.expand?.module?.key
    if (!key || !SCHEDULE[s.day] || s.slot >= sessions.length) continue
    SCHEDULE[s.day][s.slot] = { id: key, teacher: s.teacher || null }
  }
  const docentes = memberships.filter(m => m.role === 'docente').map(m => ({ id: m.id, name: personName(m) }))
  const short = shortNames(docentes)
  const TEACHERS = Object.fromEntries(docentes.map(d => [d.id, { short: short[d.id], name: d.name }]))
  return { SESSIONS: sessions, BREAK: brk, SCHEDULE, TEACHERS }
}

/* Temas por módulo, en su orden: { pro: [['Arrays', 'now'], …] } */
export function toTemas(topics) {
  const out = {}
  for (const t of [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    const key = t.expand?.module?.key
    if (!key) continue
    ;(out[key] ||= []).push([t.title, t.status || ''])
  }
  return out
}

/* Entregas, exámenes y festivos, con lo que la persona ha marcado (hecha y nota) */
export function toEvents(events, statuses = []) {
  const mine = Object.fromEntries(statuses.map(s => [s.event, s]))
  return events.map(e => ({
    id: e.id,
    subject: e.expand?.module?.key || null,
    type: e.type,
    title: e.title,
    date: e.date,
    time: e.time || undefined,
    end: e.end || undefined,
    tema: e.tema || undefined,
    kind: e.kind || undefined,
    files: e.files || undefined,
    where: e.where || undefined,
    topics: Array.isArray(e.topics) && e.topics.length ? e.topics : undefined,
    about: e.about || undefined,
    related: e.related || undefined,
    done: !!mine[e.id]?.done,
    grade: mine[e.id]?.grade || undefined,
  }))
}

/* Mi papel en la clase: { role: 'estudiante' | 'docente' | null, cargo, director } */
export function myRole(memberships, userId, isDirector) {
  const m = memberships.find(x => x.user === userId)
  return { role: m?.role || null, cargo: m?.cargo || null, director: !!isDirector }
}
