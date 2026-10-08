import { describe, expect, it } from 'vitest'
import { authError, checkRegister } from './authErrors.js'
import { firstName } from './users.js'

const pbErr = (status, data = {}) => ({ status, response: { data } })

describe('errores de cuenta', () => {
  it('al entrar no se dice si el correo existe', () => {
    expect(authError(pbErr(400), 'login').form).toBe('Correo o contraseña incorrectos.')
    expect(authError(pbErr(400, { identity: { code: 'validation_required' } }), 'login').form).toBe('Correo o contraseña incorrectos.')
  })

  it('sin conexión y demasiados intentos', () => {
    expect(authError({ status: 0 }, 'login').form).toMatch(/conectar/)
    expect(authError(pbErr(429), 'register').form).toMatch(/Demasiados intentos/)
  })

  it('al registrarse, un mensaje por campo', () => {
    const e = authError(
      pbErr(400, { email: { code: 'validation_not_unique' }, password: { code: 'validation_min_text_constraint' } }),
      'register',
    )
    expect(e.form).toBe(null)
    expect(e.fields.email).toMatch(/Ya hay una cuenta/)
    expect(e.fields.password).toMatch(/8 caracteres/)
  })

  it('código desconocido: el mensaje de PocketBase o uno genérico', () => {
    expect(authError(pbErr(400, { name: { code: 'raro', message: 'Too long.' } }), 'register').fields.name).toBe('Too long.')
    expect(authError(pbErr(500), 'register').form).toMatch(/Algo ha fallado/)
  })

  it('checkRegister antes de enviar', () => {
    expect(checkRegister({ name: 'Ana López', email: 'ana@sjo.es', password: '12345678' })).toEqual({})
    const f = checkRegister({ name: ' ', email: 'ana@', password: '1234' })
    expect(Object.keys(f).sort()).toEqual(['email', 'name', 'password'])
  })
})

describe('nombre para saludar', () => {
  it('el primer nombre, o el correo si no hay', () => {
    expect(firstName({ name: 'Ana López Pérez', email: 'a@b.c' })).toBe('Ana')
    expect(firstName({ name: '', email: 'sergi@sjo.es' })).toBe('sergi')
    expect(firstName(null)).toBe('')
  })
})
