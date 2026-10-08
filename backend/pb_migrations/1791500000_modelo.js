/// <reference path="../pb_data/types.d.ts" />

/*
 * Modelo de datos de NovaClass (PocketBase 0.40). Plan en docs/escuelas.md.
 *
 * Escuela → clases (groups) → personas (memberships: Estudiante o Docente, con cargo Tutor, Delegado o Subdelegado).
 * La dirección de cada escuela está en school_staff (Director). La administración de la plataforma son los
 * superusers de PocketBase: se saltan las reglas y son los únicos que verifican escuelas.
 *
 * Las reglas de API son la seguridad de verdad (el frontend solo esconde botones). Se construyen con las funciones
 * de abajo. Cada una usa su propio alias de @collection: con el mismo alias, PocketBase comprueba todas las
 * condiciones sobre la MISMA fila (comprobado: un Director de otra escuela no pasa por Director de la tuya).
 */

const ME = '@request.auth.id'
const AUTH = ME + " != ''"

/* Está en la clase `g` (con cualquier rol) */
const member = (g, a) => `(@collection.memberships:${a}.group ?= ${g} && @collection.memberships:${a}.user ?= ${ME})`
/* Es Director de la escuela `s` */
const director = (s, a) => `(@collection.school_staff:${a}.school ?= ${s} && @collection.school_staff:${a}.user ?= ${ME})`
/* Es Tutor de la clase `g` */
const tutor = (g, a) => `${member(g, a).slice(0, -1)} && @collection.memberships:${a}.cargo ?= 'tutor')`
/* Es Docente de la clase `g` (el Tutor también lo es) */
const docente = (g, a) => `${member(g, a).slice(0, -1)} && @collection.memberships:${a}.role ?= 'docente')`
/* Gestiona horario, temas, entregas y exámenes: Docentes, Delegado, Subdelegado y la dirección */
const manager = (g, s) =>
  `(${member(g, 'gm').slice(0, -1)} && (@collection.memberships:gm.role ?= 'docente' || @collection.memberships:gm.cargo ?= 'delegado' || @collection.memberships:gm.cargo ?= 'subdelegado')) || ${director(s, 'gd')})`
/* Modera dudas y apuntes (borrar): Docentes y la dirección */
const moderator = (g, s) => `(${docente(g, 'mo')} || ${director(s, 'md')})`
/* Ve lo de la clase: quien está en ella y la dirección de su escuela */
const reader = (g, s) => `(${AUTH} && (${member(g, 'rm')} || ${director(s, 'rd')}))`

const DATE = '^\\d{4}-\\d{2}-\\d{2}$'
const TIME = '^\\d{2}:\\d{2}$'

/* Campos created / updated (en migraciones no se añaden solos) */
const stamps = () => [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]

/* Contenido de una clase que gestionan Docentes, Delegado, Subdelegado y Director (horario, temas, eventos) */
const managedRules = () => ({
  listRule: reader('group', 'group.school'),
  viewRule: reader('group', 'group.school'),
  createRule: AUTH + ' && ' + manager('@request.body.group', '@request.body.group.school'),
  updateRule: manager('group', 'group.school') + ' && @request.body.group:isset = false',
  deleteRule: manager('group', 'group.school'),
})

migrate(
  app => {
    const id = name => app.findCollectionByNameOrId(name).id
    const save = data => {
      const c = new Collection(data)
      app.save(c)
      return c
    }
    const usersId = id('users')

    /* ---------- Escuelas y dirección ---------- */
    save({
      type: 'base',
      name: 'schools',
      listRule: AUTH,
      viewRule: AUTH,
      /* Cualquiera crea su escuela (y un hook le hace Director); nadie se la verifica a sí mismo */
      createRule: AUTH + ' && @request.body.created_by = ' + ME + ' && @request.body.verified:isset = false',
      updateRule: null, // se completa abajo, cuando existe school_staff
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true, min: 3, max: 120 },
        { name: 'city', type: 'text', max: 80 },
        { name: 'verified', type: 'bool' },
        /* Vacío en las escuelas que da de alta la administración (datos de arranque) */
        { name: 'created_by', type: 'relation', collectionId: usersId, maxSelect: 1 },
        ...stamps(),
      ],
    })

    save({
      type: 'base',
      name: 'school_staff',
      listRule: AUTH,
      viewRule: AUTH,
      createRule: null, // abajo
      updateRule: null,
      deleteRule: null, // abajo
      fields: [
        { name: 'school', type: 'relation', collectionId: id('schools'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'user', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'role', type: 'select', required: true, values: ['director'], maxSelect: 1 },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_school_staff_once ON school_staff (school, user)'],
    })

    const schools = app.findCollectionByNameOrId('schools')
    schools.updateRule = director('id', 'sd') + ' && @request.body.verified:isset = false && @request.body.created_by:isset = false'
    app.save(schools)

    const staff = app.findCollectionByNameOrId('school_staff')
    staff.createRule = AUTH + ' && ' + director('@request.body.school', 'sd')
    staff.deleteRule = director('school', 'sd')
    app.save(staff)

    /* ---------- Clases ---------- */
    save({
      type: 'base',
      name: 'groups',
      fields: [
        { name: 'school', type: 'relation', collectionId: id('schools'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'name', type: 'text', required: true, max: 80 }, // «1.º DAW A»
        { name: 'course', type: 'text', required: true, max: 20 }, // «26/27»
        /*
         * Código para unirse. Lo genera PocketBase (8 caracteres sin O/0 ni I/1, que se confunden) y está oculto
         * en la API: dirección y Tutor lo verán con una ruta propia (tarea «grupo»).
         */
        { name: 'join_code', type: 'text', min: 8, max: 8, hidden: true, autogeneratePattern: '[A-HJ-NP-Z2-9]{8}' },
        /* Franjas del día [{start:'15:00', end:'15:55'}, …] y patio {start, end, after} */
        { name: 'sessions', type: 'json', required: true, maxSize: 4000 },
        { name: 'break', type: 'json', maxSize: 1000 },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_groups_join_code ON groups (join_code)'],
    })

    /* ---------- Personas de cada clase ---------- */
    save({
      type: 'base',
      name: 'memberships',
      fields: [
        { name: 'group', type: 'relation', collectionId: id('groups'), required: true, maxSelect: 1, cascadeDelete: true },
        /* Vacío mientras la persona no tenga cuenta (Docentes del horario): entonces cuenta pending_name */
        { name: 'user', type: 'relation', collectionId: usersId, maxSelect: 1, cascadeDelete: true },
        { name: 'role', type: 'select', required: true, values: ['estudiante', 'docente'], maxSelect: 1 },
        { name: 'cargo', type: 'select', values: ['tutor', 'delegado', 'subdelegado'], maxSelect: 1 },
        { name: 'pending_name', type: 'text', max: 120 },
        { name: 'invite_email', type: 'email' },
        ...stamps(),
      ],
      indexes: [
        /* Una persona una vez por clase, y un solo Tutor, Delegado y Subdelegado por clase */
        "CREATE UNIQUE INDEX idx_memberships_user ON memberships (`group`, user) WHERE user != ''",
        "CREATE UNIQUE INDEX idx_memberships_cargo ON memberships (`group`, cargo) WHERE cargo != ''",
      ],
    })

    const groups = app.findCollectionByNameOrId('groups')
    groups.listRule = reader('id', 'school')
    groups.viewRule = reader('id', 'school')
    groups.createRule = AUTH + ' && ' + director('@request.body.school', 'gd')
    groups.updateRule = '(' + director('school', 'gd') + ' || ' + tutor('id', 'gt') + ') && @request.body.school:isset = false'
    groups.deleteRule = director('school', 'gd')
    app.save(groups)

    /*
     * Añadir y quitar gente: la dirección y el Tutor. El Tutor no nombra Tutor ni toca la fila del Tutor
     * (eso es de la dirección). Cualquiera puede salirse de una clase borrando su propia fila.
     */
    const ms = app.findCollectionByNameOrId('memberships')
    ms.listRule = reader('group', 'group.school')
    ms.viewRule = reader('group', 'group.school')
    ms.createRule =
      AUTH +
      ' && (' +
      director('@request.body.group.school', 'md') +
      ' || (' +
      tutor('@request.body.group', 'mt') +
      " && @request.body.cargo != 'tutor'))"
    ms.updateRule =
      '(' +
      director('group.school', 'md') +
      ' || (' +
      tutor('group', 'mt') +
      " && cargo != 'tutor' && @request.body.cargo != 'tutor')) && @request.body.group:isset = false"
    ms.deleteRule = '(' + director('group.school', 'md') + ' || (' + tutor('group', 'mt') + " && cargo != 'tutor') || user = " + ME + ')'
    app.save(ms)

    /* ---------- Usuarios: se ven entre quienes comparten clase ---------- */
    const users = app.findCollectionByNameOrId('users')
    const sharesGroup = `(@collection.memberships:ua.user ?= id && @collection.memberships:ub.user ?= ${ME} && @collection.memberships:ua.group ?= @collection.memberships:ub.group)`
    users.listRule = `id = ${ME} || ${sharesGroup}`
    users.viewRule = `id = ${ME} || ${sharesGroup}`
    app.save(users)

    /* ---------- Módulos (catálogo común; los gestiona la administración) ---------- */
    save({
      type: 'base',
      name: 'modules',
      listRule: AUTH,
      viewRule: AUTH,
      fields: [
        /* key enlaza con el frontend: color y forma salen de src/data/subjects.js */
        { name: 'key', type: 'text', required: true, pattern: '^[a-z]+$', max: 10 }, // «pro»
        { name: 'code', type: 'text', required: true, max: 10 }, // «PRO»
        { name: 'name', type: 'text', required: true, max: 120 },
        /* Las asignaturas tienen entregas, apuntes y dudas; los módulos solo de horario (DIGI, CPFW, IPO) no */
        { name: 'has_tasks', type: 'bool' },
        { name: 'order', type: 'number', onlyInt: true },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_modules_key ON modules (key)'],
    })

    /* ---------- Horario: una fila por franja ocupada ---------- */
    save({
      type: 'base',
      name: 'schedule',
      ...managedRules(),
      fields: [
        { name: 'group', type: 'relation', collectionId: id('groups'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'day', type: 'number', required: true, onlyInt: true, min: 1, max: 5 }, // 1 = lunes
        { name: 'slot', type: 'number', onlyInt: true, min: 0, max: 15 }, // índice en groups.sessions
        { name: 'module', type: 'relation', collectionId: id('modules'), required: true, maxSelect: 1 },
        /* El Docente es una persona de la clase (aunque aún no tenga cuenta) */
        { name: 'teacher', type: 'relation', collectionId: id('memberships'), maxSelect: 1 },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_schedule_slot ON schedule (`group`, day, slot)'],
    })

    /* ---------- Temas de cada módulo ---------- */
    save({
      type: 'base',
      name: 'topics',
      ...managedRules(),
      fields: [
        { name: 'group', type: 'relation', collectionId: id('groups'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'module', type: 'relation', collectionId: id('modules'), required: true, maxSelect: 1 },
        { name: 'title', type: 'text', required: true, max: 120 },
        /* «ok» visto, «now» en curso, o el mes previsto («Noviembre») */
        { name: 'status', type: 'text', max: 20 },
        { name: 'order', type: 'number', onlyInt: true },
        ...stamps(),
      ],
    })

    /* ---------- Dudas (antes que answers; «accepted» se añade después) ---------- */
    save({
      type: 'base',
      name: 'dudas',
      /* Las borradas (deleted) solo las ve quien las escribió, para poder deshacer */
      listRule: reader('group', 'group.school') + ' && (deleted = false || author = ' + ME + ')',
      viewRule: reader('group', 'group.school') + ' && (deleted = false || author = ' + ME + ')',
      createRule:
        AUTH +
        ' && @request.body.author = ' +
        ME +
        ' && ' +
        member('@request.body.group', 'cm') +
        ' && @request.body.views:isset = false && @request.body.accepted:isset = false && @request.body.deleted:isset = false',
      updateRule:
        'author = ' +
        ME +
        ' && @request.body.author:isset = false && @request.body.group:isset = false && @request.body.views:isset = false',
      deleteRule: 'author = ' + ME + ' || ' + moderator('group', 'group.school'),
      fields: [
        { name: 'group', type: 'relation', collectionId: id('groups'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'module', type: 'relation', collectionId: id('modules'), required: true, maxSelect: 1 },
        { name: 'author', type: 'relation', collectionId: usersId, required: true, maxSelect: 1 },
        /* Mismos límites que el formulario (src/lib/dudaForm.js) */
        { name: 'title', type: 'text', required: true, min: 10, max: 140 },
        { name: 'body', type: 'text', required: true, min: 20, max: 10000 },
        { name: 'code', type: 'text', max: 10000 },
        { name: 'tags', type: 'json', maxSize: 500 },
        { name: 'views', type: 'number', onlyInt: true, min: 0 },
        { name: 'edited', type: 'bool' },
        { name: 'deleted', type: 'bool' },
        ...stamps(),
      ],
      indexes: ['CREATE INDEX idx_dudas_group ON dudas (`group`, created)'],
    })

    save({
      type: 'base',
      name: 'answers',
      listRule: reader('duda.group', 'duda.group.school') + ' && duda.deleted = false',
      viewRule: reader('duda.group', 'duda.group.school') + ' && duda.deleted = false',
      createRule:
        AUTH +
        ' && @request.body.author = ' +
        ME +
        ' && ' +
        member('@request.body.duda.group', 'cm') +
        ' && @request.body.duda.deleted = false',
      updateRule: 'author = ' + ME + ' && @request.body.author:isset = false && @request.body.duda:isset = false',
      deleteRule: 'author = ' + ME + ' || ' + moderator('duda.group', 'duda.group.school'),
      fields: [
        { name: 'duda', type: 'relation', collectionId: id('dudas'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'author', type: 'relation', collectionId: usersId, required: true, maxSelect: 1 },
        { name: 'body', type: 'text', required: true, min: 1, max: 10000 },
        ...stamps(),
      ],
      indexes: ['CREATE INDEX idx_answers_duda ON answers (duda, created)'],
    })

    /* La respuesta aceptada: solo quien preguntó (updateRule de dudas) y solo una respuesta de esa duda */
    const dudas = app.findCollectionByNameOrId('dudas')
    dudas.fields.add(new RelationField({ name: 'accepted', collectionId: id('answers'), maxSelect: 1 }))
    dudas.updateRule += " && (@request.body.accepted:isset = false || @request.body.accepted = '' || @request.body.accepted.duda = id)"
    app.save(dudas)

    /* Un voto por persona y duda (answer vacío) o por persona y respuesta */
    save({
      type: 'base',
      name: 'votes',
      listRule: reader('duda.group', 'duda.group.school'),
      viewRule: reader('duda.group', 'duda.group.school'),
      createRule:
        AUTH +
        ' && @request.body.user = ' +
        ME +
        ' && ' +
        member('@request.body.duda.group', 'cm') +
        " && (@request.body.answer:isset = false || @request.body.answer = '' || @request.body.answer.duda = @request.body.duda)",
      updateRule:
        'user = ' + ME + ' && @request.body.user:isset = false && @request.body.duda:isset = false && @request.body.answer:isset = false',
      deleteRule: 'user = ' + ME,
      fields: [
        { name: 'user', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'duda', type: 'relation', collectionId: id('dudas'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'answer', type: 'relation', collectionId: id('answers'), maxSelect: 1, cascadeDelete: true },
        /* 1 arriba, -1 abajo (quitar el voto = borrar el registro) */
        { name: 'value', type: 'number', required: true, onlyInt: true, min: -1, max: 1 },
        ...stamps(),
      ],
      indexes: ["CREATE UNIQUE INDEX idx_votes_once ON votes (user, duda, IFNULL(answer, ''))"],
    })

    /* ---------- Entregas, exámenes y festivos ---------- */
    save({
      type: 'base',
      name: 'events',
      ...managedRules(),
      fields: [
        { name: 'group', type: 'relation', collectionId: id('groups'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'module', type: 'relation', collectionId: id('modules'), maxSelect: 1 }, // vacío en festivos
        { name: 'type', type: 'select', required: true, values: ['entrega', 'examen', 'festivo'], maxSelect: 1 },
        { name: 'title', type: 'text', required: true, max: 140 },
        /* Fecha y hora como texto local («2026-10-09», «23:59»): sin líos de zona horaria */
        { name: 'date', type: 'text', required: true, pattern: DATE },
        { name: 'time', type: 'text', pattern: TIME },
        { name: 'end', type: 'text', pattern: TIME },
        { name: 'tema', type: 'text', max: 80 },
        { name: 'kind', type: 'text', max: 40 }, // «Individual», «En pareja»
        { name: 'files', type: 'text', max: 120 }, // qué se entrega: «Proyecto .zip»
        { name: 'where', type: 'text', max: 120 }, // «Moodle»
        { name: 'topics', type: 'json', maxSize: 4000 }, // qué entra / qué hay que entregar
        { name: 'about', type: 'text', max: 2000 },
        { name: 'related', type: 'relation', collectionId: id('dudas'), maxSelect: 1 },
        ...stamps(),
      ],
      indexes: ['CREATE INDEX idx_events_group_date ON events (`group`, date)'],
    })

    /* Lo de cada persona sobre un evento: hecha y nota. Nadie más lo ve. */
    save({
      type: 'base',
      name: 'event_status',
      listRule: 'user = ' + ME,
      viewRule: 'user = ' + ME,
      createRule: AUTH + ' && @request.body.user = ' + ME + ' && ' + member('@request.body.event.group', 'cm'),
      updateRule: 'user = ' + ME + ' && @request.body.user:isset = false && @request.body.event:isset = false',
      deleteRule: 'user = ' + ME,
      fields: [
        { name: 'user', type: 'relation', collectionId: usersId, required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'event', type: 'relation', collectionId: id('events'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'done', type: 'bool' },
        { name: 'grade', type: 'text', max: 10 }, // «8,5», «Apto»
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_event_status_once ON event_status (user, event)'],
    })

    /* ---------- Apuntes ---------- */
    save({
      type: 'base',
      name: 'apuntes',
      listRule: reader('group', 'group.school'),
      viewRule: reader('group', 'group.school'),
      createRule:
        AUTH +
        ' && @request.body.author = ' +
        ME +
        ' && ' +
        member('@request.body.group', 'cm') +
        ' && @request.body.downloads:isset = false',
      updateRule:
        'author = ' +
        ME +
        ' && @request.body.author:isset = false && @request.body.group:isset = false && @request.body.downloads:isset = false',
      deleteRule: 'author = ' + ME + ' || ' + moderator('group', 'group.school'),
      fields: [
        { name: 'group', type: 'relation', collectionId: id('groups'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'module', type: 'relation', collectionId: id('modules'), required: true, maxSelect: 1 },
        { name: 'author', type: 'relation', collectionId: usersId, required: true, maxSelect: 1 },
        { name: 'type', type: 'select', required: true, values: ['pdf', 'enlace', 'nota'], maxSelect: 1 },
        { name: 'title', type: 'text', required: true, min: 3, max: 140 },
        { name: 'tema', type: 'text', max: 80 },
        /* Según el tipo: PDF (máx. 20 MB), enlace o texto de la nota */
        { name: 'file', type: 'file', maxSelect: 1, maxSize: 20 * 1024 * 1024, mimeTypes: ['application/pdf'] },
        { name: 'url', type: 'url' },
        { name: 'body', type: 'text', max: 20000 },
        { name: 'downloads', type: 'number', onlyInt: true, min: 0 },
        ...stamps(),
      ],
      indexes: ['CREATE INDEX idx_apuntes_group ON apuntes (`group`, module)'],
    })

    /* ---------- Vistas de solo lectura: votos y respuestas contados en la base de datos ---------- */
    save({
      type: 'view',
      name: 'dudas_stats',
      listRule: reader('group', 'group.school'),
      viewRule: reader('group', 'group.school'),
      viewQuery: `
        SELECT d.id, d.\`group\`,
          (SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.duda = d.id AND IFNULL(v.answer, '') = '') AS votes,
          (SELECT COUNT(*) FROM answers a WHERE a.duda = d.id) AS answers
        FROM dudas d WHERE d.deleted = FALSE`,
    })
    save({
      type: 'view',
      name: 'answers_stats',
      listRule: reader('duda.group', 'duda.group.school'),
      viewRule: reader('duda.group', 'duda.group.school'),
      viewQuery: `
        SELECT a.id, a.duda,
          (SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.answer = a.id) AS votes
        FROM answers a`,
    })
  },
  app => {
    /* Reglas por defecto de users (antes de borrar memberships, que usan) */
    const users = app.findCollectionByNameOrId('users')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    app.save(users)
    for (const name of ['answers_stats', 'dudas_stats', 'apuntes', 'event_status', 'events', 'votes']) {
      app.delete(app.findCollectionByNameOrId(name))
    }
    const dudas = app.findCollectionByNameOrId('dudas')
    dudas.fields.removeByName('accepted')
    app.save(dudas)
    for (const name of ['answers', 'dudas', 'topics', 'schedule', 'modules']) {
      app.delete(app.findCollectionByNameOrId(name))
    }
    /* Quitar las reglas que cruzan colecciones antes de borrarlas */
    for (const name of ['memberships', 'groups', 'school_staff', 'schools']) {
      const c = app.findCollectionByNameOrId(name)
      c.listRule = c.viewRule = c.createRule = c.updateRule = c.deleteRule = null
      app.save(c)
    }
    for (const name of ['memberships', 'groups', 'school_staff', 'schools']) {
      app.delete(app.findCollectionByNameOrId(name))
    }
  },
)
