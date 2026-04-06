import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tarea } from './tarea.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('proyectos_comentarios_tarea')
export class ComentarioTarea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tareaId: string;

  @ManyToOne(() => Tarea, (tarea) => tarea.comentarios, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tareaId' })
  tarea: Tarea;

  @Column({ type: 'uuid' })
  autorId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'autorId' })
  autor: Usuario;

  @Column({ type: 'text' })
  texto: string;

  @CreateDateColumn()
  createdAt: Date;
}
