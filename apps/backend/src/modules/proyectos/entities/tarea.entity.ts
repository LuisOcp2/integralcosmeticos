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
import { Proyecto } from './proyecto.entity';
import { Empleado } from '../../rrhh/entities/empleado.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { ComentarioTarea } from './comentario-tarea.entity';

export enum EstadoTarea {
  PENDIENTE = 'PENDIENTE',
  EN_PROGRESO = 'EN_PROGRESO',
  REVISION = 'REVISION',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

export enum PrioridadTarea {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

@Entity('proyectos_tareas')
export class Tarea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  proyectoId: string;

  @ManyToOne(() => Proyecto, (proyecto) => proyecto.tareas, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proyectoId' })
  proyecto: Proyecto;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Tarea, (tarea) => tarea.subtareas, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent: Tarea | null;

  @OneToMany(() => Tarea, (tarea) => tarea.parent)
  subtareas: Tarea[];

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'enum', enum: EstadoTarea, default: EstadoTarea.PENDIENTE })
  estado: EstadoTarea;

  @Column({ type: 'enum', enum: PrioridadTarea, default: PrioridadTarea.MEDIA })
  prioridad: PrioridadTarea;

  @Column({ type: 'uuid' })
  asignadoAId: string;

  @ManyToOne(() => Empleado, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'asignadoAId' })
  asignadoA: Empleado;

  @Column({ type: 'uuid' })
  creadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column({ type: 'date', nullable: true })
  fechaVencimiento: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  estimacionHoras: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  horasReales: number;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ type: 'timestamp', nullable: true })
  completadaEn: Date | null;

  @OneToMany(() => ComentarioTarea, (comentario) => comentario.tarea)
  comentarios: ComentarioTarea[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
