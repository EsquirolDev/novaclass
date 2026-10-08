import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { HAS_PB, PASS, startPocketBase } from './server.js'

/*
 * Reglas de acceso de PocketBase contra un servidor de verdad (docs/escuelas.md, tabla «Quién puede hacer qué»).
 * Crea dos escuelas con su gente y prueba lo que cada cargo puede y no puede hacer. Sin binario, se salta.
 */
const SESSIONS = [{ start: '15:00', end: '15:55' }]

let pb, admin
const u = {} // usuarios: { id, as }
const r = {} // registros

/* Crea con el admin y falla en voz alta: los datos de partida tienen que existir sí o sí */
async function make(c, body) {
  const res = await admin.post(c, body)
  if (!res.ok) throw new Error(`${c}: ${JSON.stringify(res.data)}`)
  return res.data
}
const ids = res => (res.data?.items || []).map(x => x.id)

describe.skipIf(!HAS_PB)('reglas de acceso de PocketBase', () => {
  beforeAll(async () => {
    pb = await startPocketBase()
    admin = pb.admin

    for (const n of ['dir', 'tut', 'doc', 'del', 'sub', 'est', 'est2', 'otro', 'ajeno']) {
      u[n] = await make('users', { email: n + '@test.local', password: PASS, passwordConfirm: PASS, name: n })
      u[n].as = await pb.login('users', n + '@test.local')
    }
    /* Dos escuelas: Sant Josep Obrer (dir) y otra (otro). El hook hace Director a quien la crea. */
    r.sjo = (await u.dir.as.post('schools', { name: 'Sant Josep Obrer', city: 'Palma', created_by: u.dir.id })).data
    r.otra = (await u.otro.as.post('schools', { name: 'Otra Escuela', created_by: u.otro.id })).data
    r.A = await make('groups', { school: r.sjo.id, name: '1.º DAW A', course: '26/27', sessions: SESSIONS })
    r.A2 = await make('groups', { school: r.sjo.id, name: '2.º DAW A', course: '26/27', sessions: SESSIONS })
    r.O = await make('groups', { school: r.otra.id, name: '1.º SMX', course: '26/27', sessions: SESSIONS })
    const m = (g, user, role, cargo) => make('memberships', { group: g.id, user: user.id, role, cargo })
    r.mTut = await m(r.A, u.tut, 'docente', 'tutor')
    r.mDoc = await m(r.A, u.doc, 'docente')
    r.mDel = await m(r.A, u.del, 'estudiante', 'delegado')
    r.mSub = await m(r.A, u.sub, 'estudiante', 'subdelegado')
    r.mEst = await m(r.A, u.est, 'estudiante')
    r.mEst2 = await m(r.A, u.est2, 'estudiante')
    r.mEst2b = await m(r.A2, u.est2, 'estudiante')
    r.mAjeno = await m(r.O, u.ajeno, 'estudiante')
    /* Los módulos ya vienen de los datos de arranque */
    r.bd = (await admin.list('modules', `&filter=${encodeURIComponent("key='bd'")}`)).data.items[0]
  }, 30000)

  afterAll(() => pb?.stop())

  const duda = (author, group, extra = {}) => ({
    group: group.id,
    module: r.bd.id,
    author: author.id,
    title: '¿LEFT JOIN o INNER JOIN?',
    body: 'Con INNER JOIN no me sale ningún socio.',
    tags: ['joins'],
    ...extra,
  })

  describe('escuelas', () => {
    it('quien crea una escuela queda como Director', async () => {
      const staff = await u.dir.as.list('school_staff', `&filter=${encodeURIComponent(`school='${r.sjo.id}'`)}`)
      expect(staff.data.items.map(s => [s.user, s.role])).toEqual([[u.dir.id, 'director']])
    })

    it('nadie verifica su propia escuela: solo la administración', async () => {
      expect((await u.est.as.post('schools', { name: 'Mi escuela', created_by: u.est.id, verified: true })).ok).toBe(false)
      expect((await u.dir.as.patch('schools', r.sjo.id, { verified: true })).ok).toBe(false)
      expect((await admin.patch('schools', r.sjo.id, { verified: true })).ok).toBe(true)
    })

    it('no se crea una escuela a nombre de otro', async () => {
      expect((await u.est.as.post('schools', { name: 'Suplantada', created_by: u.dir.id })).ok).toBe(false)
    })

    it('la edita su Director, no el de otra escuela ni un Docente', async () => {
      expect((await u.dir.as.patch('schools', r.sjo.id, { city: 'Palma de Mallorca' })).ok).toBe(true)
      expect((await u.otro.as.patch('schools', r.sjo.id, { city: 'Otra' })).ok).toBe(false)
      expect((await u.tut.as.patch('schools', r.sjo.id, { city: 'Otra' })).ok).toBe(false)
    })

    it('un Director añade a otro Director; nadie más', async () => {
      expect((await u.tut.as.post('school_staff', { school: r.sjo.id, user: u.tut.id, role: 'director' })).ok).toBe(false)
      expect((await u.otro.as.post('school_staff', { school: r.sjo.id, user: u.otro.id, role: 'director' })).ok).toBe(false)
      const add = await u.dir.as.post('school_staff', { school: r.sjo.id, user: u.doc.id, role: 'director' })
      expect(add.ok).toBe(true)
      expect((await u.dir.as.del('school_staff', add.data.id)).ok).toBe(true)
    })
  })

  describe('clases', () => {
    it('las crea la dirección de la escuela, no otra dirección ni el Tutor', async () => {
      const g = { name: '1.º SMX B', course: '26/27', sessions: SESSIONS }
      const made = await u.dir.as.post('groups', { ...g, school: r.sjo.id })
      expect(made.ok, JSON.stringify(made.data)).toBe(true)
      expect((await u.otro.as.post('groups', { ...g, school: r.sjo.id })).ok).toBe(false)
      expect((await u.tut.as.post('groups', { ...g, school: r.sjo.id })).ok).toBe(false)
    })

    it('el código para unirse lo genera PocketBase (8 caracteres sin O/0 ni I/1)', async () => {
      expect((await admin.one('groups', r.A.id)).data.join_code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
    })

    it('cada uno ve sus clases (varias si está en varias) y nunca el código', async () => {
      expect(ids(await u.est.as.list('groups'))).toEqual([r.A.id])
      expect(ids(await u.est2.as.list('groups')).sort()).toEqual([r.A.id, r.A2.id].sort())
      expect(ids(await u.ajeno.as.list('groups'))).toEqual([r.O.id])
      expect((await u.est.as.one('groups', r.A.id)).data.join_code).toBeUndefined()
    })

    it('la dirección ve todas las clases de su escuela', async () => {
      const mine = ids(await u.dir.as.list('groups'))
      expect(mine).toEqual(expect.arrayContaining([r.A.id, r.A2.id]))
      expect(mine).not.toContain(r.O.id)
    })

    it('el Tutor ajusta su clase (franjas), un Estudiante no', async () => {
      expect((await u.tut.as.patch('groups', r.A.id, { sessions: [...SESSIONS, { start: '15:55', end: '16:50' }] })).ok).toBe(true)
      expect((await u.est.as.patch('groups', r.A.id, { name: 'Mía' })).ok).toBe(false)
      expect((await u.tut.as.patch('groups', r.A.id, { school: r.otra.id })).ok).toBe(false)
    })
  })

  describe('personas y cargos', () => {
    it('solo se ve a la gente de las propias clases', async () => {
      const seen = ids(await u.est.as.list('users'))
      expect(seen).toEqual(expect.arrayContaining([u.tut.id, u.doc.id, u.del.id]))
      expect(seen).not.toContain(u.ajeno.id)
      expect(seen).not.toContain(u.otro.id)
    })

    it('el Tutor añade gente; un Estudiante o un Docente no', async () => {
      const nueva = { group: r.A.id, role: 'docente', pending_name: 'Antoni Morell Bennàser' }
      expect((await u.est.as.post('memberships', nueva)).ok).toBe(false)
      expect((await u.doc.as.post('memberships', nueva)).ok).toBe(false)
      const ok = await u.tut.as.post('memberships', nueva)
      expect(ok.ok).toBe(true)
      expect((await u.tut.as.del('memberships', ok.data.id)).ok).toBe(true)
    })

    it('un Docente sin cuenta necesita al menos su nombre', async () => {
      expect((await u.tut.as.post('memberships', { group: r.A.id, role: 'docente' })).ok).toBe(false)
    })

    it('el Tutor nombra Delegado, pero no Tutor; la dirección sí nombra Tutor', async () => {
      expect((await u.tut.as.patch('memberships', r.mDel.id, { cargo: '' })).ok).toBe(true)
      expect((await u.tut.as.patch('memberships', r.mEst.id, { cargo: 'delegado' })).ok).toBe(true)
      expect((await u.tut.as.patch('memberships', r.mEst.id, { cargo: '' })).ok).toBe(true)
      expect((await u.tut.as.patch('memberships', r.mDel.id, { cargo: 'delegado' })).ok).toBe(true)
      expect((await u.tut.as.patch('memberships', r.mDoc.id, { cargo: 'tutor' })).ok).toBe(false)
      expect((await u.tut.as.patch('memberships', r.mTut.id, { cargo: '' })).ok).toBe(false)
      expect((await u.dir.as.patch('memberships', r.mTut.id, { cargo: '' })).ok).toBe(true)
      expect((await u.dir.as.patch('memberships', r.mTut.id, { cargo: 'tutor' })).ok).toBe(true)
    })

    it('un solo Tutor, Delegado y Subdelegado por clase', async () => {
      expect((await u.dir.as.patch('memberships', r.mDoc.id, { cargo: 'tutor' })).ok).toBe(false)
      expect((await u.tut.as.patch('memberships', r.mEst.id, { cargo: 'delegado' })).ok).toBe(false)
      expect((await u.tut.as.patch('memberships', r.mEst.id, { cargo: 'subdelegado' })).ok).toBe(false)
    })

    it('el Tutor es Docente; el Delegado y el Subdelegado, Estudiantes', async () => {
      expect((await u.dir.as.patch('memberships', r.mTut.id, { role: 'estudiante' })).ok).toBe(false)
      expect((await u.tut.as.patch('memberships', r.mDel.id, { role: 'docente' })).ok).toBe(false)
    })

    it('una persona una sola vez por clase', async () => {
      expect((await u.tut.as.post('memberships', { group: r.A.id, user: u.est.id, role: 'estudiante' })).ok).toBe(false)
    })

    it('nadie se hace Docente ni Delegado a sí mismo', async () => {
      expect((await u.est.as.patch('memberships', r.mEst.id, { role: 'docente' })).ok).toBe(false)
      expect((await u.est.as.patch('memberships', r.mEst.id, { cargo: 'delegado' })).ok).toBe(false)
      expect((await u.est.as.post('memberships', { group: r.A2.id, user: u.est.id, role: 'docente' })).ok).toBe(false)
    })

    it('la dirección de otra escuela no toca tus clases', async () => {
      expect((await u.otro.as.post('memberships', { group: r.A.id, user: u.otro.id, role: 'docente' })).ok).toBe(false)
      expect(ids(await u.otro.as.list('memberships'))).not.toContain(r.mEst.id)
    })

    it('cualquiera puede salirse de una clase', async () => {
      const extra = await make('memberships', { group: r.A2.id, user: u.est.id, role: 'estudiante' })
      expect((await u.est.as.del('memberships', extra.id)).ok).toBe(true)
    })
  })

  describe('horario, temas, entregas y exámenes', () => {
    const ev = (g, extra = {}) => ({
      group: g.id,
      module: r.bd.id,
      type: 'entrega',
      title: 'Modelo E/R biblioteca',
      date: '2026-10-09',
      time: '23:59',
      ...extra,
    })

    it('los gestionan Docentes, Tutor, Delegado, Subdelegado y Director', async () => {
      for (const n of ['tut', 'doc', 'del', 'sub', 'dir']) {
        expect((await u[n].as.post('events', ev(r.A, { title: 'Hecho por ' + n }))).ok, n).toBe(true)
      }
    })

    it('un Estudiante, alguien de otra clase o de otra escuela no', async () => {
      expect((await u.est.as.post('events', ev(r.A))).ok).toBe(false)
      expect((await u.ajeno.as.post('events', ev(r.A))).ok).toBe(false)
      expect((await u.otro.as.post('events', ev(r.A))).ok).toBe(false)
      expect((await u.del.as.post('events', ev(r.A2))).ok).toBe(false)
    })

    it('fecha y hora con formato fijo', async () => {
      expect((await u.doc.as.post('events', ev(r.A, { date: '9/10/2026' }))).ok).toBe(false)
      expect((await u.doc.as.post('events', ev(r.A, { time: '23h' }))).ok).toBe(false)
    })

    it('el horario apunta a un Docente de la clase', async () => {
      const s = await u.del.as.post('schedule', { group: r.A.id, day: 1, slot: 0, module: r.bd.id, teacher: r.mDoc.id })
      expect(s.ok).toBe(true)
      expect((await u.est.as.patch('schedule', s.data.id, { day: 2 })).ok).toBe(false)
      expect((await u.del.as.patch('schedule', s.data.id, { day: 2 })).ok).toBe(true)
    })

    it('«hecha» y la nota son de cada uno', async () => {
      const e = (await u.doc.as.post('events', ev(r.A))).data
      expect((await u.est.as.post('event_status', { user: u.est.id, event: e.id, done: true, grade: '8,5' })).ok).toBe(true)
      expect((await u.est.as.post('event_status', { user: u.est.id, event: e.id, done: true })).ok).toBe(false)
      expect((await u.del.as.post('event_status', { user: u.est.id, event: e.id, done: false })).ok).toBe(false)
      expect((await u.doc.as.list('event_status')).data.items).toHaveLength(0)
      expect((await u.ajeno.as.post('event_status', { user: u.ajeno.id, event: e.id, done: true })).ok).toBe(false)
    })
  })

  describe('dudas', () => {
    it('se crean en una clase propia y a nombre propio', async () => {
      expect((await u.est.as.post('dudas', duda(u.est, r.A))).ok).toBe(true)
      expect((await u.est.as.post('dudas', duda(u.est, r.A2))).ok).toBe(false)
      expect((await u.est.as.post('dudas', duda(u.del, r.A))).ok).toBe(false)
      expect((await u.est.as.post('dudas', duda(u.est, r.A, { views: 999 }))).ok).toBe(false)
      expect((await u.dir.as.post('dudas', duda(u.dir, r.A))).ok).toBe(false)
    })

    it('mismos mínimos que el formulario (título de 10, explicación de 20)', async () => {
      expect((await u.est.as.post('dudas', duda(u.est, r.A, { title: 'corto' }))).ok).toBe(false)
      expect((await u.est.as.post('dudas', duda(u.est, r.A, { body: 'poco' }))).ok).toBe(false)
    })

    it('las ven su clase y su dirección, no otra clase ni otra escuela', async () => {
      const d = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      expect(ids(await u.doc.as.list('dudas'))).toContain(d.id)
      expect(ids(await u.dir.as.list('dudas'))).toContain(d.id)
      expect(ids(await u.ajeno.as.list('dudas'))).not.toContain(d.id)
      expect(ids(await u.otro.as.list('dudas'))).not.toContain(d.id)
    })

    it('solo quien pregunta la edita, sin tocar autor, clase ni visitas', async () => {
      const d = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      expect((await u.doc.as.patch('dudas', d.id, { title: 'Te la cambio yo, que sé más' })).ok).toBe(false)
      expect((await u.est.as.patch('dudas', d.id, { title: '¿LEFT JOIN o NOT EXISTS?', edited: true })).ok).toBe(true)
      expect((await u.est.as.patch('dudas', d.id, { author: u.del.id })).ok).toBe(false)
      expect((await u.est.as.patch('dudas', d.id, { views: 500 })).ok).toBe(false)
    })

    it('respuesta aceptada: solo una de la propia duda', async () => {
      const d1 = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      const d2 = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      const a1 = (await u.del.as.post('answers', { duda: d1.id, author: u.del.id, body: 'Usa LEFT JOIN y filtra NULL.' })).data
      const a2 = (await u.del.as.post('answers', { duda: d2.id, author: u.del.id, body: 'Otra cosa.' })).data
      expect((await u.est.as.patch('dudas', d1.id, { accepted: a2.id })).ok).toBe(false)
      expect((await u.del.as.patch('dudas', d1.id, { accepted: a1.id })).ok).toBe(false)
      expect((await u.est.as.patch('dudas', d1.id, { accepted: a1.id })).ok).toBe(true)
    })

    it('borrada (deleted): solo la ve quien la escribió y no admite respuestas', async () => {
      const d = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      expect((await u.est.as.patch('dudas', d.id, { deleted: true })).ok).toBe(true)
      expect(ids(await u.del.as.list('dudas'))).not.toContain(d.id)
      expect(ids(await u.est.as.list('dudas'))).toContain(d.id)
      expect((await u.del.as.post('answers', { duda: d.id, author: u.del.id, body: 'Llego tarde' })).ok).toBe(false)
    })

    it('moderar: Docentes y Director borran; Delegado y otros Estudiantes no', async () => {
      for (const [n, ok] of [
        ['est2', false],
        ['del', false],
        ['otro', false],
        ['doc', true],
      ]) {
        const d = (await u.est.as.post('dudas', duda(u.est, r.A))).data
        expect((await u[n].as.del('dudas', d.id)).ok, n).toBe(ok)
      }
      const d = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      expect((await u.dir.as.del('dudas', d.id)).ok).toBe(true)
    })
  })

  describe('votos', () => {
    it('un voto por persona y duda, y otro aparte por respuesta', async () => {
      const d = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      const a = (await u.est.as.post('answers', { duda: d.id, author: u.est.id, body: 'Me respondo a mí misma.' })).data
      expect((await u.del.as.post('votes', { user: u.del.id, duda: d.id, value: 1 })).ok).toBe(true)
      expect((await u.del.as.post('votes', { user: u.del.id, duda: d.id, value: 1 })).ok).toBe(false)
      expect((await u.del.as.post('votes', { user: u.del.id, duda: d.id, answer: a.id, value: -1 })).ok).toBe(true)
      expect((await u.del.as.post('votes', { user: u.est.id, duda: d.id, value: 1 })).ok).toBe(false)
      expect((await u.del.as.post('votes', { user: u.del.id, duda: d.id, value: 5 })).ok).toBe(false)
      expect((await u.ajeno.as.post('votes', { user: u.ajeno.id, duda: d.id, value: 1 })).ok).toBe(false)

      const stats = (await u.est.as.one('dudas_stats', d.id)).data
      expect(stats).toMatchObject({ votes: 1, answers: 1 })
      expect((await u.est.as.one('answers_stats', a.id)).data.votes).toBe(-1)
    })

    it('no se vota una respuesta de otra duda', async () => {
      const d1 = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      const d2 = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      const a2 = (await u.est.as.post('answers', { duda: d2.id, author: u.est.id, body: 'Respuesta de d2' })).data
      expect((await u.del.as.post('votes', { user: u.del.id, duda: d1.id, answer: a2.id, value: 1 })).ok).toBe(false)
    })
  })

  describe('apuntes', () => {
    it('a nombre propio, sin inventarse descargas, y los modera un Docente', async () => {
      const ap = { group: r.A.id, module: r.bd.id, author: u.est.id, type: 'enlace', title: 'SQLBolt', url: 'https://sqlbolt.com' }
      const ok = await u.est.as.post('apuntes', ap)
      expect(ok.ok).toBe(true)
      expect((await u.est.as.post('apuntes', { ...ap, downloads: 100 })).ok).toBe(false)
      expect((await u.est.as.patch('apuntes', ok.data.id, { downloads: 100 })).ok).toBe(false)
      expect((await u.del.as.patch('apuntes', ok.data.id, { title: 'Mío ahora' })).ok).toBe(false)
      expect(ids(await u.ajeno.as.list('apuntes'))).not.toContain(ok.data.id)
      expect((await u.del.as.del('apuntes', ok.data.id)).ok).toBe(false)
      expect((await u.doc.as.del('apuntes', ok.data.id)).ok).toBe(true)
    })
  })

  describe('contadores y PDF protegidos', () => {
    const pdf = () => new Blob(['%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n'], { type: 'application/pdf' })
    async function subirPdf(who) {
      const form = new FormData()
      for (const [k, v] of Object.entries({ group: r.A.id, module: r.bd.id, author: u[who].id, type: 'pdf', title: 'Resumen JOINs' }))
        form.append(k, v)
      form.append('file', pdf(), 'joins.pdf')
      const res = await fetch(pb.base + '/api/collections/apuntes/records', {
        method: 'POST',
        headers: { Authorization: u[who].as.token },
        body: form,
      })
      return res.json()
    }
    const post = (who, path) =>
      fetch(pb.base + path, { method: 'POST', headers: who ? { Authorization: u[who].as.token } : {} }).then(async x => ({
        status: x.status,
        data: await x.json().catch(() => null),
      }))

    it('abrir un apunte suma una descarga solo a quien puede verlo', async () => {
      const ap = await subirPdf('est')
      expect((await post('del', `/api/novaclass/apuntes/${ap.id}/abierto`)).data.downloads).toBe(1)
      expect((await post('dir', `/api/novaclass/apuntes/${ap.id}/abierto`)).data.downloads).toBe(2)
      expect((await post('ajeno', `/api/novaclass/apuntes/${ap.id}/abierto`)).status).toBe(404)
      expect((await post(null, `/api/novaclass/apuntes/${ap.id}/abierto`)).status).toBe(401)
      expect((await admin.one('apuntes', ap.id)).data.downloads).toBe(2)
    })

    it('abrir una duda suma una visita; una borrada solo la cuenta su autor', async () => {
      const d = (await u.est.as.post('dudas', duda(u.est, r.A))).data
      expect((await post('doc', `/api/novaclass/dudas/${d.id}/visita`)).data.views).toBe(1)
      expect((await post('otro', `/api/novaclass/dudas/${d.id}/visita`)).status).toBe(404)
      await u.est.as.patch('dudas', d.id, { deleted: true })
      expect((await post('doc', `/api/novaclass/dudas/${d.id}/visita`)).status).toBe(404)
    })

    it('un PDF no se descarga sin token de archivo; con el de alguien de la clase, sí', async () => {
      const ap = await subirPdf('est')
      const url = `${pb.base}/api/files/apuntes/${ap.id}/${ap.file}`
      expect((await fetch(url)).status).toBeGreaterThanOrEqual(400)
      const token = async who => (await u[who].as.api('POST', '/api/files/token')).data.token
      expect((await fetch(url + '?token=' + (await token('del')))).status).toBe(200)
      expect((await fetch(url + '?token=' + (await token('ajeno')))).status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('unirse con código', () => {
    const call = (who, method, path, body) =>
      fetch(pb.base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: u[who].as.token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      }).then(async x => ({ status: x.status, data: await x.json().catch(() => null) }))
    let nueva
    beforeAll(async () => {
      nueva = await make('users', { email: 'nueva@test.local', password: PASS, passwordConfirm: PASS, name: 'Nueva' })
      u.nueva = { ...nueva, as: await pb.login('users', 'nueva@test.local') }
    })

    it('el Tutor y la dirección ven el código; un Estudiante, un Docente o la otra escuela no', async () => {
      const code = (await admin.one('groups', r.A.id)).data.join_code
      expect((await call('tut', 'GET', `/api/novaclass/clases/${r.A.id}/codigo`)).data.code).toBe(code)
      expect((await call('dir', 'GET', `/api/novaclass/clases/${r.A.id}/codigo`)).data.code).toBe(code)
      for (const who of ['est', 'doc', 'del', 'otro'])
        expect((await call(who, 'GET', `/api/novaclass/clases/${r.A.id}/codigo`)).status, who).toBe(403)
      expect((await call(null, 'GET', `/api/novaclass/clases/${r.A.id}/codigo`)).status).toBe(401)
    })

    it('con el código se entra como Estudiante (escrito como sea); dos veces no duplica', async () => {
      const code = (await call('tut', 'GET', `/api/novaclass/clases/${r.A.id}/codigo`)).data.code
      const messy = ' ' + code.slice(0, 4).toLowerCase() + '-' + code.slice(4) + ' '
      const first = await call('nueva', 'POST', '/api/novaclass/unirse', { code: messy })
      expect(first.data).toMatchObject({ group: r.A.id, name: '1.º DAW A', already: false })
      expect((await call('nueva', 'POST', '/api/novaclass/unirse', { code })).data.already).toBe(true)
      const mine = (await admin.list('memberships', `&filter=${encodeURIComponent(`user='${nueva.id}'`)}`)).data.items
      expect(mine.map(m => [m.group, m.role, m.cargo])).toEqual([[r.A.id, 'estudiante', '']])
      expect(ids(await u.nueva.as.list('dudas')).length).toBeGreaterThan(0)
    })

    it('un código que no existe o mal formado no entra', async () => {
      expect((await call('nueva', 'POST', '/api/novaclass/unirse', { code: 'ZZZZZZZZ' })).status).toBe(404)
      expect((await call('nueva', 'POST', '/api/novaclass/unirse', { code: 'ABC' })).status).toBe(400)
      expect((await call(null, 'POST', '/api/novaclass/unirse', { code: 'ZZZZZZZZ' })).status).toBe(401)
    })

    it('al cambiar el código, el anterior deja de servir; solo lo cambian Tutor o dirección', async () => {
      const old = (await call('tut', 'GET', `/api/novaclass/clases/${r.A.id}/codigo`)).data.code
      expect((await call('est', 'POST', `/api/novaclass/clases/${r.A.id}/codigo`)).status).toBe(403)
      const fresh = (await call('tut', 'POST', `/api/novaclass/clases/${r.A.id}/codigo`)).data.code
      expect(fresh).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
      expect(fresh).not.toBe(old)
      expect((await call('ajeno', 'POST', '/api/novaclass/unirse', { code: old })).status).toBe(404)
      expect((await call('ajeno', 'POST', '/api/novaclass/unirse', { code: fresh })).status).toBe(200)
    })
  })
})
