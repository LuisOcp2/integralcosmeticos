import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Marca } from '../../marcas/entities/marca.entity';
import { Variante } from '../../variantes/entities/variante.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ name: 'codigo_interno', length: 50, unique: true })
  codigoInterno: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ name: 'imagen_url', type: 'text', nullable: true })
  imagenUrl?: string;

  @Column('uuid')
  categoriaId: string;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;

  @Column('uuid')
  marcaId: string;

  @ManyToOne(() => Marca)
  @JoinColumn({ name: 'marcaId' })
  marca: Marca;

  @Column({ name: 'precio_venta', type: 'decimal', precision: 12, scale: 2 })
  precioBase: number;

  @Column({ name: 'precio_costo', type: 'decimal', precision: 12, scale: 2 })
  precioCosto: number;

  @Column({ name: 'impuesto', type: 'decimal', precision: 5, scale: 2 })
  iva: number;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => Variante, (variante) => variante.producto)
  variantes: Variante[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
