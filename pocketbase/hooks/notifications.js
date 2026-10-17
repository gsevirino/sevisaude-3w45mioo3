// pocketbase/hooks/notifications.js
// SeviSaúde: Sistema de Lembretes por E-mail no Backend
// Cron periódica a cada 15 minutos + endpoint de disparo /backend/v1/sevisaude/process-reminders

function runHealthReminders(appInstance, options) {
  function pad(n) {
    return n < 10 ? '0' + n : '' + n
  }

  function formatDateBR(isoDateStr) {
    if (!isoDateStr) return ''
    var clean = isoDateStr.split('T')[0].split(' ')[0]
    var parts = clean.split('-')
    if (parts.length === 3) {
      return parts[2] + '/' + parts[1] + '/' + parts[0]
    }
    return isoDateStr
  }

  function getTodayIsoString(now) {
    var y = now.getUTCFullYear()
    var m = pad(now.getUTCMonth() + 1)
    var d = pad(now.getUTCDate())
    return y + '-' + m + '-' + d
  }

  function daysDiff(targetIso, todayIso) {
    var p1 = targetIso.split('-')
    var p2 = todayIso.split('-')
    var d1 = Date.UTC(parseInt(p1[0], 10), parseInt(p1[1], 10) - 1, parseInt(p1[2], 10))
    var d2 = Date.UTC(parseInt(p2[0], 10), parseInt(p2[1], 10) - 1, parseInt(p2[2], 10))
    return Math.round((d1 - d2) / (1000 * 60 * 60 * 24))
  }

  function getUserNotificationPrefs(app, userId) {
    try {
      var prefRecord = app.findFirstRecordByFilter(
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

  function escapeHtml(str) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function alreadySentOrJobExists(app, dedupKey) {
    try {
      var job = app.findFirstRecordByFilter(
        'notification_jobs',
        'deduplication_key = "' + dedupKey + '"',
      )
      return job.getString('status') === 'sent'
    } catch (_) {
      return false
    }
  }

  function sendOrRecordJob(app, jobData) {
    var jobsCol = app.findCollectionByNameOrId('notification_jobs')
    var jobRecord
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
      var meta = (app.settings() && app.settings().meta) || {}
      var senderAddress = meta.senderAddress || 'nao-responder@sevisaude.com.br'
      var senderName = meta.senderName || 'SeviSaúde'

      var message = new MailerMessage({
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

  function getAuthorizedRecipients(app, ownerUserId, profileId) {
    var recipients = []
    var seenEmails = {}

    if (ownerUserId) {
      try {
        var ownerUser = app.findRecordById('_pb_users_auth_', ownerUserId)
        var email = (ownerUser.getString('email') || '').trim().toLowerCase()
        var isVerified = ownerUser.getBool('verified')

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

    if (profileId) {
      try {
        var grants = app.findRecordsByFilter(
          'profile_access_grants',
          'profile = "' + profileId + '" && status = "accepted"',
          'created',
          100,
          0,
        )

        for (var g = 0; g < grants.length; g++) {
          var grant = grants[g]
          var rawPerms = grant.getString('permissions') || '{}'
          var perms = {}
          try {
            perms = JSON.parse(rawPerms) || {}
          } catch (_) {}

          if (perms.notificacoes_ver !== true) {
            continue
          }

          var gEmail = (grant.getString('grantee_email') || '').trim().toLowerCase()
          if (!gEmail || seenEmails[gEmail]) continue

          var familyUserId = grant.getString('grantee_user')
          var isVerifiedFamily = false
          var familyUserName = grant.getString('grantee_nome') || ''

          if (familyUserId) {
            try {
              var fUser = app.findRecordById('_pb_users_auth_', familyUserId)
              isVerifiedFamily = fUser.getBool('verified')
              if (!familyUserName) familyUserName = fUser.getString('name') || ''
            } catch (_) {}
          } else {
            try {
              var fUser2 = app.findFirstRecordByFilter(
                '_pb_users_auth_',
                'email = "' + gEmail + '"',
              )
              familyUserId = fUser2.id
              isVerifiedFamily = fUser2.getBool('verified')
              if (!familyUserName) familyUserName = fUser2.getString('name') || ''
            } catch (_) {}
          }

          if (!isVerifiedFamily) {
            continue
          }

          recipients.push({
            userId: familyUserId || null,
            email: gEmail,
            nome: familyUserName || 'Familiar',
            isFamily: true,
            prefs: familyUserId
              ? getUserNotificationPrefs(app, familyUserId)
              : getUserNotificationPrefs(app, 'default'),
          })
          seenEmails[gEmail] = true
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

  var app = appInstance
  var opts = options || {}
  var simulate = !!opts.simulate
  var results = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  }

  var now = new Date()
  var todayIso = getTodayIsoString(now)
  console.log('[SeviSaúde Lembretes] Processando lembretes na data UTC:', todayIso)

  // 1. Processar Consultas Agendadas
  var consultas = []
  try {
    consultas = app.findRecordsByFilter('consultas', 'status = "Agendada"', 'data', 500, 0)
  } catch (err) {
    console.error('[SeviSaúde Lembretes] Erro ao buscar consultas:', err)
  }

  for (var i = 0; i < consultas.length; i++) {
    var c = consultas[i]
    results.processed++
    try {
      var dataRaw = c.getString('data') || ''
      var scheduledDate = dataRaw.split('T')[0].split(' ')[0]
      if (!scheduledDate) continue

      var diff = daysDiff(scheduledDate, todayIso)
      if (diff < 0) continue

      var profileId = c.getString('profile')
      var profileName = 'Titular'
      var profileOwnerUserId = c.getString('userId')
      if (profileId) {
        try {
          var prof = app.findRecordById('health_profiles', profileId)
          profileName = prof.getString('nome') || profileName
          profileOwnerUserId = prof.getString('user') || profileOwnerUserId
        } catch (_) {}
      }

      var medicoNome = ''
      var especialidade = ''
      var medicoId = c.getString('medico')
      if (medicoId) {
        try {
          var mRec = app.findRecordById('medicos', medicoId)
          medicoNome = mRec.getString('nome') || ''
          especialidade = mRec.getString('especialidade') || ''
        } catch (_) {}
      }
      var horario = c.getString('horario') || ''
      var local = c.getString('local') || ''
      var tipo = c.getString('tipo') || 'Presencial'

      var recipients = getAuthorizedRecipients(app, profileOwnerUserId, profileId)

      for (var r = 0; r < recipients.length; r++) {
        var recip = recipients[r]
        var prefs = recip.prefs

        if (!prefs.enabled || !prefs.appointments_enabled) {
          results.skipped++
          continue
        }
        if (recip.isFamily && !prefs.family_opt_in) {
          results.skipped++
          continue
        }

        var timings = []
        if (diff === 0 && prefs.notify_same_day) timings.push('same_day')
        if (diff === 1 && prefs.notify_day_before) timings.push('day_before')
        if (diff > 1 && diff === prefs.days_advance) timings.push('advance')

        for (var t = 0; t < timings.length; t++) {
          var timing = timings[t]
          var dedupKey = 'consulta_' + c.id + '_' + timing + '_' + recip.email + '_' + scheduledDate
          if (alreadySentOrJobExists(app, dedupKey)) continue

          var timingLabel =
            timing === 'same_day'
              ? 'HOJE'
              : timing === 'day_before'
                ? 'AMANHÃ'
                : 'em ' + diff + ' dias'
          var subject =
            'SeviSaúde: Lembrete de consulta de ' +
            profileName +
            ' ' +
            timingLabel +
            ' (' +
            formatDateBR(scheduledDate) +
            ')'

          var timingText = 'é <strong>hoje</strong>'
          if (timing === 'day_before') timingText = 'é <strong>amanhã</strong>'
          if (timing === 'advance')
            timingText = 'está agendada para daqui a <strong>' + diff + ' dias</strong>'

          var detailsHtml =
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

          var htmlBody =
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

          var jobRecord = sendOrRecordJob(app, {
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

          if (jobRecord.status === 'sent') results.sent++
          else if (jobRecord.status === 'failed') results.failed++
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
  var exames = []
  try {
    exames = app.findRecordsByFilter('exames', 'status = "Agendado"', 'created', 500, 0)
  } catch (err) {
    console.error('[SeviSaúde Lembretes] Erro ao buscar exames:', err)
  }

  for (var j = 0; j < exames.length; j++) {
    var ex = exames[j]
    results.processed++
    try {
      var dataHoraAgendada = ex.getString('data_hora_agendada') || ''
      var dataRealizado = ex.getString('data_realizado') || ''
      var exScheduledDate = ''
      var exScheduledTime = ''

      if (dataHoraAgendada) {
        var parts = dataHoraAgendada.split(' ')
        exScheduledDate = parts[0]
        if (parts.length > 1) exScheduledTime = parts[1]
      } else if (dataRealizado) {
        exScheduledDate = dataRealizado.split('T')[0].split(' ')[0]
      }

      if (!exScheduledDate) continue

      var exDiff = daysDiff(exScheduledDate, todayIso)
      if (exDiff < 0) continue

      var exProfileId = ex.getString('profile')
      var exProfileName = 'Titular'
      var exProfileOwnerUserId = ex.getString('userId')
      if (exProfileId) {
        try {
          var exProf = app.findRecordById('health_profiles', exProfileId)
          exProfileName = exProf.getString('nome') || exProfileName
          exProfileOwnerUserId = exProf.getString('user') || exProfileOwnerUserId
        } catch (_) {}
      }

      var nomeExame = ex.getString('nome') || 'Exame de saúde'
      var tipoExame = ex.getString('tipo') || ''
      var localRealizacao = ex.getString('local_realizacao') || ''
      var instrucoesPreparo = ex.getString('instrucoes_preparo') || ''

      var exRecipients = getAuthorizedRecipients(app, exProfileOwnerUserId, exProfileId)

      for (var r2 = 0; r2 < exRecipients.length; r2++) {
        var recip2 = exRecipients[r2]
        var prefs2 = recip2.prefs

        if (!prefs2.enabled || !prefs2.exams_enabled) {
          results.skipped++
          continue
        }
        if (recip2.isFamily && !prefs2.family_opt_in) {
          results.skipped++
          continue
        }

        var timings2 = []
        if (exDiff === 0 && prefs2.notify_same_day) timings2.push('same_day')
        if (exDiff === 1 && prefs2.notify_day_before) timings2.push('day_before')
        if (exDiff > 1 && exDiff === prefs2.days_advance) timings2.push('advance')

        for (var t2 = 0; t2 < timings2.length; t2++) {
          var timing2 = timings2[t2]
          var dedupKey2 =
            'exame_' + ex.id + '_' + timing2 + '_' + recip2.email + '_' + exScheduledDate
          if (alreadySentOrJobExists(app, dedupKey2)) continue

          var timingLabel2 =
            timing2 === 'same_day'
              ? 'HOJE'
              : timing2 === 'day_before'
                ? 'AMANHÃ'
                : 'em ' + exDiff + ' dias'
          var subject2 =
            'SeviSaúde: Lembrete de exame de ' +
            exProfileName +
            ' ' +
            timingLabel2 +
            ' (' +
            formatDateBR(exScheduledDate) +
            ')'

          var timingText2 = 'é <strong>hoje</strong>'
          if (timing2 === 'day_before') timingText2 = 'é <strong>amanhã</strong>'
          if (timing2 === 'advance')
            timingText2 = 'está agendado para daqui a <strong>' + exDiff + ' dias</strong>'

          var detailsHtml2 =
            '<li><strong>Titular de saúde:</strong> ' + escapeHtml(exProfileName) + '</li>'
          detailsHtml2 += '<li><strong>Exame agendado:</strong> ' + escapeHtml(nomeExame) + '</li>'
          if (tipoExame)
            detailsHtml2 += '<li><strong>Tipo:</strong> ' + escapeHtml(tipoExame) + '</li>'
          detailsHtml2 += '<li><strong>Data:</strong> ' + formatDateBR(exScheduledDate) + '</li>'
          if (exScheduledTime)
            detailsHtml2 += '<li><strong>Horário:</strong> ' + escapeHtml(exScheduledTime) + '</li>'
          if (localRealizacao)
            detailsHtml2 += '<li><strong>Local:</strong> ' + escapeHtml(localRealizacao) + '</li>'
          if (instrucoesPreparo)
            detailsHtml2 +=
              '<li><strong>Orientações de preparo:</strong> ' +
              escapeHtml(instrucoesPreparo) +
              '</li>'

          var htmlBody2 =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #26362B; line-height: 1.5;">' +
            '<div style="text-align: center; margin-bottom: 24px;">' +
            '<h2 style="color: #4C7A5A; margin: 0; font-size: 24px;">SeviSaúde</h2>' +
            '<p style="color: #6B7A6F; font-size: 13px; margin: 4px 0 0 0;">Sua jornada de saúde, conectada.</p>' +
            '</div>' +
            '<div style="background-color: #F6F4EF; border: 1px solid #D9E2D4; border-radius: 16px; padding: 20px; margin-bottom: 20px;">' +
            '<h3 style="margin-top: 0; color: #26362B; font-size: 18px;">Lembrete de Exame Agendado</h3>' +
            '<p style="font-size: 14px; margin-bottom: 16px;">Olá, ' +
            escapeHtml(recip2.nome || 'usuário') +
            '! Lembramos que o exame de <strong>' +
            escapeHtml(exProfileName) +
            '</strong> ' +
            timingText2 +
            ':</p>' +
            '<ul style="font-size: 14px; padding-left: 20px; margin-bottom: 0;">' +
            detailsHtml2 +
            '</ul>' +
            '</div>' +
            '<p style="font-size: 12px; color: #6B7A6F; line-height: 1.4;"><em>Nota de privacidade: este aviso não inclui diagnósticos clínicos, laudos de resultados ou histórico médico restrito.</em></p>' +
            '<div style="border-top: 1px solid #D9E2D4; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #8F9E93;">' +
            'Você está recebendo este lembrete conforme as preferências da sua conta no SeviSaúde. Para ajustar suas notificações, acesse "Meu perfil e configurações > Lembretes por E-mail".' +
            '</div>' +
            '</div>'

          var jobRecord2 = sendOrRecordJob(app, {
            deduplication_key: dedupKey2,
            event_type: 'exame',
            target_id: ex.id,
            trigger_timing: timing2,
            scheduled_date: exScheduledDate,
            recipient_email: recip2.email,
            recipient_user: recip2.userId,
            profile: exProfileId,
            subject: subject2,
            html: htmlBody2,
            simulate: simulate,
          })

          if (jobRecord2.status === 'sent') results.sent++
          else if (jobRecord2.status === 'failed') results.failed++
          results.details.push({
            type: 'exame',
            id: ex.id,
            timing: timing2,
            recipient: recip2.email,
            status: jobRecord2.status,
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

// -------------------------------------------------------------
// Registro do Cron Job (a cada 15 minutos)
// -------------------------------------------------------------
cronAdd('sevisaude_reminders_cron', '*/15 * * * *', () => {
  try {
    runHealthReminders($app, { simulate: false })
  } catch (err) {
    console.error('[SeviSaúde Lembretes] Erro fatal no cron job:', err)
  }
})

// Disparar processamento pós-inicialização
onBootstrap((e) => {
  e.next()
  try {
    runHealthReminders(e.app || $app, { simulate: false })
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
      var simulate = e.request && e.request.url && e.request.url.query().get('simulate') === 'true'
      var res = runHealthReminders(e.app || $app, { simulate: simulate })
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

// Endpoint de diagnóstico temporário para testar gateway de IA
routerAdd(
  'POST',
  '/backend/v1/sevisaude/test-ai',
  (e) => {
    const results = {}
    try {
      const textRes = $ai.chat({
        model: 'fast',
        messages: [{ role: 'user', content: 'responda "ok"' }],
      })
      results.fastText = { ok: true, reply: textRes.choices[0].message.content }
    } catch (err) {
      results.fastText = { ok: false, err: err.message, status: err.status }
    }

    try {
      const reasonRes = $ai.chat({
        model: 'reasoning',
        messages: [{ role: 'user', content: 'responda "ok"' }],
      })
      results.reasoningText = { ok: true, reply: reasonRes.choices[0].message.content }
    } catch (err) {
      results.reasoningText = { ok: false, err: err.message, status: err.status }
    }

    // Testar com um pixel minúsculo em base64 PNG
    // 1x1 transparente
    const tinyPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAopt'
    try {
      const visionRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'O que você vê?' },
              { type: 'image_url', image_url: { url: tinyPng } },
            ],
          },
        ],
      })
      results.fastVision = { ok: true, reply: visionRes.choices[0].message.content }
    } catch (err) {
      results.fastVision = { ok: false, err: err.message, status: err.status }
    }

    try {
      const visionResReasoning = $ai.chat({
        model: 'reasoning',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'O que você vê?' },
              { type: 'image_url', image_url: { url: tinyPng } },
            ],
          },
        ],
      })
      results.reasoningVision = { ok: true, reply: visionResReasoning.choices[0].message.content }
    } catch (err) {
      results.reasoningVision = { ok: false, err: err.message, status: err.status }
    }

    // Testar formato input_text / input_image
    try {
      const inputFormatRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'O que você vê?' },
              { type: 'input_image', image_url: tinyPng },
            ],
          },
        ],
      })
      results.inputFormat = { ok: true, reply: inputFormatRes.choices[0].message.content }
    } catch (err) {
      results.inputFormat = { ok: false, err: err.message, status: err.status }
    }

    return e.json(200, results)
  },
  $apis.requireAuth(),
)
