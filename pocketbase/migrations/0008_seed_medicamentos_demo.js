migrate(
  (app) => {
    const medsCol = app.findCollectionByNameOrId('medicamentos')
    const profCol = app.findCollectionByNameOrId('health_profiles')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Obter a conta de Gislaine
    let gislaine
    try {
      gislaine = app.findAuthRecordByEmail('_pb_users_auth_', 'gislaine.sevirino@gmail.com')
    } catch (_) {
      return
    }

    // 2. Obter perfil titular da Gislaine
    let gislaineProf
    try {
      gislaineProf = app.findFirstRecordByFilter(
        'health_profiles',
        `user = "${gislaine.id}" && is_proprio = true`,
      )
    } catch (_) {
      // Se não existir, criar titular próprio
      gislaineProf = new Record(profCol)
      gislaineProf.set('user', gislaine.id)
      gislaineProf.set('nome', 'Gislaine Sevirino')
      gislaineProf.set('parentesco', 'titular')
      gislaineProf.set('is_proprio', true)
      app.save(gislaineProf)
    }

    // 3. Garantir backfill de profile em qualquer registro recente que esteja sem profile
    const targetCollections = [
      'medicos',
      'medicamentos',
      'consultas',
      'exames',
      'documentos',
      'alteracoes_medicamentos',
    ]

    for (const colName of targetCollections) {
      try {
        app
          .db()
          .newQuery(
            `UPDATE ${colName} SET profile = {:pId} WHERE userId = {:uId} AND (profile IS NULL OR profile = '')`,
          )
          .bind({ pId: gislaineProf.id, uId: gislaine.id })
          .execute()
      } catch (err) {
        console.log(`Aviso ao atualizar profile na coleção ${colName}:`, err)
      }
    }

    // 4. Verificar se a Gislaine já possui medicamentos cadastrados
    const existingMeds = app.findRecordsByFilter(
      'medicamentos',
      `userId = "${gislaine.id}"`,
      'created',
      1,
      0,
    )
    if (existingMeds && existingMeds.length > 0) {
      // Se já possui medicamentos (ex.: Fluvoxamina e Vortioxetina criados manualmente pelo usuário), não duplicar
      return
    }

    // 5. Obter médico para relacionar aos medicamentos de demonstração
    let medicoId = ''
    try {
      const med = app.findFirstRecordByFilter('medicos', `userId = "${gislaine.id}"`)
      medicoId = med.id
    } catch (_) {}

    // Valores permitidos de forma: comprimido | cápsula | xarope | solução | injetável | creme | outro
    // Valores permitidos de status: em uso | pausado | suspenso | concluído | ativo | encerrado
    // Valores permitidos de tipo_uso: contínuo | temporário

    // Medicamento 1: Losartana Potássica
    const med1 = new Record(medsCol)
    med1.set('nome', 'Losartana Potássica')
    med1.set('dosagem', '50 mg')
    med1.set('forma', 'comprimido')
    med1.set('tipo_uso', 'contínuo')
    med1.set('horarios', ['08:00'])
    med1.set('status', 'em uso')
    med1.set('data_inicio', '2026-01-15')
    med1.set('instrucoes_prescricao', 'Tomar 1 comprimido pela manhã em jejum com água.')
    med1.set('observacoes', 'Controle da hipertensão arterial leve.')
    med1.set('userId', gislaine.id)
    med1.set('profile', gislaineProf.id)
    if (medicoId) med1.set('medico', medicoId)
    app.save(med1)

    // Medicamento 2: Colecalciferol (Vitamina D3)
    const med2 = new Record(medsCol)
    med2.set('nome', 'Colecalciferol (Vitamina D3)')
    med2.set('dosagem', '50.000 UI')
    med2.set('forma', 'cápsula')
    med2.set('tipo_uso', 'temporário')
    med2.set('horarios', ['10:00'])
    med2.set('status', 'em uso')
    med2.set('data_inicio', '2026-09-01')
    med2.set('data_fim', '2026-12-01')
    med2.set('instrucoes_prescricao', 'Tomar 1 cápsula semanalmente após o café da manhã.')
    med2.set('observacoes', 'Suplementação para correção de insuficiência sérica.')
    med2.set('userId', gislaine.id)
    med2.set('profile', gislaineProf.id)
    if (medicoId) med2.set('medico', medicoId)
    app.save(med2)

    // Medicamento 3: Amoxicilina + Clavulanato (concluído)
    const med3 = new Record(medsCol)
    med3.set('nome', 'Amoxicilina + Clavulanato de Potássio')
    med3.set('dosagem', '875 mg + 125 mg')
    med3.set('forma', 'comprimido')
    med3.set('tipo_uso', 'temporário')
    med3.set('horarios', ['08:00', '20:00'])
    med3.set('status', 'concluído')
    med3.set('data_inicio', '2026-07-10')
    med3.set('data_fim', '2026-07-20')
    med3.set('instrucoes_prescricao', 'Tratamento de 10 dias de 12 em 12 horas.')
    med3.set('observacoes', 'Tratamento de infecção de vias aéreas superiores.')
    med3.set('userId', gislaine.id)
    med3.set('profile', gislaineProf.id)
    if (medicoId) med3.set('medico', medicoId)
    app.save(med3)
  },
  (app) => {},
)
