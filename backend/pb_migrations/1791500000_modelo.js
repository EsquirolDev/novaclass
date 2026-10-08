/// <reference path="../pb_data/types.d.ts" />

/*
 * Modelo de datos de NovaClass (PocketBase 0.40).
 *
 * Todo pertenece a un grupo (una clase: «1.º DAW A, 26/27»). Cada persona está en un grupo y solo ve lo suyo.
 * Roles en users.role: vacío = alumno, «delegado» o «profe». Delegado y profe gestionan horario, entregas y exámenes.
 *
 * Las reglas de API son la seguridad de verdad (el frontend solo esconde botones). Patrones que se repiten:
 * - mismo grupo:   group = @request.auth.group
 * - al crear:      @request.body.author = @request.auth.id (nadie crea en nombre de otra persona)
 * - al editar:     @request.body.<campo>:isset = false para los campos que no se pueden cambiar
 * - gestión:       @request.auth.role = 'delegado' || @request.auth.role = 'profe'
 */

const AUTH = "@request.auth.id != ''"
const SAME_GROUP = AUTH + ' && group = @request.auth.group'
const STAFF = "(@request.auth.role = 'delegado' || @request.auth.role = 'profe')"
const MANAGE = SAME_GROUP + ' && ' + STAFF
const CREATE_IN_GROUP = AUTH + ' && @request.body.group = @request.auth.group && ' + STAFF
const DATE = '^\\d{4}-\\d{2}-\\d{2}$'
const TIME = '^\\d{2}:\\d{2}$'

/* Campos created / updated (en migraciones no se añaden solos) */
const stamps = () => [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]

migrate(
  app => {
    const id = name => app.findCollectionByNameOrId(name).id
    const save = data => {
      const c = new Collection(data)
      app.save(c)
      return c
    }

    /* ---------- Grupo (clase) ---------- */
    save({
      type: 'base',
      name: 'groups',
      listRule: AUTH + ' && id = @request.auth.group',
      viewRule: AUTH + ' && id = @request.auth.group',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true, max: 80 }, // «1.º DAW A»
        { name: 'course', type: 'text', required: true, max: 20 }, // «26/27»
        /* Código para unirse; oculto en la API (se usará desde una ruta propia, tarea «grupo») */
        { name: 'join_code', type: 'text', required: true, min: 6, max: 12, hidden: true },
        /* Franjas del día [{start:'15:00', end:'15:55'}, …] y patio {start, end, after} */
        { name: 'sessions', type: 'json', required: true, maxSize: 4000 },
        { name: 'break', type: 'json', maxSize: 1000 },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_groups_join_code ON groups (join_code)'],
    })

    /* ---------- Usuarios: rol y grupo ---------- */
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new SelectField({ name: 'role', values: ['delegado', 'profe'], maxSelect: 1 }))
    users.fields.add(new RelationField({ name: 'group', collectionId: id('groups'), maxSelect: 1 }))
    /* Nadie se pone rol ni grupo a sí mismo: eso lo hace el admin o la ruta de unirse con código */
    users.listRule = SAME_GROUP + ' || id = @request.auth.id'
    users.viewRule = SAME_GROUP + ' || id = @request.auth.id'
    users.createRule = '@request.body.role:isset = false && @request.body.group:isset = false'
    users.updateRule = 'id = @request.auth.id && @request.body.role:isset = false && @request.body.group:isset = false'
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)

    /* ---------- Módulos y profesorado (comunes a todos los grupos) ---------- */
    save({
      type: 'base',
      name: 'teachers',
      listRule: AUTH,
      viewRule: AUTH,
      fields: [
        { name: 'key', type: 'text', required: true, pattern: '^[a-z]+$', max: 30 }, // «montero»
        { name: 'short', type: 'text', required: true, max: 40 }, // «Miquel Àngel»
        { name: 'name', type: 'text', required: true, max: 120 },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_teachers_key ON teachers (key)'],
    })
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
        { name: 'teachers', type: 'relation', collectionId: id('teachers'), maxSelect: 10 },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_modules_key ON modules (key)'],
    })

    /* ---------- Horario: una fila por franja ocupada ---------- */
    save({
      type: 'base',
      name: 'schedule',
      listRule: SAME_GROUP,
      viewRule: SAME_GROUP,
      createRule: CREATE_IN_GROUP,
      updateRule: MANAGE + ' && @request.body.group:isset = false',
      deleteRule: MANAGE,
      fields: [
        { name: 'group', type: 'relation', collectionId: id('groups'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'day', type: 'number', required: true, onlyInt: true, min: 1, max: 5 }, // 1 = lunes
        { name: 'slot', type: 'number', onlyInt: true, min: 0, max: 15 }, // índice en groups.sessions
        { name: 'module', type: 'relation', collectionId: id('modules'), required: true, maxSelect: 1 },
        { name: 'teacher', type: 'relation', collectionId: id('teachers'), maxSelect: 1 },
        ...stamps(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_schedule_slot ON schedule (`group`, day, slot)'],
    })

    /* ---------- Temas de cada módulo ---------- */
    save({
      type: 'base',
      name: 'topics',
      listRule: SAME_GROUP,
      viewRule: SAME_GROUP,
      createRule: CREATE_IN_GROUP,
      updateRule: MANAGE + ' && @request.body.group:isset = false',
      deleteRule: MANAGE,
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

    /* ---------- Dudas (se crea antes que answers; «accepted» se añade después) ---------- */
    save({
      type: 'base',
      name: 'dudas',
      /* Las borradas (deleted) solo las ve quien las escribió, para poder deshacer */
      listRule: SAME_GROUP + ' && (deleted = false || author = @request.auth.id)',
      viewRule: SAME_GROUP + ' && (deleted = false || author = @request.auth.id)',
      createRule:
        AUTH +
        ' && @request.body.author = @request.auth.id && @request.body.group = @request.auth.group' +
        ' && @request.body.views:isset = false && @request.body.accepted:isset = false && @request.body.deleted:isset = false',
      updateRule:
        'author = @request.auth.id && @request.body.author:isset = false && @request.body.group:isset = false' +
        ' && @request.body.views:isset = false',
      deleteRule: 'author = @request.auth.id || (' + SAME_GROUP + " && @request.auth.role = 'profe')",
      fields: [
        { name: 'group', type: 'relation', collectionId: id('groups'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'module', type: 'relation', collectionId: id('modules'), required: true, maxSelect: 1 },
        { name: 'author', type: 'relation', collectionId: id('users'), required: true, maxSelect: 1 },
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
      listRule: AUTH + ' && duda.group = @request.auth.group && duda.deleted = false',
      viewRule: AUTH + ' && duda.group = @request.auth.group && duda.deleted = false',
      createRule:
        AUTH +
        ' && @request.body.author = @request.auth.id && @request.body.duda.group = @request.auth.group && @request.body.duda.deleted = false',
      updateRule: 'author = @request.auth.id && @request.body.author:isset = false && @request.body.duda:isset = false',
      deleteRule: 'author = @request.auth.id',
      fields: [
        { name: 'duda', type: 'relation', collectionId: id('dudas'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'author', type: 'relation', collectionId: id('users'), required: true, maxSelect: 1 },
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
      listRule: AUTH + ' && duda.group = @request.auth.group',
      viewRule: AUTH + ' && duda.group = @request.auth.group',
      createRule:
        AUTH +
        ' && @request.body.user = @request.auth.id && @request.body.duda.group = @request.auth.group' +
        " && (@request.body.answer:isset = false || @request.body.answer = '' || @request.body.answer.duda = @request.body.duda)",
      updateRule:
        'user = @request.auth.id && @request.body.user:isset = false && @request.body.duda:isset = false && @request.body.answer:isset = false',
      deleteRule: 'user = @request.auth.id',
      fields: [
        { name: 'user', type: 'relation', collectionId: id('users'), required: true, maxSelect: 1, cascadeDelete: true },
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
      listRule: SAME_GROUP,
      viewRule: SAME_GROUP,
      createRule: CREATE_IN_GROUP,
      updateRule: MANAGE + ' && @request.body.group:isset = false',
      deleteRule: MANAGE,
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

    /* Lo de cada persona sobre un evento: hecha y nota */
    save({
      type: 'base',
      name: 'event_status',
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: AUTH + ' && @request.body.user = @request.auth.id && @request.body.event.group = @request.auth.group',
      updateRule: 'user = @request.auth.id && @request.body.user:isset = false && @request.body.event:isset = false',
      deleteRule: 'user = @request.auth.id',
      fields: [
        { name: 'user', type: 'relation', collectionId: id('users'), required: true, maxSelect: 1, cascadeDelete: true },
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
      listRule: SAME_GROUP,
      viewRule: SAME_GROUP,
      createRule:
        AUTH +
        ' && @request.body.author = @request.auth.id && @request.body.group = @request.auth.group && @request.body.downloads:isset = false',
      updateRule:
        'author = @request.auth.id && @request.body.author:isset = false && @request.body.group:isset = false && @request.body.downloads:isset = false',
      deleteRule: 'author = @request.auth.id || (' + SAME_GROUP + " && @request.auth.role = 'profe')",
      fields: [
        { name: 'group', type: 'relation', collectionId: id('groups'), required: true, maxSelect: 1, cascadeDelete: true },
        { name: 'module', type: 'relation', collectionId: id('modules'), required: true, maxSelect: 1 },
        { name: 'author', type: 'relation', collectionId: id('users'), required: true, maxSelect: 1 },
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
      listRule: SAME_GROUP,
      viewRule: SAME_GROUP,
      viewQuery: `
        SELECT d.id, d.\`group\`,
          (SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.duda = d.id AND IFNULL(v.answer, '') = '') AS votes,
          (SELECT COUNT(*) FROM answers a WHERE a.duda = d.id) AS answers
        FROM dudas d WHERE d.deleted = FALSE`,
    })
    save({
      type: 'view',
      name: 'answers_stats',
      listRule: AUTH + ' && duda.group = @request.auth.group',
      viewRule: AUTH + ' && duda.group = @request.auth.group',
      viewQuery: `
        SELECT a.id, a.duda,
          (SELECT COALESCE(SUM(v.value), 0) FROM votes v WHERE v.answer = a.id) AS votes
        FROM answers a`,
    })
  },
  app => {
    for (const name of ['answers_stats', 'dudas_stats', 'apuntes', 'event_status', 'events', 'votes']) {
      app.delete(app.findCollectionByNameOrId(name))
    }
    const dudas = app.findCollectionByNameOrId('dudas')
    dudas.fields.removeByName('accepted')
    app.save(dudas)
    for (const name of ['answers', 'dudas', 'topics', 'schedule', 'modules', 'teachers']) {
      app.delete(app.findCollectionByNameOrId(name))
    }
    /* Reglas por defecto de users (antes de quitar los campos que usan) */
    const users = app.findCollectionByNameOrId('users')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.createRule = ''
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = 'id = @request.auth.id'
    users.fields.removeByName('group')
    users.fields.removeByName('role')
    app.save(users)
    app.delete(app.findCollectionByNameOrId('groups'))
  },
)
