import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoNotificacion {
  INFO = 'INFO',
  ALERTA = 'ALERTA',
  ERROR = 'ERROR',
  EXITO = 'EXITO',
  RECORDATORIO = 'RECORDATORIO',
}

export enum CategoriaNotificacion {
  STOCK = 'STOCK',
  VENTA = 'VENTA',
  CRM = 'CRM',
  RRHH = 'RRHH',
  FINANZAS = 'FINANZAS',
  DOCUMENTO = 'DOCUMENTO',
  SISTEMA = 'SISTEMA',
  TAREA = 'TAREA',
  GENERAL = 'GENERAL',
}

export enum PrioridadNotificacion {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

@Entity('notificaciones')
@Index('idx_notificaciones_usuario_leida', ['usuarioId', 'leida'])
@Index('idx_notificaciones_expires_at', ['expiresAt'])
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  usuarioId: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column({
    type: 'enum',
    enum: TipoNotificacion,
    enumName: 'notificacion_tipo_enum',
  })
  tipo: TipoNotificacion;

  @Column({
    type: 'enum',
    enum: CategoriaNotificacion,
    enumName: 'notificacion_categoria_enum',
  })
  categoria: CategoriaNotificacion;

  @Column({ type: 'varchar', length: 200 })
  titulo: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ default: false })
  leida: boolean;

  @Column({ type: 'timestamp', nullable: true })
  leidaEn?: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  accionLabel?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  accionRuta?: string | null;

  @Column({
    type: 'enum',
    enum: PrioridadNotificacion,
    enumName: 'notificacion_prioridad_enum',
    default: PrioridadNotificacion.MEDIA,
  })
  prioridad: PrioridadNotificacion;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
