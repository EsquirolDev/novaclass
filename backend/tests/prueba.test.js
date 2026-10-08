import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DUDAS, EVENTS } from '../../src/data/seed.js'
import { HAS_PB, PASS, startPocketBase } from './server.js'

/* El script de gente de prueba (backend/scripts/gente-prueba.mjs) contra un PocketBase temporal */
let pb, script, before
const q = f => `&filter=${encodeURIComponent(f)}`
const count = async (c, f = '') => (await pb.admin.list(c, f ? q(f) : '')).data.totalItems

describe.skipIf(!HAS_PB)('gente de prueba', () => {
  beforeAll(async () => {
    pb = await startPocketBase()
    process.env.PB_URL = pb.base
    process.env.PB_ADMIN_EMAIL = 'admin@test.local'
    process.env.PB_ADMIN_PASS = PASS
    process.env.PRUEBA_MANIFEST = join(mkdtempSync(join(tmpdir(), 'novaclass-prueba-')), 'prueba.json')
    script = await import('../scripts/gente-prueba.mjs')
    before = (await pb.admin.list('asignaturas', '&sort=codigo')).data.items.map(a => [a.codigo, a.docentes])
    await script.crear()
  }, 60000)
  afterAll(() => pb?.stop())

  const as = key => pb.loginWith(script.email(key), script.PASSWORD)

  it('crea cada cargo en Sant Josep Obrer con su usuario de la escuela', async () => {
    const one = async key => (await pb.admin.list('users', q(`email='${script.email(key)}'`))).data.items[0]
    const tutor = await one('tutor')
    expect(tutor).toMatchObject({ username: 'cvidalr@santjosepobrer', role: 'docente', must_change_password: false })
    const curso = (await pb.admin.list('cursos', q("name='1.º DAW A'"))).data.items[0]
    expect(curso.tutor).toBe(tutor.id)
    expect(await count('curso_alumnos', `curso='${curso.id}' && cargo='delegado'`)).toBe(1)
    expect(await count('curso_alumnos', `curso='${curso.id}' && cargo='subdelegado'`)).toBe(1)
    expect(await count('school_staff', `user='${(await one('director')).id}' && role='director'`)).toBe(1)
    expect(await count('school_staff', `user='${(await one('coordinador')).id}' && role='coordinador'`)).toBe(1)
    const bd = (await pb.admin.list('asignaturas', q("codigo='BD'"))).data.items[0]
    expect(bd.docentes).toContain(tutor.id)
    expect(bd.docentes.length).toBeGreaterThan(1) // el de verdad sigue
  })

  it('carga los datos de ejemplo en las asignaturas', async () => {
    expect(await count('dudas')).toBe(DUDAS.length)
    expect(await count('answers')).toBe(DUDAS.reduce((n, d) => n + d.answers.length, 0))
    expect(await count('events')).toBe(EVENTS.filter(e => e.type !== 'festivo').length)
    expect(await count('festivos')).toBe(EVENTS.filter(e => e.type === 'festivo').length)
    expect(await count('apuntes', "type='pdf' && file != ''")).toBeGreaterThan(0)
    expect(await count('dudas', "accepted != ''")).toBe(DUDAS.filter(d => d.accepted).length)
  })

  it('las cuentas entran (también con usuario@escuela) y los permisos se cumplen con estos datos', async () => {
    const est = await as('estudiante1')
    expect((await est.list('dudas')).data.totalItems).toBe(DUDAS.length)
    expect((await est.list('event_status')).data.totalItems).toBeGreaterThan(0)
    const byUser = await pb.loginWith('mrossellob@santjosepobrer', script.PASSWORD)
    expect((await byUser.list('dudas')).data.totalItems).toBe(DUDAS.length)
    /* Sin código no ve el contenido de las asignaturas, aunque sí su curso y el horario */
    const sin = await as('estudiante3')
    expect((await sin.list('dudas')).data.totalItems).toBe(0)
    expect((await sin.list('horario')).data.totalItems).toBe(31)
    const doc = await as('docente1')
    expect((await doc.list('events')).data.items.length).toBe(EVENTS.filter(e => e.subject === 'pro' || e.subject === 'si').length)
    const otra = await as('otra')
    expect((await otra.list('dudas')).data.totalItems).toBe(0)
    expect((await otra.list('events')).data.totalItems).toBe(0)
    const otraDir = await as('otra-direccion')
    expect((await otraDir.list('cursos')).data.items.map(g => g.name)).toEqual(['1.º SMX A'])
  })

  it('borrar deja Sant Josep Obrer como estaba', async () => {
    await script.borrar()
    expect(await count('users', "email ~ '@prueba.novaclass'")).toBe(0)
    for (const c of [
      'dudas',
      'answers',
      'votes',
      'events',
      'event_status',
      'topics',
      'apuntes',
      'festivos',
      'school_staff',
      'curso_alumnos',
      'inscripciones',
    ])
      expect(await count(c), c).toBe(0)
    expect(await count('schools')).toBe(1)
    expect(await count('users')).toBe(10)
    expect((await pb.admin.list('cursos')).data.items.map(c => [c.name, c.tutor])).toEqual([['1.º DAW A', '']])
    expect((await pb.admin.list('asignaturas', '&sort=codigo')).data.items.map(a => [a.codigo, a.docentes])).toEqual(before)
    expect(await count('horario')).toBe(31)
  })
})
