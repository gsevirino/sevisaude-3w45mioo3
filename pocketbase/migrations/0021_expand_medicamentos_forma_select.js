migrate(
  (app) => {
    const medCol = app.findCollectionByNameOrId('medicamentos')

    // 1. Expandir os valores válidos do campo 'forma'
    const formaField = medCol.fields.getByName('forma')
    if (formaField) {
      // Valores permitidos no frontend e OCR:
      // comprimido, cápsula, xarope, solução, gotas, injetável, creme, pomada, spray, adesivo, outro
      formaField.values = [
        'comprimido',
        'cápsula',
        'xarope',
        'solução',
        'gotas',
        'injetável',
        'creme',
        'pomada',
        'spray',
        'adesivo',
        'outro',
      ]
      formaField.required = false
    }

    // 2. Garantir que periodicidade e dia_referencia existam com todas as opções
    const periodicidadeField = medCol.fields.getByName('periodicidade')
    if (periodicidadeField) {
      periodicidadeField.values = [
        'diária',
        'semanal',
        'quinzenal',
        'mensal',
        'semestral',
        'temporário',
      ]
      periodicidadeField.required = false
    }

    app.save(medCol)
  },
  (app) => {
    try {
      const medCol = app.findCollectionByNameOrId('medicamentos')
      const formaField = medCol.fields.getByName('forma')
      if (formaField) {
        formaField.values = [
          'comprimido',
          'cápsula',
          'xarope',
          'solução',
          'injetável',
          'creme',
          'outro',
        ]
      }
      app.save(medCol)
    } catch (_) {}
  },
)
