import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sede } from '../../sedes/entities/sede.entity';
import { Empleado } from './empleado.entity';
import { Turno } from './turno.entity';

@Entity('rrhh_asignaciones_turno')
export class AsignacionTurno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  empleadoId: string;

  @ManyToOne(() => Empleado, (empleado) => empleado.asignacionesTurno, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'empleadoId' })
  empleado: Empleado;

  @Column({ type: 'uuid' })
  turnoId: string;

  @ManyToOne(() => Turno, (turno) => turno.asignaciones, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'turnoId' })
  turno: Turno;

  @Column({ type: 'date' })
  fechaDesde: string;

  @Column({ type: 'date', nullable: true })
  fechaHasta: string | null;

  @Column({ type: 'uuid' })
  sedeId: string;

  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;
}
