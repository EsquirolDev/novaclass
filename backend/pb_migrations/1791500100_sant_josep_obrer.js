/// <reference path="../pb_data/types.d.ts" />

/*
 * Datos de arranque reales (docs/escuelas.md): los módulos de DAW y Sant Josep Obrer (verificada) con 1.º DAW A,
 * sus Docentes y su horario de 26/27 (projectes/Horari, con CPFW el viernes a las 16:50 e IPO).
 *
 * Solo lo real. Las entregas, exámenes, temas y dudas de src/data/seed.js son de ejemplo y van con el script de
 * gente de prueba, no aquí. Los datos se copiaron de seed.js y subjects.js y quedan fijos (una migración no cambia
 * después); backend/tests/seed.test.js comprueba que siguen coincidiendo.
 *
 * Los Docentes quedan pendientes (sin cuenta, con su nombre) hasta que se registren. El Tutor y la dirección los
 * nombra la administración desde el panel.
 */

const MODULES = [
  { key: 'pro', code: 'PRO', name: 'Programación', has_tasks: true, order: 0 },
  { key: 'bd', code: 'BD', name: 'Bases de Datos', has_tasks: true, order: 1 },
  { key: 'lm', code: 'LMSGI', name: 'Lenguajes de Marcas', has_tasks: true, order: 2 },
  { key: 'si', code: 'SI', name: 'Sistemas Informáticos', has_tasks: true, order: 3 },
  { key: 'ed', code: 'ED', name: 'Entornos de Desarrollo', has_tasks: true, order: 4 },
  { key: 'digi', code: 'DIGI', name: 'Digitalización', has_tasks: false, order: 5 },
  { key: 'cpfw', code: 'CPFW', name: 'Construcción de proyectos y frameworks web', has_tasks: false, order: 6 },
  { key: 'ipo', code: 'IPO', name: 'Itinerario personal para la empleabilidad I', has_tasks: false, order: 7 },
]

const SCHOOL = { name: 'Sant Josep Obrer', city: 'Palma', verified: true }
const GROUP = {
  name: '1.º DAW A',
  course: '26/27',
  sessions: [
    { start: '15:00', end: '15:55' },
    { start: '15:55', end: '16:50' },
    { start: '16:50', end: '17:45' },
    { start: '18:00', end: '18:55' },
    { start: '18:55', end: '19:50' },
    { start: '19:50', end: '20:45' },
    { start: '20:45', end: '21:40' },
  ],
  break: { start: '17:45', end: '18:00', after: 2 },
}

const TEACHERS = [
  { key: 'montero', name: 'Miquel Àngel Montero Pazmiño' },
  { key: 'dustin', name: 'Dustin de Lara Garcia' },
  { key: 'molina', name: 'Miquel Molina Rotger' },
  { key: 'pau', name: 'Pau Boixader Muñoz' },
  { key: 'santiago', name: 'Santiago Gómez González' },
  { key: 'tomeu', name: 'Tomeu Martínez Pérez' },
  { key: 'antoni', name: 'Antoni Morell Bennàser' },
  { key: 'maties', name: 'Maties Salom Avellà' },
  { key: 'irene', name: 'Irene Fontcuberta León' },
  { key: 'magdalena', name: 'Magdalena Nicolau Gamundí' },
]

/* [día (1 = lunes), franja, módulo, Docente] */
const SCHEDULE = [
  [1, 0, 'ed', 'montero'],
  [1, 1, 'ed', 'montero'],
  [1, 2, 'lm', 'dustin'],
  [1, 3, 'lm', 'dustin'],
  [1, 4, 'pro', 'pau'],
  [1, 5, 'pro', 'pau'],
  [1, 6, 'bd', 'santiago'],
  [2, 0, 'digi', 'antoni'],
  [2, 1, 'si', 'maties'],
  [2, 2, 'si', 'maties'],
  [2, 3, 'si', 'maties'],
  [2, 4, 'ipo', 'magdalena'],
  [2, 5, 'ipo', 'magdalena'],
  [3, 0, 'pro', 'molina'],
  [3, 1, 'si', 'maties'],
  [3, 2, 'si', 'maties'],
  [3, 3, 'bd', 'tomeu'],
  [3, 4, 'bd', 'santiago'],
  [3, 5, 'bd', 'santiago'],
  [4, 0, 'lm', 'dustin'],
  [4, 1, 'lm', 'dustin'],
  [4, 2, 'pro', 'pau'],
  [4, 3, 'pro', 'pau'],
  [4, 4, 'bd', 'tomeu'],
  [4, 5, 'bd', 'tomeu'],
  [4, 6, 'bd', 'tomeu'],
  [5, 0, 'pro', 'molina'],
  [5, 1, 'pro', 'molina'],
  [5, 2, 'cpfw', 'irene'],
  [5, 3, 'ed', 'montero'],
  [5, 4, 'ipo', 'magdalena'],
]

migrate(
  app => {
    const col = name => app.findCollectionByNameOrId(name)
    const create = (name, data) => {
      const r = new Record(col(name))
      for (const [k, v] of Object.entries(data)) r.set(k, v)
      app.save(r)
      return r
    }

    const modules = {}
    for (const m of MODULES) modules[m.key] = create('modules', m)

    const school = create('schools', SCHOOL)
    const group = create('groups', { ...GROUP, school: school.id })

    const teachers = {}
    for (const t of TEACHERS) teachers[t.key] = create('memberships', { group: group.id, role: 'docente', pending_name: t.name })

    for (const [day, slot, module, teacher] of SCHEDULE) {
      create('schedule', { group: group.id, day, slot, module: modules[module].id, teacher: teachers[teacher].id })
    }
  },
  app => {
    const school = app.findFirstRecordByData('schools', 'name', SCHOOL.name)
    app.delete(school) // borra en cascada la clase, su gente y su horario
    for (const m of MODULES) app.delete(app.findFirstRecordByData('modules', 'key', m.key))
  },
)
