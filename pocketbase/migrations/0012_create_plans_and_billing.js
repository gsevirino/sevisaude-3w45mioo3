migrate(
  (app) => {
    // 1. Coleção app_settings
    // Configurações globais do sistema gerenciadas pela dona (chave PIX, dados para transferência, etc.)
    const appSettings = new Collection({
      name: 'app_settings',
      type: 'base',
      listRule: '', // Leitura pública para obter a chave PIX nas telas de pagamento
      viewRule: '',
      createRule: "@request.auth.id != '' && @request.auth.email = 'gislaine.sevirino@gmail.com'",
      updateRule: "@request.auth.id != '' && @request.auth.email = 'gislaine.sevirino@gmail.com'",
      deleteRule: "@request.auth.id != '' && @request.auth.email = 'gislaine.sevirino@gmail.com'",
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'value', type: 'text' },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_app_settings_key ON app_settings (key)'],
    })
    app.save(appSettings)

    // Inserir chave PIX inicial configurável (se não cadastrada, value vazio ou placeholder)
    const settingsCol = app.findCollectionByNameOrId('app_settings')
    try {
      const pixSetting = new Record(settingsCol)
      pixSetting.set('key', 'pix_key')
      pixSetting.set('value', 'gislaine.sevirino@gmail.com')
      pixSetting.set(
        'description',
        'Chave PIX da proprietária do SeviSaúde (E-mail/Telefone/CNPJ/Aleatória)',
      )
      app.save(pixSetting)
    } catch (_) {}

    try {
      const pixNameSetting = new Record(settingsCol)
      pixNameSetting.set('key', 'pix_beneficiary_name')
      pixNameSetting.set('value', 'Gislaine Sevirino')
      pixNameSetting.set('description', 'Nome do beneficiário cadastrado no banco para conferência')
      app.save(pixNameSetting)
    } catch (_) {}

    // 2. Coleção subscriptions
    // Uma assinatura por usuário/conta
    // planos: 'essencial', 'completo', 'familia'
    // status: 'trial', 'ativa', 'pendente', 'cancelada', 'expirada'
    const subscriptions = new Collection({
      name: 'subscriptions',
      type: 'base',
      // Usuário vê sua própria assinatura; a dona pode listar/ver todas para gerenciar
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')",
      // Criação via autenticado para si mesmo ou dona
      createRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')",
      // Atualização: o próprio dono pode atualizar (validado também via hooks/backend) ou a dona
      updateRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')",
      deleteRule: "@request.auth.id != '' && @request.auth.email = 'gislaine.sevirino@gmail.com'",
      fields: [
        {
          name: 'user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'plano',
          type: 'select',
          required: true,
          values: ['essencial', 'completo', 'familia'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['trial', 'ativa', 'pendente', 'cancelada', 'expirada'],
          maxSelect: 1,
        },
        { name: 'data_inicio', type: 'date' },
        { name: 'data_fim', type: 'date' },
        { name: 'trial_ends_at', type: 'date' },
        { name: 'is_cortesia', type: 'bool' },
        { name: 'data_cortesia_ate', type: 'date' },
        { name: 'notas_admin', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_subscriptions_user ON subscriptions (user)',
        'CREATE INDEX idx_subscriptions_status ON subscriptions (status)',
        'CREATE INDEX idx_subscriptions_plano ON subscriptions (plano)',
      ],
    })
    app.save(subscriptions)

    // 3. Coleção payments
    // Registros de pagamentos PIX manuais informados pelos usuários e validados pela dona
    const payments = new Collection({
      name: 'payments',
      type: 'base',
      // Usuário vê seus pagamentos; dona vê todos para poder confirmar
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')",
      // Usuário cria com status inicial aguardando
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      // Apenas a dona pode atualizar status e dados de confirmação
      updateRule: "@request.auth.id != '' && @request.auth.email = 'gislaine.sevirino@gmail.com'",
      deleteRule: "@request.auth.id != '' && @request.auth.email = 'gislaine.sevirino@gmail.com'",
      fields: [
        {
          name: 'user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
        },
        {
          name: 'plano',
          type: 'select',
          required: true,
          values: ['essencial', 'completo', 'familia'],
          maxSelect: 1,
        },
        { name: 'valor', type: 'number', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aguardando', 'confirmado', 'recusado'],
          maxSelect: 1,
        },
        { name: 'referencia', type: 'text' }, // Código do PIX, ID da transação ou nome no comprovante
        {
          name: 'comprovante',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        },
        { name: 'data_pagamento', type: 'date' },
        { name: 'data_confirmacao', type: 'date' },
        { name: 'confirmado_por', type: 'text' },
        { name: 'notas_recusa', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_payments_user ON payments (user)',
        'CREATE INDEX idx_payments_status ON payments (status)',
        'CREATE INDEX idx_payments_created ON payments (created)',
      ],
    })
    app.save(payments)

    // 4. Backfill para contas existentes: Gislaine e Maria
    const subCol = app.findCollectionByNameOrId('subscriptions')
    const allUsers = app.findRecordsByFilter('_pb_users_auth_', "id != ''", 'created', 1000, 0)

    for (const u of allUsers) {
      try {
        app.findFirstRecordByFilter('subscriptions', `user = "${u.id}"`)
      } catch (_) {
        const sub = new Record(subCol)
        sub.set('user', u.id)

        const userEmail = u.getString('email').toLowerCase().trim()
        const isGislaine = userEmail === 'gislaine.sevirino@gmail.com'

        if (isGislaine) {
          // Gislaine é a proprietária/admin: Sevi Família Cortesia com validade estendida até 2099
          sub.set('plano', 'familia')
          sub.set('status', 'ativa')
          sub.set('is_cortesia', true)
          sub.set('data_inicio', '2025-01-01')
          sub.set('data_fim', '2099-12-31')
          sub.set('data_cortesia_ate', '2099-12-31')
          sub.set('notas_admin', 'Proprietária e administradora do SeviSaúde')
        } else {
          // Usuários existentes e Maria: trial Essencial de 30 dias a partir da criação
          sub.set('plano', 'essencial')
          sub.set('status', 'trial')
          sub.set('is_cortesia', false)

          const createdDate = u.getString('created') || new Date().toISOString()
          const createdTimestamp = new Date(createdDate).getTime()
          const trialEnd = new Date(createdTimestamp + 30 * 24 * 60 * 60 * 1000)

          const now = new Date().getTime()
          if (now > trialEnd.getTime()) {
            // Se já se passaram mais de 30 dias desde a criação antiga, dar 30 dias a partir de hoje para teste
            const freshTrialEnd = new Date(now + 30 * 24 * 60 * 60 * 1000)
            sub.set('data_inicio', new Date().toISOString().split('T')[0])
            sub.set('trial_ends_at', freshTrialEnd.toISOString().split('T')[0])
            sub.set('data_fim', freshTrialEnd.toISOString().split('T')[0])
          } else {
            sub.set('data_inicio', createdDate.split('T')[0])
            sub.set('trial_ends_at', trialEnd.toISOString().split('T')[0])
            sub.set('data_fim', trialEnd.toISOString().split('T')[0])
          }
        }
        app.save(sub)
      }
    }
  },
  (app) => {
    try {
      const pCol = app.findCollectionByNameOrId('payments')
      app.delete(pCol)
    } catch (_) {}
    try {
      const sCol = app.findCollectionByNameOrId('subscriptions')
      app.delete(sCol)
    } catch (_) {}
    try {
      const setCol = app.findCollectionByNameOrId('app_settings')
      app.delete(setCol)
    } catch (_) {}
  },
)
