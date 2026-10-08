/// <reference path="../pb_data/types.d.ts" />

/*
 * Entrar en una clase con su código, y ver o cambiar ese código (docs/escuelas.md, «Cuentas: dos vías»).
 * El código está oculto en la API (groups.join_code es hidden); estas rutas son la única forma de verlo y usarlo.
 *
 * Nota: en PocketBase cada handler corre aislado, sin acceso a funciones de fuera; por eso hay código repetido.
 */

/* Unirse con el código: queda como Estudiante. Si ya estaba, no pasa nada. */
routerAdd(
  'POST',
  '/api/novaclass/unirse',
  e => {
    const code = String(e.requestInfo().body.code || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
    if (code.length !== 8) throw new BadRequestError('El código tiene 8 letras y números.')
    let group
    try {
      group = e.app.findFirstRecordByData('groups', 'join_code', code)
    } catch {
      throw new NotFoundError('Ese código no es de ninguna clase. Revisa que esté bien escrito.')
    }
    const uid = e.auth.id
    let already = null
    try {
      already = e.app.findFirstRecordByFilter('memberships', 'group = {:g} && user = {:u}', { g: group.id, u: uid })
    } catch {
      /* no estaba */
    }
    if (!already) {
      const m = new Record(e.app.findCollectionByNameOrId('memberships'))
      m.set('group', group.id)
      m.set('user', uid)
      m.set('role', 'estudiante')
      e.app.save(m)
    }
    return e.json(200, { group: group.id, name: group.getString('name'), already: !!already })
  },
  $apis.requireAuth('users'),
)

/* Ver el código: el Tutor de la clase o la dirección de su escuela */
routerAdd(
  'GET',
  '/api/novaclass/clases/{id}/codigo',
  e => {
    let group
    try {
      group = e.app.findRecordById('groups', e.request.pathValue('id'))
    } catch {
      throw new NotFoundError('No existe esa clase.')
    }
    const uid = e.auth.id
    const can = (col, filter, params) => {
      try {
        e.app.findFirstRecordByFilter(col, filter, params)
        return true
      } catch {
        return false
      }
    }
    const ok =
      can('memberships', "group = {:g} && user = {:u} && cargo = 'tutor'", { g: group.id, u: uid }) ||
      can('school_staff', 'school = {:s} && user = {:u}', { s: group.getString('school'), u: uid })
    if (!ok) throw new ForbiddenError('Solo el Tutor o la dirección ven el código de la clase.')
    return e.json(200, { code: group.getString('join_code') })
  },
  $apis.requireAuth('users'),
)

/* Cambiar el código (si se ha filtrado): el anterior deja de servir */
routerAdd(
  'POST',
  '/api/novaclass/clases/{id}/codigo',
  e => {
    let group
    try {
      group = e.app.findRecordById('groups', e.request.pathValue('id'))
    } catch {
      throw new NotFoundError('No existe esa clase.')
    }
    const uid = e.auth.id
    const can = (col, filter, params) => {
      try {
        e.app.findFirstRecordByFilter(col, filter, params)
        return true
      } catch {
        return false
      }
    }
    const ok =
      can('memberships', "group = {:g} && user = {:u} && cargo = 'tutor'", { g: group.id, u: uid }) ||
      can('school_staff', 'school = {:s} && user = {:u}', { s: group.getString('school'), u: uid })
    if (!ok) throw new ForbiddenError('Solo el Tutor o la dirección cambian el código de la clase.')
    /* 8 caracteres sin O/0 ni I/1 (los que se confunden), como los que genera la colección */
    let code = ''
    for (let i = 0; i < 5; i++) {
      code = $security.randomStringWithAlphabet(8, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
      try {
        e.app.findFirstRecordByData('groups', 'join_code', code)
      } catch {
        break
      }
    }
    group.set('join_code', code)
    e.app.save(group)
    return e.json(200, { code })
  },
  $apis.requireAuth('users'),
)
