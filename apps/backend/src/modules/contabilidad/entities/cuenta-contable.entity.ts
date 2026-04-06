import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TipoCuentaContable } from '../enums/contabilidad.enums';
import { MovimientoContable } from './movimiento-contable.entity';

@Entity('cuentas_contables')
@Index(['codigo'], { unique: true })
@Index(['padreId'])
export class CuentaContable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  codigo: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({
    type: 'enum',
    enum: TipoCuentaContable,
  })
  tipo: TipoCuentaContable;

  @Column({ type: 'integer' })
  nivelPUC: number;

  @Column({ type: 'uuid', nullable: true })
  padreId?: string | null;

  @ManyToOne(() => CuentaContable, (cuenta) => cuenta.hijos, { nullable: true })
  @JoinColumn({ name: 'padreId' })
  padre?: CuentaContable | null;

  @OneToMany(() => CuentaContable, (cuenta) => cuenta.padre)
  hijos: CuentaContable[];

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @OneToMany(() => MovimientoContable, (movimiento) => movimiento.cuenta)
  movimientos: MovimientoContable[];
}
