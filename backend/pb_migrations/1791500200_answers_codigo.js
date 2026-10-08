/// <reference path="../pb_data/types.d.ts" />

/* Las respuestas, como en la app, pueden llevar un bloque de código y un texto después (src/pages/Duda.jsx) */
migrate(
  app => {
    const answers = app.findCollectionByNameOrId('answers')
    answers.fields.add(new TextField({ name: 'code', max: 10000 }))
    answers.fields.add(new TextField({ name: 'after', max: 5000 }))
    app.save(answers)
  },
  app => {
    const answers = app.findCollectionByNameOrId('answers')
    answers.fields.removeByName('code')
    answers.fields.removeByName('after')
    app.save(answers)
  },
)
