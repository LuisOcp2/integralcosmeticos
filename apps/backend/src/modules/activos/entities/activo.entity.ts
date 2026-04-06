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
import { CategoriaActivo } from './categoria-activo.entity';
import { Sede } from '../../sedes/entities/sede.entity';
import { Empleado } from '../../rrhh/entities/empleado.entity';
import { MovimientoActivo } from './movimiento-activo.entity';
import { DepreciacionActivo } from './depreciacion-activo.entity';

export enum EstadoActivo {
  ACTIVO = 'ACTIVO',
  EN_MANTENIMIENTO = 'EN_MANTENIMIENTO',
  DADO_DE_BAJA = 'DADO_DE_BAJA',
  ROBADO = 'ROBADO',
}

@Entity('activos')
@Index('idx_activos_codigo', ['codigo'], { unique: true })
export class Activo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'uuid' })
  categoriaId: string;

  @ManyToOne(() => CategoriaActivo, (categoria) => categoria.activos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'categoriaId' })
  categoria: CategoriaActivo;

  @Column({ type: 'uuid' })
  sedeId: string;

  @ManyToOne(() => Sede, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sedeId' })
  sede: Sede;

  @Column({ type: 'uuid', nullable: true })
  custodioId: string | null;

  @ManyToOne(() => Empleado, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'custodioId' })
  custodio: Empleado | null;

  @Column({ type: 'enum', enum: EstadoActivo, default: EstadoActivo.ACTIVO })
  estado: EstadoActivo;

  @Column({ type: 'varchar', length: 100, nullable: true })
  marca: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modelo: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial: string | null;

  @Column({ type: 'date' })
  fechaCompra: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  valorCompra: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  valorResidual: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  valorActual: number;

  @Column({ type: 'date', nullable: true })
  proximoMantenimiento: string | null;

  @Column({ type: 'date', nullable: true })
  garantiaHasta: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  foto: string | null;

  @OneToMany(() => MovimientoActivo, (movimiento) => movimiento.activo)
  movimientos: MovimientoActivo[];

  @OneToMany(() => DepreciacionActivo, (depreciacion) => depreciacion.activo)
  depreciaciones: DepreciacionActivo[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
