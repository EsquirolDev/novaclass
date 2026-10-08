import { describe, expect, it } from 'vitest'
import { checkApunte, readingTime, sizeLabel, toApuntes } from './apuntesData.js'

const now = new Date('2026-10-08T16:00:00Z')
const rec = (id, created, extra) => ({ id, created, collectionId: 'c1', ...extra })

describe('apuntes desde PocketBase', () => {
  it('tamaños y tiempo de lectura', () => {
    expect(sizeLabel(1234567)).toBe('1,2 MB')
    expect(sizeLabel(85000)).toBe('85 KB')
    expect(sizeLabel(0)).toBe('')
    expect(readingTime('una dos tres')).toBe('1 min de lectura')
    expect(readingTime('palabra '.repeat(650))).toBe('3 min de lectura')
  })

  it('cada tipo con lo que se enseña debajo del título', () => {
    const out = toApuntes(
      [
        rec('p', '2026-10-08 10:00:00.000Z', {
          type: 'pdf',
          title: 'Resumen',
          bytes: 1200000,
          file: 'resumen_x1.pdf',
          author: 'u1',
          expand: { author: { name: 'Ana' }, module: { key: 'bd' } },
          downloads: 7,
        }),
        rec('e', '2026-10-08 15:00:00.000Z', {
          type: 'enlace',
          title: 'SQLBolt',
          url: 'https://www.sqlbolt.com/lesson',
          author: 'u2',
          expand: { module: { key: 'bd' } },
        }),
        rec('n', '2026-10-07 09:00:00.000Z', {
          type: 'nota',
          title: 'Chuleta',
          body: 'SELECT FROM WHERE',
          tema: 'Tema 4',
          author: 'u1',
          expand: {},
        }),
      ],
      'u1',
      now,
    )
    expect(out.map(a => a.id)).toEqual(['e', 'p', 'n'])
    expect(out[1]).toMatchObject({
      size: '1,2 MB',
      file: 'resumen_x1.pdf',
      mine: true,
      author: 'Ana',
      downloads: 7,
      subject: 'bd',
      date: 'hace 6 h',
    })
    expect(out[0]).toMatchObject({
      size: 'sqlbolt.com',
      url: 'https://www.sqlbolt.com/lesson',
      mine: false,
      author: 'Alguien',
      tema: 'Sin tema',
    })
    expect(out[2]).toMatchObject({ size: '1 min de lectura', body: 'SELECT FROM WHERE', date: 'ayer', url: undefined })
  })

  it('reglas de subida', () => {
    const pdf = (size, type = 'application/pdf', name = 'a.pdf') => ({ size, type, name })
    expect(checkApunte({ type: 'pdf', title: 'Resumen', file: pdf(1000) })).toBe(null)
    expect(checkApunte({ type: 'pdf', title: 'Resumen', file: pdf(21 * 1024 * 1024) })).toMatch(/20 MB/)
    expect(checkApunte({ type: 'pdf', title: 'Resumen', file: pdf(10, 'image/png', 'foto.png') })).toMatch(/PDF/)
    expect(checkApunte({ type: 'enlace', title: 'Web', url: 'sqlbolt' })).toMatch(/https/)
    expect(checkApunte({ type: 'nota', title: 'Nota', body: '  ' })).toMatch(/texto/)
    expect(checkApunte({ type: 'nota', title: 'No', body: 'x' })).toMatch(/3 caracteres/)
  })
})
