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
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Mensaje } from './mensaje.entity';

export enum CanalOmnicanal {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  WEB_CHAT = 'WEB_CHAT',
}

export enum EstadoConversacion {
  NUEVA = 'NUEVA',
  ASIGNADA = 'ASIGNADA',
  EN_ATENCION = 'EN_ATENCION',
  RESUELTA = 'RESUELTA',
  CERRADA = 'CERRADA',
}

export enum PrioridadConversacion {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

@Entity('omnicanal_conversaciones')
@Index('idx_omnicanal_conv_ultimo_mensaje', ['ultimoMensajeEn'])
@Index('idx_omnicanal_conv_contacto', ['contactoIdentificador'])
export class Conversacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CanalOmnicanal, enumName: 'omnicanal_canal_enum' })
  canal: CanalOmnicanal;

  @Column({
    type: 'enum',
    enum: EstadoConversacion,
    enumName: 'omnicanal_estado_conversacion_enum',
    default: EstadoConversacion.NUEVA,
  })
  estado: EstadoConversacion;

  @Column({ type: 'uuid', nullable: true })
  clienteId?: string | null;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'clienteId' })
  cliente?: Cliente | null;

  @Column({ type: 'varchar', length: 150 })
  contactoNombre: string;

  @Column({ type: 'varchar', length: 200 })
  contactoIdentificador: string;

  @Column({ type: 'uuid', nullable: true })
  asignadoAId?: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'asignadoAId' })
  asignadoA?: Usuario | null;

  @Column({
    type: 'enum',
    enum: PrioridadConversacion,
    enumName: 'omnicanal_prioridad_conversacion_enum',
    default: PrioridadConversacion.MEDIA,
  })
  prioridad: PrioridadConversacion;

  @Column({ type: 'text', array: true, default: [] })
  etiquetas: string[];

  @Column({ type: 'timestamp' })
  primerMensajeEn: Date;

  @Column({ type: 'timestamp' })
  ultimoMensajeEn: Date;

  @Column({ type: 'timestamp', nullable: true })
  resueltaEn?: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  canalExternoId?: string | null;

  @OneToMany(() => Mensaje, (mensaje) => mensaje.conversacion)
  mensajes: Mensaje[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
