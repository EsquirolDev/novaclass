# Escuelas, clases y cargos

Plan acordado el 8 de octubre de 2026. Sustituye a `users.role` y `users.group` del primer modelo, que solo permitían una clase por persona y no tenían ni escuela ni cargos.

## Estructura

```
Escuela (Sant Josep Obrer · verificada)
├─ Dirección: Director(es)
└─ Clases (1.º DAW A · 26/27)
   ├─ Docentes … y un Tutor (uno de ellos)
   └─ Estudiantes … con un Delegado y un Subdelegado
```

- **Escuelas.** Cualquiera puede crear una escuela y queda como Director. Solo la administración de la plataforma (de momento Sergi, como superuser de PocketBase) puede marcarla como **verificada**, y en la app se distingue de las demás.
- **Varias clases por persona.** Un Docente da clase en varias, y un Estudiante también puede estar en más de una (por ejemplo, si repite módulos). Si estás en más de una, la app tiene un selector de clase.
- **Varios Directores** por escuela.

## Nombres de los cargos

No se pide el género a nadie. Los nombres son siempre los mismos, en la app y en la base de datos:

| Cargo       | En la app   | Valor en la base de datos           |
| ----------- | ----------- | ----------------------------------- |
| Estudiante  | Estudiante  | `memberships.role = 'estudiante'`   |
| Docente     | Docente     | `memberships.role = 'docente'`      |
| Delegado    | Delegado    | `memberships.cargo = 'delegado'`    |
| Subdelegado | Subdelegado | `memberships.cargo = 'subdelegado'` |
| Tutor       | Tutor       | `memberships.cargo = 'tutor'`       |
| Director    | Director    | `school_staff.role = 'director'`    |

En plural: «Estudiantes», «Docentes», «Dirección».

## Modelo (cambios sobre `docs/backend.md`)

| Colección              | Qué guarda                                                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schools` (nueva)      | `name`, `city`, `verified` (solo la cambia la administración), `created_by`                                                                                                                                    |
| `school_staff` (nueva) | `school`, `user`, `role` = `director`                                                                                                                                                                          |
| `groups`               | Pasa a tener `school`; el resto igual (nombre, curso, código, franjas, patio)                                                                                                                                  |
| `memberships` (nueva)  | `group`, `user` (vacío si aún no tiene cuenta), `role` (`estudiante` o `docente`), `cargo` (`delegado`, `subdelegado`, `tutor` u opcional), `pending_name` e `invite_email` para quien aún no se ha registrado |
| `users`                | Pierde `role` y `group`                                                                                                                                                                                        |
| `schedule`             | `teacher` pasa a apuntar a la `membership` de un Docente, así vale aunque aún no tenga cuenta                                                                                                                  |
| `teachers`             | Desaparece: los Docentes son personas de la clase                                                                                                                                                              |

**Restricciones que garantiza la base de datos:**

- Como mucho un Tutor, un Delegado y un Subdelegado por clase.
- El Tutor es Docente de esa clase, y el Delegado y el Subdelegado son Estudiantes de ella.
- Una persona aparece una sola vez en cada clase.

## Quién puede hacer qué

|                                            | Administración | Director | Tutor | Docente | Delegado y Subdelegado | Estudiante |
| ------------------------------------------ | :------------: | :------: | :---: | :-----: | :--------------------: | :--------: |
| Verificar una escuela                      |       ✓        |          |       |         |                        |            |
| Editar la escuela                          |       ✓        |    ✓     |       |         |                        |            |
| Crear clases en la escuela                 |       ✓        |    ✓     |       |         |                        |            |
| Añadir o quitar gente de la clase          |       ✓        |    ✓     |   ✓   |         |                        |            |
| Nombrar Tutor                              |       ✓        |    ✓     |       |         |                        |            |
| Nombrar Delegado y Subdelegado             |       ✓        |    ✓     |   ✓   |         |                        |            |
| Horario, temas, entregas y exámenes        |       ✓        |    ✓     |   ✓   |    ✓    |           ✓            |            |
| Moderar dudas y apuntes (ocultar o borrar) |       ✓        |    ✓     |   ✓   |    ✓    |                        |            |
| Preguntar, responder, votar, subir apuntes |                |          |   ✓   |    ✓    |           ✓            |     ✓      |
| Marcar lo suyo como hecho                  |                |          |       |         |           ✓            |     ✓      |

Para entrar en una clase hay dos caminos: el **código de la clase** o que te añada un Director o el Tutor.

## Sant Josep Obrer (datos de arranque)

- Escuela **Sant Josep Obrer**, verificada.
- Clase **1.º DAW A, curso 26/27**, con el horario real de `projectes/Horari` más los cambios de CPFW e IPO.
- Sus módulos y sus Docentes. Los Docentes se crean como pendientes, con su nombre, y se enlazan cuando creen su cuenta.
- Sergi, como administración de la plataforma.

## Gente de prueba

Un script aparte en `backend/scripts/` las crea; no van en la migración, para que no acaben en producción. Son:

- un Director
- un Tutor y dos Docentes
- un Delegado y un Subdelegado
- tres Estudiantes
- alguien de otra escuela, para comprobar que no ve nada de Sant Josep Obrer

Todas usan `@prueba.novaclass` y tienen contraseña conocida. Se pueden borrar todas de golpe.

## Orden de trabajo

1. **Hecho.** Modelo con escuelas, `memberships` y cargos, reglas según la tabla y hooks. Probado en `backend/tests/rules.test.js`. Se reescribió la primera migración en lugar de añadir una segunda, porque no se había aplicado en ningún sitio.
2. **Hecho.** Datos de arranque (`1791500100_sant_josep_obrer.js`): los 8 módulos y Sant Josep Obrer (verificada) con 1.º DAW A, sus 10 Docentes pendientes y las 31 franjas del horario. Solo lo real: las entregas, los exámenes, los temas y las dudas de `seed.js` son de ejemplo y van con el script de gente de prueba. El Tutor y la dirección se nombran desde el panel. `backend/tests/seed.test.js` comprueba que la base de datos y el frontend dicen lo mismo.
3. **Script de gente de prueba.**
4. **Frontend.** Cargos en la app, selector de clase y, más adelante, las pantallas de gestión: crear escuela, crear clase, miembros y cargos.
