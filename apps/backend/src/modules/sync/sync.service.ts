import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { DataSource, In, Repository } from 'typeorm';
import { Cliente } from '../clientes/entities/cliente.entity';
import { MovimientoInventario } from '../inventario/entities/movimiento-inventario.entity';
import { Venta } from '../ventas/entities/venta.entity';
import { SyncLog } from './entities/sync-log.entity';

const execAsync = promisify(exec);

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly supabaseClient: SupabaseClient;
  private ultimaSync: Date | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectQueue('sync') private readonly syncQueue: Queue,
    @InjectRepository(SyncLog) private readonly syncLogRepository: Repository<SyncLog>,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') ?? 'http://localhost:54321';
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY') ?? 'local-dev-key';
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  async syncTabla(tabla: string, registros: Record<string, unknown>[]) {
    if (!registros.length) {
      return { count: 0 };
    }

    const { data, error } = await this.supabaseClient
      .from(tabla)
      .upsert(registros, { onConflict: 'id' })
      .select('id');

    if (error) {
      throw new Error(error.message);
    }

    this.ultimaSync = new Date();
    return { count: data?.length ?? registros.length };
  }

  async queueSync(tabla: string, ids: string[]) {
    if (!ids.length) {
      return null;
    }

    return this.syncQueue.add(
      'sync-tabla',
      { tabla, ids },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );
  }

  async resolverRegistrosPorIds(tabla: string, ids: string[]) {
    if (!ids.length) {
      return [];
    }

    if (tabla === 'ventas') {
      return this.dataSource.getRepository(Venta).find({ where: { id: In(ids) } });
    }

    if (tabla === 'movimiento_inventarios') {
      return this.dataSource.getRepository(MovimientoInventario).find({ where: { id: In(ids) } });
    }

    if (tabla === 'clientes') {
      return this.dataSource.getRepository(Cliente).find({ where: { id: In(ids) } });
    }

    throw new Error(`Tabla no soportada para sync: ${tabla}`);
  }

  async registrarSync(
    tabla: string,
    operacion: string,
    registrosAfectados: number,
    estado: 'OK' | 'ERROR',
    error?: string,
  ) {
    const log = this.syncLogRepository.create({
      tabla,
      operacion,
      registrosAfectados,
      estado,
      error: error ?? null,
      activo: true,
    });

    await this.syncLogRepository.save(log);
  }

  @Cron('0 2 * * *')
  async backupNocturno() {
    const databaseUrl = this.configService.get<string>('SUPABASE_DB_URL');
    if (!databaseUrl) {
      this.logger.warn('SUPABASE_DB_URL no configurada. Backup nocturno omitido.');
      return;
    }

    const fecha = new Date().toISOString().slice(0, 10);
    const output = `backup_${fecha}.dump`;
    const comando = `DATABASE_URL="${databaseUrl}" pg_dump --no-acl --no-owner -Fc "$DATABASE_URL" > "${output}"`;

    try {
      await execAsync(comando, { cwd: process.cwd(), shell: '/bin/bash' });
      this.logger.log(`Backup generado: ${output}`);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido en backup';
      this.logger.error(`Falló backup nocturno: ${mensaje}`);
      await this.registrarSync('database', 'backupNocturno', 0, 'ERROR', mensaje);
    }
  }

  async forzarSyncInmediato() {
    const tablas = ['ventas', 'movimiento_inventarios', 'clientes'] as const;
    let encolados = 0;

    for (const tabla of tablas) {
      const ids = await this.obtenerIdsActivos(tabla);
      if (ids.length) {
        await this.queueSync(tabla, ids);
        encolados += 1;
      }
    }

    return { encolados };
  }

  private async obtenerIdsActivos(tabla: 'ventas' | 'movimiento_inventarios' | 'clientes') {
    if (tabla === 'ventas') {
      const registros = await this.dataSource.getRepository(Venta).find({ select: ['id'] });
      return registros.map((item) => item.id);
    }

    if (tabla === 'movimiento_inventarios') {
      const registros = await this.dataSource
        .getRepository(MovimientoInventario)
        .find({ select: ['id'], where: { activo: true } });
      return registros.map((item) => item.id);
    }

    const registros = await this.dataSource
      .getRepository(Cliente)
      .find({ select: ['id'], where: { activo: true } });
    return registros.map((item) => item.id);
  }

  async getSyncStatus() {
    const [pendientes, completados, errores, ultima] = await Promise.all([
      this.syncQueue.getWaitingCount(),
      this.syncQueue.getCompletedCount(),
      this.syncQueue.getFailedCount(),
      this.syncLogRepository.findOne({
        where: { activo: true },
        order: { creadoEn: 'DESC' },
      }),
    ]);

    return {
      pendientes,
      completados,
      errores,
      ultimaSync: this.ultimaSync ?? ultima?.creadoEn ?? null,
      historial: await this.syncLogRepository.find({
        where: { activo: true },
        order: { creadoEn: 'DESC' },
        take: 10,
      }),
    };
  }
}
