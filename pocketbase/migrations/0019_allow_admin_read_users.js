migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    // Permite que o próprio usuário visualize/liste seu registro OU que a administradora Gislaine liste e veja usuários (para o painel administrativo)
    usersCol.listRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')"
    usersCol.viewRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.email = 'gislaine.sevirino@gmail.com')"
    app.save(usersCol)
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      usersCol.listRule = 'id = @request.auth.id'
      usersCol.viewRule = 'id = @request.auth.id'
      app.save(usersCol)
    } catch (_) {}
  },
)
