import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { client, HAS_PB, PASS, startPocketBase } from './server.js'

/* Cuentas creadas por la escuela (pb_hooks/cuentas.pb.js) contra un PocketBase de verdad. Sin binario, se salta. */
const SESSIONS = [{ start: '15:00', end: '15:55' }]
let pb, admin
const u = {}
const r = {}

async function make(c, body) {
  const res = await admin.post(c, body)
  if (!res.ok) throw new Error(`${c}: ${JSON.stringify(res.data)}`)
  return res.data
}

describe.skipIf(!HAS_PB)('cuentas de la escuela', () => {
  const call = (who, method, path, body) => (typeof who === 'string' ? u[who].as : who).api(method, path, body)
  const crear = (who, people) => call(who, 'POST', '/api/novaclass/cuentas', { people })
  const login = (identity, password) => client(pb.base).api('POST', '/api/collections/users/auth-with-password', { identity, password })

  beforeAll(async () => {
    pb = await startPocketBase()
    admin = pb.admin
    r.A = await make('schools', { name: 'Escuela Test', slug: 'escuelatest' })
    r.B = await make('schools', { name: 'Otra Escuela', slug: 'otraescuela' })
    for (const [n, school, role] of [
      ['dir', r.A, 'docente'],
      ['coord', r.A, 'docente'],
      ['tut', r.A, 'docente'],
      ['doc', r.A, 'docente'],
      ['otro', r.B, 'docente'],
    ]) {
      u[n] = await make('users', { email: n + '@test.local', password: PASS, passwordConfirm: PASS, name: n, school: school.id, role })
      u[n].as = await pb.login('users', n + '@test.local')
    }
    await make('school_staff', { school: r.A.id, user: u.dir.id, role: 'director' })
    await make('school_staff', { school: r.A.id, user: u.coord.id, role: 'coordinador' })
    await make('school_staff', { school: r.B.id, user: u.otro.id, role: 'director' })
    r.C = await make('cursos', { school: r.A.id, name: '1.º DAW A', course: '26/27', sessions: SESSIONS, tutor: u.tut.id })
    r.C2 = await make('cursos', { school: r.A.id, name: '2.º DAW A', course: '26/27', sessions: SESSIONS })
    r.CB = await make('cursos', { school: r.B.id, name: '1.º SMX', course: '26/27', sessions: SESSIONS })
  }, 60000)
  afterAll(() => pb?.stop())

  it('la dirección crea una cuenta con usuario@escuela y contraseña temporal, y la pone en su curso', async () => {
    const res = await crear('dir', [{ nombre: 'Sergi', apellidos: 'Coll Pastor', nia: '1001', role: 'estudiante', curso: r.C.id }])
    expect(res.status).toBe(200)
    const [c] = res.data.created
    expect(c).toMatchObject({ name: 'Sergi Coll Pastor', username: 'scollp@escuelatest', role: 'estudiante' })
    expect(c.password).toMatch(/^[a-z2-9]{10}$/)
    const rec = (await admin.one('users', c.id)).data
    expect(rec).toMatchObject({ nombre: 'Sergi', apellidos: 'Coll Pastor', nia: '1001', school: r.A.id, must_change_password: true })
    const al = (await admin.list('curso_alumnos', `&filter=${encodeURIComponent(`user='${c.id}'`)}`)).data.items
    expect(al.map(a => a.curso)).toEqual([r.C.id])
    expect((await login('scollp@escuelatest', c.password)).ok).toBe(true)
    u.sergi = { id: c.id, password: c.password }
  })

  it('una lista entera; los usuarios repetidos llevan número y las partículas van con el apellido', async () => {
    const res = await crear('coord', [
      { nombre: 'Sara', apellidos: 'Coll Prats', nia: '1002', role: 'estudiante', curso: r.C.id },
      { nombre: 'Dustin', apellidos: 'de Lara Garcia', role: 'docente' },
      { nombre: 'María José', apellidos: 'Núñez', nia: '1003', role: 'estudiante', curso: r.C2.id },
    ])
    expect(res.data.created.map(c => c.username)).toEqual(['scollp2@escuelatest', 'ddelarag@escuelatest', 'mnunez@escuelatest'])
  })

  it('si alguna fila está mal no se crea ninguna, y se dice cuál', async () => {
    const before = (await admin.list('users')).data.totalItems
    const res = await crear('dir', [
      { nombre: 'Bien', apellidos: 'Hecho Del Todo', role: 'estudiante', curso: r.C.id },
      { nombre: '', apellidos: 'Sin Nombre', role: 'estudiante', curso: r.C.id },
      { nombre: 'Sin', apellidos: 'Curso', role: 'estudiante' },
      { nombre: 'Curso', apellidos: 'Ajeno', role: 'estudiante', curso: r.CB.id },
      { nombre: 'NIA', apellidos: 'Repetido', nia: '1001', role: 'estudiante', curso: r.C.id },
      { nombre: 'Rol', apellidos: 'Raro', role: 'director' },
    ])
    expect(res.status).toBe(400)
    expect(res.data.data.rows.map(x => x.index)).toEqual([1, 2, 3, 4, 5])
    expect((await admin.list('users')).data.totalItems).toBe(before)
  })

  it('no crea cuentas quien no es de la dirección, ni nadie se registra solo', async () => {
    for (const who of ['tut', 'doc']) expect((await crear(who, [{ nombre: 'X', apellidos: 'Y', role: 'docente' }])).status, who).toBe(403)
    expect((await client(pb.base).post('users', { email: 'x@test.local', password: PASS, passwordConfirm: PASS })).ok).toBe(false)
    /* La dirección de otra escuela las crea en la suya, nunca en esta */
    const res = await crear('otro', [{ nombre: 'Xisca', apellidos: 'Bauzà', role: 'estudiante', curso: r.C.id }])
    expect(res.status).toBe(400)
  })

  it('al cambiar su contraseña deja de tener que cambiarla; a mano no se lo quita', async () => {
    const me = client(pb.base, (await login('scollp@escuelatest', u.sergi.password)).data.token)
    expect((await me.patch('users', u.sergi.id, { must_change_password: false })).ok).toBe(false)
    const res = await me.patch('users', u.sergi.id, {
      oldPassword: u.sergi.password,
      password: 'mi-clave-nueva',
      passwordConfirm: 'mi-clave-nueva',
    })
    expect(res.ok).toBe(true)
    expect((await admin.one('users', u.sergi.id)).data.must_change_password).toBe(false)
    expect((await login('scollp@escuelatest', 'mi-clave-nueva')).ok).toBe(true)
  })

  it('contraseña nueva: el Tutor para su alumnado, la dirección para cualquiera de la escuela', async () => {
    const path = id => `/api/novaclass/cuentas/${id}/clave`
    const tut = await call('tut', 'POST', path(u.sergi.id))
    expect(tut.status).toBe(200)
    expect((await admin.one('users', u.sergi.id)).data.must_change_password).toBe(true)
    expect((await login('scollp@escuelatest', 'mi-clave-nueva')).ok).toBe(false)
    expect((await login('scollp@escuelatest', tut.data.password)).ok).toBe(true)
    const doc = await call('dir', 'POST', path(u.doc.id))
    expect(doc.status).toBe(200)
    /* Se cierran sus sesiones: vuelve a entrar con la temporal */
    expect((await u.doc.as.api('POST', '/api/collections/users/auth-refresh')).status).toBe(401)
    u.doc.as = client(pb.base, (await login('doc@test.local', doc.data.password)).data.token)
    expect((await call('tut', 'POST', path(u.doc.id))).status).toBe(403) // Docente: solo la dirección
    expect((await call('doc', 'POST', path(u.sergi.id))).status).toBe(403)
    expect((await call('otro', 'POST', path(u.sergi.id))).status).toBe(403)
    const maria = (await admin.list('users', `&filter=${encodeURIComponent("username='mnunez@escuelatest'")}`)).data.items[0]
    expect((await call('tut', 'POST', path(maria.id))).status).toBe(403) // de otro curso
  })

  it('el NIA lo ven la dirección y el Tutor del curso', async () => {
    const path = `/api/novaclass/cursos/${r.C.id}/nias`
    expect((await call('tut', 'GET', path)).data[u.sergi.id]).toBe('1001')
    expect((await call('coord', 'GET', path)).data[u.sergi.id]).toBe('1001')
    for (const who of ['doc', 'otro']) expect((await call(who, 'GET', path)).status, who).toBe(403)
  })
})
