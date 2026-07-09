// daily_task_sheet_script.js
// Separate Web App for the "Daily Task List" spreadsheet.
//
// INSTRUCTIONS:
// 1. Create a NEW Google Sheet named "Daily Task List"
// 2. Go to Extensions -> Apps Script -> Paste this code into Code.gs
// 3. Deploy as Web App (Execute as "Me", Access "Anyone")
// 4. Copy the deployed URL
// 5. Update DAILY_SHEET_WEB_APP_URL in AppContext.jsx

// ─────────────────────────────────────────────────
//  Spreadsheet ID — Replace with your actual ID
// ─────────────────────────────────────────────────
var SPREADSHEET_ID = '1TtffW2oS95WX5Xf0OtH7G-Vqsmv4eHXiTiKgnD_8lnQ';

function getOrCreateSheet(spreadsheetId, sheetName) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return { ss: ss, sheet: sheet };
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    // Row 1: Title header
    sheet.getRange(1, 1).setValue('Today Task :');
    // Row 2: Column headers
    var headers = ['Date', 'Project Name', 'Task / Remarks', 'Status', 'Start Time', 'End Time', 'Remark'];
    sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(2, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
    sheet.setFrozenRows(2);
    // Auto-resize columns
    for (var c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    // ── Log daily tasks on punch out ──
    if (action === 'log_daily_tasks') {
      var email = data.email;
      var fullName = data.name || 'Unknown';
      var date = data.date;
      var firstPunchIn = data.firstPunchIn;
      var lastPunchOut = data.lastPunchOut;
      var tasks = data.tasks;
      var remarks = data.remarks || '';

      var sheetName = fullName.split(' ')[0];

      if (SPREADSHEET_ID === 'YOUR_DAILY_TASK_LIST_SPREADSHEET_ID_HERE') {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Please set SPREADSHEET_ID in daily_task_sheet_script.js'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var result = getOrCreateSheet(SPREADSHEET_ID, sheetName);
      ensureHeaders(result.sheet);

      // Set the date title in row 1 (column B)
      result.sheet.getRange(1, 2).setValue(date);

      if (tasks && tasks.length > 0) {
        tasks.forEach(function(t) {
          result.sheet.appendRow([
            date,
            t.project || 'N/A',
            t.title || '-',
            t.status || 'Pending',
            firstPunchIn || '',
            lastPunchOut || '',
            t.remark || remarks || ''
          ]);
        });
      } else {
        result.sheet.appendRow([
          date,
          'No tasks logged',
          '-',
          '-',
          firstPunchIn || '',
          lastPunchOut || '',
          remarks || ''
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        rowsAdded: tasks ? tasks.length : 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── Get daily log for a user ──
    if (action === 'get_daily_log') {
      var fullName = data.name || 'Unknown';
      var sheetName = fullName.split(' ')[0];

      if (SPREADSHEET_ID === 'YOUR_DAILY_TASK_LIST_SPREADSHEET_ID_HERE') {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Please set SPREADSHEET_ID in daily_task_sheet_script.js'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() < 2) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', entries: [] })).setMimeType(ContentService.MimeType.JSON);
      }

      var rows = sheet.getDataRange().getValues();
      var entries = [];
      for (var i = 2; i < rows.length; i++) {
        if (rows[i][0]) {
          entries.push({
            date: rows[i][0],
            projectName: rows[i][1],
            taskRemarks: rows[i][2],
            status: rows[i][3],
            startTime: rows[i][4],
            endTime: rows[i][5],
            remark: rows[i][6]
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', entries: entries })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action: ' + action })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'Daily Task Sheet Web App is running' })).setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.JSON);
}
