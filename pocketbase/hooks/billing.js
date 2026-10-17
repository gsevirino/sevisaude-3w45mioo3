// pocketbase/hooks/billing.js
// SeviSaúde: Regras de Negócio de Planos, Assinaturas e Limites no Backend (PocketBase v0.36)
// NOTA IMPORTANTE JSVM: Em PocketBase JSVM (goja), callbacks rodam em VM isolada.
// Todas as funções auxiliares e constantes DEVEM ser declaradas dentro do escopo de cada callback.

// -------------------------------------------------------------
// 0. Bootstrap idempotente: Garante configurações oficiais (Chave PIX)
// -------------------------------------------------------------
onBootstrap((e) => {
  e.next()
  try {
    const OFFICIAL_PIX_KEY = '0545b7e1-6a4b-442e-a6f6-d2b1721b6340'
    const app = e.app || $app

    let keyRec
    try {
      keyRec = app.findFirstRecordByData('app_settings', 'key', 'pix_key')
    } catch (_) {
      try {
        keyRec = app.findFirstRecordByFilter('app_settings', 'key = "pix_key"')
      } catch (_) {}
    }

    if (keyRec) {
      if (keyRec.getString('value') !== OFFICIAL_PIX_KEY) {
        keyRec.set('value', OFFICIAL_PIX_KEY)
        keyRec.set('description', 'Chave PIX da proprietária do SeviSaúde (Chave Aleatória UUID)')
        app.save(keyRec)
      }
    } else {
      const settingsCol = app.findCollectionByNameOrId('app_settings')
      const newRec = new Record(settingsCol)
      newRec.set('key', 'pix_key')
      newRec.set('value', OFFICIAL_PIX_KEY)
      newRec.set('description', 'Chave PIX da proprietária do SeviSaúde (Chave Aleatória UUID)')
      app.save(newRec)
    }

    let benRec
    try {
      benRec = app.findFirstRecordByData('app_settings', 'key', 'pix_beneficiary_name')
    } catch (_) {
      try {
        benRec = app.findFirstRecordByFilter('app_settings', 'key = "pix_beneficiary_name"')
      } catch (_) {}
    }

    if (benRec) {
      if (!benRec.getString('value')) {
        benRec.set('value', 'Gislaine Sevirino')
        app.save(benRec)
      }
    } else {
      const settingsCol = app.findCollectionByNameOrId('app_settings')
      const newBenRec = new Record(settingsCol)
      newBenRec.set('key', 'pix_beneficiary_name')
      newBenRec.set('value', 'Gislaine Sevirino')
      newBenRec.set('description', 'Nome do beneficiário cadastrado no banco para conferência')
      app.save(newBenRec)
    }
  } catch (err) {
    console.error('[Billing Bootstrap] Erro ao garantir configurações PIX:', err)
  }
})

// -------------------------------------------------------------
// 1. Hook onRecordCreate: Criação de conta de usuário (Novo User)
// Inicia automaticamente o teste grátis de 30 dias (Sevi Essencial Trial)
// -------------------------------------------------------------
onRecordCreate((e) => {
  e.next()
  if (e.collection && e.collection.name === 'users') {
    try {
      const userId = e.record.id
      let existingSub
      try {
        existingSub = e.app.findFirstRecordByFilter('subscriptions', 'user = "' + userId + '"')
      } catch (_) {}

      if (!existingSub) {
        const subCol = e.app.findCollectionByNameOrId('subscriptions')
        const sub = new Record(subCol)
        const now = new Date()
        const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        sub.set('user', userId)
        sub.set('plano', 'essencial')
        sub.set('status', 'trial')
        sub.set('is_cortesia', false)
        sub.set('data_inicio', now.toISOString().split('T')[0])
        sub.set('trial_ends_at', trialEnd.toISOString().split('T')[0])
        sub.set('data_fim', trialEnd.toISOString().split('T')[0])
        e.app.save(sub)
      }

      // Garantir criação automática do health_profile do titular principal
      let existingProfile
      try {
        existingProfile = e.app.findFirstRecordByFilter(
          'health_profiles',
          'user = "' + userId + '" && is_proprio = true',
        )
      } catch (_) {
        try {
          existingProfile = e.app.findFirstRecordByFilter(
            'health_profiles',
            'user = "' + userId + '"',
          )
        } catch (__) {}
      }

      if (!existingProfile) {
        const profCol = e.app.findCollectionByNameOrId('health_profiles')
        const prof = new Record(profCol)
        const userName = (e.record.getString('name') || '').trim() || 'Titular'
        const metaRaw = e.record.get('meta') || {}
        let metaObj = {}
        if (typeof metaRaw === 'string') {
          try {
            metaObj = JSON.parse(metaRaw)
          } catch (_) {}
        } else if (metaRaw && typeof metaRaw === 'object') {
          metaObj = metaRaw
        }

        prof.set('user', userId)
        prof.set('nome', userName)
        prof.set('parentesco', 'titular')
        prof.set('is_proprio', true)
        prof.set('cor_tema', '#4C7A5A')
        if (metaObj.dataNascimento) {
          prof.set('data_nascimento', metaObj.dataNascimento)
        }
        if (metaObj.contatoEmergenciaNome) {
          prof.set('contato_emergencia_nome', metaObj.contatoEmergenciaNome)
        }
        if (metaObj.contatoEmergenciaTelefone) {
          prof.set('contato_emergencia_telefone', metaObj.contatoEmergenciaTelefone)
        }
        if (metaObj.contatoEmergenciaParentesco) {
          prof.set('contato_emergencia_parentesco', metaObj.contatoEmergenciaParentesco)
        }
        e.app.save(prof)
      }
    } catch (err) {
      console.error(
        '[Billing/Profile] Erro ao instanciar trial ou perfil titular de novo usuário:',
        err,
      )
    }
  }
})

// -------------------------------------------------------------
// 2. Limite no Backend: health_profiles (Criação de novos perfis)
// -------------------------------------------------------------
onRecordCreate((e) => {
  if (e.collection && e.collection.name === 'health_profiles') {
    const authRecord = e.auth || null
    const ownerUserId = e.record.getString('user') || (authRecord ? authRecord.id : null)

    if (ownerUserId) {
      // Obter ou criar sub
      let sub
      try {
        sub = e.app.findFirstRecordByFilter('subscriptions', 'user = "' + ownerUserId + '"')
      } catch (_) {
        try {
          const subCol = e.app.findCollectionByNameOrId('subscriptions')
          sub = new Record(subCol)
          const now = new Date()
          const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          sub.set('user', ownerUserId)
          sub.set('plano', 'essencial')
          sub.set('status', 'trial')
          sub.set('is_cortesia', false)
          sub.set('data_inicio', now.toISOString().split('T')[0])
          sub.set('trial_ends_at', trialEnd.toISOString().split('T')[0])
          sub.set('data_fim', trialEnd.toISOString().split('T')[0])
          e.app.save(sub)
        } catch (_) {}
      }

      if (sub) {
        const isCortesia = sub.getBool('is_cortesia')
        const planKey = sub.getString('plano') || 'essencial'
        let status = sub.getString('status')
        const todayIso = new Date().toISOString().split('T')[0]

        let isActive = false
        if (isCortesia) {
          const cortesiaAte = sub.getString('data_cortesia_ate')
          if (!cortesiaAte || todayIso <= cortesiaAte.split('T')[0]) {
            isActive = true
          }
        } else if (status === 'trial') {
          const trialEndsAt = sub.getString('trial_ends_at')
          if (trialEndsAt && todayIso <= trialEndsAt.split('T')[0]) {
            isActive = true
          }
        } else if (status === 'ativa') {
          const dataFim = sub.getString('data_fim')
          if (dataFim && todayIso <= dataFim.split('T')[0]) {
            isActive = true
          }
        }

        if (!isActive) {
          throw new BadRequestError(
            'Sua assinatura ou período de teste do SeviSaúde está expirado. Renove seu plano para cadastrar novos perfis de saúde. Seus dados continuam disponíveis para consulta.',
          )
        }

        if (!isCortesia) {
          // Limites: Essencial: 1, Completo: 3, Família: 5
          const maxMap = { essencial: 1, completo: 3, familia: 5 }
          const nameMap = {
            essencial: 'Sevi Essencial',
            completo: 'Sevi Completo',
            familia: 'Sevi Família',
          }
          const maxAllowed = maxMap[planKey] || 1
          const planName = nameMap[planKey] || 'Sevi Essencial'

          const existingProfiles = e.app.findRecordsByFilter(
            'health_profiles',
            'user = "' + ownerUserId + '"',
            'created',
            100,
            0,
          )

          if (existingProfiles.length >= maxAllowed) {
            throw new BadRequestError(
              'Seu plano ' +
                planName +
                ' permite até ' +
                maxAllowed +
                ' perfil(is) de saúde. Para adicionar mais membros da sua família, faça upgrade para o plano Sevi Família (até 5 perfis).',
            )
          }
        }
      }
    }
  }
  e.next()
})

// -------------------------------------------------------------
// 3. Bloqueio de Edição / Criação geral quando a conta estiver expirada
// Degradação graciosa: permite ler e exportar, mas proíbe criar novos registros clínicos
// -------------------------------------------------------------
const CLINICAL_COLLECTIONS = [
  'medicos',
  'medicamentos',
  'consultas',
  'exames',
  'alteracoes_medicamentos',
  'profile_access_grants',
]

for (let i = 0; i < CLINICAL_COLLECTIONS.length; i++) {
  const colName = CLINICAL_COLLECTIONS[i]
  onRecordCreate((e) => {
    if (e.collection && e.collection.name === colName) {
      const authRecord = e.auth || null
      if (authRecord) {
        const uId = authRecord.id
        let sub
        try {
          sub = e.app.findFirstRecordByFilter('subscriptions', 'user = "' + uId + '"')
        } catch (_) {}

        if (sub) {
          const isCortesia = sub.getBool('is_cortesia')
          const status = sub.getString('status')
          const todayIso = new Date().toISOString().split('T')[0]
          let isActive = false

          if (isCortesia) {
            const cortesiaAte = sub.getString('data_cortesia_ate')
            if (!cortesiaAte || todayIso <= cortesiaAte.split('T')[0]) isActive = true
          } else if (status === 'trial') {
            const trialEndsAt = sub.getString('trial_ends_at')
            if (trialEndsAt && todayIso <= trialEndsAt.split('T')[0]) isActive = true
          } else if (status === 'ativa') {
            const dataFim = sub.getString('data_fim')
            if (dataFim && todayIso <= dataFim.split('T')[0]) isActive = true
          }

          if (!isActive) {
            throw new BadRequestError(
              'Seu período de teste ou plano do SeviSaúde expirou. O prontuário está em modo somente leitura (seus dados continuam totalmente seguros e exportáveis). Renove sua assinatura para adicionar novos registros.',
            )
          }
        }
      }
    }
    e.next()
  })

  onRecordUpdate((e) => {
    if (e.collection && e.collection.name === colName) {
      const authRecord = e.auth || null
      if (authRecord) {
        const uId = authRecord.id
        let sub
        try {
          sub = e.app.findFirstRecordByFilter('subscriptions', 'user = "' + uId + '"')
        } catch (_) {}

        if (sub) {
          const isCortesia = sub.getBool('is_cortesia')
          const status = sub.getString('status')
          const todayIso = new Date().toISOString().split('T')[0]
          let isActive = false

          if (isCortesia) {
            const cortesiaAte = sub.getString('data_cortesia_ate')
            if (!cortesiaAte || todayIso <= cortesiaAte.split('T')[0]) isActive = true
          } else if (status === 'trial') {
            const trialEndsAt = sub.getString('trial_ends_at')
            if (trialEndsAt && todayIso <= trialEndsAt.split('T')[0]) isActive = true
          } else if (status === 'ativa') {
            const dataFim = sub.getString('data_fim')
            if (dataFim && todayIso <= dataFim.split('T')[0]) isActive = true
          }

          if (!isActive) {
            throw new BadRequestError(
              'Seu período de teste ou plano do SeviSaúde expirou. Os registros estão em modo somente leitura. Renove sua assinatura para realizar alterações.',
            )
          }
        }
      }
    }
    e.next()
  })
}

// -------------------------------------------------------------
// 4. Limite no Backend: Cota de Armazenamento e Upload em "documentos"
// Recusa upload com mensagem clara em pt-BR quando estourar a cota somada da conta
// -------------------------------------------------------------
onRecordCreate((e) => {
  if (e.collection && e.collection.name === 'documentos') {
    const authRecord = e.auth || null
    const ownerUserId = e.record.getString('userId') || (authRecord ? authRecord.id : null)

    if (ownerUserId) {
      let sub
      try {
        sub = e.app.findFirstRecordByFilter('subscriptions', 'user = "' + ownerUserId + '"')
      } catch (_) {}

      if (sub) {
        const isCortesia = sub.getBool('is_cortesia')
        const planKey = sub.getString('plano') || 'essencial'
        const status = sub.getString('status')
        const todayIso = new Date().toISOString().split('T')[0]
        let isActive = false

        if (isCortesia) {
          const cortesiaAte = sub.getString('data_cortesia_ate')
          if (!cortesiaAte || todayIso <= cortesiaAte.split('T')[0]) isActive = true
        } else if (status === 'trial') {
          const trialEndsAt = sub.getString('trial_ends_at')
          if (trialEndsAt && todayIso <= trialEndsAt.split('T')[0]) isActive = true
        } else if (status === 'ativa') {
          const dataFim = sub.getString('data_fim')
          if (dataFim && todayIso <= dataFim.split('T')[0]) isActive = true
        }

        if (!isActive) {
          throw new BadRequestError(
            'Seu período de teste ou plano do SeviSaúde expirou. Não é possível enviar novos arquivos. Renove sua assinatura para liberar uploads.',
          )
        }

        if (!isCortesia) {
          const userDocs = e.app.findRecordsByFilter(
            'documentos',
            'userId = "' + ownerUserId + '"',
            'created',
            1000,
            0,
          )

          const docCount = userDocs.length
          if (planKey === 'essencial' && docCount >= 50) {
            throw new BadRequestError(
              'Sua cota de armazenamento do plano Sevi Essencial (100 MB) acabou — faça upgrade para o plano Sevi Completo ou Sevi Família para continuar arquivando documentos.',
            )
          } else if (planKey === 'completo' && docCount >= 500) {
            throw new BadRequestError(
              'Sua cota de armazenamento do plano Sevi Completo (1 GB) acabou — faça upgrade para o plano Sevi Família para continuar arquivando documentos.',
            )
          }
        }
      }
    }
  }
  e.next()
})

// -------------------------------------------------------------
// 4.1 Endpoint de Leitura OCR com IA ($ai.chat / SKIP_AI_GATEWAY)
// POST /backend/v1/sevisaude/ocr/processar
// -------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/sevisaude/ocr/processar',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Autenticação necessária' })
      }

      const reqInfo = e.requestInfo()
      const body = reqInfo.body || {}
      const profileId = (body.profileId || '').trim()

      if (!profileId) {
        return e.json(400, { error: 'Perfil de saúde não informado.' })
      }

      // Validar acesso ao perfil
      let targetProfile
      try {
        targetProfile = e.app.findRecordById('health_profiles', profileId)
      } catch (_) {
        return e.json(404, { error: 'Perfil de saúde não encontrado.' })
      }

      const profileOwnerUserId = targetProfile.getString('user')
      const isOwner = authRecord.id === profileOwnerUserId

      // Se não for dono, verificar permissão via grants (precisa ter medicamentos_editar ou documentos_editar ou exames_editar)
      if (!isOwner) {
        let hasPermission = false
        try {
          const userGrants = e.app.findRecordsByFilter(
            'profile_access_grants',
            'profile = "' +
              profileId +
              '" && grantee_user = "' +
              authRecord.id +
              '" && status = "accepted"',
            'created',
            10,
            0,
          )
          for (let g = 0; g < userGrants.length; g++) {
            const rawP = userGrants[g].getString('permissions') || '{}'
            const pObj = JSON.parse(rawP)
            if (
              pObj.medicamentos_editar === true ||
              pObj.documentos_editar === true ||
              pObj.exames_editar === true
            ) {
              hasPermission = true
              break
            }
          }
        } catch (_) {}

        if (!hasPermission) {
          return e.json(403, {
            error:
              'Você não tem permissão de criação ou edição para este familiar/titular de saúde.',
          })
        }
      }

      // 4. Verificar Assinatura e Cotas OCR do DONO da conta
      const billingOwnerId = profileOwnerUserId
      let sub
      try {
        sub = e.app.findFirstRecordByFilter('subscriptions', 'user = "' + billingOwnerId + '"')
      } catch (_) {}

      const planLimits = {
        essencial: { monthlyOcrLimit: 0, nome: 'Sevi Essencial' },
        completo: { monthlyOcrLimit: 10, nome: 'Sevi Completo' },
        familia: { monthlyOcrLimit: 30, nome: 'Sevi Família' },
      }

      const planKey = (sub ? sub.getString('plano') : 'essencial') || 'essencial'
      const isCortesia = sub ? sub.getBool('is_cortesia') : false
      const status = sub ? sub.getString('status') : 'trial'
      const todayIso = new Date().toISOString().split('T')[0]

      let isActive = false
      if (sub) {
        if (isCortesia) {
          const cortesiaAte = sub.getString('data_cortesia_ate')
          if (!cortesiaAte || todayIso <= cortesiaAte.split('T')[0]) isActive = true
        } else if (status === 'trial') {
          const trialEndsAt = sub.getString('trial_ends_at')
          if (trialEndsAt && todayIso <= trialEndsAt.split('T')[0]) isActive = true
        } else if (status === 'ativa') {
          const dataFim = sub.getString('data_fim')
          if (dataFim && todayIso <= dataFim.split('T')[0]) isActive = true
        }
      }

      if (!isActive) {
        return e.json(403, {
          error:
            'A assinatura ou período de teste do titular está expirado. Renove o plano para usar o OCR.',
        })
      }

      const planCfg = planLimits[planKey] || planLimits.essencial
      const maxMonthlyOcr = isCortesia ? 30 : planCfg.monthlyOcrLimit

      if (maxMonthlyOcr <= 0) {
        return e.json(403, {
          error:
            'O recurso de OCR (leitura inteligente de receitas) não está disponível no plano ' +
            planCfg.nome +
            '. Faça upgrade para o Sevi Completo ou Sevi Família.',
        })
      }

      // Verificar consumo do mês atual
      const currentYearMonth = todayIso.substring(0, 7) // "YYYY-MM"
      let ocrCountThisMonth = 0
      try {
        const ocrLogs = e.app.findRecordsByFilter(
          'ocr_logs',
          'user = "' +
            billingOwnerId +
            '" && mes_ano = "' +
            currentYearMonth +
            '" && status = "sucesso"',
          'created',
          1000,
          0,
        )
        ocrCountThisMonth = ocrLogs.length
      } catch (_) {}

      if (ocrCountThisMonth >= maxMonthlyOcr) {
        return e.json(429, {
          error:
            'Você atingiu o limite mensal de ' +
            maxMonthlyOcr +
            ' documentos lidos via OCR para o plano ' +
            planCfg.nome +
            '. Faça upgrade para o plano Sevi Família ou aguarde a renovação do próximo mês.',
          currentUsage: ocrCountThisMonth,
          maxUsage: maxMonthlyOcr,
        })
      }

      // 5. Obter arquivo enviado (multipart form-data ou JSON com base64 Data URL)
      // findUploadedFiles só pode ser chamado se o Content-Type for multipart/form-data.
      // Em requisições application/json, e.findUploadedFiles() lança exceção em Go:
      // "request Content-Type isn't multipart/form-data".
      let files = null
      const contentType = ((e.request && e.request.header.get('Content-Type')) || '').toLowerCase()
      if (contentType.indexOf('multipart/form-data') !== -1) {
        try {
          files = e.findUploadedFiles('arquivo')
        } catch (fileErr) {
          console.warn('[OCR] findUploadedFiles ignorado:', fileErr)
        }
      }

      let fileDataUrl = (body.fileDataUrl || '').trim()
      let fileName = (body.fileName || '').trim() || 'documento.jpg'

      if (files && files.length > 0) {
        fileName = files[0].name
      } else if (!fileDataUrl) {
        return e.json(400, { error: 'Nenhum arquivo enviado para processamento.' })
      }

      // 6. Preparar conteúdo para o Gateway de IA ($ai.chat)
      // O gateway suporta imagens via data:image/...;base64,... e PDFs digitais via $documents
      let extractedMarkdownText = ''

      if (files && files.length > 0) {
        const f = files[0]
        const isPdf = f.name.toLowerCase().endsWith('.pdf')
        if (isPdf) {
          try {
            const docRes = $documents.toMarkdown({ file: f })
            extractedMarkdownText = docRes.markdown || ''
          } catch (docErr) {
            console.log('[OCR] $documents.toMarkdown para PDF multipart:', docErr.message)
          }
        }
      } else if (fileDataUrl.startsWith('data:application/pdf;base64,')) {
        // Se for um PDF em base64 Data URL, tentar converter para texto com $documents.toMarkdown se possível
        try {
          const rawBase64 = fileDataUrl.replace(/^data:application\/pdf;base64,/, '')
          if ($filesystem && $filesystem.fileFromBytes) {
            const pdfFile = $filesystem.fileFromBytes(rawBase64, fileName || 'receita.pdf')
            const docRes = $documents.toMarkdown({ file: pdfFile })
            extractedMarkdownText = docRes.markdown || ''
          }
        } catch (pdfErr) {
          console.log('[OCR] Tentativa de extração $documents via base64:', pdfErr.message)
        }
      }

      // Se temos fileDataUrl (enviado pelo frontend em base64/data URI para imagens e PDFs)
      const userMessageContent = []
      userMessageContent.push({
        type: 'text',
        text:
          'Você é um assistente especializado em digitalização e extração estruturada de documentos médicos e receitas de saúde no Brasil (SeviSaúde).\n\n' +
          'Analise a imagem/documento anexado e extraia as informações com extrema fidelidade.\n' +
          'Se não encontrar algum campo, retorne null ou string vazia.\n' +
          'Retorne ESTRITAMENTE um objeto JSON válido (sem tags markdown, sem ```json, sem comentários adicionais), no seguinte formato:\n' +
          '{\n' +
          '  "tipo_documento": "receita" | "pedido_exame" | "laudo" | "atestado" | "outro",\n' +
          '  "medico": {\n' +
          '    "nome": "Nome do Médico ou Profissional",\n' +
          '    "crm": "CRM e UF se visível",\n' +
          '    "especialidade": "Especialidade se visível"\n' +
          '  },\n' +
          '  "data_documento": "YYYY-MM-DD",\n' +
          '  "medicamentos": [\n' +
          '    {\n' +
          '      "nome": "Nome comercial ou princípio ativo",\n' +
          '      "principio_ativo": "",\n' +
          '      "dosagem": "Ex: 50mg",\n' +
          '      "forma": "comprimido" | "cápsula" | "xarope" | "solução" | "gotas" | "injetável" | "creme" | "pomada" | "outro",\n' +
          '      "posologia": "Ex: 1 comprimido pela manhã",\n' +
          '      "frequencia": "Ex: 12 em 12 horas",\n' +
          '      "tipo_uso": "contínuo" | "temporário",\n' +
          '      "horarios": ["08:00"]\n' +
          '    }\n' +
          '  ],\n' +
          '  "exames": [\n' +
          '    {\n' +
          '      "nome": "Nome do exame solicitado",\n' +
          '      "tipo": "Sangue" | "Imagem" | "Urina" | "Cardíaco" | "Outro",\n' +
          '      "observacoes": ""\n' +
          '    }\n' +
          '  ],\n' +
          '  "texto_completo_extraido": "Transcrição integral do texto legível no documento",\n' +
          '  "confianca": "alta" | "media" | "baixa",\n' +
          '  "observacoes_leitura": "Notas sobre legibilidade ou recomendações para o usuário conferir"\n' +
          '}',
      })

      if (fileDataUrl) {
        userMessageContent.push({
          type: 'image_url',
          image_url: {
            url: fileDataUrl,
          },
        })
      } else if (extractedMarkdownText) {
        userMessageContent.push({
          type: 'text',
          text: 'Texto extraído do documento digital:\n\n' + extractedMarkdownText,
        })
      }

      // Chamar $ai.chat com gateway
      // Chamar $ai.chat com gateway
      let chatResponseText = ''
      try {
        console.log('[OCR] Tentando chamada $ai.chat...')

        // Testar chamada textual primeiro se necessário, ou estruturação
        let messagesPayload = [
          {
            role: 'system',
            content:
              'Você é um assistente de OCR médico do SeviSaúde. Responda apenas com JSON puro.',
          },
          {
            role: 'user',
            content: userMessageContent,
          },
        ]

        try {
          const aiRes = $ai.chat({
            model: 'fast',
            messages: messagesPayload,
          })
          chatResponseText = aiRes.choices[0].message.content || ''
        } catch (firstErr) {
          console.error(
            '[OCR] Falha tentativa 1 (fast + multimodal):',
            firstErr.message || String(firstErr),
            'status:',
            firstErr.status,
          )

          // Testar se o gateway aceita reasoning ou se o problema é o formato da imagem
          // Tentativa 2: model 'reasoning' com a imagem
          try {
            console.log('[OCR] Tentando com model: reasoning...')
            const aiRes2 = $ai.chat({
              model: 'reasoning',
              messages: messagesPayload,
            })
            chatResponseText = aiRes2.choices[0].message.content || ''
            console.log('[OCR] Sucesso com model reasoning!')
          } catch (reasoningErr) {
            console.error(
              '[OCR] Falha tentativa 2 (reasoning + multimodal):',
              reasoningErr.message || String(reasoningErr),
              'status:',
              reasoningErr.status,
            )

            // Tentativa 3: Se ambas falharem com 400, testar se o gateway não suporta data URL / image_url
            // Testar se apenas texto funciona no gateway para isolar se o gateway não tem suporte a visão
            try {
              console.log('[OCR] Testando chamada apenas com texto para isolar visão...')
              const testTextRes = $ai.chat({
                model: 'fast',
                messages: [{ role: 'user', content: 'Diga olá' }],
              })
              console.log(
                '[OCR] Chamada de texto puro FUNCIONOU:',
                testTextRes.choices[0].message.content,
              )
            } catch (textOnlyErr) {
              console.error(
                '[OCR] Chamada de texto puro TAMBÉM falhou:',
                textOnlyErr.message || String(textOnlyErr),
                'status:',
                textOnlyErr.status,
              )
            }

            throw firstErr
          }
        }
      } catch (aiErr) {
        console.error(
          '[OCR] Erro final na chamada $ai.chat:',
          aiErr.message || String(aiErr),
          'status:',
          aiErr.status,
          'code:',
          aiErr.code,
        )
        // Se a chamada de IA falhar, NÃO consome a cota e retorna erro amigável em pt-BR
        return e.json(502, {
          error:
            'No momento, a leitura de imagens está temporariamente indisponível no serviço de inteligência artificial. Sua cota de OCR NÃO foi consumida. Se o seu documento for um PDF com texto digital, tente enviá-lo — a leitura de PDFs continua funcionando. Você também pode cadastrar os medicamentos e exames manualmente.',
          details: aiErr.message || String(aiErr),
          rawAiError: String(aiErr),
        })
      }

      // Tratar e parsear JSON retornado
      let extractedData = null
      try {
        let cleanText = chatResponseText.trim()
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7)
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.substring(3)
        }
        if (cleanText.endsWith('```')) {
          cleanText = cleanText.substring(0, cleanText.length - 3)
        }
        cleanText = cleanText.trim()
        extractedData = JSON.parse(cleanText)
      } catch (parseErr) {
        console.warn('[OCR] Erro ao parsear JSON da IA:', chatResponseText)
        extractedData = {
          tipo_documento: 'outro',
          medico: null,
          data_documento: todayIso,
          medicamentos: [],
          exames: [],
          texto_completo_extraido: chatResponseText,
          confianca: 'baixa',
          observacoes_leitura:
            'Não foi possível estruturar automaticamente todos os campos. Por favor, preencha manualmente na tela de conferência.',
        }
      }

      // Se a extração foi bem sucedida, REGISTRAR consumo no ocr_logs
      try {
        const ocrCol = e.app.findCollectionByNameOrId('ocr_logs')
        const logRec = new Record(ocrCol)
        logRec.set('user', billingOwnerId)
        logRec.set('profile', profileId)
        logRec.set('mes_ano', currentYearMonth)
        logRec.set('tipo_documento', extractedData.tipo_documento || 'documento')
        logRec.set('arquivo_nome', fileName)
        logRec.set('status', 'sucesso')
        e.app.save(logRec)
        ocrCountThisMonth++
      } catch (logErr) {
        console.error('[OCR] Erro ao salvar log de consumo:', logErr)
      }

      return e.json(200, {
        success: true,
        data: extractedData,
        quota: {
          usedThisMonth: ocrCountThisMonth,
          maxMonthly: maxMonthlyOcr,
          remainingThisMonth: Math.max(0, maxMonthlyOcr - ocrCountThisMonth),
        },
      })
    } catch (err) {
      console.error('[OCR] Erro não tratado:', err)
      return e.json(500, {
        error: (err && err.message) || 'Erro interno ao processar OCR.',
      })
    }
  },
  $apis.requireAuth(),
)

// -------------------------------------------------------------
// 5. Endpoints REST Customizados para Billing e Área Administrativa
// -------------------------------------------------------------

// GET /backend/v1/sevisaude/my-subscription
routerAdd(
  'GET',
  '/backend/v1/sevisaude/my-subscription',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Autenticação necessária' })
      }

      const planLimits = {
        essencial: {
          nome: 'Sevi Essencial',
          maxProfiles: 1,
          maxStorageBytes: 100 * 1024 * 1024,
          monthlyOcrLimit: 0,
        },
        completo: {
          nome: 'Sevi Completo',
          maxProfiles: 3,
          maxStorageBytes: 1024 * 1024 * 1024,
          monthlyOcrLimit: 10,
        },
        familia: {
          nome: 'Sevi Família',
          maxProfiles: 5,
          maxStorageBytes: 2 * 1024 * 1024 * 1024,
          monthlyOcrLimit: 30,
        },
      }

      let sub
      try {
        sub = e.app.findFirstRecordByFilter('subscriptions', 'user = "' + authRecord.id + '"')
      } catch (_) {
        const subCol = e.app.findCollectionByNameOrId('subscriptions')
        sub = new Record(subCol)
        const now = new Date()
        const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        sub.set('user', authRecord.id)
        sub.set('plano', 'essencial')
        sub.set('status', 'trial')
        sub.set('is_cortesia', false)
        sub.set('data_inicio', now.toISOString().split('T')[0])
        sub.set('trial_ends_at', trialEnd.toISOString().split('T')[0])
        sub.set('data_fim', trialEnd.toISOString().split('T')[0])
        e.app.save(sub)
      }

      const isCortesia = sub.getBool('is_cortesia')
      const planKey = sub.getString('plano') || 'essencial'
      let status = sub.getString('status')
      const todayIso = new Date().toISOString().split('T')[0]

      let isActive = false
      if (isCortesia) {
        const cortesiaAte = sub.getString('data_cortesia_ate')
        if (!cortesiaAte || todayIso <= cortesiaAte.split('T')[0]) {
          isActive = true
        } else {
          status = 'expirada'
        }
      } else if (status === 'trial') {
        const trialEndsAt = sub.getString('trial_ends_at')
        if (trialEndsAt && todayIso <= trialEndsAt.split('T')[0]) {
          isActive = true
        } else {
          status = 'expirada'
        }
      } else if (status === 'ativa') {
        const dataFim = sub.getString('data_fim')
        if (dataFim && todayIso <= dataFim.split('T')[0]) {
          isActive = true
        } else {
          status = 'expirada'
        }
      }

      const planConfig = planLimits[planKey] || planLimits.essencial

      const profiles = e.app.findRecordsByFilter(
        'health_profiles',
        'user = "' + authRecord.id + '"',
        'created',
        100,
        0,
      )
      const docs = e.app.findRecordsByFilter(
        'documentos',
        'userId = "' + authRecord.id + '"',
        'created',
        1000,
        0,
      )

      let pixKey = ''
      let pixBeneficiary = ''
      try {
        const pSetting = e.app.findFirstRecordByFilter('app_settings', 'key = "pix_key"')
        pixKey = pSetting.getString('value') || ''
      } catch (_) {}
      try {
        const bSetting = e.app.findFirstRecordByFilter(
          'app_settings',
          'key = "pix_beneficiary_name"',
        )
        pixBeneficiary = bSetting.getString('value') || ''
      } catch (_) {}

      let daysRemaining = 0
      const endDate =
        status === 'trial' ? sub.getString('trial_ends_at') : sub.getString('data_fim')

      if (endDate) {
        const dEnd = new Date(endDate).getTime()
        const dNow = new Date(todayIso).getTime()
        daysRemaining = Math.max(0, Math.ceil((dEnd - dNow) / (1000 * 60 * 60 * 24)))
      }

      // Calcular consumo de OCR deste mês (YYYY-MM)
      const currentYearMonth = todayIso.substring(0, 7)
      let ocrCountThisMonth = 0
      try {
        const ocrLogs = e.app.findRecordsByFilter(
          'ocr_logs',
          'user = "' +
            authRecord.id +
            '" && mes_ano = "' +
            currentYearMonth +
            '" && status = "sucesso"',
          'created',
          1000,
          0,
        )
        ocrCountThisMonth = ocrLogs.length
      } catch (_) {}

      return e.json(200, {
        subscription: sub,
        planConfig: planConfig,
        subState: {
          active: isActive,
          status: status,
          isCortesia: isCortesia,
          planKey: planKey,
        },
        usage: {
          profileCount: profiles.length,
          maxProfiles: planConfig.maxProfiles,
          docCount: docs.length,
          estimatedStorageUsedBytes: docs.length * 2 * 1024 * 1024,
          maxStorageBytes: planConfig.maxStorageBytes,
          ocrUsedThisMonth: ocrCountThisMonth,
          maxOcrMonthly: planConfig.monthlyOcrLimit,
          daysRemaining: daysRemaining,
        },
        pixConfig: {
          key: pixKey,
          beneficiary: pixBeneficiary,
          configured: !!pixKey,
        },
      })
    } catch (err) {
      return e.json(500, { error: (err && err.message) || String(err) })
    }
  },
  $apis.requireAuth(),
)

// POST /backend/v1/sevisaude/admin/confirm-payment
routerAdd(
  'POST',
  '/backend/v1/sevisaude/admin/confirm-payment',
  (e) => {
    try {
      const adminEmail = 'gislaine.sevirino@gmail.com'
      const authRecord = e.auth
      if (!authRecord || authRecord.getString('email').toLowerCase().trim() !== adminEmail) {
        return e.json(403, { error: 'Acesso restrito à administradora do SeviSaúde.' })
      }

      const reqInfo = e.requestInfo()
      const body = reqInfo.body || {}
      const paymentId = body.paymentId
      const action = body.action
      const notasRecusa = body.notasRecusa || ''

      if (!paymentId) {
        return e.json(400, { error: 'ID do pagamento não informado.' })
      }

      const payment = e.app.findRecordById('payments', paymentId)
      const targetUserId = payment.getString('user')
      const targetPlan = payment.getString('plano') || 'essencial'

      const nowIso = new Date().toISOString()
      const todayIso = nowIso.split('T')[0]

      if (action === 'confirm') {
        payment.set('status', 'confirmado')
        payment.set('data_confirmacao', todayIso)
        payment.set('confirmado_por', authRecord.getString('email'))
        e.app.save(payment)

        let sub
        try {
          sub = e.app.findFirstRecordByFilter('subscriptions', 'user = "' + targetUserId + '"')
        } catch (_) {
          const subCol = e.app.findCollectionByNameOrId('subscriptions')
          sub = new Record(subCol)
          sub.set('user', targetUserId)
        }

        const nextMonth = new Date()
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        const nextMonthIso = nextMonth.toISOString().split('T')[0]

        sub.set('plano', targetPlan)
        sub.set('status', 'ativa')
        sub.set('data_inicio', todayIso)
        sub.set('data_fim', nextMonthIso)
        sub.set(
          'notas_admin',
          'PIX confirmado por ' + authRecord.getString('email') + ' em ' + todayIso,
        )
        e.app.save(sub)

        return e.json(200, {
          success: true,
          message: 'Pagamento confirmado com sucesso e plano ativado!',
        })
      } else if (action === 'refuse') {
        payment.set('status', 'recusado')
        payment.set('data_confirmacao', todayIso)
        payment.set('confirmado_por', authRecord.getString('email'))
        payment.set(
          'notas_recusa',
          notasRecusa || 'Comprovante não identificado ou valor incorreto.',
        )
        e.app.save(payment)

        return e.json(200, { success: true, message: 'Pagamento marcado como recusado.' })
      } else {
        return e.json(400, { error: "Ação inválida. Use 'confirm' ou 'refuse'." })
      }
    } catch (err) {
      return e.json(500, { error: (err && err.message) || String(err) })
    }
  },
  $apis.requireAuth(),
)

// POST /backend/v1/sevisaude/admin/set-cortesia
routerAdd(
  'POST',
  '/backend/v1/sevisaude/admin/set-cortesia',
  (e) => {
    try {
      const adminEmail = 'gislaine.sevirino@gmail.com'
      const authRecord = e.auth
      if (!authRecord || authRecord.getString('email').toLowerCase().trim() !== adminEmail) {
        return e.json(403, { error: 'Acesso restrito à administradora do SeviSaúde.' })
      }

      const reqInfo = e.requestInfo()
      const body = reqInfo.body || {}
      const targetUserId = body.userId
      const plano = body.plano || 'familia'
      const isCortesia = body.isCortesia !== false
      const dataCortesiaAte = body.dataCortesiaAte || '2099-12-31'
      const notas = body.notas || 'Cortesia concedida pela administração'

      if (!targetUserId) {
        return e.json(400, { error: 'ID do usuário não informado.' })
      }

      let sub
      try {
        sub = e.app.findFirstRecordByFilter('subscriptions', 'user = "' + targetUserId + '"')
      } catch (_) {
        const subCol = e.app.findCollectionByNameOrId('subscriptions')
        sub = new Record(subCol)
        sub.set('user', targetUserId)
      }

      sub.set('is_cortesia', isCortesia)
      sub.set('plano', plano)
      if (isCortesia) {
        sub.set('status', 'ativa')
        sub.set('data_cortesia_ate', dataCortesiaAte)
        sub.set('data_fim', dataCortesiaAte)
      } else {
        // Revogação de cortesia: se expirada ou cancelada, manter; caso contrário, data_fim ajustada para hoje e status expirada se já passou
        const todayIso = new Date().toISOString().split('T')[0]
        sub.set('data_cortesia_ate', null)
        sub.set('data_fim', todayIso)
        sub.set('status', 'expirada')
      }
      sub.set('notas_admin', notas)
      e.app.save(sub)

      return e.json(200, {
        success: true,
        message: 'Status de cortesia atualizado com sucesso.',
        data: sub,
      })
    } catch (err) {
      return e.json(500, { error: (err && err.message) || String(err) })
    }
  },
  $apis.requireAuth(),
)

// POST /backend/v1/sevisaude/admin/update-pix-settings
routerAdd(
  'POST',
  '/backend/v1/sevisaude/admin/update-pix-settings',
  (e) => {
    try {
      const adminEmail = 'gislaine.sevirino@gmail.com'
      const authRecord = e.auth
      if (!authRecord || authRecord.getString('email').toLowerCase().trim() !== adminEmail) {
        return e.json(403, { error: 'Acesso restrito à administradora do SeviSaúde.' })
      }

      const reqInfo = e.requestInfo()
      const body = reqInfo.body || {}
      const pixKey = (body.pixKey || '').trim()
      const pixBeneficiary = (body.pixBeneficiary || '').trim()

      const settingsCol = e.app.findCollectionByNameOrId('app_settings')

      let keyRec
      try {
        keyRec = e.app.findFirstRecordByFilter('app_settings', 'key = "pix_key"')
      } catch (_) {
        keyRec = new Record(settingsCol)
        keyRec.set('key', 'pix_key')
        keyRec.set('description', 'Chave PIX da proprietária do SeviSaúde')
      }
      keyRec.set('value', pixKey)
      e.app.save(keyRec)

      let benRec
      try {
        benRec = e.app.findFirstRecordByFilter('app_settings', 'key = "pix_beneficiary_name"')
      } catch (_) {
        benRec = new Record(settingsCol)
        benRec.set('key', 'pix_beneficiary_name')
        benRec.set('description', 'Nome do beneficiário cadastrado no banco')
      }
      benRec.set('value', pixBeneficiary)
      e.app.save(benRec)

      return e.json(200, {
        success: true,
        message: 'Chave PIX atualizada com sucesso!',
        pixKey: pixKey,
        pixBeneficiary: pixBeneficiary,
      })
    } catch (err) {
      return e.json(500, { error: (err && err.message) || String(err) })
    }
  },
  $apis.requireAuth(),
)
