migrate(
  (app) => {
    // 1. Atualizar coleção consultas
    const consultasCol = app.findCollectionByNameOrId('consultas')
    if (!consultasCol.fields.getByName('numero_autorizacao')) {
      consultasCol.fields.add(new TextField({ name: 'numero_autorizacao' }))
    }
    if (!consultasCol.fields.getByName('validade_autorizacao')) {
      consultasCol.fields.add(new DateField({ name: 'validade_autorizacao' }))
    }
    app.save(consultasCol)

    // 2. Atualizar coleção exames
    const examesCol = app.findCollectionByNameOrId('exames')
    if (!examesCol.fields.getByName('numero_autorizacao')) {
      examesCol.fields.add(new TextField({ name: 'numero_autorizacao' }))
    }
    if (!examesCol.fields.getByName('validade_autorizacao')) {
      examesCol.fields.add(new DateField({ name: 'validade_autorizacao' }))
    }
    app.save(examesCol)
  },
  (app) => {
    try {
      const consultasCol = app.findCollectionByNameOrId('consultas')
      const campoNumCons = consultasCol.fields.getByName('numero_autorizacao')
      if (campoNumCons) consultasCol.fields.remove(campoNumCons.id || 'numero_autorizacao')
      const campoValCons = consultasCol.fields.getByName('validade_autorizacao')
      if (campoValCons) consultasCol.fields.remove(campoValCons.id || 'validade_autorizacao')
      app.save(consultasCol)
    } catch (_) {}

    try {
      const examesCol = app.findCollectionByNameOrId('exames')
      const campoNumEx = examesCol.fields.getByName('numero_autorizacao')
      if (campoNumEx) examesCol.fields.remove(campoNumEx.id || 'numero_autorizacao')
      const campoValEx = examesCol.fields.getByName('validade_autorizacao')
      if (campoValEx) examesCol.fields.remove(campoValEx.id || 'validade_autorizacao')
      app.save(examesCol)
    } catch (_) {}
  },
)
