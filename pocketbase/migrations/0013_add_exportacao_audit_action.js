// pocketbase/migrations/0013_add_exportacao_audit_action.js
// Adiciona a ação "exportacao_dados" ao select de ações do access_audit_logs

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('access_audit_logs')
    const actionField = col.fields.getByName('action')
    if (actionField) {
      actionField.values = [
        'invite_created',
        'invite_accepted',
        'permissions_updated',
        'grant_revoked',
        'invite_declined',
        'exportacao_dados',
      ]
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('access_audit_logs')
      const actionField = col.fields.getByName('action')
      if (actionField) {
        actionField.values = [
          'invite_created',
          'invite_accepted',
          'permissions_updated',
          'grant_revoked',
          'invite_declined',
        ]
        app.save(col)
      }
    } catch (_) {}
  },
)
