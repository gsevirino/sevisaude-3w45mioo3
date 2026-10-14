migrate(
  (app) => {
    // 1. Atualizar coleção 'users' com novos campos de prontuário e emergência
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('alergias')) {
      usersCol.fields.add(new TextField({ name: 'alergias' }))
    }
    if (!usersCol.fields.getByName('condicoes_saude')) {
      usersCol.fields.add(new TextField({ name: 'condicoes_saude' }))
    }
    if (!usersCol.fields.getByName('contato_emergencia_nome')) {
      usersCol.fields.add(new TextField({ name: 'contato_emergencia_nome' }))
    }
    if (!usersCol.fields.getByName('contato_emergencia_telefone')) {
      usersCol.fields.add(new TextField({ name: 'contato_emergencia_telefone' }))
    }
    if (!usersCol.fields.getByName('contato_emergencia_parentesco')) {
      usersCol.fields.add(new TextField({ name: 'contato_emergencia_parentesco' }))
    }
    if (!usersCol.fields.getByName('meta')) {
      usersCol.fields.add(new JSONField({ name: 'meta' }))
    }
    app.save(usersCol)

    // 2. Atualizar coleção 'medicamentos'
    const medCol = app.findCollectionByNameOrId('medicamentos')
    // Atualizar select status: em uso, pausado, suspenso, concluído
    const statusMedField = medCol.fields.getByName('status')
    if (statusMedField) {
      statusMedField.values = ['em uso', 'pausado', 'suspenso', 'concluído', 'ativo', 'encerrado']
      statusMedField.maxSelect = 1
    }
    if (!medCol.fields.getByName('principio_ativo')) {
      medCol.fields.add(new TextField({ name: 'principio_ativo' }))
    }
    if (!medCol.fields.getByName('apresentacao')) {
      medCol.fields.add(new TextField({ name: 'apresentacao' }))
    }
    if (!medCol.fields.getByName('concentracao')) {
      medCol.fields.add(new TextField({ name: 'concentracao' }))
    }
    if (!medCol.fields.getByName('dose_prescrita')) {
      medCol.fields.add(new TextField({ name: 'dose_prescrita' }))
    }
    if (!medCol.fields.getByName('unidade_dose')) {
      medCol.fields.add(new TextField({ name: 'unidade_dose' }))
    }
    if (!medCol.fields.getByName('via_administracao')) {
      medCol.fields.add(new TextField({ name: 'via_administracao' }))
    }
    if (!medCol.fields.getByName('frequencia')) {
      medCol.fields.add(new TextField({ name: 'frequencia' }))
    }
    if (!medCol.fields.getByName('instrucoes_prescricao')) {
      medCol.fields.add(new TextField({ name: 'instrucoes_prescricao' }))
    }
    if (!medCol.fields.getByName('tipo_uso')) {
      medCol.fields.add(
        new SelectField({
          name: 'tipo_uso',
          values: ['contínuo', 'temporário'],
          maxSelect: 1,
        }),
      )
    }
    if (!medCol.fields.getByName('data_prescricao')) {
      medCol.fields.add(new DateField({ name: 'data_prescricao' }))
    }
    if (!medCol.fields.getByName('receita_arquivo')) {
      medCol.fields.add(
        new FileField({
          name: 'receita_arquivo',
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
        }),
      )
    }
    // Fazer 'dosagem' opcional se estiver como required
    const dosagemField = medCol.fields.getByName('dosagem')
    if (dosagemField) dosagemField.required = false
    const formaField = medCol.fields.getByName('forma')
    if (formaField) formaField.required = false
    const dataInicioField = medCol.fields.getByName('data_inicio')
    if (dataInicioField) dataInicioField.required = false

    app.save(medCol)

    // Migrar dados legados de status em medicamentos: 'ativo' -> 'em uso', 'encerrado' -> 'concluído'
    app.db().newQuery("UPDATE medicamentos SET status = 'em uso' WHERE status = 'ativo'").execute()
    app
      .db()
      .newQuery("UPDATE medicamentos SET status = 'concluído' WHERE status = 'encerrado'")
      .execute()

    // 3. Atualizar 'alteracoes_medicamentos' para auditoria imutável detalhada
    const altCol = app.findCollectionByNameOrId('alteracoes_medicamentos')
    if (!altCol.fields.getByName('campo_alterado')) {
      altCol.fields.add(new TextField({ name: 'campo_alterado' }))
    }
    if (!altCol.fields.getByName('valor_anterior')) {
      altCol.fields.add(new TextField({ name: 'valor_anterior' }))
    }
    if (!altCol.fields.getByName('novo_valor')) {
      altCol.fields.add(new TextField({ name: 'novo_valor' }))
    }
    if (!altCol.fields.getByName('usuario_responsavel')) {
      altCol.fields.add(new TextField({ name: 'usuario_responsavel' }))
    }
    if (!altCol.fields.getByName('data_hora')) {
      altCol.fields.add(new TextField({ name: 'data_hora' }))
    }
    if (!altCol.fields.getByName('userId')) {
      altCol.fields.add(new TextField({ name: 'userId' }))
    }
    app.save(altCol)

    // 4. Atualizar 'consultas' com campos estruturados pós-consulta e vínculos
    const consultasCol = app.findCollectionByNameOrId('consultas')
    if (!consultasCol.fields.getByName('motivo_atendimento')) {
      consultasCol.fields.add(new TextField({ name: 'motivo_atendimento' }))
    }
    if (!consultasCol.fields.getByName('sintomas_relatados')) {
      consultasCol.fields.add(new TextField({ name: 'sintomas_relatados' }))
    }
    if (!consultasCol.fields.getByName('perguntas_preparadas')) {
      consultasCol.fields.add(new TextField({ name: 'perguntas_preparadas' }))
    }
    if (!consultasCol.fields.getByName('assuntos_tratados')) {
      consultasCol.fields.add(new TextField({ name: 'assuntos_tratados' }))
    }
    if (!consultasCol.fields.getByName('resumo_orientacoes')) {
      consultasCol.fields.add(new TextField({ name: 'resumo_orientacoes' }))
    }
    if (!consultasCol.fields.getByName('alteracoes_medicamentos_relacionadas')) {
      consultasCol.fields.add(new TextField({ name: 'alteracoes_medicamentos_relacionadas' }))
    }
    if (!consultasCol.fields.getByName('exames_solicitados_relacionados')) {
      consultasCol.fields.add(new TextField({ name: 'exames_solicitados_relacionados' }))
    }
    if (!consultasCol.fields.getByName('encaminhamentos')) {
      consultasCol.fields.add(new TextField({ name: 'encaminhamentos' }))
    }
    if (!consultasCol.fields.getByName('proximos_passos')) {
      consultasCol.fields.add(new TextField({ name: 'proximos_passos' }))
    }
    if (!consultasCol.fields.getByName('data_prevista_retorno')) {
      consultasCol.fields.add(new DateField({ name: 'data_prevista_retorno' }))
    }
    if (!consultasCol.fields.getByName('data_registro_notas')) {
      consultasCol.fields.add(new TextField({ name: 'data_registro_notas' }))
    }
    if (!consultasCol.fields.getByName('anexos')) {
      consultasCol.fields.add(
        new FileField({
          name: 'anexos',
          maxSelect: 10,
          maxSize: 10485760,
          mimeTypes: [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        }),
      )
    }
    if (!consultasCol.fields.getByName('medicamentos_relacionados_ids')) {
      consultasCol.fields.add(new JSONField({ name: 'medicamentos_relacionados_ids' }))
    }
    if (!consultasCol.fields.getByName('exames_relacionados_ids')) {
      consultasCol.fields.add(new JSONField({ name: 'exames_relacionados_ids' }))
    }
    app.save(consultasCol)

    // 5. Atualizar 'exames' com 5 estados, múltiplos anexos e campos avançados
    const examesCol = app.findCollectionByNameOrId('exames')
    const statusExameField = examesCol.fields.getByName('status')
    if (statusExameField) {
      statusExameField.values = [
        'Pendente',
        'Agendado',
        'Realizado',
        'Finalizado',
        'Cancelado',
        'Solicitado',
        'Em análise',
        'Concluído',
      ]
      statusExameField.maxSelect = 1
    }
    if (!examesCol.fields.getByName('categoria')) {
      examesCol.fields.add(new TextField({ name: 'categoria' }))
    }
    if (!examesCol.fields.getByName('data_validade')) {
      examesCol.fields.add(new DateField({ name: 'data_validade' }))
    }
    if (!examesCol.fields.getByName('local_realizacao')) {
      examesCol.fields.add(new TextField({ name: 'local_realizacao' }))
    }
    if (!examesCol.fields.getByName('data_hora_agendada')) {
      examesCol.fields.add(new TextField({ name: 'data_hora_agendada' }))
    }
    if (!examesCol.fields.getByName('instrucoes_preparo')) {
      examesCol.fields.add(new TextField({ name: 'instrucoes_preparo' }))
    }
    if (!examesCol.fields.getByName('data_disponibilizacao_resultado')) {
      examesCol.fields.add(new DateField({ name: 'data_disponibilizacao_resultado' }))
    }
    if (!examesCol.fields.getByName('consulta_relacionada')) {
      examesCol.fields.add(
        new RelationField({
          name: 'consulta_relacionada',
          collectionId: consultasCol.id,
          maxSelect: 1,
        }),
      )
    }
    if (!examesCol.fields.getByName('pedidos_arquivos')) {
      examesCol.fields.add(
        new FileField({
          name: 'pedidos_arquivos',
          maxSelect: 10,
          maxSize: 10485760,
          mimeTypes: [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        }),
      )
    }
    if (!examesCol.fields.getByName('resultados_arquivos')) {
      examesCol.fields.add(
        new FileField({
          name: 'resultados_arquivos',
          maxSelect: 10,
          maxSize: 10485760,
          mimeTypes: [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        }),
      )
    }
    if (!examesCol.fields.getByName('historico_status')) {
      examesCol.fields.add(new JSONField({ name: 'historico_status' }))
    }
    app.save(examesCol)

    // Migrar dados legados de status em exames:
    // 'Solicitado' -> 'Pendente'
    // 'Em análise' -> 'Realizado'
    // 'Concluído' -> 'Finalizado'
    app.db().newQuery("UPDATE exames SET status = 'Pendente' WHERE status = 'Solicitado'").execute()
    app
      .db()
      .newQuery("UPDATE exames SET status = 'Realizado' WHERE status = 'Em análise'")
      .execute()
    app
      .db()
      .newQuery("UPDATE exames SET status = 'Finalizado' WHERE status = 'Concluído'")
      .execute()
  },
  (app) => {
    // down migration
  },
)
