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
import { Pedido } from './pedido.entity';
import { PagoFactura } from './pago-factura.entity';

export enum EstadoFactura {
  BORRADOR = 'BORRADOR',
  EMITIDA = 'EMITIDA',
  ENVIADA = 'ENVIADA',
  PAGADA = 'PAGADA',
  PAGADA_PARCIAL = 'PAGADA_PARCIAL',
  VENCIDA = 'VENCIDA',
  ANULADA = 'ANULADA',
}

@Entity('facturas')
export class Factura {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  numero: string;

  @Column('uuid', { nullable: true })
  pedidoId?: string | null;

  @ManyToOne(() => Pedido, { nullable: true })
  @JoinColumn({ name: 'pedidoId' })
  pedido?: Pedido | null;

  @Column('uuid')
  clienteId: string;

  @ManyToOne(() => Cliente, { nullable: false })
  @JoinColumn({ name: 'clienteId' })
  cliente: Cliente;

  @Column({
    type: 'enum',
    enum: EstadoFactura,
    default: EstadoFactura.BORRADOR,
  })
  estado: EstadoFactura;

  @Column({ type: 'date' })
  fechaEmision: string;

  @Column({ type: 'date' })
  fechaVencimiento: string;

  @Column({ type: 'date', nullable: true })
  fechaPago?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuestos: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  retencion: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  saldo: number;

  @Column('uuid')
  creadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @OneToMany(() => PagoFactura, (pago) => pago.factura)
  pagos: PagoFactura[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
