migrate(
  (app) => {
    const profilesCol = app.findCollectionByNameOrId('health_profiles')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Criar coleção 'clinicas'
    const clinicas = new Collection({
      name: 'clinicas',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (userId = @request.auth.id || @collection.profile_access_grants.profile ?= profile && @collection.profile_access_grants.grantee_email = @request.auth.email && @collection.profile_access_grants.status = 'accepted')",
      viewRule:
        "@request.auth.id != '' && (userId = @request.auth.id || @collection.profile_access_grants.profile ?= profile && @collection.profile_access_grants.grantee_email = @request.auth.email && @collection.profile_access_grants.status = 'accepted')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (userId = @request.auth.id || @collection.profile_access_grants.profile ?= profile && @collection.profile_access_grants.grantee_email = @request.auth.email && @collection.profile_access_grants.status = 'accepted')",
      deleteRule: "@request.auth.id != '' && userId = @request.auth.id",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: ['Clínica', 'Laboratório', 'Consultório', 'Hospital', 'Outro'],
          maxSelect: 1,
        },
        { name: 'telefone', type: 'text' },
        { name: 'endereco', type: 'text' },
        { name: 'bairro', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'cep', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'userId', type: 'text', required: true },
        {
          name: 'profile',
          type: 'relation',
          collectionId: profilesCol.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clinicas_userId ON clinicas (userId)',
        'CREATE INDEX idx_clinicas_profile ON clinicas (profile)',
        'CREATE INDEX idx_clinicas_nome ON clinicas (nome)',
      ],
    })
    app.save(clinicas)
    const clinicasCol = app.findCollectionByNameOrId('clinicas')

    // 2. Adicionar relação opcional clinica em consultas
    const consultasCol = app.findCollectionByNameOrId('consultas')
    if (!consultasCol.fields.getByName('clinica')) {
      consultasCol.fields.add(
        new RelationField({
          name: 'clinica',
          collectionId: clinicasCol.id,
          maxSelect: 1,
        }),
      )
      consultasCol.addIndex('idx_consultas_clinica', false, 'clinica', '')
      app.save(consultasCol)
    }

    // 3. Adicionar relação opcional clinica em exames
    const examesCol = app.findCollectionByNameOrId('exames')
    if (!examesCol.fields.getByName('clinica')) {
      examesCol.fields.add(
        new RelationField({
          name: 'clinica',
          collectionId: clinicasCol.id,
          maxSelect: 1,
        }),
      )
      examesCol.addIndex('idx_exames_clinica', false, 'clinica', '')
      app.save(examesCol)
    }
  },
  (app) => {
    // Reverter campos clinica de consultas e exames
    try {
      const consultasCol = app.findCollectionByNameOrId('consultas')
      consultasCol.removeIndex('idx_consultas_clinica')
      const field = consultasCol.fields.getByName('clinica')
      if (field) consultasCol.fields.remove(field)
      app.save(consultasCol)
    } catch (_) {}

    try {
      const examesCol = app.findCollectionByNameOrId('exames')
      examesCol.removeIndex('idx_exames_clinica')
      const field = examesCol.fields.getByName('clinica')
      if (field) examesCol.fields.remove(field)
      app.save(examesCol)
    } catch (_) {}

    try {
      const clinicasCol = app.findCollectionByNameOrId('clinicas')
      app.delete(clinicasCol)
    } catch (_) {}
  },
)
