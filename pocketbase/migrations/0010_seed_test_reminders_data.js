migrate(
  (app) => {
    // Buscar perfil demo da Gislaine
    let profileId = ''
    try {
      const p = app.findFirstRecordByFilter('health_profiles', 'is_proprio = true')
      profileId = p.id
    } catch (_) {
      return
    }

    // Buscar médico demo
    let medicoId = ''
    try {
      const m = app.findFirstRecordByFilter('medicos', "nome != ''")
      medicoId = m.id
    } catch (_) {}

    const owner = app.findFirstRecordByFilter(
      '_pb_users_auth_',
      "email = 'gislaine.sevirino@gmail.com'",
    )
    const ownerId = owner.id

    // Atualizar grant de Maria Sevirino para ter notificacoes_ver: true
    try {
      const grant = app.findFirstRecordByFilter(
        'profile_access_grants',
        "grantee_email = 'maria.sevirino@exemplo.com.br'",
      )
      const currentPerms = JSON.parse(grant.getString('permissions')) || {}
      currentPerms.notificacoes_ver = true
      grant.set('permissions', JSON.stringify(currentPerms))
      app.save(grant)
    } catch (_) {}

    // Calcular data futura em 2 dias (janela padrão de antecedência days_advance = 2)
    const now = new Date()
    const future2 = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2),
    )
    const y = future2.getUTCFullYear()
    const m = (future2.getUTCMonth() + 1 < 10 ? '0' : '') + (future2.getUTCMonth() + 1)
    const d = (future2.getUTCDate() < 10 ? '0' : '') + future2.getUTCDate()
    const targetDateIso = `${y}-${m}-${d} 00:00:00.000Z`
    const targetDateStr = `${y}-${m}-${d}`

    // 1. Consulta futura para teste
    const colConsultas = app.findCollectionByNameOrId('consultas')
    try {
      app.findFirstRecordByFilter(
        'consultas',
        `motivo_atendimento = 'Consulta de Teste para Lembrete'`,
      )
    } catch (_) {
      const c = new Record(colConsultas)
      c.set('userId', ownerId)
      c.set('profile', profileId)
      if (medicoId) c.set('medico', medicoId)
      c.set('data', targetDateIso)
      c.set('horario', '10:30')
      c.set('tipo', 'Presencial')
      c.set('local', 'Clínica Integrada - Sala 301')
      c.set('status', 'Agendada')
      c.set('motivo_atendimento', 'Consulta de Teste para Lembrete')
      app.save(c)
    }

    // 2. Exame futuro para teste
    const colExames = app.findCollectionByNameOrId('exames')
    try {
      app.findFirstRecordByFilter('exames', `nome = 'Exame de Teste para Lembrete'`)
    } catch (_) {
      const ex = new Record(colExames)
      ex.set('userId', ownerId)
      ex.set('profile', profileId)
      if (medicoId) ex.set('medico', medicoId)
      ex.set('nome', 'Exame de Teste para Lembrete')
      ex.set('tipo', 'Sangue')
      ex.set('data_solicitado', targetDateIso)
      ex.set('data_hora_agendada', `${targetDateStr} 08:00`)
      ex.set('local_realizacao', 'Laboratório Central')
      ex.set('instrucoes_preparo', 'Jejum obrigatório de 8 horas')
      ex.set('status', 'Agendado')
      app.save(ex)
    }
  },
  (app) => {
    try {
      const c = app.findFirstRecordByFilter(
        'consultas',
        `motivo_atendimento = 'Consulta de Teste para Lembrete'`,
      )
      app.delete(c)
    } catch (_) {}
    try {
      const ex = app.findFirstRecordByFilter('exames', `nome = 'Exame de Teste para Lembrete'`)
      app.delete(ex)
    } catch (_) {}
  },
)
