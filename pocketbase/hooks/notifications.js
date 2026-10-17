// pocketbase/hooks/notifications.js
// SeviSaúde: Sistema de Lembretes por E-mail no Backend
// Cron periódica a cada 15 minutos + endpoint de disparo /api/sevisaude/process-reminders

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function formatDateBR(isoDateStr) {
  if (!isoDateStr) return ''
  const clean = isoDateStr.split('T')[0].split(' ')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    return parts[2] + '/' + parts[1] + '/' + parts[0]
  }
  return isoDateStr
}

function getTodayIsoString(now) {
  const y = now.getUTCFullYear()
  const m = pad(now.getUTCMonth() + 1)
  const d = pad(now.getUTCDate())
  return y + '-' + m + '-' + d
}

function daysDiff(targetIso, todayIso) {
  const p1 = targetIso.split('-')
  const p2 = todayIso.split('-')
  const d1 = Date.UTC(parseInt(p1[0], 10), parseInt(p1[1], 10) - 1, parseInt(p1[2], 10))
  const d2 = Date.UTC(parseInt(p2[0], 10), parseInt(p2[1], 10) - 1, parseInt(p2[2], 10))
  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24))
}

function getUserNotificationPrefs(app, userId) {
  try {
    const prefRecord = app.findFirstRecordByFilter(
      'notification_preferences',
      'user = "' + userId + '"',
    )
    return {
      enabled: prefRecord.getBool('enabled'),
      appointments_enabled: prefRecord.getBool('appointments_enabled'),
      exams_enabled: prefRecord.getBool('exams_enabled'),
      days_advance: prefRecord.getInt('days_advance') || 2,
      notify_day_before: prefRecord.getBool('notify_day_before'),
      notify_same_day: prefRecord.getBool('notify_same_day'),
      family_opt_in: prefRecord.getBool('family_opt_in'),
    }
  } catch (_) {
    return {
      enabled: true,
      appointments_enabled: true,
      exams_enabled: true,
      days_advance: 2,
      notify_day_before: true,
      notify_same_day: true,
      family_opt_in: true,
    }
  }
}

function processHealthReminders(app, options) {
  const opts = options || {}
  const simulate = !!opts.simulate
  const results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  }

  const now = new Date()
  const todayIso = getTodayIsoString(now)
  console.log('[SeviSaúde Lembretes] Processando lembretes na data UTC:', todayIso)

  // 1. Processar Consultas Agendadas
  let consultas = []
  try {
    consultas = app.findRecordsByFilter('consultas', 'status = "Agendada"', 'data', 500, 0)
  } catch (err) {
    console.error('[SeviSaúde Lembretes] Erro ao buscar consultas:', err)
  }

  for (let i = 0; i < consultas.length; i++) {
    const c = consultas[i]
    results.processed++
    try {
      const dataRaw = c.getString('data') || ''
      const scheduledDate = dataRaw.split('T')[0].split(' ')[0]
      if (!scheduledDate) continue

      const diff = daysDiff(scheduledDate, todayIso)
      if (diff < 0) continue

      const profileId = c.getString('profile')
      let profileName = 'Titular'
      let profileOwnerUserId = c.getString('userId')
      if (profileId) {
        try {
          const prof = app.findRecordById('health_profiles', profileId)
          profileName = prof.getString('nome') || profileName
          profileOwnerUserId = prof.getString('user') || profileOwnerUserId
        } catch (_) {}
      }

      let medicoNome = ''
      let especialidade = ''
      const medicoId = c.getString('medico')
      if (medicoId) {
        try {
          const mRec = app.findRecordById('medicos', medicoId)
          medicoNome = mRec.getString('nome') || ''
          especialidade = mRec.getString('especialidade') || ''
        } catch (_) {}
      }
      const horario = c.getString('horario') || ''
      const local = c.getString('local') || ''
      const tipo = c.getString('tipo') || 'Presencial'

      const recipients = getAuthorizedRecipients(app, profileOwnerUserId, profileId)

      for (let r = 0; r < recipients.length; r++) {
        const recip = recipients[r]
        const prefs = recip.prefs

        if (!prefs.enabled || !prefs.appointments_enabled) {
          results.skipped++
          continue
        }
        if (recip.isFamily && !prefs.family_opt_in) {
          results.skipped++
          continue
        }

        const timings = []
        if (diff === 0 && prefs.notify_same_day) {
          timings.push('same_day')
        }
        if (diff === 1 && prefs.notify_day_before) {
          timings.push('day_before')
        }
        if (diff > 1 && diff === prefs.days_advance) {
          timings.push('advance')
        }

        for (let t = 0; t < timings.length; t++) {
          const timing = timings[t]
          const dedupKey =
            'consulta_' + c.id + '_' + timing + '_' + recip.email + '_' + scheduledDate

          if (alreadySentOrJobExists(app, dedupKey)) {
            continue
          }

          const timingLabel =
            timing === 'same_day'
              ? 'HOJE'
              : timing === 'day_before'
                ? 'AMANHÃ'
                : 'em ' + diff + ' dias'

          const subject =
            'SeviSaúde: Lembrete de consulta de ' +
            profileName +
            ' ' +
            timingLabel +
            ' (' +
            formatDateBR(scheduledDate) +
            ')'

          let timingText = 'é <strong>hoje</strong>'
          if (timing === 'day_before') timingText = 'é <strong>amanhã</strong>'
          if (timing === 'advance')
            timingText = 'está agendada para daqui a <strong>' + diff + ' dias</strong>'

          let detailsHtml =
            '<li><strong>Titular de saúde:</strong> ' + escapeHtml(profileName) + '</li>'
          detailsHtml += '<li><strong>Data:</strong> ' + formatDateBR(scheduledDate) + '</li>'
          if (horario)
            detailsHtml += '<li><strong>Horário:</strong> ' + escapeHtml(horario) + '</li>'
          detailsHtml += '<li><strong>Formato:</strong> ' + escapeHtml(tipo) + '</li>'
          if (medicoNome)
            detailsHtml += '<li><strong>Profissional:</strong> ' + escapeHtml(medicoNome) + '</li>'
          if (especialidade)
            detailsHtml +=
              '<li><strong>Especialidade:</strong> ' + escapeHtml(especialidade) + '</li>'
          if (local)
            detailsHtml += '<li><strong>Local / Link:</strong> ' + escapeHtml(local) + '</li>'

          const htmlBody =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #26362B; line-height: 1.5;">' +
            '<div style="text-align: center; margin-bottom: 24px;">' +
            '<h2 style="color: #4C7A5A; margin: 0; font-size: 24px;">SeviSaúde</h2>' +
            '<p style="color: #6B7A6F; font-size: 13px; margin: 4px 0 0 0;">Sua jornada de saúde, conectada.</p>' +
            '</div>' +
            '<div style="background-color: #F6F4EF; border: 1px solid #D9E2D4; border-radius: 16px; padding: 20px; margin-bottom: 20px;">' +
            '<h3 style="margin-top: 0; color: #26362B; font-size: 18px;">Lembrete de Consulta Médica</h3>' +
            '<p style="font-size: 14px; margin-bottom: 16px;">Olá, ' +
            escapeHtml(recip.nome || 'usuário') +
            '! Lembramos que o compromisso de saúde de <strong>' +
            escapeHtml(profileName) +
            '</strong> ' +
            timingText +
            ':</p>' +
            '<ul style="font-size: 14px; padding-left: 20px; margin-bottom: 0;">' +
            detailsHtml +
            '</ul>' +
            '</div>' +
            '<p style="font-size: 12px; color: #6B7A6F; line-height: 1.4;"><em>Nota de privacidade: em respeito ao sigilo médico e à proteção de dados sensíveis, este aviso não inclui diagnósticos clínicos, anotações de prontuário ou histórico de atendimento.</em></p>' +
            '<div style="border-top: 1px solid #D9E2D4; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #8F9E93;">' +
            'Você está recebendo este lembrete conforme as preferências da sua conta no SeviSaúde. Para ajustar suas notificações, acesse "Meu perfil e configurações > Lembretes por E-mail".' +
            '</div>' +
            '</div>'

          const jobRecord = sendOrRecordJob(app, {
            deduplication_key: dedupKey,
            event_type: 'consulta',
            target_id: c.id,
            trigger_timing: timing,
            scheduled_date: scheduledDate,
            recipient_email: recip.email,
            recipient_user: recip.userId,
            profile: profileId,
            subject: subject,
            html: htmlBody,
            simulate: simulate,
          })

          if (jobRecord.status === 'sent') {
            results.sent++
          } else if (jobRecord.status === 'failed') {
            results.failed++
          }
          results.details.push({
            type: 'consulta',
            id: c.id,
            timing: timing,
            recipient: recip.email,
            status: jobRecord.status,
          })
        }
      }
    } catch (cErr) {
      console.error('[SeviSaúde Lembretes] Erro ao processar consulta ' + c.id + ':', cErr)
      results.failed++
    }
  }

  // 2. Processar Exames Agendados
  let exames = []
  try {
    exames = app.findRecordsByFilter('exames', 'status = "Agendado"', 'created', 500, 0)
  } catch (err) {
    console.error('[SeviSaúde Lembretes] Erro ao buscar exames:', err)
  }

  for (let j = 0; j < exames.length; j++) {
    const ex = exames[j]
    results.processed++
    try {
      const dataHoraAgendada = ex.getString('data_hora_agendada') || ''
      const dataRealizado = ex.getString('data_realizado') || ''
      let scheduledDate = ''
      let scheduledTime = ''

      if (dataHoraAgendada) {
        const parts = dataHoraAgendada.split(' ')
        scheduledDate = parts[0]
        if (parts.length > 1) scheduledTime = parts[1]
      } else if (dataRealizado) {
        scheduledDate = dataRealizado.split('T')[0].split(' ')[0]
      }

      if (!scheduledDate) continue

      const diff = daysDiff(scheduledDate, todayIso)
      if (diff < 0) continue

      const profileId = ex.getString('profile')
      let profileName = 'Titular'
      let profileOwnerUserId = ex.getString('userId')
      if (profileId) {
        try {
          const prof = app.findRecordById('health_profiles', profileId)
          profileName = prof.getString('nome') || profileName
          profileOwnerUserId = prof.getString('user') || profileOwnerUserId
        } catch (_) {}
      }

      const nomeExame = ex.getString('nome') || 'Exame de saúde'
      const tipoExame = ex.getString('tipo') || ''
      const localRealizacao = ex.getString('local_realizacao') || ''
      const instrucoesPreparo = ex.getString('instrucoes_preparo') || ''

      const recipients = getAuthorizedRecipients(app, profileOwnerUserId, profileId)

      for (let r = 0; r < recipients.length; r++) {
        const recip = recipients[r]
        const prefs = recip.prefs

        if (!prefs.enabled || !prefs.exams_enabled) {
          results.skipped++
          continue
        }
        if (recip.isFamily && !prefs.family_opt_in) {
          results.skipped++
          continue
        }

        const timings = []
        if (diff === 0 && prefs.notify_same_day) {
          timings.push('same_day')
        }
        if (diff === 1 && prefs.notify_day_before) {
          timings.push('day_before')
        }
        if (diff > 1 && diff === prefs.days_advance) {
          timings.push('advance')
        }

        for (let t = 0; t < timings.length; t++) {
          const timing = timings[t]
          const dedupKey = 'exame_' + ex.id + '_' + timing + '_' + recip.email + '_' + scheduledDate

          if (alreadySentOrJobExists(app, dedupKey)) {
            continue
          }

          const timingLabel =
            timing === 'same_day'
              ? 'HOJE'
              : timing === 'day_before'
                ? 'AMANHÃ'
                : 'em ' + diff + ' dias'

          const subject =
            'SeviSaúde: Lembrete de exame de ' +
            profileName +
            ' ' +
            timingLabel +
            ' (' +
            formatDateBR(scheduledDate) +
            ')'

          let timingText = 'é <strong>hoje</strong>'
          if (timing === 'day_before') timingText = 'é <strong>amanhã</strong>'
          if (timing === 'advance')
            timingText = 'está agendado para daqui a <strong>' + diff + ' dias</strong>'

          let detailsHtml =
            '<li><strong>Titular de saúde:</strong> ' + escapeHtml(profileName) + '</li>'
          detailsHtml += '<li><strong>Exame agendado:</strong> ' + escapeHtml(nomeExame) + '</li>'
          if (tipoExame)
            detailsHtml += '<li><strong>Tipo:</strong> ' + escapeHtml(tipoExame) + '</li>'
          detailsHtml += '<li><strong>Data:</strong> ' + formatDateBR(scheduledDate) + '</li>'
          if (scheduledTime)
            detailsHtml += '<li><strong>Horário:</strong> ' + escapeHtml(scheduledTime) + '</li>'
          if (localRealizacao)
            detailsHtml += '<li><strong>Local:</strong> ' + escapeHtml(localRealizacao) + '</li>'
          if (instrucoesPreparo)
            detailsHtml +=
              '<li><strong>Orientações de preparo:</strong> ' +
              escapeHtml(instrucoesPreparo) +
              '</li>'

          const htmlBody =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #26362B; line-height: 1.5;">' +
            '<div style="text-align: center; margin-bottom: 24px;">' +
            '<h2 style="color: #4C7A5A; margin: 0; font-size: 24px;">SeviSaúde</h2>' +
            '<p style="color: #6B7A6F; font-size: 13px; margin: 4px 0 0 0;">Sua jornada de saúde, conectada.</p>' +
            '</div>' +
            '<div style="background-color: #F6F4EF; border: 1px solid #D9E2D4; border-radius: 16px; padding: 20px; margin-bottom: 20px;">' +
            '<h3 style="margin-top: 0; color: #26362B; font-size: 18px;">Lembrete de Exame Agendado</h3>' +
            '<p style="font-size: 14px; margin-bottom: 16px;">Olá, ' +
            escapeHtml(recip.nome || 'usuário') +
            '! Lembramos que o exame de <strong>' +
            escapeHtml(profileName) +
            '</strong> ' +
            timingText +
            ':</p>' +
            '<ul style="font-size: 14px; padding-left: 20px; margin-bottom: 0;">' +
            detailsHtml +
            '</ul>' +
            '</div>' +
            '<p style="font-size: 12px; color: #6B7A6F; line-height: 1.4;"><em>Nota de privacidade: este aviso não inclui diagnósticos clínicos, laudos de resultados ou histórico médico restrito.</em></p>' +
            '<div style="border-top: 1px solid #D9E2D4; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #8F9E93;">' +
            'Você está recebendo este lembrete conforme as preferências da sua conta no SeviSaúde. Para ajustar suas notificações, acesse "Meu perfil e configurações > Lembretes por E-mail".' +
            '</div>' +
            '</div>'

          const jobRecord = sendOrRecordJob(app, {
            deduplication_key: dedupKey,
            event_type: 'exame',
            target_id: ex.id,
            trigger_timing: timing,
            scheduled_date: scheduledDate,
            recipient_email: recip.email,
            recipient_user: recip.userId,
            profile: profileId,
            subject: subject,
            html: htmlBody,
            simulate: simulate,
          })

          if (jobRecord.status === 'sent') {
            results.sent++
          } else if (jobRecord.status === 'failed') {
            results.failed++
          }
          results.details.push({
            type: 'exame',
            id: ex.id,
            timing: timing,
            recipient: recip.email,
            status: jobRecord.status,
          })
        }
      }
    } catch (exErr) {
      console.error('[SeviSaúde Lembretes] Erro ao processar exame ' + ex.id + ':', exErr)
      results.failed++
    }
  }

  console.log(
    '[SeviSaúde Lembretes] Concluído. Processados:',
    results.processed,
    'Enviados:',
    results.sent,
    'Ignorados:',
    results.skipped,
    'Falhas:',
    results.failed,
  )
  return results
}

function getAuthorizedRecipients(app, ownerUserId, profileId) {
  const recipients = []
  const seenEmails = {}

  // 1. Titular / Dono da conta principal
  if (ownerUserId) {
    try {
      const ownerUser = app.findRecordById('_pb_users_auth_', ownerUserId)
      const email = (ownerUser.getString('email') || '').trim().toLowerCase()
      const isVerified = ownerUser.getBool('verified')

      if (email && isVerified) {
        recipients.push({
          userId: ownerUserId,
          email: email,
          nome: ownerUser.getString('name') || 'Titular',
          isFamily: false,
          prefs: getUserNotificationPrefs(app, ownerUserId),
        })
        seenEmails[email] = true
      }
    } catch (err) {
      console.warn('[SeviSaúde Lembretes] Erro ao carregar dono:', err)
    }
  }

  // 2. Familiares autorizados via profile_access_grants (status = 'accepted')
  if (profileId) {
    try {
      const grants = app.findRecordsByFilter(
        'profile_access_grants',
        'profile = "' + profileId + '" && status = "accepted"',
        'created',
        100,
        0,
      )

      for (let g = 0; g < grants.length; g++) {
        const grant = grants[g]
        const rawPerms = grant.getString('permissions') || '{}'
        let perms = {}
        try {
          perms = JSON.parse(rawPerms) || {}
        } catch (_) {}

        // Exigir permissão específica de notificações/lembretes:
        // 'notificacoes_ver' === true
        if (perms.notificacoes_ver !== true) {
          continue
        }

        const email = (grant.getString('grantee_email') || '').trim().toLowerCase()
        if (!email || seenEmails[email]) continue

        // Encontrar usuário do familiar para checar e-mail verificado e preferências
        let familyUserId = grant.getString('grantee_user')
        let isVerified = false
        let familyUserName = grant.getString('grantee_nome') || ''

        if (familyUserId) {
          try {
            const fUser = app.findRecordById('_pb_users_auth_', familyUserId)
            isVerified = fUser.getBool('verified')
            if (!familyUserName) familyUserName = fUser.getString('name') || ''
          } catch (_) {}
        } else {
          try {
            const fUser = app.findFirstRecordByFilter('_pb_users_auth_', 'email = "' + email + '"')
            familyUserId = fUser.id
            isVerified = fUser.getBool('verified')
            if (!familyUserName) familyUserName = fUser.getString('name') || ''
          } catch (_) {}
        }

        if (!isVerified) {
          continue
        }

        recipients.push({
          userId: familyUserId || null,
          email: email,
          nome: familyUserName || 'Familiar',
          isFamily: true,
          prefs: familyUserId
            ? getUserNotificationPrefs(app, familyUserId)
            : getUserNotificationPrefs(app, 'default'),
        })
        seenEmails[email] = true
      }
    } catch (gErr) {
      console.warn(
        '[SeviSaúde Lembretes] Erro ao buscar vínculos para perfil ' + profileId + ':',
        gErr,
      )
    }
  }

  return recipients
}

function alreadySentOrJobExists(app, dedupKey) {
  try {
    const job = app.findFirstRecordByFilter(
      'notification_jobs',
      'deduplication_key = "' + dedupKey + '"',
    )
    return job.getString('status') === 'sent'
  } catch (_) {
    return false
  }
}

function sendOrRecordJob(app, jobData) {
  const jobsCol = app.findCollectionByNameOrId('notification_jobs')
  let jobRecord
  try {
    jobRecord = app.findFirstRecordByFilter(
      'notification_jobs',
      'deduplication_key = "' + jobData.deduplication_key + '"',
    )
  } catch (_) {
    jobRecord = new Record(jobsCol)
    jobRecord.set('deduplication_key', jobData.deduplication_key)
    jobRecord.set('event_type', jobData.event_type)
    jobRecord.set('target_id', jobData.target_id)
    jobRecord.set('trigger_timing', jobData.trigger_timing)
    jobRecord.set('scheduled_date', jobData.scheduled_date)
    jobRecord.set('recipient_email', jobData.recipient_email)
    if (jobData.recipient_user) jobRecord.set('recipient_user', jobData.recipient_user)
    if (jobData.profile) jobRecord.set('profile', jobData.profile)
    jobRecord.set('subject', jobData.subject)
  }

  if (jobData.simulate) {
    jobRecord.set('status', 'sent')
    jobRecord.set('sent_at', new Date().toISOString())
    jobRecord.set('error_message', 'Simulação de envio (teste)')
    app.save(jobRecord)
    return { status: 'sent', id: jobRecord.id }
  }

  try {
    const senderAddress = app.settings().meta.senderAddress || 'nao-responder@sevisaude.com.br'
    const senderName = app.settings().meta.senderName || 'SeviSaúde'

    const message = new MailerMessage({
      from: {
        address: senderAddress,
        name: senderName,
      },
      to: [{ address: jobData.recipient_email }],
      subject: jobData.subject,
      html: jobData.html,
    })

    app.newMailClient().send(message)

    jobRecord.set('status', 'sent')
    jobRecord.set('sent_at', new Date().toISOString())
    jobRecord.set('error_message', '')
    app.save(jobRecord)
    return { status: 'sent', id: jobRecord.id }
  } catch (mailErr) {
    console.error(
      '[SeviSaúde Lembretes] Falha ao enviar e-mail para ' + jobData.recipient_email + ':',
      mailErr,
    )
    jobRecord.set('status', 'failed')
    jobRecord.set('error_message', (mailErr && mailErr.message) || String(mailErr))
    try {
      app.save(jobRecord)
    } catch (_) {}
    return { status: 'failed', error: String(mailErr) }
  }
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Exportar para que handlers isolados possam carregar via require(`${__hooks}/notifications.js`) se necessário
module.exports = {
  processHealthReminders: processHealthReminders,
  getUserNotificationPrefs: getUserNotificationPrefs,
  getAuthorizedRecipients: getAuthorizedRecipients,
}

// -------------------------------------------------------------
// Registro do Cron Job (a cada 15 minutos)
// Nota: Em PocketBase JSVM, cada callback roda em escopo isolado.
// Carregamos as funções deste mesmo arquivo via require(__filename ou `${__hooks}/notifications.js`).
// -------------------------------------------------------------
cronAdd('sevisaude_reminders_cron', '*/15 * * * *', () => {
  try {
    processHealthReminders($app)
  } catch (err) {
    console.error('[SeviSaúde Lembretes] Erro fatal no cron job:', err)
  }
})

// Disparar processamento pós-inicialização
onBootstrap((e) => {
  e.next()
  try {
    processHealthReminders(e.app || $app)
  } catch (err) {
    console.error('[SeviSaúde Lembretes] Erro no processamento de bootstrap:', err)
  }
})

// -------------------------------------------------------------
// Endpoint para acionamento e testes autenticados via API
// POST /backend/v1/sevisaude/process-reminders
// -------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/sevisaude/process-reminders',
  (e) => {
    try {
      const simulate = e.request.url.query().get('simulate') === 'true'
      const mod = require(`${__hooks}/notifications.js`)
      const res = mod.processHealthReminders(e.app, { simulate: simulate })
      return e.json(200, {
        success: true,
        message: 'Lembretes processados com sucesso.',
        data: res,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: (err && err.message) || String(err),
      })
    }
  },
  $apis.requireAuth(),
)
