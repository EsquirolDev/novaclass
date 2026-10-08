# Backend de NovaClass

Usamos PocketBase 0.40. Es un solo programa que trae la base de datos SQLite, el inicio de sesión, la subida de archivos, el tiempo real y un panel de administración. En el servidor corre como un contenedor de Podman detrás del túnel de Cloudflare.

El esquema es código. `backend/pb_migrations/` se aplica sola al arrancar, así que la base de datos siempre coincide con el repo. No se cambia a mano desde el panel: para cualquier cambio se crea una migración nueva. `backend/pb_hooks/` tiene las reglas que no caben en las de API.

## En local

```sh
backend/get-pocketbase.sh        # descarga el binario a backend/bin/ (con checksum)
P="--dir backend/pb_data --migrationsDir backend/pb_migrations --hooksDir backend/pb_hooks"
backend/bin/pocketbase superuser upsert tu@correo.local una-contraseña $P
backend/bin/pocketbase serve --http 127.0.0.1:8091 $P
```

El panel queda en http://127.0.0.1:8091/_/. El puerto es el 8091 porque el 8090 lo tiene NovaHub para otro servicio. Ni `backend/bin/` ni `backend/pb_data/` van al repo.

El frontend habla con PocketBase por `/api` en el mismo dominio. En desarrollo lo reenvía el proxy de Vite (`vite.config.js`, `PB_DEV_URL`) y en el servidor lo hará el proxy de delante. El panel de administración (`/_/`) no se reenvía nunca: solo se abre desde el propio servidor, en `http://127.0.0.1:8091/_/`. El cliente está en `src/lib/pb.js` y la sesión en `src/state/auth.jsx`.

## La clase en la app

`src/state/clase.jsx` carga, con la sesión iniciada, las clases que puede ver la persona: las suyas y, si es Director, las de su escuela. De la elegida carga el horario, los Docentes, los temas, las entregas y los exámenes, y lo que ha marcado (`event_status`).

- **Varias clases:** se elige en el menú de la cuenta y se recuerda en el navegador.
- **Sin clase:** sale una pantalla que lo explica, con la opción de ver la clase de ejemplo.
- **Formato:** `src/lib/claseData.js` pasa los registros a la misma forma que `src/data/seed.js`, con tests. Así las pantallas no cambian.
- **Horario:** `src/lib/schedule.js` lo guarda como exportaciones vivas (`setHorario`).

«Hecha» y la nota se guardan en `event_status`:

- **Al momento:** el cambio se ve sin esperar al servidor; si falla, se deshace y sale un aviso.
- **En orden:** los cambios de un mismo evento van en cola, así que no se crean registros duplicados.
- **Tiempo real:** la app escucha `event_status` (lo marcado desde otro dispositivo) y `events` (entregas nuevas o cambiadas) mientras la clase está abierta.

Las dudas y los apuntes siguen siendo de ejemplo hasta las partes (c) y (d).

## Cuentas

Encendidas. `VITE_AUTH=off` las apaga: la app se abre sin login y con la clase de ejemplo. Dentro de la app, los datos siguen siendo los de ejemplo hasta conectar el store a PocketBase.

- **Registro y entrada:** con correo y contraseña (mínimo 8 caracteres, la regla de PocketBase), desde `#/registro` y `#/entrar`. Al crear la cuenta se entra directamente.
- **Sesión:** PocketBase guarda el token en `localStorage` y se renueva al abrir la app.
- **Errores:** los mensajes van en español (`src/lib/authErrors.js`). Al entrar no se dice si el correo existe.
- **Recuperar la contraseña:** responde siempre igual, exista o no la cuenta. Para que el correo llegue de verdad hay que configurar SMTP en el panel (Settings → Mail settings), y está pendiente.

## Modelo

La estructura es escuela → clases → personas. El plan, con la tabla de quién puede hacer qué, está en [`escuelas.md`](escuelas.md).

| Colección                      | Qué guarda                                      | Campos clave                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schools`                      | Escuelas                                        | `name`, `city`, `verified` (solo la administración), `created_by`                                                                                                |
| `school_staff`                 | Dirección de cada escuela                       | `school`, `user`, `role` = `director`; quien crea la escuela entra solo                                                                                          |
| `groups`                       | Clases                                          | `school`, `name` («1.º DAW A»), `course` («26/27»), `join_code` (lo genera PocketBase; oculto), `sessions` (franjas), `break` (patio)                            |
| `memberships`                  | Quién está en cada clase                        | `group`, `user` (vacío si aún no tiene cuenta), `role` (`estudiante` o `docente`), `cargo` (`tutor`, `delegado` o `subdelegado`), `pending_name`, `invite_email` |
| `users`                        | Las personas (colección de login de PocketBase) | `name`, `avatar`                                                                                                                                                 |
| `modules`                      | Catálogo común de módulos                       | `key` («pro», enlaza con los colores y formas de `src/data/subjects.js`), `code`, `name`, `has_tasks` (false en DIGI, CPFW e IPO)                                |
| `schedule`                     | Horario: una fila por franja ocupada            | `group`, `day` (1 = lunes), `slot` (índice en `groups.sessions`), `module`, `teacher` (la `membership` de un Docente)                                            |
| `topics`                       | Temas de cada módulo                            | `group`, `module`, `title`, `status` («ok», «now» o el mes), `order`                                                                                             |
| `events`                       | Entregas, exámenes y festivos                   | `group`, `module`, `type`, `title`, `date` («2026-10-09»), `time`, `end`, `tema`, `kind`, `files`, `where`, `topics`, `about`, `related`                         |
| `event_status`                 | Lo de cada persona sobre un evento              | `user`, `event`, `done`, `grade` (una fila por persona y evento)                                                                                                 |
| `dudas`                        | Preguntas                                       | `group`, `module`, `author`, `title` (10–140), `body` (20+), `code`, `tags`, `views`, `accepted`, `edited`, `deleted`                                            |
| `answers`                      | Respuestas                                      | `duda`, `author`, `body`                                                                                                                                         |
| `votes`                        | Votos (+1 / −1)                                 | `user`, `duda`, `answer` (vacío = voto a la duda); uno por persona y duda o respuesta                                                                            |
| `apuntes`                      | PDF, enlaces y notas                            | `group`, `module`, `author`, `type`, `title`, `tema`, `file` (PDF, máx. 20 MB), `url`, `body`, `downloads`                                                       |
| `dudas_stats`, `answers_stats` | Vistas de solo lectura                          | Votos y número de respuestas, contados en la base de datos                                                                                                       |

Fechas y horas van como texto local («2026-10-09», «23:59»), igual que en el frontend, para no tener problemas de zona horaria.

## Datos de arranque

`1791500100_sant_josep_obrer.js` carga lo real:

- los 8 módulos de DAW
- Sant Josep Obrer (verificada)
- 1.º DAW A, con sus franjas y el patio
- sus 10 Docentes, pendientes de crear cuenta
- las 31 franjas del horario

Los datos se copiaron de `src/data/seed.js` y `subjects.js` y quedan fijos en la migración. `backend/tests/seed.test.js` falla si el frontend y la base de datos dejan de coincidir.

## Gente de prueba

`backend/scripts/gente-prueba.mjs` crea cuentas de prueba y los datos de ejemplo de la app. No va en las migraciones, para que no acabe en producción. Se ejecuta a mano contra un PocketBase en marcha, con una cuenta de superuser:

```sh
PB_ADMIN_EMAIL=tu@correo PB_ADMIN_PASS=… node backend/scripts/gente-prueba.mjs crear
PB_ADMIN_EMAIL=tu@correo PB_ADMIN_PASS=… node backend/scripts/gente-prueba.mjs borrar
```

Todas las cuentas usan la contraseña `prueba-novaclass`:

| Cuenta                            | Quién                                    | Dónde                                   |
| --------------------------------- | ---------------------------------------- | --------------------------------------- |
| `director@prueba.novaclass`       | Joana Mascaró Vich, Director             | Sant Josep Obrer                        |
| `tutor@prueba.novaclass`          | Catalina Vidal Ripoll, Docente y Tutor   | 1.º DAW A                               |
| `docente1@prueba.novaclass`       | Toni Ferrer Sastre, Docente              | 1.º DAW A                               |
| `docente2@prueba.novaclass`       | Marga Pons Alzina, Docente               | 1.º DAW A                               |
| `delegado@prueba.novaclass`       | Aina Pons Mir, Estudiante y Delegado     | 1.º DAW A                               |
| `subdelegado@prueba.novaclass`    | Laia Coll Font, Estudiante y Subdelegado | 1.º DAW A                               |
| `estudiante1@prueba.novaclass`    | Marta Rosselló Bauzà, Estudiante         | 1.º DAW A                               |
| `estudiante2@prueba.novaclass`    | Joan Riera Tous, Estudiante              | 1.º DAW A                               |
| `estudiante3@prueba.novaclass`    | Iker Martí Roca, Estudiante              | 1.º DAW A                               |
| `otra-direccion@prueba.novaclass` | Pere Amengual Coll, Director             | Escuela de Prueba (Inca, sin verificar) |
| `otra@prueba.novaclass`           | Xisca Bauzà Pujol, Estudiante            | 1.º SMX A de la Escuela de Prueba       |

En 1.º DAW A carga los datos de ejemplo de `src/data/seed.js`:

- temas, entregas, exámenes y festivos
- dudas con sus respuestas, la respuesta aceptada y votos de la gente de la clase
- apuntes; los de tipo PDF llevan un PDF mínimo generado

Lo que el ejemplo daba por hecho, y su nota, queda como estado de Marta.

Lo creado se apunta en `backend/pb_data/prueba.json`. En el servidor, junto a los datos: añade `PB_URL=http://127.0.0.1:8091 PRUEBA_MANIFEST=/home/sergi/apps/novaclass-pb/prueba.json` a los dos comandos. La gente de prueba ya está cargada allí desde el 8 de octubre de 2026. «borrar» lo quita todo y deja Sant Josep Obrer como estaba. `backend/tests/prueba.test.js` lo comprueba.

## Reglas de acceso

Son la seguridad de verdad: el frontend solo esconde botones. Se construyen con unas pocas funciones al principio de la migración:

| Función     | Quién cumple la regla                              |
| ----------- | -------------------------------------------------- |
| `member`    | Quien está en la clase                             |
| `director`  | Quien es Director de la escuela                    |
| `tutor`     | El Tutor de la clase                               |
| `docente`   | Los Docentes de la clase                           |
| `manager`   | Docentes, Delegado, Subdelegado y Director         |
| `moderator` | Docentes y Director                                |
| `reader`    | Quien está en la clase o es Director de la escuela |

Cada función usa su propio alias de `@collection`. Con el mismo alias, PocketBase comprueba todas las condiciones sobre la misma fila: así, un Director de otra escuela no pasa por Director de la tuya. Lo comprobé antes de escribir las reglas.

Los hooks (`pb_hooks/escuelas.pb.js`) completan lo que no cabe en las reglas de API:

- Quien crea una escuela queda como su Director.
- El Tutor tiene que ser Docente, y el Delegado y el Subdelegado tienen que ser Estudiantes.
- Una persona sin cuenta necesita al menos su nombre.

Los índices únicos garantizan dos cosas: una persona aparece una sola vez por clase, y hay un solo Tutor, Delegado y Subdelegado por clase.

`backend/tests/rules.test.js` prueba cada fila de la tabla de permisos contra un PocketBase de verdad. Usa dos escuelas, varias clases y una persona por cargo. Para comprobar que los tests sirven, se debilitaron reglas a propósito y lo detectaron:

- el Director comprobado sobre filas distintas
- un Tutor que podía nombrar Tutor
- sin el hook de cargos

`backend/tests/server.js` arranca el PocketBase temporal que comparten los tests. Si falta el binario, los tests se saltan. Se ejecuta con el resto: `npx vitest run`.

## Pendiente

- **Unirse con el código** (tarea «Unirse a una clase con código»). Hace falta una ruta propia que compruebe el código y cree la `membership` de Estudiante. Otra ruta enseñará el código a la dirección y al Tutor, porque está oculto en la API.
- **Contador de visitas de las dudas y de descargas de los apuntes.** Las reglas impiden tocarlos desde el cliente, así que hará falta un hook que los sume.
- **Enlazar a un Docente pendiente cuando crea su cuenta**, por `invite_email`.
- **Módulos por escuela.** Ahora son un catálogo común que gestiona la administración.

## En el servidor

PocketBase corre como el servicio **NovaClass API** de NovaHub: un proceso con arranque automático y reinicio si se cae.

```
exec backend/bin/pocketbase serve --http 127.0.0.1:8091 --dir /home/sergi/apps/novaclass-pb/pb_data --migrationsDir backend/pb_migrations --hooksDir backend/pb_hooks
```

- **Carpeta de trabajo:** el repo. Los datos van en `~/apps/novaclass-pb`, fuera del repo.
- **Comprobación de salud:** `/api/health`.
- **Sin subdominio.** La app llega a la API por `novaclass.novaasist.dev/api` gracias al proxy de Vite, y el panel no queda publicado.
- **Migraciones:** se aplican al arrancar, así que basta con reiniciar el servicio tras un `git pull` que traiga una nueva.
- **Producción:** la compilación de producción (`serve.py` de NovaHub) aún no reenvía `/api`. Se resolverá en la tarea de despliegue.

`backend/Containerfile` queda como alternativa en contenedor, con la misma versión y el mismo checksum.
