import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { TipoAsientoContable } from '../enums/contabilidad.enums';
import { MovimientoContable } from './movimiento-contable.entity';

@Entity('asientos_contables')
@Index(['numero'], { unique: true })
@Index(['fecha'])
@Index(['tipo'])
export class AsientoContable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  numero: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: TipoAsientoContable,
  })
  tipo: TipoAsientoContable;

  @Column({ type: 'uuid', nullable: true })
  referenciaId?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  referenciaTipo?: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  totalDebito: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  totalCredito: number;

  @Column({ type: 'uuid' })
  creadoPorId: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @OneToMany(() => MovimientoContable, (movimiento) => movimiento.asiento, {
    cascade: ['insert'],
    eager: true,
  })
  movimientos: MovimientoContable[];

  @CreateDateColumn()
  createdAt: Date;
}
