function makeHeaderText(date) {
  var parts = date.split("-");
  if (parts.length === 3) {
    return "Task : " + parts[2] + "-" + parts[1] + "-" + parts[0];
  }
  return "Task : " + date;
}

function makeDispDate(date) {
  var parts = date.split("-");
  if (parts.length === 3) {
    return parseInt(parts[2]) + "/" + parseInt(parts[1]) + "/" + parts[0];
  }
  return date;
}

function findHeaderRow(sheet, date) {
  var parts = date.split("-");
  var datePart = parts.length === 3 ? parts[2] + "-" + parts[1] + "-" + parts[0] : date;
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    var cellText = String(data[i][0]).trim();
    if (cellText.indexOf("Task :") !== -1 && cellText.indexOf(datePart) !== -1) {
      return i + 1;
    }
  }
  return -1;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.split(":").slice(0, 2).join(":");
}

function formatSheetTime(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var h = val.getHours();
    var m = val.getMinutes();
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }
  var s = String(val).trim();
  if (s === "") return "";
  if (s.indexOf(":") !== -1) return s.split(":").slice(0, 2).join(":");
  return s;
}

function formatSheetProject(val) {
  if (!val) return "";
  var d;
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'string' && val.indexOf('T') !== -1 && val.indexOf('Z') !== -1) {
    d = new Date(val);
  }
  if (d && !isNaN(d.getTime())) {
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthNames[d.getMonth()] + " " + d.getFullYear();
  }
  return String(val).trim();
}

function getStatusColor(status) {
  var s = String(status || "").trim().toLowerCase();
  if (s === "done") return "#d4edda";       // Green
  if (s === "in progress") return "#fff3cd"; // Yellow
  if (s === "pending") return "#e2e3e5";     // Gray
  if (s === "review") return "#cce5ff";      // Blue
  if (s === "block" || s === "blocked") return "#f8d7da"; // Red
  return "#ffffff";
}

function getExistingStartTime(sheet, headerRowNum) {
  var startRow = headerRowNum + 2;
  var lastRow = sheet.getLastRow();
  if (startRow > lastRow) return "";
  var col5 = sheet.getRange(startRow, 5, lastRow - startRow + 1, 1).getValues();
  for (var i = 0; i < col5.length; i++) {
    var formatted = formatSheetTime(col5[i][0]);
    if (formatted !== "") return formatted;
  }
  return "";
}

function fetchActivityTimes(employeeId, date) {
  var MAIN_BACKEND_URL = "https://script.google.com/macros/s/AKfycbyVR3BpNPaHQGmhfrT8vLICqRXb0ASNNqRyphX6xZo56ZndwzintZn8YsZzPK8gp8PA/exec";
  try {
    var res = UrlFetchApp.fetch(MAIN_BACKEND_URL + "?action=get_activities&t=" + Date.now(), { muteHttpExceptions: true });
    var json = JSON.parse(res.getContentText());
    if (!Array.isArray(json)) return null;

    var empIdStr = String(employeeId || "").trim();
    if (!empIdStr) return null;

    var earliest = null;
    var latest = null;

    for (var i = 0; i < json.length; i++) {
      var r = json[i];
      var rEmpId = String(r["Employee ID"] || "").trim();
      var loginStr = String(r["Login Date and Time"] || "");
      var logoutStr = String(r["Logout Date and Time"] || "");

      if (rEmpId !== empIdStr) continue;
      if (loginStr.indexOf(date) !== 0) continue;

      var loginDate = new Date(loginStr.replace(" ", "T"));
      if (!isNaN(loginDate.getTime())) {
        if (!earliest || loginDate < earliest) earliest = loginDate;
      }
      if (logoutStr) {
        var logoutDate = new Date(logoutStr.replace(" ", "T"));
        if (!isNaN(logoutDate.getTime())) {
          if (!latest || logoutDate > latest) latest = logoutDate;
        }
      }
    }

    if (!earliest && !latest) return null;

    var fmt = function (d) {
      var h = d.getHours(); var m = d.getMinutes(); var s = d.getSeconds();
      return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    };
    return {
      first: earliest ? fmt(earliest) : null,
      last: latest ? fmt(latest) : null
    };
  } catch (err) {
    return null;
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === "log_punch_in") {
      var fullName = data.name || "Unknown";
      var date = data.date || "";
      var startTime = data.startTime || "";
      var employeeId = data.employeeId || "";
      var sheetName = fullName.split(" ")[0];

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      var headerText = makeHeaderText(date);
      var existingRow = findHeaderRow(sheet, date);
      if (existingRow !== -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "skipped", reason: "already exists" })).setMimeType(ContentService.MimeType.JSON);
      }

      // Fetch from Activity Sheet to get the true first login time
      if (employeeId) {
        var activityTimes = fetchActivityTimes(employeeId, date);
        if (activityTimes && activityTimes.first) {
          startTime = activityTimes.first;
        }
      }

      var dispDate = makeDispDate(date);
      var st = formatTime(startTime);

      // Dark green header
      sheet.appendRow([headerText, "", "", "", "", "", ""]);
      var hdrRow = sheet.getLastRow();
      var hdrRange = sheet.getRange(hdrRow, 1, 1, 7);
      hdrRange.merge();
      hdrRange.setBackground("#0b5394");
      hdrRange.setFontColor("#FFFFFF");
      hdrRange.setFontWeight("bold");
      hdrRange.setHorizontalAlignment("center");
      hdrRange.setBorder(true, true, true, true, true, true);

      // Light green column titles
      sheet.appendRow(["Date", "Project name", "Task Title", "Status", "Start Time", "End Time", "Remark"]);
      var ttlRow = sheet.getLastRow();
      var ttlRange = sheet.getRange(ttlRow, 1, 1, 7);
      ttlRange.setBackground("#9fc5e8");
      ttlRange.setFontColor("#000000");
      ttlRange.setFontWeight("bold");
      ttlRange.setHorizontalAlignment("center");
      ttlRange.setBorder(true, true, true, true, true, true);

      // One data row with start time, no tasks yet
      sheet.appendRow([dispDate, "", "Punched In", "-", st, "", ""]);
      var taskRow = sheet.getLastRow();
      var taskRange = sheet.getRange(taskRow, 1, 1, 7);
      taskRange.setBorder(true, true, true, true, true, true);
      sheet.getRange(taskRow, 1).setHorizontalAlignment("center");
      sheet.getRange(taskRow, 4).setHorizontalAlignment("center");
      sheet.getRange(taskRow, 5).setHorizontalAlignment("center");
      sheet.getRange(taskRow, 6).setHorizontalAlignment("center");

      // Blank separator
      sheet.appendRow(["", "", "", "", "", "", ""]);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "punch_in_logged" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "log_daily_tasks") {
      var email = data.email;
      var fullName = data.name || "Unknown";
      var date = data.date || "";
      var employeeId = data.employeeId || "";
      var tasks = data.tasks || [];

      var sheetName = fullName.split(" ")[0];
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      // Fetch from Activity Sheet — source of truth for times
      var firstPunchIn = "";
      var lastPunchOut = data.endTime || "";
      if (employeeId) {
        var activityTimes = fetchActivityTimes(employeeId, date);
        if (activityTimes) {
          if (activityTimes.first) firstPunchIn = activityTimes.first;
          if (activityTimes.last) lastPunchOut = activityTimes.last;
        }
      }

      var headerText = makeHeaderText(date);
      var existingRow = findHeaderRow(sheet, date);

      if (existingRow !== -1) {
        // ── UPDATE existing block ──
        var headerRowNum = existingRow;
        var titleRowNum = headerRowNum + 1;
        var dataStartRow = titleRowNum + 1;

        // Read the existing first punch-in time from the sheet
        var existingStartTime = getExistingStartTime(sheet, headerRowNum);
        var st = existingStartTime || formatTime(firstPunchIn);

        // Find where this block ends
        var blockEnd = dataStartRow;
        var allData = sheet.getDataRange().getValues();
        for (var r = dataStartRow - 1; r < allData.length; r++) {
          var rowVals = allData[r];
          var isEmpty = true;
          for (var c = 0; c < 7; c++) {
            if (String(rowVals[c] || "").trim() !== "") {
              isEmpty = false;
              break;
            }
          }
          if (isEmpty || String(rowVals[0]).indexOf("Task :") === 0 || String(rowVals[0]).indexOf("Today Task :") === 0) {
            blockEnd = r + 1;
            break;
          }
          blockEnd = r + 2;
        }

        // Delete old data rows
        if (blockEnd > dataStartRow) {
          sheet.deleteRows(dataStartRow, blockEnd - dataStartRow);
        }

        // Insert new task rows
        var dispDate = makeDispDate(date);
        var et = formatTime(lastPunchOut);

        for (var t = 0; t < tasks.length; t++) {
          var task = tasks[t];
          var rowDate = t === 0 ? dispDate : "";
          var rowST = t === 0 ? st : "";
          var rowET = t === tasks.length - 1 ? et : "";

          sheet.insertRowsAfter(dataStartRow + t - 1, 1);
          var rowIdx = dataStartRow + t;

          sheet.getRange(rowIdx, 1).setValue(rowDate);
          sheet.getRange(rowIdx, 2).setValue(formatSheetProject(task.project));
          sheet.getRange(rowIdx, 3).setValue(task.title || "");
          sheet.getRange(rowIdx, 4).setValue(task.status || "");
          sheet.getRange(rowIdx, 5).setValue(rowST);
          sheet.getRange(rowIdx, 6).setValue(rowET);
          sheet.getRange(rowIdx, 7).setValue(task.remark || "");

          sheet.getRange(rowIdx, 1).setHorizontalAlignment("center");
          sheet.getRange(rowIdx, 4).setHorizontalAlignment("center").setBackground(getStatusColor(task.status));
          sheet.getRange(rowIdx, 5).setHorizontalAlignment("center");
          sheet.getRange(rowIdx, 6).setHorizontalAlignment("center");

          var borderRange = sheet.getRange(rowIdx, 1, 1, 7);
          borderRange.setBorder(true, true, true, true, true, true);
        }

        // Blank row after tasks
        var blankRow = dataStartRow + tasks.length;
        sheet.getRange(blankRow, 1, 1, 7).setValues([["", "", "", "", "", "", ""]]);

        return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "updated" })).setMimeType(ContentService.MimeType.JSON);
      }

      // ── CREATE new block (no existing header) ──
      var dispDate = makeDispDate(date);
      var st = formatTime(firstPunchIn);
      var et = formatTime(lastPunchOut);

      // Dark green header
      sheet.appendRow([headerText, "", "", "", "", "", ""]);
      var headerRowNumber = sheet.getLastRow();
      var hdrRange = sheet.getRange(headerRowNumber, 1, 1, 7);
      hdrRange.merge();
      hdrRange.setBackground("#0b5394");
      hdrRange.setFontColor("#FFFFFF");
      hdrRange.setFontWeight("bold");
      hdrRange.setHorizontalAlignment("center");
      hdrRange.setBorder(true, true, true, true, true, true);

      // Light green column headers
      sheet.appendRow(["Date", "Project name", "Task Title", "Status", "Start Time", "End Time", "Remark"]);
      var colHeaderRowNumber = sheet.getLastRow();
      var ttlRange = sheet.getRange(colHeaderRowNumber, 1, 1, 7);
      ttlRange.setBackground("#9fc5e8");
      ttlRange.setFontColor("#000000");
      ttlRange.setFontWeight("bold");
      ttlRange.setHorizontalAlignment("center");
      ttlRange.setBorder(true, true, true, true, true, true);

      var taskStartRow = sheet.getLastRow() + 1;

      if (tasks.length > 0) {
        tasks.forEach(function (task, index) {
          var rowDate = index === 0 ? dispDate : "";
          var rowST = index === 0 ? st : "";
          var rowET = index === tasks.length - 1 ? et : "";

          sheet.appendRow([
            rowDate,
            formatSheetProject(task.project),
            task.title || "",
            task.status || "",
            rowST,
            rowET,
            task.remark || ""
          ]);

          var currentRow = sheet.getLastRow();
          sheet.getRange(currentRow, 1).setHorizontalAlignment("center");
          sheet.getRange(currentRow, 4).setHorizontalAlignment("center").setBackground(getStatusColor(task.status));
          sheet.getRange(currentRow, 5).setHorizontalAlignment("center");
          sheet.getRange(currentRow, 6).setHorizontalAlignment("center");
        });
      } else {
        sheet.appendRow([
          dispDate,
          "",
          "No tasks logged",
          "-",
          st,
          et,
          ""
        ]);
        var currentRow = sheet.getLastRow();
        sheet.getRange(currentRow, 1).setHorizontalAlignment("center");
        sheet.getRange(currentRow, 4).setHorizontalAlignment("center");
        sheet.getRange(currentRow, 5).setHorizontalAlignment("center");
        sheet.getRange(currentRow, 6).setHorizontalAlignment("center");
      }

      var taskEndRow = sheet.getLastRow();
      var numTasks = taskEndRow - taskStartRow + 1;
      if (numTasks > 0) {
        var taskRange = sheet.getRange(taskStartRow, 1, numTasks, 7);
        taskRange.setBorder(true, true, true, true, true, true);
      }

      sheet.appendRow(["", "", "", "", "", "", ""]);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", sheetCreated: sheetName })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}
