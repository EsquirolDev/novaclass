import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { client, HAS_PB, PASS, startPocketBase } from './server.js'

/*
 * Reglas de acceso del modelo v2 contra un PocketBase de verdad (docs/escuelas.md). Dos escuelas de prueba con su
 * gente: dirección, Tutor, Docentes, alumnado de dos cursos y alguien de otra escuela. Sin binario, se salta.
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

describe.skipIf(!HAS_PB)('reglas de acceso (modelo v2)', () => {
  function call(who, method, path, body) {
    return fetch(pb.base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: u[who].as.token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }).then(async x => ({ status: x.status, data: await x.json().catch(() => null) }))
  }
  const codeOf = async as => (await admin.one('asignaturas', as.id)).data.join_code

  beforeAll(async () => {
    pb = await startPocketBase()
    admin = pb.admin
    r.A = await make('schools', { name: 'Escuela Test', slug: 'escuelatest', verified: true })
    r.B = await make('schools', { name: 'Otra Escuela', slug: 'otraescuela' })
    const people = {
      dir: [r.A, 'docente'],
      coord: [r.A, 'docente'],
      tut: [r.A, 'docente'],
      doc: [r.A, 'docente'],
      doc2: [r.A, 'docente'],
      est: [r.A, 'estudiante'],
      est2: [r.A, 'estudiante'],
      est3: [r.A, 'estudiante'],
      del: [r.A, 'estudiante'],
      out: [r.A, 'estudiante'],
      otro: [r.B, 'docente'],
      ajeno: [r.B, 'estudiante'],
    }
    for (const [n, [school, role]] of Object.entries(people)) {
      u[n] = await make('users', {
        email: n + '@test.local',
        username: n + '@' + school.slug,
        password: PASS,
        passwordConfirm: PASS,
        name: n,
        nombre: n,
        school: school.id,
        role,
      })
      u[n].as = await pb.login('users', n + '@test.local')
    }
    await make('school_staff', { school: r.A.id, user: u.dir.id, role: 'director' })
    await make('school_staff', { school: r.A.id, user: u.coord.id, role: 'coordinador' })
    await make('school_staff', { school: r.B.id, user: u.otro.id, role: 'director' })
    r.C1 = await make('cursos', { school: r.A.id, name: '1.º DAW A', course: '26/27', sessions: SESSIONS, tutor: u.tut.id })
    r.C2 = await make('cursos', { school: r.A.id, name: '2.º DAW A', course: '26/27', sessions: SESSIONS })
    r.CB = await make('cursos', { school: r.B.id, name: '1.º SMX', course: '26/27', sessions: SESSIONS })
    r.aEst = await make('curso_alumnos', { curso: r.C1.id, user: u.est.id })
    r.aEst2 = await make('curso_alumnos', { curso: r.C1.id, user: u.est2.id })
    r.aEst3 = await make('curso_alumnos', { curso: r.C1.id, user: u.est3.id })
    r.aDel = await make('curso_alumnos', { curso: r.C1.id, user: u.del.id, cargo: 'delegado' })
    await make('curso_alumnos', { curso: r.C2.id, user: u.out.id })
    await make('curso_alumnos', { curso: r.CB.id, user: u.ajeno.id })
    const asig = (curso, school, codigo, docentes) =>
      make('asignaturas', {
        school: school.id,
        curso: curso.id,
        nombre: codigo,
        codigo,
        color: 'azul',
        forma: 'circle',
        docentes,
        activa: true,
      })
    r.X = await asig(r.C1, r.A, 'PRO', [u.doc.id])
    r.Y = await asig(r.C1, r.A, 'BD', [u.tut.id])
    r.Z = await asig(r.CB, r.B, 'SMX', [u.otro.id])
    r.h = await make('horario', { curso: r.C1.id, day: 1, slot: 0, asignatura: r.X.id, docente: u.doc.id })
    /* est y del entran en PRO con el código; est2 no */
    const code = await codeOf(r.X)
    for (const n of ['est', 'del']) {
      const res = await call(n, 'POST', '/api/novaclass/unirse', { code })
      if (res.status !== 200) throw new Error('unirse: ' + JSON.stringify(res.data))
    }
  }, 60000)
  afterAll(() => pb?.stop())

  describe('cuentas', () => {
    it('nadie se registra solo', async () => {
      const res = await client(pb.base).post('users', { email: 'colado@test.local', password: PASS, passwordConfirm: PASS })
      expect(res.ok).toBe(false)
    })

    it('se entra con el usuario de la escuela (usuario@escuela)', async () => {
      const res = await client(pb.base).api('POST', '/api/collections/users/auth-with-password', {
        identity: 'est@escuelatest',
        password: PASS,
      })
      expect(res.ok).toBe(true)
      expect(res.data.record.username).toBe('est@escuelatest')
    })

    it('cada uno cambia su contraseña, pero no quién es ni dónde está', async () => {
      for (const field of [
        { role: 'docente' },
        { school: r.B.id },
        { username: 'otro@escuelatest' },
        { name: 'Otro' },
        { apellidos: 'X' },
      ]) {
        expect((await u.est.as.patch('users', u.est.id, field)).ok, JSON.stringify(field)).toBe(false)
      }
      /* El NIA es un campo oculto: si se manda, no cambia */
      await u.est.as.patch('users', u.est.id, { nia: '123' })
      expect((await admin.one('users', u.est.id)).data.nia).toBe('')
      const res = await u.est2.as.patch('users', u.est2.id, {
        oldPassword: PASS,
        password: PASS + 'x',
        passwordConfirm: PASS + 'x',
      })
      expect(res.ok).toBe(true)
      u.est2.as = await pb.loginWith('est2@test.local', PASS + 'x')
    })

    it('se ve a la gente de la escuela, no a la de otra; el NIA no sale', async () => {
      await admin.patch('users', u.est.id, { nia: 'NIA-123' })
      const seen = await u.est.as.list('users')
      expect(ids(seen)).toEqual(expect.arrayContaining([u.doc.id, u.out.id]))
      expect(ids(seen)).not.toContain(u.ajeno.id)
      expect(seen.data.items.find(x => x.id === u.est.id).nia).toBeUndefined()
    })
  })

  describe('escuela y cursos', () => {
    it('la dirección edita su escuela, pero ni se la verifica ni cambia su nombre corto', async () => {
      expect((await u.dir.as.patch('schools', r.A.id, { city: 'Palma' })).ok).toBe(true)
      expect((await u.dir.as.patch('schools', r.A.id, { verified: false })).ok).toBe(false)
      expect((await u.dir.as.patch('schools', r.A.id, { slug: 'otro' })).ok).toBe(false)
      expect((await u.otro.as.patch('schools', r.A.id, { city: 'X' })).ok).toBe(false)
    })

    it('los cursos los crea la dirección (Director o Coordinador), no un Docente ni otra escuela', async () => {
      const c = { school: r.A.id, name: '1.º SMX', course: '26/27', sessions: SESSIONS }
      expect((await u.coord.as.post('cursos', c)).ok).toBe(true)
      expect((await u.doc.as.post('cursos', c)).ok).toBe(false)
      expect((await u.otro.as.post('cursos', c)).ok).toBe(false)
    })

    it('el Tutor es Docente de la escuela', async () => {
      expect((await u.dir.as.patch('cursos', r.C2.id, { tutor: u.est.id })).ok).toBe(false)
      expect((await admin.patch('cursos', r.C2.id, { tutor: u.otro.id })).ok).toBe(false)
    })

    it('en un curso solo hay Estudiantes de la escuela, y los pone la dirección', async () => {
      expect((await u.dir.as.post('curso_alumnos', { curso: r.C2.id, user: u.doc.id })).ok).toBe(false)
      expect((await u.dir.as.post('curso_alumnos', { curso: r.C2.id, user: u.ajeno.id })).ok).toBe(false)
      expect((await u.tut.as.post('curso_alumnos', { curso: r.C2.id, user: u.est2.id })).ok).toBe(false)
      expect((await u.dir.as.post('curso_alumnos', { curso: r.C2.id, user: u.est2.id })).ok).toBe(true)
    })

    it('el Tutor nombra Delegado y Subdelegado; la baja del curso la da la dirección', async () => {
      expect((await u.tut.as.patch('curso_alumnos', r.aEst.id, { cargo: 'subdelegado' })).ok).toBe(true)
      expect((await u.tut.as.patch('curso_alumnos', r.aEst2.id, { cargo: 'subdelegado' })).ok).toBe(false) // ya hay uno
      expect((await u.tut.as.patch('curso_alumnos', r.aEst.id, { baja: true })).ok).toBe(false)
      expect((await u.est.as.patch('curso_alumnos', r.aEst.id, { cargo: 'delegado' })).ok).toBe(false)
      expect((await u.tut.as.patch('curso_alumnos', r.aEst.id, { cargo: '' })).ok).toBe(true)
    })

    it('otra escuela no ve los cursos ni su alumnado', async () => {
      expect(ids(await u.ajeno.as.list('cursos'))).toEqual([r.CB.id])
      expect(ids(await u.ajeno.as.list('curso_alumnos'))).not.toContain(r.aEst.id)
    })
  })

  describe('asignaturas y horario', () => {
    it('las asignaturas las crea la dirección; sus Docentes cambian la etiqueta, no el curso ni los Docentes', async () => {
      const nueva = { school: r.A.id, curso: r.C1.id, nombre: 'X', codigo: 'X', color: 'rosa', forma: 'star' }
      expect((await u.doc.as.post('asignaturas', nueva)).ok).toBe(false)
      expect((await u.doc.as.patch('asignaturas', r.X.id, { color: 'rosa', forma: 'star', codigo: 'PROG' })).ok).toBe(true)
      expect((await u.doc.as.patch('asignaturas', r.X.id, { curso: r.C2.id })).ok).toBe(false)
      expect((await u.doc.as.patch('asignaturas', r.X.id, { docentes: [u.doc.id, u.doc2.id] })).ok).toBe(false)
      expect((await u.doc2.as.patch('asignaturas', r.X.id, { color: 'lima' })).ok).toBe(false)
    })

    it('los Docentes de una asignatura son Docentes de la escuela', async () => {
      expect((await u.dir.as.patch('asignaturas', r.Y.id, { docentes: [u.otro.id] })).ok).toBe(false)
      expect((await u.dir.as.patch('asignaturas', r.Y.id, { docentes: [u.est.id] })).ok).toBe(false)
    })

    it('el horario lo monta la dirección, con asignaturas del curso y sus Docentes', async () => {
      const h = extra => ({ curso: r.C1.id, day: 2, slot: 0, asignatura: r.X.id, docente: u.doc.id, ...extra })
      expect((await u.doc.as.post('horario', h())).ok).toBe(false)
      expect((await u.dir.as.post('horario', h({ curso: r.C2.id }))).ok).toBe(false) // asignatura de otro curso
      expect((await u.dir.as.post('horario', h({ docente: u.doc2.id }))).ok).toBe(false)
      expect((await u.coord.as.post('horario', h())).ok).toBe(true)
    })

    it('el horario lo ve la escuela; otra escuela no', async () => {
      expect(ids(await u.out.as.list('horario'))).toContain(r.h.id)
      expect(ids(await u.ajeno.as.list('horario'))).not.toContain(r.h.id)
    })
  })

  describe('código de cada asignatura', () => {
    it('lo ven sus Docentes y la dirección; ni el alumnado ni otros Docentes', async () => {
      const code = await codeOf(r.X)
      const path = `/api/novaclass/asignaturas/${r.X.id}/codigo`
      expect((await call('doc', 'GET', path)).data.code).toBe(code)
      expect((await call('coord', 'GET', path)).data.code).toBe(code)
      for (const who of ['est', 'doc2', 'tut', 'otro']) expect((await call(who, 'GET', path)).status, who).toBe(403)
    })

    it('con el código entra el alumnado del curso (escrito como sea); de otro curso u otra escuela no', async () => {
      const code = await codeOf(r.X)
      const res = await call('est3', 'POST', '/api/novaclass/unirse', { code: code.toLowerCase().slice(0, 4) + '-' + code.slice(4) })
      expect(res.data).toMatchObject({ asignatura: r.X.id, curso: r.C1.id, already: false })
      expect((await call('est3', 'POST', '/api/novaclass/unirse', { code })).data.already).toBe(true)
      expect((await call('out', 'POST', '/api/novaclass/unirse', { code })).status).toBe(403) // de 2.º
      expect((await call('doc2', 'POST', '/api/novaclass/unirse', { code })).status).toBe(403) // Docente
      expect((await call('ajeno', 'POST', '/api/novaclass/unirse', { code })).status).toBe(404)
      await admin.patch('curso_alumnos', r.aEst3.id, { baja: true })
      expect((await call('est3', 'POST', '/api/novaclass/unirse', { code })).status).toBe(403) // baja del curso
      await admin.patch('curso_alumnos', r.aEst3.id, { baja: false })
      await admin.patch('asignaturas', r.Y.id, { activa: false })
      expect((await call('est', 'POST', '/api/novaclass/unirse', { code: await codeOf(r.Y) })).status).toBe(400) // sin espacio
      await admin.patch('asignaturas', r.Y.id, { activa: true })
      expect((await call('est3', 'POST', '/api/novaclass/unirse', { code: 'ZZZZZZZZ' })).status).toBe(404)
      expect((await u.est2.as.post('inscripciones', { asignatura: r.X.id, user: u.est2.id })).ok).toBe(false)
    })

    it('al cambiar el código, el anterior deja de servir', async () => {
      const before = await codeOf(r.Y)
      const path = `/api/novaclass/asignaturas/${r.Y.id}/codigo`
      expect((await call('doc', 'POST', path)).status).toBe(403)
      const fresh = (await call('tut', 'POST', path)).data.code
      expect(fresh).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
      expect(fresh).not.toBe(before)
      expect((await call('est2', 'POST', '/api/novaclass/unirse', { code: before })).status).toBe(404)
    })
  })

  describe('contenido de la asignatura', () => {
    const ev = extra => ({ asignatura: r.X.id, type: 'entrega', title: 'Bucles', date: '2026-10-09', time: '23:59', ...extra })
    const duda = (who, extra = {}) => ({
      asignatura: r.X.id,
      author: u[who].id,
      title: '¿LEFT JOIN o INNER JOIN?',
      body: 'Con INNER JOIN no me sale ningún socio.',
      ...extra,
    })

    it('entregas y exámenes: los gestionan sus Docentes, la dirección y el Delegado inscrito', async () => {
      for (const who of ['doc', 'dir', 'del']) expect((await u[who].as.post('events', ev({ title: 'De ' + who }))).ok, who).toBe(true)
      for (const who of ['est', 'doc2', 'tut', 'otro']) expect((await u[who].as.post('events', ev())).ok, who).toBe(false)
    })

    it('solo lo ve quien ha entrado con el código, sus Docentes y la dirección', async () => {
      const e = (await u.doc.as.post('events', ev({ title: 'Visible?' }))).data
      for (const who of ['est', 'del', 'doc', 'coord']) expect(ids(await u[who].as.list('events')), who).toContain(e.id)
      for (const who of ['est2', 'doc2', 'ajeno']) expect(ids(await u[who].as.list('events')), who).not.toContain(e.id)
    })

    it('«hecha» y nota: cada uno lo suyo, y solo de lo que puede ver', async () => {
      const e = (await u.doc.as.post('events', ev())).data
      expect((await u.est.as.post('event_status', { user: u.est.id, event: e.id, done: true, grade: '8,5' })).ok).toBe(true)
      expect((await u.est2.as.post('event_status', { user: u.est2.id, event: e.id, done: true })).ok).toBe(false)
      expect((await u.del.as.post('event_status', { user: u.est.id, event: e.id, done: true })).ok).toBe(false)
      expect((await u.doc.as.list('event_status')).data.items).toHaveLength(0)
    })

    it('dudas: pregunta quien está dentro y a nombre propio; moderan sus Docentes y la dirección', async () => {
      expect((await u.est.as.post('dudas', duda('est'))).ok).toBe(true)
      expect((await u.est2.as.post('dudas', duda('est2'))).ok).toBe(false)
      expect((await u.est.as.post('dudas', duda('del'))).ok).toBe(false)
      for (const [who, ok] of [
        ['del', false],
        ['doc2', false],
        ['doc', true],
        ['dir', true],
      ]) {
        const d = (await u.est.as.post('dudas', duda('est'))).data
        expect((await u[who].as.del('dudas', d.id)).ok, who).toBe(ok)
      }
    })

    it('respuesta aceptada de la propia duda, un voto por persona y estadísticas', async () => {
      const d = (await u.est.as.post('dudas', duda('est'))).data
      const a = (await u.doc.as.post('answers', { duda: d.id, author: u.doc.id, body: 'Usa LEFT JOIN.' })).data
      expect((await u.del.as.patch('dudas', d.id, { accepted: a.id })).ok).toBe(false)
      expect((await u.est.as.patch('dudas', d.id, { accepted: a.id })).ok).toBe(true)
      expect((await u.del.as.post('votes', { user: u.del.id, duda: d.id, value: 1 })).ok).toBe(true)
      expect((await u.del.as.post('votes', { user: u.del.id, duda: d.id, value: 1 })).ok).toBe(false)
      expect((await u.est2.as.post('votes', { user: u.est2.id, duda: d.id, value: 1 })).ok).toBe(false)
      expect((await u.est.as.one('dudas_stats', d.id)).data).toMatchObject({ votes: 1, answers: 1 })
    })

    it('apuntes: a nombre propio, sin inventarse descargas; el PDF solo con token', async () => {
      const form = new FormData()
      for (const [k, v] of Object.entries({ asignatura: r.X.id, author: u.est.id, type: 'pdf', title: 'Resumen' })) form.append(k, v)
      form.append('file', new Blob(['%PDF-1.4\n%%EOF\n'], { type: 'application/pdf' }), 'r.pdf')
      const res = await fetch(pb.base + '/api/collections/apuntes/records', {
        method: 'POST',
        headers: { Authorization: u.est.as.token },
        body: form,
      })
      const ap = await res.json()
      expect(ap.id).toBeTruthy()
      const url = `${pb.base}/api/files/apuntes/${ap.id}/${ap.file}`
      expect((await fetch(url)).status).toBeGreaterThanOrEqual(400)
      const token = async who => (await u[who].as.api('POST', '/api/files/token')).data.token
      expect((await fetch(url + '?token=' + (await token('del')))).status).toBe(200)
      expect((await fetch(url + '?token=' + (await token('est2')))).status).toBeGreaterThanOrEqual(400)
      expect((await u.est.as.patch('apuntes', ap.id, { downloads: 100 })).ok).toBe(false)
      expect((await call('del', 'POST', `/api/novaclass/apuntes/${ap.id}/abierto`)).data.downloads).toBe(1)
      expect((await call('est2', 'POST', `/api/novaclass/apuntes/${ap.id}/abierto`)).status).toBe(404)
    })

    it('festivos: los pone la dirección y los ve la escuela', async () => {
      expect((await u.doc.as.post('festivos', { school: r.A.id, title: 'Fiesta', date: '2026-10-12' })).ok).toBe(false)
      const f = await u.dir.as.post('festivos', { school: r.A.id, title: 'Fiesta Nacional', date: '2026-10-12' })
      expect(f.ok).toBe(true)
      expect(ids(await u.est.as.list('festivos'))).toContain(f.data.id)
      expect(ids(await u.ajeno.as.list('festivos'))).not.toContain(f.data.id)
    })
  })
})
