# Backend de NovaClass

Usamos PocketBase 0.40. Es un solo programa que trae la base de datos SQLite, el inicio de sesión, la subida de archivos, el tiempo real y un panel de administración. En el servidor corre como un contenedor de Podman detrás del túnel de Cloudflare.

El esquema es código. `backend/pb_migrations/` se aplica sola al arrancar, así que la base de datos siempre coincide con el repo. No se cambia a mano desde el panel: para cualquier cambio se crea una migración nueva. `backend/pb_hooks/` tiene las reglas que no caben en las de API.

## En local

```sh
backend/get-pocketbase.sh        # descarga el binario a backend/bin/ (con checksum)
P="--dir backend/pb_data --migrationsDir backend/pb_migrations --hooksDir backend/pb_hooks"
backend/bin/pocketbase superuser upsert tu@correo.local una-contraseña $P
backend/bin/pocketbase serve $P
```

El panel queda en http://127.0.0.1:8090/_/. Ni `backend/bin/` ni `backend/pb_data/` van al repo.

El frontend habla con PocketBase por `/api` en el mismo dominio. En desarrollo lo reenvía el proxy de Vite (`vite.config.js`, `PB_DEV_URL`) y en el servidor lo hará el proxy de delante. El panel de administración (`/_/`) no se reenvía nunca: solo se abre desde el propio servidor, en `http://127.0.0.1:8090/_/`. El cliente está en `src/lib/pb.js` y la sesión en `src/state/auth.jsx`.

## Cuentas

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

Si falta el binario, el test se salta. Se ejecuta con el resto: `npx vitest run`.

## Pendiente

- **Unirse con el código** (tarea «Unirse a una clase con código»). Hace falta una ruta propia que compruebe el código y cree la `membership` de Estudiante. Otra ruta enseñará el código a la dirección y al Tutor, porque está oculto en la API.
- **Contador de visitas de las dudas y de descargas de los apuntes.** Las reglas impiden tocarlos desde el cliente, así que hará falta un hook que los sume.
- **Enlazar a un Docente pendiente cuando crea su cuenta**, por `invite_email`.
- **Módulos por escuela.** Ahora son un catálogo común que gestiona la administración.

## En el servidor

`backend/Containerfile` construye la imagen con la misma versión y el mismo checksum que el script de descarga, y con las migraciones y los hooks dentro. Los datos van en un volumen:

```sh
podman build -t novaclass-pb backend/
podman run -d --name novaclass-pb -p 127.0.0.1:18090:8090 -v novaclass-pb-data:/pb/pb_data novaclass-pb
```

Después hay que añadir una entrada al túnel (`~/.cloudflared/config.yml`) que apunte a `localhost:18090`, o servirlo bajo el mismo dominio que el frontend. Eso se decide en la tarea de despliegue.
