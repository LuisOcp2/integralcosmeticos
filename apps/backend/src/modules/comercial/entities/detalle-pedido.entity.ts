import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Variante } from '../../catalogo/variantes/entities/variante.entity';
import { Pedido } from './pedido.entity';

@Entity('detalle_pedidos')
export class DetallePedido {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  pedidoId: string;

  @ManyToOne(() => Pedido, (pedido) => pedido.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pedidoId' })
  pedido: Pedido;

  @Column('uuid')
  varianteId: string;

  @ManyToOne(() => Variante, { nullable: false })
  @JoinColumn({ name: 'varianteId' })
  variante: Variante;

  @Column({ type: 'varchar', length: 200 })
  descripcion: string;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  descuento: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
