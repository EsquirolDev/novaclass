/*
 * Plan de actuación para pasar del frontend con datos de ejemplo a una app real para la clase.
 * Se abre con la tecla M (pantalla #/mejoras). `done: true` aquí marca lo que ya está hecho en el código;
 * el resto lo marca la persona y se guarda en el store. Cuando todo está hecho, la pantalla desaparece.
 */
export const PLAN = [
  {
    id: 'front',
    title: 'Cerrar el frontend',
    goal: 'Que lo que ya se ve esté pulido antes de conectarlo a nada.',
    tasks: [
      {
        id: 'nombre',
        title: 'Decidir el nombre de la app',
        detail: 'Se queda NovaClass. El sistema de diseño pasa a docs/ con ese nombre.',
        done: true,
      },
      { id: 'git', title: 'Repositorio git y primer commit', detail: 'Repositorio privado DrackoYT/novaclass en GitHub.', done: true },
      {
        id: 'lint',
        title: 'ESLint y Prettier',
        detail: 'ESLint 9 con reglas de React y hooks, Prettier para JS, JSX, JSON y Markdown. Todo pasa sin avisos.',
        done: true,
      },
      {
        id: 'movil',
        title: 'Repaso en móvil (390 px)',
        detail: 'Pantalla a pantalla con capturas: Inicio, Calendario (mes, semana, horario), Asignatura, Dudas y Apuntes.',
        done: true,
      },
      {
        id: 'a11y',
        title: 'Accesibilidad con teclado y lector de pantalla',
        detail: 'Orden del foco, nombres de botones, el panel de detalle del calendario y los formularios de dudas y apuntes.',
        done: true,
      },
      {
        id: 'vacios',
        title: 'Estados vacíos, de carga y de error',
        detail: 'Qué se ve sin entregas, sin dudas, sin conexión o mientras carga. Hoy todo da por hecho que hay datos.',
        done: true,
      },
      {
        id: 'tests',
        title: 'Tests de la lógica con Vitest',
        detail: 'Horario (bloques, «qué toca ahora»), fechas y selectores del store. Son la base para cambiar el store sin miedo.',
        done: true,
      },
    ],
  },
  {
    id: 'datos',
    title: 'Backend y base de datos',
    goal: 'Que los datos dejen de vivir en seed.js y en el navegador.',
    tasks: [
      {
        id: 'stack',
        title: 'Elegir el backend',
        detail:
          'PocketBase (SQLite, login, archivos, tiempo real y panel de admin) en un contenedor de Podman, detrás del túnel de Cloudflare.',
        done: true,
      },
      {
        id: 'modelo',
        title: 'Modelo de datos',
        detail:
          'Colecciones de PocketBase: usuarios, grupos, módulos, profes, horario, eventos (entrega, examen, festivo), dudas, respuestas, votos y apuntes.',
        done: true,
      },
      {
        id: 'api',
        title: 'Reglas de acceso y validación',
        detail: 'Reglas de API de cada colección (quién lee, crea, edita y borra) y validación de campos; hooks en JS solo si hace falta.',
        done: true,
      },
      {
        id: 'seed',
        title: 'Pasar seed.js a la base de datos',
        detail: 'Horario real de 1.º DAW, módulos, profes y eventos como migración de arranque de PocketBase.',
      },
      {
        id: 'store',
        title: 'Conectar el store a PocketBase',
        detail:
          'SDK de PocketBase en vez de localStorage, con actualización optimista (marcar hecha, votar) y tiempo real en dudas. El tema puede seguir en local.',
      },
    ],
  },
  {
    id: 'cuentas',
    title: 'Cuentas y grupo de clase',
    goal: 'Que cada persona entre con su cuenta y vea lo de su grupo.',
    tasks: [
      {
        id: 'login',
        title: 'Registro e inicio de sesión',
        detail: 'Con el correo del centro; recuperar contraseña. Fuera el usuario fijo «Dracko».',
      },
      {
        id: 'grupo',
        title: 'Unirse a un grupo con código',
        detail: 'Un grupo = una clase (1.º DAW A). Todo lo que se ve se filtra por grupo.',
      },
      {
        id: 'roles',
        title: 'Roles: alumno, delegado y profe',
        detail: 'Quién puede crear o editar entregas, exámenes y el horario; el resto solo los marca como hechos.',
      },
      { id: 'perfil', title: 'Perfil y ajustes', detail: 'Nombre, avatar, tema claro u oscuro y qué avisos quiere recibir.' },
    ],
  },
  {
    id: 'clase',
    title: 'Funciones de clase de verdad',
    goal: 'Que dudas y apuntes sirvan entre compañeros, no solo en tu navegador.',
    tasks: [
      {
        id: 'dudas',
        title: 'Dudas y respuestas compartidas',
        detail: 'Un voto por persona, aceptar respuesta solo quien pregunta, contador de vistas real.',
      },
      {
        id: 'apuntes',
        title: 'Subir apuntes de verdad',
        detail: 'PDF a almacenamiento con límite de tamaño, enlaces y notas; descargas contadas.',
      },
      {
        id: 'moderar',
        title: 'Reportar y moderar',
        detail: 'Reportar una duda, respuesta o apunte; el delegado o el profe puede ocultarlo.',
      },
      {
        id: 'avisos',
        title: 'Avisos',
        detail: 'Entrega en 24 h, examen en 3 días y alguien ha respondido a tu duda. Primero dentro de la app, luego notificaciones push.',
      },
    ],
  },
  {
    id: 'publicar',
    title: 'Publicar',
    goal: 'Que la clase la pueda usar a diario.',
    tasks: [
      { id: 'pwa', title: 'App instalable (PWA)', detail: 'Icono en el móvil y horario y entregas disponibles sin conexión.' },
      { id: 'deploy', title: 'Desplegar frontend y backend', detail: 'Con HTTPS y dominio; despliegue automático al hacer push a main.' },
      {
        id: 'privacidad',
        title: 'Privacidad y copias de seguridad',
        detail: 'Política de privacidad (RGPD), borrar la cuenta y sus datos, y copias diarias de la base de datos.',
      },
      { id: 'piloto', title: 'Probarla con la clase', detail: 'Una o dos semanas con 1.º DAW, recoger qué falta y qué sobra, y ajustar.' },
    ],
  },
]

export const PLAN_TASKS = PLAN.flatMap(p => p.tasks)

/* `plan` = lo marcado en el store ({ id: true|false }); si no hay nada, vale lo que diga PLAN */
export const isTaskDone = (task, plan) => (task.id in plan ? plan[task.id] : !!task.done)

export const planFinished = plan => PLAN_TASKS.every(t => isTaskDone(t, plan))
