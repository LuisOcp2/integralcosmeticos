export {};

declare global {
  interface Window {
    electronAPI?: {
      printTicket: (pdfBuffer: Uint8Array | ArrayBuffer | number[]) => Promise<boolean>;
      getVersion: () => Promise<string>;
      notifySyncRefresh: () => Promise<boolean>;
      onSyncStatus: (callback: (status: unknown) => void) => () => void;
    };
  }
}
