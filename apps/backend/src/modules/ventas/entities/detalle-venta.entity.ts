import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Variante } from '../../catalogo/variantes/entities/variante.entity';
import { Venta } from './venta.entity';

@Entity('detalle_ventas')
export class DetalleVenta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ventaId: string;

  @ManyToOne(() => Venta, (venta) => venta.detalles)
  @JoinColumn({ name: 'ventaId' })
  venta: Venta;

  @Column('uuid')
  varianteId: string;

  @Column('uuid', { name: 'productoId', nullable: true })
  productoId?: string | null;

  @ManyToOne(() => Variante, { nullable: false })
  @JoinColumn({ name: 'varianteId' })
  variante: Variante;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ name: 'precio_costo_snap', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioCostoSnap?: number | null;

  @Column({ name: 'descuento_item', type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ name: 'impuesto_item', type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuestoItem: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ name: 'promocionId', type: 'uuid', nullable: true })
  promocionId?: string | null;

  @Column({ name: 'createdAt', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  nombreProducto?: string;

  skuSnapshot?: string;
}
