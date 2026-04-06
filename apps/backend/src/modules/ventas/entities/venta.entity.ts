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
import { EstadoVenta, MetodoPago } from '@cosmeticos/shared-types';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { SesionCaja } from '../../caja/entities/sesion-caja.entity';
import { DetalleVenta } from './detalle-venta.entity';

@Entity('ventas')
export class Venta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  numero: string;

  @Column('uuid')
  sedeId: string;

  @Column('uuid', { name: 'usuarioId' })
  cajeroId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuarioId' })
  cajero: Usuario;

  @Column('uuid', { nullable: true })
  clienteId?: string | null;

  @ManyToOne(() => Cliente, { nullable: true })
  @JoinColumn({ name: 'clienteId' })
  cliente?: Cliente | null;

  @Column('uuid', { name: 'sesionCajaId', nullable: true })
  cajaId: string;

  @ManyToOne(() => SesionCaja, (sesion) => sesion.ventas, { nullable: false })
  @JoinColumn({ name: 'sesionCajaId' })
  caja: SesionCaja;

  @Column({
    type: 'enum',
    enum: EstadoVenta,
    default: EstadoVenta.PENDIENTE,
  })
  estado: EstadoVenta;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Index()
  @Column({ name: 'descuento_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ name: 'impuesto_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuestos: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({
    name: 'metodo_pago',
    type: 'enum',
    enum: MetodoPago,
  })
  metodoPago: MetodoPago;

  @Column({ name: 'monto_efectivo', type: 'decimal', precision: 12, scale: 2 })
  montoPagado: number;

  @Column({ name: 'monto_otro', type: 'decimal', precision: 12, scale: 2, default: 0 })
  cambio: number;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  notas?: string | null;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion?: string | null;

  @Column('uuid', { nullable: true })
  anuladaPorId?: string | null;

  @Column({ name: 'fecha_anulacion', type: 'timestamp', nullable: true })
  anuladaEn?: Date | null;

  @OneToMany(() => DetalleVenta, (detalle) => detalle.venta)
  detalles: DetalleVenta[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
