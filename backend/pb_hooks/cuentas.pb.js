/// <reference path="../pb_data/types.d.ts" />

/*
 * Cuentas de la escuela (docs/escuelas.md, «Cuentas»): las crea la dirección, de una en una o con una lista, y salen
 * con su usuario@escuela y una contraseña temporal que hay que cambiar al entrar. La dirección y el Tutor (de su
 * alumnado) dan una contraseña nueva a quien la olvida. Nadie se registra solo (users.createRule = null).
 *
 * Nota: en PocketBase cada handler corre aislado, sin acceso a funciones de fuera; por eso hay código repetido.
 */

/*
 * Crear cuentas: { people: [{ nombre, apellidos, nia, role, curso }] }. Solo la dirección (Director o Coordinador),
 * en su escuela. O se crean todas o ninguna: si alguna fila está mal, devuelve 400 con el error de cada una.
 * Responde { created: [{ id, name, username, password, role, curso }] }: las contraseñas solo se ven aquí.
 */
routerAdd(
  'POST',
  '/api/novaclass/cuentas',
  e => {
    let staff
    try {
      staff = e.app.findFirstRecordByFilter('school_staff', 'user = {:u}', { u: e.auth.id })
    } catch {
      throw new ForbiddenError('Solo la dirección de la escuela crea cuentas.')
    }
    const school = e.app.findRecordById('schools', staff.getString('school'))
    const slug = school.getString('slug')
    if (!slug) throw new BadRequestError('La escuela aún no tiene nombre corto.')
    const people = e.requestInfo().body.people
    if (!Array.isArray(people) || !people.length) throw new BadRequestError('No hay nadie en la lista.')
    if (people.length > 300) throw new BadRequestError('Como mucho 300 cuentas de una vez.')

    /* Comprobar todas las filas antes de crear nada */
    const text = v =>
      String(v == null ? '' : v)
        .trim()
        .replace(/\s+/g, ' ')
    const rows = []
    const errors = []
    const nias = {}
    people.forEach((p, i) => {
      const row = { nombre: text(p.nombre), apellidos: text(p.apellidos), nia: text(p.nia), role: text(p.role), curso: text(p.curso) }
      let error = ''
      if (!row.nombre || row.nombre.length > 60) error = 'Falta el nombre.'
      else if (!row.apellidos || row.apellidos.length > 80) error = 'Faltan los apellidos.'
      else if (row.role !== 'estudiante' && row.role !== 'docente') error = 'Tiene que ser Estudiante o Docente.'
      else if (row.nia.length > 30) error = 'El NIA es demasiado largo.'
      else if (row.role === 'estudiante' && !row.curso) error = 'Falta el curso.'
      if (!error && row.curso) {
        try {
          const c = e.app.findRecordById('cursos', row.curso)
          if (c.getString('school') !== school.id) error = 'Ese curso es de otra escuela.'
        } catch {
          error = 'Ese curso no existe.'
        }
      }
      if (!error && row.nia) {
        if (nias[row.nia]) error = 'NIA repetido en la lista.'
        nias[row.nia] = true
        try {
          e.app.findFirstRecordByFilter('users', 'school = {:s} && nia = {:n}', { s: school.id, n: row.nia })
          error = 'Ya hay una cuenta con este NIA.'
        } catch {
          /* NIA libre */
        }
      }
      if (error) errors.push({ index: i, error })
      rows.push(row)
    })
    if (errors.length) {
      /* Con e.json y no con un error: PocketBase reescribe el `data` de los errores a su formato de validación */
      const message = errors.length === 1 ? 'Hay una fila con errores.' : `Hay ${errors.length} filas con errores.`
      return e.json(400, { status: 400, message, data: { rows: errors } })
    }

    /* usuario@escuela: inicial del nombre + primer apellido + inicial del segundo, sin tildes; las partículas van con el apellido */
    const clean = s =>
      String(s || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .trim()
    const PARTICLES = ['de', 'del', 'la', 'las', 'los', 'y', 'i']
    const base = (nombre, apellidos) => {
      const out = []
      let cur = []
      for (const w of clean(apellidos).split(/\s+/).filter(Boolean)) {
        cur.push(w)
        if (PARTICLES.indexOf(w) < 0) {
          out.push(cur.join(''))
          cur = []
        }
      }
      if (cur.length) out.push(cur.join(''))
      const first = out[0] || ''
      const second = out[1] || ''
      return (clean(nombre).replace(/ /g, '').slice(0, 1) + first + second.slice(0, 1)).slice(0, 40) || 'usuario'
    }
    const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

    const created = []
    e.app.runInTransaction(tx => {
      const users = tx.findCollectionByNameOrId('users')
      const alumnos = tx.findCollectionByNameOrId('curso_alumnos')
      for (const row of rows) {
        const b = base(row.nombre, row.apellidos)
        let username = ''
        for (let n = 1; ; n++) {
          const u = b + (n > 1 ? n : '') + '@' + slug
          try {
            tx.findFirstRecordByData('users', 'username', u)
          } catch {
            username = u
            break
          }
        }
        const password = $security.randomStringWithAlphabet(10, ALPHABET)
        const u = new Record(users)
        u.set('nombre', row.nombre)
        u.set('apellidos', row.apellidos)
        u.set('name', row.nombre + ' ' + row.apellidos)
        u.set('username', username)
        u.set('nia', row.nia)
        u.set('school', school.id)
        u.set('role', row.role)
        u.set('must_change_password', true)
        u.setPassword(password)
        tx.save(u)
        if (row.role === 'estudiante') {
          const a = new Record(alumnos)
          a.set('curso', row.curso)
          a.set('user', u.id)
          tx.save(a)
        }
        created.push({ id: u.id, name: u.getString('name'), username, password, role: row.role, curso: row.curso })
      }
    })
    return e.json(200, { created })
  },
  $apis.requireAuth('users'),
)

/*
 * Contraseña nueva para alguien que la ha olvidado: la dirección de su escuela, o el Tutor de su curso si es su
 * Estudiante. Sale una temporal que tendrá que cambiar al entrar, y se cierran sus sesiones abiertas.
 */
routerAdd(
  'POST',
  '/api/novaclass/cuentas/{id}/clave',
  e => {
    let u
    try {
      u = e.app.findRecordById('users', e.request.pathValue('id'))
    } catch {
      throw new NotFoundError('No existe esa cuenta.')
    }
    const me = e.auth.id
    const school = u.getString('school')
    let allowed = false
    if (school) {
      try {
        e.app.findFirstRecordByFilter('school_staff', 'school = {:s} && user = {:u}', { s: school, u: me })
        allowed = true
      } catch {
        /* no es de la dirección */
      }
    }
    if (!allowed && u.getString('role') === 'estudiante') {
      try {
        e.app.findFirstRecordByFilter('curso_alumnos', 'user = {:a} && baja = false && curso.tutor = {:t}', { a: u.id, t: me })
        allowed = true
      } catch {
        /* no es su Tutor */
      }
    }
    if (!allowed || u.id === me) throw new ForbiddenError('No puedes cambiar la contraseña de esta cuenta.')
    const password = $security.randomStringWithAlphabet(10, 'abcdefghjkmnpqrstuvwxyz23456789')
    u.setPassword(password)
    u.set('must_change_password', true)
    e.app.save(u)
    return e.json(200, { id: u.id, name: u.getString('name'), username: u.getString('username'), password })
  },
  $apis.requireAuth('users'),
)

/* El NIA del alumnado de un curso (oculto en la API): lo ven la dirección de su escuela y su Tutor */
routerAdd(
  'GET',
  '/api/novaclass/cursos/{id}/nias',
  e => {
    let curso
    try {
      curso = e.app.findRecordById('cursos', e.request.pathValue('id'))
    } catch {
      throw new NotFoundError('No existe ese curso.')
    }
    const me = e.auth.id
    let allowed = curso.getString('tutor') === me
    if (!allowed) {
      try {
        e.app.findFirstRecordByFilter('school_staff', 'school = {:s} && user = {:u}', { s: curso.getString('school'), u: me })
        allowed = true
      } catch {
        /* ni Tutor ni dirección */
      }
    }
    if (!allowed) throw new ForbiddenError('Solo la dirección y el Tutor ven el NIA.')
    const out = {}
    for (const a of e.app.findRecordsByFilter('curso_alumnos', 'curso = {:c}', '', 0, 0, { c: curso.id })) {
      try {
        out[a.getString('user')] = e.app.findRecordById('users', a.getString('user')).getString('nia')
      } catch {
        /* cuenta borrada */
      }
    }
    return e.json(200, out)
  },
  $apis.requireAuth('users'),
)

/* Al cambiar uno mismo su contraseña, deja de tener que cambiarla */
onRecordUpdateRequest(e => {
  if (e.auth && e.auth.id === e.record.id && e.requestInfo().body.password) e.record.set('must_change_password', false)
  e.next()
}, 'users')
