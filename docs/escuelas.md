# Escuelas, clases y cargos

Plan acordado el 8 de octubre de 2026. Sustituye a `users.role` y `users.group` del primer modelo, que solo permitían una clase por persona y no tenían escuela ni cargos.

## Estructura

```
Escuela (Sant Josep Obrer · verificada)
├─ Dirección: director/a(s)
└─ Clases (1.º DAW A · 26/27)
   ├─ Profesorado: profesor/a … y un tutor/a (uno de ellos)
   └─ Alumnado: alumno/a … con un delegado/a y un subdelegado/a
```

- **Escuelas.** Cualquiera puede crear una escuela y queda como su director/a. Solo la administración de la plataforma (superuser de PocketBase, de momento Sergi) puede marcarla como **verificada**, y en la app se distingue de las demás.
- **Varias clases por persona.** Un profe da clase en varias, y un alumno también puede estar en más de una (por ejemplo, si repite módulos). Si estás en más de una, la app tiene un selector de clase.
- **Varios directores** por escuela.

## Modelo (cambios sobre `docs/backend.md`)

| Colección              | Qué guarda                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schools` (nueva)      | `name`, `city`, `verified` (solo la cambia la administración), `created_by`                                                                                                                                 |
| `school_staff` (nueva) | `school`, `user`, `role` = `director`                                                                                                                                                                       |
| `groups`               | Pasa a tener `school`. El resto igual (nombre, curso, código, franjas, patio).                                                                                                                              |
| `memberships` (nueva)  | `group`, `user` (vacío si aún no tiene cuenta), `role` (`alumno` o `profesor`), `cargo` (`delegado`, `subdelegado` o `tutor`, opcional), `pending_name` y `invite_email` para quien aún no se ha registrado |
| `users`                | Pierde `role` y `group` y gana `trato` (`m`, `f` o `n`): cómo nombrar sus cargos                                                                                                                            |
| `schedule`             | `teacher` pasa a apuntar a una `membership` de profesor (así vale aunque el profe aún no tenga cuenta)                                                                                                      |
| `teachers`             | Desaparece: el profesorado son personas de la clase                                                                                                                                                         |

**Restricciones que garantiza la base de datos:**

- como mucho un tutor, un delegado y un subdelegado por clase
- el tutor es profesor de esa clase, y delegado y subdelegado son alumnos
- una persona aparece una sola vez en cada clase

## Cómo se nombra cada cargo

`trato` lo elige cada persona en su perfil. Si está vacío, se usa la forma neutra.

|             | Masculino   | Femenino    | Neutra              |
| ----------- | ----------- | ----------- | ------------------- |
| Alumno      | alumno      | alumna      | estudiante          |
| Profesor    | profesor    | profesora   | docente             |
| Delegado    | delegado    | delegada    | persona delegada    |
| Subdelegado | subdelegado | subdelegada | persona subdelegada |
| Tutor       | tutor       | tutora      | persona tutora      |
| Director    | director    | directora   | persona directora   |

Al hablar de grupos se usan términos colectivos: «el alumnado», «el profesorado», «la dirección».

## Quién puede hacer qué

|                                            | Administración | Dirección | Tutor/a | Profesor/a | Delegado/a y subdelegado/a | Alumno/a |
| ------------------------------------------ | :------------: | :-------: | :-----: | :--------: | :------------------------: | :------: |
| Verificar una escuela                      |       ✓        |           |         |            |                            |          |
| Editar la escuela                          |       ✓        |     ✓     |         |            |                            |          |
| Crear clases en la escuela                 |       ✓        |     ✓     |         |            |                            |          |
| Añadir o quitar gente de la clase          |       ✓        |     ✓     |    ✓    |            |                            |          |
| Nombrar tutor/a                            |       ✓        |     ✓     |         |            |                            |          |
| Nombrar delegado/a y subdelegado/a         |       ✓        |     ✓     |    ✓    |            |                            |          |
| Horario, temas, entregas y exámenes        |       ✓        |     ✓     |    ✓    |     ✓      |             ✓              |          |
| Moderar dudas y apuntes (ocultar o borrar) |       ✓        |     ✓     |    ✓    |     ✓      |                            |          |
| Preguntar, responder, votar, subir apuntes |                |           |    ✓    |     ✓      |             ✓              |    ✓     |
| Marcar lo suyo como hecho                  |                |           |         |            |             ✓              |    ✓     |

Para entrar en una clase hay dos caminos: el **código de la clase** o que te añada la dirección o el tutor/a.

## Sant Josep Obrer (datos de arranque)

- Escuela **Sant Josep Obrer**, verificada.
- Clase **1.º DAW A, curso 26/27**, con el horario real (`projectes/Horari`, más los cambios de CPFW e IPO).
- Sus módulos y su profesorado: los profes se crean como pendientes con su nombre y se enlazan cuando creen su cuenta.
- Sergi, como administración de la plataforma.

## Gente de prueba

Las cuentas de prueba se crean con un script aparte (`backend/scripts/`), no en la migración, para que no acaben en producción. Son:

- una director/a
- una tutor/a y dos profes
- una delegado/a y una subdelegado/a
- tres alumnos con tratos distintos (m, f y n)
- alguien de otra escuela, para comprobar que no ve nada de Sant Josep Obrer

Todas las cuentas usan `@prueba.novaclass` y tienen contraseña conocida. Se pueden borrar todas de golpe.

## Orden de trabajo

1. **Migración 2:** escuelas, `memberships`, `trato`, `schedule` → `membership`, y fuera `users.role`, `users.group` y `teachers`. Reglas nuevas según la tabla, y tests de reglas ampliados con cada fila de la tabla.
2. **Datos de arranque:** Sant Josep Obrer con su clase, horario, módulos, profesorado, temas y eventos.
3. **Script de gente de prueba.**
4. **Frontend:** nombres de cargo según el trato, selector de clase y, más adelante, las pantallas de gestión (crear escuela, clase, miembros y cargos).
