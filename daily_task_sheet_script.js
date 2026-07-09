// daily_task_sheet_script.js
// INSTRUCTIONS:
// 1. Create a NEW Google Sheet.
// 2. Go to Extensions -> Apps Script.
// 3. Paste this code into Code.gs (replace the default myFunction).
// 4. Click Deploy -> New deployment -> Select type "Web App".
// 5. Execute as: "Me" | Who has access: "Anyone".
// 6. Copy the Web App URL and paste it into AppContext.jsx where it says 'YOUR_NEW_APPS_SCRIPT_WEB_APP_URL_HERE'

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === "log_daily_tasks") {
      var email = data.email;
      var name = data.name;
      var date = data.date;
      var firstPunchIn = data.firstPunchIn;
      var lastPunchOut = data.lastPunchOut;
      var tasks = data.tasks;
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("Sheet1");
      if (!sheet) {
        sheet = ss.getSheets()[0]; // Fallback to first sheet
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
            name,
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
          name,
          email,
          firstPunchIn,
          lastPunchOut,
          "No tasks logged",
          "-",
          "-"
        ]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}
