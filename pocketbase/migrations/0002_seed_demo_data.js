migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Obter ou criar usuário demo
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'gislaine.sevirino@gmail.com')
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail('gislaine.sevirino@gmail.com')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Gislaine Sevirino')
      app.save(userRecord)
    }

    const userId = userRecord.id

    // Collections
    const medicosCol = app.findCollectionByNameOrId('medicos')
    const medicamentosCol = app.findCollectionByNameOrId('medicamentos')
    const alteracoesCol = app.findCollectionByNameOrId('alteracoes_medicamentos')
    const consultasCol = app.findCollectionByNameOrId('consultas')
    const examesCol = app.findCollectionByNameOrId('exames')
    const documentosCol = app.findCollectionByNameOrId('documentos')

    // Datas relativas a hoje
    const now = new Date()
    const toIsoDate = (d) => d.toISOString().split('T')[0]

    const dMinus60 = new Date(now.getTime() - 60 * 86400000)
    const dMinus45 = new Date(now.getTime() - 45 * 86400000)
    const dMinus30 = new Date(now.getTime() - 30 * 86400000)
    const dMinus20 = new Date(now.getTime() - 20 * 86400000)
    const dMinus10 = new Date(now.getTime() - 10 * 86400000)
    const dMinus5 = new Date(now.getTime() - 5 * 86400000)
    const dPlus3 = new Date(now.getTime() + 3 * 86400000)
    const dPlus10 = new Date(now.getTime() + 10 * 86400000)
    const dPlus25 = new Date(now.getTime() + 25 * 86400000)

    // 2. Médicos (3)
    const medicosData = [
      {
        nome: 'Dra. Ana Beatriz Costa',
        especialidade: 'Cardiologista',
        crm: '123456-SP',
        telefone: '(11) 98765-4321',
        email: 'dra.anabeatriz@exemplo.com.br',
        observacoes: 'Atendimento às terças e quintas no Instituto do Coração.',
      },
      {
        nome: 'Dr. Rafael Oliveira',
        especialidade: 'Clínico Geral',
        crm: '234567-SP',
        telefone: '(11) 97654-3210',
        email: 'dr.rafael@exemplo.com.br',
        observacoes: 'Médico da família de referência para check-up anual.',
      },
      {
        nome: 'Dra. Mariana Santos',
        especialidade: 'Nutricionista',
        crm: 'CRN 345678',
        telefone: '(11) 96543-2109',
        email: 'dra.mariana@exemplo.com.br',
        observacoes: 'Acompanhamento nutricional focado em metabolismo e rotina saudável.',
      },
    ]

    const medicoRecords = {}
    for (const m of medicosData) {
      try {
        medicoRecords[m.nome] = app.findFirstRecordByData('medicos', 'nome', m.nome)
      } catch (_) {
        const rec = new Record(medicosCol)
        rec.set('nome', m.nome)
        rec.set('especialidade', m.especialidade)
        rec.set('crm', m.crm)
        rec.set('telefone', m.telefone)
        rec.set('email', m.email)
        rec.set('observacoes', m.observacoes)
        rec.set('userId', userId)
        app.save(rec)
        medicoRecords[m.nome] = rec
      }
    }

    // 3. Medicamentos (4: um com múltiplos horários, um encerrado com log de alteração)
    const med1Key = 'Losartana Potássica'
    let med1
    try {
      med1 = app.findFirstRecordByData('medicamentos', 'nome', med1Key)
    } catch (_) {
      med1 = new Record(medicamentosCol)
      med1.set('nome', med1Key)
      med1.set('dosagem', '50 mg')
      med1.set('forma', 'comprimido')
      med1.set('laboratorio', 'EMS')
      med1.set('medico', medicoRecords['Dra. Ana Beatriz Costa'].id)
      med1.set('data_inicio', toIsoDate(dMinus60))
      med1.set('horarios', ['08:00', '20:00'])
      med1.set('observacoes', 'Tomar após café da manhã e jantar, com água abundante.')
      med1.set('status', 'ativo')
      med1.set('userId', userId)
      app.save(med1)
    }

    const med2Key = 'Vitamina D3'
    let med2
    try {
      med2 = app.findFirstRecordByData('medicamentos', 'nome', med2Key)
    } catch (_) {
      med2 = new Record(medicamentosCol)
      med2.set('nome', med2Key)
      med2.set('dosagem', '2.000 UI')
      med2.set('forma', 'cápsula')
      med2.set('laboratorio', 'Eurofarma')
      med2.set('medico', medicoRecords['Dr. Rafael Oliveira'].id)
      med2.set('data_inicio', toIsoDate(dMinus45))
      med2.set('horarios', ['12:00'])
      med2.set('observacoes', 'Tomar junto com o almoço para melhor absorção lipossolúvel.')
      med2.set('status', 'ativo')
      med2.set('userId', userId)
      app.save(med2)
    }

    const med3Key = 'Ômega 3 Puro'
    let med3
    try {
      med3 = app.findFirstRecordByData('medicamentos', 'nome', med3Key)
    } catch (_) {
      med3 = new Record(medicamentosCol)
      med3.set('nome', med3Key)
      med3.set('dosagem', '1.000 mg')
      med3.set('forma', 'cápsula')
      med3.set('laboratorio', 'Essential Nutrition')
      med3.set('medico', medicoRecords['Dra. Mariana Santos'].id)
      med3.set('data_inicio', toIsoDate(dMinus30))
      med3.set('horarios', ['09:00', '19:00'])
      med3.set('observacoes', 'Suplementação orientada pela nutricionista.')
      med3.set('status', 'ativo')
      med3.set('userId', userId)
      app.save(med3)
    }

    const med4Key = 'Amoxicilina + Clavulanato'
    let med4
    try {
      med4 = app.findFirstRecordByData('medicamentos', 'nome', med4Key)
    } catch (_) {
      med4 = new Record(medicamentosCol)
      med4.set('nome', med4Key)
      med4.set('dosagem', '875 mg')
      med4.set('forma', 'comprimido')
      med4.set('laboratorio', 'Medley')
      med4.set('medico', medicoRecords['Dr. Rafael Oliveira'].id)
      med4.set('data_inicio', toIsoDate(dMinus20))
      med4.set('data_fim', toIsoDate(dMinus10))
      med4.set('horarios', ['07:00', '19:00'])
      med4.set('observacoes', 'Antibiótico ciclo de 10 dias para infecção de garganta.')
      med4.set('status', 'encerrado')
      med4.set('userId', userId)
      app.save(med4)

      // Registro de alteração / encerramento
      const alt = new Record(alteracoesCol)
      alt.set('medicamento', med4.id)
      alt.set(
        'motivo',
        'Tratamento de 10 dias concluído com sucesso e remissão total dos sintomas.',
      )
      alt.set('data', toIsoDate(dMinus10))
      app.save(alt)
    }

    // 4. Consultas (3: Realizada passada com anotações, Agendada futura, Cancelada)
    try {
      app.findFirstRecordByData('consultas', 'userId', userId)
    } catch (_) {
      // Consulta Realizada (passada)
      const c1 = new Record(consultasCol)
      c1.set('medico', medicoRecords['Dr. Rafael Oliveira'].id)
      c1.set('data', toIsoDate(dMinus10))
      c1.set('horario', '09:30')
      c1.set('tipo', 'Presencial')
      c1.set('local', 'Consultório Jardins - Sala 402')
      c1.set('status', 'Realizada')
      c1.set(
        'anotacoes',
        'Avaliação de rotina com pressão arterial 120x80 mmHg. Queixas de fadiga leve ao final do dia. Solicitados exames de sangue gerais e ultrassom de abdome. Mantida suplementação de Vitamina D.',
      )
      c1.set('userId', userId)
      app.save(c1)

      // Consulta Agendada (futura ~10 dias)
      const c2 = new Record(consultasCol)
      c2.set('medico', medicoRecords['Dra. Ana Beatriz Costa'].id)
      c2.set('data', toIsoDate(dPlus10))
      c2.set('horario', '14:00')
      c2.set('tipo', 'Presencial')
      c2.set('local', 'Instituto do Coração - Bloco B')
      c2.set('status', 'Agendada')
      c2.set(
        'anotacoes',
        'Retorno cardiológico para avaliação de ecocardiograma e ajuste fino da Losartana.',
      )
      c2.set('userId', userId)
      app.save(c2)

      // Consulta Cancelada
      const c3 = new Record(consultasCol)
      c3.set('medico', medicoRecords['Dra. Mariana Santos'].id)
      c3.set('data', toIsoDate(dMinus5))
      c3.set('horario', '11:00')
      c3.set('tipo', 'Teleconsulta')
      c3.set('local', 'Google Meet')
      c3.set('status', 'Cancelada')
      c3.set(
        'anotacoes',
        'Desmarcada a pedido da paciente por conflito de agenda profissional. Reagendamento pendente.',
      )
      c3.set('userId', userId)
      app.save(c3)
    }

    // 5. Exames (3: Solicitado, Em análise, Concluído)
    let ex1, ex2, ex3
    try {
      ex1 = app.findFirstRecordByData('exames', 'nome', 'Ecocardiograma Transtorácico com Doppler')
    } catch (_) {
      ex1 = new Record(examesCol)
      ex1.set('nome', 'Ecocardiograma Transtorácico com Doppler')
      ex1.set('tipo', 'Cardíaco')
      ex1.set('medico', medicoRecords['Dra. Ana Beatriz Costa'].id)
      ex1.set('data_solicitado', toIsoDate(dMinus10))
      ex1.set('status', 'Solicitado')
      ex1.set(
        'observacoes',
        'Pedido emitido pela Dra. Ana Beatriz. Agendar em clínica credenciada até o final da semana.',
      )
      ex1.set('userId', userId)
      app.save(ex1)
    }

    try {
      ex2 = app.findFirstRecordByData('exames', 'nome', 'Hemograma Completo + Perfil Lipídico')
    } catch (_) {
      ex2 = new Record(examesCol)
      ex2.set('nome', 'Hemograma Completo + Perfil Lipídico')
      ex2.set('tipo', 'Sangue')
      ex2.set('medico', medicoRecords['Dr. Rafael Oliveira'].id)
      ex2.set('data_solicitado', toIsoDate(dMinus10))
      ex2.set('data_realizado', toIsoDate(dMinus30 > dMinus5 ? dMinus5 : dMinus5))
      ex2.set('status', 'Em análise')
      ex2.set(
        'observacoes',
        'Coletado no laboratório Fleury. Previsão de liberação dos resultados em 2 dias úteis.',
      )
      ex2.set('userId', userId)
      app.save(ex2)
    }

    try {
      ex3 = app.findFirstRecordByData('exames', 'nome', 'Ultrassonografia de Abdome Total')
    } catch (_) {
      ex3 = new Record(examesCol)
      ex3.set('nome', 'Ultrassonografia de Abdome Total')
      ex3.set('tipo', 'Imagem')
      ex3.set('medico', medicoRecords['Dr. Rafael Oliveira'].id)
      ex3.set('data_solicitado', toIsoDate(dMinus45))
      ex3.set('data_realizado', toIsoDate(dMinus30))
      ex3.set('status', 'Concluído')
      ex3.set(
        'observacoes',
        'Exame sem achados relevantes. Fígado, vesícula e rins com dimensões e aspectos normais.',
      )
      ex3.set('userId', userId)
      app.save(ex3)
    }

    // 6. Documentos avulsos (Receita e Laudo)
    // Notar: documentos têm arquivo obrigatório pela schema, mas se não houver arquivo real uploaded via multi-part no seed,
    // verificamos se documentos já existem. Para evitar falha de validação de arquivo em sementes migrations (file is required in col schema),
    // podemos atualizar a col documentos para arquivo opcional ou deixar os documentos vinculados aos exames serem adicionados no frontend pelo usuário.
  },
  (app) => {
    // rollback opcional
  },
)
