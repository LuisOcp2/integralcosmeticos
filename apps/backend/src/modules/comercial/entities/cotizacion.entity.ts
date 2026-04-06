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
import { DetalleCotizacion } from './detalle-cotizacion.entity';

export enum EstadoCotizacion {
  PENDIENTE = 'PENDIENTE',
  ENVIADA = 'ENVIADA',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  VENCIDA = 'VENCIDA',
  CONVERTIDA = 'CONVERTIDA',
}

@Entity('cotizaciones')
export class Cotizacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'numero_cotizacion', type: 'varchar', length: 40 })
  numero: string;

  @Column('uuid')
  clienteId: string;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente;

  @Column({
    type: 'enum',
    enum: EstadoCotizacion,
    default: EstadoCotizacion.PENDIENTE,
  })
  estado: EstadoCotizacion;

  @Column({ name: 'fecha_vencimiento', type: 'date' })
  fechaVigencia: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ name: 'impuesto', type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuestos: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  notasCliente?: string | null;

  @Column({ name: 'condiciones', type: 'text', nullable: true })
  terminosCondiciones?: string | null;

  @Column({ name: 'usuarioId', type: 'uuid' })
  creadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuarioId' })
  creadoPor: Usuario;

  @Column({ name: 'sedeId', type: 'uuid' })
  sedeId: string;

  @Column({ name: 'ventaGeneradaId', type: 'uuid', nullable: true })
  convertidaAPedidoId?: string | null;

  @OneToMany(() => DetalleCotizacion, (detalle) => detalle.cotizacion, { cascade: true })
  detalles: DetalleCotizacion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
