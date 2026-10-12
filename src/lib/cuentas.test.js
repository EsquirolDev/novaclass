import { describe, expect, it } from 'vitest'
import { parseList, toTsv } from './cuentas.js'

describe('lista de personas para crear cuentas', () => {
  it('sin cabecera: nombre, apellidos y NIA, con tabulador, punto y coma o coma', () => {
    const { rows, header } = parseList('Sergi\tColl Pastor\t1001\n\nAna; López Pérez; 1002\nJoan, Riera Tous\n')
    expect(header).toBe(false)
    expect(rows.map(r => [r.nombre, r.apellidos, r.nia, r.error])).toEqual([
      ['Sergi', 'Coll Pastor', '1001', null],
      ['Ana', 'López Pérez', '1002', null],
      ['Joan', 'Riera Tous', '', null],
    ])
  })

  it('con cabecera manda su orden: apellidos en dos columnas o primero los apellidos', () => {
    const a = parseList('NIA\tApellido 1\tApellido 2\tNombre\n1001\tColl\tPastor\tSergi')
    expect(a.header).toBe(true)
    expect(a.rows[0]).toMatchObject({ nombre: 'Sergi', apellidos: 'Coll Pastor', nia: '1001', error: null })
    const b = parseList('Apellidos;Nombre\nde Lara Garcia;Dustin')
    expect(b.rows[0]).toMatchObject({ nombre: 'Dustin', apellidos: 'de Lara Garcia' })
  })

  it('una línea sin separar o sin apellidos sale con su error', () => {
    const { rows } = parseList('Sergi Coll Pastor\nAna;\n;Sin Nombre')
    expect(rows.map(r => r.error)).toEqual([expect.stringMatching(/Separa/), 'Faltan los apellidos.', 'Falta el nombre.'])
  })

  it('las cuentas creadas, listas para pegar en una hoja de cálculo', () => {
    const tsv = toTsv([{ name: 'Sergi Coll', username: 'scollp@sjo', password: 'abc', curso: 'c1' }], id =>
      id === 'c1' ? '1.º DAW A' : '',
    )
    expect(tsv.split('\n')).toEqual(['Nombre\tUsuario\tContraseña temporal\tCurso', 'Sergi Coll\tscollp@sjo\tabc\t1.º DAW A'])
  })
})
