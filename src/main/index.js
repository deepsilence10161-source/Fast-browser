/**
 * FastBrowser - Ultra Fast Chrome Desktop Application Core
 * Powered by Chromium & Electron with Zero-Telemetry Flags
 */

const { app, BrowserWindow, ipcMain, session, Menu } = require('electron');
const path = require('path');
const adBlocker = require('./adblocker');
const HistoryManager = require('./history-manager');
const { LMARENA_ANTI_LAG_JS } = require('./lmarena-turbo-engine');

// --- 1. Apply High-Performance Zero-Telemetry Engine Flags ---
// Strips Google tracking, sync, telemetry, and boosts hardware rendering speed
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-breakpad');
app.commandLine.appendSwitch('disable-client-side-phishing-detection');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('no-default-browser-check');

// Turbo Graphics & Network Acceleration
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,ParallelDownloading,CanvasOopRasterization');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --expose-gc');

let mainWindow = null;
const historyManager = new HistoryManager(path.join(app.getPath('userData'), 'history.json'));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: 'FastBrowser - Light Speed Browser',
    backgroundColor: '#202124',
    titleBarStyle: 'hidden', // Chrome-like seamless tab bar
    titleBarOverlay: {
      color: '#dee1e6',
      symbolColor: '#1f1f1f',
      height: 40
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enables high-performance multi-tab webviews
      sandbox: true
    }
  });

  // Remove default menu to mimic modern clean Chrome window
  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup Network Interceptor (Network Layer Ad & Tracker Blocker)
  const ses = session.defaultSession;
  
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (adBlocker.isBlocked(details.url)) {
      return callback({ cancel: true });
    }
    callback({ cancel: false });
  });

  // Strip Google & Third-Party Telemetry Headers
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    delete details.requestHeaders['X-Client-Data'];
    delete details.requestHeaders['sec-ch-ua-model'];
    callback({ requestHeaders: details.requestHeaders });
  });
}

// App lifecycle
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers for Chrome UI Controls ---
function setupIpcHandlers() {
  // History Handlers
  ipcMain.handle('history:get', async (event, params) => {
    return historyManager.getHistory(params);
  });

  ipcMain.handle('history:add', async (event, entry) => {
    return historyManager.addEntry(entry);
  });

  ipcMain.handle('history:delete', async (event, id) => {
    return historyManager.deleteEntry(id);
  });

  ipcMain.handle('history:delete-selected', async (event, ids) => {
    return historyManager.deleteSelected(ids);
  });

  ipcMain.handle('history:clear-browsing-data', async (event, options) => {
    const result = historyManager.clearBrowsingData(options);
    if (options.clearCache) {
      await session.defaultSession.clearCache();
    }
    if (options.clearCookies) {
      await session.defaultSession.clearStorageData({ storages: ['cookies'] });
    }
    return result;
  });

  // AdBlock & Turbo Stats Handlers
  ipcMain.handle('adblock:get-stats', async () => {
    return adBlocker.getStats();
  });

  ipcMain.handle('adblock:toggle', async (event, enable) => {
    return adBlocker.toggle(enable);
  });

  // LMArena Anti-Lag Script Retrieval
  ipcMain.handle('anti-lag:get-script', async () => {
    return LMARENA_ANTI_LAG_JS;
  });
}
