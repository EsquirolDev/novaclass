/*
 * Registros de PocketBase (modelo v2: cursos, asignaturas, horario…) → la forma que ya usa la app (la misma que
 * src/data/seed.js), para que las pantallas no tengan que saber de dónde vienen los datos. La clave de cada asignatura
 * es el id de su registro. Funciones puras: se prueban en claseData.test.js.
 */

const userName = u => (u?.name || [u?.nombre, u?.apellidos].filter(Boolean).join(' ') || u?.username || '').trim()

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
 * Asignaturas del curso para el registro de subjects.js. Tiene espacio (página, entregas, apuntes, dudas) si su Docente
 * lo ha abierto (activa) y la persona puede entrar: ha puesto el código, la da o es de la dirección.
 */
export function toSubjects(asignaturas, { uid, inscritas = [], staff = false }) {
  const mine = new Set(inscritas)
  return asignaturas.map(a => ({
    id: a.id,
    code: a.codigo,
    name: a.nombre,
    color: a.color,
    shape: a.forma,
    active: !!a.activa && (staff || mine.has(a.id) || (a.docentes || []).includes(uid)),
  }))
}

/*
 * Horario del curso: franjas, patio, una celda por día y franja ({ id: asignatura, teacher: usuario }) y los Docentes.
 * `horario` con expand de docente.
 */
export function toHorario(curso, horario) {
  const sessions = Array.isArray(curso.sessions) ? curso.sessions : []
  const brk = curso.break && curso.break.start ? { label: 'Patio', ...curso.break } : null
  const SCHEDULE = {}
  for (const day of [1, 2, 3, 4, 5]) SCHEDULE[day] = sessions.map(() => null)
  const people = {}
  for (const h of horario) {
    if (!h.asignatura || !SCHEDULE[h.day] || h.slot >= sessions.length) continue
    SCHEDULE[h.day][h.slot] = { id: h.asignatura, teacher: h.docente || null }
    if (h.docente) people[h.docente] = userName(h.expand?.docente) || 'Docente'
  }
  const docentes = Object.entries(people).map(([id, name]) => ({ id, name }))
  const short = shortNames(docentes)
  const TEACHERS = Object.fromEntries(docentes.map(d => [d.id, { short: short[d.id], name: d.name }]))
  return { SESSIONS: sessions, BREAK: brk, SCHEDULE, TEACHERS }
}

/* Temas por asignatura, en su orden: { [asignatura]: [['Arrays', 'now'], …] } */
export function toTemas(topics) {
  const out = {}
  for (const t of [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    if (!t.asignatura) continue
    ;(out[t.asignatura] ||= []).push([t.title, t.status || ''])
  }
  return out
}

/* Entregas y exámenes con lo que la persona ha marcado (hecha y nota), y los festivos de la escuela */
export function toEvents(events, statuses = [], festivos = []) {
  const mine = Object.fromEntries(statuses.map(s => [s.event, s]))
  const own = events.map(e => ({
    id: e.id,
    subject: e.asignatura || null,
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
  const free = festivos.map(f => ({ id: f.id, subject: null, type: 'festivo', title: f.title, date: f.date, done: false }))
  return [...own, ...free].sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
}

/*
 * Mi papel en el curso: { role: 'estudiante' | 'docente' | null, cargo: 'tutor' | 'delegado' | 'subdelegado' | null,
 * director } (director: es de la dirección de la escuela, Director o Coordinador)
 */
export function myRole(user, curso, alumnos, isStaff) {
  const a = alumnos.find(x => x.user === user.id)
  const cargo = curso.tutor && curso.tutor === user.id ? 'tutor' : a?.cargo || null
  return { role: user.role || null, cargo, director: !!isStaff }
}

/*
 * Gente del curso para «Tu clase»: Tutor, Docentes (los de sus asignaturas) y alumnado con su cargo.
 * `asignaturas` con expand de docentes; `alumnos` (curso_alumnos) con expand de user; `tutor` el usuario o null.
 */
export function toPeople(curso, asignaturas, alumnos) {
  const docentes = {}
  for (const a of asignaturas) {
    for (const u of a.expand?.docentes || []) (docentes[u.id] ||= { id: u.id, name: userName(u), codes: [] }).codes.push(a.codigo)
  }
  const tutor = curso.expand?.tutor
  if (tutor && !docentes[tutor.id]) docentes[tutor.id] = { id: tutor.id, name: userName(tutor), codes: [] }
  if (tutor) docentes[tutor.id].cargo = 'tutor'
  const estudiantes = alumnos
    .filter(a => !a.baja)
    .map(a => ({ id: a.user, name: userName(a.expand?.user) || 'Estudiante', cargo: a.cargo || null }))
  const byName = (x, y) => x.name.localeCompare(y.name, 'es')
  return { docentes: Object.values(docentes).sort(byName), estudiantes: estudiantes.sort(byName) }
}
