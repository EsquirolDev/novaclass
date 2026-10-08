/// <reference path="../pb_data/types.d.ts" />

/*
 * Apuntes: los PDF pasan a estar protegidos (solo se descargan con un token de archivo, que solo da PocketBase a quien
 * puede ver el apunte, en vez de con un enlace que podría compartirse fuera de la clase) y se guarda su tamaño en bytes
 * para enseñarlo («1,2 MB»).
 */
migrate(
  app => {
    const apuntes = app.findCollectionByNameOrId('apuntes')
    apuntes.fields.getByName('file').protected = true
    apuntes.fields.add(new NumberField({ name: 'bytes', onlyInt: true, min: 0 }))
    app.save(apuntes)
  },
  app => {
    const apuntes = app.findCollectionByNameOrId('apuntes')
    apuntes.fields.getByName('file').protected = false
    apuntes.fields.removeByName('bytes')
    app.save(apuntes)
  },
)
