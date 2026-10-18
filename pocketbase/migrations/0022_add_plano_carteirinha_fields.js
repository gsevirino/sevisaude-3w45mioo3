migrate(
  (app) => {
    // 1. Adicionar plano_saude e numero_carteirinha na coleção health_profiles
    const hpCol = app.findCollectionByNameOrId('health_profiles')
    if (!hpCol.fields.getByName('plano_saude')) {
      hpCol.fields.add(new TextField({ name: 'plano_saude' }))
    }
    if (!hpCol.fields.getByName('numero_carteirinha')) {
      hpCol.fields.add(new TextField({ name: 'numero_carteirinha' }))
    }

    // Permitir que grantees autorizados possam atualizar o perfil se tiverem permissão, ou manter regra segura
    // A regra de update de health_profiles era:
    // "@request.auth.id != '' && user = @request.auth.id"
    // Se um familiar aceito tiver acesso, ele precisa de updateRule que permita editar se tiver vínculo aceito
    // Vamos garantir que o dono OU o familiar com vínculo aceito possa atualizar o titular:
    hpCol.updateRule =
      "@request.auth.id != '' && (user = @request.auth.id || @collection.profile_access_grants.profile ?= id && @collection.profile_access_grants.grantee_email = @request.auth.email && @collection.profile_access_grants.status = 'accepted')"
    app.save(hpCol)

    // 2. Adicionar plano_saude e numero_carteirinha na coleção users para retrocompatibilidade
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('plano_saude')) {
      usersCol.fields.add(new TextField({ name: 'plano_saude' }))
    }
    if (!usersCol.fields.getByName('numero_carteirinha')) {
      usersCol.fields.add(new TextField({ name: 'numero_carteirinha' }))
    }
    app.save(usersCol)
  },
  (app) => {
    const hpCol = app.findCollectionByNameOrId('health_profiles')
    if (hpCol.fields.getByName('plano_saude')) {
      hpCol.fields.removeByName('plano_saude')
    }
    if (hpCol.fields.getByName('numero_carteirinha')) {
      hpCol.fields.removeByName('numero_carteirinha')
    }
    hpCol.updateRule = "@request.auth.id != '' && user = @request.auth.id"
    app.save(hpCol)

    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (usersCol.fields.getByName('plano_saude')) {
      usersCol.fields.removeByName('plano_saude')
    }
    if (usersCol.fields.getByName('numero_carteirinha')) {
      usersCol.fields.removeByName('numero_carteirinha')
    }
    app.save(usersCol)
  },
)
