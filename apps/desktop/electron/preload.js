const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printTicket: (pdfBuffer) => ipcRenderer.invoke('print-ticket', pdfBuffer),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  notifySyncRefresh: () => ipcRenderer.invoke('notify-sync-refresh'),
  onSyncStatus: (callback) => {
    ipcRenderer.on('sync-status', (_event, payload) => callback(payload));
    return () => ipcRenderer.removeAllListeners('sync-status');
  },
});
