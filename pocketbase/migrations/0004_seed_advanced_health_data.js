migrate(
  (app) => {
    // Buscar Gislaine
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'gislaine.sevirino@gmail.com')
    } catch (_) {
      return
    }

    // 1. Atualizar perfil da Gislaine com alergias, condições e contato de emergência
    userRecord.set(
      'alergias',
      'Penicilina e derivados (urticária e edema de glote leve), Dipirona (náusea e erupção cutânea)',
    )
    userRecord.set(
      'condicoes_saude',
      'Hipertensão Arterial Sistêmica leve (estágio 1 controlada), Hipovitaminose D pregressa',
    )
    userRecord.set('contato_emergencia_nome', 'Carlos Eduardo Sevirino')
    userRecord.set('contato_emergencia_parentesco', 'Cônjuge')
    userRecord.set('contato_emergencia_telefone', '(11) 98111-2233')
    app.save(userRecord)

    const userId = userRecord.id

    // 2. Atualizar medicamentos com novos campos
    const medCol = app.findCollectionByNameOrId('medicamentos')
    const altCol = app.findCollectionByNameOrId('alteracoes_medicamentos')

    try {
      const losartana = app.findFirstRecordByData('medicamentos', 'nome', 'Losartana Potássica')
      losartana.set('principio_ativo', 'Losartana Potássica')
      losartana.set('apresentacao', 'Comprimido revestido')
      losartana.set('concentracao', '50 mg')
      losartana.set('dose_prescrita', '1')
      losartana.set('unidade_dose', 'comprimido')
      losartana.set('via_administracao', 'Oral')
      losartana.set('frequencia', '12 em 12 horas')
      losartana.set(
        'instrucoes_prescricao',
        'Tomar após café da manhã e jantar, com água abundante.',
      )
      losartana.set('tipo_uso', 'contínuo')
      losartana.set('data_prescricao', '2026-08-15')
      losartana.set('status', 'em uso')
      app.save(losartana)

      // Se não houver log de alteração com campos de auditoria, podemos criar um de histórico
      const auditLog = new Record(altCol)
      auditLog.set('medicamento', losartana.id)
      auditLog.set('campo_alterado', 'Dose prescrita')
      auditLog.set('valor_anterior', '25 mg (1x ao dia)')
      auditLog.set('novo_valor', '50 mg (2x ao dia)')
      auditLog.set(
        'motivo',
        'Ajuste de dosagem para controle pressórico em repouso conforme Dra. Ana Beatriz.',
      )
      auditLog.set('usuario_responsavel', 'Gislaine Sevirino (titular)')
      auditLog.set('data', '2026-09-01')
      auditLog.set('data_hora', '2026-09-01T10:30:00Z')
      auditLog.set('userId', userId)
      app.save(auditLog)
    } catch (_) {}

    try {
      const vitD = app.findFirstRecordByData('medicamentos', 'nome', 'Vitamina D3')
      vitD.set('principio_ativo', 'Colecalciferol')
      vitD.set('apresentacao', 'Cápsula gelatinosa mole')
      vitD.set('concentracao', '2.000 UI')
      vitD.set('dose_prescrita', '1')
      vitD.set('unidade_dose', 'cápsula')
      vitD.set('via_administracao', 'Oral')
      vitD.set('frequencia', '1 vez ao dia')
      vitD.set(
        'instrucoes_prescricao',
        'Tomar junto com o almoço para melhor absorção lipossolúvel.',
      )
      vitD.set('tipo_uso', 'contínuo')
      vitD.set('data_prescricao', '2026-08-30')
      vitD.set('status', 'em uso')
      app.save(vitD)
    } catch (_) {}

    try {
      const omega3 = app.findFirstRecordByData('medicamentos', 'nome', 'Ômega 3 Puro')
      omega3.set('principio_ativo', 'Óleo de peixe concentrado (EPA/DHA)')
      omega3.set('apresentacao', 'Cápsula')
      omega3.set('concentracao', '1.000 mg')
      omega3.set('dose_prescrita', '2')
      omega3.set('unidade_dose', 'cápsulas')
      omega3.set('via_administracao', 'Oral')
      omega3.set('frequencia', '2 vezes ao dia')
      omega3.set(
        'instrucoes_prescricao',
        'Suplementação orientada pela nutricionista, tomar às 09:00 e 19:00.',
      )
      omega3.set('tipo_uso', 'contínuo')
      omega3.set('data_prescricao', '2026-09-14')
      omega3.set('status', 'em uso')
      app.save(omega3)
    } catch (_) {}

    // 3. Atualizar consulta com dados estruturados de pós-consulta
    try {
      const consultas = app.findRecordsByFilter(
        'consultas',
        `userId = "${userId}" && status = "Realizada"`,
        '-created',
        1,
        0,
      )
      if (consultas && consultas.length > 0) {
        const c1 = consultas[0]
        c1.set(
          'motivo_atendimento',
          'Check-up semestral de rotina e controle de fadiga pós-trabalho.',
        )
        c1.set(
          'sintomas_relatados',
          'Cansaço persistente no final da tarde, cefaleia tensional leve ocasional.',
        )
        c1.set(
          'perguntas_preparadas',
          'Devo manter a dose de vitamina D? Preciso repetir ultrassom abdominal este ano?',
        )
        c1.set(
          'assuntos_tratados',
          'Pressão arterial aferida em 120x80 mmHg. Discussão dos hábitos de sono e hidratação. Ajuste fino da rotina de suplementação.',
        )
        c1.set(
          'resumo_orientacoes',
          'Manter caminhadas diárias de 30 min. Ingerir no mínimo 2L de água por dia. Retornar com os novos exames de sangue.',
        )
        c1.set(
          'alteracoes_medicamentos_relacionadas',
          'Manutenção da Losartana 50mg e continuidade da Vitamina D3.',
        )
        c1.set(
          'exames_solicitados_relacionados',
          'Hemograma Completo, Perfil Lipídico e Ultrassonografia de Abdome Total.',
        )
        c1.set('encaminhamentos', 'Manter acompanhamento nutricional com a Dra. Mariana.')
        c1.set(
          'proximos_passos',
          'Agendar coleta de sangue em jejum de 12 horas e retorno em 30 dias.',
        )
        c1.set('data_prevista_retorno', '2026-11-15')
        c1.set('data_registro_notas', '2026-10-04')
        app.save(c1)
      }
    } catch (_) {}

    // 4. Atualizar exames com categorias, locais, preparos e histórico de status
    try {
      const ex1 = app.findFirstRecordByData(
        'exames',
        'nome',
        'Ecocardiograma Transtorácico com Doppler',
      )
      ex1.set('categoria', 'Cardiológico')
      ex1.set('local_realizacao', 'Instituto do Coração - Bloco Central')
      ex1.set('instrucoes_preparo', 'Não exige jejum. Trazer exames cardiológicos anteriores.')
      ex1.set('data_validade', '2027-04-04')
      ex1.set('status', 'Pendente')
      ex1.set('historico_status', [
        {
          status: 'Pendente',
          data: '2026-10-04T09:00:00Z',
          observacao: 'Pedido médico cadastrado',
        },
      ])
      app.save(ex1)
    } catch (_) {}

    try {
      const ex2 = app.findFirstRecordByData(
        'exames',
        'nome',
        'Hemograma Completo + Perfil Lipídico',
      )
      ex2.set('categoria', 'Laboratorial (Sangue)')
      ex2.set('local_realizacao', 'Laboratório Fleury - Unidade Jardins')
      ex2.set('data_hora_agendada', '2026-10-09 07:30')
      ex2.set(
        'instrucoes_preparo',
        'Jejum obrigatório de 12 horas. Evitar esforço físico intenso na véspera.',
      )
      ex2.set('data_disponibilizacao_resultado', '2026-10-16')
      ex2.set('status', 'Realizado')
      ex2.set('historico_status', [
        { status: 'Pendente', data: '2026-10-04T09:00:00Z', observacao: 'Pedido solicitado' },
        {
          status: 'Agendado',
          data: '2026-10-05T14:00:00Z',
          observacao: 'Agendado para 09/10 às 07:30 no Fleury',
        },
        {
          status: 'Realizado',
          data: '2026-10-09T08:15:00Z',
          observacao: 'Coleta de sangue realizada com sucesso. Aguardando resultado.',
        },
      ])
      app.save(ex2)
    } catch (_) {}

    try {
      const ex3 = app.findFirstRecordByData('exames', 'nome', 'Ultrassonografia de Abdome Total')
      ex3.set('categoria', 'Imagem')
      ex3.set('local_realizacao', 'Centro Diagnóstico Albert Einstein')
      ex3.set(
        'instrucoes_preparo',
        'Jejum de 8 horas e bexiga cheia (beber 4 copos de água 1h antes).',
      )
      ex3.set('data_disponibilizacao_resultado', '2026-09-15')
      ex3.set('status', 'Finalizado')
      ex3.set('historico_status', [
        { status: 'Pendente', data: '2026-08-30T10:00:00Z', observacao: 'Pedido emitido' },
        { status: 'Agendado', data: '2026-09-05T11:00:00Z', observacao: 'Agendado no Einstein' },
        {
          status: 'Realizado',
          data: '2026-09-14T09:00:00Z',
          observacao: 'Exame de ultrassom realizado',
        },
        {
          status: 'Finalizado',
          data: '2026-09-15T15:00:00Z',
          observacao: 'Laudo médico recebido e conferido',
        },
      ])
      app.save(ex3)
    } catch (_) {}
  },
  (app) => {},
)
