# Backend de NovaClass

> **Cambio en camino:** escuelas, varias clases por persona y cargos (tutor/a, delegado/a, subdelegado/a, dirección). Ver [`escuelas.md`](escuelas.md). Lo de abajo describe la primera migración.

PocketBase 0.40, que en un solo programa trae la base de datos SQLite, el inicio de sesión, la subida de archivos, el tiempo real y un panel de administración. En el servidor corre como un contenedor de Podman detrás del túnel de Cloudflare.

El esquema es código: `backend/pb_migrations/` se aplica sola al arrancar PocketBase, así que la base de datos siempre coincide con el repo. No se cambia a mano desde el panel. Si hace falta un cambio, se crea una migración nueva.

## En local

```sh
backend/get-pocketbase.sh        # descarga el binario a backend/bin/ (con checksum)
backend/bin/pocketbase superuser upsert tu@correo.local una-contraseña --dir backend/pb_data --migrationsDir backend/pb_migrations
backend/bin/pocketbase serve --dir backend/pb_data --migrationsDir backend/pb_migrations
```

El panel queda en http://127.0.0.1:8090/_/. Ni `backend/bin/` ni `backend/pb_data/` van al repo.

## Modelo

Todo pertenece a un **grupo**, que es una clase («1.º DAW A, 26/27»). Cada persona está en un grupo y solo ve lo de su grupo.

| Colección                      | Qué guarda                                      | Campos clave                                                                                                                                 |
| ------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `groups`                       | La clase                                        | `name`, `course`, `join_code` (oculto en la API), `sessions` (franjas del día), `break` (patio)                                              |
| `users`                        | Las personas (colección de login de PocketBase) | `name`, `avatar`, `role` (vacío = alumno, `delegado`, `profe`), `group`                                                                      |
| `teachers`                     | Profesorado                                     | `key` («montero»), `short`, `name`                                                                                                           |
| `modules`                      | Módulos del curso                               | `key` («pro», enlaza con los colores y formas de `src/data/subjects.js`), `code`, `name`, `has_tasks` (false en DIGI, CPFW, IPO), `teachers` |
| `schedule`                     | Horario: una fila por franja ocupada            | `group`, `day` (1 = lunes), `slot` (índice en `groups.sessions`), `module`, `teacher`                                                        |
| `topics`                       | Temas de cada módulo                            | `group`, `module`, `title`, `status` («ok», «now» o el mes), `order`                                                                         |
| `events`                       | Entregas, exámenes y festivos                   | `group`, `module`, `type`, `title`, `date` («2026-10-09»), `time`, `end`, `tema`, `kind`, `files`, `where`, `topics`, `about`, `related`     |
| `event_status`                 | Lo de cada persona sobre un evento              | `user`, `event`, `done`, `grade` (una fila por persona y evento)                                                                             |
| `dudas`                        | Preguntas                                       | `group`, `module`, `author`, `title` (10–140), `body` (20+), `code`, `tags`, `views`, `accepted`, `edited`, `deleted`                        |
| `answers`                      | Respuestas                                      | `duda`, `author`, `body`                                                                                                                     |
| `votes`                        | Votos (+1 / −1)                                 | `user`, `duda`, `answer` (vacío = voto a la duda); uno por persona y duda o respuesta                                                        |
| `apuntes`                      | PDF, enlaces y notas                            | `group`, `module`, `author`, `type`, `title`, `tema`, `file` (PDF, máx. 20 MB), `url`, `body`, `downloads`                                   |
| `dudas_stats`, `answers_stats` | Vistas de solo lectura                          | Votos y número de respuestas, contados en la base de datos                                                                                   |

Fechas y horas van como texto local («2026-10-09», «23:59»), igual que en el frontend, para no tener problemas de zona horaria.

## Reglas de acceso

Son la seguridad de verdad: el frontend solo esconde botones.

- **Mismo grupo.** Solo se lee lo del propio grupo (`group = @request.auth.group`). Otro grupo no ve ni las dudas, ni los apuntes, ni a la gente.
- **A nombre propio.** Al crear, `author` o `user` tiene que ser quien hace la petición. Nadie publica ni vota en nombre de otra persona.
- **Campos protegidos.** Nadie se pone rol ni grupo a sí mismo, ni al registrarse ni después. Tampoco se pueden inventar visitas ni descargas, ni cambiar el autor o el grupo de algo.
- **Delegado y profe** gestionan el horario, los temas, las entregas, los exámenes y los festivos de su grupo.
- **Dudas.**
  - Solo quien pregunta la edita y elige la respuesta aceptada, que tiene que ser una respuesta de esa misma duda.
  - Al borrarla, se marca con `deleted`, que solo puede verla quien la escribió (para «Deshacer») y no admite respuestas.
  - Borrarla de verdad puede quien la escribió o un profe del grupo.
- **«Hecha» y la nota** de cada evento solo las ve y las cambia cada persona.

`backend/tests/rules.test.js` lo comprueba contra un PocketBase de verdad: arranca el binario en una carpeta temporal, crea gente de dos grupos con distintos roles y prueba lo que cada uno puede y no puede hacer. Si falta el binario, el test se salta. Se ejecuta con el resto: `npx vitest run`.

## Pendiente

- **Ruta para unirse con el código del grupo** (tarea «Unirse a un grupo con código»). Por ahora el grupo lo asigna el admin.
- **Contador de visitas de las dudas y de descargas de los apuntes.** Las reglas impiden tocarlos desde el cliente, así que hará falta un hook que los sume.
- **Datos de arranque** (tarea «Pasar seed.js a la base de datos»).

## En el servidor

`backend/Containerfile` construye la imagen con la misma versión y el mismo checksum que el script de descarga, y con las migraciones dentro. Los datos van en un volumen:

```sh
podman build -t novaclass-pb backend/
podman run -d --name novaclass-pb -p 127.0.0.1:18090:8090 -v novaclass-pb-data:/pb/pb_data novaclass-pb
```

Después hace falta añadir una entrada al túnel (`~/.cloudflared/config.yml`) apuntando a `localhost:18090`, o servirlo bajo el mismo dominio que el frontend. Eso se decide en la tarea de despliegue.
