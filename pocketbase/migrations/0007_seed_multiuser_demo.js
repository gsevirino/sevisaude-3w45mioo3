migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const profilesCol = app.findCollectionByNameOrId('health_profiles')
    const grantsCol = app.findCollectionByNameOrId('profile_access_grants')
    const auditCol = app.findCollectionByNameOrId('access_audit_logs')

    // 1. Obter ou criar a conta de Gislaine
    let gislaine
    try {
      gislaine = app.findAuthRecordByEmail('_pb_users_auth_', 'gislaine.sevirino@gmail.com')
    } catch (_) {
      gislaine = new Record(usersCol)
      gislaine.setEmail('gislaine.sevirino@gmail.com')
      gislaine.setPassword('Skip@Pass')
      gislaine.setVerified(true)
      gislaine.set('name', 'Gislaine Sevirino')
      app.save(gislaine)
    }

    // Obter perfil titular da Gislaine
    let gislaineProfile
    try {
      gislaineProfile = app.findFirstRecordByFilter(
        'health_profiles',
        `user = "${gislaine.id}" && is_proprio = true`,
      )
    } catch (_) {
      gislaineProfile = new Record(profilesCol)
      gislaineProfile.set('user', gislaine.id)
      gislaineProfile.set('nome', 'Gislaine Sevirino')
      gislaineProfile.set('parentesco', 'titular')
      gislaineProfile.set('is_proprio', true)
      app.save(gislaineProfile)
    }

    // 2. Obter ou criar conta demo do familiar "Maria Sevirino"
    const mariaEmail = 'maria.sevirino@exemplo.com.br'
    let maria
    try {
      maria = app.findAuthRecordByEmail('_pb_users_auth_', mariaEmail)
    } catch (_) {
      maria = new Record(usersCol)
      maria.setEmail(mariaEmail)
      maria.setPassword('Skip@Pass')
      maria.setVerified(true)
      maria.set('name', 'Maria Sevirino')
      app.save(maria)
    }

    // Criar perfil titular próprio da Maria também (todo usuário tem o seu)
    let mariaProfile
    try {
      mariaProfile = app.findFirstRecordByFilter(
        'health_profiles',
        `user = "${maria.id}" && is_proprio = true`,
      )
    } catch (_) {
      mariaProfile = new Record(profilesCol)
      mariaProfile.set('user', maria.id)
      mariaProfile.set('nome', 'Maria Sevirino')
      mariaProfile.set('parentesco', 'titular')
      mariaProfile.set('is_proprio', true)
      app.save(mariaProfile)
    }

    // 3. Criar o Vínculo de Acesso (Grant) de Gislaine para Maria com permissões parciais:
    // familiar sem permissão de editar documentos, com permissão de cadastrar consultas e ver medicamentos
    const permissionsMaria = {
      // Medicamentos
      medicamentos_ver: true,
      medicamentos_editar: false,
      // Médicos
      medicos_ver: true,
      medicos_editar: true,
      // Consultas
      consultas_ver: true,
      consultas_editar: true, // cadastrar consultas concedido
      // Exames
      exames_ver: true,
      exames_editar: false,
      // Documentos
      documentos_ver: true,
      documentos_editar: false, // sem permissão de editar documentos
      // Calendário
      calendario_ver: true,
      // Cartão de Saúde
      cartao_ver: true,
    }

    let grantMaria
    try {
      grantMaria = app.findFirstRecordByFilter(
        'profile_access_grants',
        `profile = "${gislaineProfile.id}" && grantee_email = "${mariaEmail}"`,
      )
    } catch (_) {
      grantMaria = new Record(grantsCol)
      grantMaria.set('profile', gislaineProfile.id)
      grantMaria.set('grantor', gislaine.id)
      grantMaria.set('grantee_user', maria.id)
      grantMaria.set('grantee_email', mariaEmail)
      grantMaria.set('grantee_nome', 'Maria Sevirino')
      grantMaria.set('parentesco', 'Filha')
      grantMaria.set('status', 'accepted')
      grantMaria.set('invite_token', 'token_demo_maria_aceito')
      grantMaria.set('permissions', permissionsMaria)
      app.save(grantMaria)

      // Registrar auditoria da criação e do aceite
      const auditLog = new Record(auditCol)
      auditLog.set('target_profile', gislaineProfile.id)
      auditLog.set('executor_user', gislaine.id)
      auditLog.set('executor_name', 'Gislaine Sevirino')
      auditLog.set('action', 'invite_accepted')
      auditLog.set(
        'details',
        'Vínculo de familiar aceito por Maria Sevirino com permissões parciais (consultas e visualização de medicamentos).',
      )
      auditLog.set('grantee_email', mariaEmail)
      auditLog.set('metadata', permissionsMaria)
      auditLog.set('data_hora', new Date().toISOString())
      app.save(auditLog)
    }

    // 4. Também adicionar um dependente/outro titular sob tutela (ex: "Enzo Sevirino" - Filho menor)
    // para demonstrar que Gislaine gerencia múltiplos titulares (ela própria + dependente)
    let enzoProfile
    try {
      enzoProfile = app.findFirstRecordByFilter(
        'health_profiles',
        `user = "${gislaine.id}" && nome = "Enzo Sevirino (Filho)"`,
      )
    } catch (_) {
      enzoProfile = new Record(profilesCol)
      enzoProfile.set('user', gislaine.id)
      enzoProfile.set('nome', 'Enzo Sevirino (Filho)')
      enzoProfile.set('parentesco', 'Filho')
      enzoProfile.set('data_nascimento', '2019-05-18')
      enzoProfile.set('tipo_sanguineo', 'O+')
      enzoProfile.set('alergias', 'Nenhuma alergia conhecida a medicamentos')
      enzoProfile.set('condicoes_saude', 'Acompanhamento pediátrico regular')
      enzoProfile.set('contato_emergencia_nome', 'Gislaine Sevirino')
      enzoProfile.set('contato_emergencia_telefone', '(11) 98111-2233')
      enzoProfile.set('contato_emergencia_parentesco', 'Mãe')
      enzoProfile.set('observacoes', 'Dependente legal (menor de idade cadastrado pela mãe).')
      enzoProfile.set('is_proprio', false)
      app.save(enzoProfile)
    }
  },
  (app) => {},
)
