import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';

@Entity('ordenes_compra')
export class OrdenCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  numeroOrden: string;

  @ManyToOne(() => Proveedor, (proveedor) => proveedor.ordenesCompra)
  proveedor: Proveedor;

  @Column()
  total: number;

  @Column()
  estado: string; // pendiente, aprobada, recibida, cancelada

  @Column({ nullable: true })
  fechaEntregaEsperada: Date;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
