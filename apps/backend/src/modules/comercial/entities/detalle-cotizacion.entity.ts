import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Producto } from '../../catalogo/productos/entities/producto.entity';
import { Variante } from '../../catalogo/variantes/entities/variante.entity';
import { Cotizacion } from './cotizacion.entity';

@Entity('cotizacion_detalles')
export class DetalleCotizacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  cotizacionId: string;

  @ManyToOne(() => Cotizacion, (cotizacion) => cotizacion.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cotizacionId' })
  cotizacion: Cotizacion;

  @Column('uuid')
  varianteId: string;

  @Column('uuid', { name: 'productoId' })
  productoId: string;

  @ManyToOne(() => Producto, { nullable: false })
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @ManyToOne(() => Variante, { nullable: false })
  @JoinColumn({ name: 'varianteId' })
  variante: Variante;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  observaciones?: string | null;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ name: 'precio_unitario', type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  get descripcion(): string {
    return this.observaciones ?? '';
  }

  set descripcion(valor: string) {
    this.observaciones = valor;
  }
}
