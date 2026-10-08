import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SCHEDULE, SESSIONS, TEACHERS } from '../../src/data/seed.js'
import { MODULE_ORDER, subjectOf } from '../../src/data/subjects.js'
import { HAS_PB, startPocketBase } from './server.js'

/*
 * Datos de arranque (migración 1791500100): lo que hay en la base de datos tiene que coincidir con lo que enseña el
 * frontend (src/data/seed.js y subjects.js). Si alguien cambia el horario en un sitio y no en el otro, esto falla.
 */
let pb, db
const q = f => `&filter=${encodeURIComponent(f)}`

describe.skipIf(!HAS_PB)('datos de arranque: Sant Josep Obrer', () => {
  beforeAll(async () => {
    pb = await startPocketBase()
    const a = pb.admin
    const school = (await a.list('schools', q("name='Sant Josep Obrer'"))).data.items
    const group = school[0] && (await a.list('groups', q(`school='${school[0].id}'`))).data.items
    const g = group?.[0]
    db = {
      school,
      group,
      modules: (await a.list('modules', '&sort=order')).data.items,
      memberships: g ? (await a.list('memberships', q(`group='${g.id}'`))).data.items : [],
      schedule: g ? (await a.list('schedule', q(`group='${g.id}'`) + '&expand=module,teacher')).data.items : [],
    }
  }, 30000)
  afterAll(() => pb?.stop())

  it('Sant Josep Obrer, verificada, con 1.º DAW A de 26/27', () => {
    expect(db.school).toHaveLength(1)
    expect(db.school[0]).toMatchObject({ city: 'Palma', verified: true })
    expect(db.group.map(g => [g.name, g.course])).toEqual([['1.º DAW A', '26/27']])
    expect(db.group[0].sessions).toEqual(SESSIONS)
    expect(db.group[0].break).toEqual({ start: '17:45', end: '18:00', after: 2 })
  })

  it('los módulos son los del frontend, en el mismo orden y con su código', () => {
    expect(db.modules.map(m => m.key)).toEqual(MODULE_ORDER)
    for (const m of db.modules) {
      expect(m.code).toBe(subjectOf(m.key).code)
      expect(m.name).toBe(subjectOf(m.key).name)
      expect(m.has_tasks).toBe(['pro', 'bd', 'lm', 'si', 'ed'].includes(m.key))
    }
  })

  it('los 10 Docentes, pendientes de crear su cuenta', () => {
    expect(db.memberships.map(m => m.pending_name).sort()).toEqual(
      Object.values(TEACHERS)
        .map(t => t.name)
        .sort(),
    )
    for (const m of db.memberships) expect(m).toMatchObject({ role: 'docente', user: '', cargo: '' })
  })

  it('el horario es el mismo que enseña el frontend (31 franjas)', () => {
    const fromDb = db.schedule.map(s => `${s.day}-${s.slot}:${s.expand.module.key}:${s.expand.teacher.pending_name}`).sort()
    const fromFront = Object.entries(SCHEDULE)
      .flatMap(([day, row]) => row.map((c, slot) => c && `${day}-${slot}:${c.id}:${TEACHERS[c.teacher].name}`))
      .filter(Boolean)
      .sort()
    expect(fromDb).toHaveLength(31)
    expect(fromDb).toEqual(fromFront)
  })

  it('no hay entregas, exámenes ni dudas inventadas', async () => {
    for (const c of ['events', 'topics', 'dudas', 'apuntes']) {
      expect((await pb.admin.list(c)).data.totalItems, c).toBe(0)
    }
  })
})
