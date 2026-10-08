/// <reference path="../pb_data/types.d.ts" />

/*
 * Contadores que la app no puede tocar directamente (las reglas lo impiden, para que nadie se invente descargas o
 * visitas): una ruta por contador que suma 1 si quien llama puede ver el registro (misma regla de lectura que la API).
 * La suma se hace en SQL (downloads = downloads + 1) para que dos a la vez no se pisen.
 *
 * Nota: en PocketBase cada handler corre aislado, sin acceso a funciones de fuera; por eso el código se repite.
 */

/* Alguien ha abierto un apunte (PDF, enlace o nota) */
routerAdd(
  'POST',
  '/api/novaclass/apuntes/{id}/abierto',
  e => {
    const id = e.request.pathValue('id')
    let rec
    try {
      rec = e.app.findRecordById('apuntes', id)
    } catch {
      throw new NotFoundError('No existe ese apunte.')
    }
    if (!e.app.canAccessRecord(rec, e.requestInfo(), rec.collection().viewRule)) throw new NotFoundError('No existe ese apunte.')
    e.app.db().newQuery('UPDATE apuntes SET downloads = downloads + 1 WHERE id = {:id}').bind({ id }).execute()
    const now = e.app.findRecordById('apuntes', id)
    return e.json(200, { downloads: now.getInt('downloads') })
  },
  $apis.requireAuth(),
)

/* Alguien ha abierto una duda (la app lo pide una vez por sesión y duda) */
routerAdd(
  'POST',
  '/api/novaclass/dudas/{id}/visita',
  e => {
    const id = e.request.pathValue('id')
    let rec
    try {
      rec = e.app.findRecordById('dudas', id)
    } catch {
      throw new NotFoundError('No existe esa duda.')
    }
    if (!e.app.canAccessRecord(rec, e.requestInfo(), rec.collection().viewRule)) throw new NotFoundError('No existe esa duda.')
    e.app.db().newQuery('UPDATE dudas SET views = views + 1 WHERE id = {:id}').bind({ id }).execute()
    const now = e.app.findRecordById('dudas', id)
    return e.json(200, { views: now.getInt('views') })
  },
  $apis.requireAuth(),
)
