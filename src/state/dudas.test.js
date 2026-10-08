import { describe, expect, it } from 'vitest'
import { dudaStatus, mergeDudas, pickEditable, voteDelta } from './dudas.js'

const duda = (id, extra = {}) => ({
  id,
  subject: 'bd',
  title: 'Título ' + id,
  body: '',
  code: '',
  tags: [],
  votes: 3,
  author: 'Ana',
  answers: [],
  ...extra,
})
const ans = (id, votes = 0) => ({ id, author: 'Luis', votes, body: 'x' })

describe('dudas', () => {
  it('estado: resuelta > abierta > sin responder', () => {
    expect(dudaStatus({ answers: [], accepted: null })).toBe('sin-responder')
    expect(dudaStatus({ answers: [ans('a')], accepted: null })).toBe('abierta')
    expect(dudaStatus({ answers: [ans('a')], accepted: 'a' })).toBe('resuelta')
  })

  it('voteDelta', () => {
    expect([voteDelta('up'), voteDelta('down'), voteDelta(null)]).toEqual([1, -1, 0])
  })

  it('las propias van antes que las de ejemplo', () => {
    const out = mergeDudas({ seed: [duda(1)], own: [duda(99)] })
    expect(out.map(d => d.id)).toEqual([99, 1])
  })

  it('suma respuestas propias, votos y respuesta aceptada', () => {
    const [d] = mergeDudas({
      seed: [duda(1, { answers: [ans('a', 2)] })],
      answers: { 1: [ans('u1')] },
      votes: { 1: 'up', '1:a': 'down' },
      accepted: { 1: 'u1' },
    })
    expect(d.votes).toBe(4)
    expect(d.myVote).toBe('up')
    expect(d.answers.map(a => [a.id, a.votes, a.myVote])).toEqual([
      ['a', 1, 'down'],
      ['u1', 0, null],
    ])
    expect(d.status).toBe('resuelta')
  })

  it('una edición cambia los campos editados y marca la duda como editada', () => {
    const [d] = mergeDudas({
      seed: [duda(1, { answers: [ans('a')] })],
      edits: { 1: { title: 'Nuevo título', tags: ['sql'], edited: true } },
    })
    expect(d).toMatchObject({ title: 'Nuevo título', tags: ['sql'], edited: true, author: 'Ana', votes: 3 })
    expect(d.answers).toHaveLength(1)
  })

  it('pickEditable no deja tocar votos, autor ni respuestas', () => {
    expect(pickEditable({ title: 't', body: 'b', votes: 100, author: 'Yo', answers: [], tags: [] })).toEqual({
      title: 't',
      body: 'b',
      tags: [],
    })
  })
})
