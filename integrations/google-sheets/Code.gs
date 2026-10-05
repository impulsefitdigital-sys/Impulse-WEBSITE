/**
 * Impulse Fitness Maroc — archive des demandes du site dans ce Google Sheet.
 *
 * Reçoit les demandes envoyées par la base Supabase (déclencheur sur contact_requests)
 * et les écrit dans l'onglet « Demandes » : une ligne par demande, mise à jour en place
 * (clé : colonne ID). Rien n'est jamais effacé : une demande supprimée du site passe
 * au statut « Supprimée du site ».
 *
 * Installation : voir README.md (même dossier) ou Admin → Paramètres → Intégrations.
 */

// Clé secrète : la même que dans Admin → Paramètres → Intégrations.
const SECRET = "COLLER_ICI_LA_CLE_SECRETE";
const SHEET_NAME = "Demandes";

const COLUMNS = [
  ["id", "ID"], ["numero", "N° devis"], ["date", "Date"], ["type", "Type"], ["statut", "Statut"],
  ["nom", "Nom"], ["telephone", "Téléphone"], ["email", "Email"], ["entreprise", "Entreprise"],
  ["ville", "Ville"], ["usage", "Usage"], ["equipements", "Équipements"], ["message", "Message"],
  ["montant", "Montant (MAD)"], ["relance", "Relance"], ["notes", "Notes"],
  ["source", "Source"], ["support", "Support"], ["campagne", "Campagne"], ["page_arrivee", "Page d'arrivée"],
];

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "json" });
  }
  if (!body || body.secret !== SECRET || SECRET === "COLLER_ICI_LA_CLE_SECRETE") {
    return json_({ ok: false, error: "secret" });
  }
  const sheet = sheet_();
  if (body.action === "ping") return json_({ ok: true, sheet: SHEET_NAME });

  const rows = Array.isArray(body.rows) ? body.rows : [];
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ids = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); })
      : [];
    rows.forEach(function (row) {
      // les valeurs commençant par = + - @ sont préfixées : pas d'injection de formule
      const values = COLUMNS.map(function (c) {
        const v = row[c[0]] == null ? "" : String(row[c[0]]);
        return /^[=+\-@]/.test(v) ? "'" + v : v;
      });
      const index = ids.indexOf(String(row.id));
      if (index >= 0) {
        sheet.getRange(index + 2, 1, 1, values.length).setValues([values]);
      } else {
        sheet.appendRow(values);
        ids.push(String(row.id));
      }
    });
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, count: rows.length });
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(function (c) { return c[1]; }));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold").setBackground("#171717").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    sheet.hideColumns(1); // colonne technique ID
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
