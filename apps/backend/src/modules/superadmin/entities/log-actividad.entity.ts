import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum ResultadoActividad {
  EXITO = 'EXITO',
  ERROR = 'ERROR',
}

@Entity('logs_actividad')
@Index(['empresaId'])
@Index(['createdAt'])
export class LogActividad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  empresaId: string | null;

  @Column({ type: 'uuid', nullable: true })
  usuarioId: string | null;

  @Column({ type: 'varchar', length: 50 })
  ipAddress: string;

  @Column({ type: 'varchar', length: 50 })
  modulo: string;

  @Column({ type: 'varchar', length: 100 })
  accion: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entidadTipo: string | null;

  @Column({ type: 'uuid', nullable: true })
  entidadId: string | null;

  @Column({ type: 'enum', enum: ResultadoActividad, default: ResultadoActividad.EXITO })
  resultado: ResultadoActividad;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'int' })
  duracionMs: number;

  @CreateDateColumn()
  createdAt: Date;
}
