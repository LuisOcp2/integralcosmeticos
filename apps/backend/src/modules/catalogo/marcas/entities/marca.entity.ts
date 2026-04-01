import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Producto } from '../../productos/entities/producto.entity';

@Entity('marcas')
@Index('idx_marcas_nombre', ['nombre'], { unique: true })
export class Marca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl?: string | null;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;

  @OneToMany(() => Producto, (producto) => producto.marca)
  productos: Producto[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
