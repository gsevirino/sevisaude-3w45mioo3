migrate(
  (app) => {
    // Backfill: garantir que todo usuário tenha um health_profile próprio associado
    // e que data_nascimento e contato de emergência do user.meta sejam sincronizados
    const users = app.findRecordsByFilter('users', 'id != ""', 'created', 500, 0)
    const profCol = app.findCollectionByNameOrId('health_profiles')

    for (let i = 0; i < users.length; i++) {
      const u = users[i]
      const userId = u.id

      let ownProfile
      try {
        ownProfile = app.findFirstRecordByFilter(
          'health_profiles',
          'user = "' + userId + '" && is_proprio = true',
        )
      } catch (_) {
        try {
          ownProfile = app.findFirstRecordByFilter('health_profiles', 'user = "' + userId + '"')
        } catch (__) {}
      }

      const metaRaw = u.get('meta') || {}
      let metaObj = {}
      if (typeof metaRaw === 'string') {
        try {
          metaObj = JSON.parse(metaRaw)
        } catch (_) {}
      } else if (metaRaw && typeof metaRaw === 'object') {
        metaObj = metaRaw
      }

      if (!ownProfile) {
        const prof = new Record(profCol)
        const userName = (u.getString('name') || '').trim() || 'Titular'
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
        app.save(prof)
      } else {
        // Se já existe mas faltam campos que estavam no user.meta, sincronizar
        let changed = false
        if (!ownProfile.getBool('is_proprio')) {
          ownProfile.set('is_proprio', true)
          changed = true
        }
        if (!ownProfile.getString('data_nascimento') && metaObj.dataNascimento) {
          ownProfile.set('data_nascimento', metaObj.dataNascimento)
          changed = true
        }
        if (!ownProfile.getString('contato_emergencia_nome') && metaObj.contatoEmergenciaNome) {
          ownProfile.set('contato_emergencia_nome', metaObj.contatoEmergenciaNome)
          changed = true
        }
        if (
          !ownProfile.getString('contato_emergencia_telefone') &&
          metaObj.contatoEmergenciaTelefone
        ) {
          ownProfile.set('contato_emergencia_telefone', metaObj.contatoEmergenciaTelefone)
          changed = true
        }
        if (
          !ownProfile.getString('contato_emergencia_parentesco') &&
          metaObj.contatoEmergenciaParentesco
        ) {
          ownProfile.set('contato_emergencia_parentesco', metaObj.contatoEmergenciaParentesco)
          changed = true
        }
        if (changed) {
          app.save(ownProfile)
        }
      }
    }
  },
  (app) => {
    // Reversão no-op para preservar dados
  },
)
