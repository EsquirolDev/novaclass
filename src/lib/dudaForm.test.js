import { describe, expect, it } from 'vitest'
import { parseTags, similarDudas, validateDuda, words } from './dudaForm.js'

const ok = { subject: 'bd', title: '¿LEFT JOIN o INNER JOIN?', body: 'Con INNER JOIN no me sale ningún socio.', tags: [] }

describe('formulario de pregunta', () => {
  it('parseTags: minúsculas, sin # y sin repetir', () => {
    expect(parseTags('Joins, #SQL, joins, , práctica biblioteca')).toEqual(['joins', 'sql', 'práctica biblioteca'])
    expect(parseTags('')).toEqual([])
  })

  it('validateDuda: todo bien', () => {
    expect(Object.values(validateDuda(ok)).some(Boolean)).toBe(false)
  })

  it('validateDuda: un error por campo', () => {
    const e = validateDuda({ subject: null, title: 'corto', body: 'poco', tags: ['a', 'b', 'c', 'd'] })
    expect(e.subject).toMatch(/asignatura/)
    expect(e.title).toMatch(/10 caracteres/)
    expect(e.body).toMatch(/20 caracteres/)
    expect(e.tags).toMatch(/3 etiquetas/)
  })

  it('validateDuda ignora espacios al contar', () => {
    expect(validateDuda({ ...ok, title: '   corto      ' }).title).toBeTruthy()
  })

  it('words: sin tildes y solo de 4+ letras', () => {
    expect(words('¿Por qué mi consulta GROUP BY falla?')).toEqual(['consulta', 'group', 'falla'])
    expect(words('Normalización')).toEqual(['normalizacion'])
  })

  it('similarDudas: por palabras, de la misma asignatura y sin la propia', () => {
    const dudas = [
      { id: 1, subject: 'bd', title: 'LEFT JOIN con socios', tags: ['joins'] },
      { id: 2, subject: 'pro', title: 'Bucle con socios', tags: [] },
      { id: 3, subject: 'bd', title: 'Normalización', tags: [] },
    ]
    expect(similarDudas(dudas, 'Duda sobre socios', null).map(d => d.id)).toEqual([1, 2])
    expect(similarDudas(dudas, 'Duda sobre socios', 'bd').map(d => d.id)).toEqual([1])
    expect(similarDudas(dudas, 'Duda sobre socios', 'bd', 1)).toEqual([])
    expect(similarDudas(dudas, 'sql', null)).toEqual([])
  })
})
