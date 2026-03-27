export {};

declare global {
  interface Window {
    electronAPI?: {
      printTicket: (pdfBuffer: Uint8Array | ArrayBuffer | number[]) => Promise<boolean>;
      getVersion: () => Promise<string>;
      onSyncStatus: (callback: (status: unknown) => void) => void;
    };
  }
}
