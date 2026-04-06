import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Empleado } from '../../rrhh/entities/empleado.entity';

export enum RolMiembroProyecto {
  LIDER = 'LIDER',
  MIEMBRO = 'MIEMBRO',
  OBSERVADOR = 'OBSERVADOR',
}

@Entity('proyectos_miembros')
@Index('idx_proyecto_miembro_unico', ['proyectoId', 'empleadoId'], { unique: true })
export class MiembroProyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  proyectoId: string;

  @ManyToOne(() => Proyecto, (proyecto) => proyecto.miembros, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proyectoId' })
  proyecto: Proyecto;

  @Column({ type: 'uuid' })
  empleadoId: string;

  @ManyToOne(() => Empleado, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'empleadoId' })
  empleado: Empleado;

  @Column({ type: 'enum', enum: RolMiembroProyecto })
  rol: RolMiembroProyecto;
}
