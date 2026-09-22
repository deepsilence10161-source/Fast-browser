/**
 * FastBrowser Preload Script
 * Bridges safe APIs between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fastBrowserAPI', {
  isElectron: true,
  history: {
    get: (params) => ipcRenderer.invoke('history:get', params),
    add: (entry) => ipcRenderer.invoke('history:add', entry),
    delete: (id) => ipcRenderer.invoke('history:delete', id),
    deleteSelected: (ids) => ipcRenderer.invoke('history:delete-selected', ids),
    clearBrowsingData: (opts) => ipcRenderer.invoke('history:clear-browsing-data', opts)
  },
  adblock: {
    getStats: () => ipcRenderer.invoke('adblock:get-stats'),
    toggle: (enable) => ipcRenderer.invoke('adblock:toggle', enable)
  },
  antiLag: {
    getScript: () => ipcRenderer.invoke('anti-lag:get-script')
  }
});
