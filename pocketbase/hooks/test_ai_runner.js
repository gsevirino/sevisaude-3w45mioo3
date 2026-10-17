// pocketbase/hooks/test_ai_runner.js
onBootstrap((e) => {
  e.next()
  try {
    const hasDoc = typeof $documents !== 'undefined'
    let docMethods = []
    if (hasDoc) {
      docMethods = Object.keys($documents)
    }

    const app = e.app || $app
    const setCol = app.findCollectionByNameOrId('app_settings')
    let r
    try {
      r = app.findFirstRecordByFilter('app_settings', 'key = "diag_raw_400"')
    } catch (_) {
      r = new Record(setCol)
      r.set('key', 'diag_raw_400')
    }
    r.set('value', 'hasDoc: ' + hasDoc + ' keys: ' + docMethods.join(', '))
    app.save(r)
  } catch (err) {
    console.error(err)
  }
})
