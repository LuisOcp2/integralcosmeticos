import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoLogIntegracion {
  REQUEST = 'REQUEST',
  WEBHOOK = 'WEBHOOK',
}

export enum EstadoLogIntegracion {
  EXITO = 'EXITO',
  ERROR = 'ERROR',
}

@Entity('logs_integracion')
@Index(['integracionId'])
@Index(['createdAt'])
export class LogIntegracion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  integracionId: string;

  @Column({ type: 'enum', enum: TipoLogIntegracion })
  tipo: TipoLogIntegracion;

  @Column({ type: 'enum', enum: EstadoLogIntegracion })
  estado: EstadoLogIntegracion;

  @Column({ type: 'jsonb', nullable: true })
  request: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  response: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'int' })
  duracionMs: number;

  @CreateDateColumn()
  createdAt: Date;
}
