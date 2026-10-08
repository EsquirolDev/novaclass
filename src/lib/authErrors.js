/* Errores de PocketBase → mensajes en español, por campo y en general. Sin decir si un correo existe o no al entrar. */

const FIELD = {
  validation_not_unique: { email: 'Ya hay una cuenta con este correo. ¿Quieres entrar?' },
  validation_invalid_email: { email: 'Ese correo no parece válido.' },
  validation_is_email: { email: 'Ese correo no parece válido.' },
  validation_required: {
    email: 'Escribe tu correo.',
    password: 'Escribe una contraseña.',
    name: 'Escribe tu nombre.',
  },
  validation_min_text_constraint: { password: 'La contraseña necesita al menos 8 caracteres.' },
  validation_length_out_of_range: { password: 'La contraseña necesita al menos 8 caracteres.' },
  validation_values_mismatch: { passwordConfirm: 'Las contraseñas no coinciden.' },
}

/*
 * `mode`: 'login' | 'register' | 'reset'. Devuelve { form, fields } con un mensaje general y otro por campo.
 * Al entrar, cualquier 400 es «correo o contraseña incorrectos» (no se distingue cuál de los dos falla).
 */
export function authError(err, mode) {
  const status = err?.status ?? 0
  if (status === 0) return { form: 'No se puede conectar con el servidor. Revisa tu conexión y vuelve a intentarlo.', fields: {} }
  if (status === 429) return { form: 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.', fields: {} }
  if (mode === 'login' && (status === 400 || status === 401 || status === 404)) {
    return { form: 'Correo o contraseña incorrectos.', fields: {} }
  }
  const data = err?.response?.data || err?.data?.data || {}
  const fields = {}
  for (const [name, info] of Object.entries(data)) {
    fields[name] = FIELD[info?.code]?.[name] || info?.message || 'Revisa este campo.'
  }
  if (fields.passwordConfirm && !fields.password) fields.password = fields.passwordConfirm
  delete fields.passwordConfirm
  if (Object.keys(fields).length) return { form: null, fields }
  return { form: 'Algo ha fallado. Vuelve a intentarlo en un momento.', fields: {} }
}

/* Validación en el navegador antes de enviar (la de verdad la hace PocketBase) */
export function checkRegister({ name, email, password }) {
  const fields = {}
  if (name.trim().length < 2) fields.name = 'Escribe tu nombre y apellidos.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) fields.email = 'Ese correo no parece válido.'
  if (password.length < 8) fields.password = 'La contraseña necesita al menos 8 caracteres.'
  return fields
}
