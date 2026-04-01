import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoSyncCloud } from '@cosmeticos/shared-types';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Marca } from '../../marcas/entities/marca.entity';
import { Variante } from '../../variantes/entities/variante.entity';

@Entity('productos')
@Index('idx_productos_nombre', ['nombre'])
@Index('idx_productos_slug', ['slug'], { unique: true })
@Index('idx_productos_codigo_interno', ['codigoInterno'], { unique: true })
@Index('idx_productos_categoria_marca', ['categoriaId', 'marcaId'])
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 250, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @Column({ name: 'codigo_interno', type: 'varchar', length: 50, unique: true, nullable: true })
  codigoInterno?: string | null;

  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'precio_venta', type: 'decimal', precision: 12, scale: 2 })
  precio: number;

  @Column({ name: 'precio_costo', type: 'decimal', precision: 12, scale: 2, nullable: true })
  precioCompra?: number | null;

  @Column({ name: 'impuesto', type: 'decimal', precision: 5, scale: 2, nullable: true })
  impuesto?: number | null;

  @Column('uuid')
  categoriaId: string;

  @ManyToOne(() => Categoria, (categoria) => categoria.productos)
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;

  @Column('uuid')
  marcaId: string;

  @ManyToOne(() => Marca, (marca) => marca.productos)
  @JoinColumn({ name: 'marcaId' })
  marca: Marca;

  @Column({ name: 'imagen_url', type: 'varchar', length: 500, nullable: true })
  imagenUrl?: string | null;

  @Column({ name: 'stock_minimo', type: 'int', default: 0 })
  stockMinimo: number;

  @Column({ name: 'permitir_venta_sin_stock', default: false })
  permitirVentaSinStock: boolean;

  @Column({
    name: 'sync_cloud_status',
    type: 'enum',
    enum: EstadoSyncCloud,
    default: EstadoSyncCloud.PENDIENTE,
  })
  syncCloudStatus: EstadoSyncCloud;

  @OneToMany(() => Variante, (variante) => variante.producto)
  variantes: Variante[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;

  get precioBase(): number {
    return this.precio;
  }

  set precioBase(valor: number) {
    this.precio = valor;
  }

  get precioCosto(): number | null | undefined {
    return this.precioCompra;
  }

  set precioCosto(valor: number | null | undefined) {
    this.precioCompra = valor;
  }

  get iva(): number | null | undefined {
    return this.impuesto;
  }

  set iva(valor: number | null | undefined) {
    this.impuesto = valor;
  }

  @BeforeInsert()
  @BeforeUpdate()
  generarSlug(): void {
    if (!this.nombre?.trim()) {
      return;
    }

    this.slug = this.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 250);
  }
}
