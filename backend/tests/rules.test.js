import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/*
 * Reglas de acceso de PocketBase contra un servidor de verdad: arranca backend/bin/pocketbase en una carpeta
 * temporal, aplica las migraciones y prueba qué puede hacer cada persona. Si no está el binario, se salta.
 */
const ROOT = new URL('..', import.meta.url).pathname
const BIN = join(ROOT, 'bin/pocketbase')
const PORT = 8790 + Math.floor(Math.random() * 100)
const BASE = `http://127.0.0.1:${PORT}`
const PASS = 'contraseña-de-prueba-1'

let dir, server, admin
const db = {}

async function api(token, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}
const as = token => ({
  get: p => api(token, 'GET', p),
  post: (c, b) => api(token, 'POST', `/api/collections/${c}/records`, b),
  patch: (c, id, b) => api(token, 'PATCH', `/api/collections/${c}/records/${id}`, b),
  del: (c, id) => api(token, 'DELETE', `/api/collections/${c}/records/${id}`),
  list: (c, q = '') => api(token, 'GET', `/api/collections/${c}/records?perPage=200${q}`),
})

async function login(collection, email) {
  const r = await api(null, 'POST', `/api/collections/${collection}/auth-with-password`, { identity: email, password: PASS })
  if (!r.ok) throw new Error('login ' + email + ': ' + JSON.stringify(r.data))
  return as(r.data.token)
}

describe.skipIf(!existsSync(BIN))('reglas de acceso de PocketBase', () => {
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'novaclass-pb-'))
    const args = ['--dir', join(dir, 'data'), '--migrationsDir', join(ROOT, 'pb_migrations')]
    const up = spawnSync(BIN, ['superuser', 'upsert', 'admin@test.local', PASS, ...args], { encoding: 'utf8' })
    if (up.status !== 0) throw new Error(up.stderr || up.stdout)
    server = spawn(BIN, ['serve', '--http', `127.0.0.1:${PORT}`, ...args], { stdio: 'ignore' })
    for (let i = 0; i < 50; i++) {
      const ok = await fetch(BASE + '/api/health').then(
        r => r.ok,
        () => false,
      )
      if (ok) break
      await new Promise(r => setTimeout(r, 100))
    }
    admin = await login('_superusers', 'admin@test.local')

    const sessions = [{ start: '15:00', end: '15:55' }]
    const g = async (name, code) => {
      const r = await admin.post('groups', { name, course: '26/27', join_code: code, sessions })
      if (!r.ok) throw new Error(JSON.stringify(r.data))
      return r.data
    }
    db.A = await g('1.º DAW A', 'DAWA2627')
    db.B = await g('1.º DAW B', 'DAWB2627')
    db.bd = (await admin.post('modules', { key: 'bd', code: 'BD', name: 'Bases de Datos', has_tasks: true })).data
    const user = async (email, group, role) =>
      (await admin.post('users', { email, password: PASS, passwordConfirm: PASS, name: email.split('@')[0], group: group.id, role })).data
    db.ana = await user('ana@test.local', db.A)
    db.luis = await user('luis@test.local', db.A)
    db.dele = await user('dele@test.local', db.A, 'delegado')
    db.bea = await user('bea@test.local', db.B)
    db.as = {}
    for (const n of ['ana', 'luis', 'dele', 'bea']) db.as[n] = await login('users', n + '@test.local')
  }, 30000)

  afterAll(() => {
    server?.kill()
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  const duda = (author, group, extra = {}) => ({
    group: group.id,
    module: db.bd.id,
    author: author.id,
    title: '¿LEFT JOIN o INNER JOIN?',
    body: 'Con INNER JOIN no me sale ningún socio.',
    tags: ['joins'],
    ...extra,
  })

  describe('usuarios y grupos', () => {
    it('nadie se pone rol ni grupo a sí mismo', async () => {
      expect((await db.as.ana.patch('users', db.ana.id, { role: 'profe' })).ok).toBe(false)
      expect((await db.as.ana.patch('users', db.ana.id, { group: db.B.id })).ok).toBe(false)
      expect((await db.as.ana.patch('users', db.ana.id, { name: 'Ana G.' })).ok).toBe(true)
    })

    it('registrarse no permite elegir rol ni grupo', async () => {
      const r = await api(null, 'POST', '/api/collections/users/records', {
        email: 'colado@test.local',
        password: PASS,
        passwordConfirm: PASS,
        role: 'profe',
      })
      expect(r.ok).toBe(false)
    })

    it('cada uno ve su grupo y no el código para unirse', async () => {
      const mine = await db.as.ana.list('groups')
      expect(mine.data.items.map(g => g.id)).toEqual([db.A.id])
      expect(mine.data.items[0].join_code).toBeUndefined()
      expect((await db.as.ana.get(`/api/collections/groups/records/${db.B.id}`)).ok).toBe(false)
    })

    it('solo se ve a la gente del propio grupo', async () => {
      const ids = (await db.as.ana.list('users')).data.items.map(u => u.id)
      expect(ids).toContain(db.luis.id)
      expect(ids).not.toContain(db.bea.id)
    })
  })

  describe('dudas', () => {
    it('se crean en el propio grupo y a nombre propio', async () => {
      expect((await db.as.ana.post('dudas', duda(db.ana, db.A))).ok).toBe(true)
      expect((await db.as.ana.post('dudas', duda(db.ana, db.B))).ok).toBe(false)
      expect((await db.as.ana.post('dudas', duda(db.luis, db.A))).ok).toBe(false)
      expect((await db.as.ana.post('dudas', duda(db.ana, db.A, { views: 999 }))).ok).toBe(false)
    })

    it('el formulario y la base de datos piden lo mismo (título de 10, explicación de 20)', async () => {
      expect((await db.as.ana.post('dudas', duda(db.ana, db.A, { title: 'corto' }))).ok).toBe(false)
      expect((await db.as.ana.post('dudas', duda(db.ana, db.A, { body: 'poco' }))).ok).toBe(false)
    })

    it('otro grupo no las ve', async () => {
      expect((await db.as.bea.list('dudas')).data.items).toHaveLength(0)
    })

    it('solo quien pregunta la edita, y sin tocar autor, grupo ni visitas', async () => {
      const d = (await db.as.ana.post('dudas', duda(db.ana, db.A))).data
      expect((await db.as.luis.patch('dudas', d.id, { title: 'Te la cambio yo, que sé más' })).ok).toBe(false)
      expect((await db.as.ana.patch('dudas', d.id, { title: '¿LEFT JOIN o NOT EXISTS?', edited: true })).ok).toBe(true)
      expect((await db.as.ana.patch('dudas', d.id, { author: db.luis.id })).ok).toBe(false)
      expect((await db.as.ana.patch('dudas', d.id, { views: 500 })).ok).toBe(false)
    })

    it('respuesta aceptada: solo una de la propia duda', async () => {
      const d1 = (await db.as.ana.post('dudas', duda(db.ana, db.A))).data
      const d2 = (await db.as.ana.post('dudas', duda(db.ana, db.A))).data
      const a1 = (await db.as.luis.post('answers', { duda: d1.id, author: db.luis.id, body: 'Usa LEFT JOIN y filtra NULL.' })).data
      const a2 = (await db.as.luis.post('answers', { duda: d2.id, author: db.luis.id, body: 'Otra cosa.' })).data
      expect((await db.as.ana.patch('dudas', d1.id, { accepted: a2.id })).ok).toBe(false)
      expect((await db.as.luis.patch('dudas', d1.id, { accepted: a1.id })).ok).toBe(false)
      expect((await db.as.ana.patch('dudas', d1.id, { accepted: a1.id })).ok).toBe(true)
    })

    it('borrada (deleted): solo la ve quien la escribió y no admite respuestas', async () => {
      const d = (await db.as.ana.post('dudas', duda(db.ana, db.A))).data
      expect((await db.as.ana.patch('dudas', d.id, { deleted: true })).ok).toBe(true)
      expect((await db.as.luis.list('dudas')).data.items.map(x => x.id)).not.toContain(d.id)
      expect((await db.as.ana.list('dudas')).data.items.map(x => x.id)).toContain(d.id)
      expect((await db.as.luis.post('answers', { duda: d.id, author: db.luis.id, body: 'Llego tarde' })).ok).toBe(false)
    })

    it('borrar de verdad: quien la escribió, no otro alumno', async () => {
      const d = (await db.as.ana.post('dudas', duda(db.ana, db.A))).data
      expect((await db.as.luis.del('dudas', d.id)).ok).toBe(false)
      expect((await db.as.ana.del('dudas', d.id)).ok).toBe(true)
    })
  })

  describe('votos', () => {
    it('un voto por persona y duda, y otro aparte por respuesta', async () => {
      const d = (await db.as.ana.post('dudas', duda(db.ana, db.A))).data
      const a = (await db.as.ana.post('answers', { duda: d.id, author: db.ana.id, body: 'Me respondo a mí misma.' })).data
      expect((await db.as.luis.post('votes', { user: db.luis.id, duda: d.id, value: 1 })).ok).toBe(true)
      expect((await db.as.luis.post('votes', { user: db.luis.id, duda: d.id, value: 1 })).ok).toBe(false)
      expect((await db.as.luis.post('votes', { user: db.luis.id, duda: d.id, answer: a.id, value: -1 })).ok).toBe(true)
      expect((await db.as.luis.post('votes', { user: db.ana.id, duda: d.id, value: 1 })).ok).toBe(false)
      expect((await db.as.luis.post('votes', { user: db.luis.id, duda: d.id, value: 5 })).ok).toBe(false)
      expect((await db.as.bea.post('votes', { user: db.bea.id, duda: d.id, value: 1 })).ok).toBe(false)

      const stats = (await db.as.ana.get(`/api/collections/dudas_stats/records/${d.id}`)).data
      expect(stats).toMatchObject({ votes: 1, answers: 1 })
      expect((await db.as.ana.get(`/api/collections/answers_stats/records/${a.id}`)).data.votes).toBe(-1)
    })

    it('no se vota una respuesta de otra duda', async () => {
      const d1 = (await db.as.ana.post('dudas', duda(db.ana, db.A))).data
      const d2 = (await db.as.ana.post('dudas', duda(db.ana, db.A))).data
      const a2 = (await db.as.ana.post('answers', { duda: d2.id, author: db.ana.id, body: 'Respuesta de d2' })).data
      expect((await db.as.luis.post('votes', { user: db.luis.id, duda: d1.id, answer: a2.id, value: 1 })).ok).toBe(false)
    })
  })

  describe('entregas, exámenes y estado propio', () => {
    const ev = group => ({
      group: group.id,
      module: db.bd.id,
      type: 'entrega',
      title: 'Modelo E/R biblioteca',
      date: '2026-10-09',
      time: '23:59',
    })

    it('las crea el delegado o el profe, no un alumno', async () => {
      expect((await db.as.ana.post('events', ev(db.A))).ok).toBe(false)
      expect((await db.as.dele.post('events', ev(db.A))).ok).toBe(true)
      expect((await db.as.dele.post('events', ev(db.B))).ok).toBe(false)
    })

    it('fecha y hora con formato fijo', async () => {
      expect((await db.as.dele.post('events', { ...ev(db.A), date: '9/10/2026' })).ok).toBe(false)
      expect((await db.as.dele.post('events', { ...ev(db.A), time: '23h' })).ok).toBe(false)
    })

    it('«hecha» y la nota son de cada uno', async () => {
      const e = (await db.as.dele.post('events', ev(db.A))).data
      expect((await db.as.ana.post('event_status', { user: db.ana.id, event: e.id, done: true, grade: '8,5' })).ok).toBe(true)
      expect((await db.as.ana.post('event_status', { user: db.ana.id, event: e.id, done: true })).ok).toBe(false)
      expect((await db.as.luis.post('event_status', { user: db.ana.id, event: e.id, done: false })).ok).toBe(false)
      expect((await db.as.luis.list('event_status')).data.items).toHaveLength(0)
      expect((await db.as.bea.post('event_status', { user: db.bea.id, event: e.id, done: true })).ok).toBe(false)
    })
  })

  describe('apuntes', () => {
    it('a nombre propio, sin inventarse descargas', async () => {
      const ap = { group: db.A.id, module: db.bd.id, author: db.ana.id, type: 'enlace', title: 'SQLBolt', url: 'https://sqlbolt.com' }
      const ok = await db.as.ana.post('apuntes', ap)
      expect(ok.ok).toBe(true)
      expect((await db.as.ana.post('apuntes', { ...ap, downloads: 100 })).ok).toBe(false)
      expect((await db.as.ana.patch('apuntes', ok.data.id, { downloads: 100 })).ok).toBe(false)
      expect((await db.as.luis.patch('apuntes', ok.data.id, { title: 'Mío ahora' })).ok).toBe(false)
      expect((await db.as.bea.list('apuntes')).data.items).toHaveLength(0)
    })
  })
})
