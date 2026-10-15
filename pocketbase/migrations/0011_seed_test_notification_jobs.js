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

    const owner = app.findFirstRecordByFilter(
      '_pb_users_auth_',
      "email = 'gislaine.sevirino@gmail.com'",
    )
    const maria = app.findFirstRecordByFilter(
      '_pb_users_auth_',
      "email = 'maria.sevirino@exemplo.com.br'",
    )

    const consulta = app.findFirstRecordByFilter(
      'consultas',
      `motivo_atendimento = 'Consulta de Teste para Lembrete'`,
    )
    const exame = app.findFirstRecordByFilter('exames', `nome = 'Exame de Teste para Lembrete'`)

    const targetDateStr = '2026-10-17'
    const jobsCol = app.findCollectionByNameOrId('notification_jobs')

    // Inserir registro de envio para a titular (Gislaine)
    const key1 = `consulta_${consulta.id}_advance_gislaine.sevirino@gmail.com_${targetDateStr}`
    const j1 = new Record(jobsCol)
    j1.set('deduplication_key', key1)
    j1.set('event_type', 'consulta')
    j1.set('target_id', consulta.id)
    j1.set('trigger_timing', 'advance')
    j1.set('scheduled_date', targetDateStr)
    j1.set('recipient_email', 'gislaine.sevirino@gmail.com')
    j1.set('recipient_user', owner.id)
    j1.set('profile', profileId)
    j1.set('status', 'sent')
    j1.set('subject', 'SeviSaúde: Lembrete de consulta de Gislaine Sevirino em 2 dias (17/10/2026)')
    j1.set('sent_at', new Date().toISOString())
    app.save(j1)

    // Inserir registro de envio para a familiar com opt-in e permissão (Maria)
    const key2 = `consulta_${consulta.id}_advance_maria.sevirino@exemplo.com.br_${targetDateStr}`
    const j2 = new Record(jobsCol)
    j2.set('deduplication_key', key2)
    j2.set('event_type', 'consulta')
    j2.set('target_id', consulta.id)
    j2.set('trigger_timing', 'advance')
    j2.set('scheduled_date', targetDateStr)
    j2.set('recipient_email', 'maria.sevirino@exemplo.com.br')
    j2.set('recipient_user', maria.id)
    j2.set('profile', profileId)
    j2.set('status', 'sent')
    j2.set('subject', 'SeviSaúde: Lembrete de consulta de Gislaine Sevirino em 2 dias (17/10/2026)')
    j2.set('sent_at', new Date().toISOString())
    app.save(j2)

    // Inserir registro de exame para a titular
    const key3 = `exame_${exame.id}_advance_gislaine.sevirino@gmail.com_${targetDateStr}`
    const j3 = new Record(jobsCol)
    j3.set('deduplication_key', key3)
    j3.set('event_type', 'exame')
    j3.set('target_id', exame.id)
    j3.set('trigger_timing', 'advance')
    j3.set('scheduled_date', targetDateStr)
    j3.set('recipient_email', 'gislaine.sevirino@gmail.com')
    j3.set('recipient_user', owner.id)
    j3.set('profile', profileId)
    j3.set('status', 'sent')
    j3.set('subject', 'SeviSaúde: Lembrete de exame de Gislaine Sevirino em 2 dias (17/10/2026)')
    j3.set('sent_at', new Date().toISOString())
    app.save(j3)
  },
  (app) => {
    try {
      const jobs = app.findRecordsByFilter(
        'notification_jobs',
        "scheduled_date = '2026-10-17'",
        'created',
        100,
        0,
      )
      for (const j of jobs) {
        app.delete(j)
      }
    } catch (_) {}
  },
)
