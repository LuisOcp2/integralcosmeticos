import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { Marca } from '../../marcas/entities/marca.entity';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'text', nullable: true })
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

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioBase: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precioCosto: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  iva: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
