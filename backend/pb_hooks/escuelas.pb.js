/// <reference path="../pb_data/types.d.ts" />

/*
 * Reglas de escuelas y clases que no caben en las reglas de API (docs/escuelas.md).
 * Los hooks corren también para los superusers y el panel de administración, así que valen siempre.
 */

/* Quien crea una escuela queda como su Director */
onRecordAfterCreateSuccess(e => {
  const staff = new Record(e.app.findCollectionByNameOrId('school_staff'))
  staff.set('school', e.record.id)
  staff.set('user', e.record.get('created_by'))
  staff.set('role', 'director')
  e.app.save(staff)
  e.next()
}, 'schools')

/*
 * Cargos coherentes con el rol: el Tutor es Docente y el Delegado y el Subdelegado son Estudiantes.
 * Quien aún no tiene cuenta necesita al menos un nombre (pending_name).
 */
onRecordValidate(e => {
  const r = e.record
  const role = r.get('role')
  const cargo = r.get('cargo')
  if (cargo === 'tutor' && role !== 'docente') {
    throw new BadRequestError('El Tutor tiene que ser Docente de la clase.', {
      cargo: new ValidationError('tutor_docente', 'El Tutor tiene que ser Docente.'),
    })
  }
  if ((cargo === 'delegado' || cargo === 'subdelegado') && role !== 'estudiante') {
    throw new BadRequestError('El Delegado y el Subdelegado tienen que ser Estudiantes de la clase.', {
      cargo: new ValidationError('delegado_estudiante', 'Tiene que ser Estudiante.'),
    })
  }
  if (!r.get('user') && !String(r.get('pending_name') || '').trim()) {
    throw new BadRequestError('Falta la persona: una cuenta o al menos su nombre.', {
      pending_name: new ValidationError('pending_sin_nombre', 'Pon su nombre.'),
    })
  }
  e.next()
}, 'memberships')
