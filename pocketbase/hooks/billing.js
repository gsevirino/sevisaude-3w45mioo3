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
          ocrUsedThisMonth: 0,
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
