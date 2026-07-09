function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    if (action === "log_daily_tasks") {
      var email = data.email;
      var fullName = data.name || "Unknown";
      var date = data.date || ""; 
      var firstPunchIn = data.firstPunchIn || "";
      var lastPunchOut = data.lastPunchOut || "";
      var tasks = data.tasks || [];
      
      // Format date from YYYY-MM-DD to DD-MM-YYYY
      var parts = date.split("-");
      var headerDate = date;
      var dispDate = date;
      if (parts.length === 3) {
        headerDate = parts[2] + "-" + parts[1] + "-" + parts[0]; // 04-06-2026
        dispDate = parseInt(parts[2]) + "/" + parseInt(parts[1]) + "/" + parts[0]; // 4/6/2026
      }

      // Use the first name for the sheet tab
      var sheetName = fullName.split(" ")[0];
      
      // Open the active spreadsheet
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      
      // If the sheet doesn't exist, create it
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
      
      // Start writing at the bottom
      var lastRow = sheet.getLastRow();
      
      // 1. Add Dark Green Header (Today Task : DD-MM-YYYY)
      sheet.appendRow(["Today Task :" + headerDate, "", "", "", "", "", ""]);
      var headerRowNumber = sheet.getLastRow();
      var hdrRange = sheet.getRange(headerRowNumber, 1, 1, 7);
      hdrRange.merge();
      hdrRange.setBackground("#006400"); // Dark Green
      hdrRange.setFontColor("#FFFFFF");  // White text
      hdrRange.setFontWeight("bold");
      hdrRange.setHorizontalAlignment("center");
      
      // 2. Add Light Green Column Headers
      sheet.appendRow(["Date", "Project name", "Task / Remarks", "Status", "Start Time", "End Time", "Remark"]);
      var colHeaderRowNumber = sheet.getLastRow();
      var ttlRange = sheet.getRange(colHeaderRowNumber, 1, 1, 7);
      ttlRange.setBackground("#c3e6cb"); // Light Green
      ttlRange.setFontColor("#000000");  // Black text
      ttlRange.setFontWeight("bold");
      ttlRange.setHorizontalAlignment("center");
      
      // 3. Add Tasks
      if (tasks.length > 0) {
        tasks.forEach(function(t, index) {
          var rowDate = (index === 0) ? dispDate : "";
          var rowStartTime = (index === 0) ? firstPunchIn : "";
          var rowEndTime = (index === tasks.length - 1) ? lastPunchOut : "";
          
          sheet.appendRow([
            rowDate,
            t.project || "",
            t.title || "",
            t.status || "",
            rowStartTime,
            rowEndTime,
            t.remark || ""
          ]);
          
          // Center align specific columns
          var currentRow = sheet.getLastRow();
          sheet.getRange(currentRow, 1).setHorizontalAlignment("center"); // Date
          sheet.getRange(currentRow, 4).setHorizontalAlignment("center"); // Status
          sheet.getRange(currentRow, 5).setHorizontalAlignment("center"); // Start
          sheet.getRange(currentRow, 6).setHorizontalAlignment("center"); // End
        });
      } else {
        sheet.appendRow([
          dispDate,
          "",
          "No tasks logged",
          "-",
          firstPunchIn,
          lastPunchOut,
          ""
        ]);
        var currentRow = sheet.getLastRow();
        sheet.getRange(currentRow, 1).setHorizontalAlignment("center");
        sheet.getRange(currentRow, 4).setHorizontalAlignment("center");
        sheet.getRange(currentRow, 5).setHorizontalAlignment("center");
        sheet.getRange(currentRow, 6).setHorizontalAlignment("center");
      }
      
      // Add a blank row for spacing
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
