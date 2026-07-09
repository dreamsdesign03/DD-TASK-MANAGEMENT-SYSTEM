// daily_task_sheet_script.js
// Separate Web App for the "Daily Task List" spreadsheet.
//
// INSTRUCTIONS:
// 1. Create a NEW Google Sheet named "Daily Task List"
// 2. Go to Extensions -> Apps Script -> Paste this code into Code.gs
// 3. Deploy as Web App (Execute as "Me", Access "Anyone")
// 4. Copy the deployed URL
// 5. Update DAILY_SHEET_WEB_APP_URL in AppContext.jsx

var SPREADSHEET_ID = '1TtffW2oS95WX5Xf0OtH7G-Vqsmv4eHXiTiKgnD_8lnQ';
var HEADER_BG = '#0B5C1F';
var TITLE_BG = '#D9EAD3';

function getOrCreateSheet(spreadsheetId, sheetName) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return { ss: ss, sheet: sheet };
}

function appendDailyLog(sheet, date, startTime, endTime, tasks) {
  // date is "YYYY-MM-DD" from frontend
  var parts = date.split('-');
  var headerDate = parts[2] + '-' + parts[1] + '-' + parts[0]; // DD-MM-YYYY for header
  var dispDate = parseInt(parts[2]) + '/' + parseInt(parts[1]) + '/' + parts[0]; // D/M/YYYY for col A
  var headerText = 'Today Task : ' + headerDate;

  // Check duplicate: scan for existing header
  var range = sheet.getDataRange();
  var existingData = range.getValues();
  for (var i = 0; i < existingData.length; i++) {
    if (String(existingData[i][0]).trim() === headerText) {
      return { status: 'skipped', reason: 'already exists' };
    }
  }

  var lastRow = sheet.getLastRow();
  var totalTaskRows = tasks && tasks.length > 0 ? tasks.length : 1;
  var blankBefore = lastRow > 0 ? 1 : 0;
  var neededRows = blankBefore + 2 + totalTaskRows + 1; // blank + header + title + tasks + trailing blank

  if (neededRows <= 0) return { status: 'skipped', reason: 'no data' };

  // Insert rows if sheet already has content
  if (lastRow > 0) {
    sheet.insertRowsAfter(lastRow, neededRows);
  } else {
    // For empty sheet, the rows already exist
  }

  var baseRow = lastRow > 0 ? lastRow + 1 : 0;
  var blankBeforeRow = baseRow > 0 ? baseRow : null;
  var headerRow = blankBeforeRow ? blankBeforeRow + 1 : 1;
  var titleRow = headerRow + 1;
  var dataStartRow = titleRow + 1;
  var trailingBlankRow = dataStartRow + totalTaskRows;

  // ── Header row: dark green, merged A:G, white bold centered ──
  var hdrRange = sheet.getRange(headerRow, 1, 1, 7);
  hdrRange.merge();
  hdrRange.setValue(headerText);
  hdrRange.setBackground(HEADER_BG);
  hdrRange.setFontColor('#FFFFFF');
  hdrRange.setFontWeight('bold');
  hdrRange.setFontSize(12);
  hdrRange.setHorizontalAlignment('center');
  hdrRange.setVerticalAlignment('middle');
  sheet.setRowHeight(headerRow, 34);

  // ── Title row: light green, bold ──
  var titleArr = [['Date', 'Project Name', 'Task / Remarks', 'Status', 'Start Time', 'End Time', 'Remark']];
  var ttlRange = sheet.getRange(titleRow, 1, 1, 7);
  ttlRange.setValues(titleArr);
  ttlRange.setBackground(TITLE_BG);
  ttlRange.setFontColor('#000000');
  ttlRange.setFontWeight('bold');
  ttlRange.setHorizontalAlignment('center');
  sheet.setRowHeight(titleRow, 26);

  // ── Task data rows ──
  var prevProject = '';
  var rows = [];
  for (var t = 0; t < totalTaskRows; t++) {
    var task = tasks && tasks.length > 0 ? tasks[t] : null;
    var project = task ? task.project || '' : '';
    var title = task ? task.title || '-' : 'No tasks logged';
    var status = task ? task.status || 'Pending' : '-';
    var remark = task ? task.remark || '' : '';

    rows.push([
      t === 0 ? dispDate : '',
      project !== prevProject && project !== '' ? project : '',
      title,
      status,
      t === 0 ? startTime : '',
      t === totalTaskRows - 1 ? endTime : '',
      remark
    ]);
    if (task) prevProject = project;
  }

  var dataRange = sheet.getRange(dataStartRow, 1, rows.length, 7);
  dataRange.setValues(rows);
  dataRange.setVerticalAlignment('top');
  dataRange.setFontSize(10);

  // ── Column widths ──
  sheet.setColumnWidth(1, 90);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 320);
  sheet.setColumnWidth(4, 80);
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 140);

  // Freeze header row + title row for scrolling (only first time)
  if (sheet.getFrozenRows() === 0) {
    sheet.setFrozenRows(headerRow);
  }

  return { status: 'success', rowsAdded: totalTaskRows };
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === 'log_daily_tasks') {
      var email = data.email;
      var fullName = data.name || 'Unknown';
      var date = data.date;
      var firstPunchIn = data.firstPunchIn;
      var lastPunchOut = data.lastPunchOut;
      var tasks = data.tasks;

      // Format times to HH:MM (strip seconds)
      var startTime = firstPunchIn ? firstPunchIn.split(':').slice(0, 2).join(':') : '';
      var endTime = lastPunchOut ? lastPunchOut.split(':').slice(0, 2).join(':') : '';

      var sheetName = fullName.split(' ')[0];

      if (SPREADSHEET_ID === 'YOUR_DAILY_TASK_LIST_SPREADSHEET_ID_HERE') {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          message: 'Please set SPREADSHEET_ID in daily_task_sheet_script.js'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var result = getOrCreateSheet(SPREADSHEET_ID, sheetName);
      var appendResult = appendDailyLog(result.sheet, date, startTime, endTime, tasks);

      return ContentService.createTextOutput(JSON.stringify(appendResult)).setMimeType(ContentService.MimeType.JSON);
    }

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
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).indexOf('Today Task') === 0) {
          entries.push({
            type: 'header',
            text: rows[i][0]
          });
        } else if (rows[i][0] === 'Date' && rows[i][1] === 'Project Name') {
          entries.push({ type: 'title_row' });
        } else if (rows[i][0] || rows[i][1] || rows[i][2]) {
          entries.push({
            type: 'task',
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
