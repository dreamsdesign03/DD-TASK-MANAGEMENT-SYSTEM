const { app, BrowserWindow, Notification, Tray, Menu, nativeImage, ipcMain, screen } = require('electron')
const path = require('path')
const fs = require('fs')

const PROTOCOL = 'dreamsdesk'

// Log uncaught errors to a file so we can diagnose crashes
const logFile = path.join(app.getPath('temp'), 'dreamsdesk-crash.log')
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try { fs.appendFileSync(logFile, line) } catch (_) {}
  console.log(msg)
}
process.on('uncaughtException', (err) => { log('UNCAUGHT: ' + err.stack); app.quit() })
process.on('unhandledRejection', (err) => { log('UNHANDLED: ' + String(err)) })

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

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function getDistPath() {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, 'dist')
  }
  const appPath = app.getAppPath()
  log('getDistPath: appPath=' + appPath)
  const srcDist = path.join(appPath, 'dist')
  const destDist = path.join(app.getPath('temp'), 'dreamsdesk', 'dist')
  log('getDistPath: src=' + srcDist + ' dest=' + destDist)
  log('getDistPath: srcExists=' + fs.existsSync(srcDist) + ' destIndexExists=' + fs.existsSync(path.join(destDist, 'index.html')))
  if (fs.existsSync(srcDist) && !fs.existsSync(path.join(destDist, 'index.html'))) {
    try {
      log('getDistPath: copying dist from asar to temp...')
      copyDirSync(srcDist, destDist)
      log('getDistPath: copy done')
    } catch (e) {
      log('getDistPath: copy FAILED: ' + e.message)
    }
  }
  return destDist
}

let localServer = null

function createWindow() {
  log('createWindow: start')

  // Ensure dist is copied to temp BEFORE creating window (icon needed)
  const distPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, 'dist')
    : getDistPath()
  log('createWindow: distPath=' + distPath)

  const iconFile = path.join(distPath, 'logo.ico')
  const iconExists = fs.existsSync(iconFile)
  log('createWindow: iconFile=' + iconFile + ' exists=' + iconExists)

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
    icon: iconExists ? iconFile : undefined
  })

  app.setAppUserModelId('com.dreamsdesign.taskapp')

  ipcMain.on('show-notification', (event, { title, body, icon }) => {
    new Notification({ title, body, icon: icon || iconFile }).show()
  })

  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    mainWindow.loadURL('http://localhost:8000')
  } else {
    try {
      log('createWindow: distPath=' + distPath)
      log('createWindow: distExists=' + fs.existsSync(distPath))
      log('createWindow: indexExists=' + fs.existsSync(path.join(distPath, 'index.html')))

      const express = require('express')
      const http = require('http')
      const expressApp = express()
      expressApp.use(express.static(distPath))
      expressApp.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'))
      })
      localServer = http.createServer(expressApp)
      localServer.on('error', (err) => {
        log('SERVER ERROR: ' + err.message)
      })
      localServer.listen(0, '127.0.0.1', () => {
        const port = localServer.address().port
        log('createWindow: server listening on port ' + port)
        const url = `http://127.0.0.1:${port}`
        log('createWindow: loading ' + url)
        mainWindow.loadURL(url)
      })
    } catch (e) {
      log('createWindow: FAILED to start server: ' + e.message + '\n' + e.stack)
    }
  }

  mainWindow.webContents.on('did-fail-load', (e, code, desc) => {
    log('LOAD FAILED: ' + code + ' ' + desc)
  })

  mainWindow.webContents.on('console-message', (e, level, msg) => {
    if (level >= 2) log('CONSOLE [' + level + ']: ' + msg)
  })

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
  const iconPath = isDev
    ? path.join(__dirname, 'public', 'logo.ico')
    : path.join(app.getPath('temp'), 'dreamsdesk', 'dist', 'logo.ico')
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
  log('app ready')
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
    if (localServer) localServer.close()
    app.quit()
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  if (mainWindow) {
    mainWindow.webContents.send('deep-link', url)
  }
})
