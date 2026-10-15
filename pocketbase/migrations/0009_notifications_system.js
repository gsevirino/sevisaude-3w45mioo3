migrate(
  (app) => {
    // 1. Coleção notification_preferences
    // Preferências de lembretes por usuário:
    // - enabled: ativa ou desativa globalmente lembretes por e-mail para esta conta
    // - appointments_enabled: lembretes de consultas
    // - exams_enabled: lembretes de exames
    // - days_advance: antecedência configurável em dias (ex: 1, 2, 3, 7 dias antes)
    // - notify_day_before: avisar na véspera (1 dia antes)
    // - notify_same_day: avisar no próprio dia do compromisso (manhã)
    // - family_opt_in: se o usuário aceita receber lembretes de saúde dos titulares vinculados onde ele possui permissão
    const notificationPrefs = new Collection({
      name: 'notification_preferences',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'enabled', type: 'bool' },
        { name: 'appointments_enabled', type: 'bool' },
        { name: 'exams_enabled', type: 'bool' },
        { name: 'days_advance', type: 'number', min: 0, max: 30, onlyInt: true },
        { name: 'notify_day_before', type: 'bool' },
        { name: 'notify_same_day', type: 'bool' },
        { name: 'family_opt_in', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_notif_prefs_user ON notification_preferences (user)'],
    })
    app.save(notificationPrefs)

    // 2. Coleção notification_jobs
    // Registro de lembretes processados / enviados:
    // - deduplication_key: chave única: `${targetType}_${targetId}_${triggerTiming}_${recipientEmail}_${scheduleDate}`
    // - event_type: 'consulta' | 'exame'
    // - target_id: ID da consulta ou exame
    // - trigger_timing: 'advance' | 'day_before' | 'same_day'
    // - scheduled_date: data original do compromisso (YYYY-MM-DD)
    // - recipient_email: e-mail do destinatário
    // - recipient_user: ID do usuário (se cadastrado)
    // - profile: ID do titular de saúde
    // - status: 'sent' | 'failed' | 'skipped'
    // - error_message: mensagem de erro (caso falhe)
    // - sent_at: ISO timestamp
    const notifPrefsCol = app.findCollectionByNameOrId('notification_preferences')

    const notificationJobs = new Collection({
      name: 'notification_jobs',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (recipient_user = @request.auth.id || @request.auth.id = profile.user)",
      viewRule:
        "@request.auth.id != '' && (recipient_user = @request.auth.id || @request.auth.id = profile.user)",
      createRule: null, // Apenas backend/superusers criam registros de envio
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'deduplication_key', type: 'text', required: true },
        {
          name: 'event_type',
          type: 'select',
          required: true,
          values: ['consulta', 'exame'],
          maxSelect: 1,
        },
        { name: 'target_id', type: 'text', required: true },
        {
          name: 'trigger_timing',
          type: 'select',
          required: true,
          values: ['advance', 'day_before', 'same_day'],
          maxSelect: 1,
        },
        { name: 'scheduled_date', type: 'text', required: true },
        { name: 'recipient_email', type: 'email', required: true },
        {
          name: 'recipient_user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'profile',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('health_profiles').id,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['sent', 'failed', 'skipped'],
          maxSelect: 1,
        },
        { name: 'subject', type: 'text' },
        { name: 'error_message', type: 'text' },
        { name: 'sent_at', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_notif_jobs_dedup ON notification_jobs (deduplication_key)',
        'CREATE INDEX idx_notif_jobs_target ON notification_jobs (target_id)',
        'CREATE INDEX idx_notif_jobs_recipient ON notification_jobs (recipient_email)',
        'CREATE INDEX idx_notif_jobs_status ON notification_jobs (status)',
      ],
    })
    app.save(notificationJobs)

    // 3. Inicializar preferências padrão para usuários existentes
    const allUsers = app.findRecordsByFilter('_pb_users_auth_', "id != ''", 'created', 1000, 0)
    for (const u of allUsers) {
      try {
        app.findFirstRecordByFilter('notification_preferences', `user = "${u.id}"`)
      } catch (_) {
        const pref = new Record(notifPrefsCol)
        pref.set('user', u.id)
        pref.set('enabled', true)
        pref.set('appointments_enabled', true)
        pref.set('exams_enabled', true)
        pref.set('days_advance', 2) // 2 dias antes por padrão
        pref.set('notify_day_before', true)
        pref.set('notify_same_day', true)
        pref.set('family_opt_in', true)
        app.save(pref)
      }
    }
  },
  (app) => {
    try {
      const jCol = app.findCollectionByNameOrId('notification_jobs')
      app.delete(jCol)
    } catch (_) {}
    try {
      const pCol = app.findCollectionByNameOrId('notification_preferences')
      app.delete(pCol)
    } catch (_) {}
  },
)
