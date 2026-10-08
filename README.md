# NovaClass

Organizador de clase para 1.º de DAW: entregas, exámenes, apuntes compartidos y dudas.
Vite + React, sin más dependencias. Diseño: color + forma + código por asignatura; las normas están en [`docs/diseno.md`](docs/diseno.md).

```sh
npm install
npm run dev     # http://localhost:5173 (/api va a PocketBase en 127.0.0.1:8090)
npm run build
```

Para crear cuentas y entrar hace falta PocketBase en marcha (ver [`docs/backend.md`](docs/backend.md)). Si vive en otro sitio: `PB_DEV_URL=http://… npm run dev`. En producción, `VITE_PB_URL` si el backend no está en el mismo dominio.

## Backend

PocketBase en `backend/`: el esquema y las reglas de acceso van como migraciones en el repo. Cómo arrancarlo en local, el modelo de datos y las reglas están en [`docs/backend.md`](docs/backend.md).

## Tests

Vitest para la lógica pura y para las reglas de acceso del backend (contra un PocketBase de verdad, si está descargado): horario (`schedule`), fechas, selectores del store, dudas (mezcla con lo que hace la persona y ediciones), reglas del formulario de pregunta y plan de mejoras. Los archivos `*.test.js` van al lado del código que prueban.

```sh
npx vitest run     # una vez
npx vitest         # vigilando cambios
```

## Lint y formato

ESLint 9 (`eslint.config.js`) y Prettier (`.prettierrc.json`). Los CSS quedan fuera de Prettier porque van compactos, una regla por línea.

```sh
npx eslint .
npx prettier --write .
```

## Estructura

| Ruta                        | Qué hay                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/tokens.css`     | Variables del sistema de diseño (tema Oscuro por defecto, Claro con `data-theme="light"`). Referencia con notas de uso y contrastes: `docs/tokens.json`.                                                                                                                                                                           |
| `src/styles/components.css` | Estilos `na-*` de los componentes.                                                                                                                                                                                                                                                                                                 |
| `src/styles/app.css`        | Maquetación de pantallas (`nc-*`) y puntos de corte (1240, 1080, 860 px).                                                                                                                                                                                                                                                          |
| `src/components/`           | Componentes del sistema: Icon, Sigil, SubjectTag, Pill, Button, Tabs, Card, Hero, ProgressSegments, ListRow, EventChip, Countdown, Avatar, DoneToggle, VoteCounter, StatusBadge, FileBadge, SectionTitle, TopBar, AppBar, BottomNav, WeekStrip y los estados (EmptyState, ErrorState, LoadingState, ErrorBoundary, OfflineBanner). |
| `src/data/`                 | Asignaturas y datos de ejemplo (`seed.js`): una sola lista de eventos de la que salen semana, mes, progreso y «Lo siguiente».                                                                                                                                                                                                      |
| `src/state/`                | Store en React Context; lo que hace la persona (hechas, votos, dudas, respuestas, apuntes, tema) se guarda en `localStorage` (`novaclass:v1`).                                                                                                                                                                                     |
| `docs/`                     | Normas de diseño (`diseno.md`) y tokens con su uso (`tokens.json`).                                                                                                                                                                                                                                                                |
| `src/pages/`                | Inicio, Calendario (mes, semana y horario), Asignaturas, Asignatura, Dudas, Nueva pregunta, Duda, Apuntes.                                                                                                                                                                                                                         |
| `src/lib/schedule.js`       | Horario: bloques por día, horas semanales por módulo. Los datos (`SESSIONS`, `SCHEDULE`) están en `seed.js`.                                                                                                                                                                                                                       |

Rutas por hash: `#/`, `#/calendario`, `#/asignaturas/:id`, `#/dudas/:id`, `#/apuntes`.

## Plan de mejoras

Pulsa **M** en cualquier pantalla (sin estar escribiendo) para abrir el plan de actuación (`#/mejoras`); otra vez **M** vuelve a donde estabas. Las tareas están en `src/data/plan.js` (`done: true` marca lo ya hecho en el código) y lo que marcas se guarda en `localStorage`. Al completar todas y salir, la pantalla desaparece y la tecla deja de funcionar; para recuperarla, borra `planClosed` de `novaclass:v1`.
