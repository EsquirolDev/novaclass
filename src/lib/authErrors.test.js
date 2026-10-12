import { describe, expect, it } from 'vitest'
import { authError, checkNewPassword } from './authErrors.js'
import { firstName } from './users.js'

const pbErr = (status, data = {}) => ({ status, response: { data } })

describe('errores de cuenta', () => {
  it('al entrar no se dice si la cuenta existe', () => {
    expect(authError(pbErr(400), 'login').form).toBe('Usuario o contraseña incorrectos.')
    expect(authError(pbErr(400, { identity: { code: 'validation_required' } }), 'login').form).toBe('Usuario o contraseña incorrectos.')
  })

  it('sin conexión y demasiados intentos', () => {
    expect(authError({ status: 0 }, 'login').form).toMatch(/conectar/)
    expect(authError(pbErr(429), 'change').form).toMatch(/Demasiados intentos/)
  })

  it('al cambiar la contraseña, un mensaje por campo', () => {
    const e = authError(
      pbErr(400, { oldPassword: { code: 'validation_invalid_old_password' }, password: { code: 'validation_min_text_constraint' } }),
      'change',
    )
    expect(e.form).toBe(null)
    expect(e.fields.oldPassword).toMatch(/actual no es correcta/)
    expect(e.fields.password).toMatch(/8 caracteres/)
  })

  it('código desconocido: el mensaje de PocketBase o uno genérico', () => {
    expect(authError(pbErr(400, { name: { code: 'raro', message: 'Too long.' } }), 'change').fields.name).toBe('Too long.')
    expect(authError(pbErr(500), 'change').form).toMatch(/Algo ha fallado/)
  })

  it('contraseña nueva antes de enviar: 8 caracteres y distinta de la temporal', () => {
    expect(checkNewPassword({ old: 'temporal1', password: 'mi-clave-nueva' })).toEqual({})
    expect(Object.keys(checkNewPassword({ old: '', password: '1234' })).sort()).toEqual(['oldPassword', 'password'])
    expect(checkNewPassword({ old: 'temporal1', password: 'temporal1' }).password).toMatch(/distinta/)
  })
})

describe('nombre para saludar', () => {
  it('el primer nombre, o el correo si no hay', () => {
    expect(firstName({ name: 'Ana López Pérez', email: 'a@b.c' })).toBe('Ana')
    expect(firstName({ name: '', email: 'sergi@sjo.es' })).toBe('sergi')
    expect(firstName(null)).toBe('')
  })
})
