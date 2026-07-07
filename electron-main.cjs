const { app, BrowserWindow, Notification, Tray, Menu, nativeImage, ipcMain, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const express = require('express')
const http = require('http')

const PROTOCOL = 'dreamsdesk'

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

let initialDeepLinkUrl = null
if (process.platform === 'win32' || process.platform === 'linux') {
  initialDeepLinkUrl = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`)) || null
}

ipcMain.handle('get-initial-deep-link', () => {
  const url = initialDeepLinkUrl
  initialDeepLinkUrl = null
  return url
})

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

let mainWindow
let tray = null
let isQuitting = false

app.on('second-instance', (event, commandLine, workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`))
    if (url) {
      mainWindow.webContents.send('deep-link', url)
    }
  }
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Dreamsdesk",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, process.env.NODE_ENV === 'development' ? 'public' : 'dist', 'logo.ico')
  })

  // Set App User Model ID for Windows Notifications
  app.setAppUserModelId('com.dreamsdesign.taskapp')

  ipcMain.on('show-notification', (event, { title, body, icon }) => {
    new Notification({ title, body, icon: icon || path.join(__dirname, process.env.NODE_ENV === 'development' ? 'public' : 'dist', 'logo.ico') }).show()
  })

  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    // Vite dev server runs on 8000 in this project
    mainWindow.loadURL('http://localhost:8000')
  } else {
    // Serve files via HTTP to bypass file:// protocol restrictions in Google OAuth
    const expressApp = express()
    expressApp.use(express.static(path.join(__dirname, 'dist')))
    // SPA fallback: serve index.html for any unmatched route
    expressApp.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'))
    })
    
    const localServer = http.createServer(expressApp)
    const PORT = 8000
    localServer.listen(PORT, 'localhost', () => {
      mainWindow.loadURL(`http://localhost:${PORT}`)
    })
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  const isDev = process.env.NODE_ENV === 'development'
  const iconPath = path.join(__dirname, isDev ? 'public' : 'dist', 'logo.ico')
  const icon = fs.existsSync(iconPath) ? iconPath : nativeImage.createEmpty()
  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Quit', click: () => {
      isQuitting = true
      app.quit()
    }}
  ])
  tray.setToolTip('Dreamsdesk')
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    }
  })
}



// ── Timer Overlay Window (always-on-top pill) ──
let timerOverlay = null

function createTimerOverlay() {
  if (timerOverlay && !timerOverlay.isDestroyed()) {
    timerOverlay.close()
    timerOverlay = null
  }

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  timerOverlay = new BrowserWindow({
    width: 150,
    height: 44,
    x: screenW - 174,
    y: screenH - 68,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    transparent: true,
    resizable: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  timerOverlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: transparent;
    overflow: hidden;
    height: 100vh;
    -webkit-app-region: drag;
    user-select: none;
  }
  .overlay {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: linear-gradient(90deg, #702c91 0%, #ec008c 50%, #702c91 100%);
    background-size: 200% 100%;
    border-radius: 999px;
    box-shadow: 0 4px 12px rgba(91, 33, 182, 0.3);
    height: 100%;
    -webkit-app-region: drag;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #25d366;
    animation: timerPulse 1.8s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes timerPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.75); }
  }
  .time {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    line-height: 1;
    font-family: 'Inter', 'SF Mono', 'Fira Code', monospace;
  }
  .stop-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s;
    -webkit-app-region: no-drag;
  }
  .stop-btn:hover { background: rgba(239, 68, 68, 0.85); }
  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-size: 14px;
    font-variation-settings: 'FILL' 0, 'wght' 400;
  }
</style>
</head>
<body>
<div class="overlay" id="root">
  <div class="dot"></div>
  <span class="time" id="timerDisplay">00:00:00</span>
  <button class="stop-btn" id="stopBtn" title="Stop Timer">
    <span class="material-symbols-outlined">stop</span>
  </button>
</div>
<script>
  const { ipcRenderer } = require('electron');
  const display = document.getElementById('timerDisplay');

  ipcRenderer.on('overlay-update', (event, data) => {
    display.textContent = data.time || '00:00:00';
  });

  document.getElementById('stopBtn').addEventListener('click', () => {
    ipcRenderer.send('timer-stop');
  });
</script>
</body>
</html>
`)}`)

  timerOverlay.on('closed', () => {
    timerOverlay = null
  })
}

function updateTimerOverlay(data) {
  if (timerOverlay && !timerOverlay.isDestroyed()) {
    timerOverlay.webContents.send('overlay-update', data)
  }
}

ipcMain.on('timer-update', (_event, data) => {
  if (data.active) {
    if (!timerOverlay || timerOverlay.isDestroyed()) {
      createTimerOverlay()
    }
    updateTimerOverlay(data)
  } else {
    if (timerOverlay && !timerOverlay.isDestroyed()) {
      timerOverlay.close()
    }
    timerOverlay = null
  }
})

ipcMain.on('timer-stop', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('timer-stop-from-overlay')
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit()
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  if (mainWindow) {
    mainWindow.webContents.send('deep-link', url)
  }
})
