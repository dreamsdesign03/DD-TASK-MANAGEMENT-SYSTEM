function makeHeaderText(date) {
  var parts = date.split("-");
  if (parts.length === 3) {
    return "Today Task : " + parts[2] + "-" + parts[1] + "-" + parts[0];
  }
  return "Today Task : " + date;
}

function makeDispDate(date) {
  var parts = date.split("-");
  if (parts.length === 3) {
    return parseInt(parts[2]) + "/" + parseInt(parts[1]) + "/" + parts[0];
  }
  return date;
}

function findHeaderRow(sheet, headerText) {
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === headerText) {
      return i + 1;
    }
  }
  return -1;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.split(":").slice(0, 2).join(":");
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === "log_punch_in") {
      var fullName = data.name || "Unknown";
      var date = data.date || "";
      var startTime = data.startTime || "";
      var sheetName = fullName.split(" ")[0];

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      var headerText = makeHeaderText(date);
      var existingRow = findHeaderRow(sheet, headerText);
      if (existingRow !== -1) {
        return ContentService.createTextOutput(JSON.stringify({ status: "skipped", reason: "already exists" })).setMimeType(ContentService.MimeType.JSON);
      }

      var dispDate = makeDispDate(date);
      var st = formatTime(startTime);

      // Dark green header
      sheet.appendRow([headerText, "", "", "", "", "", ""]);
      var hdrRow = sheet.getLastRow();
      var hdrRange = sheet.getRange(hdrRow, 1, 1, 7);
      hdrRange.merge();
      hdrRange.setBackground("#006400");
      hdrRange.setFontColor("#FFFFFF");
      hdrRange.setFontWeight("bold");
      hdrRange.setHorizontalAlignment("center");
      hdrRange.setBorder(true, true, true, true, true, true);

      // Light green column titles
      sheet.appendRow(["Date", "Project name", "Task Title", "Status", "Start Time", "End Time", "Remark"]);
      var ttlRow = sheet.getLastRow();
      var ttlRange = sheet.getRange(ttlRow, 1, 1, 7);
      ttlRange.setBackground("#c3e6cb");
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
      var firstPunchIn = data.firstPunchIn || "";
      var lastPunchOut = data.lastPunchOut || "";
      var tasks = data.tasks || [];

      var sheetName = fullName.split(" ")[0];
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      var headerText = makeHeaderText(date);
      var existingRow = findHeaderRow(sheet, headerText);

      if (existingRow !== -1) {
        // ── UPDATE existing block ──
        // Find the data area after this header
        var headerRowNum = existingRow;
        var titleRowNum = headerRowNum + 1;
        var dataStartRow = titleRowNum + 1;

        // Find where this block ends: next blank row, next "Today Task" header, or end of sheet
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
          if (isEmpty || String(rowVals[0]).indexOf("Today Task :") === 0) {
            blockEnd = r + 1;
            break;
          }
          blockEnd = r + 2;
        }

        // Delete old data rows (from dataStartRow to blockEnd-1)
        if (blockEnd > dataStartRow) {
          sheet.deleteRows(dataStartRow, blockEnd - dataStartRow);
        }

        // Insert new task rows
        var dispDate = makeDispDate(date);
        var st = formatTime(firstPunchIn);
        var et = formatTime(lastPunchOut);

        for (var t = 0; t < tasks.length; t++) {
          var task = tasks[t];
          var rowDate = t === 0 ? dispDate : "";
          var rowST = t === 0 ? st : "";
          var rowET = t === tasks.length - 1 ? et : "";

          sheet.insertRowsAfter(dataStartRow + t - 1, 1);
          var rowIdx = dataStartRow + t;

          sheet.getRange(rowIdx, 1).setValue(rowDate);
          sheet.getRange(rowIdx, 2).setValue(task.project || "");
          sheet.getRange(rowIdx, 3).setValue(task.title || "");
          sheet.getRange(rowIdx, 4).setValue(task.status || "");
          sheet.getRange(rowIdx, 5).setValue(rowST);
          sheet.getRange(rowIdx, 6).setValue(rowET);
          sheet.getRange(rowIdx, 7).setValue(task.remark || "");

          sheet.getRange(rowIdx, 1).setHorizontalAlignment("center");
          sheet.getRange(rowIdx, 4).setHorizontalAlignment("center");
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
      var headerDate = date;
      var parts = date.split("-");
      if (parts.length === 3) {
        headerDate = parts[2] + "-" + parts[1] + "-" + parts[0];
      }

      var dispDate = date;
      if (parts.length === 3) {
        dispDate = parseInt(parts[2]) + "/" + parseInt(parts[1]) + "/" + parts[0];
      }

      var st = formatTime(firstPunchIn);
      var et = formatTime(lastPunchOut);

      // Dark green header
      sheet.appendRow([headerText, "", "", "", "", "", ""]);
      var headerRowNumber = sheet.getLastRow();
      var hdrRange = sheet.getRange(headerRowNumber, 1, 1, 7);
      hdrRange.merge();
      hdrRange.setBackground("#006400");
      hdrRange.setFontColor("#FFFFFF");
      hdrRange.setFontWeight("bold");
      hdrRange.setHorizontalAlignment("center");
      hdrRange.setBorder(true, true, true, true, true, true);

      // Light green column headers
      sheet.appendRow(["Date", "Project name", "Task Title", "Status", "Start Time", "End Time", "Remark"]);
      var colHeaderRowNumber = sheet.getLastRow();
      var ttlRange = sheet.getRange(colHeaderRowNumber, 1, 1, 7);
      ttlRange.setBackground("#c3e6cb");
      ttlRange.setFontColor("#000000");
      ttlRange.setFontWeight("bold");
      ttlRange.setHorizontalAlignment("center");
      ttlRange.setBorder(true, true, true, true, true, true);

      var taskStartRow = sheet.getLastRow() + 1;

      if (tasks.length > 0) {
        tasks.forEach(function(task, index) {
          var rowDate = index === 0 ? dispDate : "";
          var rowST = index === 0 ? st : "";
          var rowET = index === tasks.length - 1 ? et : "";

          sheet.appendRow([
            rowDate,
            task.project || "",
            task.title || "",
            task.status || "",
            rowST,
            rowET,
            task.remark || ""
          ]);

          var currentRow = sheet.getLastRow();
          sheet.getRange(currentRow, 1).setHorizontalAlignment("center");
          sheet.getRange(currentRow, 4).setHorizontalAlignment("center");
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
