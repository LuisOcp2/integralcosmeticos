import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Sede } from '../../sedes/entities/sede.entity';
import { Area } from './area.entity';
import { Cargo } from './cargo.entity';
import { Asistencia } from './asistencia.entity';
import { AsignacionTurno } from './asignacion-turno.entity';
import { Vacaciones } from './vacaciones.entity';
import { LiquidacionNomina } from '../nomina/entities/liquidacion-nomina.entity';

export enum TipoDocumentoEmpleado {
  CC = 'CC',
  CE = 'CE',
  PASAPORTE = 'PASAPORTE',
}

export enum TipoContratoEmpleado {
  INDEFINIDO = 'INDEFINIDO',
  FIJO = 'FIJO',
  OBRA_LABOR = 'OBRA_LABOR',
  PRESTACION_SERVICIOS = 'PRESTACION_SERVICIOS',
  APRENDIZ = 'APRENDIZ',
}

export enum EstadoEmpleado {
  ACTIVO = 'ACTIVO',
  RETIRADO = 'RETIRADO',
  SUSPENDIDO = 'SUSPENDIDO',
  VACACIONES = 'VACACIONES',
}

@Entity('rrhh_empleados')
export class Empleado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  usuarioId: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario | null;

  @Column({ type: 'enum', enum: TipoDocumentoEmpleado })
  tipoDocumento: TipoDocumentoEmpleado;

  @Column({ type: 'varchar', length: 20, unique: true })
  numeroDocumento: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100 })
  apellido: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  genero: string | null;

  @Column({ type: 'uuid' })
  cargoId: string;

  @ManyToOne(() => Cargo, (cargo) => cargo.empleados, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cargoId' })
  cargo: Cargo;

  @Column({ type: 'uuid' })
  areaId: string;

  @ManyToOne(() => Area, (area) => area.empleados, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'areaId' })
  area: Area;

  @Column({ type: 'uuid' })
  sedeId: string;

  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @Column({ type: 'enum', enum: TipoContratoEmpleado })
  tipoContrato: TipoContratoEmpleado;

  @Column({ type: 'date' })
  fechaIngreso: string;

  @Column({ type: 'date', nullable: true })
  fechaRetiro: string | null;

  @Column({ type: 'enum', enum: EstadoEmpleado, default: EstadoEmpleado.ACTIVO })
  estado: EstadoEmpleado;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  salarioBase: number;

  @Column({ default: true })
  auxilioTransporte: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  eps: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  arl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fondoPension: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  cuentaBancaria: string | null;

  @OneToMany(() => AsignacionTurno, (asignacion) => asignacion.empleado)
  asignacionesTurno: AsignacionTurno[];

  @OneToMany(() => Asistencia, (asistencia) => asistencia.empleado)
  asistencias: Asistencia[];

  @OneToMany(() => Vacaciones, (vacaciones) => vacaciones.empleado)
  vacaciones: Vacaciones[];

  @OneToMany(() => LiquidacionNomina, (liquidacion) => liquidacion.empleado)
  liquidacionesNomina: LiquidacionNomina[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
