import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  UpdateDateColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrdenCompra } from '../../orden-compras/entities/orden-compra.entity';

@Entity('proveedores')
@Index('idx_proveedores_nit', ['nit'], { unique: true })
@Index('idx_proveedores_nombre', ['nombre'])
@Index('idx_proveedores_email', ['email'])
@Index('idx_proveedores_telefono', ['telefono'])
export class Proveedor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @Column({ name: 'razon_social', type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'varchar', length: 20 })
  nit: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telefono?: string | null;

  @Column({ name: 'contacto_nombre', type: 'varchar', length: 150, nullable: true })
  contactoNombre?: string | null;

  @Column({ type: 'text', nullable: true })
  direccion?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ciudad?: string | null;

  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'observaciones', type: 'text', nullable: true })
  notas?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => OrdenCompra, (ordenCompra) => ordenCompra.proveedor)
  ordenesCompra: OrdenCompra[];
}
