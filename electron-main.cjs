const { app, BrowserWindow, Notification, Tray, Menu, nativeImage } = require('electron')
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
      contextIsolation: false
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, process.env.NODE_ENV === 'development' ? 'public' : 'dist', 'logo.ico')
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

  // Handle deep link if app was opened from a closed state (Windows/Linux)
  mainWindow.webContents.on('did-finish-load', () => {
    if (process.platform === 'win32' || process.platform === 'linux') {
      const url = process.argv.find(arg => arg.startsWith(`${PROTOCOL}://`))
      if (url) {
        mainWindow.webContents.send('deep-link', url)
      }
    }
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
