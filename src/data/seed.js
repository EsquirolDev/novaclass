/* Datos de ejemplo de 1.º DAW, curso 2026-27. Fechas ISO en hora local. */

export const USER = 'Dracko'
export const GROUP = '1.º DAW · grupo A'

/*
 * Horario de DAW 26/27 (fuente: projectes/Horari/index.html).
 * Siete franjas de 55 min por la tarde, de 15:00 a 21:40, con patio de 17:45 a 18:00.
 * Horas semanales: PRO 7 · BD 7 · SI 5 · LMSGI 4 · ED 3 · IPO 3 · DIGI 1 · CPFW 1 = 31 h.
 * IPO y el cambio de CPFW al viernes a las 16:50 son un cambio posterior: aún no están en projectes/Horari.
 */
export const SESSIONS = [
  { start: '15:00', end: '15:55' },
  { start: '15:55', end: '16:50' },
  { start: '16:50', end: '17:45' },
  { start: '18:00', end: '18:55' },
  { start: '18:55', end: '19:50' },
  { start: '19:50', end: '20:45' },
  { start: '20:45', end: '21:40' },
]
export const BREAK = { start: '17:45', end: '18:00', after: 2, label: 'Patio' } /* después de la 3.ª franja (índice 2) */

/* Profesorado: clave corta → nombre que sale en el horario y nombre completo */
export const TEACHERS = {
  montero: { short: 'Miquel Àngel', name: 'Miquel Àngel Montero Pazmiño' },
  dustin: { short: 'Dustin', name: 'Dustin de Lara Garcia' },
  molina: { short: 'Miquel Molina', name: 'Miquel Molina Rotger' },
  pau: { short: 'Pau', name: 'Pau Boixader Muñoz' },
  santiago: { short: 'Santiago', name: 'Santiago Gómez González' },
  tomeu: { short: 'Tomeu', name: 'Tomeu Martínez Pérez' },
  antoni: { short: 'Antoni', name: 'Antoni Morell Bennàser' },
  maties: { short: 'Maties', name: 'Maties Salom Avellà' },
  irene: { short: 'Irene', name: 'Irene Fontcuberta León' },
  magdalena: { short: 'Magdalena', name: 'Magdalena Nicolau Gamundí' },
}

/* Lunes (1) a viernes (5): una entrada por franja, [módulo, profe]; null = hora libre */
const c = (id, teacher) => ({ id, teacher })
export const SCHEDULE = {
  1: [c('ed', 'montero'), c('ed', 'montero'), c('lm', 'dustin'), c('lm', 'dustin'), c('pro', 'pau'), c('pro', 'pau'), c('bd', 'santiago')],
  2: [c('digi', 'antoni'), c('si', 'maties'), c('si', 'maties'), c('si', 'maties'), c('ipo', 'magdalena'), c('ipo', 'magdalena'), null],
  3: [c('pro', 'molina'), c('si', 'maties'), c('si', 'maties'), c('bd', 'tomeu'), c('bd', 'santiago'), c('bd', 'santiago'), null],
  4: [c('lm', 'dustin'), c('lm', 'dustin'), c('pro', 'pau'), c('pro', 'pau'), c('bd', 'tomeu'), c('bd', 'tomeu'), c('bd', 'tomeu')],
  5: [c('pro', 'molina'), c('pro', 'molina'), c('cpfw', 'irene'), c('ed', 'montero'), c('ipo', 'magdalena'), null, null],
}

/* Temas por asignatura; `status`: 'ok' visto, 'now' en curso, o el mes previsto. */
export const TEMAS = {
  pro: [['Introducción a la programación', 'ok'], ['Estructuras de control', 'now'], ['Arrays y matrices', 'Octubre'], ['Programación orientada a objetos', 'Noviembre']],
  bd: [['Introducción a las BBDD', 'ok'], ['Diseño lógico y diccionario', 'ok'], ['Modelo entidad/relación', 'now'], ['SQL: consultas', 'now'], ['Normalización', 'Noviembre'], ['Programación en SQL', 'Diciembre']],
  lm: [['HTML y CSS', 'ok'], ['Formularios HTML', 'now'], ['XML y DTD', 'Octubre'], ['JavaScript en el navegador', 'Noviembre']],
  si: [['Hardware', 'ok'], ['Sistemas operativos', 'ok'], ['Redes', 'now'], ['Administración de Linux', 'Noviembre']],
  ed: [['Control de versiones', 'now'], ['Diseño UML', 'Octubre'], ['Pruebas unitarias', 'Octubre'], ['Refactorización', 'Noviembre']],
}

/*
 * Entregas, exámenes y festivos. `done` es el estado inicial (luego lo guarda el store).
 * Campos opcionales: tema, kind, files, where, end, grade, topics, about, related (id de duda).
 */
export const EVENTS = [
  { id: 'p1', subject: 'pro', type: 'entrega', title: 'Variables y tipos', date: '2026-10-01', time: '23:59', tema: 'Tema 1', kind: 'Individual', files: 'Proyecto .zip', done: true, grade: '7,5' },
  { id: 'p2', subject: 'pro', type: 'entrega', title: 'Ejercicios bucles', date: '2026-10-08', time: '23:59', tema: 'UF2 · Tema 2', kind: 'Individual', files: 'Proyecto .zip', where: 'Se entrega en Moodle', topics: ['Diez ejercicios con for, while y do-while', 'Comentar la traza de los ejercicios 4 y 7', 'Subir el proyecto comprimido'] },
  { id: 'p3', subject: 'pro', type: 'entrega', title: 'Arrays y matrices', date: '2026-10-19', time: '23:59', tema: 'Tema 3', kind: 'Individual', files: 'Proyecto .zip' },
  { id: 'p4', subject: 'pro', type: 'examen', title: 'UF2 · Estructuras de control', date: '2026-10-23', time: '15:00', end: '16:50', tema: 'UF2', topics: ['Condicionales', 'Bucles y trazas', 'Depuración básica'] },

  { id: 'b1', subject: 'bd', type: 'entrega', title: 'Instalación de MySQL Workbench', date: '2026-09-24', time: '23:59', tema: 'Tema 1', kind: 'Individual', files: 'Capturas', done: true, grade: 'Apto' },
  { id: 'b2', subject: 'bd', type: 'entrega', title: 'Diccionario de datos', date: '2026-09-30', time: '23:59', tema: 'Tema 2', kind: 'Individual', files: 'Documento', done: true, grade: '9' },
  { id: 'b3', subject: 'bd', type: 'entrega', title: 'Ejercicios SELECT', date: '2026-10-07', time: '23:59', tema: 'Tema 4', kind: 'Individual', files: 'Script .sql', done: true, grade: '8,5' },
  { id: 'b4', subject: 'bd', type: 'entrega', title: 'Modelo E/R biblioteca', date: '2026-10-09', time: '23:59', tema: 'Tema 3 · Modelo E/R', kind: 'Individual', files: 'PDF del diagrama', where: 'Moodle', topics: ['Entidades socio, libro, ejemplar y préstamo', 'Cardinalidades justificadas', 'Exportar el diagrama en PDF'], related: 1 },
  { id: 'b5', subject: 'bd', type: 'examen', title: 'Consultas SQL', date: '2026-10-21', time: '18:55', end: '20:45', tema: 'Tema 4', about: 'SELECT, JOIN, GROUP BY y subconsultas. Se puede llevar una hoja de chuleta escrita a mano.', topics: ['SELECT y WHERE', 'JOIN entre varias tablas', 'GROUP BY y HAVING', 'Subconsultas'], related: 1 },
  { id: 'b6', subject: 'bd', type: 'entrega', title: 'Normalización hasta 3FN', date: '2026-10-21', time: '23:59', tema: 'Tema 3', kind: 'En pareja', files: 'Documento + SQL' },
  { id: 'b7', subject: 'bd', type: 'entrega', title: 'Consultas multitabla', date: '2026-11-04', time: '23:59', tema: 'Tema 4', kind: 'Individual', files: 'Script .sql' },

  { id: 'l1', subject: 'lm', type: 'entrega', title: 'Maquetación con Flexbox', date: '2026-10-02', time: '23:59', tema: 'Tema 1', kind: 'Individual', files: 'Repositorio', done: true, grade: '8' },
  { id: 'l2', subject: 'lm', type: 'entrega', title: 'Tabla con CSS Grid', date: '2026-10-05', time: '23:59', tema: 'Tema 1', kind: 'Individual', files: 'Repositorio', done: true },
  { id: 'l3', subject: 'lm', type: 'entrega', title: 'Formulario accesible', date: '2026-10-13', time: '23:59', tema: 'Tema 2', kind: 'Individual', files: 'Repositorio', related: 3 },
  { id: 'l4', subject: 'lm', type: 'examen', title: 'XML y DTD', date: '2026-10-22', time: '15:00', end: '16:50', tema: 'Tema 3' },
  { id: 'l5', subject: 'lm', type: 'entrega', title: 'Validación con JavaScript', date: '2026-10-30', time: '23:59', tema: 'Tema 4', kind: 'Individual', files: 'Repositorio' },

  { id: 's1', subject: 'si', type: 'examen', title: 'Redes y subnetting', date: '2026-10-13', time: '15:55', end: '17:45', tema: 'UF1 · Redes locales', topics: ['Direccionamiento IPv4 y clases', 'Máscaras y cálculo de subredes', 'Comandos ip, ping y traceroute'], related: 4 },
  { id: 's2', subject: 'si', type: 'entrega', title: 'Ubuntu Server en VM', date: '2026-10-15', time: '23:59', tema: 'Tema 4', kind: 'Individual', files: 'Memoria PDF' },
  { id: 's3', subject: 'si', type: 'entrega', title: 'Script de copias de seguridad', date: '2026-10-29', time: '23:59', tema: 'Tema 4', kind: 'En pareja', files: 'Script .sh' },

  { id: 'e1', subject: 'ed', type: 'entrega', title: 'Git: ramas y merge', date: '2026-10-06', time: '23:59', tema: 'Tema 1', kind: 'Individual', files: 'Repositorio', done: true, related: 5 },
  { id: 'e2', subject: 'ed', type: 'entrega', title: 'Diagrama de clases UML', date: '2026-10-14', time: '23:59', tema: 'Tema 2', kind: 'En pareja', files: 'PDF del diagrama' },
  { id: 'e3', subject: 'ed', type: 'examen', title: 'Pruebas con JUnit', date: '2026-10-26', time: '15:00', end: '16:50', tema: 'Tema 3' },

  { id: 'f1', type: 'festivo', title: 'Fiesta Nacional', date: '2026-10-12' },
]

export const DUDAS = [
  {
    id: 1, subject: 'bd', title: '¿LEFT JOIN o INNER JOIN para listar socios sin préstamos?',
    body: 'En la práctica de la biblioteca tengo que sacar los socios que no han pedido ningún libro. Con `INNER JOIN` no me sale ninguno y no entiendo por qué. ¿Debería usar `LEFT JOIN`? ¿Y cómo filtro los que no tienen préstamo?',
    code: 'SELECT s.nombre\nFROM socio s\nINNER JOIN prestamo p ON p.id_socio = s.id;',
    votes: 12, author: 'Dracko', when: 'hace 2 h', views: 48, tags: ['joins', 'práctica biblioteca'], accepted: 'a1',
    answers: [
      { id: 'a1', author: 'Marta Rosselló', when: 'hace 1 h', votes: 9, body: '`INNER JOIN` solo devuelve filas que tienen pareja en las dos tablas, así que los socios sin préstamo desaparecen. Usa `LEFT JOIN` para quedarte con todos los socios y luego filtra los que tienen el préstamo a `NULL`:', code: 'SELECT s.nombre\nFROM socio s\nLEFT JOIN prestamo p ON p.id_socio = s.id\nWHERE p.id IS NULL;', after: 'Truco: piensa que el LEFT JOIN rellena con NULL lo que falta a la derecha.' },
      { id: 'a2', author: 'Santiago Gómez', teacher: true, when: 'hace 50 min', votes: 4, body: 'Las dos formas son correctas. Para el examen del 21 quiero que sepáis explicar con vuestras palabras **por qué** el INNER JOIN no sirve en este caso.' },
      { id: 'a3', author: 'Joan Riera', when: 'hace 40 min', votes: 3, body: 'También se puede con `NOT EXISTS`, que a mí se me hace más fácil de leer:', code: 'SELECT s.nombre\nFROM socio s\nWHERE NOT EXISTS (\n  SELECT 1 FROM prestamo p WHERE p.id_socio = s.id\n);' },
    ],
  },
  {
    id: 2, subject: 'pro', title: '¿Por qué mi bucle for se salta el último elemento del array?',
    body: 'Tengo `for (int i = 0; i < notas.length - 1; i++)` y la última nota nunca se suma. ¿Qué estoy haciendo mal?',
    votes: 5, author: 'Iker Martí', when: 'hace 3 h', views: 21, tags: ['bucles', 'arrays'], answers: [],
  },
  {
    id: 3, subject: 'lm', title: '¿aria-label o <label> en un input que solo tiene un icono?',
    body: 'Para el formulario accesible tengo un buscador con una lupa y no sé si basta con `aria-label` o si hace falta un `<label>` aunque lo oculte.',
    votes: 8, author: 'Aina Pons', when: 'ayer', views: 33, tags: ['accesibilidad', 'formularios'], accepted: 'a1',
    answers: [
      { id: 'a1', author: 'Pau Mascaró', when: 'hace 40 min', votes: 6, body: 'Si puedes, usa un `<label>` y ocúltalo solo visualmente: lo leen todos los lectores de pantalla y al pulsarlo se enfoca el campo. `aria-label` también vale, pero no se traduce con el navegador.' },
      { id: 'a2', author: 'Dustin de Lara', teacher: true, when: 'hace 20 min', votes: 3, body: 'En la práctica os aceptaré las dos opciones, pero el botón de la lupa también necesita un nombre accesible.' },
    ],
  },
  {
    id: 4, subject: 'si', title: 'La VM no tiene red al poner el adaptador en modo puente',
    body: 'En VirtualBox, con NAT funciona, pero en puente no me da IP. ¿Tiene que ver con la wifi del instituto?',
    votes: 3, author: 'Joan Riera', when: 'ayer', views: 17, tags: ['virtualbox', 'redes'],
    answers: [
      { id: 'a1', author: 'Laia Coll', when: 'hace 20 h', votes: 2, body: 'A mí me pasaba lo mismo: la wifi del instituto no da IP a las máquinas en puente. Con el cable del aula sí funciona.' },
    ],
  },
  {
    id: 5, subject: 'ed', title: 'git merge o git rebase para juntar mi rama de la práctica',
    body: 'El profe dijo que no hiciéramos rebase de ramas compartidas, pero esta solo la uso yo. ¿Puedo hacer rebase o mejor merge?',
    votes: 6, author: 'Laia Coll', when: 'hace 2 días', views: 40, tags: ['git'], accepted: 'a2',
    answers: [
      { id: 'a1', author: 'Iker Martí', when: 'hace 2 días', votes: 1, body: 'Yo siempre hago merge, así no me complico.' },
      { id: 'a2', author: 'Miquel Àngel Montero', teacher: true, when: 'hace 2 días', votes: 7, body: 'Si la rama solo la usas tú y no la has compartido, `git rebase main` está bien y deja un historial más limpio. La norma es para ramas que otras personas ya tienen.' },
      { id: 'a3', author: 'Pau Mascaró', when: 'ayer', votes: 2, body: 'Ojo: si ya la has subido, después del rebase tendrás que hacer `git push --force-with-lease`.' },
      { id: 'a4', author: 'Dracko', when: 'ayer', votes: 1, body: 'Para la práctica yo usé `git merge --no-ff` y la profe lo dio por bueno.' },
    ],
  },
  {
    id: 6, subject: 'pro', title: '¿Cuándo tiene sentido usar do-while en lugar de while?',
    body: 'En los ejercicios de menú siempre uso `while(true)` con `break` y no sé si está mal.',
    votes: 2, author: 'Marta Rosselló', when: 'hace 3 días', views: 12, tags: ['bucles'],
    answers: [
      { id: 'a1', author: 'Pau Boixader', teacher: true, when: 'hace 2 días', votes: 4, body: 'Un menú es el caso típico de `do-while`: el cuerpo se ejecuta al menos una vez. Con `while(true)` funciona, pero la condición de salida queda escondida.' },
    ],
  },
]

export const FEED = [
  { who: 'Marta Rosselló', what: 'subió apuntes', target: 'Resumen JOINs con ejemplos', subject: 'bd', when: 'hace 15 min', to: '/apuntes' },
  { who: 'Pau Mascaró', what: 'respondió a', target: '¿aria-label o <label>…?', subject: 'lm', when: 'hace 40 min', to: '/dudas/3' },
  { who: 'Laia Coll', what: 'marcó como hecha', target: 'Modelo E/R biblioteca', subject: 'bd', when: 'hace 1 h', to: '/asignaturas/bd' },
  { who: 'Iker Martí', what: 'preguntó', target: '¿Por qué mi bucle for se salta…?', subject: 'pro', when: 'hace 3 h', to: '/dudas/2' },
  { who: 'Tomeu Martínez', what: 'publicó la entrega', target: 'Normalización', subject: 'bd', when: 'ayer', teacher: true, to: '/asignaturas/bd' },
]

export const APUNTES = [
  { id: 'n1', subject: 'bd', tema: 'Tema 4 · SQL: consultas multitabla', type: 'pdf', title: 'Resumen JOINs con ejemplos', author: 'Marta Rosselló', date: 'hoy', size: '1,2 MB', downloads: 128 },
  { id: 'n2', subject: 'bd', tema: 'Tema 4 · SQL: consultas multitabla', type: 'enlace', title: 'SQLBolt — ejercicios interactivos', author: 'Joan Riera', date: '30 sep', size: 'sqlbolt.com', url: 'https://sqlbolt.com', downloads: 40 },
  { id: 'n3', subject: 'bd', tema: 'Tema 4 · SQL: consultas multitabla', type: 'nota', title: 'Chuleta: orden de ejecución de un SELECT', author: 'Dracko', date: '28 sep', size: '4 min de lectura', downloads: 55 },
  { id: 'n4', subject: 'bd', tema: 'Tema 3 · Modelo entidad/relación', type: 'pdf', title: 'Cardinalidades explicadas con dibujos', author: 'Aina Pons', date: '2 oct', size: '3,4 MB', downloads: 61 },
  { id: 'n5', subject: 'bd', tema: 'Tema 3 · Modelo entidad/relación', type: 'nota', title: 'E/R biblioteca: dudas resueltas en clase', author: 'Laia Coll', date: '5 oct', size: '6 min de lectura', downloads: 37 },
  { id: 'n6', subject: 'pro', tema: 'Tema 2 · Estructuras de control', type: 'nota', title: 'for, while y do-while en una tabla', author: 'Dracko', date: '6 oct', size: '3 min de lectura', downloads: 81 },
  { id: 'n7', subject: 'pro', tema: 'Tema 2 · Estructuras de control', type: 'pdf', title: 'Trazas de bucles anidados', author: 'Iker Martí', date: '3 oct', size: '820 KB', downloads: 44 },
  { id: 'n8', subject: 'pro', tema: 'Tema 2 · Estructuras de control', type: 'enlace', title: 'Java Visualizer (paso a paso)', author: 'Pau Mascaró', date: '1 oct', size: 'cscircles.cemc.uwaterloo.ca', url: 'https://cscircles.cemc.uwaterloo.ca/java_visualize/', downloads: 29 },
  { id: 'n9', subject: 'lm', tema: 'Tema 2 · Formularios HTML', type: 'nota', title: 'Checklist de formulario accesible', author: 'Pau Mascaró', date: '4 oct', size: '5 min de lectura', downloads: 50 },
  { id: 'n10', subject: 'lm', tema: 'Tema 2 · Formularios HTML', type: 'enlace', title: 'MDN — El elemento <label>', author: 'Aina Pons', date: '29 sep', size: 'developer.mozilla.org', url: 'https://developer.mozilla.org/es/docs/Web/HTML/Element/label', downloads: 22 },
  { id: 'n11', subject: 'si', tema: 'Tema 3 · Redes', type: 'pdf', title: 'Subnetting paso a paso', author: 'Joan Riera', date: '5 oct', size: '2,1 MB', downloads: 96 },
  { id: 'n12', subject: 'ed', tema: 'Tema 1 · Control de versiones', type: 'nota', title: 'Comandos de Git que usamos en clase', author: 'Laia Coll', date: '24 sep', size: '4 min de lectura', downloads: 47 },
]
