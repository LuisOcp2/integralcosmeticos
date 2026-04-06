import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Empleado } from '../../rrhh/entities/empleado.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Tarea } from './tarea.entity';
import { MiembroProyecto } from './miembro-proyecto.entity';

export enum TipoProyecto {
  INTERNO = 'INTERNO',
  CLIENTE = 'CLIENTE',
  INFRAESTRUCTURA = 'INFRAESTRUCTURA',
  MARKETING = 'MARKETING',
  TI = 'TI',
}

export enum EstadoProyecto {
  PLANIFICACION = 'PLANIFICACION',
  EN_EJECUCION = 'EN_EJECUCION',
  PAUSADO = 'PAUSADO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
}

export enum PrioridadProyecto {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

@Entity('proyectos')
@Index('idx_proyectos_codigo', ['codigo'], { unique: true })
export class Proyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ type: 'enum', enum: TipoProyecto })
  tipo: TipoProyecto;

  @Column({ type: 'enum', enum: EstadoProyecto, default: EstadoProyecto.PLANIFICACION })
  estado: EstadoProyecto;

  @Column({ type: 'uuid' })
  responsableId: string;

  @ManyToOne(() => Empleado, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responsableId' })
  responsable: Empleado;

  @Column({ type: 'uuid', nullable: true })
  clienteId: string | null;

  @ManyToOne(() => Cliente, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente | null;

  @Column({ type: 'date' })
  fechaInicio: string;

  @Column({ type: 'date' })
  fechaFinEsperada: string;

  @Column({ type: 'date', nullable: true })
  fechaFinReal: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  presupuesto: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  costoActual: number;

  @Column({ type: 'enum', enum: PrioridadProyecto, default: PrioridadProyecto.MEDIA })
  prioridad: PrioridadProyecto;

  @Column({ type: 'int', default: 0 })
  porcentajeAvance: number;

  @OneToMany(() => Tarea, (tarea) => tarea.proyecto)
  tareas: Tarea[];

  @OneToMany(() => MiembroProyecto, (miembro) => miembro.proyecto)
  miembros: MiembroProyecto[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
