/// <reference path="../pb_data/types.d.ts" />

/*
 * Modelo v2 (docs/escuelas.md, «Modelo v2»): escuela → cursos → alumnado, y asignaturas con su horario y su espacio.
 *
 * - La escuela (Director o Coordinador, en school_staff) crea las cuentas, los cursos, sus asignaturas y el horario.
 * - Cada alumno está en su curso (curso_alumnos), con cargo de Delegado o Subdelegado si lo tiene.
 * - Cada asignatura es de un curso, tiene uno o más Docentes, color y forma, y un código para entrar en su espacio
 *   (entregas, exámenes, temas, dudas y apuntes): quien entra queda en inscripciones.
 * - El horario es por curso: en cada día y franja, una asignatura y su Docente.
 *
 * Sustituye a groups, memberships, schedule y modules de la v1 y mueve el contenido de «grupo + módulo» a asignatura.
 * Pasa Sant Josep Obrer a este modelo: los 10 Docentes del horario pasan a ser cuentas de la escuela.
 *
 * Las reglas de API son la seguridad de verdad. Cada función de abajo usa su propio alias de @collection: con el
 * mismo alias, PocketBase comprueba todas las condiciones sobre la misma fila.
 */

const ME = '@request.auth.id'
const AUTH = ME + " != ''"
const MY_SCHOOL = '@request.auth.school'

/* Es de la dirección (Director o Coordinador) de la escuela `s` */
const staff = (s, a) => `(@collection.school_staff:${a}.school ?= ${s} && @collection.school_staff:${a}.user ?= ${ME})`
/* Ha entrado con el código en la asignatura `as` */
const inscrito = (as, a) => `(@collection.inscripciones:${a}.asignatura ?= ${as} && @collection.inscripciones:${a}.user ?= ${ME})`
/* Es Delegado o Subdelegado (en activo) del curso `c` */
const delegado = (c, a) =>
  `(@collection.curso_alumnos:${a}.curso ?= ${c} && @collection.curso_alumnos:${a}.user ?= ${ME} && @collection.curso_alumnos:${a}.baja ?= false && (@collection.curso_alumnos:${a}.cargo ?= 'delegado' || @collection.curso_alumnos:${a}.cargo ?= 'subdelegado'))`

/* Contenido de una asignatura (campo `asignatura`): quién lo lee, lo gestiona, escribe en él y lo modera */
const reader = as => `(${AUTH} && (${inscrito(as, 'ri')} || ${as}.docentes ?= ${ME} || ${staff(as + '.school', 'rs')}))`
const manager = as =>
  `(${as}.docentes ?= ${ME} || ${staff(as + '.school', 'ms')} || (${inscrito(as, 'mi')} && ${delegado(as + '.curso', 'md')}))`
const participant = as => `(${inscrito(as, 'pi')} || ${as}.docentes ?= ${ME})`
const moderator = as => `(${as}.docentes ?= ${ME} || ${staff(as + '.school', 'os')})`

const DATE = '^\\d{4}-\\d{2}-\\d{2}$'
const TIME = '^\\d{2}:\\d{2}$'
const COLORS = ['azul', 'naranja', 'violeta', 'verde', 'amarillo', 'cian', 'rosa', 'lima']
const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'pentagon', 'star', 'cross']

const stamps = () => [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]

/* Sant Josep Obrer, 1.º DAW A (los datos de la migración 1791500100, en el modelo nuevo) */
const SJO_TEACHERS = [
  ['montero', 'Miquel Àngel', 'Montero Pazmiño'],
  ['dustin', 'Dustin', 'de Lara Garcia'],
  ['molina', 'Miquel', 'Molina Rotger'],
  ['pau', 'Pau', 'Boixader Muñoz'],
  ['santiago', 'Santiago', 'Gómez González'],
  ['tomeu', 'Tomeu', 'Martínez Pérez'],
  ['antoni', 'Antoni', 'Morell Bennàser'],
  ['maties', 'Maties', 'Salom Avellà'],
  ['irene', 'Irene', 'Fontcuberta León'],
  ['magdalena', 'Magdalena', 'Nicolau Gamundí'],
]
/* clave del módulo v1 → asignatura: nombre, código, color, forma, tiene espacio */
const SJO_SUBJECTS = {
  pro: ['Programación', 'PRO', 'azul', 'circle', true],
  bd: ['Bases de Datos', 'BD', 'naranja', 'square', true],
  lm: ['Lenguajes de Marcas', 'LMSGI', 'violeta', 'triangle', true],
  si: ['Sistemas Informáticos', 'SI', 'verde', 'diamond', true],
  ed: ['Entornos de Desarrollo', 'ED', 'amarillo', 'hexagon', true],
  digi: ['Digitalización', 'DIGI', 'cian', 'pentagon', false],
  cpfw: ['Construcción de proyectos y frameworks web', 'CPFW', 'rosa', 'star', false],
  ipo: ['Itinerario personal para la empleabilidad I', 'IPO', 'lima', 'cross', false],
}

migrate(
  app => {
    const id = name => app.findCollectionByNameOrId(name).id
    const save = data => {
      const c = new Collection(data)
      app.save(c)
      return c
    }
    const del = name => {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch {
        /* ya no estaba */
      }
    }
    const usersId = id('users')

    /* ---------- Guardar lo que se pasa al modelo nuevo (Sant Josep Obrer) antes de borrar la v1 ---------- */
    const old = { schedule: [], teachers: {}, group: null }
    try {
      const g = app.findFirstRecordByData('groups', 'name', '1.º DAW A')
      old.group = { name: g.getString('name'), course: g.getString('course'), sessions: g.get('sessions'), break: g.get('break') }
      for (const m of app.findRecordsByFilter('memberships', 'group = {:g}', '', 0, 0, { g: g.id }))
        old.teachers[m.id] = m.getString('pending_name')
      for (const s of app.findRecordsByFilter('schedule', 'group = {:g}', '', 0, 0, { g: g.id })) {
        const mod = app.findRecordById('modules', s.getString('module'))
        old.schedule.push([s.getInt('day'), s.getInt('slot'), mod.getString('key'), old.teachers[s.getString('teacher')]])
      }
    } catch {
      /* instalación sin los datos de arranque v1 */
    }

    /* ---------- Fuera la v1 (las reglas de users usan memberships: se cambian antes) ---------- */
    const users = app.findCollectionByNameOrId('users')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    app.save(users)
    for (const name of ['answers_stats', 'dudas_stats', 'votes', 'event_status', 'events', 'topics', 'apuntes', 'schedule']) del(name)
    const dudasOld = app.findCollectionByNameOrId('dudas')
    dudasOld.fields.removeByName('accepted')
    app.save(dudasOld)
    del('answers')
    del('dudas')
    for (const name of ['memberships', 'groups']) {
      const c = app.findCollectionByNameOrId(name)
      c.listRule = c.viewRule = c.createRule = c.updateRule = c.deleteRule = null
      app.save(c)
    }
    del('memberships')
    del('groups')
    del('modules')

    /* ---------- Escuelas: nombre corto y Coordinador ---------- */
    const schools = app.findCollectionByNameOrId('schools')
    schools.fields.add(new TextField({ name: 'slug', min: 3, max: 30, pattern: '^[a-z0-9]+$' }))
    schools.indexes = [...schools.indexes, "CREATE UNIQUE INDEX idx_schools_slug ON schools (slug) WHERE slug != ''"]
    /* Las escuelas las da de alta la administración (no hay registro libre) */
    schools.createRule = null
    schools.updateRule =
      staff('id', 'sd') +
      ' && @request.body.verified:isset = false && @request.body.slug:isset = false && @request.body.created_by:isset = false'
    app.save(schools)
    const staffCol = app.findCollectionByNameOrId('school_staff')
    staffCol.fields.getByName('role').values = ['director', 'coordinador']
    app.save(staffCol)

    /* ---------- Usuarios: cuentas de la escuela ---------- */
    users.fields.add(new TextField({ name: 'nombre', max: 80 }))
    users.fields.add(new TextField({ name: 'apellidos', max: 120 }))
    /* usuario@escuela: inicial del nombre, primer apellido, inicial del segundo (scollp@santjosepobrer) */
    users.fields.add(new TextField({ name: 'username', max: 60, pattern: '^[a-z0-9]+@[a-z0-9]+$' }))
    /* ID del centro (NIA): oculto en la API; lo verán el Director y el Tutor con una ruta propia */
    users.fields.add(new TextField({ name: 'nia', max: 30, hidden: true }))
    users.fields.add(new RelationField({ name: 'school', collectionId: id('schools'), maxSelect: 1 }))
    users.fields.add(new SelectField({ name: 'role', values: ['estudiante', 'docente'], maxSelect: 1 }))
    users.fields.add(new BoolField({ name: 'must_change_password' }))
    users.fields.getByName('email').required = false
    users.passwordAuth.identityFields = ['email', 'username']
    users.indexes = [...users.indexes, "CREATE UNIQUE INDEX idx_users_username ON users (username) WHERE username != ''"]
    /* Nadie se registra solo; cada uno cambia su contraseña, su avatar o su correo, pero no quién es ni dónde está */
    users.createRule = null
    users.deleteRule = null
    users.updateRule =
      'id = @request.auth.id && @request.body.school:isset = false && @request.body.role:isset = false && @request.body.username:isset = false' +
      ' && @request.body.nia:isset = false && @request.body.nombre:isset = false && @request.body.apellidos:isset = false && @request.body.name:isset = false'
    users.listRule = `id = ${ME} || (school != '' && school = ${MY_SCHOOL})`
    users.viewRule = users.listRule
    app.save(users)

    /* ---------- Cursos y su alumnado ---------- */
    save({
      type: 'base',
      name: 'cursos',
      listRule: `${AUTH} && school = ${MY_SCHOOL}`,
      viewRule: `${AUTH} && school = ${MY_SCHOOL}`,
      createRule: AUTH + ' && ' + staff('@request.body.school', 'cs'),
      updateRule: staff('school', 'cs') + ' && @request.body.school:isset = false',
      deleteRule: staff('school', 'cs'),
      fields: [
        { name: 'school', type: 'relation', collectionId: id('schools'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'name', type: 'text', required: true, max: 80 }, // «1.º DAW A»
        { name: 'course', type: 'text', required: true, max: 20 }, // «26/27»
        /* Franjas del día [{start, end}, …] y patio {start, end, after}: las marca la dirección */
        { name: 'sessions', type: 'json', required: true, maxSize: 4000 },
        { name: 'break', type: 'json', maxSize: 1000 },
        { name: 'tutor', type: 'relation', collectionId: usersId, maxSelect: 1 },
        ...stamps(),
      ],
    })

    save({
      type: 'base',
      name: 'curso_alumnos',
      listRule: `${AUTH} && curso.school = ${MY_SCHOOL}`,
      viewRule: `${AUTH} && curso.school = ${MY_SCHOOL}`,
      createRule: AUTH + ' && ' + staff('@request.body.curso.school', 'cs'),
      /* La dirección cambia todo; el Tutor del curso nombra Delegado y Subdelegado */
      updateRule:
        '(' +
        staff('curso.school', 'cs') +
        ' || (curso.tutor = ' +
        ME +
        ' && @request.body.baja:isset = false)) && @request.body.curso:isset = false && @request.body.user:isset = false',
      deleteRule: staff('curso.school', 'cs'),
      fields: [
        { name: 'curso', type: 'relation', collectionId: id('cursos'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'user', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'cargo', type: 'select', values: ['delegado', 'subdelegado'], maxSelect: 1 },
        /* Baja del curso: deja de ver todo lo del curso */
        { name: 'baja', type: 'bool' },
        ...stamps(),
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_curso_alumnos_user ON curso_alumnos (curso, user)',
        "CREATE UNIQUE INDEX idx_curso_alumnos_cargo ON curso_alumnos (curso, cargo) WHERE cargo != ''",
      ],
    })

    /* ---------- Asignaturas, horario e inscripciones ---------- */
    save({
      type: 'base',
      name: 'asignaturas',
      listRule: `${AUTH} && school = ${MY_SCHOOL}`,
      viewRule: `${AUTH} && school = ${MY_SCHOOL}`,
      createRule: AUTH + ' && ' + staff('@request.body.school', 'as'),
      /* La dirección cambia todo; sus Docentes, la etiqueta (nombre, código, color, forma) y si el espacio está abierto */
      updateRule:
        '(' +
        staff('school', 'as') +
        ' || (docentes ?= ' +
        ME +
        ' && @request.body.school:isset = false && @request.body.curso:isset = false && @request.body.docentes:isset = false)) && @request.body.school:isset = false',
      deleteRule: staff('school', 'as'),
      fields: [
        { name: 'school', type: 'relation', collectionId: id('schools'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'curso', type: 'relation', collectionId: id('cursos'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'nombre', type: 'text', required: true, max: 120 },
        { name: 'codigo', type: 'text', required: true, max: 10 },
        { name: 'color', type: 'select', required: true, values: COLORS, maxSelect: 1 },
        { name: 'forma', type: 'select', required: true, values: SHAPES, maxSelect: 1 },
        { name: 'docentes', type: 'relation', collectionId: usersId, maxSelect: 10 },
        /* El Docente ha abierto el espacio (entregas, temas, dudas, apuntes): hasta entonces solo está en el horario */
        { name: 'activa', type: 'bool' },
        /* Código para entrar en el espacio de la asignatura; oculto en la API (rutas en pb_hooks/clases.pb.js) */
        { name: 'join_code', type: 'text', min: 8, max: 8, hidden: true, autogeneratePattern: '[A-HJ-NP-Z2-9]{8}' },
        ...stamps(),
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_asignaturas_code ON asignaturas (join_code)',
        'CREATE INDEX idx_asignaturas_curso ON asignaturas (curso)',
      ],
    })

    save({
      type: 'base',
      name: 'horario',
      listRule: `${AUTH} && curso.school = ${MY_SCHOOL}`,
      viewRule: `${AUTH} && curso.school = ${MY_SCHOOL}`,
      createRule: AUTH + ' && ' + staff('@request.body.curso.school', 'hs'),
      updateRule: staff('curso.school', 'hs') + ' && @request.body.curso:isset = false',
      deleteRule: staff('curso.school', 'hs'),
      fields: [
        { name: 'curso', type: 'relation', collectionId: id('cursos'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'day', type: 'number', required: true, onlyInt: true, min: 1, max: 5 }, // 1 = lunes
        { name: 'slot', type: 'number', onlyInt: true, min: 0, max: 15 }, // índice en cursos.sessions
        { name: 'asignatura', type: 'relation', collectionId: id('asignaturas'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'docente', type: 'relation', collectionId: usersId, maxSelect: 1 },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_horario_slot ON horario (curso, day, slot)'],
    })

    save({
      type: 'base',
      name: 'inscripciones',
      listRule: `user = ${ME} || asignatura.docentes ?= ${ME} || ${staff('asignatura.school', 'is')}`,
      viewRule: `user = ${ME} || asignatura.docentes ?= ${ME} || ${staff('asignatura.school', 'is')}`,
      createRule: null, // solo con el código (POST /api/novaclass/unirse)
      updateRule: null,
      deleteRule: `asignatura.docentes ?= ${ME} || ${staff('asignatura.school', 'is')}`,
      fields: [
        { name: 'asignatura', type: 'relation', collectionId: id('asignaturas'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'user', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_inscripciones_once ON inscripciones (asignatura, user)'],
    })

    save({
      type: 'base',
      name: 'festivos',
      listRule: `${AUTH} && school = ${MY_SCHOOL}`,
      viewRule: `${AUTH} && school = ${MY_SCHOOL}`,
      createRule: AUTH + ' && ' + staff('@request.body.school', 'fs'),
      updateRule: staff('school', 'fs') + ' && @request.body.school:isset = false',
      deleteRule: staff('school', 'fs'),
      fields: [
        { name: 'school', type: 'relation', collectionId: id('schools'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'date', type: 'text', required: true, pattern: DATE },
        ...stamps(),
      ],
    })

    /* ---------- Contenido de cada asignatura ---------- */
    const content = (name, fields, rules, indexes = []) =>
      save({
        type: 'base',
        name,
        ...rules,
        fields: [
          { name: 'asignatura', type: 'relation', collectionId: id('asignaturas'), required: true, maxSelect: 1, cascadeDelete: true },
          ...fields,
          ...stamps(),
        ],
        indexes,
      })
    const managed = {
      listRule: reader('asignatura'),
      viewRule: reader('asignatura'),
      createRule: AUTH + ' && ' + manager('@request.body.asignatura'),
      updateRule: manager('asignatura') + ' && @request.body.asignatura:isset = false',
      deleteRule: manager('asignatura'),
    }

    content(
      'topics',
      [
        { name: 'title', type: 'text', required: true, max: 120 },
        { name: 'status', type: 'text', max: 20 }, // «ok», «now» o el mes previsto
        { name: 'order', type: 'number', onlyInt: true },
      ],
      managed,
    )

    content(
      'dudas',
      [
        { name: 'author', type: 'relation', collectionId: usersId, required: true, maxSelect: 1 },
        { name: 'title', type: 'text', required: true, min: 10, max: 140 },
        { name: 'body', type: 'text', required: true, min: 20, max: 10000 },
        { name: 'code', type: 'text', max: 10000 },
        { name: 'tags', type: 'json', maxSize: 500 },
        { name: 'views', type: 'number', onlyInt: true, min: 0 },
        { name: 'edited', type: 'bool' },
        { name: 'deleted', type: 'bool' },
      ],
      {
        listRule: reader('asignatura') + ' && (deleted = false || author = ' + ME + ')',
        viewRule: reader('asignatura') + ' && (deleted = false || author = ' + ME + ')',
        createRule:
          AUTH +
          ' && @request.body.author = ' +
          ME +
          ' && ' +
          participant('@request.body.asignatura') +
          ' && @request.body.views:isset = false && @request.body.accepted:isset = false && @request.body.deleted:isset = false',
        updateRule:
          'author = ' +
          ME +
          ' && @request.body.author:isset = false && @request.body.asignatura:isset = false && @request.body.views:isset = false',
        deleteRule: 'author = ' + ME + ' || ' + moderator('asignatura'),
      },
      ['CREATE INDEX idx_dudas_asignatura ON dudas (asignatura, created)'],
    )

    save({
      type: 'base',
      name: 'answers',
      listRule: reader('duda.asignatura') + ' && duda.deleted = false',
      viewRule: reader('duda.asignatura') + ' && duda.deleted = false',
      createRule:
        AUTH +
        ' && @request.body.author = ' +
        ME +
        ' && ' +
        participant('@request.body.duda.asignatura') +
        ' && @request.body.duda.deleted = false',
      updateRule: 'author = ' + ME + ' && @request.body.author:isset = false && @request.body.duda:isset = false',
      deleteRule: 'author = ' + ME + ' || ' + moderator('duda.asignatura'),
      fields: [
        { name: 'duda', type: 'relation', collectionId: id('dudas'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'author', type: 'relation', collectionId: usersId, required: true, maxSelect: 1 },
        { name: 'body', type: 'text', required: true, min: 1, max: 10000 },
        { name: 'code', type: 'text', max: 10000 },
        { name: 'after', type: 'text', max: 5000 },
        ...stamps(),
      ],
      indexes: ['CREATE INDEX idx_answers_duda ON answers (duda, created)'],
    })
    const dudas = app.findCollectionByNameOrId('dudas')
    dudas.fields.add(new RelationField({ name: 'accepted', collectionId: id('answers'), maxSelect: 1 }))
    dudas.updateRule += " && (@request.body.accepted:isset = false || @request.body.accepted = '' || @request.body.accepted.duda = id)"
    app.save(dudas)

    save({
      type: 'base',
      name: 'votes',
      listRule: reader('duda.asignatura'),
      viewRule: reader('duda.asignatura'),
      createRule:
        AUTH +
        ' && @request.body.user = ' +
        ME +
        ' && ' +
        participant('@request.body.duda.asignatura') +
        " && (@request.body.answer:isset = false || @request.body.answer = '' || @request.body.answer.duda = @request.body.duda)",
      updateRule:
        'user = ' + ME + ' && @request.body.user:isset = false && @request.body.duda:isset = false && @request.body.answer:isset = false',
      deleteRule: 'user = ' + ME,
      fields: [
        { name: 'user', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'duda', type: 'relation', collectionId: id('dudas'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'answer', type: 'relation', collectionId: id('answers'), maxSelect: 1, cascadeDelete: true },
        { name: 'value', type: 'number', required: true, onlyInt: true, min: -1, max: 1 },
        ...stamps(),
      ],
      indexes: ["CREATE UNIQUE INDEX idx_votes_once ON votes (user, duda, IFNULL(answer, ''))"],
    })

    content(
      'events',
      [
        { name: 'type', type: 'select', required: true, values: ['entrega', 'examen'], maxSelect: 1 },
        { name: 'title', type: 'text', required: true, max: 140 },
        { name: 'date', type: 'text', required: true, pattern: DATE },
        { name: 'time', type: 'text', pattern: TIME },
        { name: 'end', type: 'text', pattern: TIME },
        { name: 'tema', type: 'text', max: 80 },
        { name: 'kind', type: 'text', max: 40 },
        { name: 'files', type: 'text', max: 120 },
        { name: 'where', type: 'text', max: 120 },
        { name: 'topics', type: 'json', maxSize: 4000 },
        { name: 'about', type: 'text', max: 2000 },
        { name: 'related', type: 'relation', collectionId: id('dudas'), maxSelect: 1 },
      ],
      managed,
      ['CREATE INDEX idx_events_asignatura_date ON events (asignatura, date)'],
    )

    save({
      type: 'base',
      name: 'event_status',
      listRule: 'user = ' + ME,
      viewRule: 'user = ' + ME,
      createRule: AUTH + ' && @request.body.user = ' + ME + ' && ' + reader('@request.body.event.asignatura'),
      updateRule: 'user = ' + ME + ' && @request.body.user:isset = false && @request.body.event:isset = false',
      deleteRule: 'user = ' + ME,
      fields: [
        { name: 'user', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'event', type: 'relation', collectionId: id('events'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'done', type: 'bool' },
        { name: 'grade', type: 'text', max: 10 },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_event_status_once ON event_status (user, event)'],
    })

    content(
      'apuntes',
      [
        { name: 'author', type: 'relation', collectionId: usersId, required: true, maxSelect: 1 },
        { name: 'type', type: 'select', required: true, values: ['pdf', 'enlace', 'nota'], maxSelect: 1 },
        { name: 'title', type: 'text', required: true, min: 3, max: 140 },
        { name: 'tema', type: 'text', max: 80 },
        { name: 'file', type: 'file', maxSelect: 1, maxSize: 20 * 1024 * 1024, mimeTypes: ['application/pdf'], protected: true },
        { name: 'bytes', type: 'number', onlyInt: true, min: 0 },
        { name: 'url', type: 'url' },
        { name: 'body', type: 'text', max: 20000 },
        { name: 'downloads', type: 'number', onlyInt: true, min: 0 },
      ],
      {
        listRule: reader('asignatura'),
        viewRule: reader('asignatura'),
        createRule:
          AUTH +
          ' && @request.body.author = ' +
          ME +
          ' && ' +
          participant('@request.body.asignatura') +
          ' && @request.body.downloads:isset = false',
        updateRule:
          'author = ' +
          ME +
          ' && @request.body.author:isset = false && @request.body.asignatura:isset = false && @request.body.downloads:isset = false',
        deleteRule: 'author = ' + ME + ' || ' + moderator('asignatura'),
      },
      ['CREATE INDEX idx_apuntes_asignatura ON apuntes (asignatura)'],
    )

    save({
      type: 'view',
      name: 'dudas_stats',
      listRule: reader('asignatura'),
      viewRule: reader('asignatura'),
      viewQuery: `
        SELECT d.id, d.asignatura,
          (SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.duda = d.id AND IFNULL(v.answer, '') = '') AS votes,
          (SELECT COUNT(*) FROM answers a WHERE a.duda = d.id) AS answers
        FROM dudas d WHERE d.deleted = FALSE`,
    })
    save({
      type: 'view',
      name: 'answers_stats',
      listRule: reader('duda.asignatura'),
      viewRule: reader('duda.asignatura'),
      viewQuery: `
        SELECT a.id, a.duda,
          (SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.answer = a.id) AS votes
        FROM answers a`,
    })

    /* ---------- Sant Josep Obrer en el modelo nuevo ---------- */
    let school = null
    try {
      school = app.findFirstRecordByData('schools', 'name', 'Sant Josep Obrer')
    } catch {
      return
    }
    school.set('slug', 'santjosepobrer')
    app.save(school)
    const record = (name, data) => {
      const r = new Record(app.findCollectionByNameOrId(name))
      for (const [k, v] of Object.entries(data)) r.set(k, v)
      app.save(r)
      return r
    }
    /* Usuario: inicial del nombre + primer apellido + inicial del segundo, sin tildes ni espacios */
    const clean = s =>
      String(s || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .trim()
    const PARTICLES = ['de', 'del', 'la', 'las', 'los', 'y', 'i']
    const surnames = ap => {
      const words = clean(ap).split(/\s+/).filter(Boolean)
      const out = []
      let cur = []
      for (const w of words) {
        cur.push(w)
        if (!PARTICLES.includes(w)) {
          out.push(cur.join(''))
          cur = []
        }
      }
      if (cur.length) out.push(cur.join(''))
      return out
    }
    const username = (nombre, apellidos) => {
      const [first = '', second = ''] = surnames(apellidos)
      const base = clean(nombre).replace(/ /g, '').slice(0, 1) + first + second.slice(0, 1)
      for (let n = 1; ; n++) {
        const u = base + (n > 1 ? n : '') + '@santjosepobrer'
        try {
          app.findFirstRecordByData('users', 'username', u)
        } catch {
          return u
        }
      }
    }

    const curso = record('cursos', {
      school: school.id,
      name: old.group ? old.group.name : '1.º DAW A',
      course: old.group ? old.group.course : '26/27',
      sessions: old.group ? old.group.sessions : [],
      break: old.group ? old.group.break : null,
    })
    const teacherIds = {}
    for (const [key, nombre, apellidos] of SJO_TEACHERS) {
      /* Contraseña al azar que nadie conoce: la dirección les dará una temporal al darles acceso (fase 2) */
      const u = new Record(app.findCollectionByNameOrId('users'))
      u.set('nombre', nombre)
      u.set('apellidos', apellidos)
      u.set('name', nombre + ' ' + apellidos)
      u.set('username', username(nombre, apellidos))
      u.set('school', school.id)
      u.set('role', 'docente')
      u.set('must_change_password', true)
      u.setPassword($security.randomString(24))
      app.save(u)
      teacherIds[key] = u.id
      teacherIds[nombre + ' ' + apellidos] = u.id
    }
    /* Asignaturas con los Docentes que las dan según el horario */
    const schedule = old.schedule
    const asignaturas = {}
    for (const [key, [nombre, codigo, color, forma, activa]] of Object.entries(SJO_SUBJECTS)) {
      const docentes = [
        ...new Set(
          schedule
            .filter(s => s[2] === key)
            .map(s => teacherIds[s[3]])
            .filter(Boolean),
        ),
      ]
      asignaturas[key] = record('asignaturas', { school: school.id, curso: curso.id, nombre, codigo, color, forma, docentes, activa })
    }
    for (const [day, slot, key, teacher] of schedule) {
      record('horario', { curso: curso.id, day, slot, asignatura: asignaturas[key].id, docente: teacherIds[teacher] || '' })
    }
  },
  () => {
    throw new Error('El modelo v2 no se puede deshacer automáticamente: restaura una copia de pb_data.')
  },
)
