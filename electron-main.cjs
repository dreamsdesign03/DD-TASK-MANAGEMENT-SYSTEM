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

// ── Timer Overlay Window ──
let timerOverlay = null
let timerOverlayData = { active: false, time: '00:00:00', taskTitle: '', taskId: null }

function createTimerOverlay() {
  if (timerOverlay && !timerOverlay.isDestroyed()) {
    timerOverlay.close()
    timerOverlay = null
  }

  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  timerOverlay = new BrowserWindow({
    width: 240,
    height: 70,
    x: screenW - 260,
    y: screenH - 90,
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
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
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
    padding: 14px 18px;
    background: rgba(18, 16, 28, 0.92);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: 0 8px 48px rgba(0,0,0,0.5);
    height: 100%;
    -webkit-app-region: drag;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #25d366;
    animation: pulse 1.8s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.75); }
  }
  .time {
    font-size: 26px;
    font-weight: 700;
    color: #f0f0f0;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    flex: 1;
  }
  .stop-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: none;
    background: rgba(239, 68, 68, 0.85);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s;
    -webkit-app-region: no-drag;
    font-size: 18px;
  }
  .stop-btn:hover { background: #EF4444; }
  .stop-btn svg { width: 18px; height: 18px; }
</style>
</head>
<body>
<div class="overlay" id="root">
  <div class="dot"></div>
  <span class="time" id="timerDisplay">00:00:00</span>
  <button class="stop-btn" id="stopBtn" title="Stop Timer">
    <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
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
  timerOverlayData = data
  if (timerOverlay && !timerOverlay.isDestroyed()) {
    timerOverlay.webContents.send('overlay-update', data)
  }
}

ipcMain.on('timer-update', (event, data) => {
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
    timerOverlayData = { active: false, time: '00:00:00', taskTitle: '', taskId: null }
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
