import Dexie, { Table } from 'dexie';

export interface PendienteRecord {
  id?: number;
  payload: unknown;
  intentos: number;
  creadoEn: string;
}

class CosmeticosDB extends Dexie {
  ventasPendientes!: Table<PendienteRecord, number>;
  movimientosPendientes!: Table<PendienteRecord, number>;

  constructor() {
    super('cosmeticosDB');
    this.version(1).stores({
      ventasPendientes: '++id, intentos, creadoEn',
      movimientosPendientes: '++id, intentos, creadoEn',
    });
  }
}

export const offlineDB = new CosmeticosDB();
