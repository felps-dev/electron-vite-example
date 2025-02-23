import { app, shell, BrowserWindow, ipcMain, Menu, Tray, Notification, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import AppUpdater from './updater'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  const updater = new AppUpdater()
  updater.startInterval()

  // Setup Tray
  const trayIcon = nativeImage.createFromDataURL(
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAAUABQBAREA/8QAFwABAQEBAAAAAAAAAAAAAAAACAUHBv/EACcQAAEDBAEDBAMBAAAAAAAAAAECAwQFBgcRCAASIRQiMVEJI0Fh/9oACAEBAAA/ACbxW4SI5HYvvfKtZyvSrJo1myo8d+TPjlxpDWg7KfdV3J7UtsbKEjZWshJKANnQbf4UcXc9Q6rbHFPk9OuHINKiOTGKLcVFVT2qulse4R3FJQU/Y3368dwSnawIp8CZS50im1GM5HlRHVsPsuJ7VtuJUUqSoH4IIII/zphcKrXpGdsN5W4yw8m1O2r1uFEerWzTHqt6ek1t1kpLkd5vXvc/U3rzvSu4AhtXWjcNfx5Z8szPlCvHNKpeMKPSZLzEWZHrsZqo1Ka4w6hEaEplaySQVKWdaLaVgfJIFWdk04ZuyCKTWHatBF01X0092QJC5bXq3O15ToADhWNKKwPcTv8AvXEMvPR3UPsOrbcbUFoWhRCkqB2CCPII++rVZvy9rjcjvXBeFbqbkRKkR1zKg8+plKhohBWo9oI8HWvHUL56/9k='
  )
  const tray = new Tray(trayIcon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Hello from Numa!',
      click: (): void => {
        return new Notification({
          title: 'Numa App',
          body: 'Hello!'
        }).show()
      }
    },
    {
      label: 'Check for updates',
      click: (): void => {
        updater.restartUpdater()
      }
    }
  ])
  tray.setToolTip('This is my application.')
  tray.setContextMenu(contextMenu)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test /w tray
  ipcMain.on('ping', () => {
    new Notification({
      title: 'Numa App',
      body: 'Pong from Numa!'
    }).show()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
