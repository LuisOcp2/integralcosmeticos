import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type SyncEstado = 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR' | 'IGNORADO';

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  tabla: string;

  @Column({ length: 20 })
  operacion: string;

  @Column({ name: 'registro_id', type: 'uuid' })
  registroId: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20 })
  estado: SyncEstado;

  @Column({ type: 'int', default: 0 })
  intentos: number;

  @Column({ name: 'error_msg', type: 'text', nullable: true })
  error?: string | null;

  @Column({ name: 'sincronizado_en', type: 'timestamp with time zone', nullable: true })
  sincronizadoEn?: Date | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
