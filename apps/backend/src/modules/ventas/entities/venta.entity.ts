import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoVenta, MetodoPago } from '@cosmeticos/shared-types';
import { DetalleVenta } from './detalle-venta.entity';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 30 })
  numero: string;

  @Column('uuid')
  sedeId: string;

  @Column('uuid')
  usuarioId: string;

  @Column('uuid', { nullable: true })
  clienteId?: string | null;

  @Column({ name: 'sesionCajaId', type: 'uuid', nullable: true })
  cajaId?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ name: 'descuento_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ name: 'impuesto_total', type: 'decimal', precision: 12, scale: 2 })
  impuesto: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({
    name: 'metodo_pago',
    type: 'enum',
    enum: MetodoPago,
    transformer: {
      to: (value?: MetodoPago) => (value === MetodoPago.COMBINADO ? 'MIXTO' : value),
      from: (value?: string) => (value === 'MIXTO' ? MetodoPago.COMBINADO : (value as MetodoPago)),
    },
  })
  metodoPago: MetodoPago;

  @Column({
    type: 'enum',
    enum: EstadoVenta,
    default: EstadoVenta.COMPLETADA,
    transformer: {
      to: (value?: EstadoVenta) => (value === EstadoVenta.PENDIENTE ? 'SUSPENDIDA' : value),
      from: (value?: string) =>
        value === 'DEVUELTA_PARCIAL' ? EstadoVenta.DEVOLUCION : (value as EstadoVenta),
    },
  })
  estado: EstadoVenta;

  @Column({ type: 'text', nullable: true })
  observaciones?: string | null;

  @Column({ name: 'monto_efectivo', type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoEfectivo: number;

  @Column({ name: 'monto_tarjeta', type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoTarjeta: number;

  @Column({ name: 'monto_transferencia', type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoTransferencia: number;

  @Column({ name: 'monto_otro', type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoOtro: number;

  @OneToMany(() => DetalleVenta, (detalle) => detalle.venta)
  detalles: DetalleVenta[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
