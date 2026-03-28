import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Producto } from '../../catalogo/productos/entities/producto.entity';
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

  @Column({ name: 'productoId', type: 'uuid' })
  productoId: string;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ name: 'precio_costo_snap', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioCostoSnap?: number | null;

  @Column({ name: 'descuento_item', type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuentoItem: number;

  @Column({ name: 'impuesto_item', type: 'decimal', precision: 12, scale: 2, default: 0 })
  impuestoItem: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @CreateDateColumn()
  createdAt: Date;
}
