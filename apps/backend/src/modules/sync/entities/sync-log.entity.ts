import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SyncEstado = 'OK' | 'ERROR';

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  tabla: string;

  @Column({ length: 50 })
  operacion: string;

  @Column({ type: 'int', default: 0 })
  registrosAfectados: number;

  @Column({ type: 'varchar', length: 10 })
  estado: SyncEstado;

  @Column({ type: 'text', nullable: true })
  error?: string | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
