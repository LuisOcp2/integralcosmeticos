import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('variantes')
@Index('idx_variantes_producto', ['productoId'])
@Index('idx_variantes_sku', ['sku'], { unique: true })
@Index('idx_variantes_codigo_barras', ['codigoBarras'], { unique: true })
export class Variante {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  productoId: string;

  @ManyToOne(() => Producto, (producto) => producto.variantes)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string;

  @Column({ name: 'codigo_barras', type: 'varchar', length: 100, unique: true, nullable: true })
  codigoBarras?: string | null;

  @Column({ name: 'activa', default: true })
  activo: boolean;

  atributos?: Record<string, string> | null;

  stockDisponible = 0;

  @Column({ name: 'precio_extra', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioExtra?: number | null;

  @Column({ name: 'precio_venta', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioVenta?: number | null;

  @Column({ name: 'precio_costo', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioCosto?: number | null;

  @Column({ name: 'imagen_url', type: 'varchar', length: 500, nullable: true })
  imagenUrl?: string | null;

  get precio(): number | null | undefined {
    return this.precioVenta;
  }

  set precio(valor: number | null | undefined) {
    this.precioVenta = valor;
  }

  get codigoBarra(): string | null | undefined {
    return this.codigoBarras;
  }

  set codigoBarra(valor: string | null | undefined) {
    this.codigoBarras = valor;
  }

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
