/// <reference path="../pb_data/types.d.ts" />

/*
 * Reglas del modelo v2 que no caben en las reglas de API (docs/escuelas.md, «Modelo v2»).
 * Los hooks corren también para los superusers y el panel, así que valen siempre.
 *
 * Nota: en PocketBase cada handler corre aislado, sin acceso a funciones de fuera; por eso hay código repetido.
 */

/* Quien crea una escuela (si la crea alguien con cuenta) queda como su Director */
onRecordAfterCreateSuccess(e => {
  if (!e.record.get('created_by')) return e.next()
  const staff = new Record(e.app.findCollectionByNameOrId('school_staff'))
  staff.set('school', e.record.id)
  staff.set('user', e.record.get('created_by'))
  staff.set('role', 'director')
  e.app.save(staff)
  e.next()
}, 'schools')

/* El Tutor de un curso es Docente de su escuela */
onRecordValidate(e => {
  const tutor = e.record.getString('tutor')
  if (tutor) {
    const u = e.app.findRecordById('users', tutor)
    if (u.getString('role') !== 'docente' || u.getString('school') !== e.record.getString('school')) {
      throw new BadRequestError('El Tutor tiene que ser Docente de la escuela.', {
        tutor: new ValidationError('tutor_docente', 'Tiene que ser Docente de la escuela.'),
      })
    }
  }
  e.next()
}, 'cursos')

/* En un curso solo hay Estudiantes de su escuela */
onRecordValidate(e => {
  const curso = e.app.findRecordById('cursos', e.record.getString('curso'))
  const u = e.app.findRecordById('users', e.record.getString('user'))
  if (u.getString('role') !== 'estudiante' || u.getString('school') !== curso.getString('school')) {
    throw new BadRequestError('En un curso solo hay Estudiantes de su escuela.', {
      user: new ValidationError('alumno_estudiante', 'Tiene que ser Estudiante de la escuela.'),
    })
  }
  e.next()
}, 'curso_alumnos')

/* Una asignatura es de un curso de su escuela, y sus Docentes son Docentes de la escuela */
onRecordValidate(e => {
  const school = e.record.getString('school')
  const curso = e.app.findRecordById('cursos', e.record.getString('curso'))
  if (curso.getString('school') !== school) {
    throw new BadRequestError('El curso es de otra escuela.', {
      curso: new ValidationError('curso_escuela', 'El curso es de otra escuela.'),
    })
  }
  for (const id of e.record.getStringSlice('docentes')) {
    const u = e.app.findRecordById('users', id)
    if (u.getString('role') !== 'docente' || u.getString('school') !== school) {
      throw new BadRequestError('Los Docentes de una asignatura son Docentes de la escuela.', {
        docentes: new ValidationError('asignatura_docentes', 'Tienen que ser Docentes de la escuela.'),
      })
    }
  }
  e.next()
}, 'asignaturas')

/* Cada hora del horario es de una asignatura de ese curso y la da uno de sus Docentes */
onRecordValidate(e => {
  const as = e.app.findRecordById('asignaturas', e.record.getString('asignatura'))
  if (as.getString('curso') !== e.record.getString('curso')) {
    throw new BadRequestError('La asignatura es de otro curso.', { asignatura: new ValidationError('horario_curso', 'Es de otro curso.') })
  }
  const docente = e.record.getString('docente')
  if (docente && !as.getStringSlice('docentes').includes(docente)) {
    throw new BadRequestError('Ese Docente no da esta asignatura.', {
      docente: new ValidationError('horario_docente', 'No da esta asignatura.'),
    })
  }
  e.next()
}, 'horario')
