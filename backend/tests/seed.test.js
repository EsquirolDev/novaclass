import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SCHEDULE, SESSIONS, TEACHERS } from '../../src/data/seed.js'
import { HAS_PB, startPocketBase } from './server.js'

/*
 * Sant Josep Obrer en el modelo v2 (migraciones 1791500100 y 1791500400): lo que hay en la base de datos tiene que
 * coincidir con el horario de ejemplo del frontend (src/data/seed.js). Si cambia en un sitio y no en el otro, falla.
 */
let pb, db
const q = f => `&filter=${encodeURIComponent(f)}`
/* Clave del horario de ejemplo → código de la asignatura */
const CODES = { pro: 'PRO', bd: 'BD', lm: 'LMSGI', si: 'SI', ed: 'ED', digi: 'DIGI', cpfw: 'CPFW', ipo: 'IPO' }

describe.skipIf(!HAS_PB)('datos de arranque: Sant Josep Obrer (modelo v2)', () => {
  beforeAll(async () => {
    pb = await startPocketBase()
    const a = pb.admin
    const school = (await a.list('schools', q("slug='santjosepobrer'"))).data.items
    const s = school[0]?.id
    const cursos = (await a.list('cursos', q(`school='${s}'`))).data.items
    db = {
      school,
      cursos,
      docentes: (await a.list('users', q(`school='${s}'`))).data.items,
      asignaturas: (await a.list('asignaturas', q(`school='${s}'`) + '&expand=docentes')).data.items,
      horario: cursos[0] ? (await a.list('horario', q(`curso='${cursos[0].id}'`) + '&expand=asignatura,docente')).data.items : [],
    }
  }, 30000)
  afterAll(() => pb?.stop())

  it('Sant Josep Obrer, verificada, con su nombre corto y 1.º DAW A de 26/27', () => {
    expect(db.school).toHaveLength(1)
    expect(db.school[0]).toMatchObject({ name: 'Sant Josep Obrer', city: 'Palma', verified: true })
    expect(db.cursos.map(c => [c.name, c.course])).toEqual([['1.º DAW A', '26/27']])
    expect(db.cursos[0].sessions).toEqual(SESSIONS)
    expect(db.cursos[0].break).toEqual({ start: '17:45', end: '18:00', after: 2 })
  })

  it('los 10 Docentes son cuentas de la escuela con su usuario y contraseña por cambiar', () => {
    expect(db.docentes.map(u => u.name).sort()).toEqual(
      Object.values(TEACHERS)
        .map(t => t.name)
        .sort(),
    )
    for (const u of db.docentes) expect(u).toMatchObject({ role: 'docente', must_change_password: true })
    const byName = Object.fromEntries(db.docentes.map(u => [u.name, u.username]))
    expect(byName['Miquel Molina Rotger']).toBe('mmolinar@santjosepobrer')
    expect(byName['Dustin de Lara Garcia']).toBe('ddelarag@santjosepobrer')
    expect(byName['Magdalena Nicolau Gamundí']).toBe('mnicolaug@santjosepobrer')
    expect(new Set(Object.values(byName)).size).toBe(10)
  })

  it('8 asignaturas con su color y forma distintos; solo las que tienen entregas tienen espacio', () => {
    const as = Object.fromEntries(db.asignaturas.map(x => [x.codigo, x]))
    expect(Object.keys(as).sort()).toEqual(Object.values(CODES).sort())
    expect(new Set(db.asignaturas.map(x => x.color)).size).toBe(8)
    expect(new Set(db.asignaturas.map(x => x.forma)).size).toBe(8)
    for (const c of ['PRO', 'BD', 'LMSGI', 'SI', 'ED']) expect(as[c].activa, c).toBe(true)
    for (const c of ['DIGI', 'CPFW', 'IPO']) expect(as[c].activa, c).toBe(false)
    expect(as.IPO.expand.docentes.map(u => u.name)).toEqual(['Magdalena Nicolau Gamundí'])
    for (const x of db.asignaturas) expect(x.join_code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
  })

  it('el horario es el mismo que enseña el frontend (31 franjas)', () => {
    const fromDb = db.horario.map(h => `${h.day}-${h.slot}:${h.expand.asignatura.codigo}:${h.expand.docente.name}`).sort()
    const fromFront = Object.entries(SCHEDULE)
      .flatMap(([day, row]) => row.map((c, slot) => c && `${day}-${slot}:${CODES[c.id]}:${TEACHERS[c.teacher].name}`))
      .filter(Boolean)
      .sort()
    expect(fromDb).toHaveLength(31)
    expect(fromDb).toEqual(fromFront)
  })

  it('no hay alumnado, inscripciones ni contenido inventado', async () => {
    for (const c of ['curso_alumnos', 'inscripciones', 'events', 'topics', 'dudas', 'apuntes']) {
      expect((await pb.admin.list(c)).data.totalItems, c).toBe(0)
    }
  })
})
