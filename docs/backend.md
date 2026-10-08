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

## El curso en la app

`src/state/clase.jsx` carga, con la sesión iniciada, los cursos de la persona: el suyo si es Estudiante, donde da alguna asignatura o es Tutor si es Docente, y todos los de la escuela si es de la dirección. Del elegido carga sus asignaturas, el horario, el alumnado, las inscripciones propias, los temas, las entregas y los exámenes, lo que ha marcado (`event_status`), los festivos de la escuela, las dudas y los apuntes.

- **Varios cursos:** se elige en el menú de la cuenta y se recuerda en el navegador. Con uno solo, la tarjeta del menú lleva a «Tu clase» (`#/clase`), igual que la línea del curso en Inicio.
- **Sin curso:** sale una pantalla que explica que lo pone la escuela. La clase de ejemplo ya solo se ve sin login (`VITE_AUTH=off`).
- **Asignaturas:** la clave de cada una en la app es el id de su registro. `src/data/subjects.js` guarda las del curso como exportaciones vivas (`setSubjects`), con el color y la forma de la base de datos (tokens `--azul`, `--azul-soft`, `--on-azul`…). Tienen página las que están abiertas y en las que la persona ha entrado (o da, o es de la dirección); el resto solo sale en el horario.
- **Entrar con código:** el Estudiante ve en Asignaturas y en «Tu clase» las abiertas en las que aún no ha entrado, con el formulario del código. Sus Docentes y la dirección ven y cambian cada código en «Tu clase».
- **Formato:** `src/lib/claseData.js` pasa los registros a la misma forma que `src/data/seed.js`, con tests. Así las pantallas no cambian.
- **Horario:** `src/lib/schedule.js` lo guarda como exportaciones vivas (`setHorario`).

«Hecha» y la nota se guardan en `event_status`:

- **Al momento:** el cambio se ve sin esperar al servidor; si falla, se deshace y sale un aviso.
- **En orden:** los cambios de un mismo evento van en cola, así que no se crean registros duplicados.
- **Tiempo real:** la app escucha `event_status` (lo marcado desde otro dispositivo) y `events` (entregas nuevas o cambiadas) mientras el curso está abierto.

Las dudas (`src/state/dudasPb.js` y `src/lib/dudasData.js`) se cargan con el curso: dudas, respuestas y votos en crudo, convertidos a la forma de la app. Lo tuyo se reconoce por tu cuenta, no por tu nombre.

- **Al momento:** votar y aceptar se ven sin esperar y se deshacen si fallan. Los votos van en cola, así que tras varios clics rápidos el servidor queda igual que la pantalla.
- **Esperando al servidor:** preguntar, responder y editar necesitan el registro creado. Si fallan, el texto se queda en el formulario.
- **Borrar:** marca `deleted`, para poder deshacer.
- **Tiempo real:** llegan las dudas, respuestas y votos de los demás. PocketBase no avisa cuando un cambio hace invisible una duda (al borrarla), así que se comprueba qué dudas siguen existiendo al volver a la pestaña y cada minuto.

Los apuntes (`src/state/apuntesPb.js` y `src/lib/apuntesData.js`) también se cargan con el curso:

- **Subir:** espera al servidor; el PDF va en un FormData con su tamaño en `bytes`.
- **PDF protegidos:** solo se descargan con un token de archivo, que PocketBase da a quien puede ver el apunte.
- **Abrir:** cuenta una descarga en el servidor. El PDF se abre con su token en otra pestaña, el enlace tal cual y la nota en su pantalla (`#/apuntes/:id`).
- **Tiempo real:** llegan los que suben los demás.

## Contadores

`pb_hooks/contadores.pb.js` tiene dos rutas, porque las reglas no dejan que la app toque estos campos:

- `POST /api/novaclass/apuntes/{id}/abierto` suma una descarga.
- `POST /api/novaclass/dudas/{id}/visita` suma una visita.

Las dos suman solo si quien llama puede ver el registro (la misma regla de lectura que la API), y lo hacen en SQL para que dos a la vez no se pisen. La app las llama una vez por sesión.

PocketBase vigila `pb_hooks`: al cambiar un hook se reinicia solo y aplica las migraciones nuevas.

## Cuentas

Encendidas. `VITE_AUTH=off` las apaga: la app se abre sin login y con la clase de ejemplo.

- **Entrada:** con el correo o con el usuario de la escuela (`scollp@santjosepobrer`) y la contraseña (mínimo 8 caracteres), desde `#/entrar`. Las cuentas las crea la escuela ([`escuelas.md`](escuelas.md)); la pantalla de registro de la app desaparece en la fase 2, y PocketBase ya no deja crear cuentas desde fuera.
- **Sesión:** PocketBase guarda el token en `localStorage` y se renueva al abrir la app.
- **Errores:** los mensajes van en español (`src/lib/authErrors.js`). Al entrar no se dice si la cuenta existe.
- **Recuperar la contraseña:** responde siempre igual, exista o no la cuenta. Para que el correo llegue de verdad hay que configurar SMTP en el panel (Settings → Mail settings), y está pendiente.

## Modelo

La estructura es escuela → cursos → asignaturas. El plan, con la tabla de quién puede hacer qué, está en [`escuelas.md`](escuelas.md).

| Colección                      | Qué guarda                          | Campos clave                                                                                                                                             |
| ------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schools`                      | Escuelas                            | `name`, `slug` (nombre corto, único: `santjosepobrer`), `city`, `verified` (solo la administración), `created_by`                                        |
| `school_staff`                 | Dirección de cada escuela           | `school`, `user`, `role` (`director` o `coordinador`)                                                                                                    |
| `users`                        | Las personas (colección de login)   | `nombre`, `apellidos`, `name`, `username` (`scollp@santjosepobrer`), `nia` (oculto), `school`, `role` (`estudiante` o `docente`), `must_change_password` |
| `cursos`                       | Cursos                              | `school`, `name` («1.º DAW A»), `course` («26/27»), `sessions` (franjas), `break` (patio), `tutor`                                                       |
| `curso_alumnos`                | Alumnado de cada curso              | `curso`, `user`, `cargo` (`delegado` o `subdelegado`), `baja` (baja del curso)                                                                           |
| `asignaturas`                  | Asignaturas de cada curso           | `school`, `curso`, `nombre`, `codigo`, `color`, `forma`, `docentes`, `activa` (espacio abierto), `join_code` (lo genera PocketBase; oculto)              |
| `horario`                      | Una fila por franja ocupada         | `curso`, `day` (1 = lunes), `slot` (índice en `cursos.sessions`), `asignatura`, `docente`                                                                |
| `inscripciones`                | Quién ha entrado en cada asignatura | `asignatura`, `user`; solo se crean con el código                                                                                                        |
| `festivos`                     | Días sin clase de la escuela        | `school`, `title`, `date`                                                                                                                                |
| `topics`                       | Temas                               | `asignatura`, `title`, `status` («ok», «now» o el mes), `order`                                                                                          |
| `events`                       | Entregas y exámenes                 | `asignatura`, `type`, `title`, `date` («2026-10-09»), `time`, `end`, `tema`, `kind`, `files`, `where`, `topics`, `about`, `related`                      |
| `event_status`                 | Lo de cada persona sobre un evento  | `user`, `event`, `done`, `grade` (una fila por persona y evento)                                                                                         |
| `dudas`                        | Preguntas                           | `asignatura`, `author`, `title` (10–140), `body` (20+), `code`, `tags`, `views`, `accepted`, `edited`, `deleted`                                         |
| `answers`                      | Respuestas                          | `duda`, `author`, `body`, `code`, `after`                                                                                                                |
| `votes`                        | Votos (+1 / −1)                     | `user`, `duda`, `answer` (vacío = voto a la duda); uno por persona y duda o respuesta                                                                    |
| `apuntes`                      | PDF, enlaces y notas                | `asignatura`, `author`, `type`, `title`, `tema`, `file` (PDF protegido, máx. 20 MB), `bytes`, `url`, `body`, `downloads`                                 |
| `dudas_stats`, `answers_stats` | Vistas de solo lectura              | Votos y número de respuestas, contados en la base de datos                                                                                               |

Fechas y horas van como texto local («2026-10-09», «23:59»), igual que en el frontend, para no tener problemas de zona horaria.

Rutas propias (`pb_hooks/clases.pb.js`), porque el código está oculto en la API:

- `POST /api/novaclass/unirse` `{ code }`: inscribe en la asignatura. Solo al alumnado de su curso (sin baja) y si el espacio está abierto. Da igual cómo se escriba el código (minúsculas, guion).
- `GET` y `POST /api/novaclass/asignaturas/{id}/codigo`: ver o cambiar el código, para sus Docentes y la dirección.

## Datos de arranque

`1791500100_sant_josep_obrer.js` cargó Sant Josep Obrer en el primer modelo, y `1791500400_modelo_v2.js` lo pasa al nuevo:

- Sant Josep Obrer (verificada, `santjosepobrer`)
- 1.º DAW A, con sus franjas y el patio
- sus 10 Docentes como cuentas de la escuela (`mmolinar@santjosepobrer`…), con una contraseña al azar que nadie conoce: la dirección les dará acceso en la fase 2
- las 8 asignaturas con su color, su forma y sus Docentes; PRO, BD, LMSGI, SI y ED con el espacio abierto
- las 31 franjas del horario

La migración v2 borra el resto del primer modelo y no se puede deshacer: para volver atrás hay que restaurar una copia de `pb_data`. `1791500500_reglas_docentes.js` arregla las reglas: en PocketBase una relación múltiple se compara con `docentes.id ?= …`, y `docentes ?= …` no encontraba a nadie.

`backend/tests/seed.test.js` falla si el horario de la base de datos y el de ejemplo del frontend dejan de coincidir.

## Gente de prueba

`backend/scripts/gente-prueba.mjs` crea cuentas de prueba y los datos de ejemplo de la app. No va en las migraciones, para que no acabe en producción. Se ejecuta a mano contra un PocketBase en marcha, con una cuenta de superuser:

```sh
PB_ADMIN_EMAIL=tu@correo PB_ADMIN_PASS=… node backend/scripts/gente-prueba.mjs crear
PB_ADMIN_EMAIL=tu@correo PB_ADMIN_PASS=… node backend/scripts/gente-prueba.mjs borrar
```

Todas las cuentas usan la contraseña `prueba-novaclass`, y se entra con el correo o con el usuario de la escuela:

| Cuenta                            | Quién                                                                                    | Usuario de la escuela        |
| --------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------- |
| `director@prueba.novaclass`       | Joana Mascaró Vich, Director de Sant Josep Obrer                                         | `jmascarov@santjosepobrer`   |
| `coordinador@prueba.novaclass`    | Bernat Oliver Serra, Coordinador de Sant Josep Obrer                                     | `bolivers@santjosepobrer`    |
| `tutor@prueba.novaclass`          | Catalina Vidal Ripoll, Tutor de 1.º DAW A y Docente de BD                                | `cvidalr@santjosepobrer`     |
| `docente1@prueba.novaclass`       | Toni Ferrer Sastre, Docente de PRO y SI                                                  | `tferrers@santjosepobrer`    |
| `docente2@prueba.novaclass`       | Marga Pons Alzina, Docente de LMSGI y ED                                                 | `mponsa@santjosepobrer`      |
| `delegado@prueba.novaclass`       | Aina Pons Mir, Delegado de 1.º DAW A                                                     | `aponsm@santjosepobrer`      |
| `subdelegado@prueba.novaclass`    | Laia Coll Font, Subdelegado de 1.º DAW A                                                 | `lcollf@santjosepobrer`      |
| `estudiante1@prueba.novaclass`    | Marta Rosselló Bauzà, Estudiante de 1.º DAW A                                            | `mrossellob@santjosepobrer`  |
| `estudiante2@prueba.novaclass`    | Joan Riera Tous, Estudiante de 1.º DAW A                                                 | `jrierat@santjosepobrer`     |
| `estudiante3@prueba.novaclass`    | Iker Martí Roca, Estudiante de 1.º DAW A, sin ninguna asignatura (para probar el código) | `imartir@santjosepobrer`     |
| `otra-direccion@prueba.novaclass` | Pere Amengual Coll, Director de la Escuela de Prueba                                     | `pamengualc@escueladeprueba` |
| `otra@prueba.novaclass`           | Xisca Bauzà Pujol, Estudiante de 1.º SMX A (Escuela de Prueba)                           | `xbauzap@escueladeprueba`    |

Los Docentes de prueba se suman a los de verdad en sus asignaturas, y la Tutor pasa a serlo de 1.º DAW A. El alumnado de prueba (menos Iker) entra en las cinco asignaturas abiertas. En ellas se cargan los datos de ejemplo de `src/data/seed.js`:

- temas, entregas y exámenes; el festivo, en los festivos de la escuela
- dudas con sus respuestas, la respuesta aceptada y votos del alumnado
- apuntes; los de tipo PDF llevan un PDF mínimo generado

Lo que el ejemplo daba por hecho, y su nota, queda como estado de Marta.

Lo creado se apunta en `backend/pb_data/prueba.json`. En el servidor, junto a los datos: añade `PB_URL=http://127.0.0.1:8091 PRUEBA_MANIFEST=/home/sergi/apps/novaclass-pb/prueba.json` a los dos comandos. La gente de prueba está cargada allí (modelo v2) desde el 8 de octubre de 2026. «borrar» lo quita todo y deja Sant Josep Obrer como estaba, con su Tutor y sus Docentes de antes. `backend/tests/prueba.test.js` lo comprueba.

## Reglas de acceso

Son la seguridad de verdad: el frontend solo esconde botones. Se construyen con unas pocas funciones al principio de `1791500400_modelo_v2.js`:

| Función       | Quién cumple la regla                                                   |
| ------------- | ----------------------------------------------------------------------- |
| `staff`       | La dirección (Director o Coordinador) de la escuela                     |
| `inscrito`    | Quien ha entrado en la asignatura con su código                         |
| `delegado`    | El Delegado o Subdelegado del curso, sin baja                           |
| `reader`      | Inscrito, Docente de la asignatura o dirección                          |
| `manager`     | Docente de la asignatura, dirección, o Delegado y Subdelegado inscritos |
| `participant` | Inscrito o Docente de la asignatura                                     |
| `moderator`   | Docente de la asignatura o dirección                                    |

Cada función usa su propio alias de `@collection`. Con el mismo alias, PocketBase comprueba todas las condiciones sobre la misma fila: así, la dirección de otra escuela no pasa por dirección de la tuya.

Los hooks (`pb_hooks/escuelas.pb.js`) completan lo que no cabe en las reglas de API:

- Quien crea una escuela queda como su Director.
- El Tutor es Docente de la escuela; en un curso solo hay Estudiantes de su escuela.
- Una asignatura es de un curso de su escuela, y sus Docentes son Docentes de la escuela.
- Cada hora del horario es de una asignatura de ese curso y la da uno de sus Docentes.

Los índices únicos garantizan que una persona está una sola vez en cada curso, que hay un solo Delegado y un solo Subdelegado por curso, y una sola asignatura por franja.

`backend/tests/rules.test.js` prueba cada fila de la tabla de permisos contra un PocketBase de verdad, con dos escuelas, dos cursos y una persona por cargo. `backend/tests/server.js` arranca el PocketBase temporal que comparten los tests, sin `automigrate` (para que no escriba migraciones en el repo). Si falta el binario, los tests se saltan. Se ejecuta con el resto: `npx vitest run`.

## Pendiente

Las fases 2 a 5 de [`escuelas.md`](escuelas.md): cuentas creadas por la escuela, el espacio de cada asignatura, el horario desde la app y las bajas. Además, SMTP para el correo de recuperación.

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
