/// <reference path="../pb_data/types.d.ts" />

/*
 * Arreglo del modelo v2: en las reglas, una relación múltiple se compara por su id (`docentes.id ?= …`);
 * `docentes ?= …` no encuentra a nadie y dejaba a los Docentes fuera de sus asignaturas.
 * De paso, el alias `as` (palabra reservada de SQL) pasa a `sa`.
 */
migrate(
  app => {
    const fix = rule => (rule == null ? rule : rule.replaceAll('docentes ?= ', 'docentes.id ?= ').replaceAll(':as.', ':sa.'))
    for (const c of app.findAllCollections()) {
      if (c.system) continue
      let changed = false
      for (const k of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) {
        const next = fix(c[k])
        if (next !== c[k]) {
          c[k] = next
          changed = true
        }
      }
      if (changed) app.save(c)
    }
  },
  () => {
    throw new Error('1791500500_reglas_docentes: no se puede deshacer automáticamente')
  },
)
