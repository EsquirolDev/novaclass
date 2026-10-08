import { describe, expect, it } from 'vitest'
import { toDudas, voteTarget } from './dudasData.js'

const now = new Date('2026-10-08T16:00:00Z')
const rec = (id, created, extra) => ({ id, created, ...extra })
const dudas = [
  rec('d1', '2026-10-08 13:00:00.000Z', {
    title: 'Vieja',
    body: 'x',
    author: 'u1',
    asignatura: 'bd',
    expand: { author: { name: 'Ana' } },
    accepted: 'a2',
    tags: ['sql'],
    views: 4,
  }),
  rec('d2', '2026-10-08 15:30:00.000Z', {
    title: 'Nueva',
    body: 'y',
    author: 'u2',
    asignatura: 'pro',
    expand: { author: { name: 'Luis' } },
  }),
  rec('d3', '2026-10-08 15:50:00.000Z', { title: 'Borrada', body: 'z', author: 'u1', deleted: true, expand: {} }),
]
const answers = [
  rec('a2', '2026-10-08 14:00:00.000Z', { duda: 'd1', author: 'u3', body: 'Segunda', expand: { author: { name: 'Profe' } } }),
  rec('a1', '2026-10-08 13:30:00.000Z', {
    duda: 'd1',
    author: 'u2',
    body: 'Primera',
    code: 'SELECT 1',
    expand: { author: { name: 'Luis' } },
  }),
]
const votes = [
  { duda: 'd1', answer: '', user: 'u2', value: 1 },
  { duda: 'd1', answer: '', user: 'u1', value: -1 },
  { duda: 'd1', answer: '', user: 'u3', value: 1 },
  { duda: 'd1', answer: 'a2', user: 'u1', value: 1 },
]
const teachers = ['u3']

describe('dudas desde PocketBase', () => {
  const out = toDudas({ dudas, answers, votes, uid: 'u1', teachers, now })

  it('sin las borradas y las más nuevas primero', () => {
    expect(out.map(d => d.title)).toEqual(['Nueva', 'Vieja'])
  })

  it('votos sumados y el voto propio', () => {
    const d1 = out[1]
    expect(d1).toMatchObject({ votes: 1, myVote: 'down', mine: true, author: 'Ana', subject: 'bd', views: 4, tags: ['sql'] })
    expect(d1.answers.find(a => a.id === 'a2')).toMatchObject({ votes: 1, myVote: 'up', teacher: true, mine: false })
  })

  it('respuestas por orden de llegada, estado y «hace cuánto»', () => {
    const d1 = out[1]
    expect(d1.answers.map(a => a.body)).toEqual(['Primera', 'Segunda'])
    expect(d1.answers[0].code).toBe('SELECT 1')
    expect(d1.status).toBe('resuelta')
    expect(d1.when).toBe('hace 3 h')
    expect(out[0]).toMatchObject({ status: 'sin-responder', when: 'hace 30 min', mine: false, votes: 0, myVote: null })
  })

  it('clave de voto de la app', () => {
    expect(voteTarget('d1')).toEqual({ duda: 'd1', answer: '' })
    expect(voteTarget('d1:a2')).toEqual({ duda: 'd1', answer: 'a2' })
  })
})
