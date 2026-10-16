migrate(
  (app) => {
    // 0018_create_ocr_logs.js
    // Coleção para auditoria e controle de cota de leitura OCR por usuário / mês
    const ocrLogs = new Collection({
      name: 'ocr_logs',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && @request.auth.email = 'gislaine.sevirino@gmail.com'",
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
          name: 'profile',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('health_profiles').id,
          maxSelect: 1,
        },
        { name: 'mes_ano', type: 'text', required: true }, // ex: "2026-10"
        { name: 'tipo_documento', type: 'text' }, // receita, pedido, laudo, etc.
        { name: 'arquivo_nome', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['sucesso', 'falha'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ocr_logs_user ON ocr_logs (user)',
        'CREATE INDEX idx_ocr_logs_user_mes ON ocr_logs (user, mes_ano)',
      ],
    })
    app.save(ocrLogs)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('ocr_logs')
      app.delete(col)
    } catch (_) {}
  },
)
