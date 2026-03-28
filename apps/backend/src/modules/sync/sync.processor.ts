import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { randomUUID } from 'node:crypto';
import { SyncService } from './sync.service';

interface SyncJobData {
  tabla: string;
  ids: string[];
}

@Processor('sync')
export class SyncProcessor {
  constructor(private readonly syncService: SyncService) {}

  @Process('sync-tabla')
  async handleSync(job: Job<SyncJobData>) {
    const { tabla, ids } = job.data;

    try {
      const registros = await this.syncService.resolverRegistrosPorIds(tabla, ids);
      const resultado = await this.syncService.syncTabla(
        tabla,
        registros as unknown as Record<string, unknown>[],
      );

      await this.syncService.registrarSync(tabla, 'upsert', ids[0] ?? randomUUID(), 'SINCRONIZADO');

      return { estado: 'OK', registrosAfectados: resultado.count };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido en sync';
      const intentos = (job.attemptsMade ?? 0) + 1;
      await this.syncService.registrarSync(
        tabla,
        `upsert-intento-${intentos}`,
        ids[0] ?? randomUUID(),
        'ERROR',
        mensaje,
      );
      throw error;
    }
  }
}
