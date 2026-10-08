import { describe, expect, it } from 'vitest'
import { myRole, shortNames, toEvents, toHorario, toPeople, toSubjects, toTemas } from './claseData.js'

const curso = {
  id: 'c1',
  tutor: 'u2',
  sessions: [
    { start: '15:00', end: '15:55' },
    { start: '15:55', end: '16:50' },
  ],
  break: { start: '17:45', end: '18:00', after: 1 },
}
const doc = (id, name) => ({ docente: id, expand: { docente: { id, name } } })

describe('datos del curso desde PocketBase', () => {
  it('nombres cortos: el de pila, o dos palabras si se repite', () => {
    expect(
      shortNames([
        { id: 'a', name: 'Miquel Àngel Montero' },
        { id: 'b', name: 'Miquel Molina Rotger' },
        { id: 'c', name: 'Dustin de Lara' },
      ]),
    ).toEqual({ a: 'Miquel Àngel', b: 'Miquel Molina', c: 'Dustin' })
  })

  it('asignaturas: con espacio si está abierta y se puede entrar (código, la da o es de la dirección)', () => {
    const as = [
      { id: 'a1', codigo: 'PRO', nombre: 'Programación', color: 'azul', forma: 'circle', activa: true, docentes: ['u2'] },
      { id: 'a2', codigo: 'BD', nombre: 'Bases de Datos', color: 'naranja', forma: 'square', activa: true, docentes: [] },
      { id: 'a3', codigo: 'IPO', nombre: 'IPO', color: 'lima', forma: 'cross', activa: false, docentes: ['u2'] },
    ]
    expect(toSubjects(as, { uid: 'u1', inscritas: ['a1'] }).map(s => [s.code, s.active])).toEqual([
      ['PRO', true],
      ['BD', false],
      ['IPO', false],
    ])
    expect(toSubjects(as, { uid: 'u2' }).map(s => s.active)).toEqual([true, false, false])
    expect(toSubjects(as, { uid: 'u9', staff: true }).map(s => s.active)).toEqual([true, true, false])
    expect(toSubjects(as, { uid: 'u1' })[0]).toEqual({
      id: 'a1',
      code: 'PRO',
      name: 'Programación',
      color: 'azul',
      shape: 'circle',
      active: false,
    })
  })

  it('horario: una celda por día y franja, patio y Docentes', () => {
    const h = toHorario(curso, [
      { day: 1, slot: 0, asignatura: 'ed', ...doc('d1', 'Miquel Àngel Montero Pazmiño') },
      { day: 1, slot: 1, asignatura: 'lm', ...doc('d3', 'Dustin de Lara Garcia') },
      { day: 5, slot: 0, asignatura: 'pro', ...doc('d2', 'Miquel Molina Rotger') },
      { day: 5, slot: 9, asignatura: 'pro', ...doc('d2', 'Miquel Molina Rotger') }, // franja que no existe: se ignora
    ])
    expect(h.SESSIONS).toHaveLength(2)
    expect(h.BREAK).toEqual({ label: 'Patio', start: '17:45', end: '18:00', after: 1 })
    expect(h.SCHEDULE[1]).toEqual([
      { id: 'ed', teacher: 'd1' },
      { id: 'lm', teacher: 'd3' },
    ])
    expect(h.SCHEDULE[3]).toEqual([null, null])
    expect(h.SCHEDULE[5]).toEqual([{ id: 'pro', teacher: 'd2' }, null])
    expect(h.TEACHERS).toEqual({
      d1: { short: 'Miquel Àngel', name: 'Miquel Àngel Montero Pazmiño' },
      d2: { short: 'Miquel Molina', name: 'Miquel Molina Rotger' },
      d3: { short: 'Dustin', name: 'Dustin de Lara Garcia' },
    })
  })

  it('sin patio, BREAK es null', () => {
    expect(toHorario({ sessions: curso.sessions }, []).BREAK).toBe(null)
  })

  it('temas por asignatura y en orden', () => {
    expect(
      toTemas([
        { title: 'B', status: 'now', order: 1, asignatura: 'pro' },
        { title: 'A', status: 'ok', order: 0, asignatura: 'pro' },
        { title: 'SQL', status: '', order: 0, asignatura: 'bd' },
      ]),
    ).toEqual({
      pro: [
        ['A', 'ok'],
        ['B', 'now'],
      ],
      bd: [['SQL', '']],
    })
  })

  it('eventos con lo que la persona ha marcado, y los festivos de la escuela en orden', () => {
    const ev = toEvents(
      [{ id: 'e1', asignatura: 'pro', type: 'entrega', title: 'Bucles', date: '2026-10-13', time: '23:59', topics: ['a'] }],
      [{ event: 'e1', done: true, grade: '8,5' }],
      [{ id: 'f1', title: 'Fiesta', date: '2026-10-12' }],
    )
    expect(ev[0]).toMatchObject({ id: 'f1', type: 'festivo', subject: null, done: false })
    expect(ev[1]).toMatchObject({ id: 'e1', subject: 'pro', done: true, grade: '8,5', topics: ['a'], end: undefined })
  })

  it('mi papel en el curso', () => {
    const alumnos = [{ user: 'u4', cargo: 'delegado' }]
    expect(myRole({ id: 'u4', role: 'estudiante' }, curso, alumnos, false)).toEqual({
      role: 'estudiante',
      cargo: 'delegado',
      director: false,
    })
    expect(myRole({ id: 'u2', role: 'docente' }, curso, alumnos, false)).toEqual({ role: 'docente', cargo: 'tutor', director: false })
    expect(myRole({ id: 'u9', role: 'docente' }, curso, alumnos, true)).toEqual({ role: 'docente', cargo: null, director: true })
  })

  it('gente del curso: Docentes con sus asignaturas y el Tutor; alumnado sin las bajas', () => {
    const p = toPeople(
      { ...curso, expand: { tutor: { id: 'u2', name: 'Catalina Vidal' } } },
      [
        { codigo: 'PRO', expand: { docentes: [{ id: 'u3', name: 'Toni Ferrer' }] } },
        { codigo: 'SI', expand: { docentes: [{ id: 'u3', name: 'Toni Ferrer' }] } },
      ],
      [
        { user: 'u4', cargo: 'delegado', expand: { user: { name: 'Aina Pons' } } },
        { user: 'u5', baja: true, expand: { user: { name: 'Baja Total' } } },
        { user: 'u6', cargo: '', expand: { user: { nombre: 'Joan', apellidos: 'Riera' } } },
      ],
    )
    expect(p.docentes).toEqual([
      { id: 'u2', name: 'Catalina Vidal', codes: [], cargo: 'tutor' },
      { id: 'u3', name: 'Toni Ferrer', codes: ['PRO', 'SI'] },
    ])
    expect(p.estudiantes).toEqual([
      { id: 'u4', name: 'Aina Pons', cargo: 'delegado' },
      { id: 'u6', name: 'Joan Riera', cargo: null },
    ])
  })
})
