/// <reference path="../pb_data/types.d.ts" />

/*
 * Cuentas de la escuela (fase 2): nadie se quita a mano «tiene que cambiar la contraseña»; se quita solo al cambiarla
 * (hook en pb_hooks/cuentas.pb.js).
 */
migrate(
  app => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.updateRule.includes('must_change_password')) {
      users.updateRule += ' && @request.body.must_change_password:isset = false'
      app.save(users)
    }
  },
  app => {
    const users = app.findCollectionByNameOrId('users')
    users.updateRule = users.updateRule.replace(' && @request.body.must_change_password:isset = false', '')
    app.save(users)
  },
)
