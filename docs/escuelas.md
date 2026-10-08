# Escuelas, cursos y asignaturas

Modelo v2, acordado el 8 de octubre de 2026. Sustituye al primero (clases con `memberships` y un código por clase): **curso** y **asignatura** no son lo mismo, y las cuentas las crea la escuela.

## Estructura

```
Escuela (Sant Josep Obrer · santjosepobrer · verificada)
├─ Dirección: Director(es) y Coordinador(es)
├─ Festivos
└─ Cursos (1.º DAW A · 26/27)
   ├─ Tutor (un Docente de la escuela)
   ├─ Alumnado: Estudiantes, con un Delegado y un Subdelegado
   ├─ Franjas y patio
   └─ Asignaturas (PRO, BD…): color, forma, código, sus Docentes
      ├─ Horario: qué hora del curso es de qué asignatura y quién la da
      └─ Espacio: entregas, exámenes, temas, apuntes y dudas
```

- **Curso.** Un grupo de alumnado de un año (1.º DAW A, 26/27). A cada Estudiante lo pone en su curso la escuela al crear su cuenta: al curso no se entra con código.
- **Asignatura.** Lo que en el primer modelo era «clase» o «módulo». Un Docente puede dar asignaturas en varios cursos; un Estudiante tiene las de su curso.
- **Espacio de la asignatura.** Lo abre su Docente (`activa`). El alumnado del curso entra con el **código de la asignatura**; hasta entonces, la asignatura solo sale en su horario.
- **Horario.** Lo monta la dirección (Director o Coordinador), nunca un Docente ni el alumnado.
- **Etiqueta.** Cada asignatura tiene código, color y forma de una paleta fija (`azul`, `naranja`, `violeta`, `verde`, `amarillo`, `cian`, `rosa`, `lima`; las formas de `src/components/Sigil.jsx`). Al crearla salen al azar y se pueden cambiar.
- **Escuelas verificadas.** Solo la administración de la plataforma (de momento Sergi, como superuser) puede verificar una escuela.

## Nombres de los cargos

No se pide el género a nadie. Los nombres son siempre los mismos:

| Cargo       | Valor en la base de datos             |
| ----------- | ------------------------------------- |
| Estudiante  | `users.role = 'estudiante'`           |
| Docente     | `users.role = 'docente'`              |
| Delegado    | `curso_alumnos.cargo = 'delegado'`    |
| Subdelegado | `curso_alumnos.cargo = 'subdelegado'` |
| Tutor       | `cursos.tutor`                        |
| Director    | `school_staff.role = 'director'`      |
| Coordinador | `school_staff.role = 'coordinador'`   |

En plural: «Estudiantes», «Docentes», «Dirección».

## Cuentas

Las crea la escuela (Director o Coordinador), de una en una o pegando una lista. No hay registro libre.

- **Datos:** nombre, apellidos, NIA (el ID del centro; solo lo ven el Director y el Tutor) y, si es Estudiante, su curso.
- **Usuario:** sale solo con el formato `usuario@escuela`: inicial del nombre, primer apellido e inicial del segundo, más el nombre corto de la escuela. Sergi Coll Pastor → `scollp@santjosepobrer`; si ya existe, `scollp2`. Las partículas van con el apellido (Dustin de Lara Garcia → `ddelarag`). No es un correo.
- **Contraseña:** una temporal que hay que cambiar al entrar (`must_change_password`). Si alguien la olvida, la resetea el Tutor o la dirección.
- **Correo personal:** opcional, para recuperar la contraseña sin pedirlo a nadie.

## Bajas

- **Baja de una asignatura** (por ejemplo, quien convalida IPO): la pide el Estudiante y la acepta el Tutor del curso. Deja de ver solo las horas y el espacio de esa asignatura.
- **Baja del curso** (`curso_alumnos.baja`): deja de ver todo lo del curso. La da la dirección.

## Quién puede hacer qué

|                                                                | Dirección | Tutor | Docente de la asignatura | Delegado y Subdelegado |    Estudiante     |
| -------------------------------------------------------------- | :-------: | :---: | :----------------------: | :--------------------: | :---------------: |
| Editar la escuela (sin verificarla ni cambiar su nombre corto) |     ✓     |       |                          |                        |                   |
| Cursos, alumnado, asignaturas, horario y festivos              |     ✓     |       |                          |                        |                   |
| Nombrar Delegado y Subdelegado                                 |     ✓     |   ✓   |                          |                        |                   |
| Etiqueta de la asignatura y abrir su espacio                   |     ✓     |       |            ✓             |                        |                   |
| Ver y cambiar el código de la asignatura                       |     ✓     |       |            ✓             |                        |                   |
| Entregas, exámenes y temas                                     |     ✓     |       |            ✓             |   ✓ (si ha entrado)    |                   |
| Moderar dudas y apuntes                                        |     ✓     |       |            ✓             |                        |                   |
| Preguntar, responder, votar, subir apuntes                     |           |       |            ✓             |   ✓ (si ha entrado)    | ✓ (si ha entrado) |
| Marcar lo suyo como hecho y ponerse nota                       |           |       |                          |   ✓ (si ha entrado)    | ✓ (si ha entrado) |

Cada uno ve a la gente, los cursos, el horario y los festivos de su escuela, y nada de otra. El contenido de una asignatura solo lo ven quien ha entrado con el código, sus Docentes y la dirección.

## Fases

1. **Hecho.** Modelo nuevo, reglas, hooks y tests; Sant Josep Obrer pasado al modelo (migraciones `1791500400_modelo_v2.js` y `1791500500_reglas_docentes.js`). La app carga el curso, colores y formas por asignatura, y se entra en cada asignatura con su código.
2. Cuentas creadas por la escuela (una o una lista), entrar con `usuario@escuela`, cambio de contraseña obligatorio, reseteo por el Tutor. Se quita el registro libre.
3. El Docente crea el espacio de su asignatura (etiqueta con color y forma) y comparte el código.
4. La dirección monta el horario desde la app.
5. Bajas.

## Gente de prueba

`backend/scripts/gente-prueba.mjs` (ver [`backend.md`](backend.md)): una persona por cargo en Sant Josep Obrer y alguien de otra escuela, con contraseña conocida. Se borran todas de golpe.
