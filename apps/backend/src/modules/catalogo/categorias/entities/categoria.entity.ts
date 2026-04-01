import {
  BeforeInsert,
  BeforeUpdate,
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
@Index('idx_categorias_slug', ['slug'], { unique: true })
export class Categoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ name: 'icon_url', type: 'varchar', length: 500, nullable: true })
  iconUrl?: string | null;

  @Column({ type: 'uuid', nullable: true })
  padreId?: string | null;

  @ManyToOne(() => Categoria, (categoria) => categoria.hijos, { nullable: true })
  @JoinColumn({ name: 'padreId' })
  padre?: Categoria | null;

  @OneToMany(() => Categoria, (categoria) => categoria.padre)
  hijos: Categoria[];

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @OneToMany(() => Producto, (producto) => producto.categoria)
  productos: Producto[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  generarSlug(): void {
    if (this.slug?.trim()) {
      return;
    }

    if (!this.nombre?.trim()) {
      return;
    }

    this.slug = this.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }
}
