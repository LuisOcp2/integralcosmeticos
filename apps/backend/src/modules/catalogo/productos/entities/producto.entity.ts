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
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Marca } from '../../marcas/entities/marca.entity';
import { Variante } from '../../variantes/entities/variante.entity';

@Entity('productos')
@Index('idx_productos_nombre', ['nombre'])
@Index('idx_productos_codigo_interno', ['codigoInterno'], { unique: true })
@Index('idx_productos_categoria_marca', ['categoriaId', 'marcaId'])
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

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

  stockMinimo = 0;

  permitirVentaSinStock = false;

  @OneToMany(() => Variante, (variante) => variante.producto)
  variantes: Variante[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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
}
