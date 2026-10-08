/// <reference path="../pb_data/types.d.ts" />

/*
 * Entrar en el espacio de una asignatura con su código, y ver o cambiar ese código (docs/escuelas.md, «Modelo v2»).
 * El código está oculto en la API (asignaturas.join_code es hidden); estas rutas son la única forma de verlo y usarlo.
 * Al curso no se entra con código: a cada alumno lo pone en su curso la escuela al crear su cuenta.
 *
 * Nota: en PocketBase cada handler corre aislado, sin acceso a funciones de fuera; por eso hay código repetido.
 */

/* Unirse con el código: el alumnado del curso queda inscrito en la asignatura (si tiene espacio). Si ya estaba, no pasa nada. */
routerAdd(
  'POST',
  '/api/novaclass/unirse',
  e => {
    const code = String(e.requestInfo().body.code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
    if (code.length !== 8) throw new BadRequestError('El código tiene 8 letras y números.')
    let as
    try {
      as = e.app.findFirstRecordByData('asignaturas', 'join_code', code)
    } catch {
      throw new NotFoundError('Ese código no es de ninguna asignatura. Revisa que esté bien escrito.')
    }
    if (as.getString('school') !== e.auth.getString('school')) {
      throw new NotFoundError('Ese código no es de ninguna asignatura. Revisa que esté bien escrito.')
    }
    const uid = e.auth.id
    /* Solo entra el alumnado del curso de la asignatura (sin baja del curso); los Docentes ya la ven si la dan */
    let alumno = null
    try {
      alumno = e.app.findFirstRecordByFilter('curso_alumnos', 'curso = {:c} && user = {:u} && baja = false', {
        c: as.getString('curso'),
        u: uid,
      })
    } catch {
      /* no es de ese curso */
    }
    if (!alumno) throw new ForbiddenError('Esta asignatura es de otro curso. Con el código solo entra el alumnado de su curso.')
    if (!as.getBool('activa')) throw new BadRequestError('Esta asignatura aún no tiene su espacio abierto. Pregunta a quien la da.')
    let already = null
    try {
      already = e.app.findFirstRecordByFilter('inscripciones', 'asignatura = {:a} && user = {:u}', { a: as.id, u: uid })
    } catch {
      /* no estaba */
    }
    if (!already) {
      const m = new Record(e.app.findCollectionByNameOrId('inscripciones'))
      m.set('asignatura', as.id)
      m.set('user', uid)
      e.app.save(m)
    }
    return e.json(200, { asignatura: as.id, curso: as.getString('curso'), name: as.getString('nombre'), already: !!already })
  },
  $apis.requireAuth('users'),
)

/* Ver el código: los Docentes de la asignatura o la dirección de su escuela */
routerAdd(
  'GET',
  '/api/novaclass/asignaturas/{id}/codigo',
  e => {
    let as
    try {
      as = e.app.findRecordById('asignaturas', e.request.pathValue('id'))
    } catch {
      throw new NotFoundError('No existe esa asignatura.')
    }
    const uid = e.auth.id
    let staff = false
    try {
      e.app.findFirstRecordByFilter('school_staff', 'school = {:s} && user = {:u}', { s: as.getString('school'), u: uid })
      staff = true
    } catch {
      /* no es de la dirección */
    }
    if (!staff && !as.getStringSlice('docentes').includes(uid)) {
      throw new ForbiddenError('Solo los Docentes de la asignatura o la dirección ven su código.')
    }
    return e.json(200, { code: as.getString('join_code') })
  },
  $apis.requireAuth('users'),
)

/* Cambiar el código (si se ha filtrado): el anterior deja de servir */
routerAdd(
  'POST',
  '/api/novaclass/asignaturas/{id}/codigo',
  e => {
    let as
    try {
      as = e.app.findRecordById('asignaturas', e.request.pathValue('id'))
    } catch {
      throw new NotFoundError('No existe esa asignatura.')
    }
    const uid = e.auth.id
    let staff = false
    try {
      e.app.findFirstRecordByFilter('school_staff', 'school = {:s} && user = {:u}', { s: as.getString('school'), u: uid })
      staff = true
    } catch {
      /* no es de la dirección */
    }
    if (!staff && !as.getStringSlice('docentes').includes(uid)) {
      throw new ForbiddenError('Solo los Docentes de la asignatura o la dirección cambian su código.')
    }
    let code = ''
    for (let i = 0; i < 5; i++) {
      code = $security.randomStringWithAlphabet(8, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
      try {
        e.app.findFirstRecordByData('asignaturas', 'join_code', code)
      } catch {
        break
      }
    }
    as.set('join_code', code)
    e.app.save(as)
    return e.json(200, { code })
  },
  $apis.requireAuth('users'),
)
