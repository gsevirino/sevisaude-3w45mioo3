migrate(
  (app) => {
    // 1. medicos
    const medicos = new Collection({
      name: 'medicos',
      type: 'base',
      listRule: "@request.auth.id != '' && userId = @request.auth.id",
      viewRule: "@request.auth.id != '' && userId = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && userId = @request.auth.id",
      deleteRule: "@request.auth.id != '' && userId = @request.auth.id",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'especialidade', type: 'text', required: true },
        { name: 'crm', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'observacoes', type: 'text' },
        { name: 'userId', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_medicos_userId ON medicos (userId)',
        'CREATE INDEX idx_medicos_especialidade ON medicos (especialidade)',
      ],
    })
    app.save(medicos)
    const medicosCol = app.findCollectionByNameOrId('medicos')

    // 2. medicamentos
    const medicamentos = new Collection({
      name: 'medicamentos',
      type: 'base',
      listRule: "@request.auth.id != '' && userId = @request.auth.id",
      viewRule: "@request.auth.id != '' && userId = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && userId = @request.auth.id",
      deleteRule: "@request.auth.id != '' && userId = @request.auth.id",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'dosagem', type: 'text', required: true },
        {
          name: 'forma',
          type: 'select',
          required: true,
          values: ['comprimido', 'cápsula', 'xarope', 'solução', 'injetável', 'creme', 'outro'],
          maxSelect: 1,
        },
        { name: 'laboratorio', type: 'text' },
        {
          name: 'medico',
          type: 'relation',
          collectionId: medicosCol.id,
          maxSelect: 1,
        },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'data_fim', type: 'date' },
        { name: 'horarios', type: 'json' },
        { name: 'observacoes', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['ativo', 'encerrado'],
          maxSelect: 1,
        },
        { name: 'userId', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_medicamentos_userId ON medicamentos (userId)',
        'CREATE INDEX idx_medicamentos_status ON medicamentos (status)',
        'CREATE INDEX idx_medicamentos_data_inicio ON medicamentos (data_inicio)',
      ],
    })
    app.save(medicamentos)
    const medicamentosCol = app.findCollectionByNameOrId('medicamentos')

    // 3. alteracoes_medicamentos
    const alteracoes = new Collection({
      name: 'alteracoes_medicamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'medicamento',
          type: 'relation',
          collectionId: medicamentosCol.id,
          required: true,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'motivo', type: 'text', required: true },
        { name: 'data', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_alteracoes_medicamento ON alteracoes_medicamentos (medicamento)'],
    })
    app.save(alteracoes)

    // 4. consultas
    const consultas = new Collection({
      name: 'consultas',
      type: 'base',
      listRule: "@request.auth.id != '' && userId = @request.auth.id",
      viewRule: "@request.auth.id != '' && userId = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && userId = @request.auth.id",
      deleteRule: "@request.auth.id != '' && userId = @request.auth.id",
      fields: [
        {
          name: 'medico',
          type: 'relation',
          collectionId: medicosCol.id,
          required: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        { name: 'horario', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['Presencial', 'Teleconsulta', 'Domiciliar'],
          maxSelect: 1,
        },
        { name: 'local', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Agendada', 'Realizada', 'Cancelada'],
          maxSelect: 1,
        },
        { name: 'anotacoes', type: 'text' },
        { name: 'userId', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_consultas_userId ON consultas (userId)',
        'CREATE INDEX idx_consultas_data ON consultas (data)',
        'CREATE INDEX idx_consultas_status ON consultas (status)',
      ],
    })
    app.save(consultas)

    // 5. exames
    const exames = new Collection({
      name: 'exames',
      type: 'base',
      listRule: "@request.auth.id != '' && userId = @request.auth.id",
      viewRule: "@request.auth.id != '' && userId = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && userId = @request.auth.id",
      deleteRule: "@request.auth.id != '' && userId = @request.auth.id",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['Sangue', 'Imagem', 'Urina', 'Fezes', 'Cardíaco', 'Preventivo', 'Outro'],
          maxSelect: 1,
        },
        {
          name: 'medico',
          type: 'relation',
          collectionId: medicosCol.id,
          required: true,
          maxSelect: 1,
        },
        { name: 'data_solicitado', type: 'date', required: true },
        { name: 'data_realizado', type: 'date' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Solicitado', 'Em análise', 'Concluído'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text' },
        {
          name: 'pedido_arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        },
        {
          name: 'resultado_arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        },
        { name: 'userId', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_exames_userId ON exames (userId)',
        'CREATE INDEX idx_exames_status ON exames (status)',
        'CREATE INDEX idx_exames_data_solicitado ON exames (data_solicitado)',
        'CREATE INDEX idx_exames_data_realizado ON exames (data_realizado)',
      ],
    })
    app.save(exames)
    const examesCol = app.findCollectionByNameOrId('exames')

    // 6. documentos
    const documentos = new Collection({
      name: 'documentos',
      type: 'base',
      listRule: "@request.auth.id != '' && userId = @request.auth.id",
      viewRule: "@request.auth.id != '' && userId = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && userId = @request.auth.id",
      deleteRule: "@request.auth.id != '' && userId = @request.auth.id",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['Exame — Pedido', 'Exame — Resultado', 'Receita', 'Laudo', 'Atestado', 'Outro'],
          maxSelect: 1,
        },
        {
          name: 'exame_ref',
          type: 'relation',
          collectionId: examesCol.id,
          maxSelect: 1,
        },
        {
          name: 'arquivo',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        },
        { name: 'userId', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_documentos_userId ON documentos (userId)',
        'CREATE INDEX idx_documentos_categoria ON documentos (categoria)',
      ],
    })
    app.save(documentos)
  },
  (app) => {
    const collections = [
      'documentos',
      'exames',
      'consultas',
      'alteracoes_medicamentos',
      'medicamentos',
      'medicos',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
