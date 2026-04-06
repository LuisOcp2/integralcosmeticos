import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Empleado } from './empleado.entity';

export enum EstadoVacaciones {
  SOLICITADA = 'SOLICITADA',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  EN_CURSO = 'EN_CURSO',
  COMPLETADA = 'COMPLETADA',
}

@Entity('rrhh_vacaciones')
export class Vacaciones {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empleadoId: string;

  @ManyToOne(() => Empleado, (empleado) => empleado.vacaciones, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'empleadoId' })
  empleado: Empleado;

  @Column({ type: 'date' })
  fechaInicio: string;

  @Column({ type: 'date' })
  fechaFin: string;

  @Column({ type: 'int' })
  diasHabiles: number;

  @Column({ type: 'enum', enum: EstadoVacaciones, default: EstadoVacaciones.SOLICITADA })
  estado: EstadoVacaciones;

  @Column({ type: 'uuid', nullable: true })
  aprobadaPorId: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'aprobadaPorId' })
  aprobadaPor: Usuario | null;

  @Column({ type: 'text', nullable: true })
  motivoRechazo: string | null;
}
