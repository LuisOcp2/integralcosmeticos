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
import { Producto } from '../../productos/entities/producto.entity';

@Entity('categorias')
@Index('idx_categorias_nombre', ['nombre'], { unique: true })
export class Categoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @Column({ name: 'imagen_url', type: 'varchar', length: 500, nullable: true })
  iconUrl?: string | null;

  @Column({ name: 'categoriaPadreId', type: 'uuid', nullable: true })
  padreId?: string | null;

  @ManyToOne(() => Categoria, (categoria) => categoria.hijos, { nullable: true })
  @JoinColumn({ name: 'categoriaPadreId' })
  padre?: Categoria | null;

  @OneToMany(() => Categoria, (categoria) => categoria.padre)
  hijos: Categoria[];

  @Column({ name: 'activa', default: true })
  activo: boolean;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
