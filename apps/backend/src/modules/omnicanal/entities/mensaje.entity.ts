import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Conversacion } from './conversacion.entity';

export enum TipoMensajeOmnicanal {
  TEXTO = 'TEXTO',
  IMAGEN = 'IMAGEN',
  AUDIO = 'AUDIO',
  DOCUMENTO = 'DOCUMENTO',
}

export enum DireccionMensajeOmnicanal {
  ENTRANTE = 'ENTRANTE',
  SALIENTE = 'SALIENTE',
}

export enum EstadoMensajeOmnicanal {
  ENVIADO = 'ENVIADO',
  ENTREGADO = 'ENTREGADO',
  LEIDO = 'LEIDO',
  FALLIDO = 'FALLIDO',
}

@Entity('omnicanal_mensajes')
export class Mensaje {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  conversacionId: string;

  @ManyToOne(() => Conversacion, (conversacion) => conversacion.mensajes, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversacionId' })
  conversacion: Conversacion;

  @Column({
    type: 'enum',
    enum: TipoMensajeOmnicanal,
    enumName: 'omnicanal_tipo_mensaje_enum',
  })
  tipo: TipoMensajeOmnicanal;

  @Column({
    type: 'enum',
    enum: DireccionMensajeOmnicanal,
    enumName: 'omnicanal_direccion_mensaje_enum',
  })
  direccion: DireccionMensajeOmnicanal;

  @Column({ type: 'text', nullable: true })
  contenido?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  archivoUrl?: string | null;

  @Column({
    type: 'enum',
    enum: EstadoMensajeOmnicanal,
    enumName: 'omnicanal_estado_mensaje_enum',
    default: EstadoMensajeOmnicanal.ENVIADO,
  })
  estado: EstadoMensajeOmnicanal;

  @Column({ type: 'uuid', nullable: true })
  enviadoPorId?: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'enviadoPorId' })
  enviadoPor?: Usuario | null;

  @CreateDateColumn()
  createdAt: Date;
}
