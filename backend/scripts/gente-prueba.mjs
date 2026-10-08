#!/usr/bin/env node
/*
 * Gente y datos de prueba para NovaClass (docs/escuelas.md, «Gente de prueba»).
 *
 *   PB_ADMIN_EMAIL=… PB_ADMIN_PASS=… node backend/scripts/gente-prueba.mjs crear
 *   PB_ADMIN_EMAIL=… PB_ADMIN_PASS=… node backend/scripts/gente-prueba.mjs borrar
 *
 * crear: cuentas @prueba.novaclass en Sant Josep Obrer (1.º DAW A) con cada cargo, otra escuela con su gente, y los
 *        datos de ejemplo de la app (temas, entregas, exámenes, dudas con respuestas y votos, apuntes) en 1.º DAW A.
 * borrar: quita todo lo que creó «crear» (lo apunta en un manifiesto) y deja Sant Josep Obrer como estaba.
 *
 * PB_URL (por defecto http://127.0.0.1:8091) y PRUEBA_MANIFEST (por defecto backend/pb_data/prueba.json).
 * Nunca se ejecuta solo: no va en las migraciones para que no acabe en producción.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { APUNTES, DUDAS, EVENTS, TEMAS } from '../../src/data/seed.js'

export const PASSWORD = 'prueba-novaclass'
const HERE = dirname(new URL(import.meta.url).pathname)
const PB_URL = (process.env.PB_URL || 'http://127.0.0.1:8091').replace(/\/$/, '')
const MANIFEST = process.env.PRUEBA_MANIFEST || join(HERE, '../pb_data/prueba.json')

/* Quién es quién. Los nombres de los Estudiantes son los autores de las dudas de ejemplo. */
export const PEOPLE = {
  director: { name: 'Joana Mascaró Vich', role: 'director' },
  tutor: { name: 'Catalina Vidal Ripoll', role: 'docente', cargo: 'tutor' },
  docente1: { name: 'Toni Ferrer Sastre', role: 'docente' },
  docente2: { name: 'Marga Pons Alzina', role: 'docente' },
  delegado: { name: 'Aina Pons Mir', role: 'estudiante', cargo: 'delegado' },
  subdelegado: { name: 'Laia Coll Font', role: 'estudiante', cargo: 'subdelegado' },
  estudiante1: { name: 'Marta Rosselló Bauzà', role: 'estudiante' },
  estudiante2: { name: 'Joan Riera Tous', role: 'estudiante' },
  estudiante3: { name: 'Iker Martí Roca', role: 'estudiante' },
  'otra-direccion': { name: 'Pere Amengual Coll', role: 'director', otra: true },
  otra: { name: 'Xisca Bauzà Pujol', role: 'estudiante', otra: true },
}
export const email = key => `${key}@prueba.novaclass`

/* Autores de los datos de ejemplo → cuentas de prueba (las respuestas de profes, a los Docentes de prueba) */
const AUTHOR = {
  Dracko: 'estudiante3',
  'Marta Rosselló': 'estudiante1',
  'Joan Riera': 'estudiante2',
  'Iker Martí': 'estudiante3',
  'Aina Pons': 'delegado',
  'Laia Coll': 'subdelegado',
  'Pau Mascaró': 'estudiante2',
  'Santiago Gómez': 'docente1',
  'Dustin de Lara': 'docente2',
  'Miquel Àngel Montero': 'tutor',
  'Pau Boixader': 'docente1',
}

/* Un PDF mínimo y válido para los apuntes de tipo PDF */
function tinyPdf(title) {
  const text = title.replace(/[()\\]/g, '')
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  const stream = `BT /F1 18 Tf 72 760 Td (${text}) Tj ET\nBT /F1 11 Tf 72 730 Td (Apunte de prueba de NovaClass) Tj ET`
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  let out = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new Blob([out], { type: 'application/pdf' })
}

async function call(token, method, path, body) {
  const isForm = body instanceof FormData
  const res = await fetch(PB_URL + path, {
    method,
    headers: { ...(token ? { Authorization: token } : {}), ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`)
  return data
}

async function adminToken() {
  const { PB_ADMIN_EMAIL, PB_ADMIN_PASS } = process.env
  if (!PB_ADMIN_EMAIL || !PB_ADMIN_PASS) throw new Error('Faltan PB_ADMIN_EMAIL y PB_ADMIN_PASS (cuenta de superuser de PocketBase).')
  return (
    await call(null, 'POST', '/api/collections/_superusers/auth-with-password', { identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASS })
  ).token
}

const filter = f => `?perPage=500&filter=${encodeURIComponent(f)}`

export async function crear() {
  if (existsSync(MANIFEST)) throw new Error(`Ya hay gente de prueba (${MANIFEST}). Bórrala antes con «borrar».`)
  const T = await adminToken()
  const made = { users: [], schools: [], events: [], topics: [], dudas: [], apuntes: [] }
  const save = () => writeFileSync(MANIFEST, JSON.stringify(made, null, 2))
  const create = async (c, body) => {
    const r = await call(T, 'POST', `/api/collections/${c}/records`, body)
    if (made[c]) made[c].push(r.id)
    save()
    return r
  }
  save() // el manifiesto existe desde el principio: si algo falla a medias, «borrar» limpia lo que llegó a crearse

  const sjo = (await call(T, 'GET', '/api/collections/schools/records' + filter("name='Sant Josep Obrer'"))).items[0]
  if (!sjo) throw new Error('No está Sant Josep Obrer: ¿se han aplicado las migraciones?')
  const group = (await call(T, 'GET', '/api/collections/groups/records' + filter(`school='${sjo.id}' && name='1.º DAW A'`))).items[0]
  const modules = Object.fromEntries((await call(T, 'GET', '/api/collections/modules/records?perPage=50')).items.map(m => [m.key, m.id]))

  /* Cuentas */
  const user = {}
  for (const [key, p] of Object.entries(PEOPLE)) {
    user[key] = await create('users', { email: email(key), password: PASSWORD, passwordConfirm: PASSWORD, name: p.name, verified: true })
  }

  /* Sant Josep Obrer: dirección y 1.º DAW A */
  await create('school_staff', { school: sjo.id, user: user.director.id, role: 'director' })
  for (const [key, p] of Object.entries(PEOPLE)) {
    if (p.otra || p.role === 'director') continue
    await create('memberships', { group: group.id, user: user[key].id, role: p.role, cargo: p.cargo || '' })
  }

  /* Otra escuela (sin verificar): quien la crea queda como Director por el hook */
  const otra = await create('schools', { name: 'Escuela de Prueba', city: 'Inca', created_by: user['otra-direccion'].id })
  const smx = await call(T, 'POST', '/api/collections/groups/records', {
    school: otra.id,
    name: '1.º SMX A',
    course: '26/27',
    sessions: [{ start: '08:00', end: '08:55' }],
  })
  await create('memberships', { group: smx.id, user: user.otra.id, role: 'estudiante' })

  /* Datos de ejemplo de la app en 1.º DAW A */
  for (const [key, temas] of Object.entries(TEMAS)) {
    for (const [i, [title, status]] of temas.entries()) {
      await create('topics', { group: group.id, module: modules[key], title, status, order: i })
    }
  }

  const dudaId = {}
  for (const d of DUDAS) {
    const author = user[AUTHOR[d.author]]
    const duda = await create('dudas', {
      group: group.id,
      module: modules[d.subject],
      author: author.id,
      title: d.title,
      body: d.body,
      code: d.code || '',
      tags: d.tags,
      views: d.views,
    })
    dudaId[d.id] = duda.id
    const answerId = {}
    for (const a of d.answers) {
      const ans = await create('answers', {
        duda: duda.id,
        author: user[AUTHOR[a.author]].id,
        body: a.body,
        code: a.code || '',
        after: a.after || '',
      })
      answerId[a.id] = ans.id
      await vote(a.votes, ans.author, { duda: duda.id, answer: ans.id })
    }
    if (d.accepted) await call(T, 'PATCH', `/api/collections/dudas/records/${duda.id}`, { accepted: answerId[d.accepted] })
    await vote(d.votes, author.id, { duda: duda.id })
  }

  /* Votos: tantos «+1» como votos tenía en el ejemplo, hasta la gente de la clase que haya (sin votarse a uno mismo) */
  async function vote(n, authorId, target) {
    const voters = Object.entries(PEOPLE)
      .filter(([k, p]) => !p.otra && p.role !== 'director' && user[k].id !== authorId)
      .slice(0, Math.max(0, n))
    for (const [k] of voters) await create('votes', { user: user[k].id, value: 1, ...target })
  }

  for (const e of EVENTS) {
    const ev = await create('events', {
      group: group.id,
      module: e.subject ? modules[e.subject] : '',
      type: e.type,
      title: e.title,
      date: e.date,
      time: e.time || '',
      end: e.end || '',
      tema: e.tema || '',
      kind: e.kind || '',
      files: e.files || '',
      where: e.where || '',
      topics: e.topics || null,
      about: e.about || '',
      related: e.related ? dudaId[e.related] || '' : '',
    })
    /* Lo que el ejemplo daba por hecho (y su nota), como estado de Marta */
    if (e.done || e.grade) await create('event_status', { user: user.estudiante1.id, event: ev.id, done: !!e.done, grade: e.grade || '' })
  }

  for (const a of APUNTES) {
    const author = user[AUTHOR[a.author]]
    if (a.type === 'pdf') {
      const form = new FormData()
      for (const [k, v] of Object.entries({
        group: group.id,
        module: modules[a.subject],
        author: author.id,
        type: 'pdf',
        title: a.title,
        tema: a.tema,
      })) {
        form.append(k, v)
      }
      form.append('downloads', String(a.downloads || 0))
      form.append('file', tinyPdf(a.title), a.title.replace(/[^\w]+/g, '_').slice(0, 40) + '.pdf')
      await create('apuntes', form)
    } else {
      await create('apuntes', {
        group: group.id,
        module: modules[a.subject],
        author: author.id,
        type: a.type,
        title: a.title,
        tema: a.tema,
        url: a.url || '',
        body: a.body || '',
        downloads: a.downloads || 0,
      })
    }
  }

  save()
  return {
    users: made.users.length,
    dudas: made.dudas.length,
    events: made.events.length,
    topics: made.topics.length,
    apuntes: made.apuntes.length,
  }
}

export async function borrar() {
  if (!existsSync(MANIFEST)) return { borrado: false }
  const T = await adminToken()
  const made = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  const del = async (c, id) => {
    try {
      await call(T, 'DELETE', `/api/collections/${c}/records/${id}`)
    } catch (err) {
      if (!String(err.message).includes('→ 404')) throw err // ya no estaba (borrado en cascada)
    }
  }
  /* Primero el contenido (las respuestas y votos caen con sus dudas), luego las escuelas y al final la gente */
  for (const c of ['apuntes', 'dudas', 'events', 'topics', 'schools', 'users']) {
    for (const id of [...(made[c] || [])].reverse()) await del(c, id)
  }
  rmSync(MANIFEST)
  return { borrado: true }
}

/* Uso desde la terminal */
if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const cmd = process.argv[2]
  const run = cmd === 'crear' ? crear : cmd === 'borrar' ? borrar : null
  if (!run) {
    console.log('Uso: node backend/scripts/gente-prueba.mjs crear | borrar')
    process.exit(1)
  }
  run().then(
    r => {
      console.log(
        cmd === 'crear'
          ? `Hecho: ${JSON.stringify(r)}. Contraseña de todas las cuentas: ${PASSWORD}`
          : r.borrado
            ? 'Gente de prueba borrada.'
            : 'No había gente de prueba.',
      )
    },
    err => {
      console.error(err.message)
      process.exit(1)
    },
  )
}
