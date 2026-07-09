// daily_task_sheet_script.js
// INSTRUCTIONS:
// 1. In your Daily Task Sheet, go to Extensions -> Apps Script.
// 2. Paste this code into Code.gs (replace the previous code).
// 3. Click Deploy -> Manage deployments -> Edit (pencil icon) -> Select "New version" -> Deploy.
// (You must select "New version" otherwise the URL won't update its behavior).

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === "log_daily_tasks") {
      var email = data.email;
      var fullName = data.name || "Unknown";
      var date = data.date;
      var firstPunchIn = data.firstPunchIn;
      var lastPunchOut = data.lastPunchOut;
      var tasks = data.tasks;
      
      // Use the first name for the sheet tab (e.g. "Mansi Shah" -> "Mansi")
      var sheetName = fullName.split(" ")[0];
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      
      // If the sheet for this employee doesn't exist, create it automatically!
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
      
      // Ensure headers exist
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["Date", "Employee Name", "Email", "First Punch In", "Last Punch Out", "Project Name", "Task Name", "Task Status"]);
        sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#f3f3f3");
        sheet.setFrozenRows(1);
      }
      
      if (tasks && tasks.length > 0) {
        tasks.forEach(function(t) {
          sheet.appendRow([
            date,
            fullName,
            email,
            firstPunchIn,
            lastPunchOut,
            t.project,
            t.title,
            t.status
          ]);
        });
      } else {
        sheet.appendRow([
          date,
          fullName,
          email,
          firstPunchIn,
          lastPunchOut,
          "No tasks logged",
          "-",
          "-"
        ]);
      }
      
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
