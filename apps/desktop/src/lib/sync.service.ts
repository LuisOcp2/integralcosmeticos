import api from './api';
import { offlineDB } from './offline.db';

let intervalId: ReturnType<typeof setInterval> | null = null;

export async function syncPendientes(): Promise<void> {
  const pendientes = await offlineDB.ventasPendientes.toArray();

  for (const registro of pendientes) {
    try {
      await api.post('/ventas', registro.payload);
      if (registro.id) {
        await offlineDB.ventasPendientes.delete(registro.id);
      }
    } catch {
      if (registro.id) {
        await offlineDB.ventasPendientes.update(registro.id, {
          intentos: (registro.intentos ?? 0) + 1,
        });
      }
    }
  }
}

export function startAutoSync() {
  const handler = () => {
    void syncPendientes();
  };

  window.addEventListener('online', handler);

  if (!intervalId) {
    intervalId = setInterval(handler, 30000);
  }

  handler();

  return () => {
    window.removeEventListener('online', handler);
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}
