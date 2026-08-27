/**
 * CAL TRACKER — backend API
 * Deploy this as a Web App (Deploy > New deployment > Web app).
 * Execute as: Me
 * Who has access: Anyone
 *
 * The frontend (hosted on GitHub Pages) calls this URL with ?token=... on
 * every request. The token itself lives only here, never in the HTML/JS.
 */

// ====== CONFIG — fill these in before deploying ======
const TOKEN = 'TOKEN';
const SHEET_ID = '1TTYLzaNUKQMdhs-WL-kPbmFeWAT8O6uiVyOB7MluCio';
const TZ = 'Asia/Bangkok';
// =======================================================

function doGet(e) {
  try {
    const params = e.parameter;
    if (params.token !== TOKEN) {
      return jsonOutput({ error: 'unauthorized' });
    }

    const action = params.action || 'data';

    if (action === 'data') {
      return jsonOutput(getDayData(params.date));
    }
    if (action === 'availability') {
      return jsonOutput(getAvailability());
    }
    if (action === 'saveTarget') {
      return jsonOutput(saveTarget(params));
    }
    if (action === 'addLog') {
      return jsonOutput(addLog(params));
    }
    if (action === 'updateLog') {
      return jsonOutput(updateLog(params));
    }
    if (action === 'deleteLog') {
      return jsonOutput(deleteLog(params));
    }

    return jsonOutput({ error: 'unknown action: ' + action });
  } catch (err) {
    return jsonOutput({ error: String(err) });
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSS() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function fmtDate(d) {
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function fmtTime(d) {
  return Utilities.formatDate(d, TZ, 'HH:mm');
}

/** All log rows for one date, plus totals and current targets. */
function getDayData(dateStr) {
  if (!dateStr) {
    dateStr = fmtDate(new Date());
  }

  const sheet = getSS().getSheetByName('Log');
  const data = sheet.getDataRange().getValues();
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    if (fmtDate(new Date(row[0])) !== dateStr) continue;

    rows.push({
      rowNumber: i + 1,      // 1-indexed sheet row (header = row 1)
      time: row[1] ? fmtTime(new Date(row[1])) : '',
      type: row[2],          // 'In' or 'Out'
      method: row[3],        // Manual / Photo / Photo+Search
      item: row[4],
      calories: Number(row[5]) || 0,
      protein: Number(row[6]) || 0,
      carbs: Number(row[7]) || 0,
      fat: Number(row[8]) || 0,
      notes: row[9] || ''
    });
  }

  rows.sort((a, b) => a.time.localeCompare(b.time));

  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, caloriesOut: 0 };
  rows.forEach(r => {
    if (r.type === 'Out') {
      totals.caloriesOut += r.calories;
    } else {
      totals.calories += r.calories;
      totals.protein += r.protein;
      totals.carbs += r.carbs;
      totals.fat += r.fat;
    }
  });
  totals.netCalories = totals.calories - totals.caloriesOut;

  return {
    date: dateStr,
    logs: rows,
    totals: totals,
    targets: getTargets()
  };
}

/** Append a new log row — called by the manual entry form. */
function addLog(p) {
  const sheet = getSS().getSheetByName('Log');
  const now = new Date();
  sheet.appendRow([
    fmtDate(now),             // Date
    now,                      // Time (full Date object → Apps Script formats as time)
    p.type || 'In',           // Type (In/Out)
    'Manual',                 // Entry Method
    p.item || '',             // Item/Meal
    Number(p.calories) || 0,  // Calories
    Number(p.protein) || 0,   // Protein (g)
    Number(p.carbs) || 0,     // Carbs (g)
    Number(p.fat) || 0,       // Fat (g)
    p.notes || ''             // Notes
  ]);
  return { success: true };
}

/** Update an existing log row by its sheet row number. */
function updateLog(p) {
  const rowNum = Number(p.rowNumber);
  if (!rowNum) return { error: 'missing rowNumber' };
  const sheet = getSS().getSheetByName('Log');
  const lastCol = sheet.getLastColumn();
  // Preserve original date and time — only update user-editable fields
  sheet.getRange(rowNum, 3).setValue(p.type || 'In');       // Type
  sheet.getRange(rowNum, 4).setValue('Manual');              // Entry Method
  sheet.getRange(rowNum, 5).setValue(p.item || '');          // Item
  sheet.getRange(rowNum, 6).setValue(Number(p.calories)||0); // Calories
  sheet.getRange(rowNum, 7).setValue(Number(p.protein)||0);  // Protein
  sheet.getRange(rowNum, 8).setValue(Number(p.carbs)||0);    // Carbs
  sheet.getRange(rowNum, 9).setValue(Number(p.fat)||0);      // Fat
  sheet.getRange(rowNum, 10).setValue(p.notes || '');        // Notes
  return { success: true };
}

/** Delete a log row by its sheet row number. */
function deleteLog(p) {
  const rowNum = Number(p.rowNumber);
  if (!rowNum) return { error: 'missing rowNumber' };
  const sheet = getSS().getSheetByName('Log');
  sheet.deleteRow(rowNum);
  return { success: true };
}

function getTargets() {
  const sheet = getSS().getSheetByName('Targets');
  const data = sheet.getDataRange().getValues();
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  for (let i = 1; i < data.length; i++) {
    const name = (data[i][0] || '').toString().toLowerCase();
    const val = Number(data[i][1]) || 0;
    if (name.indexOf('calorie') === 0) t.calories = val;
    else if (name.indexOf('protein') === 0) t.protein = val;
    else if (name.indexOf('carb') === 0) t.carbs = val;
    else if (name.indexOf('fat') === 0) t.fat = val;
  }
  return t;
}

/** Overwrites the Targets sheet — applies to all days, past and future. */
function saveTarget(p) {
  const sheet = getSS().getSheetByName('Targets');
  const data = sheet.getDataRange().getValues();
  const labelToKey = { calorie: 'calories', protein: 'protein', carb: 'carbs', fat: 'fat' };

  for (let i = 1; i < data.length; i++) {
    const name = (data[i][0] || '').toString().toLowerCase();
    for (const prefix in labelToKey) {
      const key = labelToKey[prefix];
      if (name.indexOf(prefix) === 0 && p[key] !== undefined && p[key] !== '') {
        sheet.getRange(i + 1, 2).setValue(Number(p[key]));
      }
    }
  }
  return { success: true, targets: getTargets() };
}

/** Every date (YYYY-MM-DD) that has at least one log row — used to grey out empty dates. */
function getAvailability() {
  const sheet = getSS().getSheetByName('Log');
  const data = sheet.getDataRange().getValues();
  const set = {};
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    set[fmtDate(new Date(data[i][0]))] = true;
  }
  return { dates: Object.keys(set) };
}