// Preload script de Electron
// Aquí se expondrán APIs seguras del sistema al renderer (React)
// cuando sea necesario (ej: impresora térmica, lector de barcode)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Impresión de tickets
  printTicket: (ticketHtml) => ipcRenderer.invoke('print-ticket', ticketHtml),
  // Info de la app
  getVersion: () => ipcRenderer.invoke('get-version'),
});
