import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TipoMovimientoContable } from '../enums/contabilidad.enums';
import { AsientoContable } from './asiento-contable.entity';
import { CuentaContable } from './cuenta-contable.entity';

@Entity('movimientos_contables')
@Index(['asientoId'])
@Index(['cuentaId'])
@Index(['tipo'])
export class MovimientoContable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  asientoId: string;

  @ManyToOne(() => AsientoContable, (asiento) => asiento.movimientos, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asientoId' })
  asiento: AsientoContable;

  @Column({ type: 'uuid' })
  cuentaId: string;

  @ManyToOne(() => CuentaContable, (cuenta) => cuenta.movimientos, { nullable: false })
  @JoinColumn({ name: 'cuentaId' })
  cuenta: CuentaContable;

  @Column({
    type: 'enum',
    enum: TipoMovimientoContable,
  })
  tipo: TipoMovimientoContable;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  monto: number;

  @Column({ type: 'text', nullable: true })
  descripcion?: string | null;
}
