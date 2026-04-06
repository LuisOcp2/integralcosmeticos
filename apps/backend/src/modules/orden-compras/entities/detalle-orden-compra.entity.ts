import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Variante } from '../../catalogo/variantes/entities/variante.entity';
import { OrdenCompra } from './orden-compra.entity';

@Entity('detalles_orden_compra')
@Index('idx_detalle_orden_orden', ['ordenId'])
@Index('idx_detalle_orden_variante', ['varianteId'])
export class DetalleOrdenCompra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ordenId: string;

  @ManyToOne(() => OrdenCompra, (orden) => orden.detallesOrden, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ordenId' })
  orden: OrdenCompra;

  @Column({ type: 'uuid' })
  varianteId: string;

  @ManyToOne(() => Variante, { nullable: false })
  @JoinColumn({ name: 'varianteId' })
  variante: Variante;

  @Column({ type: 'int' })
  cantidadPedida: number;

  @Column({ type: 'int', default: 0 })
  cantidadRecibida: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;
}
