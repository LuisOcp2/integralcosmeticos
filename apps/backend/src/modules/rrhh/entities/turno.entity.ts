import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AsignacionTurno } from './asignacion-turno.entity';
import { Asistencia } from './asistencia.entity';

@Entity('rrhh_turnos')
export class Turno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'time' })
  horaInicio: string;

  @Column({ type: 'time' })
  horaFin: string;

  @Column({ type: 'int', array: true })
  diasSemana: number[];

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => AsignacionTurno, (asignacion) => asignacion.turno)
  asignaciones: AsignacionTurno[];

  @OneToMany(() => Asistencia, (asistencia) => asistencia.turno)
  asistencias: Asistencia[];
}
