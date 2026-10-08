import { describe, expect, it } from 'vitest'
import { myRole, shortNames, toEvents, toHorario, toTemas } from './claseData.js'

const mod = key => ({ expand: { module: { key } } })
const group = {
  sessions: [
    { start: '15:00', end: '15:55' },
    { start: '15:55', end: '16:50' },
  ],
  break: { start: '17:45', end: '18:00', after: 1 },
}
const memberships = [
  { id: 'm1', role: 'docente', pending_name: 'Miquel Àngel Montero Pazmiño', user: '' },
  { id: 'm2', role: 'docente', user: 'u2', expand: { user: { name: 'Miquel Molina Rotger' } } },
  { id: 'm3', role: 'docente', pending_name: 'Dustin de Lara Garcia', user: '' },
  { id: 'm4', role: 'estudiante', user: 'u4', cargo: 'delegado', expand: { user: { name: 'Aina Pons' } } },
]

describe('datos de la clase desde PocketBase', () => {
  it('nombres cortos: el de pila, o dos palabras si se repite', () => {
    expect(
      shortNames([
        { id: 'a', name: 'Miquel Àngel Montero' },
        { id: 'b', name: 'Miquel Molina Rotger' },
        { id: 'c', name: 'Dustin de Lara' },
      ]),
    ).toEqual({ a: 'Miquel Àngel', b: 'Miquel Molina', c: 'Dustin' })
  })

  it('horario: una celda por día y franja, patio y Docentes (con o sin cuenta)', () => {
    const h = toHorario(
      group,
      [
        { day: 1, slot: 0, teacher: 'm1', ...mod('ed') },
        { day: 1, slot: 1, teacher: 'm3', ...mod('lm') },
        { day: 5, slot: 0, teacher: 'm2', ...mod('pro') },
        { day: 5, slot: 9, teacher: 'm2', ...mod('pro') }, // franja que no existe: se ignora
      ],
      memberships,
    )
    expect(h.SESSIONS).toHaveLength(2)
    expect(h.BREAK).toEqual({ label: 'Patio', start: '17:45', end: '18:00', after: 1 })
    expect(h.SCHEDULE[1]).toEqual([
      { id: 'ed', teacher: 'm1' },
      { id: 'lm', teacher: 'm3' },
    ])
    expect(h.SCHEDULE[3]).toEqual([null, null])
    expect(h.SCHEDULE[5]).toEqual([{ id: 'pro', teacher: 'm2' }, null])
    expect(h.TEACHERS).toEqual({
      m1: { short: 'Miquel Àngel', name: 'Miquel Àngel Montero Pazmiño' },
      m2: { short: 'Miquel Molina', name: 'Miquel Molina Rotger' },
      m3: { short: 'Dustin', name: 'Dustin de Lara Garcia' },
    })
  })

  it('sin patio, BREAK es null', () => {
    expect(toHorario({ sessions: group.sessions }, [], []).BREAK).toBe(null)
  })

  it('temas por módulo y en orden', () => {
    expect(
      toTemas([
        { title: 'B', status: 'now', order: 1, ...mod('pro') },
        { title: 'A', status: 'ok', order: 0, ...mod('pro') },
        { title: 'SQL', status: '', order: 0, ...mod('bd') },
      ]),
    ).toEqual({
      pro: [
        ['A', 'ok'],
        ['B', 'now'],
      ],
      bd: [['SQL', '']],
    })
  })

  it('eventos con lo que la persona ha marcado', () => {
    const ev = toEvents(
      [
        { id: 'e1', type: 'entrega', title: 'Bucles', date: '2026-10-08', time: '23:59', topics: ['a'], ...mod('pro') },
        { id: 'e2', type: 'festivo', title: 'Fiesta', date: '2026-10-12', time: '', topics: null },
      ],
      [{ event: 'e1', done: true, grade: '8,5' }],
    )
    expect(ev[0]).toMatchObject({ id: 'e1', subject: 'pro', done: true, grade: '8,5', topics: ['a'] })
    expect(ev[1]).toMatchObject({ id: 'e2', subject: null, done: false, time: undefined, topics: undefined })
  })

  it('mi papel en la clase', () => {
    expect(myRole(memberships, 'u4', false)).toEqual({ role: 'estudiante', cargo: 'delegado', director: false })
    expect(myRole(memberships, 'nadie', true)).toEqual({ role: null, cargo: null, director: true })
  })
})
