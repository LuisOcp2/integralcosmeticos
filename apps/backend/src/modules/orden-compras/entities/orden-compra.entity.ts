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
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { Sede } from '../../sedes/entities/sede.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { DetalleOrdenCompra } from './detalle-orden-compra.entity';

export enum EstadoOrdenCompra {
  BORRADOR = 'BORRADOR',
  ENVIADA = 'ENVIADA',
  RECIBIDA_PARCIAL = 'RECIBIDA_PARCIAL',
  RECIBIDA_TOTAL = 'RECIBIDA_TOTAL',
  CANCELADA = 'CANCELADA',
}

@Entity('ordenes_compra')
@Index('idx_ordenes_compra_numero', ['numero'], { unique: true })
@Index('idx_ordenes_compra_proveedor', ['proveedorId'])
@Index('idx_ordenes_compra_sede', ['sedeId'])
@Index('idx_ordenes_compra_estado', ['estado'])
export class OrdenCompra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  numero: string;

  @Column({ type: 'uuid' })
  proveedorId: string;

  @ManyToOne(() => Proveedor, (proveedor) => proveedor.ordenesCompra, { nullable: false })
  @JoinColumn({ name: 'proveedorId' })
  proveedor: Proveedor;

  @Column({ type: 'uuid' })
  sedeId: string;

  @ManyToOne(() => Sede, { nullable: false })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @Column({
    type: 'enum',
    enum: EstadoOrdenCompra,
    default: EstadoOrdenCompra.BORRADOR,
  })
  estado: EstadoOrdenCompra;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  impuestos: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'date', nullable: true })
  fechaEsperada?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  fechaRecepcion?: Date | null;

  @Column({ type: 'uuid' })
  creadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column({ type: 'uuid', nullable: true })
  recibidoPorId?: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'recibidoPorId' })
  recibidoPor?: Usuario | null;

  @Column({ type: 'text', nullable: true })
  notas?: string | null;

  @OneToMany(() => DetalleOrdenCompra, (detalle) => detalle.orden, {
    cascade: ['insert', 'update'],
    eager: true,
  })
  detallesOrden: DetalleOrdenCompra[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
