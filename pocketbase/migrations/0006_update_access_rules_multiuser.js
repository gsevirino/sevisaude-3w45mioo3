migrate(
  (app) => {
    // Definir regra expandida de listRule e viewRule nas coleções de saúde
    // O usuário pode listar/ver se o registro for dele (userId = @request.auth.id)
    // OU se o profile do registro possui um profile_access_grant aceito para o email do usuário autenticado.
    const collectionsToUpdate = [
      'medicos',
      'medicamentos',
      'consultas',
      'exames',
      'documentos',
      'alteracoes_medicamentos',
    ]

    for (const name of collectionsToUpdate) {
      const col = app.findCollectionByNameOrId(name)
      // list & view rule: dono do registro OU possui vínculo aceito com o titular do registro
      col.listRule =
        "@request.auth.id != '' && (userId = @request.auth.id || @collection.profile_access_grants.profile ?= profile && @collection.profile_access_grants.grantee_email = @request.auth.email && @collection.profile_access_grants.status = 'accepted')"
      col.viewRule =
        "@request.auth.id != '' && (userId = @request.auth.id || @collection.profile_access_grants.profile ?= profile && @collection.profile_access_grants.grantee_email = @request.auth.email && @collection.profile_access_grants.status = 'accepted')"

      // create: autenticado
      col.createRule = "@request.auth.id != ''"

      // update: dono direto OU vinculado aceito (exclusão de registros continua restrita ao titular/dono!)
      col.updateRule =
        "@request.auth.id != '' && (userId = @request.auth.id || @collection.profile_access_grants.profile ?= profile && @collection.profile_access_grants.grantee_email = @request.auth.email && @collection.profile_access_grants.status = 'accepted')"

      // delete: RESTREITO AO TITULAR/DONO DO REGISTRO (requisito do prompt mestre)
      col.deleteRule = "@request.auth.id != '' && userId = @request.auth.id"

      app.save(col)
    }
  },
  (app) => {
    // Rollback para regras anteriores
    const collectionsToUpdate = [
      'medicos',
      'medicamentos',
      'consultas',
      'exames',
      'documentos',
      'alteracoes_medicamentos',
    ]
    for (const name of collectionsToUpdate) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.listRule = "@request.auth.id != '' && userId = @request.auth.id"
        col.viewRule = "@request.auth.id != '' && userId = @request.auth.id"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != '' && userId = @request.auth.id"
        col.deleteRule = "@request.auth.id != '' && userId = @request.auth.id"
        app.save(col)
      } catch (_) {}
    }
  },
)
