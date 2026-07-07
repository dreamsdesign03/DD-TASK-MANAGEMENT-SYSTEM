// ============================================
// Dreamsdesk Production Backend 
// doPost handles Writes (Tasks, Chat, Auth)
// doGet handles Reads (Tasks, Team, Clients, Chat, and Approvals)
// ============================================

// Helper to check Authorization
function isUserAuthorized(email, ss) {
  if (!email) return false;
  var teamSheet = ss.getSheetByName("Team");
  if (!teamSheet) return false;
  var data = teamSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]).trim().toLowerCase() === String(email).trim().toLowerCase()) {
      var systemRole = String(data[i][9] || "").trim();
      var regularRole = String(data[i][4] || "").trim();
      if (systemRole === "Admin" || systemRole === "Manager") return true;
      if (systemRole === "" && (regularRole === "Admin" || regularRole === "Manager")) return true;
      return false;
    }
  }
  return false;
}

function doPost(e) {
  if (!e || !e.postData) {
    return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "No payload received." })).setMimeType(ContentService.MimeType.JSON);
  }

  var payload = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // -------------------------
  // 1. HANDLE FILE UPLOAD 
  // -------------------------
  if (payload.action === 'upload_file') {
    try {
      var mainFolderName = "Dreamsdesign's Projects Attachments";
      var mainFolders = DriveApp.getFoldersByName(mainFolderName);
      var mainFolder;

      // 1. Main Root Folder
      if (mainFolders.hasNext()) {
        mainFolder = mainFolders.next();
      } else {
        mainFolder = DriveApp.createFolder(mainFolderName);
        mainFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }

      // 2. Project Folder
      var projectName = payload.projectName || "General";
      var subfolders = mainFolder.getFoldersByName(projectName);
      var projectFolder;

      if (subfolders.hasNext()) {
        projectFolder = subfolders.next();
      } else {
        projectFolder = mainFolder.createFolder(projectName);
        projectFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }

      // 3. Department Folder
      var departmentName = payload.department || "COMMON";
      var deptFolders = projectFolder.getFoldersByName(departmentName);
      var departmentFolder;

      if (deptFolders.hasNext()) {
        departmentFolder = deptFolders.next();
      } else {
        departmentFolder = projectFolder.createFolder(departmentName);
        departmentFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }

      var contentType = payload.mimeType || 'application/octet-stream';
      var blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), contentType, payload.filename);

      // Upload directly into the Department folder
      var file = departmentFolder.createFile(blob);

      return ContentService.createTextOutput(JSON.stringify({
        "ok": true,
        "url": file.getUrl(),
        "downloadUrl": file.getDownloadUrl()
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        "ok": false,
        "error": err.message
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // -------------------------
  // 2. HANDLE TASKS
  // -------------------------
  if (payload.action === 'add_task' || payload.action === 'update_task' || payload.action === 'delete_task') {
    try {
      var sheet = ss.getSheetByName("Tasks");
      if (!sheet) {
        sheet = ss.insertSheet("Tasks");
        sheet.appendRow(["Task ID", "Client", "Month", "Task Title", "Task Type", "Main Task ID", "Description", "Assigned By", "Assigned To", "Employee IDs", "Assigned Emails", "Department", "Assigned Date", "Due Date", "Priority", "Status", "Status Updated On", "Time Taken", "Days Overdue", "Remarks", "Post", "Attachment", "Is Recurring", "Recurring Schedule", "Recurring Day", "Recurring Months", "Last Auto-Generated Date"]);
      }

      var maxCols = sheet.getMaxColumns();
      if (maxCols < 27) {
        sheet.insertColumnsAfter(maxCols, 27 - maxCols);
      }

      if ((payload.action === 'update_task' || payload.action === 'delete_task') && payload.taskId) {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (data[i][0] == payload.taskId) {
            if (payload.action === 'delete_task') {
              if (!isUserAuthorized(payload.userEmail, ss)) {
                return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
              }
              sheet.deleteRow(i + 1);
              return ContentService.createTextOutput(JSON.stringify({ "ok": true, "deleted": true })).setMimeType(ContentService.MimeType.JSON);
            }
            sheet.getRange(i + 1, 1, 1, 27).setValues([[
              payload.taskId || "",
              payload.client || "",
              payload.month || "",
              payload.taskTitle || "",
              payload.taskType || "",
              payload.mainTaskId || "",
              payload.description || "",
              payload.assignedBy || "",
              payload.assignedTo || "",
              payload.employeeId || "",
              payload.assignedEmail || "",
              payload.department || "COMMON",
              payload.assignedDate || "",
              payload.dueDate || "",
              payload.priority || "",
              payload.status || "",
              payload.statusUpdatedOn || "",
              payload.timeTaken || "0h 0m",
              payload.daysOverdue || "",
              payload.remarks || "",
              payload.post || "NO",
              payload.attachment || "",
              payload.isRecurring || "",
              payload.recurringSchedule || "",
              payload.recurringDay || "",
              payload.recurringMonths || "",
              payload.lastAutoGeneratedDate || ""
            ]]);
            return ContentService.createTextOutput(JSON.stringify({ "ok": true })).setMimeType(ContentService.MimeType.JSON);
          }
        }
        if (payload.action === 'delete_task') {
          return ContentService.createTextOutput(JSON.stringify({ "ok": true, "error": "not_found" })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      // Find the first empty row to prevent skipping pre-formatted blank rows
      var dataAll = sheet.getDataRange().getValues();
      var insertRow = dataAll.length + 1;
      for (var r = 1; r < dataAll.length; r++) {
        // If Task ID is completely empty, we can use this row
        if (!dataAll[r][0] || String(dataAll[r][0]).trim() === "") {
          insertRow = r + 1;
          break;
        }
      }

      sheet.getRange(insertRow, 1, 1, 27).setValues([[
        payload.taskId || "",
        payload.client || "",
        payload.month || "",
        payload.taskTitle || "",
        payload.taskType || "",
        payload.mainTaskId || "",
        payload.description || "",
        payload.assignedBy || "",
        payload.assignedTo || "",
        payload.employeeId || "",
        payload.assignedEmail || "",
        payload.department || "COMMON",
        payload.assignedDate || "",
        payload.dueDate || "",
        payload.priority || "",
        payload.status || "",
        payload.statusUpdatedOn || "",
        payload.timeTaken || "0h 0m",
        payload.daysOverdue || "",
        payload.remarks || "",
        payload.post || "NO",
        payload.attachment || "",
        payload.isRecurring || "",
        payload.recurringSchedule || "",
        payload.recurringDay || "",
        payload.recurringMonths || "",
        payload.lastAutoGeneratedDate || ""
      ]]);
      return ContentService.createTextOutput(JSON.stringify({ "ok": true })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": err.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // -------------------------
  // 3. HANDLE LOGIN & LOGOUT
  // -------------------------
  if (payload.action === 'login' || payload.action === 'google_login' || payload.action === 'logout') {
    var teamSheet = ss.getSheetByName("Team");
    if (!teamSheet) {
      return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Team sheet not found" })).setMimeType(ContentService.MimeType.JSON);
    }
    var data = teamSheet.getDataRange().getValues();
    var emailToMatch = String(payload.email).trim().toLowerCase();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowEmail = String(row[2]).trim().toLowerCase();
      var rowPassword = String(row[3]).trim();
      var isActive = String(row[8]).trim(); // Column I (Is Active)

      if (rowEmail === emailToMatch) {
        if (payload.action === 'login' && rowPassword !== String(payload.password).trim()) {
          return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Invalid email or password" })).setMimeType(ContentService.MimeType.JSON);
        }

        if (payload.action === 'logout') {
          teamSheet.getRange(i + 1, 11).setValue("Offline");
          recordActivityLogout(ss, payload.email);
          return ContentService.createTextOutput(JSON.stringify({ "ok": true })).setMimeType(ContentService.MimeType.JSON);
        }

        if (isActive === "Pending") {
          return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Admin not approved" })).setMimeType(ContentService.MimeType.JSON);
        }

        teamSheet.getRange(i + 1, 9).setValue("Yes");
        teamSheet.getRange(i + 1, 11).setValue("Online");
        recordActivityLogin(ss, row[0], row[1], row[4], row[5]);

        var userObj = {
          "Employee ID": row[0],
          "Full Name": row[1],
          "Email Address": row[2],
          "Role": row[4],
          "Department": row[5],
          "Phone": row[6],
          "Joined Date": row[7],
          "Is Active": "Yes",
          "System Role": row[9] || "Employee"
        };
        return ContentService.createTextOutput(JSON.stringify({
          "ok": true, "authenticated": true, "user": userObj
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (payload.action === 'google_login') {
      return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "not_registered" })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Invalid email or password" })).setMimeType(ContentService.MimeType.JSON);
  }

  // -------------------------
  // 3.5. HANDLE STATUS UPDATE
  // -------------------------
  if (payload.action === 'update_status') {
    var teamSheet = ss.getSheetByName("Team");
    if (!teamSheet) {
      return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Team sheet not found" })).setMimeType(ContentService.MimeType.JSON);
    }
    var data = teamSheet.getDataRange().getValues();
    var emailToMatch = String(payload.email).trim().toLowerCase();
    var newStatus = payload.status === 'Online' ? 'Online' : 'Offline';

    for (var i = 1; i < data.length; i++) {
      var rowEmail = String(data[i][2]).trim().toLowerCase();
      if (rowEmail === emailToMatch) {
        teamSheet.getRange(i + 1, 11).setValue(newStatus);
        return ContentService.createTextOutput(JSON.stringify({ "ok": true })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "User not found" })).setMimeType(ContentService.MimeType.JSON);
  }

  // -------------------------
  // 4. HANDLE REGISTRATION (With HTML Email Button)
  // -------------------------
  if (payload.action === 'register') {
    var teamSheet = ss.getSheetByName("Team");
    if (!teamSheet) {
      teamSheet = ss.insertSheet("Team");
      teamSheet.appendRow(["Employee ID", "Full Name", "Email Address", "Password Token", "Role", "Department", "Phone", "Joined Date", "Is Active", "System Role"]);
    }

    var data = teamSheet.getDataRange().getValues();
    var lastEmpId = 0;
    for (var i = 1; i < data.length; i++) {
      var idStr = String(data[i][0]).replace("EMP-", "");
      var idNum = parseInt(idStr, 10);
      if (!isNaN(idNum) && idNum > lastEmpId) {
        lastEmpId = idNum;
      }
    }
    var newEmpId = "EMP-" + ("000" + (lastEmpId + 1)).slice(-3);
    var joinedDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

    var formattedPhone = payload.phone ? (payload.phone.toString().startsWith("+") ? "'" + payload.phone : payload.phone) : "";

    teamSheet.appendRow([
      newEmpId,
      payload.name || "",
      payload.email || "",
      "token_" + payload.name.split(" ")[0].toLowerCase() + "_" + newEmpId.split("-")[1],
      payload.role || "Employee",
      payload.department || "General",
      formattedPhone,
      joinedDate,
      "Pending",
      payload.systemRole || "Employee"
    ]);

    // Send RICH HTML Approval Email to Admin with a Button
    try {
      var adminEmail = "dreamsdesign.in03@gmail.com";
      var subject = "New User Registration Approval Request - Dreamsdesk";

      var scriptUrl = ScriptApp.getService().getUrl();
      var approveLink = scriptUrl + "?action=approve_user&email=" + encodeURIComponent(payload.email);

      var htmlBody = "<div style='font-family: Inter, Arial, sans-serif; color: #333; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>" +
        "<div style='text-align: center; margin-bottom: 24px;'>" +
        "<h2 style='color: #461466; margin: 0; font-size: 24px; font-weight: 700;'>New Registration Request</h2>" +
        "<p style='color: #64748b; margin-top: 8px; font-size: 14px;'>A new user is waiting for access to Dreamsdesk.</p>" +
        "</div>" +
        "<div style='background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px;'>" +
        "<table style='width: 100%; border-collapse: collapse; font-size: 14px;'>" +
        "<tr><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 100px;'>Name</td><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; text-align: right;'>" + payload.name + "</td></tr>" +
        "<tr><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;'>Email</td><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; text-align: right;'>" + payload.email + "</td></tr>" +
        "<tr><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;'>Role</td><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; text-align: right;'>" + payload.role + "</td></tr>" +
        "<tr><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;'>System Role</td><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; text-align: right;'>" + (payload.systemRole || "Employee") + "</td></tr>" +
        "<tr><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;'>Department</td><td style='padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600; text-align: right;'>" + payload.department + "</td></tr>" +
        "<tr><td style='padding: 10px 0; color: #64748b;'>Phone</td><td style='padding: 10px 0; color: #0f172a; font-weight: 600; text-align: right;'>" + payload.phone + "</td></tr>" +
        "</table>" +
        "</div>" +
        "<div style='text-align: center;'>" +
        "<a href='" + approveLink + "' style='background-color: #461466; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; transition: all 0.2s;'>Approve User Access</a>" +
        "</div>" +
        "<div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;'>" +
        "Dreamsdesk Automated System<br>Do not forward this email." +
        "</div>" +
        "</div>";

      MailApp.sendEmail({
        to: adminEmail,
        subject: subject,
        htmlBody: htmlBody
      });
    } catch (e) {
      console.error("Mail Error:", e.message);
    }

    return ContentService.createTextOutput(JSON.stringify({ "ok": true })).setMimeType(ContentService.MimeType.JSON);
  }

  // -------------------------
  // 5. ADD CLIENT
  // -------------------------
  if (payload.action === 'add_client') {
    if (!isUserAuthorized(payload.userEmail, ss)) {
      return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
    }
    try {
      var sheet = ss.getSheetByName("Clients");
      if (!sheet) {
        sheet = ss.insertSheet("Clients");
        sheet.appendRow(["Client ID", "Project Name", "Client Name", "Contact Email", "Phone", "Industry", "Is Active"]);
      } else {
        // Rename the old headers to match the new schema
        sheet.getRange("B1").setValue("Project Name");
        sheet.getRange("C1").setValue("Client Name");
        sheet.getRange("H1").setValue("Services");
      }

      var data = sheet.getDataRange().getValues();
      var lastId = 0;
      for (var i = 1; i < data.length; i++) {
        var idStr = String(data[i][0]).replace("C-", "");
        var idNum = parseInt(idStr, 10);
        if (!isNaN(idNum) && idNum > lastId) lastId = idNum;
      }
      var newId = "C-" + ("000" + (lastId + 1)).slice(-3);

      var formattedPhone = payload.phone ? (payload.phone.toString().startsWith("+") ? "'" + payload.phone : payload.phone) : "";

      sheet.appendRow([
        newId,
        payload.projectName || "",
        payload.clientName || "",
        payload.contactEmail || "",
        formattedPhone,
        payload.industry || "",
        "Yes",
        payload.services || ""
      ]);

      // Create Drive folder for this client
      try {
        var driveFolderName = "Dreamsdesign's Projects Attachments";
        var driveRootFolders = DriveApp.getFoldersByName(driveFolderName);
        var driveRoot;
        if (driveRootFolders.hasNext()) {
          driveRoot = driveRootFolders.next();
        } else {
          driveRoot = DriveApp.createFolder(driveFolderName);
          driveRoot.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        }
        var clientProjectName = payload.projectName || "General";
        var clientFolders = driveRoot.getFoldersByName(clientProjectName);
        if (!clientFolders.hasNext()) {
          var clientFolder = driveRoot.createFolder(clientProjectName);
          clientFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        }
      } catch (driveErr) {
        // Non-critical: log but don't fail the client creation
        console.error('Drive folder creation failed: ' + driveErr.message);
      }

      return ContentService.createTextOutput(JSON.stringify({ "ok": true })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": err.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // -------------------------
  // 5.5. UPDATE CLIENT
  // -------------------------
  if (payload.action === 'update_client') {
    if (!isUserAuthorized(payload.userEmail, ss)) {
      return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
    }
    try {
      var sheet = ss.getSheetByName("Clients");
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Clients sheet not found" })).setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === String(payload.clientId).trim()) {
          if (payload.projectName !== undefined) sheet.getRange(i + 1, 2).setValue(payload.projectName);
          if (payload.clientName !== undefined) sheet.getRange(i + 1, 3).setValue(payload.clientName);
          if (payload.contactEmail !== undefined) sheet.getRange(i + 1, 4).setValue(payload.contactEmail);
          if (payload.phone !== undefined) {
            var formattedPhone = payload.phone ? (payload.phone.toString().startsWith("+") ? "'" + payload.phone : payload.phone) : "";
            sheet.getRange(i + 1, 5).setValue(formattedPhone);
          }
          if (payload.industry !== undefined) sheet.getRange(i + 1, 6).setValue(payload.industry);
          if (payload.isActive !== undefined) sheet.getRange(i + 1, 7).setValue(payload.isActive);
          if (payload.services !== undefined) sheet.getRange(i + 1, 8).setValue(payload.services);
          found = true;
          break;
        }
      }
      if (found) {
        return ContentService.createTextOutput(JSON.stringify({ "ok": true })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "Client not found" })).setMimeType(ContentService.MimeType.JSON);
      }
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": err.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // -------------------------
  // 6. HANDLE CHAT (Fallback)
  // -------------------------
  var sheetName = "Chat";
  if (payload.roomId && payload.roomId.indexOf("group_") === 0) {
    sheetName = payload.roomId;
  }
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["id", "action", "roomId", "senderId", "senderName", "message", "timestamp", "type", "groupName"]);
  }
  sheet.appendRow([
    payload.id || "", payload.action || "", payload.roomId || "", payload.senderId || "", payload.senderName || "", payload.message || "", payload.timestamp || "", payload.type || "", payload.groupName || ""
  ]);
  return ContentService.createTextOutput(JSON.stringify({ "ok": true })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// doGet handles GET Requests (Data Retrieval & Email Approvals)
// ============================================
function doGet(e) {
  var action = (e && e.parameter) ? e.parameter.action : null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // -------------------------
  // 0. HANDLE 1-CLICK EMAIL APPROVAL
  // -------------------------
  if (action === 'approve_user') {
    var email = e.parameter.email;
    if (!email) {
      return HtmlService.createHtmlOutput("<div style='font-family:sans-serif;text-align:center;padding:40px;color:#dc3545;'><h2>Error</h2><p>No email provided.</p></div>");
    }

    var teamSheet = ss.getSheetByName("Team");
    if (!teamSheet) {
      return HtmlService.createHtmlOutput("<div style='font-family:sans-serif;text-align:center;padding:40px;color:#dc3545;'><h2>Error</h2><p>Team Database not found.</p></div>");
    }

    var data = teamSheet.getDataRange().getValues();
    var found = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][2]).trim().toLowerCase() === String(email).trim().toLowerCase()) {
        teamSheet.getRange(i + 1, 9).setValue("Yes"); // Change Is Active to Yes
        teamSheet.getRange(i + 1, 11).setValue("Online"); // Set Status to Online
        found = true;
        break;
      }
    }

    if (found) {
      return HtmlService.createHtmlOutput(
        "<div style='font-family: Arial, sans-serif; text-align: center; margin-top: 80px;'>" +
        "<div style='background-color: #f0fdf4; border: 1px solid #bbf7d0; max-width: 400px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);'>" +
        "<h1 style='color: #16a34a; margin-top: 0;'>Access Granted!</h1>" +
        "<p style='color: #334155; font-size: 16px;'>The user <b>" + email + "</b> has been approved successfully.</p>" +
        "<p style='color: #64748b; font-size: 14px; margin-top: 20px;'>They can now log in to the system. You may close this window.</p>" +
        "</div></div>"
      );
    } else {
      return HtmlService.createHtmlOutput(
        "<div style='font-family: Arial, sans-serif; text-align: center; margin-top: 80px;'>" +
        "<div style='background-color: #fef2f2; border: 1px solid #fecaca; max-width: 400px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);'>" +
        "<h1 style='color: #dc2626; margin-top: 0;'>User Not Found</h1>" +
        "<p style='color: #334155; font-size: 16px;'>Could not find user <b>" + email + "</b> in the Team sheet.</p>" +
        "</div></div>"
      );
    }
  }

  // -------------------------
  // 0.5. READ ACTIVITIES
  // -------------------------
  if (action === "get_activities") {
    var sheet = ss.getSheetByName("Activity");
    var result = [];
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var headers = data[0];
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          if (row.length === 0 || !row[0]) continue;
          var obj = {};
          for (var j = 0; j < headers.length; j++) {
            var headerStr = String(headers[j]).trim();
            if (headerStr) {
              obj[headerStr] = row[j];
            }
          }
          result.push(obj);
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  // -------------------------
  // 1. READ CLIENTS
  // -------------------------
  if (action === 'get_clients') {
    var sheet = ss.getSheetByName("Clients");
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ clients: [] })).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();
    var clients = [];
    if (data.length > 1) {
      var headers = data[0];
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (row.length === 0 || !row[0]) continue;

        // We no longer filter out inactive clients here because we need them for the Clients details page
        // Active filtering is done on the React frontend

        var clientObj = {};
        for (var j = 0; j < headers.length; j++) {
          var headerStr = String(headers[j]).trim();
          if (headerStr) clientObj[headerStr] = row[j];
        }
        clients.push(clientObj);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ clients: clients })).setMimeType(ContentService.MimeType.JSON);
  }

  // -------------------------
  // 2. READ TASKS
  // -------------------------
  if (action === "get_tasks") {
    var sheet = ss.getSheetByName("Tasks");
    var taskResult = [];
    if (sheet) {
      var taskData = sheet.getDataRange().getValues();
      if (taskData.length > 1) {
        var taskHeaders = ["Task ID", "Client", "Month", "Task Title", "Task Type", "Main Task ID", "Description", "Assigned By", "Assigned To", "Employee IDs", "Assigned Emails", "Department", "Assigned Date", "Due Date", "Priority", "Status", "Status Updated On", "Time Taken", "Days Overdue", "Remarks", "Post", "Attachment", "Is Recurring", "Recurring Schedule", "Recurring Day", "Recurring Months", "Last Auto-Generated Date"];
        for (var i = 1; i < taskData.length; i++) {
          var row = taskData[i];
          var obj = {};
          for (var j = 0; j < taskHeaders.length; j++) {
            obj[taskHeaders[j]] = row[j];
          }
          taskResult.push(obj);
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify(taskResult)).setMimeType(ContentService.MimeType.JSON);
  }

  // -------------------------
  // 3. READ TEAM
  // -------------------------
  if (action === "get_team") {
    var sheet = ss.getSheetByName("Team");
    var teamResult = [];

    if (sheet) {
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var headers = data[0];

        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          if (row.length === 0 || !row[0]) continue;

          var obj = {};
          for (var j = 0; j < headers.length; j++) {
            var headerStr = String(headers[j]).trim();
            if (headerStr) {
              obj[headerStr] = row[j];
            }
          }
          teamResult.push(obj);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify(teamResult)).setMimeType(ContentService.MimeType.JSON);
  }

  // -------------------------
  // 4. READ PROJECT FILES FROM DRIVE
  // -------------------------
  if (action === "get_project_files") {
    try {
      var projectName = e.parameter.projectName;
      if (!projectName) {
        return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": "No project name provided" })).setMimeType(ContentService.MimeType.JSON);
      }

      var mainFolderName = "Dreamsdesign's Projects Attachments";
      var mainFolders = DriveApp.getFoldersByName(mainFolderName);
      if (!mainFolders.hasNext()) {
        return ContentService.createTextOutput(JSON.stringify({ "ok": true, "files": [] })).setMimeType(ContentService.MimeType.JSON);
      }
      var mainFolder = mainFolders.next();
      var projectFolders = mainFolder.getFoldersByName(projectName);
      if (!projectFolders.hasNext()) {
        return ContentService.createTextOutput(JSON.stringify({ "ok": true, "files": [] })).setMimeType(ContentService.MimeType.JSON);
      }
      var projectFolder = projectFolders.next();

      var filesResult = [];

      // Function to recursively get files
      function getFilesInFolder(folder, pathStr) {
        var files = folder.getFiles();
        while (files.hasNext()) {
          var f = files.next();
          filesResult.push({
            name: f.getName(),
            url: f.getUrl(),
            type: f.getMimeType(),
            department: pathStr || "General",
            date: Utilities.formatDate(f.getDateCreated(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
          });
        }
        var subFolders = folder.getFolders();
        while (subFolders.hasNext()) {
          var subFolder = subFolders.next();
          getFilesInFolder(subFolder, subFolder.getName());
        }
      }

      getFilesInFolder(projectFolder, "");

      return ContentService.createTextOutput(JSON.stringify({ "ok": true, "files": filesResult })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ "ok": false, "error": err.message })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // -------------------------
  // 5. READ CHATS
  // -------------------------
  var sheets = ss.getSheets();
  var result = [];
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var sName = sheet.getName();
    if (sName !== "Chat" && sName.indexOf("group_") !== 0) continue;
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) continue;
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = row[j];
      }
      result.push(obj);
    }
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// Helper to record login activity in the Activity sheet
function recordActivityLogin(ss, employeeId, fullName, role, department) {
  var activitySheet = ss.getSheetByName("Activity");
  if (!activitySheet) {
    activitySheet = ss.insertSheet("Activity");
    activitySheet.appendRow(["Employee ID", "Full Name", "Role", "Department", "Login Date and Time", "Logout Date and Time"]);
  }
  var now = new Date();
  var formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
  
  activitySheet.appendRow([
    employeeId,
    fullName,
    role,
    department,
    formattedTime,
    "" // Logout Date and Time starts empty
  ]);
}

// Helper to record logout activity in the Activity sheet
function recordActivityLogout(ss, email) {
  var teamSheet = ss.getSheetByName("Team");
  var activitySheet = ss.getSheetByName("Activity");
  if (!teamSheet || !activitySheet) return;
  
  var teamData = teamSheet.getDataRange().getValues();
  var empId = "";
  for (var i = 1; i < teamData.length; i++) {
    if (String(teamData[i][2]).trim().toLowerCase() === String(email).trim().toLowerCase()) {
      empId = teamData[i][0];
      break;
    }
  }
  if (!empId) return;

  var activityData = activitySheet.getDataRange().getValues();
  // Find the last row for this employee where logout time is empty, or update their latest record
  for (var j = activityData.length - 1; j >= 1; j--) {
    if (String(activityData[j][0]).trim() === String(empId).trim()) {
      if (String(activityData[j][5]).trim() === "") {
        var now = new Date();
        var formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
        activitySheet.getRange(j + 1, 6).setValue(formattedTime);
        return;
      }
    }
  }
}
