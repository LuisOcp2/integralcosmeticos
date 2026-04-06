import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Empleado } from './empleado.entity';
import { Turno } from './turno.entity';

export enum TipoAsistencia {
  NORMAL = 'NORMAL',
  HORA_EXTRA = 'HORA_EXTRA',
  FESTIVO = 'FESTIVO',
  VACACIONES = 'VACACIONES',
  INCAPACIDAD = 'INCAPACIDAD',
  PERMISO = 'PERMISO',
  AUSENCIA = 'AUSENCIA',
}

@Entity('rrhh_asistencias')
@Index('uq_rrhh_asistencia_empleado_fecha', ['empleadoId', 'fecha'], { unique: true })
export class Asistencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empleadoId: string;

  @ManyToOne(() => Empleado, (empleado) => empleado.asistencias, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'empleadoId' })
  empleado: Empleado;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'uuid', nullable: true })
  turnoId: string | null;

  @ManyToOne(() => Turno, (turno) => turno.asistencias, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'turnoId' })
  turno: Turno | null;

  @Column({ type: 'timestamp', nullable: true })
  horaEntrada: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  horaSalida: Date | null;

  @Column({ type: 'enum', enum: TipoAsistencia, default: TipoAsistencia.NORMAL })
  tipo: TipoAsistencia;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;
}
