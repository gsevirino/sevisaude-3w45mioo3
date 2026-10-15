migrate(
  (app) => {
    // 1. health_profiles (com regras simples inicialmente, pois profile_access_grants ainda não existe)
    const healthProfiles = new Collection({
      name: 'health_profiles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'parentesco', type: 'text' }, // 'titular' (próprio), 'filho(a)', 'pai', 'mãe', 'cônjuge', etc.
        { name: 'data_nascimento', type: 'date' },
        { name: 'tipo_sanguineo', type: 'text' },
        { name: 'alergias', type: 'text' },
        { name: 'condicoes_saude', type: 'text' },
        { name: 'contato_emergencia_nome', type: 'text' },
        { name: 'contato_emergencia_telefone', type: 'text' },
        { name: 'contato_emergencia_parentesco', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'is_proprio', type: 'bool' }, // se é o titular da própria conta
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_health_profiles_user ON health_profiles (user)',
        'CREATE INDEX idx_health_profiles_is_proprio ON health_profiles (is_proprio)',
      ],
    })
    app.save(healthProfiles)
    const profilesCol = app.findCollectionByNameOrId('health_profiles')

    // 2. profile_access_grants
    const profileAccessGrants = new Collection({
      name: 'profile_access_grants',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (grantor = @request.auth.id || grantee_user = @request.auth.id || grantee_email = @request.auth.email)",
      viewRule:
        "@request.auth.id != '' && (grantor = @request.auth.id || grantee_user = @request.auth.id || grantee_email = @request.auth.email)",
      createRule: "@request.auth.id != '' && grantor = @request.auth.id",
      updateRule:
        "@request.auth.id != '' && (grantor = @request.auth.id || grantee_user = @request.auth.id || grantee_email = @request.auth.email)",
      deleteRule: "@request.auth.id != '' && grantor = @request.auth.id",
      fields: [
        {
          name: 'profile',
          type: 'relation',
          collectionId: profilesCol.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'grantor',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
        },
        {
          name: 'grantee_user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'grantee_email', type: 'email', required: true },
        { name: 'grantee_nome', type: 'text' },
        { name: 'parentesco', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'accepted', 'revoked', 'declined'],
          maxSelect: 1,
        },
        { name: 'invite_token', type: 'text' },
        { name: 'permissions', type: 'json' }, // Objeto granular de permissões
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_grants_profile ON profile_access_grants (profile)',
        'CREATE INDEX idx_grants_grantor ON profile_access_grants (grantor)',
        'CREATE INDEX idx_grants_grantee_email ON profile_access_grants (grantee_email)',
        'CREATE INDEX idx_grants_grantee_user ON profile_access_grants (grantee_user)',
        'CREATE INDEX idx_grants_status ON profile_access_grants (status)',
      ],
    })
    app.save(profileAccessGrants)

    // Agora que profile_access_grants existe, atualizamos listRule e viewRule de health_profiles
    profilesCol.listRule =
      "@request.auth.id != '' && (user = @request.auth.id || @collection.profile_access_grants.profile ?= id && @collection.profile_access_grants.grantee_email = @request.auth.email && @collection.profile_access_grants.status = 'accepted')"
    profilesCol.viewRule =
      "@request.auth.id != '' && (user = @request.auth.id || @collection.profile_access_grants.profile ?= id && @collection.profile_access_grants.grantee_email = @request.auth.email && @collection.profile_access_grants.status = 'accepted')"
    app.save(profilesCol)

    // 3. access_audit_logs (auditoria de convites, permissões, aceites e revogações)
    const accessAuditLogs = new Collection({
      name: 'access_audit_logs',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (executor_user = @request.auth.id || target_profile.user = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (executor_user = @request.auth.id || target_profile.user = @request.auth.id)",
      createRule: "@request.auth.id != ''",
      updateRule: null, // imutável
      deleteRule: null, // imutável
      fields: [
        {
          name: 'target_profile',
          type: 'relation',
          collectionId: profilesCol.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'executor_user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
        },
        { name: 'executor_name', type: 'text', required: true },
        {
          name: 'action',
          type: 'select',
          required: true,
          values: [
            'invite_created',
            'invite_accepted',
            'permissions_updated',
            'grant_revoked',
            'invite_declined',
          ],
          maxSelect: 1,
        },
        { name: 'details', type: 'text' },
        { name: 'grantee_email', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'data_hora', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_profile ON access_audit_logs (target_profile)',
        'CREATE INDEX idx_audit_executor ON access_audit_logs (executor_user)',
        'CREATE INDEX idx_audit_action ON access_audit_logs (action)',
      ],
    })
    app.save(accessAuditLogs)

    // 4. Adicionar 'profile' (relation -> health_profiles) nas coleções de dados de saúde
    const targetCollections = [
      'medicos',
      'medicamentos',
      'consultas',
      'exames',
      'documentos',
      'alteracoes_medicamentos',
    ]

    for (const colName of targetCollections) {
      const col = app.findCollectionByNameOrId(colName)
      if (!col.fields.getByName('profile')) {
        col.fields.add(
          new RelationField({
            name: 'profile',
            collectionId: profilesCol.id,
            maxSelect: 1,
          }),
        )
        col.addIndex(`idx_${colName}_profile`, false, 'profile', '')
        app.save(col)
      }
    }

    // 5. Backfill idempotente: cada conta existente ganha seu perfil próprio de titular
    // e todos os registros de saúde existentes (onde userId = user.id) são associados a ele.
    const allUsers = app.findRecordsByFilter('_pb_users_auth_', "id != ''", 'created', 1000, 0)
    for (const u of allUsers) {
      const uId = u.id
      let prof
      try {
        prof = app.findFirstRecordByFilter(
          'health_profiles',
          `user = "${uId}" && is_proprio = true`,
        )
      } catch (_) {
        prof = new Record(profilesCol)
        prof.set('user', uId)
        prof.set('nome', u.getString('name') || u.getString('email') || 'Titular')
        prof.set('parentesco', 'titular')
        prof.set('is_proprio', true)
        prof.set('alergias', u.getString('alergias') || '')
        prof.set('condicoes_saude', u.getString('condicoes_saude') || '')
        prof.set('contato_emergencia_nome', u.getString('contato_emergencia_nome') || '')
        prof.set('contato_emergencia_telefone', u.getString('contato_emergencia_telefone') || '')
        prof.set(
          'contato_emergencia_parentesco',
          u.getString('contato_emergencia_parentesco') || '',
        )
        app.save(prof)
      }

      const profId = prof.id

      // Atualizar registros que pertencem a este userId e estão sem profile
      for (const colName of targetCollections) {
        app
          .db()
          .newQuery(
            `UPDATE ${colName} SET profile = {:pId} WHERE userId = {:uId} AND (profile IS NULL OR profile = '')`,
          )
          .bind({ pId: profId, uId: uId })
          .execute()
      }
    }
  },
  (app) => {
    // Reverter coleções novas
    const toDelete = ['access_audit_logs', 'profile_access_grants', 'health_profiles']
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
