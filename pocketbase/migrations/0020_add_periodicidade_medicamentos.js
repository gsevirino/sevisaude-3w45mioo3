migrate(
  (app) => {
    const medCol = app.findCollectionByNameOrId('medicamentos')

    // 1. Campo 'periodicidade' (opções: contínua/diária, semanal, quinzenal, mensal, semestral, uso temporário)
    if (!medCol.fields.getByName('periodicidade')) {
      medCol.fields.add(
        new SelectField({
          name: 'periodicidade',
          values: ['diária', 'semanal', 'quinzenal', 'mensal', 'semestral', 'temporário'],
          maxSelect: 1,
        }),
      )
    }

    // 2. Campo 'dia_referencia' (dia da semana, dia do mês ou data)
    if (!medCol.fields.getByName('dia_referencia')) {
      medCol.fields.add(new TextField({ name: 'dia_referencia' }))
    }

    app.save(medCol)
  },
  (app) => {
    try {
      const medCol = app.findCollectionByNameOrId('medicamentos')
      const pField = medCol.fields.getByName('periodicidade')
      if (pField) medCol.fields.removeByName('periodicidade')
      const dField = medCol.fields.getByName('dia_referencia')
      if (dField) medCol.fields.removeByName('dia_referencia')
      app.save(medCol)
    } catch (_) {}
  },
)
