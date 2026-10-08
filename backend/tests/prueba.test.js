import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DUDAS, EVENTS } from '../../src/data/seed.js'
import { HAS_PB, PASS, startPocketBase } from './server.js'

/* El script de gente de prueba (backend/scripts/gente-prueba.mjs) contra un PocketBase temporal */
let pb, script
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
    await script.crear()
  }, 60000)
  afterAll(() => pb?.stop())

  const as = key => pb.loginWith(script.email(key), script.PASSWORD)

  it('crea cada cargo en 1.º DAW A y la dirección de Sant Josep Obrer', async () => {
    const tutor = (await pb.admin.list('users', q("email='tutor@prueba.novaclass'"))).data.items[0]
    const m = (await pb.admin.list('memberships', q(`user='${tutor.id}'`) + '&expand=group')).data.items
    expect(m.map(x => [x.expand.group.name, x.role, x.cargo])).toEqual([['1.º DAW A', 'docente', 'tutor']])
    expect(await count('memberships', "cargo='delegado'")).toBe(1)
    expect(await count('memberships', "cargo='subdelegado'")).toBe(1)
    const dir = (await pb.admin.list('users', q("email='director@prueba.novaclass'"))).data.items[0]
    expect(await count('school_staff', `user='${dir.id}'`)).toBe(1)
  })

  it('carga los datos de ejemplo en la clase', async () => {
    expect(await count('dudas')).toBe(DUDAS.length)
    expect(await count('answers')).toBe(DUDAS.reduce((n, d) => n + d.answers.length, 0))
    expect(await count('events')).toBe(EVENTS.length)
    expect(await count('apuntes', "type='pdf' && file != ''")).toBeGreaterThan(0)
    expect(await count('dudas', "accepted != ''")).toBe(DUDAS.filter(d => d.accepted).length)
  })

  it('las cuentas entran y los permisos se cumplen con estos datos', async () => {
    const est = await as('estudiante1')
    expect((await est.list('dudas')).data.totalItems).toBe(DUDAS.length)
    expect((await est.list('event_status')).data.totalItems).toBeGreaterThan(0)
    const otra = await as('otra')
    expect((await otra.list('dudas')).data.totalItems).toBe(0)
    expect((await otra.list('events')).data.totalItems).toBe(0)
    const otraDir = await as('otra-direccion')
    expect((await otraDir.list('groups')).data.items.map(g => g.name)).toEqual(['1.º SMX A'])
  })

  it('borrar deja Sant Josep Obrer como estaba', async () => {
    await script.borrar()
    expect(await count('users', "email ~ '@prueba.novaclass'")).toBe(0)
    for (const c of ['dudas', 'answers', 'votes', 'events', 'event_status', 'topics', 'apuntes', 'school_staff'])
      expect(await count(c), c).toBe(0)
    expect(await count('schools')).toBe(1)
    expect(await count('memberships')).toBe(10)
    expect(await count('memberships', "user = ''")).toBe(10)
    expect(await count('schedule')).toBe(31)
  })
})
