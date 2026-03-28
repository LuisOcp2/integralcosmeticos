import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('variantes')
export class Variante {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  productoId: string;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column({ length: 200 })
  nombre: string;

  @Column({ name: 'codigo_barras', unique: true })
  codigoBarras: string;

  @Column({ unique: true })
  sku: string;

  @Column({ name: 'precio_extra', type: 'decimal', precision: 12, scale: 2, default: 0 })
  precioExtra: number;

  @Column({ name: 'precio_venta', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioVenta?: number | null;

  @Column({ name: 'precio_costo', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioCosto?: number | null;

  @Column({ name: 'imagen_url', type: 'text', nullable: true })
  imagenUrl?: string;

  @Column({ name: 'activa', default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
