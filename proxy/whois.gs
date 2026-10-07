// Google Apps Script közvetítő a .hu domainek lejáratának lekérdezéséhez (info.domain.hu).
// Miért kell: az info.domain.hu nem engedi a böngészőből érkező (CORS) kéréseket.
// Csak .hu domaint és csak az info.domain.hu oldalát kéri le (nem nyílt proxy); a feldolgozás az appban történik.
// Telepítés: SETUP.md → „Domain lejárat lekérdezés”.

function doGet(e) {
  var domain = String((e.parameter && e.parameter.domain) || '').trim().toLowerCase()
  if (!/^[^\s\/:?#]+\.hu$/.test(domain)) return valasz({ hiba: 'Csak .hu domain kérdezhető le.' })

  var r = UrlFetchApp.fetch('https://info.domain.hu/webwhois/hu/domain/' + encodeURIComponent(domain), { method: 'post', muteHttpExceptions: true })
  if (r.getResponseCode() !== 200) return valasz({ hiba: 'Az info.domain.hu nem válaszolt (' + r.getResponseCode() + ').' })
  return valasz({ html: r.getContentText() })
}

function valasz(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)
}
