const { app, BrowserWindow, dialog, session } = require('electron');
const path = require('node:path');

app.setName('Keppler');
app.setAppUserModelId('com.keppler.desktop');

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 600,
    title: 'Keppler',
    icon: path.join(__dirname, '../dist/Logomark with rounded bg.png'),
    backgroundColor: '#2c2c2c',
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#2c2c2c', symbolColor: '#f5f5f5', height: 48 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    const destination = new URL(url);
    const current = new URL(window.webContents.getURL());
    if (destination.origin !== current.origin || destination.pathname !== current.pathname) {
      event.preventDefault();
    }
  });
  window.on('ready-to-show', () => window.show());
  window.webContents.on('did-finish-load', () => {
    void window.webContents.insertCSS('body::before { content: "Keppler"; display: block; height: 48px; padding-left: 16px; line-height: 48px; color: #d6d6d6; font: 600 14px/48px sans-serif; -webkit-app-region: drag; }');
  });

  const devUrl = !app.isPackaged && process.env.KEPPLER_DEV_URL;
  if (devUrl) {
    const url = new URL(devUrl);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') {
      throw new Error('The development server must use HTTP on 127.0.0.1.');
    }
    await window.loadURL(url.href);
  } else {
    await window.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(showStartupError);
    }
  });
}).catch(showStartupError);

function showStartupError(error) {
  dialog.showErrorBox('Keppler could not start', error.message);
  app.quit();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
