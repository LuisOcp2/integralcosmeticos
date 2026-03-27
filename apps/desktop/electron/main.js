const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const isDev = process.env.NODE_ENV !== 'production';

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;

function parseDeepLink(url) {
  if (!mainWindow || !url || !url.startsWith('integralcosmeticos://')) {
    return;
  }

  if (url.includes('printer')) {
    mainWindow.webContents.send('sync-status', {
      type: 'DEEP_LINK',
      payload: url,
    });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hidden',
    frame: true,
    show: false,
    title: 'Integral Cosméticos',
  });

  mainWindow = win;

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.once('ready-to-show', () => win.show());

  // Abrir links externos en el navegador por defecto
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}

ipcMain.handle('print-ticket', async (_event, pdfBuffer) => {
  const printWindow = new BrowserWindow({ show: false });
  const bytes = Array.isArray(pdfBuffer) ? Uint8Array.from(pdfBuffer) : new Uint8Array(pdfBuffer);
  const dataUrl = `data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}`;

  await printWindow.loadURL(dataUrl);

  return new Promise((resolve, reject) => {
    printWindow.webContents.print(
      { silent: true, printBackground: false },
      (success, failureReason) => {
        printWindow.close();
        if (!success) {
          reject(new Error(failureReason || 'No se pudo imprimir ticket'));
          return;
        }
        resolve(true);
      },
    );
  });
});

ipcMain.handle('get-app-version', async () => app.getVersion());
ipcMain.handle('notify-sync-refresh', async () => {
  if (!mainWindow) {
    return false;
  }

  mainWindow.webContents.send('sync-status', {
    type: 'SYNC_REFRESH_REQUESTED',
    payload: { at: new Date().toISOString() },
  });

  return true;
});

app.whenReady().then(() => {
  if (process.argv.length > 1) {
    parseDeepLink(process.argv.at(-1));
  }

  app.setAsDefaultProtocolClient('integralcosmeticos');

  createWindow();

  if (!isDev) {
    autoUpdater.on('update-available', () => {
      if (mainWindow) {
        mainWindow.webContents.send('sync-status', {
          type: 'UPDATE_AVAILABLE',
          payload: { at: new Date().toISOString() },
        });
      }
    });
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    parseDeepLink(url);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('second-instance', (_event, argv) => {
  const deepLinkArg = argv.find((arg) => arg.startsWith('integralcosmeticos://'));
  if (deepLinkArg) {
    parseDeepLink(deepLinkArg);
  }
});
